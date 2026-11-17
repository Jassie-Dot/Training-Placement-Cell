import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { isTrainingCode } from "@/lib/faculty/dashboard-data";

export default async function TrainingLayout({ children, params }: { children: ReactNode; params: Promise<{ code: string }> }) {
  const { code } = await params;
  await requireRole("TEACHER");
  if (!isTrainingCode(code)) notFound();
  return children;
}
