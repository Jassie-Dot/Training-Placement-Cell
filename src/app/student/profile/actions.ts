"use server";
import { requireRole } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { Student } from "@/models/student";
import { AuditLog } from "@/models/audit-log";
import mongoose, { Types } from "mongoose";
export async function updateContactAction(form: FormData) {
  const principal = await requireRole("STUDENT"); const contactNumber = String(form.get("contactNumber") ?? "").trim();
  if (contactNumber.length > 24 || (contactNumber && !/^[+\d\s().-]{7,24}$/.test(contactNumber))) throw new Error("Enter a valid contact number.");
  await connectMongo(); const session = await mongoose.startSession();
  try { await session.withTransaction(async () => {
    const result = await Student.updateOne({ _id: principal.studentId, user: principal.userId, status: "ACTIVE", deletedAt: null }, { $set: { contactNumber: contactNumber || null } }, { runValidators: true, session });
    if (result.matchedCount !== 1) throw new Error("Student profile not found.");
    await AuditLog.create([{ actor: new Types.ObjectId(principal.userId), action: "STUDENT_CONTACT_UPDATED", entityType: "student", entityId: new Types.ObjectId(principal.studentId!), occurredAt: new Date(), metadata: { changedFields: ["contactNumber"] } }], { session });
  }); } finally { await session.endSession(); }
}
