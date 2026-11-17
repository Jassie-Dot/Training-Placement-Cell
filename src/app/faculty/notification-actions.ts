"use server";

import { revalidatePath } from "next/cache";
import { requireApiRole } from "@/lib/auth/access";
import { connectMongo } from "@/lib/db/mongoose";
import { Notification } from "@/models/notification";
import { Types } from "mongoose";

export async function markFacultyNotificationRead(id: string) {
  const principal = await requireApiRole("TEACHER");
  if (!Types.ObjectId.isValid(id)) return;
  await connectMongo();
  await Notification.updateOne({ _id: id, recipient: principal.userId, channel: "IN_APP", readAt: null }, { $set: { readAt: new Date() } });
  revalidatePath("/faculty", "layout");
  revalidatePath("/faculty/notifications");
}

export async function markAllFacultyNotificationsRead() {
  const principal = await requireApiRole("TEACHER");
  await connectMongo();
  await Notification.updateMany({ recipient: principal.userId, channel: "IN_APP", readAt: null }, { $set: { readAt: new Date() } });
  revalidatePath("/faculty", "layout");
  revalidatePath("/faculty/notifications");
}
