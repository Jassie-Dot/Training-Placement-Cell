import "server-only";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const revisionSchema = new Schema({
  version: { type: Number, required: true, min: 1 },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, default: "", maxlength: 5000 },
  storageKey: { type: String, required: true, maxlength: 512 },
  originalFilename: { type: String, required: true, maxlength: 255 },
  contentType: { type: String, required: true, enum: ["application/pdf"] },
  sizeBytes: { type: Number, required: true, min: 1 },
  submittedAt: { type: Date, required: true },
}, { _id: false });
const reviewSchema = new Schema({
  reviewer: { type: Schema.Types.ObjectId, ref: "User", required: true },
  decision: { type: String, enum: ["UNDER_REVIEW", "APPROVED", "REJECTED", "RESUBMISSION_REQUESTED"], required: true },
  previousStatus: { type: String, enum: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "RESUBMISSION_REQUIRED"] },
  newStatus: { type: String, enum: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "RESUBMISSION_REQUIRED"] },
  version: { type: Number, min: 1 },
  remarks: { type: String, default: "", maxlength: 3000 },
  reviewedAt: { type: Date, required: true },
}, { _id: false });
const reportSchema = new Schema({
  enrollment: { type: Schema.Types.ObjectId, ref: "Enrollment", required: true },
  reportingPeriod: { type: Schema.Types.ObjectId, ref: "ReportingPeriod", required: true },
  status: { type: String, enum: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "RESUBMISSION_REQUIRED"], required: true, default: "SUBMITTED", index: true },
  revisions: { type: [revisionSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
  reviews: { type: [reviewSchema], default: [] },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: "reports" });

reportSchema.index({ enrollment: 1, reportingPeriod: 1 }, { unique: true });
reportSchema.index({ reportingPeriod: 1, status: 1 });
reportSchema.index({ enrollment: 1, status: 1 });
export type ReportRecord = InferSchemaType<typeof reportSchema>;
export const Report = (models.Report as Model<ReportRecord> | undefined) ?? model<ReportRecord>("Report", reportSchema);
