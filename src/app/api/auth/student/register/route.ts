import { NextRequest } from "next/server";
import { createStudentAccount, parseStudentRegistration } from "@/lib/auth/student-registration";
import { consumeAuthRateLimit, normalizeClientIp, requestOneTimeCode } from "@/lib/auth/otp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.nextUrl.host) {
        return Response.json({ error: "Request could not be completed." }, { status: 403, headers: { "Cache-Control": "no-store" } });
      }
    } catch {
      // Ignore origin parse error
    }
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return Response.json({ error: "Request could not be completed." }, { status: 415, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const ip = normalizeClientIp(request.headers);
    await consumeAuthRateLimit("student-registration-ip", ip, 20, 60 * 60_000);

    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 16_384) {
      return Response.json({ error: "Registration details are too large." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }

    let raw: unknown;
    try { raw = JSON.parse(body); }
    catch { return Response.json({ error: "Registration details are invalid." }, { status: 400, headers: { "Cache-Control": "no-store" } }); }

    const parsed = parseStudentRegistration(raw);
    if (!parsed.success) {
      return Response.json({ error: parsed.error }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const result = await createStudentAccount(parsed.data);
    if (!result.created && "error" in result) {
      return Response.json({ error: result.error }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    try {
      await requestOneTimeCode("STUDENT", parsed.data.email, ip);
    } catch {
      // Email delivery error ignored
    }

    return Response.json({ message: "Registration successful! You can now sign in with your email or roll number." }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Student registration error:", error);
    const message = error instanceof Error ? error.message : "Registration could not be completed.";
    return Response.json({ error: message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
