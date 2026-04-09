const BASE = "/api";
const N8N_KEY = "n8n-secret-2024"; // Must match server/src/index.js webhookSecret

async function apiFetch(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  // Transactions
  getTransactions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/transactions?${qs}`);
  },
  uploadTransactions: (files) => {
    const fd = new FormData();
    // Support both single file and array of files
    if (Array.isArray(files)) {
      files.forEach((f) => fd.append("files", f));
    } else {
      fd.append("files", files);
    }
    return fetch(BASE + "/transactions/upload", { method: "POST", body: fd }).then((r) => r.json());
  },
  deleteTransactions: () => apiFetch("/transactions", { method: "DELETE" }),
  updateTransaction: (id, body) =>
    apiFetch(`/transactions/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  bulkUpdate: (ids, status) =>
    apiFetch("/transactions/bulk-update", { method: "POST", body: JSON.stringify({ ids, status }) }),

  // Stats
  getStats: () => apiFetch("/stats"),

  // OVA
  uploadOva: (files) => {
    const fd = new FormData();
    // Support both single file and array of files
    if (Array.isArray(files)) {
      files.forEach((f) => fd.append("files", f));
    } else {
      fd.append("files", files);
    }
    return fetch(BASE + "/ova/upload", { method: "POST", body: fd }).then((r) => r.json());
  },
  getOvaRecords: () => apiFetch("/ova/records"),
  deleteOva: () => apiFetch("/ova", { method: "DELETE" }),
  getReconciliation: () => apiFetch("/reconciliation"),
  bulkResolve: (updatedBy = "Bulk Reconciliation") =>
    apiFetch("/reconciliation/bulk-resolve", { method: "POST", body: JSON.stringify({ updatedBy }) }),
  triggerN8n: () => apiFetch("/trigger-n8n", { method: "POST" }),

  // Audit Log
  getAuditLog: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/audit-log?${qs}`);
  },
  confirmAuditEntries: (body) =>
    apiFetch("/audit-log/confirm", { method: "POST", body: JSON.stringify(body) }),
  exportAuditLog: () => {
    window.open(`${BASE}/audit-log/export`, "_blank");
  },

  // Export CSV
  exportCSV: (status = "pending") => {
    window.open(`${BASE}/transactions/export?status=${status}`, "_blank");
  },
};

// n8n webhook triggers (called from the n8n Integration panel)
export const n8nApi = {
  health: () =>
    fetch("/webhook/n8n/health", { headers: { "x-api-key": N8N_KEY } }).then((r) => r.json()),
  pullPending: () =>
    fetch("/api/transactions/pending", { headers: { "x-api-key": N8N_KEY } }).then((r) => r.json()),
  pullOvaData: () =>
    fetch("/webhook/n8n/ova-data", { headers: { "x-api-key": N8N_KEY } }).then((r) => r.json()),
  autoReconcile: () =>
    fetch("/webhook/n8n/auto-reconcile", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": N8N_KEY },
      body: JSON.stringify({ updatedBy: "n8n Automation" }),
    }).then((r) => r.json()),
};

export { N8N_KEY };
