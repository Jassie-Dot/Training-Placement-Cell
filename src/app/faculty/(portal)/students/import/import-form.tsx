"use client";
import { useState } from "react";
type Preview = { rowNumber: number; values: Record<string, unknown>; errors: string[] };
export function ImportForm() {
  const [rows, setRows] = useState<Preview[]>([]); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function preview(form: FormData) {
    setBusy(true); setMessage(""); setRows([]);
    try { const response = await fetch("/api/faculty/students/import/preview", { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setRows(data.rows); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not preview this file."); }
    finally { setBusy(false); }
  }
  async function confirm() {
    setBusy(true); setMessage("");
    try { const valid = rows.filter((row) => !row.errors.length).map((row) => row.values); if (valid.length !== rows.length) throw new Error("Fix or remove rows with errors before importing."); const response = await fetch("/api/faculty/students/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valid) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setRows([]); setMessage(`${data.imported} students imported successfully.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Import failed."); }
    finally { setBusy(false); }
  }
  return <section className="settings-card"><form action={preview} className="form-grid"><label className="wide-field">CSV or Excel file<input type="file" name="file" accept=".csv,.xlsx" required /></label><button className="button button-primary" disabled={busy}>{busy ? "Checking file…" : "Preview import"}</button><a className="button button-secondary" href="/api/faculty/students/import/template">Download CSV template</a></form>
    {message && <p role="status" className="info-banner">{message}</p>}{rows.length > 0 && <><p>{rows.length} rows found. No rows are imported until you confirm.</p><div className="table-scroll"><table className="data-table"><thead><tr><th>Row</th><th>Name</th><th>Roll number</th><th>Email</th><th>Department</th><th>Training</th><th>Validation</th></tr></thead><tbody>{rows.map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{String(row.values.fullName ?? "")}</td><td>{String(row.values.rollNumber ?? "")}</td><td>{String(row.values.email ?? "")}</td><td>{String(row.values.department ?? "")}</td><td>{Array.isArray(row.values.trainingCodes) ? row.values.trainingCodes.join(", ") : ""}</td><td>{row.errors.join("; ") || "Ready"}</td></tr>)}</tbody></table></div><button className="button button-primary" type="button" disabled={busy || rows.some((row) => row.errors.length > 0)} onClick={confirm}>{busy ? "Importing…" : `Import ${rows.length} students`}</button></>}</section>;
}
