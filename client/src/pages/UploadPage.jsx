import React, { useState, useRef } from "react";
import { api } from "../utils/api.js";
import { Btn, Spinner, LoadingOverlay } from "../components/UI.jsx";

function UploadZone({ title, subtitle, expectedCols, onFiles, uploading, result, preview, headers, downloadSample, accept, multiple }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFiles = (fileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    onFiles(files);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "0 4px 20px -2px rgba(0,0,0,0.02)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{title}</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>{subtitle}</p>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          style={{
            background: dragging ? "var(--teal-50)" : "var(--bg-input)",
            border: `1.5px dashed ${dragging ? "var(--teal-700)" : "var(--border-md)"}`,
            borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "36px 24px", cursor: "pointer", minHeight: 160,
            textAlign: "center", transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
            marginBottom: 20
          }}
        >
          <input ref={inputRef} type="file" accept={accept} multiple={multiple} style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
          {uploading ? (
            <><Spinner size={28} /><p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 12 }}>Processing…</p></>
          ) : (
            <>
              <span style={{ fontSize: 32, marginBottom: 8, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}>📄</span>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
                {multiple ? "Drop CSV file(s) here" : "Drop CSV here"}
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {multiple ? "Select one or multiple files" : "or click to browse"}
              </p>
            </>
          )}
        </div>

        {/* Expected Columns */}
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)", marginBottom: 10 }}>Expected columns</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {expectedCols.map((col) => (
             <span key={col} style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "var(--text-secondary)" }}>
               {col}
             </span>
          ))}
        </div>
        <Btn style={{ width: "100%", background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border)" }} size="sm" onClick={downloadSample}>↓ Download sample CSV</Btn>
      </div>

      {result && (
        <div className="fade-up" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "0 4px 20px -2px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--teal-50)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--teal-600)", fontSize: 16 }}>✓</div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              {result.filesProcessed > 1 ? `${result.filesProcessed} files uploaded` : "File uploaded"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: result.matched !== undefined ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10, marginBottom: 20 }}>
             <div style={{ background: "var(--bg-input)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
               <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginBottom: 4 }}>Total Records</div>
               <div style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)" }}>{result.records || result.total}</div>
             </div>
             {result.newRecords !== undefined && (
               <div style={{ background: "var(--blue-50)", borderRadius: "var(--radius-sm)", padding: "12px 14px", border: "1px solid var(--blue-100)" }}>
                 <div style={{ fontSize: 11, color: "var(--blue-700)", fontWeight: 500, marginBottom: 4 }}>New Records</div>
                 <div style={{ fontSize: 24, fontWeight: 600, color: "var(--blue-700)" }}>{result.newRecords}</div>
               </div>
             )}
             {(result.matched !== undefined) && (
             <div style={{ background: "var(--teal-50)", borderRadius: "var(--radius-sm)", padding: "12px 14px", border: "1px solid var(--teal-100)" }}>
               <div style={{ fontSize: 11, color: "var(--teal-700)", fontWeight: 500, marginBottom: 4 }}>Matched with data</div>
               <div style={{ fontSize: 24, fontWeight: 600, color: "var(--teal-700)" }}>{result.matched}</div>
             </div>
             )}
          </div>

          {preview?.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)", marginBottom: 8 }}>Preview</p>
              <div style={{ overflowX: "auto", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, background: "var(--bg-surface)", minWidth: 400 }}>
                  <thead>
                    <tr style={{ background: "var(--bg-input)", borderBottom: "1px solid var(--border)" }}>
                      {headers.map(h => <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-secondary)", fontWeight: 500 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                        {headers.map(h => (
                           <td key={h} style={{ padding: "8px 10px", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                             {r[h] || r[h.toLowerCase()?.replace(" ", "")] || r[Object.keys(r).find(k => k.toLowerCase().includes(h.toLowerCase().substring(0, 3))) || ""]}
                           </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UploadPage({ toast, onUploaded }) {
  const [appUploading, setAppUploading] = useState(false);
  const [ovaUploading, setOvaUploading] = useState(false);
  const [appResult, setAppResult] = useState(null);
  const [ovaResult, setOvaResult] = useState(null);
  const [appPreview, setAppPreview] = useState([]);
  const [ovaPreview, setOvaPreview] = useState([]);

  const downloadSample = (type) => {
    const BASE = typeof window !== "undefined" && (window.location.port === "5173" || window.location.port === "3000") ? "http://localhost:3001" : window.location.origin;
    const a = document.createElement("a");
    a.href = BASE + `/api/${type}/sample`;
    a.download = `sample_${type}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleAppFiles = async (files) => {
    const csvFiles = files.filter(f => f.name.endsWith(".csv"));
    if (csvFiles.length === 0) { toast("Please upload CSV file(s)", "error"); return; }
    setAppUploading(true);
    try {
      const res = await api.uploadTransactions(csvFiles);
      if (res.success) {
        setAppResult(res);
        toast(`${res.filesProcessed} file${res.filesProcessed > 1 ? "s" : ""} uploaded — ${res.newRecords} new records`, "success");
        try {
          const pRes = await api.getTransactions({ limit: 5 });
          setAppPreview(pRes.data);
        } catch (err) {}
      } else {
        toast(res.error || "Upload failed", "error");
      }
    } catch (e) { toast(e.message, "error"); }
    finally { setAppUploading(false); }
  };

  const handleOvaFiles = async (files) => {
    const csvFiles = files.filter(f => f.name.endsWith(".csv"));
    if (csvFiles.length === 0) { toast("Please upload CSV file(s)", "error"); return; }
    setOvaUploading(true);
    try {
      const res = await api.uploadOva(csvFiles);
      if (res.success) {
        setOvaResult(res);
        toast(`${res.filesProcessed} OVA file${res.filesProcessed > 1 ? "s" : ""} uploaded — ${res.newRecords} new records`, "success");
        try {
          const pRes = await api.getOvaRecords();
          setOvaPreview(pRes.records.slice(0, 5));
        } catch (err) {}
      } else {
        toast(res.error || "Upload failed", "error");
      }
    } catch (e) { toast(e.message, "error"); }
    finally { setOvaUploading(false); }
  };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <LoadingOverlay
        visible={appUploading || ovaUploading}
        title={appUploading ? "Uploading Uniwallet Data…" : "Uploading OVA Data…"}
        subtitle="Parsing and processing your CSV file(s). This may take a moment."
      />

      <div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Upload Data Files</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>Upload your Uniwallet transactions and OVA records for reconciliation. You can upload multiple files at once.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
        <UploadZone
          title="Uniwallet Transactions"
          subtitle="Your system's internal transaction log."
          expectedCols={["ID", "UniWallet ID", "Full Name", "Telco", "Transaction Date", "Time", "Amount", "Status", "Network ID"]}
          onFiles={handleAppFiles}
          uploading={appUploading}
          result={appResult}
          preview={appPreview}
          headers={["id", "name", "amount", "status"]}
          downloadSample={() => downloadSample("transactions")}
          accept=".csv"
          multiple={true}
        />

        <UploadZone
          title="OVA Data"
          subtitle="The external truth provided by the OVA system."
          expectedCols={["UniWallet ID", "Transaction Date", "Status", "Amount", "Merchant ID", "Reference ID", "Telco", "Full Name"]}
          onFiles={handleOvaFiles}
          uploading={ovaUploading}
          result={ovaResult}
          preview={ovaPreview}
          headers={["uniwalletId", "date", "status", "amount"]}
          downloadSample={() => downloadSample("ova")}
          accept=".csv"
          multiple={true}
        />
      </div>

      {(appResult || ovaResult) && (
         <div className="fade-up" style={{ background: "linear-gradient(to right, var(--bg-surface), var(--pure-white, #fff))", padding: 24, borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 24px -4px rgba(0,0,0,0.03)" }}>
           <div>
             <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Ready for Reconciliation</h3>
             <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Compare the statuses to resolve mismatches.</p>
           </div>
           <Btn variant="primary" onClick={() => onUploaded?.("reconcile")} style={{ fontSize: 14, padding: "10px 20px" }}>
             Go to Reconciliation →
           </Btn>
         </div>
      )}
    </div>
  );
}
