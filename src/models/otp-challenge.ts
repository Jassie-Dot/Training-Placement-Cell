import "server-only";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const otpChallengeSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  role: { type: String, enum: ["TEACHER", "STUDENT"], required: true },
  codeHash: { type: String, required: true, select: false },
  attempts: { type: Number, default: 0, min: 0, max: 5 },
  requestedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 86400 } },
  consumedAt: { type: Date, default: null },
  deliveryFailedAt: { type: Date, default: null },
}, { timestamps: true, collection: "otpChallenges" });

otpChallengeSchema.index({ user: 1, consumedAt: 1, expiresAt: 1 });
export type OtpChallengeRecord = InferSchemaType<typeof otpChallengeSchema>;
export const OtpChallenge = (models.OtpChallenge as Model<OtpChallengeRecord> | undefined) ?? model<OtpChallengeRecord>("OtpChallenge", otpChallengeSchema);
