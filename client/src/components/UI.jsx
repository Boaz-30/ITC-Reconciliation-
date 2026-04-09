import React from "react";

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({ children, variant = "default", size = "md", onClick, disabled, style }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center",
    fontFamily: "inherit", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    border: "1px solid", borderRadius: "100px", transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
    opacity: disabled ? 0.6 : 1, lineHeight: 1,
    boxShadow: disabled ? "none" : "0 2px 8px -2px rgba(0,0,0,0.05)",
  };
  const sizes = { sm: { fontSize: 12, padding: "6px 14px" }, md: { fontSize: 13, padding: "10px 20px" }, lg: { fontSize: 14, padding: "12px 24px" } };
  const variants = {
    default: { background: "var(--bg-surface)", borderColor: "var(--border-md)", color: "var(--text-primary)" },
    primary: { background: "linear-gradient(135deg, var(--teal-600), var(--teal-700))", borderColor: "var(--teal-700)", color: "#fff", boxShadow: "0 4px 12px rgba(26, 176, 136, 0.2)" },
    danger:  { background: "var(--red-50)", borderColor: "var(--red-100)", color: "var(--red-700)" },
    ghost:   { background: "transparent", borderColor: "transparent", color: "var(--text-secondary)", boxShadow: "none" },
    amber:   { background: "var(--amber-50)", borderColor: "var(--amber-100)", color: "var(--amber-700)" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ status }) {
  const map = {
    successful: { bg: "var(--teal-50)", color: "var(--teal-700)", label: "Successful", border: "var(--teal-100)" },
    pending:    { bg: "var(--amber-50)", color: "var(--amber-700)", label: "Pending", border: "var(--amber-100)" },
    failed:     { bg: "var(--red-50)", color: "var(--red-700)", label: "Failed", border: "var(--red-100)" },
    matched:    { bg: "var(--teal-50)", color: "var(--teal-700)", label: "In Sync", border: "var(--teal-100)" },
    mismatch:   { bg: "var(--amber-50)", color: "var(--amber-700)", label: "Mismatch", border: "var(--amber-100)" },
    ova_only:   { bg: "var(--blue-50)", color: "var(--blue-700)", label: "OVA Only", border: "var(--blue-100)" },
  };
  const c = map[status?.toLowerCase()] || { bg: "var(--gray-100)", color: "var(--gray-600)", label: status, border: "transparent" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyItems: "center", fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "currentColor", opacity: 0.8 }} />
      {c.label}
    </span>
  );
}

// ── Telco Badge ───────────────────────────────────────────────────────────────
export function TelcoBadge({ telco }) {
  const map = {
    MTN:     { bg: "var(--amber-50)", color: "var(--amber-700)", border: "var(--amber-100)" },
    Telecel: { bg: "var(--blue-50)", color: "var(--blue-700)", border: "var(--blue-100)" },
    AT:      { bg: "var(--red-50)", color: "var(--red-700)", border: "var(--red-100)" },
  };
  const c = map[telco] || { bg: "var(--bg-input)", color: "var(--text-secondary)", border: "var(--border)" };
  return (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {telco}
    </span>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, children, width = 420 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: "28px 32px", width, maxWidth: "92vw", animation: "fadeUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)", boxShadow: "0 24px 48px -12px rgba(0,0,0,0.18)" }}>
        {children}
      </div>
    </div>
  );
}

// ── Toast Stack ───────────────────────────────────────────────────────────────
export function ToastStack({ toasts }) {
  const colors = { 
    success: { bg: "var(--teal-50)", color: "var(--teal-700)", border: "var(--teal-100)", icon: "✓" }, 
    error: { bg: "var(--red-50)", color: "var(--red-700)", border: "var(--red-100)", icon: "✕" }, 
    info: { bg: "var(--blue-50)", color: "var(--blue-700)", border: "var(--blue-100)", icon: "ℹ" }, 
    warning: { bg: "var(--amber-50)", color: "var(--amber-700)", border: "var(--amber-100)", icon: "⚠" } 
  };
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 10, zIndex: 400 }}>
      {toasts.map((t) => {
        const c = colors[t.type] || colors.success;
        return (
          <div key={t.id} className="fade-up" style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 20px", borderRadius: "100px", border: `1px solid ${c.border}`, background: c.bg, color: c.color, fontSize: 13, fontWeight: 600, minWidth: 260, maxWidth: 360, boxShadow: "0 8px 24px -6px rgba(0,0,0,0.12)" }}>
            <span style={{ fontSize: 14 }}>{c.icon}</span>
            {t.msg}
          </div>
        );
      })}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 18, color = "var(--teal-600)" }) {
  return (
    <span className="spin" style={{ display: "inline-block", width: size, height: size, border: `2.5px solid ${color}30`, borderTopColor: color, borderRadius: "50%" }} />
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────
export function MetricCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px 24px", boxShadow: "0 4px 12px -4px rgba(0,0,0,0.02)", transition: "all 0.3s ease" }} className="metric-card">
      <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {accent && <span style={{ display: "inline-block", width: 4, height: 32, borderRadius: 4, background: accent, flexShrink: 0 }} />}
        <span style={{ fontSize: 32, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</span>
      </div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

// ── Loading Overlay ───────────────────────────────────────────────────────────
export function LoadingOverlay({ visible, title = "Processing…", subtitle = "Please wait while we process your request." }) {
  if (!visible) return null;
  return (
    <div className="loading-overlay" style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border)", padding: "40px 48px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
        boxShadow: "0 32px 64px -16px rgba(0,0,0,0.28)",
        animation: "fadeUp 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)",
        maxWidth: 380, width: "90vw", textAlign: "center",
      }}>
        <div className="loading-ring">
          <div className="loading-ring-inner" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          <span className="loading-dot" style={{ animationDelay: "0s" }} />
          <span className="loading-dot" style={{ animationDelay: "0.15s" }} />
          <span className="loading-dot" style={{ animationDelay: "0.3s" }} />
        </div>
      </div>
    </div>
  );
}
