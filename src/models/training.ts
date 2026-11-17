import "server-only";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const trainingSchema = new Schema({
  code: { type: String, required: true, uppercase: true, trim: true, unique: true, enum: ["TR-101", "TR-102", "TR-103", "TR-104"] },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: "", trim: true, maxlength: 2000 },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  reportingFrequencyDays: { type: Number, required: true, default: 15, min: 1, max: 366 },
  status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "INACTIVE", index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, collection: "trainings" });

trainingSchema.pre("validate", function () {
  if (this.startDate && this.endDate && this.startDate > this.endDate) this.invalidate("endDate", "End date must be on or after start date.");
});
export type TrainingRecord = InferSchemaType<typeof trainingSchema>;
export const Training = (models.Training as Model<TrainingRecord> | undefined) ?? model<TrainingRecord>("Training", trainingSchema);
