import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectMongo } from "@/lib/db/mongoose";
import { credentialsSchema } from "@/lib/auth/validation";
import { User } from "@/models/user";
import { Student } from "@/models/student";
import { Faculty } from "@/models/faculty";
import { normalizeClientIp, verifyOneTimeCode } from "@/lib/auth/otp";

const authSecret = process.env.AUTH_SECRET;

const credentialProvider = (id: "teacher" | "student", role: "TEACHER" | "STUDENT") => Credentials({
  id,
  name: id === "teacher" ? "Faculty credentials" : "Student credentials",
  credentials: { identifier: { label: "Email or Roll Number", type: "text" }, password: { label: "Password", type: "password" } },
  async authorize(raw) {
    const parsed = credentialsSchema.safeParse(raw);
    if (!parsed.success) return null;
    await connectMongo();

    const idInput = parsed.data.identifier.trim();

    if (role === "STUDENT") {
      const student = await Student.findOne({
        $or: [
          { email: idInput.toLowerCase() },
          { rollNumber: idInput.toUpperCase() },
        ],
        deletedAt: null,
      }).select("_id user status").lean();

      let user = null;
      if (student) {
        user = await User.findOne({ _id: student.user, role: "STUDENT", deletedAt: null }).select("+passwordHash status").lean();
      } else {
        user = await User.findOne({ identifier: idInput.toLowerCase(), role: "STUDENT", deletedAt: null }).select("+passwordHash status student").lean();
      }

      if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;

      const activeStudent = student ?? (user.student ? await Student.findById(user.student).select("_id status").lean() : null);
      if (!activeStudent) return null;

      if (user.status !== "ACTIVE" || activeStudent.status !== "ACTIVE") {
        await User.updateOne({ _id: user._id }, { $set: { status: "ACTIVE" } });
        await Student.updateOne({ _id: activeStudent._id }, { $set: { status: "ACTIVE" } });
      }

      await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
      return { id: user._id.toString(), role, studentId: activeStudent._id.toString() };
    } else {
      const email = idInput.toLowerCase();
      let user = await User.findOne({ identifier: email, role: "TEACHER", deletedAt: null }).select("+passwordHash status faculty").lean();

      if (!user) {
        const fac = await Faculty.findOne({ email, deletedAt: null }).select("user").lean();
        if (fac) user = await User.findOne({ _id: fac.user, role: "TEACHER", deletedAt: null }).select("+passwordHash status faculty").lean();
      }

      if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;

      const faculty = await Faculty.findOne({ $or: [{ user: user._id }, { email }], deletedAt: null }).select("_id status").lean();
      if (!faculty) return null;

      if (user.status !== "ACTIVE" || faculty.status !== "ACTIVE") {
        await User.updateOne({ _id: user._id }, { $set: { status: "ACTIVE" } });
        await Faculty.updateOne({ _id: faculty._id }, { $set: { status: "ACTIVE" } });
      }

      await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
      return { id: user._id.toString(), role, studentId: null };
    }
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
  trustHost: process.env.NODE_ENV !== "production" || process.env.VERCEL === "1" || process.env.AUTH_TRUST_HOST === "true" || Boolean(process.env.AUTH_URL),
  secret: authSecret,
});
