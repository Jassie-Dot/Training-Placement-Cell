import { z } from "zod";

export const credentialsSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});
export const normalizedEmailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
export const studentEmailSchema = normalizedEmailSchema;
export const teacherEmailSchema = normalizedEmailSchema;
export function isGndecEmail(value: string) { return value.trim().toLowerCase().endsWith("@gndec.ac.in"); }
export const rollNumberSchema = z.string().trim().min(1).max(40).transform((value) => value.toUpperCase());
