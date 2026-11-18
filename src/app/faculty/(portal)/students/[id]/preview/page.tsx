import { notFound } from "next/navigation";
import { requireFacultyPagePermission } from "@/lib/auth/access";
import { getStudentDataById } from "@/lib/student/portal-data";
import { GlassStudentDashboard } from "@/components/student/glass-student-dashboard";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminStudentPreviewPage({ params }: Props) {
  await requireFacultyPagePermission("STUDENTS_READ");
  const { id } = await params;
  const data = await getStudentDataById(id);

  if (!data) notFound();

  return <GlassStudentDashboard data={data} isAdminView={true} />;
}
