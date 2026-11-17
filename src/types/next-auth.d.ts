import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: "TEACHER" | "STUDENT";
    studentId: string | null;
  }
  interface Session {
    user: {
      id: string;
      role: "TEACHER" | "STUDENT";
      studentId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: "TEACHER" | "STUDENT";
    studentId?: string | null;
  }
}
