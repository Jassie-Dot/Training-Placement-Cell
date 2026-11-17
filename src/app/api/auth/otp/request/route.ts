import { NextRequest } from "next/server";
import { requestOneTimeCode, normalizeClientIp, OTP_GENERIC_RESPONSE } from "@/lib/auth/otp";
import { z } from "zod";
import { getPortalSettings } from "@/lib/config/system-settings";

export const dynamic = "force-dynamic";
const requestSchema = z.object({ role: z.enum(["TEACHER", "STUDENT"]), identifier: z.string().trim().min(1).max(254) });

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  // Use the current host for same-origin protection; APP_BASE_URL can be stale
  // on Vercel preview deployments and should not block legitimate login flows.
  if (!origin || origin !== request.nextUrl.origin) return Response.json({ error: "Request could not be completed." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return Response.json({ error: "Request could not be completed." }, { status: 415 });
  try {
    const raw = await request.json();
    const parsed = requestSchema.safeParse(raw);
    if (parsed.success) await requestOneTimeCode(parsed.data.role, parsed.data.identifier, normalizeClientIp(request.headers));
    const cooldown = (await getPortalSettings()).otpResendCooldownSeconds;
    return Response.json({ message: OTP_GENERIC_RESPONSE, retryAfterSeconds: cooldown }, { status: 202, headers: { "Cache-Control": "no-store", "Retry-After": String(cooldown) } });
  } catch (error) {
    const errorCode = error instanceof Error ? error.name : "RequestError";
    console.error("OTP request could not be processed.", errorCode);
    return Response.json({ error: "Verification is temporarily unavailable. Please try again later." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  }
}
