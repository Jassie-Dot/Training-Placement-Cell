import "server-only";
import ExcelJS from "exceljs";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { Student } from "@/models/student";
import { studentInputSchema, type StudentInput } from "@/lib/faculty/student-service";
import { Training } from "@/models/training";
import { User } from "@/models/user";
import { Enrollment } from "@/models/enrollment";
import { AuditLog } from "@/models/audit-log";
import { Notification } from "@/models/notification";
import mongoose, { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { isInstitutionalEmail, getPortalSettings } from "@/lib/config/system-settings";
import { isTrainingCode } from "@/lib/faculty/dashboard-data";

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const headerAliases: Record<string, keyof ImportRow> = {
  fullname: "fullName", name: "fullName", rollnumber: "rollNumber", universityrollnumber: "rollNumber",
  registrationnumber: "registrationNumber", collegeregistrationnumber: "registrationNumber", email: "email", institutionalemail: "email",
  department: "department", semester: "semester", academicyear: "academicYear", cgpa: "cgpa", contactnumber: "contactNumber", trainingcode: "trainingCode",
};
type ImportRow = { fullName: string; rollNumber: string; registrationNumber: string; email: string; department: string; semester: string; academicYear: string; cgpa: string; contactNumber: string; trainingCode: string };
export type PreviewRow = { rowNumber: number; values: Partial<StudentInput>; errors: string[] };

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") { if (char === "\r" && text[i + 1] === "\n") i++; row.push(cell); if (row.some((value) => value.trim())) rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted field.");
  row.push(cell); if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) { return value.replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z]/g, ""); }
function mapMatrix(matrix: unknown[][]) {
  if (matrix.length < 1) throw new Error("The file is empty.");
  if (matrix.length - 1 > MAX_IMPORT_ROWS) throw new Error(`Import files may contain up to ${MAX_IMPORT_ROWS} student rows.`);
  const headers = matrix[0].map((value) => headerAliases[normalizeHeader(String(value ?? ""))] ?? null);
  for (const required of ["fullName", "rollNumber", "email", "department", "semester"] as const) if (!headers.includes(required)) throw new Error(`Required column is missing: ${required}.`);
  return matrix.slice(1).map((values) => {
    const row = {} as ImportRow;
    headers.forEach((header, index) => { if (header) (row as unknown as Record<string, string>)[header] = String(values[index] ?? "").trim(); });
    return row;
  });
}

export async function parseImportFile(fileName: string, bytes: Buffer): Promise<ImportRow[]> {
  if (bytes.length > MAX_IMPORT_BYTES) throw new Error("Import file must be 5 MB or smaller.");
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "csv") return mapMatrix(parseCsv(bytes.toString("utf8")));
  if (extension !== "xlsx") throw new Error("Choose a .csv or .xlsx file.");
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("The Excel file signature is invalid.");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook has no worksheet.");
  const matrix: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (cell.formula || cell.type === ExcelJS.ValueType.Formula) throw new Error(`Formula cells are not allowed (row ${row.number}, column ${col}).`);
      const value = cell.value;
      values[col - 1] = value instanceof Date ? value.toISOString() : value && typeof value === "object" ? "" : String(value ?? "").trim();
    });
    matrix[row.number - 1] = values;
  });
  return mapMatrix(matrix.filter((row): row is unknown[] => Array.isArray(row)));
}

export async function validateImportRows(rawRows: ImportRow[]): Promise<PreviewRow[]> {
  const actor = await requirePermission("STUDENTS_WRITE");
  const settings = await getPortalSettings();
  await connectMongo();
  const normalizedRows: PreviewRow[] = rawRows.map((raw, index) => {
    const parsed = studentInputSchema.safeParse({ ...raw, trainingCodes: raw.trainingCode ? [raw.trainingCode.toUpperCase()] : [] });
    const errors = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    if (parsed.success && !isInstitutionalEmail(parsed.data.email, settings.institutionalEmailDomains)) errors.push("Email domain is not in the institutional allowlist.");
    if (raw.trainingCode && !isTrainingCode(raw.trainingCode.toUpperCase())) errors.push("Training code must be TR-101, TR-102, TR-103, or TR-104.");
    if (parsed.success && actor.trainingCodes.length && parsed.data.trainingCodes.some((code) => !isTrainingCode(code) || !actor.trainingCodes.includes(code))) errors.push("You are not authorized for the selected training.");
    return { rowNumber: index + 2, values: parsed.success ? parsed.data : raw as unknown as Partial<StudentInput>, errors };
  });
  const rolls = normalizedRows.map((row) => row.values.rollNumber).filter((value): value is string => Boolean(value));
  const emails = normalizedRows.map((row) => row.values.email).filter((value): value is string => Boolean(value));
  const registrations = normalizedRows.map((row) => row.values.registrationNumber).filter((value): value is string => Boolean(value));
  const [existing, activeTrainings] = await Promise.all([
    Student.find({ $or: [{ rollNumber: { $in: rolls } }, { email: { $in: emails } }, { registrationNumber: { $in: registrations } }] }).select("rollNumber email registrationNumber").lean(),
    Training.find({ code: { $in: ["TR-101", "TR-102", "TR-103", "TR-104"] }, status: "ACTIVE" }).select("code").lean(),
  ]);
  const existingRolls = new Set(existing.map((student) => student.rollNumber));
  const existingEmails = new Set(existing.map((student) => student.email));
  const existingRegs = new Set(existing.map((student) => student.registrationNumber).filter(Boolean));
  const seenRolls = new Set<string>(); const seenEmails = new Set<string>(); const seenRegs = new Set<string>();
  const activeCodes = new Set<string>(activeTrainings.map((training) => training.code));
  for (const row of normalizedRows) {
    const { rollNumber, email, registrationNumber, trainingCodes } = row.values;
    if (rollNumber && (existingRolls.has(rollNumber) || seenRolls.has(rollNumber))) row.errors.push("Duplicate university roll number.");
    if (email && (existingEmails.has(email) || seenEmails.has(email))) row.errors.push("Duplicate email address.");
    if (registrationNumber && (existingRegs.has(registrationNumber) || seenRegs.has(registrationNumber))) row.errors.push("Duplicate college registration number.");
    if (rollNumber) seenRolls.add(rollNumber);
    if (email) seenEmails.add(email);
    if (registrationNumber) seenRegs.add(registrationNumber);
    if (trainingCodes?.some((code) => !activeCodes.has(code))) row.errors.push("Training assignment is not active or configured.");
  }
  return normalizedRows;
}

const confirmSchema = z.array(studentInputSchema).min(1).max(MAX_IMPORT_ROWS);
export async function importStudentRows(raw: unknown) {
  const principal = await requirePermission("STUDENTS_WRITE");
  const parsed = confirmSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Import data is invalid.");
  const rows = parsed.data;
  if (principal.trainingCodes.length && rows.some((row) => row.trainingCodes.some((code) => !isTrainingCode(code) || !principal.trainingCodes.includes(code)))) throw new Error("You are not authorized for one or more training assignments.");
  const preview = await validateImportRows(rows.map((row) => ({ fullName: row.fullName, rollNumber: row.rollNumber, registrationNumber: row.registrationNumber ?? "", email: row.email, department: row.department, semester: String(row.semester), academicYear: row.academicYear ?? "", cgpa: row.cgpa === undefined ? "" : String(row.cgpa), contactNumber: row.contactNumber ?? "", trainingCode: row.trainingCodes[0] ?? "" })));
  const invalid = preview.find((row) => row.errors.length);
  if (invalid) throw new Error(`Resolve row ${invalid.rowNumber}: ${invalid.errors[0]}`);
  await connectMongo();
  const trainings = await Training.find({ code: { $in: [...new Set(rows.flatMap((row) => row.trainingCodes))] }, status: "ACTIVE" }).select("_id code").lean();
  const trainingByCode = new Map<string, Types.ObjectId>(trainings.map((training) => [training.code, training._id]));
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const createdStudents: InstanceType<typeof Student>[] = [];
      for (let start = 0; start < rows.length; start += 25) {
        const chunk = rows.slice(start, start + 25);
        const userDocs = await Promise.all(chunk.map(async (row) => ({ identifier: row.rollNumber.toLowerCase(), passwordHash: await bcrypt.hash(randomBytes(48).toString("base64url"), 12), role: "STUDENT" as const, status: "ACTIVE" as const, mustChangePassword: true })));
        const users = await User.create(userDocs, { session });
        const studentDocs = chunk.map((row, index) => ({ user: users[index]._id, fullName: row.fullName, rollNumber: row.rollNumber, registrationNumber: row.registrationNumber, email: row.email, department: row.department, semester: row.semester, academicYear: row.academicYear, cgpa: row.cgpa, contactNumber: row.contactNumber, status: "ACTIVE" as const }));
        const students = await Student.create(studentDocs, { session });
        users.forEach((user, index) => { user.student = students[index]._id; });
        await User.bulkSave(users, { session });
        createdStudents.push(...students);
      }
      const enrollments = createdStudents.flatMap((student, index) => rows[index].trainingCodes.map((code) => ({ student: student._id, training: trainingByCode.get(code), status: "ACTIVE" as const, assignedBy: new Types.ObjectId(principal.userId), assignmentHistory: [{ action: "ASSIGNED" as const, actor: new Types.ObjectId(principal.userId), occurredAt: new Date(), note: "Student spreadsheet import" }] })));
      if (enrollments.length) await Enrollment.insertMany(enrollments, { session, ordered: true });
      await AuditLog.create([{ actor: new Types.ObjectId(principal.userId), action: "STUDENTS_IMPORTED", entityType: "student", entityId: null, occurredAt: new Date(), metadata: { count: createdStudents.length } }], { session });
      await Notification.create([{ recipient: new Types.ObjectId(principal.userId), channel: "IN_APP", type: "STUDENT_IMPORT_COMPLETED", title: "Student import completed", body: `${createdStudents.length} student records were imported successfully.`, idempotencyKey: `student-import:${principal.userId}:${Date.now()}` }], { session });
      await Notification.insertMany(createdStudents.map((student) => ({ recipient: student.user, channel: "IN_APP", type: "ACCOUNT_CREATED", title: "Student portal account created", body: "Your student portal account is ready. Sign in with an email verification code sent to your registered address.", idempotencyKey: `student-account:${student._id.toString()}` })), { session, ordered: true });
    });
  } catch (error) { duplicateError(error); }
  finally { await session.endSession(); }
  return { imported: rows.length };
}

function duplicateError(error: unknown): never {
  if ((error as { code?: number }).code === 11000) throw new Error("The import contains a duplicate roll number, registration number, or email address.");
  throw error;
}
