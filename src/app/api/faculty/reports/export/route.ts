import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requirePermission, requireTrainingPermission } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { Training } from "@/models/training";
import { Enrollment } from "@/models/enrollment";
import { Report } from "@/models/report";
import { ReportingPeriod } from "@/models/reporting-period";
import { Student } from "@/models/student";

const allowed = new Set(["ALL", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "RESUBMISSION_REQUIRED", "OVERDUE"]);
const safeText = (value: unknown) => { const text = String(value ?? ""); return /^\s*[=+\-@]/.test(text) ? `'${text}` : text; };
const quote = (value: unknown) => `"${safeText(value).replaceAll('"', '""')}"`;
export async function GET(request: Request) {
  try {
    const principal = await requirePermission("EXPORT"); const url = new URL(request.url); const code = url.searchParams.get("training"); const status = (url.searchParams.get("status") ?? "ALL").toUpperCase(); const format = url.searchParams.get("format") ?? "csv";
    if (!allowed.has(status) || !["csv", "xlsx"].includes(format)) return NextResponse.json({ error: "Unsupported export filter or format." }, { status: 400 });
    if (code) await requireTrainingPermission("EXPORT", code);
    await connectMongo();
    const trainingFilter = code ? { code } : principal.trainingCodes.length ? { code: { $in: principal.trainingCodes } } : {};
    const trainings = await Training.find(trainingFilter).select("_id code").lean(); const trainingIds = trainings.map((row) => row._id);
    const enrollments = await Enrollment.find({ training: { $in: trainingIds }, deletedAt: null }).select("_id student training").lean();
    const reportFilter: Record<string, unknown> = { enrollment: { $in: enrollments.map((row) => row._id) }, deletedAt: null }; if (status !== "ALL" && status !== "OVERDUE") reportFilter.status = status;
    const reports = status === "OVERDUE" ? [] : await Report.find(reportFilter).sort({ updatedAt: -1 }).limit(10000).lean();
    const enrollmentById = new Map(enrollments.map((row) => [row._id.toString(), row]));
    const [students, periods] = await Promise.all([Student.find({ _id: { $in: enrollments.map((row) => row.student) } }).select("_id fullName rollNumber department semester").lean(), ReportingPeriod.find({ _id: { $in: reports.map((row) => row.reportingPeriod) } }).select("_id sequence dueDate extensionUntil").lean()]);
    const studentMap = new Map(students.map((row) => [row._id.toString(), row])); const periodMap = new Map(periods.map((row) => [row._id.toString(), row])); const codeById = new Map(trainings.map((row) => [row._id.toString(), row.code]));
    const rows: { training: string; rollNumber: string; student: string; department: string; semester: number | string; period: number | string; submittedAt: string; dueDate: string; status: string; title: string; feedback: string }[] = reports.map((report) => { const enrollment = enrollmentById.get(report.enrollment.toString()); const student = enrollment ? studentMap.get(enrollment.student.toString()) : null; const period = periodMap.get(report.reportingPeriod.toString()); const latest = report.revisions.at(-1); return { training: enrollment ? codeById.get(enrollment.training.toString()) ?? "" : "", rollNumber: student?.rollNumber ?? "", student: student?.fullName ?? "", department: student?.department ?? "", semester: student?.semester ?? "", period: period?.sequence ?? "", submittedAt: latest?.submittedAt.toISOString() ?? "", dueDate: (period?.extensionUntil ?? period?.dueDate)?.toISOString() ?? "", status: report.status, title: latest?.title ?? "", feedback: report.reviews.at(-1)?.remarks ?? "" }; });
    if (status === "OVERDUE") {
      const overdue = await ReportingPeriod.aggregate([
        { $match: { training: { $in: trainingIds }, status: { $ne: "CLOSED" }, $expr: { $lt: [{ $ifNull: ["$extensionUntil", "$dueDate"] }, new Date()] } } },
        { $lookup: { from: "enrollments", let: { periodId: "$_id", trainingId: "$training", deadline: { $ifNull: ["$extensionUntil", "$dueDate"] }, periodSequence: "$sequence" }, pipeline: [
          { $match: { $expr: { $and: [{ $eq: ["$training", "$$trainingId"] }, { $eq: ["$status", "ACTIVE"] }, { $eq: ["$deletedAt", null] }, { $or: [{ $eq: ["$startDate", null] }, { $lte: ["$startDate", "$$deadline"] }] }] } } },
          { $lookup: { from: "students", localField: "student", foreignField: "_id", as: "student" } }, { $unwind: "$student" }, { $match: { "student.status": "ACTIVE", "student.deletedAt": null } },
          { $lookup: { from: "reports", let: { enrollmentId: "$_id", periodId: "$$periodId" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$enrollment", "$$enrollmentId"] }, { $eq: ["$reportingPeriod", "$$periodId"] }, { $eq: ["$deletedAt", null] }] } } }, { $limit: 1 }], as: "report" } },
          { $match: { report: { $eq: [] } } }, { $project: { student: 1, sequence: "$$periodSequence", dueAt: "$$deadline", trainingId: "$$trainingId" } },
        ], as: "missing" } },
        { $unwind: "$missing" }, { $project: { student: "$missing.student", sequence: "$missing.sequence", dueAt: "$missing.dueAt", trainingId: "$missing.trainingId" } }, { $limit: 10000 },
      ]);
      const codeMap = new Map(trainings.map((training) => [training._id.toString(), training.code]));
      rows.push(...overdue.map((item: { student: { rollNumber: string; fullName: string; department: string; semester: number }; sequence: number; dueAt: Date; trainingId: { toString(): string } }) => ({ training: codeMap.get(item.trainingId.toString()) ?? "", rollNumber: item.student.rollNumber, student: item.student.fullName, department: item.student.department, semester: item.student.semester, period: item.sequence, submittedAt: "", dueDate: item.dueAt.toISOString(), status: "OVERDUE", title: "", feedback: "" })));
    }
    if (format === "csv") { const headers = Object.keys(rows[0] ?? { training: "", rollNumber: "", student: "", department: "", semester: "", period: "", submittedAt: "", dueDate: "", status: "", title: "", feedback: "" }); const body = [headers.map(quote).join(","), ...rows.map((row) => headers.map((key) => quote(row[key as keyof typeof row])).join(","))].join("\r\n"); return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=reports-${code ?? "authorized"}.csv`, "Cache-Control": "private, no-store" } }); }
    const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Reports"); sheet.columns = Object.keys(rows[0] ?? { training: "", rollNumber: "", student: "", department: "", semester: "", period: "", submittedAt: "", dueDate: "", status: "", title: "", feedback: "" }).map((key) => ({ header: key, key, width: Math.min(40, Math.max(14, key.length + 4)) })); sheet.addRows(rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "string" ? safeText(value) : value])))); sheet.getRow(1).font = { bold: true }; const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename=reports-${code ?? "authorized"}.xlsx`, "Cache-Control": "private, no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed." }, { status: (error as { status?: number }).status ?? 400 }); }
}
