import "server-only";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const auditLogSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
  action: { type: String, required: true, maxlength: 100 },
  entityType: { type: String, required: true, maxlength: 80 },
  entityId: { type: Schema.Types.ObjectId, default: null },
  metadata: { type: Schema.Types.Mixed, default: {} },
  occurredAt: { type: Date, required: true, default: Date.now, index: true },
}, { timestamps: true, collection: "auditLogs" });

auditLogSchema.index({ entityType: 1, entityId: 1, occurredAt: -1 });
auditLogSchema.index({ actor: 1, occurredAt: -1 });
export type AuditLogRecord = InferSchemaType<typeof auditLogSchema>;
export const AuditLog = (models.AuditLog as Model<AuditLogRecord> | undefined) ?? model<AuditLogRecord>("AuditLog", auditLogSchema);
