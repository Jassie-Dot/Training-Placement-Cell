import "server-only";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const facultySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  fullName: { type: String, required: true, trim: true, maxlength: 160 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
  permissions: { type: [String], enum: ["STUDENTS_READ", "STUDENTS_WRITE", "TRAININGS_MANAGE", "REPORTS_REVIEW", "ANALYTICS_READ", "EXPORT"], default: [] },
  trainingCodes: { type: [String], enum: ["TR-101", "TR-102", "TR-103", "TR-104"], default: [] },
  status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE", index: true },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true, collection: "faculty" });

export type FacultyRecord = InferSchemaType<typeof facultySchema>;
export const Faculty = (models.Faculty as Model<FacultyRecord> | undefined) ?? model<FacultyRecord>("Faculty", facultySchema);
