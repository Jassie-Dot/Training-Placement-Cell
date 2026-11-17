import "server-only";
import { Types, type PipelineStage } from "mongoose";
import { connectMongo } from "@/lib/db/mongoose";
import { Training } from "@/models/training";
import { Enrollment } from "@/models/enrollment";
import { Student } from "@/models/student";
import type { TrainingCode } from "@/lib/faculty/dashboard-data";
import { requirePermission, requireTrainingPermission } from "@/lib/auth/access";

export type StudentFilters = { page?: number; pageSize?: number; q?: string; department?: string; minCgpa?: number; maxCgpa?: number; status?: string; sort?: string; direction?: string };
export type StudentTableRow = { id: string; rollNumber: string; fullName: string; department: string; semester: number; cgpa: number | null; email: string; submitted: number; approved: number; pending: number; status: string };
export type AllStudentTableRow = StudentTableRow & { trainingLabels: string[] };
const allowedSort: Record<string, string> = { rollNumber: "student.rollNumber", fullName: "student.fullName", department: "student.department", semester: "student.semester", cgpa: "student.cgpa" };
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function getTrainingStudents(code: TrainingCode, filters: StudentFilters = {}) {
  await requireTrainingPermission("STUDENTS_READ", code);
  await connectMongo();
  const training = await Training.findOne({ code }).select("_id").lean();
  if (!training) return { rows: [] as StudentTableRow[], total: 0, page: 1, pageSize: 20, departments: [] as string[] };
  const pageSize = Math.min(100, Math.max(1, Math.floor(filters.pageSize ?? 20)));
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const search = filters.q?.trim().slice(0, 100);
  const studentMatch: Record<string, unknown> = { "student.status": "ACTIVE", "student.deletedAt": null };
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    studentMatch.$or = [{ "student.rollNumber": rx }, { "student.fullName": rx }, { "student.email": rx }];
  }
  if (filters.department) studentMatch["student.department"] = filters.department.slice(0, 100);
  if (filters.minCgpa !== undefined || filters.maxCgpa !== undefined) studentMatch["student.cgpa"] = { ...(filters.minCgpa !== undefined ? { $gte: filters.minCgpa } : {}), ...(filters.maxCgpa !== undefined ? { $lte: filters.maxCgpa } : {}) };
  if (filters.status && ["ACTIVE", "COMPLETED", "WITHDRAWN"].includes(filters.status)) studentMatch.status = filters.status;
  const sortField = allowedSort[filters.sort ?? "rollNumber"] ?? allowedSort.rollNumber;
  const sortDir = filters.direction === "desc" ? -1 : 1;
  const pipeline: PipelineStage[] = [
    { $match: { training: training._id, status: filters.status && ["ACTIVE", "COMPLETED", "WITHDRAWN"].includes(filters.status) ? filters.status : "ACTIVE", deletedAt: null } },
    { $lookup: { from: "students", localField: "student", foreignField: "_id", as: "student" } }, { $unwind: "$student" },
    { $match: studentMatch },
    { $sort: { [sortField]: sortDir, _id: 1 } },
    { $facet: { rows: [
      { $skip: (page - 1) * pageSize }, { $limit: pageSize },
      { $lookup: { from: "reports", let: { enrollmentId: "$_id" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$enrollment", "$$enrollmentId"] }, { $eq: ["$deletedAt", null] }] } } }, { $project: { status: 1 } }], as: "reports" } },
      { $addFields: { submitted: { $size: "$reports" }, approved: { $size: { $filter: { input: "$reports", as: "report", cond: { $eq: ["$$report.status", "APPROVED"] } } } }, pending: { $size: { $filter: { input: "$reports", as: "report", cond: { $in: ["$$report.status", ["SUBMITTED", "UNDER_REVIEW"]] } } } } } },
      { $project: { id: { $toString: "$student._id" }, rollNumber: "$student.rollNumber", fullName: "$student.fullName", department: "$student.department", semester: "$student.semester", cgpa: { $ifNull: ["$student.cgpa", null] }, email: { $ifNull: ["$student.email", ""] }, submitted: 1, approved: 1, pending: 1, status: 1 } },
    ], total: [{ $count: "value" }] } },
  ];
  const [result] = await Enrollment.aggregate(pipeline);
  const departments = await Enrollment.aggregate([
    { $match: { training: training._id, status: "ACTIVE", deletedAt: null } }, { $lookup: { from: "students", localField: "student", foreignField: "_id", as: "student" } }, { $unwind: "$student" }, { $group: { _id: "$student.department" } }, { $sort: { _id: 1 } },
  ]);
  return { rows: (result?.rows ?? []) as StudentTableRow[], total: result?.total?.[0]?.value ?? 0, page, pageSize, departments: departments.map((row: { _id: string }) => row._id) };
}

export async function getAllStudents(filters: StudentFilters = {}) {
  const principal = await requirePermission("STUDENTS_READ");
  await connectMongo();
  const pageSize = Math.min(100, Math.max(1, Math.floor(filters.pageSize ?? 20)));
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const search = filters.q?.trim().slice(0, 100);
  const match: Record<string, unknown> = { status: filters.status && ["ACTIVE", "INACTIVE", "GRADUATED"].includes(filters.status) ? filters.status : "ACTIVE", deletedAt: null };
  let visibleStudentIds: unknown[] | null = null;
  if (principal.trainingCodes.length) {
    const allowedTrainings = await Training.find({ code: { $in: principal.trainingCodes } }).distinct("_id");
    visibleStudentIds = await Enrollment.find({ training: { $in: allowedTrainings }, deletedAt: null }).distinct("student");
    match._id = { $in: visibleStudentIds };
  }
  if (search) { const rx = new RegExp(escapeRegex(search), "i"); match.$or = [{ rollNumber: rx }, { fullName: rx }, { email: rx }]; }
  if (filters.department) match.department = filters.department.slice(0, 100);
  if (filters.minCgpa !== undefined || filters.maxCgpa !== undefined) match.cgpa = { ...(filters.minCgpa !== undefined ? { $gte: filters.minCgpa } : {}), ...(filters.maxCgpa !== undefined ? { $lte: filters.maxCgpa } : {}) };
  const sortField = allowedSort[filters.sort ?? "rollNumber"]?.replace("student.", "") ?? "rollNumber";
  const sortDir = filters.direction === "desc" ? -1 : 1;
  const [result] = await Student.aggregate([
    { $match: match },
    { $sort: { [sortField]: sortDir, _id: 1 } },
    { $facet: { rows: [
      { $skip: (page - 1) * pageSize }, { $limit: pageSize },
      { $lookup: { from: "enrollments", localField: "_id", foreignField: "student", as: "enrollments" } },
      { $lookup: { from: "reports", let: { enrollmentIds: "$enrollments._id" }, pipeline: [{ $match: { $expr: { $and: [{ $in: ["$enrollment", "$$enrollmentIds"] }, { $eq: ["$deletedAt", null] }] } } }, { $project: { status: 1 } }], as: "reports" } },
      { $addFields: { submitted: { $size: "$reports" }, approved: { $size: { $filter: { input: "$reports", as: "r", cond: { $eq: ["$$r.status", "APPROVED"] } } } }, pending: { $size: { $filter: { input: "$reports", as: "r", cond: { $in: ["$$r.status", ["SUBMITTED", "UNDER_REVIEW"]] } } } }, trainingIds: { $setUnion: [[], { $map: { input: "$enrollments", as: "e", in: "$$e.training" } }] } } },
      { $lookup: { from: "trainings", localField: "trainingIds", foreignField: "_id", as: "trainings" } },
      { $project: { id: { $toString: "$_id" }, rollNumber: 1, fullName: 1, department: 1, semester: 1, cgpa: { $ifNull: ["$cgpa", null] }, email: { $ifNull: ["$email", ""] }, submitted: 1, approved: 1, pending: 1, status: 1, trainingLabels: { $map: { input: "$trainings", as: "t", in: "$$t.code" } } } },
    ], total: [{ $count: "value" }] } },
  ]);
  const departments = await Student.distinct("department", { deletedAt: null, ...(visibleStudentIds ? { _id: { $in: visibleStudentIds } } : {}) });
  return { rows: (result?.rows ?? []) as AllStudentTableRow[], total: result?.total?.[0]?.value ?? 0, page, pageSize, departments: departments.sort() };
}

export async function getStudentProfile(studentId: string) {
  const principal = await requirePermission("STUDENTS_READ");
  if (!Types.ObjectId.isValid(studentId)) return null;
  await connectMongo();
  const { Student } = await import("@/models/student");
  const student = await Student.findOne({ _id: studentId, deletedAt: null }).select("fullName rollNumber registrationNumber email department semester academicYear cgpa contactNumber status").lean();
  if (!student) return null;
  const { Enrollment } = await import("@/models/enrollment");
  const allowedCodes = principal.trainingCodes;
  const enrollments = await Enrollment.find({ student: student._id, deletedAt: null }).populate("training", "code name status").lean();
  if (allowedCodes.length && !enrollments.some((enrollment) => allowedCodes.includes((enrollment.training as unknown as { code: string }).code))) return null;
  const visibleEnrollments = allowedCodes.length ? enrollments.filter((enrollment) => allowedCodes.includes((enrollment.training as unknown as { code: string }).code)) : enrollments;
  return { student, enrollments: visibleEnrollments.map((enrollment) => ({ _id: enrollment._id, status: enrollment.status, training: enrollment.training })) };
}
