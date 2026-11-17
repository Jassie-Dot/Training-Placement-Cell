"use server";

import { signOut } from "@/auth";
import { requireRole } from "@/lib/auth/access";

export async function studentSignOut() {
  await requireRole("STUDENT");
  await signOut({ redirectTo: "/student/login" });
}
