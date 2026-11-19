"use client";

import { useState } from "react";
import { CustomSelect } from "@/components/ui/custom-select";

export function ReportUploadForm({
  periods,
  maxBytes,
}: {
  periods: { id: string; label: string }[];
  maxBytes: number;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(form: FormData) {
    setBusy(true);
    setMessage("");
    try {
      const file = form.get("file");
      if (!(file instanceof File)) throw new Error("Choose a PDF report file.");
      const preparation = await fetch("/api/student/reports/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportingPeriodId: form.get("reportingPeriodId"),
          fileName: file.name,
          sizeBytes: file.size,
          contentType: file.type,
        }),
      });
      const upload = await preparation.json();
      if (!preparation.ok) throw new Error(upload.error);

      const transfer = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: upload.headers,
        body: file,
      });
      if (!transfer.ok) {
        throw new Error(
          "Private file storage could not accept the upload. Check the storage bucket CORS configuration."
        );
      }

      const response = await fetch("/api/student/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportingPeriodId: form.get("reportingPeriodId"),
          title: form.get("title"),
          description: form.get("description"),
          fileName: file.name,
          storageKey: upload.storageKey,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage(`Report submitted successfully (version ${data.version}).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="student-section student-upload">
      <div style={{ marginBottom: "14px" }}>
        <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600 }}>
          Reporting period
        </label>
        <CustomSelect
          name="reportingPeriodId"
          required
          placeholder="Select an open reporting period"
          options={periods.map((period) => ({
            value: period.id,
            label: period.label,
          }))}
        />
      </div>

      <label>
        Report title
        <input name="title" required minLength={2} maxLength={180} />
      </label>

      <label>
        Summary
        <textarea name="description" maxLength={5000} rows={4} />
      </label>

      <label>
        PDF report
        <input name="file" type="file" accept="application/pdf,.pdf" required />
      </label>

      <p className="student-muted">
        PDF only · Maximum {(maxBytes / 1024 / 1024).toFixed(0)} MB. Files upload directly to private storage.
      </p>

      <button disabled={busy || periods.length === 0}>
        {busy ? "Uploading…" : "Submit report"}
      </button>

      {message && (
        <p role="status" className="student-alert">
          {message}
        </p>
      )}
    </form>
  );
}
