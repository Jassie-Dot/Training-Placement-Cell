import "server-only";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectMongo } from "@/lib/db/mongoose";
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
  password: z.string().min(6).max(72),
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

  const existingEmail = await Student.findOne({ email: input.email.toLowerCase(), deletedAt: null });
  if (existingEmail) return { created: false as const, error: "An account with this email already exists." };

  const existingRoll = await Student.findOne({ rollNumber: input.rollNumber.toUpperCase(), deletedAt: null });
  if (existingRoll) return { created: false as const, error: "An account with this roll number already exists." };

  const passwordHash = await bcrypt.hash(input.password, 12);
  let userId = "";
  let studentId = "";

  try {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const [user] = await User.create([{
          identifier: input.rollNumber.toLowerCase(),
          passwordHash,
          role: "STUDENT",
          status: "ACTIVE",
          mustChangePassword: false,
          passwordSetAt: new Date(),
        }], { session });

        const [student] = await Student.create([{
          user: user._id,
          fullName: input.fullName,
          rollNumber: input.rollNumber,
          email: input.email.toLowerCase(),
          department: input.department,
          semester: input.semester,
          status: "ACTIVE",
        }], { session });

        await User.updateOne({ _id: user._id }, { $set: { student: student._id } }, { session });
        await AuditLog.create([{
          actor: null,
          action: "STUDENT_SELF_REGISTERED",
          entityType: "student",
          entityId: student._id,
          occurredAt: new Date(),
          metadata: { verificationRequired: false },
        }], { session });

        userId = user._id.toString();
        studentId = student._id.toString();
      });
    } finally {
      await session.endSession();
    }
  } catch {
    // Non-transactional fallback if replica set is unavailable
    const user = await User.create({
      identifier: input.rollNumber.toLowerCase(),
      passwordHash,
      role: "STUDENT",
      status: "ACTIVE",
      mustChangePassword: false,
      passwordSetAt: new Date(),
    });

    const student = await Student.create({
      user: user._id,
      fullName: input.fullName,
      rollNumber: input.rollNumber,
      email: input.email.toLowerCase(),
      department: input.department,
      semester: input.semester,
      status: "ACTIVE",
    });

    await User.updateOne({ _id: user._id }, { $set: { student: student._id } });
    await AuditLog.create({
      actor: null,
      action: "STUDENT_SELF_REGISTERED",
      entityType: "student",
      entityId: student._id,
      occurredAt: new Date(),
      metadata: { verificationRequired: false },
    });

    userId = user._id.toString();
    studentId = student._id.toString();
  }

  return { created: true as const, userId, studentId };
}
