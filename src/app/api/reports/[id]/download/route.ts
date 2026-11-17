import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireApiRole } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { signedPrivatePdfUrl } from "@/lib/storage/s3";
import { Report } from "@/models/report";
import { Enrollment } from "@/models/enrollment";
import { Training } from "@/models/training";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const principal = await requireApiRole("STUDENT").catch(async () => requireApiRole("TEACHER"));
    await connectMongo();
    const reportRef = await Report.findOne({ _id: id, deletedAt: null }).select("enrollment").lean(); if (!reportRef) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const enrollment = await Enrollment.findById(reportRef.enrollment).select("student training").lean(); if (!enrollment) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    if (principal.role === "STUDENT" && enrollment.student.toString() !== principal.studentId) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    if (principal.role === "TEACHER") { const training = await Training.findById(enrollment.training).select("code").lean(); if (!training) return NextResponse.json({ error: "Report not found." }, { status: 404 }); await import("@/lib/auth/access").then(({ requireTrainingPermission }) => requireTrainingPermission("REPORTS_REVIEW", training.code)); }
    const report = await Report.findOne({ _id: id, deletedAt: null }).select("revisions").lean(); if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const version = Number(new URL(request.url).searchParams.get("version") ?? report.revisions.length); if (!Number.isInteger(version) || version < 1) return NextResponse.json({ error: "Report version not found." }, { status: 404 });
    const revision = report.revisions.find((item) => item.version === version); if (!revision) return NextResponse.json({ error: "Report version not found." }, { status: 404 });
    return NextResponse.redirect(await signedPrivatePdfUrl(revision.storageKey), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not access this report." }, { status: (error as { status?: number }).status ?? 403 }); }
}
