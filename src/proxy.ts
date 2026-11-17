import { auth } from "@/auth";

// This is a UX redirect only. Protected pages, actions, and data services still
// call requireRole/requireApiRole and revalidate the account against MongoDB.
export default auth((request) => {
  const path = request.nextUrl.pathname;
  const requiredRole = path.startsWith("/faculty") ? "TEACHER" : path.startsWith("/student") ? "STUDENT" : null;
  const isPublicAuthPage = path === "/faculty/login" || path === "/faculty/register" || path === "/student/login" || path === "/student/register";
  if (!requiredRole || isPublicAuthPage) return;
  const role = request.auth?.user?.role;
  if (role !== requiredRole) {
    const target = role === "TEACHER" ? "/faculty/dashboard" : role === "STUDENT" ? "/student/dashboard" : requiredRole === "TEACHER" ? "/faculty/login" : "/student/login";
    return Response.redirect(new URL(target, request.nextUrl));
  }
});

export const config = { matcher: ["/faculty/:path*", "/student/:path*"] };
