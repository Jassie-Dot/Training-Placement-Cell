import { getStudentPortalData } from "@/lib/student/portal-data";
import { getPortalSettings } from "@/lib/config/system-settings";
import { StudentWorkspaceShell } from "@/components/student/workspace-shell";
import { ReportUploadForm } from "@/components/student/report-upload-form";
export default async function UploadReportPage() { const data = await getStudentPortalData(); if (!data) return null; const settings = await getPortalSettings(); const now = new Date();
  const periods = data.current.filter((period) => { const deadline = period.extensionUntil ?? period.dueDate; const report = data.reportByPeriod.get(period._id.toString()); return now <= deadline && (!report || ["REJECTED", "RESUBMISSION_REQUIRED"].includes(report.status)); }).map((period) => ({ id: period._id.toString(), label: `Period ${period.sequence} · deadline ${(period.extensionUntil ?? period.dueDate).toLocaleDateString("en-IN")}` }));
  return <StudentWorkspaceShell active="Submit Report"><h1>Submit a report</h1><p className="student-muted">Choose an open reporting period and upload your progress as a PDF.</p>{periods.length ? <ReportUploadForm periods={periods} maxBytes={settings.reportMaxSizeBytes} /> : <div className="student-alert">There are no open periods that need a submission right now. Review My Training for deadlines and report history.</div>}</StudentWorkspaceShell>;
}
