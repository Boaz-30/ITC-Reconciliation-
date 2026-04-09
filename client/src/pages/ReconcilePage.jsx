import React, { useState, useEffect } from "react";
import { api } from "../utils/api.js";
import { Btn, Badge, TelcoBadge, MetricCard, Spinner, LoadingOverlay } from "../components/UI.jsx";

export default function ReconcilePage({ toast, onStatsChange, setView }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

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

  const bulkResolve = async () => {
    if (mismatched.length === 0) {
      toast("No unreconciled mismatches to resolve", "info");
      return;
    }
    setResolving(true);
    try {
      const res = await api.bulkResolve("Bulk Reconciliation");
      if (res.resolved === 0) {
        toast("No new mismatches to resolve — data may already be reconciled.", "info");
      } else {
        toast(`Reconciled ${res.resolved} transactions (Batch: ${res.batchId})`, "success");
      }
      load();
    } catch (e) { toast(e.message, "error"); }
    finally { setResolving(false); }
  };

  const handleClearOva = async () => {
    if (!window.confirm("Are you sure you want to clear the current OVA sheet data?")) return;
    try {
      await api.deleteOva();
      toast("OVA data cleared", "success");
      setView?.("upload");
    } catch (e) { toast(e.message, "error"); }
  };

  // Only count unreconciled mismatches
  const mismatched = (data?.transactions || []).filter(
    (t) => t.status === "pending" && t.ovaStatus && t.status !== t.ovaStatus && !t.reconciled
  );

  const alreadyReconciled = (data?.transactions || []).filter((t) => t.reconciled);

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <LoadingOverlay
        visible={resolving}
        title="Running Bulk Reconciliation…"
        subtitle="Matching and resolving all pending transactions against OVA records. This may take a moment."
      />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>OVA Reconciliation</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Compare Uniwallet transaction statuses against OVA records</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn size="sm" onClick={load}>{loading ? <Spinner size={12} /> : "↻"} Refresh</Btn>
          {mismatched.length > 0 && (
            <Btn variant="primary" onClick={bulkResolve} disabled={resolving}>
              {resolving ? <Spinner size={12} color="#fff" /> : null}
              Bulk Reconcile {mismatched.length} mismatch{mismatched.length !== 1 ? "es" : ""}
            </Btn>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12 }}>
        <MetricCard label="OVA Matched" value={data?.matched ?? "—"} accent="#378add" />
        <MetricCard label="Unreconciled" value={data ? mismatched.length : "—"} accent="#e24b4a" sub="Pending ≠ OVA status" />
        <MetricCard label="In Sync" value={data?.inSync ?? "—"} accent="#1d9e75" />
        <MetricCard label="Already Reconciled" value={alreadyReconciled.length || "—"} accent="#9b6dd7" sub="Cannot re-reconcile" />
        <MetricCard label="Reconcile Rate" value={data ? `${data.rate}%` : "—"} accent="#7f77dd" />
      </div>

      {/* Already reconciled banner */}
      {data?.matched > 0 && mismatched.length === 0 && (
        <div className="fade-up" style={{ padding: "16px", background: "var(--teal-50)", color: "var(--teal-700)", borderRadius: 12, border: "0.5px solid var(--teal-600)", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <span>All matched transactions have been fully reconciled and are in sync with the OVA data!</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn size="sm" onClick={() => setView?.("audit")} style={{ background: "var(--teal-100)", borderColor: "var(--teal-100)", color: "var(--teal-700)" }}>View Audit Log</Btn>
            <Btn variant="danger" onClick={handleClearOva}>Delete OVA Data & Upload New</Btn>
          </div>
        </div>
      )}

      {/* Already reconciled warning */}
      {alreadyReconciled.length > 0 && mismatched.length > 0 && (
        <div className="fade-up" style={{ padding: "12px 16px", background: "var(--purple-50)", color: "var(--purple-600)", borderRadius: 12, border: "1px solid rgba(139, 92, 246, 0.15)", fontWeight: 500, fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <span>{alreadyReconciled.length} transaction{alreadyReconciled.length !== 1 ? "s have" : " has"} already been reconciled and will be skipped.</span>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.02)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>OVA-matched transactions</span>
          <div style={{ display: "flex", gap: 8 }}>
            {alreadyReconciled.length > 0 && (
              <span style={{ fontSize: 11, background: "var(--purple-50)", color: "var(--purple-600)", padding: "4px 10px", borderRadius: 99, fontWeight: 600 }}>
                {alreadyReconciled.length} reconciled
              </span>
            )}
            {mismatched.length > 0 && (
              <span style={{ fontSize: 11, background: "var(--amber-50)", color: "var(--amber-700)", padding: "4px 10px", borderRadius: 99, fontWeight: 600 }}>
                {mismatched.length} need attention
              </span>
            )}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-input)" }}>
                {["Txn ID","UniWallet ID","Name","Date","Telco","Amount","Uniwallet Status","OVA Status","Match","Recon Status"].map((h) => (
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
                const isMismatch = t.status === "pending" && t.ovaStatus && t.status !== t.ovaStatus && !t.reconciled;
                const isReconciled = t.reconciled;
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border)", background: isMismatch ? "var(--amber-50)" : isReconciled ? "rgba(139, 92, 246, 0.03)" : "transparent" }}>
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
                      {isReconciled ? (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99, background: "var(--purple-50)", color: "var(--purple-600)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 10 }}>🔒</span> Reconciled
                        </span>
                      ) : isMismatch ? (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99, background: "var(--amber-50)", color: "var(--amber-700)" }}>
                          Pending
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
