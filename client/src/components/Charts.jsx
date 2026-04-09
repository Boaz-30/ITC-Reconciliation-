import React, { useEffect, useRef } from "react";
import { api } from "../utils/api.js";
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController, BarController } from "chart.js";
Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController, BarController);

let barInst = null, donutInst = null;

export default function Charts({ stats }) {
  const barRef = useRef();
  const donutRef = useRef();

  useEffect(() => {
    api.getStats().then((data) => {
      // Bar
      if (barInst) barInst.destroy();
      const bctx = barRef.current?.getContext("2d");
      if (bctx) {
        barInst = new Chart(bctx, {
          type: "bar",
          data: {
            labels: data.daily.map((d) => d.date.slice(5)),
            datasets: [
              { label: "Successful", data: data.daily.map((d) => d.successful), backgroundColor: "#1d9e75", stack: "s" },
              { label: "Pending",    data: data.daily.map((d) => d.pending),    backgroundColor: "#ef9f27", stack: "s" },
              { label: "Failed",     data: data.daily.map((d) => d.failed),     backgroundColor: "#e24b4a", stack: "s" },
            ],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
            scales: {
              x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, color: "#9e9b94", maxRotation: 45, autoSkip: false } },
              y: { stacked: true, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 10 }, color: "#9e9b94" } },
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
      <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1917", marginBottom: 12 }}>Transaction volume — last 14 days</div>
        <div style={{ position: "relative", height: 150 }}><canvas ref={barRef} /></div>
      </div>
      <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1917", marginBottom: 10, alignSelf: "flex-start" }}>Status breakdown</div>
        <div style={{ position: "relative", width: 130, height: 130 }}><canvas ref={donutRef} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10, width: "100%" }}>
          {legendItems.map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#6b6860" }}>
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
