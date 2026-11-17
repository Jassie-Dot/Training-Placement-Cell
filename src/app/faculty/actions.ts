"use server";

import { signOut } from "@/auth";
import { requireRole } from "@/lib/auth/access";

export async function facultySignOut() {
  await requireRole("TEACHER");
  await signOut({ redirectTo: "/faculty/login" });
}
