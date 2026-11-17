"use server";
import mongoose, { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { SystemSetting } from "@/models/system-setting";
import { Training } from "@/models/training";
import { AuditLog } from "@/models/audit-log";
export async function savePortalSettings(form: FormData) {
  const principal = await requirePermission("TRAININGS_MANAGE");
  const domains = String(form.get("institutionalEmailDomains") ?? "").split(",").map((value) => value.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
  if (domains.some((value) => !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value))) throw new Error("Use comma-separated domain names, such as college.edu.");
  const readInt = (key: string, min: number, max: number) => { const value = Number(form.get(key)); if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${key} must be between ${min} and ${max}.`); return value; };
  const initialDate = String(form.get("initialReportingDate") ?? ""); if (initialDate && !/^\d{4}-\d{2}-\d{2}$/.test(initialDate)) throw new Error("Use a valid initial reporting date.");
  const values: Record<string, unknown> = { institutionalEmailDomains: [...new Set(domains)], otpTtlSeconds: readInt("otpTtlSeconds", 60, 900), otpResendCooldownSeconds: readInt("otpResendCooldownSeconds", 30, 600), otpMaxAttempts: readInt("otpMaxAttempts", 3, 10), reportMaxSizeBytes: readInt("reportMaxSizeMb", 1, 50) * 1024 * 1024, reportingIntervalDays: readInt("reportingIntervalDays", 1, 90), initialReportingDate: initialDate, reminderEmailsEnabled: form.get("reminderEmailsEnabled") === "on" };
  await connectMongo(); const session = await mongoose.startSession();
  try { await session.withTransaction(async () => {
    for (const [key, value] of Object.entries(values)) await SystemSetting.updateOne({ key }, { $set: { value, updatedBy: new Types.ObjectId(principal.userId) } }, { upsert: true, runValidators: true, session });
    await Training.updateMany({}, { $set: { reportingFrequencyDays: values.reportingIntervalDays, updatedBy: new Types.ObjectId(principal.userId) } }, { runValidators: true, session });
    await AuditLog.create([{ actor: new Types.ObjectId(principal.userId), action: "PORTAL_SETTINGS_UPDATED", entityType: "systemSetting", entityId: null, occurredAt: new Date(), metadata: { keys: Object.keys(values) } }], { session });
  }); } finally { await session.endSession(); }
  revalidatePath("/faculty/settings");
}
export async function saveTrainingDetails(code: string, form: FormData) {
  const principal = await requirePermission("TRAININGS_MANAGE");
  if (principal.trainingCodes.length && !principal.trainingCodes.includes(code)) throw new Error("You are not authorized to manage this training.");
  const description = String(form.get("description") ?? "").trim(); const name = String(form.get("name") ?? "").trim(); const status = String(form.get("status") ?? "");
  const frequency = Number(form.get("frequency")); const startText = String(form.get("startDate") ?? ""); const endText = String(form.get("endDate") ?? "");
  const startDate = startText ? new Date(startText) : null; const endDate = endText ? new Date(endText) : null;
  if (!name || name.length > 120 || description.length > 2000 || !Number.isInteger(frequency) || frequency < 1 || frequency > 366 || (status !== "ACTIVE" && status !== "INACTIVE") || (startDate && !Number.isFinite(startDate.getTime())) || (endDate && !Number.isFinite(endDate.getTime())) || (startDate && endDate && startDate > endDate)) throw new Error("Review the training name, dates, reporting frequency, and status.");
  await connectMongo(); const session = await mongoose.startSession();
  try { await session.withTransaction(async () => {
    const training = await Training.findOne({ code }).select("_id").session(session).lean(); if (!training) throw new Error("Training program not found.");
    await Training.updateOne({ _id: training._id }, { $set: { name, description, reportingFrequencyDays: frequency, status, startDate, endDate, updatedBy: new Types.ObjectId(principal.userId) } }, { runValidators: true, session });
    await AuditLog.create([{ actor: new Types.ObjectId(principal.userId), action: "TRAINING_CONFIGURATION_UPDATED", entityType: "training", entityId: training._id, occurredAt: new Date(), metadata: { code, changedFields: ["name", "description", "reportingFrequencyDays", "status", "startDate", "endDate"] } }], { session });
  }); } finally { await session.endSession(); }
  revalidatePath("/faculty/settings"); revalidatePath(`/faculty/trainings/${code}`);
}
