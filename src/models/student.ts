import "server-only";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const studentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  fullName: { type: String, required: true, trim: true, maxlength: 160 },
  rollNumber: { type: String, required: true, trim: true, uppercase: true, unique: true, maxlength: 40 },
  registrationNumber: { type: String, trim: true, uppercase: true, sparse: true, unique: true, maxlength: 60 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
  department: { type: String, required: true, trim: true, maxlength: 100, index: true },
  semester: { type: Number, required: true, min: 1, max: 12, index: true },
  academicYear: { type: String, trim: true, maxlength: 20, default: null },
  cgpa: { type: Number, min: 0, max: 10, default: null },
  contactNumber: { type: String, trim: true, maxlength: 24 },
  companyName: { type: String, trim: true, maxlength: 160, default: "" },
  projectTitle: { type: String, trim: true, maxlength: 200, default: "" },
  evaluationGrade: { type: String, trim: true, maxlength: 40, default: "Under Evaluation" },
  attendancePercentage: { type: String, trim: true, maxlength: 20, default: "100%" },
  certificateStatus: { type: String, enum: ["NOT_ISSUED", "UNDER_REVIEW", "ISSUED", "VERIFIED"], default: "UNDER_REVIEW" },
  certificateUrl: { type: String, trim: true, default: "" },
  evaluationRemarks: { type: String, trim: true, maxlength: 500, default: "" },
  status: { type: String, enum: ["ACTIVE", "INACTIVE", "GRADUATED"], default: "ACTIVE", index: true },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true, collection: "students" });

studentSchema.index({ department: 1, semester: 1, status: 1 });
studentSchema.index({ fullName: 1 });
export type StudentRecord = InferSchemaType<typeof studentSchema>;
export const Student = (models.Student as Model<StudentRecord> | undefined) ?? model<StudentRecord>("Student", studentSchema);
