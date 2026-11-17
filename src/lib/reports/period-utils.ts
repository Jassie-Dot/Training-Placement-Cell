export type PeriodWindow = { sequence: number; startDate: Date; endDate: Date; dueDate: Date };
export function parsePortalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(Number.NaN);
  return new Date(`${value}T00:00:00+05:30`);
}
export function buildPeriodDates(start: Date, end: Date, intervalDays: number): PeriodWindow[] {
  if (!Number.isInteger(intervalDays) || intervalDays < 1 || start > end) throw new Error("Invalid reporting period range.");
  const periods: PeriodWindow[] = []; let cursor = new Date(start); let sequence = 1;
  while (cursor <= end && periods.length < 400) {
    const periodEnd = new Date(Math.min(end.getTime(), cursor.getTime() + (intervalDays - 1) * 86400000));
    periods.push({ sequence, startDate: new Date(cursor), endDate: periodEnd, dueDate: new Date(periodEnd.getTime() + 86400000 - 1) });
    cursor = new Date(periodEnd.getTime() + 86400000); sequence++;
  }
  return periods;
}
