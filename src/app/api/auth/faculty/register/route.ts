import { NextRequest } from "next/server";
import { connectMongo } from "@/lib/db/mongoose";
import { User } from "@/models/user";
import { Faculty } from "@/models/faculty";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const facultyRegSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  password: z.string().min(6).max(72),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = facultyRegSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid details." }, { status: 400 });
    }

    await connectMongo();
    const email = parsed.data.email.toLowerCase();

    const existingUser = await User.findOne({ identifier: email, deletedAt: null });
    const existingFaculty = await Faculty.findOne({ email, deletedAt: null });
    if (existingUser || existingFaculty) {
      return Response.json({ error: "A faculty account with this email already exists." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({
      identifier: email,
      passwordHash,
      role: "TEACHER",
      status: "ACTIVE",
      mustChangePassword: false,
      passwordSetAt: new Date(),
    });

    const faculty = await Faculty.create({
      user: user._id,
      fullName: parsed.data.fullName,
      email,
      permissions: ["STUDENTS_READ", "STUDENTS_WRITE", "TRAININGS_MANAGE", "REPORTS_REVIEW", "ANALYTICS_READ", "EXPORT"],
      status: "ACTIVE",
    });

    await User.updateOne({ _id: user._id }, { $set: { faculty: faculty._id } });

    return Response.json({ message: "Faculty account registered successfully! You can now log in." }, { status: 201 });
  } catch (error) {
    console.error("Faculty registration error:", error);
    const message = error instanceof Error ? error.message : "Registration could not be completed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
