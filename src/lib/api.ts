import { db } from "@/integrations/firebase/config";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  doc as docRef,
} from "firebase/firestore";
// xlsx is loaded lazily only when exportExcel is called (it's ~2MB)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResult = { success: boolean; error?: string; [key: string]: any };

// ─── SHA-256 helper ──────────────────────────────────────────
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Credentials seed (runs once on first login) ────────────
let seeded = false;
async function ensureCredentials() {
  if (seeded) return;
  const credRef = collection(db, "credentials");
  const snap = await getDocs(credRef);
  if (snap.size > 0) {
    seeded = true;
    return;
  }

  const creds = [
    { email: "superadmin@eduphoenix.com", password: await sha256("SuperAdmin@123"), role: "superadmin", name: "Super Admin" },
    { email: "admin@eduphoenix.com", password: await sha256("Admin@123"), role: "admin", name: "Admin" },
    { email: "john@eduphoenix.com", password: await sha256("Employee@123"), role: "employee", name: "John Doe" },
    { email: "jane@eduphoenix.com", password: await sha256("Employee@123"), role: "employee", name: "Jane Smith" },
  ];

  for (const c of creds) {
    await addDoc(credRef, c);
  }
  seeded = true;
}

// ─── Helpers ─────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function nowStr(): string {
  return new Date().toISOString();
}

// ─── API (direct Firestore) ─────────────────────────────────
export const api = {
  // ── Intern APIs ──────────────────────────────────────────
  async checkIntern(fingerprint: string) {
    const today = todayStr();
    const internsRef = collection(db, "internLogs");

    // Fee due
    const feeQ = query(
      collection(db, "feeDues"),
      where("fingerprint", "==", fingerprint),
      where("acknowledged", "==", false),
    );
    const feeSnap = await getDocs(feeQ);
    const feeDue = feeSnap.empty
      ? null
      : {
          id: feeSnap.docs[0].id,
          amount: feeSnap.docs[0].data().amount,
          message: feeSnap.docs[0].data().message || "",
        };

    // Today's record
    const todayQ = query(
      internsRef,
      where("fingerprint", "==", fingerprint),
      where("date", "==", today),
    );
    const todaySnap = await getDocs(todayQ);

    if (!todaySnap.empty) {
      const d = todaySnap.docs[0].data();
      return {
        found: true,
        data: {
          name: d.name,
          contact: d.contact,
          college: d.college,
          domain: d.domain,
          checkedIn: !!d.checkInTime && !d.checkOutTime,
          checkInTime: d.checkInTime || null,
        },
        docId: todaySnap.docs[0].id,
        feeDue,
      };
    }

    // Previous record (autofill) — sort client-side to avoid composite index
    const prevQ = query(internsRef, where("fingerprint", "==", fingerprint));
    const prevSnap = await getDocs(prevQ);

    if (!prevSnap.empty) {
      const sorted = prevSnap.docs.sort((a, b) => {
        const aDate = a.data().date || "";
        const bDate = b.data().date || "";
        return bDate.localeCompare(aDate);
      });
      const d = sorted[0].data();
      return {
        found: true,
        data: {
          name: d.name,
          contact: d.contact,
          college: d.college,
          domain: d.domain,
          checkedIn: false,
          checkInTime: null,
        },
        docId: null,
        feeDue,
      };
    }

    return { found: false, feeDue };
  },

  async registerIntern(data: Record<string, string>): Promise<ApiResult> {
    const today = todayStr();
    const internsRef = collection(db, "internLogs");

    // Duplicate check
    const dupQ = query(
      internsRef,
      where("fingerprint", "==", data.fingerprint),
      where("date", "==", today),
    );
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
      return { success: false, error: "Already registered today" };
    }

    await addDoc(internsRef, {
      name: data.name,
      contact: data.contact,
      college: data.college,
      domain: data.domain,
      fingerprint: data.fingerprint,
      ip: "client",
      browser: data.browser || "",
      os: data.os || "",
      deviceType: data.deviceType || "",
      checkInTime: "",
      checkOutTime: "",
      date: today,
      createdAt: serverTimestamp(),
    });

    return { success: true };
  },

  async updateIntern(data: Record<string, string>): Promise<ApiResult> {
    const today = todayStr();
    const internsRef = collection(db, "internLogs");

    const todayQ = query(
      internsRef,
      where("fingerprint", "==", data.fingerprint),
      where("date", "==", today),
    );
    const todaySnap = await getDocs(todayQ);

    if (todaySnap.empty) {
      await addDoc(internsRef, {
        name: data.name,
        contact: data.contact,
        college: data.college,
        domain: data.domain,
        fingerprint: data.fingerprint,
        ip: "client",
        browser: data.browser || "",
        os: data.os || "",
        deviceType: data.deviceType || "",
        checkInTime: "",
        checkOutTime: "",
        date: today,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(todaySnap.docs[0].ref, {
        name: data.name,
        contact: data.contact,
        college: data.college,
        domain: data.domain,
      });
    }
    return { success: true };
  },

  async checkIn(fingerprint: string): Promise<ApiResult> {
    const today = todayStr();
    const q = query(
      collection(db, "internLogs"),
      where("fingerprint", "==", fingerprint),
      where("date", "==", today),
    );
    const snap = await getDocs(q);

    if (snap.empty) return { success: false, error: "Please register first" };
    if (snap.docs[0].data().checkInTime) return { success: false, error: "Already checked in today" };

    await updateDoc(snap.docs[0].ref, { checkInTime: nowStr() });
    return { success: true };
  },

  async checkOut(fingerprint: string): Promise<ApiResult> {
    const today = todayStr();
    const q = query(
      collection(db, "internLogs"),
      where("fingerprint", "==", fingerprint),
      where("date", "==", today),
    );
    const snap = await getDocs(q);

    if (snap.empty || !snap.docs[0].data().checkInTime) {
      return { success: false, error: "Not checked in" };
    }

    await updateDoc(snap.docs[0].ref, { checkOutTime: nowStr() });
    return { success: true };
  },

  // ── Fee Due APIs ─────────────────────────────────────────
  async updateFeeDue(fingerprint: string, amount: number, message?: string): Promise<ApiResult> {
    const role = localStorage.getItem("admin_role");
    if (role !== "superadmin") {
      return { success: false, error: "Only super admin can update fee dues" };
    }

    const feeAmount = parseFloat(String(amount)) || 0;

    // Look up student name
    const nameQ = query(collection(db, "internLogs"), where("fingerprint", "==", fingerprint));
    const nameSnap = await getDocs(nameQ);
    const sorted = nameSnap.docs.sort((a, b) => (b.data().date || "").localeCompare(a.data().date || ""));
    const studentName = sorted.length > 0 ? sorted[0].data().name : "Unknown";

    if (feeAmount <= 0) {
      const existingQ = query(collection(db, "feeDues"), where("fingerprint", "==", fingerprint));
      const existingSnap = await getDocs(existingQ);
      const batch = writeBatch(db);
      existingSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return { success: true, cleared: true };
    }

    const existingQ = query(collection(db, "feeDues"), where("fingerprint", "==", fingerprint));
    const existingSnap = await getDocs(existingQ);
    const feeMsg = message || `You have a pending fee of ₹${feeAmount}. Please clear it at the earliest.`;

    if (existingSnap.empty) {
      await addDoc(collection(db, "feeDues"), {
        fingerprint,
        studentName,
        amount: feeAmount,
        message: feeMsg,
        acknowledged: false,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(existingSnap.docs[0].ref, {
        amount: feeAmount,
        message: feeMsg,
        acknowledged: false,
        updatedAt: serverTimestamp(),
      });
    }

    return { success: true };
  },

  async acknowledgeFee(feeId: string): Promise<ApiResult> {
    if (!feeId) return { success: false, error: "Fee ID required" };
    const ref = docRef(db, "feeDues", feeId);
    await updateDoc(ref, { acknowledged: true });
    return { success: true };
  },

  // ── Visitor APIs ─────────────────────────────────────────
  async registerVisitor(data: Record<string, string>): Promise<ApiResult> {
    await addDoc(collection(db, "visitorLogs"), {
      name: data.name,
      email: data.email,
      phone: data.phone,
      college: data.college,
      purpose: data.purpose,
      fingerprint: data.fingerprint,
      ip: "client",
      browser: data.browser || "",
      os: data.os || "",
      deviceType: data.deviceType || "",
      visitTime: nowStr(),
      date: todayStr(),
      createdAt: serverTimestamp(),
    });
    return { success: true };
  },

  // ── Employee APIs ────────────────────────────────────────
  async registerEmployee(name: string, email: string, password: string): Promise<ApiResult> {
    // Check if an account with this email already exists
    const q = query(
      collection(db, "credentials"),
      where("email", "==", email),
    );
    const snap = await getDocs(q);
    if (!snap.empty) return { success: false, error: "An account with this email already exists." };

    const hashedPassword = await sha256(password);
    await addDoc(collection(db, "credentials"), {
      email,
      password: hashedPassword,
      role: "employee",
      name,
    });
    return { success: true };
  },

  async getEmployees(): Promise<ApiResult> {
    const q = query(
      collection(db, "credentials"),
      where("role", "==", "employee"),
    );
    const snap = await getDocs(q);
    const employees = snap.docs.map((d) => ({ id: d.id, name: d.data().name, email: d.data().email }));
    return { success: true, employees };
  },

  async deleteEmployee(id: string): Promise<ApiResult> {
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(docRef(db, "credentials", id));
    return { success: true };
  },

  async changePassword(email: string, currentPassword: string, newPassword: string): Promise<ApiResult> {
    const q = query(
      collection(db, "credentials"),
      where("email", "==", email),
    );
    const snap = await getDocs(q);
    if (snap.empty) return { success: false, error: "Account not found." };

    const credDoc = snap.docs[0];
    const cred = credDoc.data();
    const currentHash = await sha256(currentPassword);
    if (cred.password !== currentHash) return { success: false, error: "Current password is incorrect." };

    const newHash = await sha256(newPassword);
    await updateDoc(docRef(db, "credentials", credDoc.id), { password: newHash });
    return { success: true };
  },

  async employeeLogin(email: string, password: string): Promise<ApiResult> {
    await ensureCredentials();

    const q = query(
      collection(db, "credentials"),
      where("email", "==", email),
      where("role", "==", "employee"),
    );
    const snap = await getDocs(q);
    if (snap.empty) return { success: false, error: "Invalid credentials" };

    const cred = snap.docs[0].data();
    const inputHash = await sha256(password);
    if (cred.password !== inputHash) return { success: false, error: "Invalid credentials" };

    return { success: true, token: "local-employee-" + Date.now(), name: cred.name };
  },

  async employeeStatus(_fingerprint: string) {
    const today = todayStr();
    const email = localStorage.getItem("employee_email") || "";

    const q = query(
      collection(db, "employeeLogs"),
      where("email", "==", email),
      where("date", "==", today),
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      const d = snap.docs[0].data();
      return { checkedIn: !!d.checkInTime && !d.checkOutTime, checkInTime: d.checkInTime || null };
    }
    return { checkedIn: false, checkInTime: null };
  },

  async employeeCheckIn(fingerprint: string, device: Record<string, string>): Promise<ApiResult> {
    const today = todayStr();
    const email = localStorage.getItem("employee_email") || "";
    const name = localStorage.getItem("employee_name") || email;
    const ref = collection(db, "employeeLogs");

    const q = query(ref, where("email", "==", email), where("date", "==", today));
    const snap = await getDocs(q);

    if (!snap.empty && snap.docs[0].data().checkInTime) {
      return { success: false, error: "Already checked in today" };
    }

    if (snap.empty) {
      await addDoc(ref, {
        name, email, fingerprint,
        ip: "client",
        browser: device.browser || "",
        os: device.os || "",
        deviceType: device.deviceType || "",
        checkInTime: nowStr(),
        checkOutTime: "",
        date: today,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(snap.docs[0].ref, { checkInTime: nowStr() });
    }
    return { success: true };
  },

  async employeeCheckOut(_fingerprint: string): Promise<ApiResult> {
    const today = todayStr();
    const email = localStorage.getItem("employee_email") || "";
    const ref = collection(db, "employeeLogs");

    const q = query(ref, where("email", "==", email), where("date", "==", today));
    const snap = await getDocs(q);

    if (snap.empty || !snap.docs[0].data().checkInTime) {
      return { success: false, error: "Not checked in" };
    }

    await updateDoc(snap.docs[0].ref, { checkOutTime: nowStr() });
    return { success: true };
  },

  // ── Admin APIs ───────────────────────────────────────────
  async adminLogin(email: string, password: string): Promise<ApiResult> {
    await ensureCredentials();

    const q = query(collection(db, "credentials"), where("email", "==", email));
    const snap = await getDocs(q);
    if (snap.empty) return { success: false, error: "Invalid credentials" };

    const cred = snap.docs[0].data();
    if (cred.role !== "superadmin" && cred.role !== "admin") {
      return { success: false, error: "Invalid credentials" };
    }

    const inputHash = await sha256(password);
    if (cred.password !== inputHash) return { success: false, error: "Invalid credentials" };

    return { success: true, token: "local-admin-" + Date.now(), role: cred.role };
  },

  // ── Logs APIs (admin) ────────────────────────────────────
  async getLogs(type: "intern" | "visitor" | "employee", _params?: Record<string, string>) {
    if (type === "intern") {
      const snap = await getDocs(query(collection(db, "internLogs"), orderBy("createdAt", "desc")));
      const feeSnap = await getDocs(collection(db, "feeDues"));
      const feeMap: Record<string, number> = {};
      feeSnap.docs.forEach((d) => { feeMap[d.data().fingerprint] = d.data().amount || 0; });

      const data = snap.docs.map((d) => {
        const r = d.data();
        return [
          r.name, r.contact, r.college, r.domain,
          r.fingerprint, r.ip, r.browser, r.os, r.deviceType,
          r.checkInTime, r.checkOutTime, r.date,
          String(feeMap[r.fingerprint] || 0),
        ];
      });
      return { success: true, data };
    }

    if (type === "visitor") {
      const snap = await getDocs(query(collection(db, "visitorLogs"), orderBy("createdAt", "desc")));
      const data = snap.docs.map((d) => {
        const r = d.data();
        return [
          r.name, r.email, r.phone, r.college, r.purpose,
          r.fingerprint, r.ip, r.browser, r.os, r.deviceType,
          r.visitTime, r.date,
        ];
      });
      return { success: true, data };
    }

    if (type === "employee") {
      const snap = await getDocs(query(collection(db, "employeeLogs"), orderBy("createdAt", "desc")));
      const data = snap.docs.map((d) => {
        const r = d.data();
        return [
          r.name, r.email, r.fingerprint, r.ip,
          r.browser, r.os, r.deviceType,
          r.checkInTime, r.checkOutTime, r.date,
        ];
      });
      return { success: true, data };
    }

    return { success: false, error: "Invalid type" };
  },

  async getStats() {
    const today = todayStr();
    const [internSnap, visitorSnap, employeeSnap] = await Promise.all([
      getDocs(collection(db, "internLogs")),
      getDocs(collection(db, "visitorLogs")),
      getDocs(collection(db, "employeeLogs")),
    ]);

    const internRows = internSnap.docs.map((d) => d.data());
    const internsToday = internRows.filter((r) => r.date === today).length;
    const checkedIn = internRows.filter((r) => r.date === today && r.checkInTime && !r.checkOutTime).length;
    const visitorsToday = visitorSnap.docs.filter((d) => d.data().date === today).length;
    const employeeRows = employeeSnap.docs.map((d) => d.data());
    const employeesToday = employeeRows.filter((r) => r.date === today).length;
    const employeesCheckedIn = employeeRows.filter((r) => r.date === today && r.checkInTime && !r.checkOutTime).length;

    return {
      success: true,
      stats: {
        internsToday, visitorsToday, checkedIn,
        employeesToday, employeesCheckedIn,
        totalRecords: internSnap.size + visitorSnap.size + employeeSnap.size,
      },
    };
  },

  // ── Excel Export (client-side) ───────────────────────────
  async exportExcel(type: "intern" | "visitor" | "employee" | "all") {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const docsToDelete: { col: string; id: string }[] = [];

    if (type === "intern" || type === "all") {
      const snap = await getDocs(query(collection(db, "internLogs"), orderBy("createdAt", "asc")));
      const rows = snap.docs.map((d) => {
        const r = d.data();
        docsToDelete.push({ col: "internLogs", id: d.id });
        return { Name: r.name, Contact: r.contact, College: r.college, Domain: r.domain, "Device ID": r.fingerprint, IP: r.ip, Browser: r.browser, OS: r.os, "Device Type": r.deviceType, "Check-in": r.checkInTime || "", "Check-out": r.checkOutTime || "", Date: r.date };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Intern Logs");
    }

    if (type === "employee" || type === "all") {
      const snap = await getDocs(query(collection(db, "employeeLogs"), orderBy("createdAt", "asc")));
      const rows = snap.docs.map((d) => {
        const r = d.data();
        docsToDelete.push({ col: "employeeLogs", id: d.id });
        return { Name: r.name, Email: r.email, "Device ID": r.fingerprint, IP: r.ip, Browser: r.browser, OS: r.os, "Device Type": r.deviceType, "Check-in": r.checkInTime || "", "Check-out": r.checkOutTime || "", Date: r.date };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Employee Logs");
    }

    if (type === "visitor" || type === "all") {
      const snap = await getDocs(query(collection(db, "visitorLogs"), orderBy("createdAt", "asc")));
      const rows = snap.docs.map((d) => {
        const r = d.data();
        docsToDelete.push({ col: "visitorLogs", id: d.id });
        return { Name: r.name, Email: r.email, Phone: r.phone, College: r.college, Purpose: r.purpose, "Device ID": r.fingerprint, IP: r.ip, Browser: r.browser, OS: r.os, "Device Type": r.deviceType, "Visit Time": r.visitTime || "", Date: r.date };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Visitor Logs");
    }

    XLSX.writeFile(wb, `eduphoenix_logs_${todayStr()}.xlsx`);

    // Auto-delete if >= 100 records exported
    if (docsToDelete.length >= 100) {
      const batchSize = 500;
      for (let i = 0; i < docsToDelete.length; i += batchSize) {
        const batch = writeBatch(db);
        docsToDelete.slice(i, i + batchSize).forEach((item) => {
          batch.delete(docRef(db, item.col, item.id));
        });
        await batch.commit();
      }
    }
  },
};
