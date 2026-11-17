import { NextRequest } from "next/server";
import { createStudentAccount, parseStudentRegistration } from "@/lib/auth/student-registration";
import { consumeAuthRateLimit, normalizeClientIp, requestOneTimeCode } from "@/lib/auth/otp";

export const dynamic = "force-dynamic";

const GENERIC_RESPONSE = "If registration is eligible, a verification code will be sent to the GNDEC email address. Existing students can sign in instead.";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expectedOrigin = process.env.APP_BASE_URL ? new URL(process.env.APP_BASE_URL).origin : request.nextUrl.origin;
  if (!origin || origin !== expectedOrigin) return Response.json({ error: "Request could not be completed." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return Response.json({ error: "Request could not be completed." }, { status: 415, headers: { "Cache-Control": "no-store" } });
  try {
    const ip = normalizeClientIp(request.headers);
    if (!(await consumeAuthRateLimit("student-registration-ip", ip, 5, 60 * 60_000))) {
      return Response.json({ error: "Too many registration attempts. Please try again later." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "3600" } });
    }
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 16_384) return Response.json({ error: "Registration details are too large." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    let raw: unknown;
    try { raw = JSON.parse(body); }
    catch { return Response.json({ error: "Registration details are invalid." }, { status: 400, headers: { "Cache-Control": "no-store" } }); }
    const parsed = parseStudentRegistration(raw);
    if (!parsed.success) return Response.json({ error: parsed.error }, { status: 400, headers: { "Cache-Control": "no-store" } });
    await createStudentAccount(parsed.data);
    // Also resend for an existing eligible account so users can recover from
    // a registration attempt where the account was created but delivery failed.
    await requestOneTimeCode("STUDENT", parsed.data.email, ip);
    return Response.json({ message: GENERIC_RESPONSE }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const errorCode = error instanceof Error ? error.name : "RegistrationError";
    console.error("Student registration could not be completed.", errorCode);
    if (error instanceof Error && (error.message.includes("configured") || error.message.includes("domain"))) {
      return Response.json({ error: error.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ error: "Registration is temporarily unavailable. Please try again later." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  }
}
