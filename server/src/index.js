const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// ── In-memory data store ──────────────────────────────────────────────────────
// Seeded with realistic Ghanaian transactions
const NAMES = [
  "Kwame Asante", "Ama Serwaa", "Kofi Mensah", "Akua Boateng", "Yaw Darko",
  "Abena Osei", "Kojo Acheampong", "Esi Quaye", "Nana Adjei", "Fiifi Ankrah",
  "Afia Boadu", "Kwabena Dankwa", "Adwoa Frimpong", "Kweku Gyamfi", "Maame Hagan",
  "Nii Amanor", "Patience Inkoom", "Samuel Jnr", "Cecilia Kumi", "Abena Larbi",
];
const TELCOS = ["MTN", "Telecel", "AT"];
const STATUSES = ["successful", "successful", "successful", "pending", "pending", "failed"];

function pad(n) { return String(n).padStart(2, "0"); }
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

let transactions = [];
let ovaRecords = [];
let webhookSecret = "n8n-secret-2024"; // Change this in production

// ── Helper ────────────────────────────────────────────────────────────────────
function getStats() {
  const total = transactions.length;
  const successful = transactions.filter((t) => t.status === "successful").length;
  const pending = transactions.filter((t) => t.status === "pending").length;
  const failed = transactions.filter((t) => t.status === "failed").length;
  const ovaMatched = transactions.filter((t) => t.ovaMatched).length;
  return { total, successful, pending, failed, ovaMatched };
}

// ── AUTH MIDDLEWARE (simple token for n8n) ────────────────────────────────────
function requireApiKey(req, res, next) {
  const key = req.headers["x-api-key"] || req.query.apiKey;
  if (!key || key !== webhookSecret) {
    return res.status(401).json({ error: "Unauthorized. Provide x-api-key header." });
  }
  next();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC DASHBOARD ROUTES (used by the React client)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/transactions — list all, filter by status/telco/search/date
app.get("/api/transactions", (req, res) => {
  const { status, telco, search, date, page = 1, limit = 12 } = req.query;
  let result = [...transactions];
  if (status && status !== "all") result = result.filter((t) => t.status === status);
  if (telco && telco !== "all") result = result.filter((t) => t.telco === telco);
  if (date) result = result.filter((t) => t.date === date);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.uniwalletId.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.networkId || "").toLowerCase().includes(q)
    );
  }
  const total = result.length;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const data = result.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  res.json({ data, total, page: pageNum, pages: Math.ceil(total / limitNum), stats: getStats() });
});

// GET /api/transactions/pending — for n8n to pull pending list
app.get("/api/transactions/pending", requireApiKey, (req, res) => {
  const pending = transactions.filter((t) => t.status === "pending");
  res.json({ transactions: pending, total: pending.length, exportedAt: new Date().toISOString() });
});

// GET /api/transactions/export — download pending as CSV (used by dashboard)
app.get("/api/transactions/export", (req, res) => {
  const { status = "pending" } = req.query;
  const subset = transactions.filter((t) => t.status === status);
  const headers = ["id","uniwalletId","name","telco","date","time","amount","status","networkId","merchantId","referenceId","ovaStatus"];
  const rows = [headers, ...subset.map((t) => headers.map((h) => t[h] ?? ""))];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=transactions_${status}_${Date.now()}.csv`);
  res.send(csv);
});

// GET /api/stats — summary stats
app.get("/api/stats", (req, res) => {
  const stats = getStats();
  // Build last-14-day breakdown
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 13 + i);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const daily = days.map((date) => ({
    date,
    successful: transactions.filter((t) => t.date === date && t.status === "successful").length,
    pending: transactions.filter((t) => t.date === date && t.status === "pending").length,
    failed: transactions.filter((t) => t.date === date && t.status === "failed").length,
  }));
  res.json({ ...stats, daily });
});

// PATCH /api/transactions/:id — update a single transaction status
app.patch("/api/transactions/:id", (req, res) => {
  const { id } = req.params;
  const { status, updatedBy = "CS Agent" } = req.body;
  if (!["successful", "failed", "pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const idx = transactions.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: "Transaction not found" });
  
  if (transactions[idx].status !== status) {
    transactions[idx].previousStatus = transactions[idx].status;
  }
  transactions[idx].status = status;
  transactions[idx].updatedAt = new Date().toISOString();
  transactions[idx].updatedBy = updatedBy;
  if (status === "successful") {
    if (!transactions[idx].networkId) {
      transactions[idx].networkId = `NET-${transactions[idx].telco}-${randInt(100000, 999999)}`;
    }
  } else {
    transactions[idx].networkId = null;
  }
  res.json({ success: true, transaction: transactions[idx] });
});

// POST /api/transactions/bulk-update — bulk update (used by dashboard bulk select)
app.post("/api/transactions/bulk-update", (req, res) => {
  const { ids, status, updatedBy = "CS Agent" } = req.body;
  if (!Array.isArray(ids) || !status) return res.status(400).json({ error: "ids[] and status required" });
  let updated = 0;
  ids.forEach((id) => {
    const idx = transactions.findIndex((t) => t.id === id);
    if (idx !== -1) {
      if (transactions[idx].status !== status) {
        transactions[idx].previousStatus = transactions[idx].status;
      }
      transactions[idx].status = status;
      transactions[idx].updatedAt = new Date().toISOString();
      transactions[idx].updatedBy = updatedBy;
      if (status === "successful") {
        if (!transactions[idx].networkId) {
          transactions[idx].networkId = `NET-${transactions[idx].telco}-${randInt(100000, 999999)}`;
        }
      } else {
        transactions[idx].networkId = null;
      }
      updated++;
    }
  });
  res.json({ success: true, updated, stats: getStats() });
});

// POST /api/ova/upload — upload OVA CSV from dashboard
app.post("/api/ova/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const content = req.file.buffer.toString("utf-8");
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    ovaRecords = records.map((r) => ({
      uniwalletId: r["UniWallet ID"] || r.uniwalletId || r.UniWalletId || "",
      date: r["Transaction Date"] || r.date || r.Date || "",
      status: (r.Status || r.status || "").toLowerCase(),
      amount: parseFloat(r.Amount || r.amount || 0),
      merchantId: r["Merchant ID"] || r.merchantId || "",
      referenceId: r["Reference ID"] || r.referenceId || "",
      telco: r.Telco || r.telco || "",
      name: r["Full Name"] || r.name || r.Name || "",
    }));
    // Auto-match: mark transactions that share uniwalletId+date with OVA
    const ovaMap = new Map(ovaRecords.map((r) => [`${r.uniwalletId}|${r.date}`, r]));
    transactions.forEach((t) => {
      const key = `${t.uniwalletId}|${t.date}`;
      if (ovaMap.has(key)) {
        t.ovaMatched = true;
        t.ovaStatus = ovaMap.get(key).status;
      }
    });
    res.json({ success: true, records: ovaRecords.length, matched: transactions.filter((t) => t.ovaMatched).length });
  } catch (err) {
    res.status(400).json({ error: "Failed to parse CSV: " + err.message });
  }
});

// DELETE /api/ova — clear parsed OVA data
app.delete("/api/ova", (req, res) => {
  ovaRecords = [];
  transactions.forEach((t) => {
    t.ovaMatched = false;
    t.ovaStatus = null;
  });
  res.json({ success: true, stats: getStats() });
});

// POST /api/transactions/upload — upload App Support Transactions CSV
app.post("/api/transactions/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const content = req.file.buffer.toString("utf-8");
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    
    // Completely overwrite transactions
    transactions = records.map((r, i) => {
      const status = (r.Status || r.status || "pending").toLowerCase();
      const telco = r.Telco || r.telco || "";
      return {
        id: r.ID || r.id || `TXN-${String(i + 1).padStart(4, "0")}`,
        uniwalletId: r["UniWallet ID"] || r.uniwalletId || r.UniWalletId || "",
        name: r["Full Name"] || r.name || r.Name || "",
        telco,
        date: r["Transaction Date"] || r.date || r.Date || "",
        time: r.Time || r.time || "00:00:00",
        amount: parseFloat(r.Amount || r.amount || 0),
        status,
        networkId: status === "successful" ? (r.NetworkId || r.networkId || `NET-${telco}-${randInt(100000, 999999)}`) : null,
        previousStatus: null,
        ovaStatus: null,
        ovaMatched: false,
        merchantId: r["Merchant ID"] || r.merchantId || "",
        referenceId: r["Reference ID"] || r.referenceId || "",
        updatedAt: null,
        updatedBy: null,
      };
    });

    // Need to auto-match if OVA is already uploaded
    if (ovaRecords.length > 0) {
      const ovaMap = new Map(ovaRecords.map((r) => [`${r.uniwalletId}|${r.date}`, r]));
      transactions.forEach((t) => {
        const key = `${t.uniwalletId}|${t.date}`;
        if (ovaMap.has(key)) {
          t.ovaMatched = true;
          t.ovaStatus = ovaMap.get(key).status;
        }
      });
    }

    res.json({ success: true, records: transactions.length, matched: transactions.filter((t) => t.ovaMatched).length });
  } catch (err) {
    res.status(400).json({ error: "Failed to parse CSV: " + err.message });
  }
});

// DELETE /api/transactions — clear App Support Transactions
app.delete("/api/transactions", (req, res) => {
  transactions = [];
  res.json({ success: true, stats: getStats() });
});

// GET /api/transactions/sample — download sample App Support CSV
app.get("/api/transactions/sample", (req, res) => {
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  
  const sampleData = Array.from({ length: 15 }, (_, i) => {
    const status = rand(STATUSES);
    const telco = rand(TELCOS);
    return [
      `TXN-${pad(i + 1)}`,
      `UW-1000${pad(i + 1)}`,
      rand(NAMES),
      telco,
      dateStr,
      `${pad(randInt(8, 18))}:00:00`,
      (randInt(10, 500) + 0.5).toFixed(2),
      status,
      status === "successful" ? `NET-${telco}-${randInt(100000, 999999)}` : "",
      `MERCH-${pad(randInt(1, 10))}`,
      `REF-${pad(i + 1)}`
    ];
  });
  
  const headers = ["ID", "UniWallet ID", "Full Name", "Telco", "Transaction Date", "Time", "Amount", "Status", "Network ID", "Merchant ID", "Reference ID"];
  const rows = [headers, ...sampleData];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=sample_app_transactions_${Date.now()}.csv`);
  res.send(csv);
});

// GET /api/ova/records — get parsed OVA records
app.get("/api/ova/records", (req, res) => {
  res.json({ records: ovaRecords, total: ovaRecords.length });
});

// GET /api/ova/sample — download sample OVA CSV matching existing transactions
app.get("/api/ova/sample", (req, res) => {
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  
  const sampleData = Array.from({ length: 15 }, (_, i) => {
    const status = rand(STATUSES);
    const telco = rand(TELCOS);
    return [
      `UW-1000${pad(i + 1)}`,
      dateStr,
      status,
      (randInt(10, 500) + 0.5).toFixed(2),
      `MERCH-${pad(randInt(1, 10))}`,
      `REF-${pad(i + 1)}`,
      telco,
      rand(NAMES)
    ];
  });
  
  const headers = ["UniWallet ID","Transaction Date","Status","Amount","Merchant ID","Reference ID","Telco","Full Name"];
  const rows = [headers, ...sampleData];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=sample_ova_${Date.now()}.csv`);
  res.send(csv);
});

// GET /api/reconciliation — get reconciliation comparison rows
app.get("/api/reconciliation", (req, res) => {
  const matched = transactions.filter((t) => t.ovaMatched);
  const mismatched = matched.filter((t) => t.status !== t.ovaStatus && t.status === "pending");
  res.json({
    matched: matched.length,
    mismatched: mismatched.length,
    inSync: matched.length - mismatched.length,
    rate: matched.length ? Math.round(((matched.length - mismatched.length) / matched.length) * 100) : 0,
    transactions: matched,
    stats: getStats()
  });
});

// POST /api/trigger-n8n — trigger external n8n workflow for bulk reconciliation
app.post("/api/trigger-n8n", async (req, res) => {
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook/bulk-reconcile";
  console.log(`[Dashboard] n8n automation triggered for bulk reconciliation at ${new Date().toISOString()}.`);
  console.log(`[Dashboard] N8n details are now hidden from the UI but fully logged here.`);
  
  try {
    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start-bulk-reconciliation", timestamp: new Date().toISOString() })
    });
    if (!response.ok) {
      throw new Error(`n8n responded with status ${response.status}`);
    }
    res.json({ success: true, message: "n8n workflow triggered successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to trigger n8n: " + err.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// n8n WEBHOOK ROUTES  (protected by x-api-key header)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /webhook/n8n/ova-data
// n8n can pull the currently uploaded OVA records in memory
app.get("/webhook/n8n/ova-data", requireApiKey, (req, res) => {
  res.json({ success: true, records: ovaRecords, total: ovaRecords.length, pulledAt: new Date().toISOString() });
});

// POST /webhook/n8n/ova-upload
// n8n sends parsed OVA data as JSON array and triggers auto-reconcile
app.post("/webhook/n8n/ova-upload", requireApiKey, (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: "Body must have records: OvaRecord[]" });
  }
  ovaRecords = records.map((r) => ({
    uniwalletId: r.uniwalletId || r.UniWalletId || "",
    date: r.date || r.Date || "",
    status: (r.status || r.Status || "").toLowerCase(),
    amount: parseFloat(r.amount || r.Amount || 0),
    merchantId: r.merchantId || r.MerchantId || "",
    referenceId: r.referenceId || r.ReferenceId || "",
    telco: r.telco || r.Telco || "",
    name: r.name || r.Name || "",
  }));
  const ovaMap = new Map(ovaRecords.map((r) => [`${r.uniwalletId}|${r.date}`, r]));
  let matched = 0;
  transactions.forEach((t) => {
    const key = `${t.uniwalletId}|${t.date}`;
    if (ovaMap.has(key)) {
      t.ovaMatched = true;
      t.ovaStatus = ovaMap.get(key).status;
      matched++;
    }
  });
  res.json({ success: true, ovaRecords: ovaRecords.length, matched, message: "OVA data ingested and matched" });
});

// POST /webhook/n8n/auto-reconcile
// n8n triggers this after uploading OVA — auto-updates all pending→ovaStatus
app.post("/webhook/n8n/auto-reconcile", requireApiKey, (req, res) => {
  const { updatedBy = "n8n Automation" } = req.body;
  let resolved = 0;
  const resolvedIds = [];
  transactions.forEach((t) => {
    if (t.ovaMatched && t.status === "pending" && t.ovaStatus) {
      t.previousStatus = t.status;
      t.status = t.ovaStatus;
      t.updatedAt = new Date().toISOString();
      t.updatedBy = updatedBy;
      if (t.ovaStatus === "successful") {
        if (!t.networkId) {
          t.networkId = `NET-${t.telco}-${randInt(100000, 999999)}`;
        }
      } else {
        t.networkId = null;
      }
      resolved++;
      resolvedIds.push(t.id);
    }
  });
  res.json({ success: true, resolved, resolvedIds, stats: getStats(), message: `Auto-reconciled ${resolved} pending transactions` });
});

// POST /webhook/n8n/update-status
// n8n sends individual or batch status updates after checking OVA
app.post("/webhook/n8n/update-status", requireApiKey, (req, res) => {
  const updates = req.body.updates || [req.body];
  const results = [];
  updates.forEach(({ id, status, networkId, updatedBy = "n8n Automation" }) => {
    const idx = transactions.findIndex((t) => t.id === id);
    if (idx === -1) { results.push({ id, success: false, error: "Not found" }); return; }
    if (!["successful", "failed", "pending"].includes(status)) { results.push({ id, success: false, error: "Invalid status" }); return; }
    
    if (transactions[idx].status !== status) {
      transactions[idx].previousStatus = transactions[idx].status;
    }
    transactions[idx].status = status;
    transactions[idx].updatedAt = new Date().toISOString();
    transactions[idx].updatedBy = updatedBy;
    if (status === "successful") {
      if (networkId) {
        transactions[idx].networkId = networkId;
      } else if (!transactions[idx].networkId) {
        transactions[idx].networkId = `NET-${transactions[idx].telco}-${randInt(100000, 999999)}`;
      }
    } else {
      transactions[idx].networkId = null;
    }
    results.push({ id, success: true, status, networkId: transactions[idx].networkId });
  });
  res.json({ success: true, results, totalUpdated: results.filter((r) => r.success).length, stats: getStats() });
});

// GET /webhook/n8n/health — n8n can poll this to confirm server is up
app.get("/webhook/n8n/health", requireApiKey, (req, res) => {
  res.json({ status: "ok", stats: getStats(), timestamp: new Date().toISOString() });
});


app.listen(PORT, () => {
  console.log(`\n🟢 ITC Recon Server running on http://localhost:${PORT}`);
  console.log(`📡 Dashboard API:  http://localhost:${PORT}/api`);
  console.log(`🤖 n8n Webhooks:   http://localhost:${PORT}/webhook/n8n/*`);
  console.log(`🔑 API Key:        ${webhookSecret}\n`);
  console.log("n8n Webhook endpoints:");
  console.log("  GET  /webhook/n8n/health         — health check");
  console.log("  GET  /api/transactions/pending    — pull pending list");
  console.log("  GET  /webhook/n8n/ova-data        — pull uploaded OVA records");
  console.log("  POST /webhook/n8n/ova-upload      — push OVA JSON data");
  console.log("  POST /webhook/n8n/auto-reconcile  — trigger auto-resolve");
  console.log("  POST /webhook/n8n/update-status   — push individual updates\n");
});
