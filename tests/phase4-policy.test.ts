import test from "node:test";
import assert from "node:assert/strict";
import { buildPeriodDates } from "../src/lib/reports/period-utils";
import { hasPdfSignature, reviewStatus, submissionStatus } from "../src/lib/reports/policy";
import { createOtpCode, hashOtp, timingSafeHashEqual } from "../src/lib/auth/otp-crypto";

test("15-day windows are contiguous and include a partial final period", () => {
  const windows = buildPeriodDates(new Date("2026-01-01T00:00:00Z"), new Date("2026-02-04T00:00:00Z"), 15);
  assert.equal(windows.length, 3);
  assert.equal(windows[0].endDate.toISOString(), "2026-01-15T00:00:00.000Z");
  assert.equal(windows[1].startDate.toISOString(), "2026-01-16T00:00:00.000Z");
  assert.equal(windows[2].endDate.toISOString(), "2026-02-04T00:00:00.000Z");
});

test("review workflow permits decisions only from reviewable states", () => {
  assert.equal(reviewStatus("SUBMITTED", "APPROVED"), "APPROVED");
  assert.equal(reviewStatus("UNDER_REVIEW", "REJECTED"), "REJECTED");
  assert.equal(reviewStatus("SUBMITTED", "RESUBMISSION_REQUESTED"), "RESUBMISSION_REQUIRED");
  assert.throws(() => reviewStatus("APPROVED", "REJECTED"));
});

test("unsubmitted reporting periods become overdue after their effective deadline", () => {
  const period = { status: "OPEN", dueDate: new Date("2026-01-15T18:29:59.999Z"), extensionUntil: null };
  assert.equal(submissionStatus(period, undefined, new Date("2026-01-15T12:00:00Z")), "NOT_SUBMITTED");
  assert.equal(submissionStatus(period, undefined, new Date("2026-01-15T18:30:00Z")), "OVERDUE");
  assert.equal(submissionStatus(period, { status: "APPROVED" }, new Date("2026-01-16T00:00:00Z")), "APPROVED");
});

test("PDF signature check rejects renamed non-PDF content", () => {
  assert.equal(hasPdfSignature(Buffer.from("%PDF-1.7")), true);
  assert.equal(hasPdfSignature(Buffer.from("not a PDF")), false);
});

test("OTP generation and keyed digest checks do not expose reusable plaintext", () => {
  process.env.AUTH_SECRET = "unit-test-secret-at-least-32-characters-long";
  const code = createOtpCode(); const digest = hashOtp("test-account", code);
  assert.match(code, /^\d{6}$/);
  assert.notEqual(digest, code);
  assert.equal(timingSafeHashEqual(digest, hashOtp("test-account", code)), true);
  assert.equal(timingSafeHashEqual(digest, hashOtp("other-account", code)), false);
});
