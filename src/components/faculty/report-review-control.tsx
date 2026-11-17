"use client";
import { useState } from "react";
export function ReportReviewControl({ reportId, status }: { reportId: string; status: string }) {
  const [remarks, setRemarks] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function review(decision: "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "RESUBMISSION_REQUESTED") {
    setBusy(true); setMessage("");
    try { const response = await fetch(`/api/faculty/reports/${reportId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, remarks }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setMessage("Saved"); window.location.reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save review."); }
    finally { setBusy(false); }
  }
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(status)) return <div><a href={`/api/reports/${reportId}/download`} target="_blank" rel="noreferrer">View PDF</a> · <a href={`/faculty/reports/${reportId}`}>History</a></div>;
  return <div className="review-control"><a href={`/api/reports/${reportId}/download`} target="_blank" rel="noreferrer">Preview PDF</a> · <a href={`/faculty/reports/${reportId}`}>Versions and review history</a><textarea aria-label="Feedback for the student" placeholder="Feedback (required for rejection or resubmission)" value={remarks} onChange={(event) => setRemarks(event.target.value)} maxLength={3000} /><div className="review-actions">{status === "SUBMITTED" && <button disabled={busy} onClick={() => review("UNDER_REVIEW")}>Start review</button>}<button disabled={busy} onClick={() => review("APPROVED")}>Approve</button><button disabled={busy || remarks.trim().length < 3} onClick={() => review("REJECTED")}>Reject</button><button disabled={busy || remarks.trim().length < 3} onClick={() => review("RESUBMISSION_REQUESTED")}>Request resubmission</button></div>{message && <small role="status">{message}</small>}</div>;
}
