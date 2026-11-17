import { notFound } from "next/navigation";
import { requireFacultyPageTrainingPermission } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { ReportingPeriod } from "@/models/reporting-period";
import { Training } from "@/models/training";
import { TrainingSubnav } from "@/components/faculty/training-subnav";
import { closePeriodAction, createPeriodsAction, extendPeriodAction } from "./actions";
import { getPortalSettings } from "@/lib/config/system-settings";
export default async function PeriodsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params; await requireFacultyPageTrainingPermission("TRAININGS_MANAGE", code); await connectMongo();
  const training = await Training.findOne({ code }).select("_id name startDate endDate").lean(); if (!training) notFound(); const settings = await getPortalSettings();
  const defaultStart = settings.initialReportingDate || training.startDate?.toISOString().slice(0, 10) || "";
  const periods = await ReportingPeriod.find({ training: training._id }).sort({ sequence: 1 }).lean();
  return <main className="faculty-content"><div className="faculty-page-heading"><div><span className="faculty-eyebrow">{code} · REPORTING SETUP</span><h1>Reporting periods</h1><p>Generate non-overlapping reporting windows using this training’s configured frequency.</p></div></div><TrainingSubnav code={code} section="periods" />
    <form action={createPeriodsAction.bind(null, code)} className="settings-card form-grid"><h2 className="wide-field">Generate periods</h2><label>First period starts<input type="date" name="startDate" required defaultValue={defaultStart} /></label><label>Reporting ends<input type="date" name="endDate" required defaultValue={training.endDate?.toISOString().slice(0, 10)} /></label><label className="wide-field">Student instructions<textarea name="instructions" required maxLength={3000} defaultValue="Upload a PDF progress report for this reporting period." /></label><button className="button button-primary">Generate periods</button></form>
    <div className="table-scroll"><table className="data-table"><thead><tr><th>Period</th><th>Dates</th><th>Due</th><th>Status</th><th>Manage</th></tr></thead><tbody>{periods.map((period) => <tr key={period._id.toString()}><td>{period.sequence}</td><td>{period.startDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} – {period.endDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</td><td>{(period.extensionUntil ?? period.dueDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</td><td>{period.status}</td><td>{period.status !== "CLOSED" && <div className="form-actions"><form action={extendPeriodAction.bind(null, code, period._id.toString())}><input aria-label="Extended deadline" type="date" name="extensionUntil" required /><button className="button button-secondary">Extend</button></form><form action={closePeriodAction.bind(null, code, period._id.toString())}><button className="button button-secondary">Close period</button></form></div>}</td></tr>)}</tbody></table></div>
  </main>;
}
