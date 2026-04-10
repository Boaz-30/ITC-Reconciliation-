import React, { useState, useEffect } from "react";
import { api } from "../utils/api.js";
import { Btn, Badge, TelcoBadge, MetricCard, Spinner, LoadingOverlay, Modal } from "../components/UI.jsx";

export default function ReconcilePage({ toast, onStatsChange, setView }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState("all");
  const [bulkMerchantModal, setBulkMerchantModal] = useState(false);
  const [merchantLoading, setMerchantLoading] = useState(false);

  const load = async (merchantId) => {
    setLoading(true);
    try {
      const mid = merchantId !== undefined ? merchantId : selectedMerchant;
      const res = await api.getReconciliation(mid);
      setData(res);
      if (res.stats) onStatsChange?.(res.stats);
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  };

  const loadMerchants = async () => {
    try {
      const res = await api.getMerchants();
      setMerchants(res.merchants || []);
    } catch (e) { /* silent */ }
  };

  useEffect(() => { load(); loadMerchants(); }, []);
  useEffect(() => { load(); }, [selectedMerchant]);

  const bulkResolve = async () => {
    if (mismatched.length === 0) {
      toast("No unreconciled mismatches to resolve", "info");
      return;
    }
    setResolving(true);
    try {
      const res = await api.bulkResolve("Bulk Reconciliation", selectedMerchant);
      if (res.resolved === 0) {
        toast("No new mismatches to resolve — data may already be reconciled.", "info");
      } else {
        toast(`Reconciled ${res.resolved} transactions (Batch: ${res.batchId})`, "success");
      }
      load();
      loadMerchants();
    } catch (e) { toast(e.message, "error"); }
    finally { setResolving(false); }
  };

  const bulkResolveForMerchant = async (merchantId) => {
    setMerchantLoading(true);
    try {
      const res = await api.bulkResolve(`Merchant ${merchantId} Reconciliation`, merchantId);
      if (res.resolved === 0) {
        toast(`No mismatches found for merchant ${merchantId}`, "info");
      } else {
        toast(`Reconciled ${res.resolved} transactions for ${merchantId} (Batch: ${res.batchId})`, "success");
      }
      load();
      loadMerchants();
    } catch (e) { toast(e.message, "error"); }
    finally { setMerchantLoading(false); }
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

  // Merchants with unreconciled mismatches
  const merchantsWithMismatches = merchants.filter((m) => m.unreconciled > 0);

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <LoadingOverlay
        visible={resolving}
        title="Running Bulk Reconciliation…"
        subtitle={selectedMerchant !== "all" ? `Reconciling transactions for merchant ${selectedMerchant}…` : "Matching and resolving all pending transactions against OVA records. This may take a moment."}
      />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>OVA Reconciliation</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Compare Uniwallet transaction statuses against OVA records</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn size="sm" onClick={() => load()}>{loading ? <Spinner size={12} /> : "↻"} Refresh</Btn>
          {merchantsWithMismatches.length > 0 && (
            <Btn size="sm" variant="amber" onClick={() => setBulkMerchantModal(true)}>
              ⚡ By Merchant ({merchantsWithMismatches.length})
            </Btn>
          )}
          {mismatched.length > 0 && (
            <Btn variant="primary" onClick={bulkResolve} disabled={resolving}>
              {resolving ? <Spinner size={12} color="#fff" /> : null}
              Bulk Reconcile {mismatched.length} mismatch{mismatched.length !== 1 ? "es" : ""}
            </Btn>
          )}
        </div>
      </div>

      {/* Merchant filter bar */}
      {merchants.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Filter by Merchant:
          </span>
          <button
            onClick={() => setSelectedMerchant("all")}
            style={{
              padding: "5px 14px", fontSize: 12, fontWeight: selectedMerchant === "all" ? 600 : 500,
              background: selectedMerchant === "all" ? "var(--teal-50)" : "var(--bg-input)",
              color: selectedMerchant === "all" ? "var(--teal-700)" : "var(--text-secondary)",
              border: `1px solid ${selectedMerchant === "all" ? "var(--teal-100)" : "var(--border)"}`,
              borderRadius: 99, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
            }}
          >
            All Merchants
          </button>
          {merchants.filter(m => m.merchantId !== "UNKNOWN").map((m) => (
            <button
              key={m.merchantId}
              onClick={() => setSelectedMerchant(m.merchantId)}
              style={{
                padding: "5px 14px", fontSize: 12, fontWeight: selectedMerchant === m.merchantId ? 600 : 500,
                background: selectedMerchant === m.merchantId ? "var(--teal-50)" : "var(--bg-input)",
                color: selectedMerchant === m.merchantId ? "var(--teal-700)" : "var(--text-secondary)",
                border: `1px solid ${selectedMerchant === m.merchantId ? "var(--teal-100)" : "var(--border)"}`,
                borderRadius: 99, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              {m.merchantId}
              {m.unreconciled > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
                  background: "var(--amber-50)", color: "var(--amber-700)", border: "1px solid var(--amber-100)",
                  lineHeight: "14px",
                }}>
                  {m.unreconciled}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

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
            <span>
              {selectedMerchant !== "all"
                ? `All matched transactions for ${selectedMerchant} have been fully reconciled!`
                : "All matched transactions have been fully reconciled and are in sync with the OVA data!"}
            </span>
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
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
            OVA-matched transactions {selectedMerchant !== "all" && <span style={{ color: "var(--teal-600)" }}>· {selectedMerchant}</span>}
          </span>
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
                {["Txn ID","UniWallet ID","Name","Date","Telco","Amount","Merchant","Uniwallet Status","OVA Status","Match","Recon Status"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={11} style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}><Spinner /></td></tr>}
              {!loading && (data?.transactions || []).length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: 14 }}>No OVA-matched records. Upload an OVA file first.</td></tr>
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
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                        background: "var(--blue-50)", color: "var(--blue-700)",
                        border: "1px solid var(--blue-100)",
                      }}>
                        {t.merchantId || "—"}
                      </span>
                    </td>
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

      {/* Bulk Merchant Reconciliation Modal */}
      <Modal open={bulkMerchantModal} onClose={() => setBulkMerchantModal(false)} width={640}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Bulk Reconciliation by Merchant</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Select a merchant to reconcile all their unresolved transactions at once.</p>
          </div>

          {merchantLoading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <Spinner size={24} />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
            {merchantsWithMismatches.map((m) => (
              <div
                key={m.merchantId}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 18px", background: "var(--bg-input)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)", transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      padding: "2px 10px", borderRadius: 6,
                      background: "var(--blue-50)", border: "1px solid var(--blue-100)",
                      color: "var(--blue-700)",
                    }}>
                      {m.merchantId}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {m.total} total transactions
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 11, color: "var(--amber-700)" }}>
                      {m.unreconciled} unreconciled
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>·</span>
                    <span style={{ fontSize: 11, color: "var(--teal-700)" }}>
                      {m.successful} successful
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>·</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {m.pending} pending
                    </span>
                  </div>
                </div>
                <Btn
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    bulkResolveForMerchant(m.merchantId);
                    setBulkMerchantModal(false);
                  }}
                  disabled={merchantLoading}
                  style={{ flexShrink: 0 }}
                >
                  Reconcile {m.unreconciled}
                </Btn>
              </div>
            ))}

            {merchantsWithMismatches.length === 0 && (
              <div style={{
                textAlign: "center", padding: "32px 16px", color: "var(--text-muted)",
                fontSize: 13, fontWeight: 500,
              }}>
                No merchants have unreconciled mismatches.
              </div>
            )}
          </div>

          {/* Reconcile All button */}
          {merchantsWithMismatches.length > 1 && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Or reconcile all {merchantsWithMismatches.reduce((s, m) => s + m.unreconciled, 0)} mismatches across all merchants
              </span>
              <Btn
                variant="primary"
                onClick={() => {
                  setBulkMerchantModal(false);
                  bulkResolve();
                }}
                disabled={resolving}
              >
                Reconcile All Merchants
              </Btn>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn onClick={() => setBulkMerchantModal(false)}>Close</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
