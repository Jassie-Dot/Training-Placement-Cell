import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectMongo } from "@/lib/db/mongoose";
import { User } from "@/models/user";
import { Student } from "@/models/student";
import { Faculty } from "@/models/faculty";

export type Role = "TEACHER" | "STUDENT";
export type FacultyPermission = "STUDENTS_READ" | "STUDENTS_WRITE" | "TRAININGS_MANAGE" | "REPORTS_REVIEW" | "ANALYTICS_READ" | "EXPORT";
export type AuthenticatedPrincipal = { userId: string; role: Role; studentId: string | null; permissions: FacultyPermission[]; trainingCodes: string[] };

export const getPrincipal = cache(async (): Promise<AuthenticatedPrincipal | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || (role !== "TEACHER" && role !== "STUDENT")) return null;
  await connectMongo();
  const user = await User.findOne({ _id: userId, role, status: "ACTIVE", deletedAt: null }).select("_id").lean();
  if (!user) return null;
  if (role === "STUDENT") {
    const student = await Student.findOne({ user: user._id, status: "ACTIVE", deletedAt: null }).select("_id").lean();
    if (!student) return null;
    return { userId, role, studentId: student._id.toString(), permissions: [], trainingCodes: [] };
  }
  const faculty = await Faculty.findOne({ user: user._id, status: "ACTIVE", deletedAt: null }).select("_id permissions trainingCodes").lean();
  return faculty ? { userId, role, studentId: null, permissions: faculty.permissions as FacultyPermission[], trainingCodes: faculty.trainingCodes } : null;
});

export async function requireRole(role: Role) {
  const principal = await getPrincipal();
  if (!principal) redirect(role === "TEACHER" ? "/faculty/login" : "/student/login");
  if (principal.role !== role) redirect(principal.role === "TEACHER" ? "/faculty/dashboard" : "/student/dashboard");
  return principal;
}

export async function requireApiRole(role: Role): Promise<AuthenticatedPrincipal> {
  const principal = await getPrincipal();
  if (!principal) throw new AuthzError("UNAUTHENTICATED", 401);
  if (principal.role !== role) throw new AuthzError("FORBIDDEN", 403);
  return principal;
}

export async function requirePermission(permission: FacultyPermission) {
  const principal = await requireApiRole("TEACHER");
  if (!principal.permissions.includes(permission)) throw new AuthzError("FORBIDDEN", 403);
  return principal;
}

export async function requireTrainingPermission(permission: FacultyPermission, code: string) {
  const principal = await requireApiRole("TEACHER");
  if (!principal.permissions.includes(permission) || (principal.trainingCodes.length > 0 && !principal.trainingCodes.includes(code))) throw new AuthzError("FORBIDDEN", 403);
  return principal;
}

export async function requireFacultyPagePermission(permission: FacultyPermission) {
  const principal = await requireRole("TEACHER");
  if (!principal.permissions.includes(permission)) redirect("/faculty/forbidden");
  return principal;
}

export async function requireFacultyPageTrainingPermission(permission: FacultyPermission, code: string) {
  const principal = await requireRole("TEACHER");
  if (!principal.permissions.includes(permission) || (principal.trainingCodes.length > 0 && !principal.trainingCodes.includes(code))) redirect("/faculty/forbidden");
  return principal;
}

export class AuthzError extends Error {
  constructor(message: "UNAUTHENTICATED" | "FORBIDDEN", public readonly status: 401 | 403) { super(message); }
}
