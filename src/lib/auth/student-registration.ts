import "server-only";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectMongo } from "@/lib/db/mongoose";
import { getPortalSettings, isInstitutionalEmail } from "@/lib/config/system-settings";
import { studentEmailSchema } from "@/lib/auth/validation";
import { User } from "@/models/user";
import { Student } from "@/models/student";
import { AuditLog } from "@/models/audit-log";

const registrationSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  rollNumber: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  email: studentEmailSchema,
  department: z.string().trim().min(1).max(100),
  semester: z.coerce.number().int().min(1).max(12),
  password: z.string().min(12).max(72),
});

export type StudentRegistrationInput = z.infer<typeof registrationSchema>;

export function parseStudentRegistration(input: unknown) {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Check the registration details and try again." };
  if (Buffer.byteLength(parsed.data.password, "utf8") > 72) return { success: false as const, error: "Password must be 72 bytes or fewer." };
  return { success: true as const, data: parsed.data };
}

export async function createStudentAccount(input: StudentRegistrationInput) {
  await connectMongo();
  const settings = await getPortalSettings();
  if (!settings.institutionalEmailDomains.length) throw new Error("Student registration is not configured yet.");
  if (!isInstitutionalEmail(input.email, settings.institutionalEmailDomains)) throw new Error("Use an email address ending in @gndec.ac.in.");

  const session = await mongoose.startSession();
  let userId = "";
  let studentId = "";
  try {
    await session.withTransaction(async () => {
      const passwordHash = await bcrypt.hash(input.password, 12);
      const [user] = await User.create([{
        identifier: input.rollNumber.toLowerCase(),
        passwordHash,
        role: "STUDENT",
        status: "PENDING_SETUP",
        mustChangePassword: false,
        passwordSetAt: new Date(),
      }], { session });
      const [student] = await Student.create([{
        user: user._id,
        fullName: input.fullName,
        rollNumber: input.rollNumber,
        email: input.email,
        department: input.department,
        semester: input.semester,
        status: "INACTIVE",
      }], { session });
      await User.updateOne({ _id: user._id }, { $set: { student: student._id } }, { session });
      await AuditLog.create([{
        actor: null,
        action: "STUDENT_SELF_REGISTERED",
        entityType: "student",
        entityId: student._id,
        occurredAt: new Date(),
        metadata: { verificationRequired: true },
      }], { session });
      userId = user._id.toString();
      studentId = student._id.toString();
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return { created: false as const };
    throw error;
  } finally {
    await session.endSession();
  }
  return { created: true as const, userId, studentId };
}

