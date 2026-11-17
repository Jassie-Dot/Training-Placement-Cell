import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose, { Types } from "mongoose";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { isTrainingCode } from "@/lib/faculty/dashboard-data";
import { getPortalSettings, isInstitutionalEmail } from "@/lib/config/system-settings";
import { User } from "@/models/user";
import { Student } from "@/models/student";
import { Training } from "@/models/training";
import { Enrollment } from "@/models/enrollment";
import { AuditLog } from "@/models/audit-log";
import { Notification } from "@/models/notification";
import { studentEmailSchema } from "@/lib/auth/validation";
import type { AuthenticatedPrincipal } from "@/lib/auth/access";

const studentInputBaseSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  rollNumber: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  registrationNumber: z.string().trim().max(60).optional().transform((value) => value ? value.toUpperCase() : undefined),
  email: studentEmailSchema,
  department: z.string().trim().min(1).max(100),
  semester: z.coerce.number().int().min(1).max(12),
  academicYear: z.string().trim().max(20).optional().transform((value) => value || undefined),
  cgpa: z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().min(0).max(10).optional()),
  contactNumber: z.string().trim().max(24).optional().transform((value) => value || undefined).refine((value) => !value || /^[+\d\s().-]{7,24}$/.test(value), "Enter a valid contact number."),
  trainingCodes: z.array(z.string()).max(4).default([]),
});
export const studentInputSchema = studentInputBaseSchema.superRefine((value, ctx) => {
  if (value.trainingCodes.some((code) => !isTrainingCode(code)) || new Set(value.trainingCodes).size !== value.trainingCodes.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trainingCodes"], message: "Choose each valid training at most once." });
});
export type StudentInput = z.infer<typeof studentInputSchema>;

async function assertInstitutionalEmail(email: string) {
  const settings = await getPortalSettings();
  if (!isInstitutionalEmail(email, settings.institutionalEmailDomains)) throw new Error("The email domain is not in the configured institutional allowlist.");
}
async function assertStudentScope(principal: AuthenticatedPrincipal, studentId: string) {
  if (!principal.trainingCodes.length) return;
  const enrollments = await Enrollment.find({ student: studentId, deletedAt: null }).populate("training", "code").lean();
  if (!enrollments.some((row) => principal.trainingCodes.includes((row.training as unknown as { code: string }).code))) throw new Error("You are not authorized to manage this student.");
}

function duplicateError(error: unknown): never {
  if ((error as { code?: number }).code === 11000) throw new Error("A student with this roll number, registration number, or email already exists.");
  throw error;
}

export async function createStudentRecord(raw: unknown) {
  const principal = await requirePermission("STUDENTS_WRITE");
  const parsed = studentInputSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Student details are invalid.");
  const input = parsed.data;
  if (principal.trainingCodes.length && input.trainingCodes.some((code) => !principal.trainingCodes.includes(code))) throw new Error("You do not have access to one or more selected training programs.");
  if (principal.trainingCodes.length && !input.trainingCodes.length) throw new Error("Assign this student to a training program you manage.");
  await connectMongo();
  await assertInstitutionalEmail(input.email);
  const trainings = input.trainingCodes.length ? await Training.find({ code: { $in: input.trainingCodes }, status: "ACTIVE" }).select("_id code").lean() : [];
  if (trainings.length !== input.trainingCodes.length) throw new Error("One or more selected training programs are unavailable.");
  const session = await mongoose.startSession();
  let studentId = "";
  try {
    await session.withTransaction(async () => {
      const [user] = await User.create([{ identifier: input.rollNumber.toLowerCase(), passwordHash: await bcrypt.hash(randomBytes(48).toString("base64url"), 12), role: "STUDENT", status: "ACTIVE", mustChangePassword: true }], { session });
      const [student] = await Student.create([{ user: user._id, fullName: input.fullName, rollNumber: input.rollNumber, registrationNumber: input.registrationNumber, email: input.email, department: input.department, semester: input.semester, academicYear: input.academicYear, cgpa: input.cgpa, contactNumber: input.contactNumber, status: "ACTIVE" }], { session });
      studentId = student._id.toString();
      await User.updateOne({ _id: user._id }, { $set: { student: student._id } }, { session });
      if (trainings.length) await Enrollment.insertMany(trainings.map((training) => ({ student: student._id, training: training._id, status: "ACTIVE", assignedBy: new Types.ObjectId(principal.userId), assignmentHistory: [{ action: "ASSIGNED", actor: new Types.ObjectId(principal.userId), occurredAt: new Date(), note: "Initial student creation" }] })), { session });
      await AuditLog.create([{ actor: new Types.ObjectId(principal.userId), action: "STUDENT_CREATED", entityType: "student", entityId: student._id, occurredAt: new Date(), metadata: { rollNumber: input.rollNumber, trainingCodes: input.trainingCodes } }], { session });
      await Notification.create([{ recipient: user._id, channel: "IN_APP", type: "ACCOUNT_CREATED", title: "Student portal account created", body: "Your student portal account is ready. Sign in with an email verification code sent to your registered address.", idempotencyKey: `student-account:${student._id.toString()}` }], { session });
    });
  } catch (error) { duplicateError(error); }
  finally { await session.endSession(); }
  return { studentId };
}

const editableStudentSchema = studentInputBaseSchema.omit({ rollNumber: true, trainingCodes: true }).partial().refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");
export async function updateStudentRecord(studentId: string, raw: unknown) {
  const principal = await requirePermission("STUDENTS_WRITE");
  if (!Types.ObjectId.isValid(studentId)) throw new Error("Student record not found.");
  const parsed = editableStudentSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Student details are invalid.");
  await connectMongo();
  await assertStudentScope(principal, studentId);
  if (parsed.data.email) await assertInstitutionalEmail(parsed.data.email);
  const update = { ...parsed.data } as Record<string, unknown>; const unset: Record<string, 1> = {};
  const rawRecord = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  for (const field of ["registrationNumber", "academicYear", "cgpa", "contactNumber"] as const) if (rawRecord[field] === "") { delete update[field]; unset[field] = 1; }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const result = await Student.updateOne({ _id: studentId, deletedAt: null }, { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { session, runValidators: true });
      if (result.matchedCount !== 1) throw new Error("Student record not found.");
      await AuditLog.create([{ actor: new Types.ObjectId(principal.userId), action: "STUDENT_UPDATED", entityType: "student", entityId: new Types.ObjectId(studentId), occurredAt: new Date(), metadata: { changedFields: Object.keys(parsed.data) } }], { session });
    });
  } catch (error) { duplicateError(error); }
  finally { await session.endSession(); }
}

export async function setStudentStatus(studentId: string, status: "ACTIVE" | "INACTIVE" | "GRADUATED") {
  const principal = await requirePermission("STUDENTS_WRITE");
  if (!Types.ObjectId.isValid(studentId)) throw new Error("Student record not found.");
  await connectMongo();
  await assertStudentScope(principal, studentId);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const student = await Student.findOne({ _id: studentId, deletedAt: null }).select("user rollNumber status").session(session);
      if (!student) throw new Error("Student record not found.");
      student.status = status;
      await student.save({ session });
      const userResult = await User.updateOne({ _id: student.user, role: "STUDENT" }, { $set: { status: status === "ACTIVE" ? "ACTIVE" : "DISABLED" } }, { session });
      if (userResult.matchedCount !== 1) throw new Error("Student account not found.");
      if (status !== "ACTIVE") await Enrollment.updateMany({ student: student._id, status: "ACTIVE" }, { $set: { status: status === "GRADUATED" ? "COMPLETED" : "WITHDRAWN", endDate: new Date() }, $push: { assignmentHistory: { action: status === "GRADUATED" ? "COMPLETED" : "WITHDRAWN", actor: new Types.ObjectId(principal.userId), occurredAt: new Date(), note: `Student status changed to ${status}` } } }, { session });
      await AuditLog.create([{ actor: new Types.ObjectId(principal.userId), action: status === "ACTIVE" ? "STUDENT_ACTIVATED" : "STUDENT_DEACTIVATED", entityType: "student", entityId: student._id, occurredAt: new Date(), metadata: { status } }], { session });
    });
  } finally { await session.endSession(); }
}

export async function setStudentTrainingAssignments(studentId: string, requestedCodes: string[]) {
  const principal = await requirePermission("STUDENTS_WRITE");
  if (!Types.ObjectId.isValid(studentId)) throw new Error("Student record not found.");
  const uniqueCodes = [...new Set(requestedCodes)];
  if (uniqueCodes.length !== requestedCodes.length || uniqueCodes.some((code) => !isTrainingCode(code))) throw new Error("Select valid, unique training programs.");
  await connectMongo();
  const current = await Enrollment.find({ student: studentId, status: "ACTIVE", deletedAt: null }).populate("training", "code").lean();
  const currentCodes = current.map((row) => (row.training as unknown as { code: string }).code);
  if (principal.trainingCodes.length && !currentCodes.some((code) => principal.trainingCodes.includes(code))) {
    const historical = await Enrollment.find({ student: studentId, deletedAt: null }).populate("training", "code").lean();
    if (!historical.some((row) => principal.trainingCodes.includes((row.training as unknown as { code: string }).code))) throw new Error("You are not authorized to manage this student.");
  }
  const scopedCodes = [...new Set([...currentCodes, ...uniqueCodes])];
  if (principal.trainingCodes.length && scopedCodes.some((code) => !principal.trainingCodes.includes(code))) throw new Error("You do not have access to change one or more current assignments.");
  const trainings = await Training.find({ code: { $in: uniqueCodes }, status: "ACTIVE" }).select("_id code").lean();
  if (trainings.length !== uniqueCodes.length) throw new Error("One or more selected training programs are unavailable.");
  const student = await Student.findOne({ _id: studentId, status: "ACTIVE", deletedAt: null }).select("_id rollNumber user").lean();
  if (!student) throw new Error("Active student record not found.");
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const enrollment of current) {
        const code = (enrollment.training as unknown as { code: string }).code;
        if (!uniqueCodes.includes(code)) await Enrollment.updateOne({ _id: enrollment._id, status: "ACTIVE" }, { $set: { status: "WITHDRAWN", endDate: new Date() }, $push: { assignmentHistory: { action: "WITHDRAWN", actor: new Types.ObjectId(principal.userId), occurredAt: new Date(), note: "Faculty changed training assignment" } } }, { session });
      }
      const activeCodes = new Set(currentCodes);
      for (const training of trainings) {
        if (activeCodes.has(training.code)) continue;
        await Enrollment.findOneAndUpdate({ student: student._id, training: training._id }, { $set: { status: "ACTIVE", startDate: new Date(), endDate: null, assignedBy: new Types.ObjectId(principal.userId), deletedAt: null }, $push: { assignmentHistory: { action: "ASSIGNED", actor: new Types.ObjectId(principal.userId), occurredAt: new Date(), note: "Faculty updated training assignment" } }, $setOnInsert: { student: student._id, training: training._id } }, { upsert: true, new: true, runValidators: true, session });
      }
      await AuditLog.create([{ actor: new Types.ObjectId(principal.userId), action: "TRAINING_ASSIGNMENTS_CHANGED", entityType: "student", entityId: student._id, occurredAt: new Date(), metadata: { previousTrainingCodes: currentCodes, trainingCodes: uniqueCodes } }], { session });
      if (uniqueCodes.length) await Notification.findOneAndUpdate({ idempotencyKey: `training-assignment:${student._id.toString()}:${Date.now()}` }, { $setOnInsert: { recipient: student.user, channel: "IN_APP", type: "TRAINING_ASSIGNED", title: "Training assignment updated", body: `Your active training assignments are now: ${uniqueCodes.join(", ")}.`, metadata: { trainingCodes: uniqueCodes } } }, { upsert: true, new: true, session });
    });
  } catch (error) { duplicateError(error); }
  finally { await session.endSession(); }
}
