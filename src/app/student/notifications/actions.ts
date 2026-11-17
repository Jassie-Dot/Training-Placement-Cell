"use server";
import { requireRole } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { Notification } from "@/models/notification";
import { Types } from "mongoose";
export async function markStudentNotificationRead(form: FormData) { const principal = await requireRole("STUDENT"); const id = String(form.get("id") ?? ""); if (!Types.ObjectId.isValid(id)) return; await connectMongo(); await Notification.updateOne({ _id: id, recipient: principal.userId, readAt: null }, { $set: { readAt: new Date() } }); }
