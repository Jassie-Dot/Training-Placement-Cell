import { requireFacultyPagePermission } from "@/lib/auth/access";
import { getFacultyName, getFacultyOverview } from "@/lib/faculty/dashboard-data";
import { getAllStudents } from "@/lib/faculty/student-query";
import { GlassAdminDashboard } from "@/components/faculty/glass-admin-dashboard";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FacultyDashboard({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const principal = await requireFacultyPagePermission("ANALYTICS_READ");
  const params = searchParams ? await searchParams : {};
  const initialTab = typeof params.tab === "string" ? (params.tab as any) : "overview";

  // Fetch overview and initial students in parallel with server-side in-memory caching
  const [faculty, overview, studentResult] = await Promise.all([
    getFacultyName(principal.userId),
    getFacultyOverview(),
    getAllStudents({ pageSize: 100 }),
  ]);

  return (
    <GlassAdminDashboard
      facultyName={faculty?.fullName ?? "Administrator"}
      permissions={principal.permissions}
      overview={overview}
      students={studentResult.rows}
      departments={studentResult.departments}
      totalStudents={studentResult.total}
      initialTab={initialTab}
    />
  );
}
