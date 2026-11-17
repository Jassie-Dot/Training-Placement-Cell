import "server-only";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const enrollmentSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  training: { type: Schema.Types.ObjectId, ref: "Training", required: true },
  status: { type: String, enum: ["ACTIVE", "COMPLETED", "WITHDRAWN"], default: "ACTIVE", index: true },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  assignmentHistory: { type: [{ action: { type: String, enum: ["ASSIGNED", "ACTIVATED", "WITHDRAWN", "COMPLETED"], required: true }, actor: { type: Schema.Types.ObjectId, ref: "User", required: true }, occurredAt: { type: Date, required: true }, note: { type: String, maxlength: 500, default: "" } }], default: [] },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: "enrollments" });

enrollmentSchema.index({ student: 1, training: 1 }, { unique: true });
enrollmentSchema.index({ training: 1, status: 1 });
enrollmentSchema.index({ student: 1, status: 1 });
export type EnrollmentRecord = InferSchemaType<typeof enrollmentSchema>;
export const Enrollment = (models.Enrollment as Model<EnrollmentRecord> | undefined) ?? model<EnrollmentRecord>("Enrollment", enrollmentSchema);
