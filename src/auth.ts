import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectMongo } from "@/lib/db/mongoose";
import { credentialsSchema, studentEmailSchema, teacherEmailSchema } from "@/lib/auth/validation";
import { User } from "@/models/user";
import { Student } from "@/models/student";
import { Faculty } from "@/models/faculty";
import { normalizeClientIp, verifyOneTimeCode } from "@/lib/auth/otp";

const authSecret = process.env.AUTH_SECRET;
if (!authSecret) throw new Error("AUTH_SECRET must be configured before the authentication service starts.");

const credentialProvider = (id: "teacher" | "student", role: "TEACHER" | "STUDENT") => Credentials({
  id,
  name: id === "teacher" ? "Faculty credentials" : "Student credentials",
  credentials: { identifier: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
  async authorize(raw) {
    const parsed = credentialsSchema.safeParse(raw);
    if (!parsed.success) return null;
    const emailResult = (role === "STUDENT" ? studentEmailSchema : teacherEmailSchema).safeParse(parsed.data.identifier);
    if (!emailResult.success) return null;
    await connectMongo();
    const student = role === "STUDENT" ? await Student.findOne({ email: emailResult.data, status: "ACTIVE", deletedAt: null }).select("_id user").lean() : null;
    const user = role === "STUDENT"
      ? student ? await User.findOne({ _id: student.user, role, status: "ACTIVE", deletedAt: null }).select("+passwordHash").lean() : null
      : await User.findOne({ identifier: emailResult.data, role, status: "ACTIVE", deletedAt: null }).select("+passwordHash").lean();
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;

    let studentId: string | null = null;
    if (role === "STUDENT") {
      if (!student) return null;
      studentId = student._id.toString();
    } else {
      const faculty = await Faculty.findOne({ user: user._id, status: "ACTIVE", deletedAt: null }).select("_id").lean();
      if (!faculty) return null;
    }

    await User.updateOne({ _id: user._id, status: "ACTIVE" }, { $set: { lastLoginAt: new Date() } });
    return { id: user._id.toString(), role, studentId };
  },
});

const otpProvider = (id: "teacher-otp" | "student-otp", role: "TEACHER" | "STUDENT") => Credentials({
  id,
  name: id === "teacher-otp" ? "Faculty email code" : "Student email code",
  credentials: { identifier: { label: "Registered email", type: "email" }, otp: { label: "Six-digit code", type: "text" } },
  async authorize(raw, request) {
    const parsed = raw && typeof raw.identifier === "string" && typeof raw.otp === "string" ? { identifier: raw.identifier, otp: raw.otp } : null;
    if (!parsed) return null;
    return verifyOneTimeCode(role, parsed.identifier, parsed.otp, normalizeClientIp(request.headers));
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [credentialProvider("teacher", "TEACHER"), credentialProvider("student", "STUDENT"), otpProvider("teacher-otp", "TEACHER"), otpProvider("student-otp", "STUDENT")],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60, updateAge: 60 * 60 },
  pages: { signIn: "/student/login", error: "/student/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.studentId = user.studentId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.studentId = token.studentId ?? null;
      }
      return session;
    },
  },
  trustHost: process.env.NODE_ENV !== "production" || Boolean(process.env.AUTH_URL),
  secret: authSecret,
});
