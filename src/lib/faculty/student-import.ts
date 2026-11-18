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
import { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { isTrainingCode } from "@/lib/faculty/dashboard-data";

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

type ImportRow = {
  fullName: string;
  rollNumber: string;
  registrationNumber: string;
  email: string;
  department: string;
  semester: string;
  academicYear: string;
  cgpa: string;
  contactNumber: string;
  trainingCode: string;
  companyName: string;
  projectTitle: string;
  evaluationGrade: string;
  attendancePercentage: string;
  certificateStatus: string;
  certificateUrl: string;
  evaluationRemarks: string;
};

const headerAliases: Record<string, keyof ImportRow> = {
  fullname: "fullName", name: "fullName", studentname: "fullName",
  rollnumber: "rollNumber", universityrollnumber: "rollNumber", rollno: "rollNumber",
  registrationnumber: "registrationNumber", collegeregistrationnumber: "registrationNumber",
  email: "email", institutionalemail: "email", studentemail: "email",
  department: "department", dept: "department", branch: "department",
  semester: "semester", sem: "semester",
  academicyear: "academicYear", year: "academicYear",
  cgpa: "cgpa", gpa: "cgpa",
  contactnumber: "contactNumber", phone: "contactNumber", mobile: "contactNumber",
  trainingcode: "trainingCode", training: "trainingCode",
  company: "companyName", companyname: "companyName", organization: "companyName", industry: "companyName",
  project: "projectTitle", projecttitle: "projectTitle", projectname: "projectTitle",
  grade: "evaluationGrade", evaluation: "evaluationGrade", evaluationgrade: "evaluationGrade", marks: "evaluationGrade", score: "evaluationGrade",
  attendance: "attendancePercentage", attendancepercentage: "attendancePercentage",
  certificate: "certificateStatus", certificatestatus: "certificateStatus",
  certificateurl: "certificateUrl", certificatelink: "certificateUrl",
  remarks: "evaluationRemarks", feedback: "evaluationRemarks", evaluationremarks: "evaluationRemarks", comments: "evaluationRemarks",
};

export type PreviewRow = { rowNumber: number; values: Partial<StudentInput>; errors: string[]; isUpdate?: boolean };

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
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    }
    else cell += char;
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted field.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z]/g, "");
}

function mapMatrix(matrix: unknown[][]): ImportRow[] {
  if (matrix.length < 1) throw new Error("The file is empty.");
  if (matrix.length - 1 > MAX_IMPORT_ROWS) throw new Error(`Import files may contain up to ${MAX_IMPORT_ROWS} student rows.`);
  const headers = matrix[0].map((value) => headerAliases[normalizeHeader(String(value ?? ""))] ?? null);
  for (const required of ["fullName", "rollNumber", "email", "department", "semester"] as const) {
    if (!headers.includes(required)) throw new Error(`Required column is missing: ${required}.`);
  }
  return matrix.slice(1).map((values) => {
    const row = {} as ImportRow;
    headers.forEach((header, index) => {
      if (header) (row as unknown as Record<string, string>)[header] = String(values[index] ?? "").trim();
    });
    return row;
  });
}

export async function parseImportFile(fileName: string, bytes: Buffer): Promise<ImportRow[]> {
  if (bytes.length > MAX_IMPORT_BYTES) throw new Error("Import file must be 10 MB or smaller.");
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
  await connectMongo();

  const normalizedRows: PreviewRow[] = rawRows.map((raw, index) => {
    const parsed = studentInputSchema.safeParse({
      ...raw,
      trainingCodes: raw.trainingCode ? [raw.trainingCode.toUpperCase()] : [],
    });
    const errors = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    if (raw.trainingCode && !isTrainingCode(raw.trainingCode.toUpperCase())) {
      errors.push("Training code must be TR-101, TR-102, TR-103, or TR-104.");
    }
    if (parsed.success && actor.trainingCodes.length && parsed.data.trainingCodes.some((code) => !isTrainingCode(code) || !actor.trainingCodes.includes(code))) {
      errors.push("You are not authorized for the selected training.");
    }
    return { rowNumber: index + 2, values: parsed.success ? parsed.data : raw as unknown as Partial<StudentInput>, errors };
  });

  const rolls = normalizedRows.map((row) => row.values.rollNumber).filter((v): v is string => Boolean(v));
  const emails = normalizedRows.map((row) => row.values.email).filter((v): v is string => Boolean(v));

  const existing = await Student.find({
    $or: [{ rollNumber: { $in: rolls } }, { email: { $in: emails } }],
  }).select("rollNumber email").lean();

  const existingRolls = new Set(existing.map((s) => s.rollNumber));
  const seenRolls = new Set<string>();

  for (const row of normalizedRows) {
    const { rollNumber } = row.values;
    if (rollNumber) {
      if (seenRolls.has(rollNumber)) {
        row.errors.push("Duplicate roll number within uploaded spreadsheet.");
      } else {
        seenRolls.add(rollNumber);
      }
      if (existingRolls.has(rollNumber)) {
        row.isUpdate = true;
      }
    }
  }

  return normalizedRows;
}

const confirmSchema = z.array(studentInputSchema).min(1).max(MAX_IMPORT_ROWS);

export async function importStudentRows(raw: unknown) {
  const principal = await requirePermission("STUDENTS_WRITE");
  const parsed = confirmSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Import data is invalid.");
  const rows = parsed.data;

  await connectMongo();
  const trainings = await Training.find({ status: "ACTIVE" }).select("_id code").lean();
  const trainingByCode = new Map<string, Types.ObjectId>(trainings.map((t) => [t.code, t._id]));

  let createdCount = 0;
  let updatedCount = 0;

  for (const row of rows) {
    const roll = row.rollNumber.toUpperCase();
    const email = row.email.toLowerCase();

    let student = await Student.findOne({ $or: [{ rollNumber: roll }, { email }] });

    if (student) {
      // Update existing student
      student.fullName = row.fullName;
      student.department = row.department;
      student.semester = row.semester;
      if (row.academicYear) student.academicYear = row.academicYear;
      if (row.cgpa !== undefined) student.cgpa = row.cgpa;
      if (row.contactNumber) student.contactNumber = row.contactNumber;
      if (row.companyName !== undefined) student.companyName = row.companyName;
      if (row.projectTitle !== undefined) student.projectTitle = row.projectTitle;
      if (row.evaluationGrade !== undefined) student.evaluationGrade = row.evaluationGrade;
      if (row.attendancePercentage !== undefined) student.attendancePercentage = row.attendancePercentage;
      if (row.certificateStatus !== undefined) student.certificateStatus = row.certificateStatus;
      if (row.certificateUrl !== undefined) student.certificateUrl = row.certificateUrl;
      if (row.evaluationRemarks !== undefined) student.evaluationRemarks = row.evaluationRemarks;
      student.status = "ACTIVE";
      await student.save();

      // Ensure training enrollments
      for (const code of row.trainingCodes) {
        const trainingId = trainingByCode.get(code);
        if (trainingId) {
          await Enrollment.findOneAndUpdate(
            { student: student._id, training: trainingId },
            {
              $setOnInsert: {
                student: student._id,
                training: trainingId,
                status: "ACTIVE",
                assignedBy: new Types.ObjectId(principal.userId),
                assignmentHistory: [{ action: "ASSIGNED", actor: new Types.ObjectId(principal.userId), occurredAt: new Date(), note: "Spreadsheet sync" }],
              },
            },
            { upsert: true, new: true }
          );
        }
      }
      updatedCount++;
    } else {
      // Create new student and user account
      const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);
      const user = await User.create({
        identifier: roll.toLowerCase(),
        passwordHash,
        role: "STUDENT",
        status: "ACTIVE",
        mustChangePassword: true,
      });

      const newStudent = await Student.create({
        user: user._id,
        fullName: row.fullName,
        rollNumber: roll,
        registrationNumber: row.registrationNumber,
        email,
        department: row.department,
        semester: row.semester,
        academicYear: row.academicYear,
        cgpa: row.cgpa,
        contactNumber: row.contactNumber,
        companyName: row.companyName ?? "",
        projectTitle: row.projectTitle ?? "",
        evaluationGrade: row.evaluationGrade ?? "Under Evaluation",
        attendancePercentage: row.attendancePercentage ?? "100%",
        certificateStatus: row.certificateStatus ?? "UNDER_REVIEW",
        certificateUrl: row.certificateUrl ?? "",
        evaluationRemarks: row.evaluationRemarks ?? "",
        status: "ACTIVE",
      });

      await User.updateOne({ _id: user._id }, { $set: { student: newStudent._id } });

      for (const code of row.trainingCodes) {
        const trainingId = trainingByCode.get(code);
        if (trainingId) {
          await Enrollment.create({
            student: newStudent._id,
            training: trainingId,
            status: "ACTIVE",
            assignedBy: new Types.ObjectId(principal.userId),
            assignmentHistory: [{ action: "ASSIGNED", actor: new Types.ObjectId(principal.userId), occurredAt: new Date(), note: "Spreadsheet import" }],
          });
        }
      }
      createdCount++;
    }
  }

  await AuditLog.create({
    actor: new Types.ObjectId(principal.userId),
    action: "STUDENTS_IMPORTED",
    entityType: "student",
    entityId: null,
    occurredAt: new Date(),
    metadata: { created: createdCount, updated: updatedCount, total: rows.length },
  });

  return { imported: rows.length, created: createdCount, updated: updatedCount };
}
