import "server-only";
import { otpEmailTemplate } from "@/lib/email/templates";

type BrevoMessage = { messageId?: unknown };

async function sendTransactionalEmail({ to, subject, htmlContent, textContent }: { to: string; subject: string; htmlContent: string; textContent: string }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM;
  const senderName = process.env.EMAIL_FROM_NAME?.trim() || "GNDEC Training & Placement";
  if (!apiKey || !senderEmail) throw new Error("Email delivery is not configured.");

  let response: Response;
  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "accept": "application/json", "api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent,
        textContent,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    throw new Error("Brevo email delivery could not be reached.");
  }

  if (!response.ok) throw new Error(`Brevo email delivery failed (HTTP ${response.status}).`);
  const result = await response.json().catch((): BrevoMessage => ({})) as BrevoMessage;
  return typeof result.messageId === "string" ? result.messageId : null;
}

export async function sendOtpEmail(to: string, name: string, otp: string, role: "student" | "faculty", expiresSeconds: number) {
  const template = otpEmailTemplate({ name, otp, role, expiresMinutes: Math.ceil(expiresSeconds / 60) });
  return sendTransactionalEmail({ to, subject: template.subject, htmlContent: template.html, textContent: template.text });
}

export async function sendNotificationEmail(to: string, subject: string, message: string) {
  const escaped = message.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
  return sendTransactionalEmail({
    to,
    subject,
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:28px;color:#18324f"><h2>GNDEC Training &amp; Placement</h2><p>${escaped}</p><p>Sign in to the portal to view details.</p></div>`,
    textContent: `${message}\n\nSign in to the portal to view details.`,
  });
}
