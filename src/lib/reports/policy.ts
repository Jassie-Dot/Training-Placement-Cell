export const REVIEWABLE_STATUSES = ["SUBMITTED", "UNDER_REVIEW"] as const;
export type ReviewDecision = "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "RESUBMISSION_REQUESTED";
export function reviewStatus(status: string, decision: ReviewDecision) {
  if (!REVIEWABLE_STATUSES.includes(status as (typeof REVIEWABLE_STATUSES)[number])) throw new Error("This report is no longer awaiting review.");
  if (decision === "UNDER_REVIEW" && status !== "SUBMITTED") throw new Error("Review has already started.");
  return decision === "UNDER_REVIEW" ? "UNDER_REVIEW" : decision === "APPROVED" ? "APPROVED" : decision === "REJECTED" ? "REJECTED" : "RESUBMISSION_REQUIRED";
}
export function hasPdfSignature(buffer: Uint8Array) { return buffer.length >= 5 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46 && buffer[4] === 0x2d; }
export function submissionStatus(period: { status: string; dueDate: Date; extensionUntil?: Date | null }, report: { status: string } | undefined, now = new Date()) {
  if (report) return report.status;
  if (period.status === "CLOSED") return "CLOSED";
  return now > (period.extensionUntil ?? period.dueDate) ? "OVERDUE" : "NOT_SUBMITTED";
}
