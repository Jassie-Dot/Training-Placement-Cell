"use server";
import { revalidatePath } from "next/cache";
import { configureReportingPeriods, updatePeriod } from "@/lib/reports/periods";
export async function createPeriodsAction(code: string, form: FormData) {
  const result = await configureReportingPeriods(code, String(form.get("startDate") ?? ""), String(form.get("endDate") ?? ""), String(form.get("instructions") ?? ""));
  revalidatePath(`/faculty/trainings/${code}/periods`); void result;
}
export async function extendPeriodAction(code: string, id: string, form: FormData) { await updatePeriod(code, id, "EXTEND", String(form.get("extensionUntil") ?? "")); revalidatePath(`/faculty/trainings/${code}/periods`); }
export async function closePeriodAction(code: string, id: string) { await updatePeriod(code, id, "CLOSE"); revalidatePath(`/faculty/trainings/${code}/periods`); }
