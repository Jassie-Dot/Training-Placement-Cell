import "server-only";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const reportingPeriodSchema = new Schema({
  training: { type: Schema.Types.ObjectId, ref: "Training", required: true },
  sequence: { type: Number, required: true, min: 1 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  extensionUntil: { type: Date, default: null },
  instructions: { type: String, default: "Upload a concise PDF progress report for this reporting period.", maxlength: 3000 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  closedAt: { type: Date, default: null },
  status: { type: String, enum: ["SCHEDULED", "OPEN", "CLOSED"], default: "SCHEDULED", index: true },
}, { timestamps: true, collection: "reportingPeriods" });

reportingPeriodSchema.index({ training: 1, sequence: 1 }, { unique: true });
reportingPeriodSchema.index({ dueDate: 1, status: 1 });
reportingPeriodSchema.pre("validate", function () {
  if (this.startDate > this.endDate) this.invalidate("endDate", "Period end must be on or after its start.");
  if (this.dueDate < this.startDate) this.invalidate("dueDate", "Due date must not precede the period start.");
});
export type ReportingPeriodRecord = InferSchemaType<typeof reportingPeriodSchema>;
export const ReportingPeriod = (models.ReportingPeriod as Model<ReportingPeriodRecord> | undefined) ?? model<ReportingPeriodRecord>("ReportingPeriod", reportingPeriodSchema);
