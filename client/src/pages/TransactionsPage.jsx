import React, { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api.js";
import { Btn, Badge, TelcoBadge, Modal, MetricCard, Spinner } from "../components/UI.jsx";
import Charts from "../components/Charts.jsx";

export default function TransactionsPage({ view, toast, onStatsChange }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTelco, setFilterTelco] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [modalTxn, setModalTxn] = useState(null);
  const [pickedStatus, setPickedStatus] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [hasOva, setHasOva] = useState(false);

  const checkOva = useCallback(async () => {
    try {
      const res = await api.getOvaRecords();
      setHasOva(res.records && res.records.length > 0);
    } catch (e) {}
  }, []);

  const statusFilter = view === "all" ? filterStatus : view;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12, status: statusFilter, telco: filterTelco };
      if (search) params.search = search;
      if (filterDate) params.date = filterDate;
      const res = await api.getTransactions(params);
      setData(res.data);
      setTotal(res.total);
      setPages(res.pages);
      setStats(res.stats || {});
      onStatsChange?.(res.stats);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, filterTelco, filterDate]);

  useEffect(() => { setPage(1); setSelected(new Set()); }, [view, filterStatus, filterTelco, search, filterDate]);
  useEffect(() => { load(); checkOva(); }, [load, checkOva]);

  const openModal = (txn) => {
    if (!hasOva) {
      toast("Please upload OVA data first", "error");
      return;
    }
    if (!txn.ovaMatched) {
      toast("Cannot be changed: No OVA data matching this transaction.", "error");
      return;
    }
    setModalTxn(txn);
    setPickedStatus(null);
  };
  const closeModal = () => { setModalTxn(null); setPickedStatus(null); };

  const confirmUpdate = async () => {
    if (!pickedStatus || !modalTxn) return;
    setUpdating(true);
    try {
      await api.updateTransaction(modalTxn.id, { status: pickedStatus });
      toast(`${modalTxn.id} → ${pickedStatus}`);
      closeModal();
      load();
    } catch (e) { toast(e.message, "error"); }
    finally { setUpdating(false); }
  };

  const bulkAction = async (status) => {
    if (!hasOva) {
      toast("Please upload OVA data first", "error");
      return;
    }
    const ids = [...selected];
    if (!ids.length) return;
    const invalidTxns = ids.filter(id => !data.find(t => t.id === id)?.ovaMatched);
    if (invalidTxns.length > 0) {
      toast("Select only transactions that have matched OVA data.", "error");
      return;
    }
    try {
      const res = await api.bulkUpdate(ids, status);
      toast(`${res.updated} transactions → ${status}`);
      setSelected(new Set());
      load();
    } catch (e) { toast(e.message, "error"); }
  };

  const toggleAll = (checked) => {
    if (checked) setSelected(new Set(data.map((t) => t.id)));
    else setSelected(new Set());
  };

  const toggleOne = (id, checked) => {
    const s = new Set(selected);
    if (checked) s.add(id); else s.delete(id);
    setSelected(s);
  };

  const selCount = [...selected].filter((id) => data.find((t) => t.id === id && t.status === "pending")).length;
  const viewLabel = { all: "All Transactions", pending: "Pending Transactions", successful: "Successful Transactions", failed: "Failed Transactions" }[view] || "";

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{viewLabel}</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{total} record{total !== 1 ? "s" : ""} · Live from API</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {view === "pending" && <Btn onClick={() => api.exportCSV("pending")}>↓ Export CSV</Btn>}
          {selCount > 0 && (
            <>
              <Btn variant="danger" onClick={() => bulkAction("failed")}>Mark {selCount} Failed</Btn>
              <Btn variant="primary" onClick={() => bulkAction("successful")}>Mark {selCount} Successful</Btn>
            </>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
        <MetricCard label="Total" value={stats.total ?? "—"} accent="var(--gray-600)" sub="All transactions" />
        <MetricCard label="Successful" value={stats.successful ?? "—"} accent="var(--teal-600)" sub={stats.total ? `${Math.round((stats.successful / stats.total) * 100)}% of total` : ""} />
        <MetricCard label="Pending" value={stats.pending ?? "—"} accent="var(--amber-600)" sub="Awaiting resolution" />
        <MetricCard label="Failed" value={stats.failed ?? "—"} accent="var(--red-600)" sub={stats.total ? `${Math.round((stats.failed / stats.total) * 100)}% of total` : ""} />
      </div>

      {/* Charts */}
      <Charts stats={stats} />

      {/* Table */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.02)" }}>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", background: "var(--bg-surface)" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--text-muted)" }}>⌕</span>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID, wallet, name…"
              style={{ width: "100%", fontSize: 13, padding: "8px 12px 8px 32px", border: "1px solid var(--border-md)", borderRadius: "var(--radius-sm)", background: "var(--bg-input)", color: "var(--text-primary)", fontFamily: "inherit" }}
            />
          </div>
          
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ fontSize: 13, padding: "7px 12px", border: "1px solid var(--border-md)", borderRadius: "var(--radius-sm)", background: "var(--bg-input)", color: "var(--text-primary)", fontFamily: "inherit", colorScheme: "var(--text-primary)" === "#fff" ? "dark" : "light" }} title="Filter by date" />

          {view === "all" && (
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ fontSize: 13, padding: "8px 12px", border: "1px solid var(--border-md)", borderRadius: "var(--radius-sm)", background: "var(--bg-input)", color: "var(--text-primary)", fontFamily: "inherit" }}>
              <option value="all">All statuses</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          )}
          <select value={filterTelco} onChange={(e) => setFilterTelco(e.target.value)} style={{ fontSize: 13, padding: "8px 12px", border: "1px solid var(--border-md)", borderRadius: "var(--radius-sm)", background: "var(--bg-input)", color: "var(--text-primary)", fontFamily: "inherit" }}>
            <option value="all">All telcos</option>
            <option value="MTN">MTN</option>
            <option value="Telecel">Telecel</option>
            <option value="AT">AT</option>
          </select>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {loading && <Spinner />}
            <Btn size="sm" onClick={load}>↻ Refresh</Btn>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={th}><input type="checkbox" onChange={(e) => toggleAll(e.target.checked)} checked={selected.size === data.length && data.length > 0} style={{ accentColor: "var(--teal-600)" }} /></th>
                {["Txn ID","UniWallet ID","Full Name","Date","Time","Telco","Amount","Prev Status","Current Status","Network ID","OVA Status","Action"].map((h) => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && !loading && (
                <tr><td colSpan={12} style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: 14 }}>No transactions found</td></tr>
              )}
              {data.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--border)", background: selected.has(t.id) ? "var(--teal-50)" : "transparent", transition: "background 0.15s ease" }}>
                  <td style={td}><input type="checkbox" checked={selected.has(t.id)} onChange={(e) => toggleOne(t.id, e.target.checked)} style={{ accentColor: "var(--teal-600)" }} /></td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>{t.id}</td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>{t.uniwalletId}</td>
                  <td style={{ ...td, fontWeight: 500, fontSize: 13, color: "var(--text-primary)" }}>{t.name}</td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 12 }}>{t.date}</td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 12 }}>{t.time}</td>
                  <td style={td}><TelcoBadge telco={t.telco} /></td>
                  <td style={{ ...td, fontWeight: 600 }}>GHS {t.amount?.toFixed(2)}</td>
                  <td style={td}>{t.previousStatus ? <Badge status={t.previousStatus} /> : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>}</td>
                  <td style={td}><Badge status={t.status} /></td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{t.networkId || "—"}</td>
                  <td style={td}><Badge status={t.ovaStatus} /></td>
                  <td style={td}>
                    {t.status === "pending"
                      ? <Btn size="sm" onClick={() => openModal(t)}>Update</Btn>
                      : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "0.5px solid rgba(0,0,0,0.08)", fontSize: 12, color: "#9e9b94" }}>
          <span>Showing {Math.min((page - 1) * 12 + 1, total)}–{Math.min(page * 12, total)} of {total}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</PageBtn>
            {Array.from({ length: Math.min(pages, 6) }, (_, i) => (
              <PageBtn key={i} active={i + 1 === page} onClick={() => setPage(i + 1)}>{i + 1}</PageBtn>
            ))}
            <PageBtn onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>›</PageBtn>
          </div>
        </div>
      </div>

      {/* Update Modal */}
      <Modal open={!!modalTxn} onClose={closeModal} width={400}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#1a1917", marginBottom: 4 }}>Update Transaction Status</h2>
        <p style={{ fontSize: 13, color: "#6b6860", marginBottom: 14, lineHeight: 1.5 }}>Change status to match the OVA record.</p>

        {modalTxn && (
          <div style={{ background: "#f7f6f2", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, display: "flex", flexDirection: "column", gap: 5 }}>
            {[["Transaction ID", modalTxn.id], ["UniWallet ID", modalTxn.uniwalletId], ["Customer", modalTxn.name], ["Telco", modalTxn.telco], ["Amount", `GHS ${modalTxn.amount?.toFixed(2)}`], ["Date / Time", `${modalTxn.date} ${modalTxn.time}`], ["OVA Status", modalTxn.ovaStatus], ["Current Status", modalTxn.status]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9e9b94" }}>{k}</span>
                <span style={{ fontWeight: 500, color: "#1a1917" }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["successful", "failed"].map((s) => (
            <button
              key={s}
              onClick={() => setPickedStatus(s)}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                border: pickedStatus === s ? `1.5px solid ${s === "successful" ? "#1d9e75" : "#e24b4a"}` : "0.5px solid rgba(0,0,0,0.12)",
                background: pickedStatus === s ? (s === "successful" ? "#e1f5ee" : "#fcebeb") : "transparent",
                color: pickedStatus === s ? (s === "successful" ? "#0f6e56" : "#a32d2d") : "#6b6860",
                transition: "all 0.12s",
              }}
            >
              {s === "successful" ? "✓ Mark Successful" : "✕ Mark Failed"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn onClick={closeModal}>Cancel</Btn>
          <Btn variant="primary" onClick={confirmUpdate} disabled={!pickedStatus || updating}>
            {updating ? <Spinner size={12} color="#fff" /> : null} Confirm Update
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

const th = { textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-secondary)", whiteSpace: "nowrap", background: "var(--bg-input)" };
const td = { padding: "12px 16px", color: "var(--text-primary)", verticalAlign: "middle", whiteSpace: "nowrap" };

function PageBtn({ children, onClick, active, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: active ? "none" : "1px solid var(--border-md)", cursor: disabled ? "default" : "pointer", fontSize: 13, fontWeight: active ? 600 : 500, background: active ? "var(--teal-600)" : "transparent", color: active ? "#ffffff" : "var(--text-secondary)", fontFamily: "inherit", opacity: disabled ? 0.4 : 1, transition: "all 0.2s" }}>
      {children}
    </button>
  );
}
