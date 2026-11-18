import { getStudentPortalData } from "@/lib/student/portal-data";
import { GlassStudentDashboard } from "@/components/student/glass-student-dashboard";
import { redirect } from "next/navigation";

export default async function StudentDashboardPage() {
  const data = await getStudentPortalData();
  if (!data) redirect("/student/login");
  return <GlassStudentDashboard data={data} />;
}
