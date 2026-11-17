import "server-only";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const systemSettingSchema = new Schema({
  key: { type: String, required: true, unique: true, maxlength: 100 },
  value: { type: Schema.Types.Mixed, required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, collection: "systemSettings" });

export type SystemSettingRecord = InferSchemaType<typeof systemSettingSchema>;
export const SystemSetting = (models.SystemSetting as Model<SystemSettingRecord> | undefined) ?? model<SystemSettingRecord>("SystemSetting", systemSettingSchema);
