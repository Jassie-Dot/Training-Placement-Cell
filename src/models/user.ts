import "server-only";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema({
  identifier: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true, maxlength: 120 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["TEACHER", "STUDENT"], required: true, index: true },
  status: { type: String, enum: ["ACTIVE", "DISABLED", "PENDING_SETUP"], default: "PENDING_SETUP", required: true, index: true },
  student: { type: Schema.Types.ObjectId, ref: "Student", default: null },
  faculty: { type: Schema.Types.ObjectId, ref: "Faculty", default: null },
  passwordSetAt: { type: Date, default: null },
  mustChangePassword: { type: Boolean, default: true },
  passwordResetTokenHash: { type: String, select: false, default: null },
  passwordResetExpiresAt: { type: Date, select: false, default: null },
  lastLoginAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true, collection: "users" });

userSchema.index({ role: 1, status: 1 });
export type UserRecord = InferSchemaType<typeof userSchema>;
export const User = (models.User as Model<UserRecord> | undefined) ?? model<UserRecord>("User", userSchema);
