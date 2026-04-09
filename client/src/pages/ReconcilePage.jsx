import React, { useState, useEffect } from "react";
import { api } from "../utils/api.js";
import { Btn, Badge, TelcoBadge, MetricCard, Spinner, Modal } from "../components/UI.jsx";

export default function ReconcilePage({ toast, onStatsChange, setView }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [modalTxn, setModalTxn] = useState(null);
  const [pickedStatus, setPickedStatus] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getReconciliation();
      setData(res);
      if (res.stats) onStatsChange?.(res.stats);
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const autoResolve = async () => {
    setResolving(true);
    try {
      // Find all pending+ovaMatched with status mismatch, bulk update
      const toResolve = (data?.transactions || []).filter((t) => t.status === "pending" && t.ovaStatus && t.status !== t.ovaStatus);
      if (!toResolve.length) { toast("No mismatches to resolve", "info"); setResolving(false); return; }
      // Group by target status
      const toSuccess = toResolve.filter((t) => t.ovaStatus === "successful").map((t) => t.id);
      const toFail    = toResolve.filter((t) => t.ovaStatus === "failed").map((t) => t.id);
      let updated = 0;
      if (toSuccess.length) { const r = await api.bulkUpdate(toSuccess, "successful"); updated += r.updated; }
      if (toFail.length)    { const r = await api.bulkUpdate(toFail, "failed"); updated += r.updated; }
      toast(`Auto-resolved ${updated} pending transactions`, "success");
      load();
    } catch (e) { toast(e.message, "error"); }
    finally { setResolving(false); }
  };

  const confirmUpdate = async () => {
    if (!pickedStatus || !modalTxn) return;
    try {
      await api.updateTransaction(modalTxn.id, { status: pickedStatus });
      toast(`${modalTxn.id} → ${pickedStatus}`);
      setModalTxn(null); setPickedStatus(null);
      load();
    } catch (e) { toast(e.message, "error"); }
  };

  const handleClearOva = async () => {
    if (!window.confirm("Are you sure you want to clear the current OVA sheet data?")) return;
    try {
      await api.deleteOva();
      toast("OVA data cleared", "success");
      setView?.("upload");
    } catch (e) { toast(e.message, "error"); }
  };

  const handleTriggerN8n = async () => {
    setTriggering(true);
    try {
      await api.triggerN8n();
      toast("n8n bulk reconciliation workflow triggered successfully!", "success");
    } catch (e) { toast(e.message, "error"); }
    finally { setTriggering(false); }
  };

  const mismatched = (data?.transactions || []).filter((t) => t.status === "pending" && t.ovaStatus && t.status !== t.ovaStatus);

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>OVA Reconciliation</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Compare app transaction statuses against OVA records</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn size="sm" onClick={load}>{loading ? <Spinner size={12} /> : "↻"} Refresh</Btn>
          {(data?.transactions || []).length > 0 && (
            <Btn size="sm" variant="primary" onClick={handleTriggerN8n} disabled={triggering} style={{ background: "#7f77dd", borderColor: "#7f77dd", color: "#fff" }}>
              {triggering ? <Spinner size={12} color="#fff" /> : "⚡ "} Trigger n8n Workflow
            </Btn>
          )}
          {mismatched.length > 0 && (
            <Btn variant="primary" onClick={autoResolve} disabled={resolving}>
              {resolving ? <Spinner size={12} color="#fff" /> : null}
              Auto-resolve {mismatched.length} mismatch{mismatched.length !== 1 ? "es" : ""}
            </Btn>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
        <MetricCard label="OVA Matched" value={data?.matched ?? "—"} accent="#378add" />
        <MetricCard label="Mismatched" value={data ? mismatched.length : "—"} accent="#e24b4a" sub="Pending ≠ OVA status" />
        <MetricCard label="In Sync" value={data?.inSync ?? "—"} accent="#1d9e75" />
        <MetricCard label="Reconcile Rate" value={data ? `${data.rate}%` : "—"} accent="#7f77dd" />
      </div>
      
      {data?.matched > 0 && mismatched.length === 0 && (
        <div className="fade-up" style={{ padding: "16px", background: "var(--teal-50)", color: "var(--teal-700)", borderRadius: 12, border: "0.5px solid var(--teal-600)", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <span>All matched transactions have been fully reconciled and are in perfect sync with the OVA data!</span>
          </div>
          <Btn variant="danger" onClick={handleClearOva}>Delete OVA Data & Upload New</Btn>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.02)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>OVA-matched transactions</span>
          {mismatched.length > 0 && (
            <span style={{ fontSize: 11, background: "var(--amber-50)", color: "var(--amber-700)", padding: "4px 10px", borderRadius: 99, fontWeight: 600 }}>
              {mismatched.length} need attention
            </span>
          )}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-input)" }}>
                {["Txn ID","UniWallet ID","Name","Date","Telco","Amount","App Status","OVA Status","Match","Action"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}><Spinner /></td></tr>}
              {!loading && (data?.transactions || []).length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: 14 }}>No OVA-matched records. Upload an OVA file first.</td></tr>
              )}
              {(data?.transactions || []).map((t) => {
                const isMismatch = t.status !== t.ovaStatus && t.status === "pending";
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border)", background: isMismatch ? "var(--amber-50)" : "transparent" }}>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>{t.id}</td>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>{t.uniwalletId}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{t.name}</td>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 12 }}>{t.date}</td>
                    <td style={{ padding: "12px 16px" }}><TelcoBadge telco={t.telco} /></td>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>GHS {t.amount?.toFixed(2)}</td>
                    <td style={{ padding: "12px 16px" }}><Badge status={t.status} /></td>
                    <td style={{ padding: "12px 16px" }}><Badge status={t.ovaStatus} /></td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99, background: isMismatch ? "var(--amber-100)" : "var(--teal-100)", color: isMismatch ? "var(--amber-700)" : "var(--teal-700)" }}>
                        {isMismatch ? "Mismatch" : "In sync"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {isMismatch
                        ? <Btn size="sm" onClick={() => { setModalTxn(t); setPickedStatus(null); }}>Resolve</Btn>
                        : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolve modal */}
      <Modal open={!!modalTxn} onClose={() => { setModalTxn(null); setPickedStatus(null); }} width={380}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#1a1917", marginBottom: 12 }}>Resolve Mismatch</h2>
        {modalTxn && (
          <div style={{ background: "#f7f6f2", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, display: "flex", flexDirection: "column", gap: 5 }}>
            {[["ID", modalTxn.id], ["UniWallet", modalTxn.uniwalletId], ["App Status", modalTxn.status], ["OVA Status", modalTxn.ovaStatus]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9e9b94" }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["successful","failed"].map((s) => (
            <button key={s} onClick={() => setPickedStatus(s)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", border: pickedStatus === s ? `1.5px solid ${s === "successful" ? "#1d9e75" : "#e24b4a"}` : "0.5px solid rgba(0,0,0,0.12)", background: pickedStatus === s ? (s === "successful" ? "#e1f5ee" : "#fcebeb") : "transparent", color: pickedStatus === s ? (s === "successful" ? "#0f6e56" : "#a32d2d") : "#6b6860", transition: "all 0.12s" }}>
              {s === "successful" ? "✓ Successful" : "✕ Failed"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn onClick={() => setModalTxn(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={confirmUpdate} disabled={!pickedStatus}>Confirm</Btn>
        </div>
      </Modal>
    </div>
  );
}
