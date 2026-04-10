import React, { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api.js";
import { Btn, Badge, TelcoBadge, MetricCard, Spinner, LoadingOverlay } from "../components/UI.jsx";

export default function AuditLogPage({ toast }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [filter, setFilter] = useState("all"); // all, confirmed, pending
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [showBatches, setShowBatches] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filter === "confirmed") params.confirmed = "true";
      if (filter === "pending") params.confirmed = "false";
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.getAuditLog(params);
      setData(res.data || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
      setSummary(res.summary || {});
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [page, filter, dateFrom, dateTo]);

  const loadBatches = useCallback(async () => {
    setBatchesLoading(true);
    try {
      const params = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.getAuditBatches(params);
      setBatches(res.batches || []);
    } catch (e) { /* silent */ }
    finally { setBatchesLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [filter, dateFrom, dateTo]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadBatches(); }, [loadBatches]);

  const confirmEntry = async (id) => {
    setConfirming(true);
    try {
      await api.confirmAuditEntries({ ids: [id] });
      toast("Entry confirmed", "success");
      load();
      loadBatches();
    } catch (e) { toast(e.message, "error"); }
    finally { setConfirming(false); }
  };

  const confirmBatch = async (batchId) => {
    setConfirming(true);
    try {
      await api.confirmAuditEntries({ batchId });
      toast(`All entries in batch ${batchId} confirmed`, "success");
      load();
      loadBatches();
    } catch (e) { toast(e.message, "error"); }
    finally { setConfirming(false); }
  };

  const confirmAll = async () => {
    const unconfirmed = data.filter((e) => !e.confirmed);
    if (unconfirmed.length === 0) { toast("Nothing to confirm", "info"); return; }
    setConfirming(true);
    try {
      await api.confirmAuditEntries({ ids: unconfirmed.map((e) => e.id) });
      toast(`${unconfirmed.length} entries confirmed`, "success");
      load();
      loadBatches();
    } catch (e) { toast(e.message, "error"); }
    finally { setConfirming(false); }
  };

  const handleExportFiltered = () => {
    const params = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    api.exportAuditLog(params);
  };

  const clearDateFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  // Group entries by batch for batch actions
  const batchIds = [...new Set(data.filter((e) => !e.confirmed).map((e) => e.batchId))];
  const hasDateFilter = dateFrom || dateTo;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <LoadingOverlay
        visible={confirming}
        title="Confirming Entries…"
        subtitle="Updating audit log confirmation status."
      />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Audit Log</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Review and confirm reconciled transactions</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn size="sm" onClick={handleExportFiltered}>
            ↓ {hasDateFilter ? "Export Filtered" : "Export All"}
          </Btn>
          <Btn size="sm" onClick={load}>{loading ? <Spinner size={12} /> : "↻"} Refresh</Btn>
        </div>
      </div>

      {/* Summary Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
        <MetricCard label="Total Entries" value={summary.totalEntries ?? "—"} accent="var(--gray-600)" sub="All audit records" />
        <MetricCard label="Confirmed" value={summary.confirmedCount ?? "—"} accent="var(--teal-600)" sub="Verified by reviewer" />
        <MetricCard label="Pending Review" value={summary.pendingConfirmation ?? "—"} accent="var(--amber-600)" sub="Awaiting confirmation" />
        <MetricCard label="Batches" value={summary.totalBatches ?? "—"} accent="#9b6dd7" sub="Reconciliation runs" />
      </div>

      {/* Date Range Filter + Batch Downloads */}
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", overflow: "hidden",
        boxShadow: "0 4px 20px -2px rgba(0,0,0,0.02)",
      }}>
        {/* Date filter toolbar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
          borderBottom: "1px solid var(--border)", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Time Frame:
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                fontSize: 12, padding: "6px 10px",
                border: "1px solid var(--border-md)", borderRadius: "var(--radius-sm)",
                background: "var(--bg-input)", color: "var(--text-primary)",
                fontFamily: "inherit", colorScheme: "dark",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                fontSize: 12, padding: "6px 10px",
                border: "1px solid var(--border-md)", borderRadius: "var(--radius-sm)",
                background: "var(--bg-input)", color: "var(--text-primary)",
                fontFamily: "inherit", colorScheme: "dark",
              }}
            />
          </div>
          {hasDateFilter && (
            <button onClick={clearDateFilters} style={{
              fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 99,
              background: "var(--red-50)", color: "var(--red-700)", border: "1px solid var(--red-100)",
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
            }}>
              ✕ Clear
            </button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setShowBatches(!showBatches)} style={{
              fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 99,
              background: showBatches ? "var(--purple-50)" : "var(--bg-input)",
              color: showBatches ? "var(--purple-600)" : "var(--text-muted)",
              border: `1px solid ${showBatches ? "rgba(139, 92, 246, 0.2)" : "var(--border)"}`,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
            }}>
              {showBatches ? "▾" : "▸"} Batch Downloads
            </button>
          </div>
        </div>

        {/* Batch downloads section */}
        {showBatches && (
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            {batchesLoading && (
              <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
                <Spinner size={18} />
              </div>
            )}
            {!batchesLoading && batches.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 13 }}>
                {hasDateFilter
                  ? "No reconciliation batches found in this date range."
                  : "No reconciliation batches yet. Run a bulk reconciliation first."}
              </div>
            )}
            {!batchesLoading && batches.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 4,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                    {batches.length} batch{batches.length !== 1 ? "es" : ""} {hasDateFilter ? "in selected range" : "total"}
                  </span>
                  {hasDateFilter && (
                    <Btn size="sm" onClick={handleExportFiltered} style={{ fontSize: 11, padding: "4px 12px" }}>
                      ↓ Download All in Range
                    </Btn>
                  )}
                </div>
                {batches.map((batch) => (
                  <div
                    key={batch.batchId}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px", background: "var(--bg-input)",
                      border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)",
                          color: "var(--text-primary)", letterSpacing: "-0.02em",
                        }}>
                          {batch.batchId}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                          background: "var(--blue-50)", color: "var(--blue-700)",
                          border: "1px solid var(--blue-100)",
                        }}>
                          {batch.entries} entries
                        </span>
                        {batch.confirmed === batch.entries ? (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                            background: "var(--teal-50)", color: "var(--teal-700)",
                            border: "1px solid var(--teal-100)",
                          }}>
                            ✓ All Confirmed
                          </span>
                        ) : (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                            background: "var(--amber-50)", color: "var(--amber-700)",
                            border: "1px solid var(--amber-100)",
                          }}>
                            {batch.pending} pending
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
                        <span>
                          {batch.reconciledAt
                            ? new Date(batch.reconciledAt).toLocaleString()
                            : "—"}
                        </span>
                        <span>·</span>
                        <span>By: {batch.reconciledBy}</span>
                        {batch.merchantCount > 0 && (
                          <>
                            <span>·</span>
                            <span>
                              {batch.merchantCount} merchant{batch.merchantCount !== 1 ? "s" : ""}
                              {batch.merchants.length <= 3 && ` (${batch.merchants.join(", ")})`}
                            </span>
                          </>
                        )}
                        <span>·</span>
                        <span>GHS {batch.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 12 }}>
                      <Btn
                        size="sm"
                        onClick={() => api.exportAuditBatch(batch.batchId)}
                        style={{ fontSize: 11, padding: "5px 12px" }}
                      >
                        ↓ CSV
                      </Btn>
                      {batch.pending > 0 && (
                        <Btn
                          size="sm"
                          variant="primary"
                          onClick={() => confirmBatch(batch.batchId)}
                          disabled={confirming}
                          style={{ fontSize: 11, padding: "5px 12px" }}
                        >
                          ✓ Confirm
                        </Btn>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main audit table */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.02)" }}>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, background: "var(--bg-input)", borderRadius: "var(--radius-sm)", padding: 3, border: "1px solid var(--border)" }}>
            {[
              { id: "all", label: "All" },
              { id: "pending", label: "Pending Review" },
              { id: "confirmed", label: "Confirmed" },
            ].map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: "6px 14px", fontSize: 12, fontWeight: filter === f.id ? 600 : 500,
                background: filter === f.id ? "var(--bg-surface)" : "transparent",
                color: filter === f.id ? "var(--text-primary)" : "var(--text-muted)",
                border: filter === f.id ? "1px solid var(--border)" : "1px solid transparent",
                borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                boxShadow: filter === f.id ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
                transition: "all 0.15s ease",
              }}>
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {hasDateFilter && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                Showing {total} entries in range
              </span>
            )}
            {batchIds.length > 0 && (
              <Btn size="sm" variant="primary" onClick={confirmAll}>
                ✓ Confirm All Visible ({data.filter(e => !e.confirmed).length})
              </Btn>
            )}
          </div>
        </div>

        {/* Batch Quick Actions */}
        {batchIds.length > 0 && filter !== "confirmed" && (
          <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Confirm by batch:</span>
            {batchIds.map((bId) => (
              <button key={bId} onClick={() => confirmBatch(bId)} style={{
                fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 99,
                background: "var(--blue-50)", color: "var(--blue-700)", border: "1px solid var(--blue-100)",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
              }}>
                {bId} →  Confirm
              </button>
            ))}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-input)" }}>
                {["Txn ID", "UniWallet ID", "Name", "Telco", "Amount", "Date", "Previous", "New Status", "OVA Status", "Batch ID", "Reconciled At", "Status", "Action"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={13} style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}><Spinner /></td></tr>}
              {!loading && data.length === 0 && (
                <tr><td colSpan={13} style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: 14 }}>
                  {filter === "all"
                    ? hasDateFilter
                      ? "No entries found in this date range."
                      : "No reconciliation history yet. Run a bulk reconciliation first."
                    : `No ${filter} entries found.`}
                </td></tr>
              )}
              {data.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: "1px solid var(--border)", background: entry.confirmed ? "transparent" : "rgba(239, 159, 39, 0.03)" }}>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>{entry.transactionId}</td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>{entry.uniwalletId}</td>
                  <td style={{ ...td, fontWeight: 500, fontSize: 13, color: "var(--text-primary)" }}>{entry.name}</td>
                  <td style={td}><TelcoBadge telco={entry.telco} /></td>
                  <td style={{ ...td, fontWeight: 600 }}>GHS {entry.amount?.toFixed(2)}</td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 12 }}>{entry.date}</td>
                  <td style={td}><Badge status={entry.previousStatus} /></td>
                  <td style={td}><Badge status={entry.newStatus} /></td>
                  <td style={td}><Badge status={entry.ovaStatus} /></td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{entry.batchId}</td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                    {entry.reconciledAt ? new Date(entry.reconciledAt).toLocaleString() : "—"}
                  </td>
                  <td style={td}>
                    {entry.confirmed ? (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "var(--teal-50)", color: "var(--teal-700)", border: "1px solid var(--teal-100)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "currentColor" }} /> Confirmed
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "var(--amber-50)", color: "var(--amber-700)", border: "1px solid var(--amber-100)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "currentColor" }} /> Pending
                      </span>
                    )}
                  </td>
                  <td style={td}>
                    {!entry.confirmed ? (
                      <Btn size="sm" variant="primary" onClick={() => confirmEntry(entry.id)} disabled={confirming} style={{ fontSize: 11, padding: "4px 12px" }}>
                        ✓ Confirm
                      </Btn>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
          <span>Showing {total > 0 ? Math.min((page - 1) * 15 + 1, total) : 0}–{Math.min(page * 15, total)} of {total}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</PageBtn>
            {Array.from({ length: Math.min(pages, 6) }, (_, i) => (
              <PageBtn key={i} active={i + 1 === page} onClick={() => setPage(i + 1)}>{i + 1}</PageBtn>
            ))}
            <PageBtn onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>›</PageBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-secondary)", whiteSpace: "nowrap" };
const td = { padding: "10px 14px", color: "var(--text-primary)", verticalAlign: "middle", whiteSpace: "nowrap" };

function PageBtn({ children, onClick, active, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: active ? "none" : "1px solid var(--border-md)", cursor: disabled ? "default" : "pointer", fontSize: 12, fontWeight: active ? 600 : 500, background: active ? "var(--teal-600)" : "transparent", color: active ? "#ffffff" : "var(--text-secondary)", fontFamily: "inherit", opacity: disabled ? 0.4 : 1, transition: "all 0.2s" }}>
      {children}
    </button>
  );
}
