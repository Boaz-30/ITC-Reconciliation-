import React, { useEffect, useRef } from "react";
import { api } from "../utils/api.js";
import { Chart, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController, LineController, Filler } from "chart.js";
Chart.register(ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController, LineController, Filler);

let lineInst = null, donutInst = null;

export default function Charts({ stats }) {
  const lineRef = useRef();
  const donutRef = useRef();

  useEffect(() => {
    api.getStats().then((data) => {
      // Line Chart
      if (lineInst) lineInst.destroy();
      const lctx = lineRef.current?.getContext("2d");
      if (lctx) {
        // Create gradients
        const successGrad = lctx.createLinearGradient(0, 0, 0, 160);
        successGrad.addColorStop(0, "rgba(29, 158, 117, 0.18)");
        successGrad.addColorStop(1, "rgba(29, 158, 117, 0.01)");

        const pendingGrad = lctx.createLinearGradient(0, 0, 0, 160);
        pendingGrad.addColorStop(0, "rgba(239, 159, 39, 0.14)");
        pendingGrad.addColorStop(1, "rgba(239, 159, 39, 0.01)");

        const failedGrad = lctx.createLinearGradient(0, 0, 0, 160);
        failedGrad.addColorStop(0, "rgba(226, 75, 74, 0.12)");
        failedGrad.addColorStop(1, "rgba(226, 75, 74, 0.01)");

        lineInst = new Chart(lctx, {
          type: "line",
          data: {
            labels: data.daily.map((d) => d.date.slice(5)),
            datasets: [
              {
                label: "Successful",
                data: data.daily.map((d) => d.successful),
                borderColor: "#1d9e75",
                backgroundColor: successGrad,
                borderWidth: 2.5,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: "#1d9e75",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true,
              },
              {
                label: "Pending",
                data: data.daily.map((d) => d.pending),
                borderColor: "#ef9f27",
                backgroundColor: pendingGrad,
                borderWidth: 2.5,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: "#ef9f27",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true,
              },
              {
                label: "Failed",
                data: data.daily.map((d) => d.failed),
                borderColor: "#e24b4a",
                backgroundColor: failedGrad,
                borderWidth: 2.5,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: "#e24b4a",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                mode: "index",
                intersect: false,
                backgroundColor: "rgba(20, 22, 27, 0.92)",
                titleFont: { size: 11, weight: "600" },
                bodyFont: { size: 11 },
                padding: { x: 14, y: 10 },
                cornerRadius: 10,
                displayColors: true,
                boxWidth: 8,
                boxHeight: 8,
                boxPadding: 4,
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { font: { size: 10, family: "Outfit" }, color: "#9e9b94", maxRotation: 45, autoSkip: false },
                border: { display: false },
              },
              y: {
                grid: { color: "rgba(0,0,0,0.04)", drawBorder: false },
                ticks: { font: { size: 10, family: "Outfit" }, color: "#9e9b94", stepSize: 1 },
                border: { display: false },
                beginAtZero: true,
              },
            },
          },
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!stats.total) return;
    if (donutInst) donutInst.destroy();
    const dctx = donutRef.current?.getContext("2d");
    if (dctx) {
      donutInst = new Chart(dctx, {
        type: "doughnut",
        data: {
          datasets: [{
            data: [stats.successful || 0, stats.pending || 0, stats.failed || 0],
            backgroundColor: ["#1d9e75", "#ef9f27", "#e24b4a"],
            borderWidth: 0, hoverOffset: 4,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: "72%",
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} (${Math.round((ctx.raw / stats.total) * 100)}%)` } } },
        },
      });
    }
  }, [stats]);

  const legendItems = [
    { label: "Successful", color: "#1d9e75", count: stats.successful },
    { label: "Pending",    color: "#ef9f27", count: stats.pending },
    { label: "Failed",     color: "#e24b4a", count: stats.failed },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 12 }}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>Transaction volume — last 14 days</div>
        <div style={{ position: "relative", height: 160 }}><canvas ref={lineRef} /></div>
      </div>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12, alignSelf: "flex-start", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status breakdown</div>
        <div style={{ position: "relative", width: 130, height: 130 }}><canvas ref={donutRef} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10, width: "100%" }}>
          {legendItems.map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                {l.label}
              </span>
              <span style={{ fontWeight: 500 }}>{stats.total ? `${Math.round(((l.count || 0) / stats.total) * 100)}%` : "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
