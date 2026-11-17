import "server-only";
import { connectMongo } from "@/lib/db/mongoose";
import { SystemSetting } from "@/models/system-setting";

export type PortalSettings = { institutionalEmailDomains: string[]; otpTtlSeconds: number; otpResendCooldownSeconds: number; otpMaxAttempts: number; reportMaxSizeBytes: number; reportingIntervalDays: number; initialReportingDate: string; reminderEmailsEnabled: boolean };
const integer = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : fallback;
export async function getPortalSettings(): Promise<PortalSettings> {
  await connectMongo();
  const rows = await SystemSetting.find({ key: { $in: ["institutionalEmailDomains", "otpTtlSeconds", "otpResendCooldownSeconds", "otpMaxAttempts", "reportMaxSizeBytes", "reportingIntervalDays", "initialReportingDate", "reminderEmailsEnabled"] } }).select("key value").lean();
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value])) as Record<string, unknown>;
  const envDomains = (process.env.INSTITUTIONAL_EMAIL_DOMAINS ?? "gndec.ac.in,gmail.com").split(",").map((value) => value.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
  const configuredDomains = Array.isArray(settings.institutionalEmailDomains) ? settings.institutionalEmailDomains : envDomains;
  const domains = [...configuredDomains, "gndec.ac.in", "gmail.com"];
  return {
    institutionalEmailDomains: [...new Set(domains.filter((value): value is string => typeof value === "string").map((value) => value.trim().toLowerCase().replace(/^@/, "")).filter(Boolean))],
    otpTtlSeconds: integer(settings.otpTtlSeconds, integer(Number(process.env.OTP_TTL_SECONDS), 300, 60, 900), 60, 900),
    otpResendCooldownSeconds: integer(settings.otpResendCooldownSeconds, integer(Number(process.env.OTP_RESEND_COOLDOWN_SECONDS), 60, 30, 600), 30, 600),
    otpMaxAttempts: integer(settings.otpMaxAttempts, integer(Number(process.env.OTP_MAX_ATTEMPTS), 5, 3, 10), 3, 10),
    reportMaxSizeBytes: integer(settings.reportMaxSizeBytes, integer(Number(process.env.REPORT_MAX_SIZE_BYTES), 10 * 1024 * 1024, 1024 * 1024, 50 * 1024 * 1024), 1024 * 1024, 50 * 1024 * 1024),
    reportingIntervalDays: integer(settings.reportingIntervalDays, integer(Number(process.env.REPORTING_INTERVAL_DAYS), 15, 1, 90), 1, 90),
    initialReportingDate: typeof settings.initialReportingDate === "string" ? settings.initialReportingDate : process.env.INITIAL_REPORTING_DATE ?? "",
    reminderEmailsEnabled: settings.reminderEmailsEnabled !== false,
  };
}

export function isInstitutionalEmail(email: string, allowedDomains: string[]) {
  const domain = email.trim().toLowerCase().split("@").at(-1);
  return Boolean(domain && allowedDomains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`)));
}
