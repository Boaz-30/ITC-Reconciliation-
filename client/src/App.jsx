import React, { useState, useCallback } from "react";
import Sidebar from "./components/Sidebar.jsx";
import TransactionsPage from "./pages/TransactionsPage.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import ReconcilePage from "./pages/ReconcilePage.jsx";
import AuditLogPage from "./pages/AuditLogPage.jsx";
import { ToastStack } from "./components/UI.jsx";
import { useToast } from "./hooks/useToast.js";

export default function App() {
  const [view, setView] = useState("all");
  const [stats, setStats] = useState({});
  const { toasts, toast } = useToast();

  const handleViewChange = useCallback((v) => setView(v), []);
  const handleUploaded = useCallback((next) => { if (next) setView(next); }, []);

  const txnViews = ["all", "pending", "successful", "failed"];

  return (
    <>
      {/* Topbar */}
      <header className="glass" style={{
        position: "sticky", top: 0, zIndex: 100,
        height: 64, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 32px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "var(--teal-600)", boxShadow: "0 0 12px var(--teal-600)" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>ITC recon</span>
          <span style={{ height: 16, width: 2, background: "var(--border)", margin: "0 4px" }} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Reconciliation Dashboard</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {stats.successful != null && (
            <Pill label={`${stats.successful} Successful`} bg="var(--teal-50)" color="var(--teal-700)" />
          )}
          {stats.pending != null && (
            <Pill label={`${stats.pending} Pending`} bg="var(--amber-50)" color="var(--amber-700)" />
          )}
          {stats.failed != null && (
            <Pill label={`${stats.failed} Failed`} bg="var(--red-50)" color="var(--red-700)" />
          )}
        </div>
      </header>

      <div style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
        <Sidebar view={view} setView={handleViewChange} stats={stats} />

        <main style={{ flex: 1, overflowY: "auto", padding: "22px 26px", background: "var(--bg-app)" }}>
          {txnViews.includes(view) && (
            <TransactionsPage view={view} toast={toast} onStatsChange={setStats} />
          )}
          {view === "upload" && (
            <UploadPage toast={toast} onUploaded={handleUploaded} />
          )}
          {view === "reconcile" && (
            <ReconcilePage toast={toast} onStatsChange={setStats} setView={handleViewChange} />
          )}
          {view === "audit" && (
            <AuditLogPage toast={toast} />
          )}
        </main>
      </div>

      <ToastStack toasts={toasts} />
    </>
  );
}

function Pill({ label, bg, color }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 99, background: bg, color }}>
      {label}
    </span>
  );
}
