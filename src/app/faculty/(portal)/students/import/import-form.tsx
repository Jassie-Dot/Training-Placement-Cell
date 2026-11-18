"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, LoaderCircle, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";

type Preview = {
  rowNumber: number;
  values: Record<string, unknown>;
  errors: string[];
  isUpdate?: boolean;
};

export function ImportForm() {
  const [rows, setRows] = useState<Preview[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function preview(form: FormData) {
    setBusy(true);
    setMessage("");
    setRows([]);
    try {
      const response = await fetch("/api/faculty/students/import/preview", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRows(data.rows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not preview this file.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setMessage("");
    try {
      const valid = rows.filter((row) => !row.errors.length).map((row) => row.values);
      if (valid.length !== rows.length) throw new Error("Fix or remove rows with errors before importing.");
      const response = await fetch("/api/faculty/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valid),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRows([]);
      setMessage(
        `Success! ${data.imported} student record(s) processed (${data.created || 0} created, ${data.updated || 0} updated with company, evaluation & certificate details).`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-card glass-panel" style={{ padding: "28px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: "0 0 6px 0", fontSize: "20px", color: "#142b4a" }}>Excel &amp; Spreadsheet Import</h2>
        <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
          Upload an Excel (.xlsx) or CSV file with student details, assigned company, project title, evaluation marks, attendance, and certificates.
        </p>
      </div>

      <form action={preview} className="form-grid" style={{ gap: "16px", alignItems: "flex-end" }}>
        <label className="wide-field" style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
          <span>Choose Excel (.xlsx) or CSV file</span>
          <input
            type="file"
            name="file"
            accept=".csv,.xlsx"
            required
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              fontSize: "13px",
            }}
          />
        </label>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="button button-primary" disabled={busy} style={{ minHeight: "42px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
            {busy ? <LoaderCircle className="spin" size={16} /> : <FileSpreadsheet size={16} />}
            {busy ? "Parsing file…" : "Preview Spreadsheet"}
          </button>
          <a
            className="button button-secondary"
            href="/api/faculty/students/import/template"
            style={{ minHeight: "42px", display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
          >
            <Download size={16} /> Download Template (.CSV)
          </a>
        </div>
      </form>

      {message && (
        <div
          role="status"
          style={{
            marginTop: "20px",
            padding: "14px 18px",
            borderRadius: "10px",
            background: message.includes("Success") ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${message.includes("Success") ? "#a7f3d0" : "#fecaca"}`,
            color: message.includes("Success") ? "#065f46" : "#991b1b",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          {message}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ marginTop: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
              {rows.length} student row(s) detected. Review before saving to database:
            </p>
            <button
              className="button button-primary"
              type="button"
              disabled={busy || rows.some((row) => row.errors.length > 0)}
              onClick={confirm}
              style={{ background: "#16a34a", display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              {busy ? "Processing Database…" : `Confirm & Save ${rows.length} Students`} <ArrowRight size={15} />
            </button>
          </div>

          <div className="table-scroll" style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 10 }}>
                <tr>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>#</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Name</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Roll No</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Email</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Department</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Training</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px" }}>{row.rowNumber}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{String(row.values.fullName ?? "")}</td>
                    <td style={{ padding: "10px 12px" }}>{String(row.values.rollNumber ?? "")}</td>
                    <td style={{ padding: "10px 12px" }}>{String(row.values.email ?? "")}</td>
                    <td style={{ padding: "10px 12px" }}>{String(row.values.department ?? "")}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {Array.isArray(row.values.trainingCodes) ? row.values.trainingCodes.join(", ") : "TR-101"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {row.errors.length ? (
                        <span style={{ color: "#dc2626", fontWeight: 600 }}>❌ {row.errors.join("; ")}</span>
                      ) : row.isUpdate ? (
                        <span style={{ color: "#2563eb", fontWeight: 600 }}>🔄 Will Update</span>
                      ) : (
                        <span style={{ color: "#16a34a", fontWeight: 600 }}>✅ Ready to Insert</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
