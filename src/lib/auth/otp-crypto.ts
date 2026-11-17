import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
function secret() { const value = process.env.AUTH_SECRET; if (!value || value.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters."); return value; }
export function createOtpCode() { return randomInt(0, 1_000_000).toString().padStart(6, "0"); }
export function hashOtp(userId: string, otp: string) { return createHmac("sha256", secret()).update(`${userId}:${otp}`).digest("hex"); }
export function timingSafeHashEqual(a: string, b: string) { const left = Buffer.from(a, "hex"); const right = Buffer.from(b, "hex"); return left.length === right.length && left.length > 0 && timingSafeEqual(left, right); }
export function hashRateKey(scope: string, value: string) { return createHmac("sha256", secret()).update(`${scope}:${value}`).digest("hex"); }
export function normalizeClientIp(headers: Headers) { const raw = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"; return raw.trim().slice(0, 64) || "unknown"; }
