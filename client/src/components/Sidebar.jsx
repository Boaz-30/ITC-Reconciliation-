import React from "react";

const NAV = [
  { section: "Transactions" },
  { id: "all",        label: "All Transactions", dot: "#888780" },
  { id: "pending",    label: "Pending",           dot: "#EF9F27" },
  { id: "successful", label: "Successful",        dot: "#1D9E75" },
  { id: "failed",     label: "Failed",            dot: "#E24B4A" },
  { section: "File Management" },
  { id: "upload",     label: "Upload Data Files", dot: "#7F77DD" },
  { section: "Reconciliation" },
  { id: "reconcile",  label: "Compare & Match",   dot: "#378ADD" },
  { id: "audit",      label: "Audit Log",          dot: "#9B6DD7" },
];

export default function Sidebar({ view, setView, stats }) {
  return (
    <aside style={{ width: 220, flexShrink: 0, background: "var(--bg-surface)", borderRight: "1px solid var(--border)", padding: "20px 0", display: "flex", flexDirection: "column", gap: 4 }}>
      {NAV.map((item, i) => {
        if (item.section) {
          return (
            <div key={i} style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", padding: "12px 20px 6px", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: i === 0 ? 0 : 12 }}>
              {item.section}
            </div>
          );
        }
        const active = view === item.id;
        const count = item.id === "pending" ? stats?.pending : item.id === "successful" ? stats?.successful : item.id === "failed" ? stats?.failed : null;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 20px", fontSize: 13, fontWeight: active ? 600 : 500,
              color: active ? "var(--teal-700)" : "var(--text-secondary)", cursor: "pointer",
              background: active ? "var(--teal-50)" : "transparent",
              border: "none", borderLeft: `3px solid ${active ? "var(--teal-600)" : "transparent"}`,
              textAlign: "left", width: "100%", transition: "all 0.15s ease", fontFamily: "inherit",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: item.dot, flexShrink: 0, boxShadow: active ? `0 0 8px ${item.dot}` : "none" }} />
              {item.label}
            </span>
            {count != null && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: active ? "var(--teal-100)" : "var(--bg-hover)", color: active ? "var(--teal-700)" : "var(--text-muted)" }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
}
