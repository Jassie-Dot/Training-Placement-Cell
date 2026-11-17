import "server-only";
import { Resend } from "resend";
import { otpEmailTemplate } from "@/lib/email/templates";

export async function sendOtpEmail(to: string, name: string, otp: string, role: "student" | "faculty", expiresSeconds: number) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Email delivery is not configured.");
  const resend = new Resend(apiKey);
  const template = otpEmailTemplate({ name, otp, role, expiresMinutes: Math.ceil(expiresSeconds / 60) });
  const { data, error } = await resend.emails.send({ from, to, subject: template.subject, html: template.html, text: template.text });
  if (error) throw new Error(`Resend delivery failed (${error.name ?? "provider error"}).`);
  return data?.id ?? null;
}

export async function sendNotificationEmail(to: string, subject: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY; const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Email delivery is not configured.");
  const escaped = message.replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" })[char] ?? char);
  const { data, error } = await new Resend(apiKey).emails.send({ from, to, subject, html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:28px;color:#18324f"><h2>GNDEC Training &amp; Placement</h2><p>${escaped}</p><p>Sign in to the portal to view details.</p></div>`, text: `${message}\n\nSign in to the portal to view details.` });
  if (error) throw new Error(`Resend delivery failed (${error.name ?? "provider error"}).`);
  return data?.id ?? null;
}
