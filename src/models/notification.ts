import "server-only";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const notificationSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  channel: { type: String, enum: ["IN_APP", "EMAIL"], required: true },
  type: { type: String, required: true, maxlength: 80 },
  title: { type: String, required: true, maxlength: 180 },
  body: { type: String, required: true, maxlength: 3000 },
  idempotencyKey: { type: String, required: true, unique: true, maxlength: 200 },
  readAt: { type: Date, default: null },
  sentAt: { type: Date, default: null },
  deliveryStatus: { type: String, enum: ["QUEUED", "SENT", "FAILED", "SKIPPED"], default: null },
  deliveredAt: { type: Date, default: null },
  providerMessageId: { type: String, default: null, maxlength: 200 },
  deliveryAttempts: { type: Number, default: 0, min: 0 },
  deliveryLeaseUntil: { type: Date, default: null },
  lastDeliveryErrorCode: { type: String, default: null, maxlength: 100 },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, collection: "notifications" });

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
export type NotificationRecord = InferSchemaType<typeof notificationSchema>;
export const Notification = (models.Notification as Model<NotificationRecord> | undefined) ?? model<NotificationRecord>("Notification", notificationSchema);
