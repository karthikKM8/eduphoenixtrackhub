import { supabase } from "@/integrations/supabase/client";

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

const headers = () => ({
  "Content-Type": "application/json",
  "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
});

const authHeaders = () => {
  const token = localStorage.getItem("admin_token");
  return {
    ...headers(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Intern APIs
  async checkIntern(fingerprint: string) {
    const res = await fetch(`${API_BASE}/intern-api`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action: "check", fingerprint }),
    });
    return res.json();
  },

  async registerIntern(data: Record<string, string>) {
    const res = await fetch(`${API_BASE}/intern-api`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action: "register", ...data }),
    });
    return res.json();
  },

  async updateIntern(data: Record<string, string>) {
    const res = await fetch(`${API_BASE}/intern-api`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action: "update", ...data }),
    });
    return res.json();
  },

  async checkIn(fingerprint: string) {
    const res = await fetch(`${API_BASE}/intern-api`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action: "checkin", fingerprint }),
    });
    return res.json();
  },

  async checkOut(fingerprint: string) {
    const res = await fetch(`${API_BASE}/intern-api`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action: "checkout", fingerprint }),
    });
    return res.json();
  },

  // Visitor APIs
  async registerVisitor(data: Record<string, string>) {
    const res = await fetch(`${API_BASE}/visitor-api`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Admin APIs
  async adminLogin(email: string, password: string) {
    const res = await fetch(`${API_BASE}/admin-auth`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async getLogs(type: "intern" | "visitor", params?: Record<string, string>) {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetch(`${API_BASE}/get-logs${query}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ type }),
    });
    return res.json();
  },

  async getStats() {
    const res = await fetch(`${API_BASE}/get-logs`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ type: "stats" }),
    });
    return res.json();
  },
};
