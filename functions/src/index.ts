import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors = require("cors");
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import * as ExcelJS from "exceljs";

admin.initializeApp();
const db = admin.firestore();
const corsHandler = cors({ origin: true });

// Helper: verify JWT token and return payload
function verifyToken(authHeader: string | undefined): { email: string; role: string } | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const jwtSecret = process.env.JWT_SECRET || "default-secret-change-me";
  try {
    return jwt.verify(token, jwtSecret) as { email: string; role: string };
  } catch {
    return null;
  }
}

// ─── Admin Auth ──────────────────────────────────────────────
export const adminAuth = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ success: false, error: "Email and password required" });
        return;
      }

      const superAdminEmail = process.env.SUPERADMIN_EMAIL;
      const superAdminPassword = process.env.SUPERADMIN_PASSWORD;
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      const jwtSecret = process.env.JWT_SECRET || "default-secret-change-me";

      let role: string | null = null;

      if (email === superAdminEmail && superAdminPassword) {
        if (await bcrypt.compare(password, superAdminPassword)) role = "superadmin";
      } else if (email === adminEmail && adminPassword) {
        if (await bcrypt.compare(password, adminPassword)) role = "admin";
      }

      if (!role) {
        res.status(401).json({ success: false, error: "Invalid credentials" });
        return;
      }

      const token = jwt.sign({ email, role }, jwtSecret, { expiresIn: "8h" });
      res.json({ success: true, token, role });
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ success: false, error: "Authentication failed" });
    }
  });
});

// ─── Intern API ──────────────────────────────────────────────
export const internApi = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { action, ...data } = req.body;
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      const internsRef = db.collection("internLogs");

      if (action === "check") {
        // Check for any unacknowledged fee due for this fingerprint
        const feeDueSnap = await db.collection("feeDues")
          .where("fingerprint", "==", data.fingerprint)
          .where("acknowledged", "==", false)
          .limit(1)
          .get();

        const feeDue = feeDueSnap.empty ? null : {
          id: feeDueSnap.docs[0].id,
          amount: feeDueSnap.docs[0].data().amount,
          message: feeDueSnap.docs[0].data().message || "",
        };

        // Check if intern has a record for today
        const todaySnap = await internsRef
          .where("fingerprint", "==", data.fingerprint)
          .where("date", "==", today)
          .limit(1)
          .get();

        if (!todaySnap.empty) {
          const doc = todaySnap.docs[0];
          const d = doc.data();
          res.json({
            found: true,
            data: {
              name: d.name,
              contact: d.contact,
              college: d.college,
              domain: d.domain,
              checkedIn: !!d.checkInTime && !d.checkOutTime,
              checkInTime: d.checkInTime || null,
            },
            docId: doc.id,
            feeDue,
          });
          return;
        }

        // Check previous days for returning intern (autofill)
        const prevSnap = await internsRef
          .where("fingerprint", "==", data.fingerprint)
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        if (!prevSnap.empty) {
          const d = prevSnap.docs[0].data();
          res.json({
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
          });
          return;
        }

        res.json({ found: false, feeDue });
        return;
      }

      // ── Update Fee Due (superadmin only) ──
      if (action === "updateFee") {
        const user = verifyToken(req.headers.authorization);
        if (!user || user.role !== "superadmin") {
          res.status(401).json({ success: false, error: "Only super admin can update fee dues" });
          return;
        }

        const { fingerprint: fp, amount, message: feeMsg } = data;
        if (!fp) {
          res.status(400).json({ success: false, error: "Fingerprint required" });
          return;
        }

        const feeAmount = parseFloat(amount) || 0;

        // Look up student name from any existing log
        const nameSnap = await internsRef
          .where("fingerprint", "==", fp)
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();
        const studentName = nameSnap.empty ? "Unknown" : nameSnap.docs[0].data().name;

        if (feeAmount <= 0) {
          // Clear fee due — delete any existing record
          const existing = await db.collection("feeDues")
            .where("fingerprint", "==", fp)
            .get();
          const batch = db.batch();
          existing.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          res.json({ success: true, cleared: true });
          return;
        }

        // Upsert fee due
        const existingFee = await db.collection("feeDues")
          .where("fingerprint", "==", fp)
          .limit(1)
          .get();

        if (existingFee.empty) {
          await db.collection("feeDues").add({
            fingerprint: fp,
            studentName,
            amount: feeAmount,
            message: feeMsg || `You have a pending fee of ₹${feeAmount}. Please clear it at the earliest.`,
            acknowledged: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          await existingFee.docs[0].ref.update({
            amount: feeAmount,
            message: feeMsg || `You have a pending fee of ₹${feeAmount}. Please clear it at the earliest.`,
            acknowledged: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        res.json({ success: true });
        return;
      }

      // ── Acknowledge Fee Due ──
      if (action === "acknowledgeFee") {
        const { feeId } = data;
        if (!feeId) {
          res.status(400).json({ success: false, error: "Fee ID required" });
          return;
        }
        await db.collection("feeDues").doc(feeId).update({ acknowledged: true });
        res.json({ success: true });
        return;
      }

      if (action === "register") {
        // Check duplicate for today
        const dupSnap = await internsRef
          .where("fingerprint", "==", data.fingerprint)
          .where("date", "==", today)
          .limit(1)
          .get();

        if (!dupSnap.empty) {
          res.json({ success: false, error: "Already registered today" });
          return;
        }

        const ip =
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress ||
          "unknown";

        await internsRef.add({
          name: data.name,
          contact: data.contact,
          college: data.college,
          domain: data.domain,
          fingerprint: data.fingerprint,
          ip,
          browser: data.browser,
          os: data.os,
          deviceType: data.deviceType,
          checkInTime: "",
          checkOutTime: "",
          date: today,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ success: true });
        return;
      }

      if (action === "update") {
        const todaySnap = await internsRef
          .where("fingerprint", "==", data.fingerprint)
          .where("date", "==", today)
          .limit(1)
          .get();

        if (todaySnap.empty) {
          const ip =
            (req.headers["x-forwarded-for"] as string) ||
            req.socket.remoteAddress ||
            "unknown";
          await internsRef.add({
            name: data.name,
            contact: data.contact,
            college: data.college,
            domain: data.domain,
            fingerprint: data.fingerprint,
            ip,
            browser: data.browser,
            os: data.os,
            deviceType: data.deviceType,
            checkInTime: "",
            checkOutTime: "",
            date: today,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          await todaySnap.docs[0].ref.update({
            name: data.name,
            contact: data.contact,
            college: data.college,
            domain: data.domain,
          });
        }
        res.json({ success: true });
        return;
      }

      if (action === "checkin") {
        const todaySnap = await internsRef
          .where("fingerprint", "==", data.fingerprint)
          .where("date", "==", today)
          .limit(1)
          .get();

        if (todaySnap.empty) {
          res.json({ success: false, error: "Please register first" });
          return;
        }

        const doc = todaySnap.docs[0];
        if (doc.data().checkInTime) {
          res.json({ success: false, error: "Already checked in today" });
          return;
        }

        await doc.ref.update({ checkInTime: now });
        res.json({ success: true });
        return;
      }

      if (action === "checkout") {
        const todaySnap = await internsRef
          .where("fingerprint", "==", data.fingerprint)
          .where("date", "==", today)
          .limit(1)
          .get();

        if (todaySnap.empty || !todaySnap.docs[0].data().checkInTime) {
          res.json({ success: false, error: "Not checked in" });
          return;
        }

        await todaySnap.docs[0].ref.update({ checkOutTime: now });
        res.json({ success: true });
        return;
      }

      res.status(400).json({ error: "Invalid action" });
    } catch (error) {
      console.error("Intern API error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
});

// ─── Employee API ────────────────────────────────────────────
export const employeeApi = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { action, ...data } = req.body;
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      // ── Login ──
      if (action === "login") {
        const { email, password } = data;
        if (!email || !password) {
          res.status(400).json({ success: false, error: "Email and password required" });
          return;
        }

        // Employee credentials from env (comma-separated for multiple employees)
        // Format: email1:hash1:Name1,email2:hash2:Name2,...
        const employeeList = process.env.EMPLOYEE_CREDENTIALS || "";
        const employees = employeeList.split(",").filter(Boolean);

        let matchedName: string | null = null;
        const jwtSecret = process.env.JWT_SECRET || "default-secret-change-me";

        for (const entry of employees) {
          const [empEmail, empHash, empName] = entry.split(":");
          if (email === empEmail && empHash) {
            if (await bcrypt.compare(password, empHash)) {
              matchedName = empName || email;
              break;
            }
          }
        }

        if (!matchedName) {
          res.status(401).json({ success: false, error: "Invalid credentials" });
          return;
        }

        const token = jwt.sign({ email, role: "employee", name: matchedName }, jwtSecret, { expiresIn: "8h" });
        res.json({ success: true, token, name: matchedName });
        return;
      }

      // All other actions require a valid employee token
      const user = verifyToken(req.headers.authorization);
      if (!user || user.role !== "employee") {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const employeeLogsRef = db.collection("employeeLogs");

      // ── Status ──
      if (action === "status") {
        const todaySnap = await employeeLogsRef
          .where("email", "==", user.email)
          .where("date", "==", today)
          .limit(1)
          .get();

        if (!todaySnap.empty) {
          const d = todaySnap.docs[0].data();
          res.json({
            checkedIn: !!d.checkInTime && !d.checkOutTime,
            checkInTime: d.checkInTime || null,
          });
          return;
        }

        res.json({ checkedIn: false, checkInTime: null });
        return;
      }

      // ── Check In ──
      if (action === "checkin") {
        const todaySnap = await employeeLogsRef
          .where("email", "==", user.email)
          .where("date", "==", today)
          .limit(1)
          .get();

        if (!todaySnap.empty && todaySnap.docs[0].data().checkInTime) {
          res.json({ success: false, error: "Already checked in today" });
          return;
        }

        const ip =
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress ||
          "unknown";

        if (todaySnap.empty) {
          await employeeLogsRef.add({
            name: (user as any).name || user.email,
            email: user.email,
            fingerprint: data.fingerprint || "",
            ip,
            browser: data.browser || "",
            os: data.os || "",
            deviceType: data.deviceType || "",
            checkInTime: now,
            checkOutTime: "",
            date: today,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          await todaySnap.docs[0].ref.update({ checkInTime: now });
        }

        res.json({ success: true });
        return;
      }

      // ── Check Out ──
      if (action === "checkout") {
        const todaySnap = await employeeLogsRef
          .where("email", "==", user.email)
          .where("date", "==", today)
          .limit(1)
          .get();

        if (todaySnap.empty || !todaySnap.docs[0].data().checkInTime) {
          res.json({ success: false, error: "Not checked in" });
          return;
        }

        await todaySnap.docs[0].ref.update({ checkOutTime: now });
        res.json({ success: true });
        return;
      }

      res.status(400).json({ error: "Invalid action" });
    } catch (error) {
      console.error("Employee API error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
});

// ─── Visitor API ─────────────────────────────────────────────
export const visitorApi = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const data = req.body;
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();
      const ip =
        (req.headers["x-forwarded-for"] as string) ||
        req.socket.remoteAddress ||
        "unknown";

      await db.collection("visitorLogs").add({
        name: data.name,
        email: data.email,
        phone: data.phone,
        college: data.college,
        purpose: data.purpose,
        fingerprint: data.fingerprint,
        ip,
        browser: data.browser,
        os: data.os,
        deviceType: data.deviceType,
        visitTime: now,
        date: today,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Visitor API error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
});

// ─── Get Logs (admin) ────────────────────────────────────────
export const getLogs = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = verifyToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const { type } = req.body;
      const today = new Date().toISOString().split("T")[0];

      if (type === "stats") {
        const [internSnap, visitorSnap, employeeSnap] = await Promise.all([
          db.collection("internLogs").get(),
          db.collection("visitorLogs").get(),
          db.collection("employeeLogs").get(),
        ]);

        const internRows = internSnap.docs.map((d) => d.data());
        const internsToday = internRows.filter((r) => r.date === today).length;
        const checkedIn = internRows.filter(
          (r) => r.date === today && r.checkInTime && !r.checkOutTime
        ).length;
        const visitorsToday = visitorSnap.docs.filter((d) => d.data().date === today).length;

        const employeeRows = employeeSnap.docs.map((d) => d.data());
        const employeesToday = employeeRows.filter((r) => r.date === today).length;
        const employeesCheckedIn = employeeRows.filter(
          (r) => r.date === today && r.checkInTime && !r.checkOutTime
        ).length;

        res.json({
          success: true,
          stats: {
            internsToday,
            visitorsToday,
            checkedIn,
            employeesToday,
            employeesCheckedIn,
            totalRecords: internSnap.size + visitorSnap.size + employeeSnap.size,
          },
        });
        return;
      }

      if (type === "intern") {
        const snap = await db.collection("internLogs").orderBy("createdAt", "desc").get();

        // Build a map of fingerprint -> fee amount
        const feeSnap = await db.collection("feeDues").get();
        const feeMap: Record<string, number> = {};
        feeSnap.docs.forEach((d) => {
          const fd = d.data();
          feeMap[fd.fingerprint] = fd.amount || 0;
        });

        const data = snap.docs.map((d) => {
          const r = d.data();
          return [
            r.name, r.contact, r.college, r.domain,
            r.fingerprint, r.ip, r.browser, r.os, r.deviceType,
            r.checkInTime, r.checkOutTime, r.date,
            String(feeMap[r.fingerprint] || 0),
          ];
        });
        res.json({ success: true, data });
        return;
      }

      if (type === "visitor") {
        const snap = await db.collection("visitorLogs").orderBy("createdAt", "desc").get();
        const data = snap.docs.map((d) => {
          const r = d.data();
          return [
            r.name, r.email, r.phone, r.college, r.purpose,
            r.fingerprint, r.ip, r.browser, r.os, r.deviceType,
            r.visitTime, r.date,
          ];
        });
        res.json({ success: true, data });
        return;
      }

      if (type === "employee") {
        const snap = await db.collection("employeeLogs").orderBy("createdAt", "desc").get();
        const data = snap.docs.map((d) => {
          const r = d.data();
          return [
            r.name, r.email, r.fingerprint, r.ip,
            r.browser, r.os, r.deviceType,
            r.checkInTime, r.checkOutTime, r.date,
          ];
        });
        res.json({ success: true, data });
        return;
      }

      res.status(400).json({ error: "Invalid type" });
    } catch (error) {
      console.error("Get logs error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
});

// ─── Export Excel & Auto-Delete ──────────────────────────────
export const exportLogs = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = verifyToken(req.headers.authorization);
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const { type } = req.body; // "intern" | "visitor" | "employee" | "all"

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "EduPhoenix Log System";
      workbook.created = new Date();

      const docsToDelete: FirebaseFirestore.DocumentReference[] = [];

      // ── Intern sheet ──
      if (type === "intern" || type === "all") {
        const snap = await db.collection("internLogs").orderBy("createdAt", "asc").get();
        const sheet = workbook.addWorksheet("Intern Logs");
        sheet.columns = [
          { header: "Name", key: "name", width: 20 },
          { header: "Contact", key: "contact", width: 15 },
          { header: "College", key: "college", width: 25 },
          { header: "Domain", key: "domain", width: 15 },
          { header: "Device ID", key: "fingerprint", width: 20 },
          { header: "IP", key: "ip", width: 15 },
          { header: "Browser", key: "browser", width: 15 },
          { header: "OS", key: "os", width: 15 },
          { header: "Device Type", key: "deviceType", width: 12 },
          { header: "Check-in", key: "checkInTime", width: 22 },
          { header: "Check-out", key: "checkOutTime", width: 22 },
          { header: "Date", key: "date", width: 12 },
        ];

        sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD32F2F" },
        };

        snap.docs.forEach((doc) => {
          const d = doc.data();
          sheet.addRow({
            name: d.name,
            contact: d.contact,
            college: d.college,
            domain: d.domain,
            fingerprint: d.fingerprint,
            ip: d.ip,
            browser: d.browser,
            os: d.os,
            deviceType: d.deviceType,
            checkInTime: d.checkInTime || "",
            checkOutTime: d.checkOutTime || "",
            date: d.date,
          });
          docsToDelete.push(doc.ref);
        });
      }

      // ── Employee sheet ──
      if (type === "employee" || type === "all") {
        const snap = await db.collection("employeeLogs").orderBy("createdAt", "asc").get();
        const sheet = workbook.addWorksheet("Employee Logs");
        sheet.columns = [
          { header: "Name", key: "name", width: 20 },
          { header: "Email", key: "email", width: 25 },
          { header: "Device ID", key: "fingerprint", width: 20 },
          { header: "IP", key: "ip", width: 15 },
          { header: "Browser", key: "browser", width: 15 },
          { header: "OS", key: "os", width: 15 },
          { header: "Device Type", key: "deviceType", width: 12 },
          { header: "Check-in", key: "checkInTime", width: 22 },
          { header: "Check-out", key: "checkOutTime", width: 22 },
          { header: "Date", key: "date", width: 12 },
        ];

        sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD32F2F" },
        };

        snap.docs.forEach((doc) => {
          const d = doc.data();
          sheet.addRow({
            name: d.name,
            email: d.email,
            fingerprint: d.fingerprint,
            ip: d.ip,
            browser: d.browser,
            os: d.os,
            deviceType: d.deviceType,
            checkInTime: d.checkInTime || "",
            checkOutTime: d.checkOutTime || "",
            date: d.date,
          });
          docsToDelete.push(doc.ref);
        });
      }

      // ── Visitor sheet ──
      if (type === "visitor" || type === "all") {
        const snap = await db.collection("visitorLogs").orderBy("createdAt", "asc").get();
        const sheet = workbook.addWorksheet("Visitor Logs");
        sheet.columns = [
          { header: "Name", key: "name", width: 20 },
          { header: "Email", key: "email", width: 25 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "College", key: "college", width: 25 },
          { header: "Purpose", key: "purpose", width: 30 },
          { header: "Device ID", key: "fingerprint", width: 20 },
          { header: "IP", key: "ip", width: 15 },
          { header: "Browser", key: "browser", width: 15 },
          { header: "OS", key: "os", width: 15 },
          { header: "Device Type", key: "deviceType", width: 12 },
          { header: "Visit Time", key: "visitTime", width: 22 },
          { header: "Date", key: "date", width: 12 },
        ];

        sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD32F2F" },
        };

        snap.docs.forEach((doc) => {
          const d = doc.data();
          sheet.addRow({
            name: d.name,
            email: d.email,
            phone: d.phone,
            college: d.college,
            purpose: d.purpose,
            fingerprint: d.fingerprint,
            ip: d.ip,
            browser: d.browser,
            os: d.os,
            deviceType: d.deviceType,
            visitTime: d.visitTime || "",
            date: d.date,
          });
          docsToDelete.push(doc.ref);
        });
      }

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      const filename = `eduphoenix_logs_${new Date().toISOString().split("T")[0]}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", String(Buffer.byteLength(buffer as unknown as string)));
      res.status(200).send(buffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
});

// ─── Auto Check Out (Scheduled) ──────────────────────────────
export const autoCheckOut = functions.pubsub.schedule("30 13 * * *").timeZone("UTC").onRun(async (context) => {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();
  
  try {
    const snap = await db.collection("employeeLogs")
      .where("date", "==", today)
      .where("autoCheckout", "==", true)
      .get();
      
    const batch = db.batch();
    let count = 0;
    
    snap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.checkInTime && !data.checkOutTime) {
        batch.update(doc.ref, { checkOutTime: now });
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`Auto checked out ${count} employees.`);
    }
  } catch (error) {
    console.error("Auto checkout error:", error);
  }
});
