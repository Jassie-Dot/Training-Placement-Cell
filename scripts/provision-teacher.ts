import "../src/models/user";
import "../src/models/faculty";
import { connectMongo } from "../src/lib/db/mongoose";
import { teacherEmailSchema } from "../src/lib/auth/validation";
import { User } from "../src/models/user";
import { Faculty } from "../src/models/faculty";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

async function main() {
  const emailResult = teacherEmailSchema.safeParse(process.env.TEACHER_EMAIL);
  const fullName = process.env.TEACHER_NAME?.trim();
  const password = process.env.TEACHER_INITIAL_PASSWORD;
  if (!emailResult.success || !fullName || fullName.length > 160 || !password || password.length < 12 || password.length > 200) {
    throw new Error("Set valid TEACHER_EMAIL, TEACHER_NAME, and TEACHER_INITIAL_PASSWORD (12–200 characters) in the process environment.");
  }
  const email = emailResult.data;
  await connectMongo();
  if (await User.exists({ identifier: email })) throw new Error("An account with this email already exists; provisioning never overwrites accounts.");

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const [user] = await User.create([{ identifier: email, passwordHash: await bcrypt.hash(password, 12), role: "TEACHER", status: "ACTIVE", passwordSetAt: new Date(), mustChangePassword: false }], { session });
      const [faculty] = await Faculty.create([{ user: user._id, fullName, email, permissions: ["STUDENTS_READ", "STUDENTS_WRITE", "TRAININGS_MANAGE", "REPORTS_REVIEW", "ANALYTICS_READ", "EXPORT"] }], { session });
      await User.updateOne({ _id: user._id }, { $set: { faculty: faculty._id } }, { session });
    });
  } finally { await session.endSession(); }
  console.info(`Faculty account provisioned for ${email}. Deliver the initial password through an approved secure channel.`);
}

main().catch((error: unknown) => { console.error("Faculty provisioning failed.", error); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
