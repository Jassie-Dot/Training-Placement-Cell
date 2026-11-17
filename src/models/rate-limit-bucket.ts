import "server-only";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const rateLimitBucketSchema = new Schema({
  _id: { type: String, required: true },
  windowStart: { type: Date, required: true },
  count: { type: Number, required: true, min: 0 },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, collection: "rateLimitBuckets", versionKey: false });

rateLimitBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export type RateLimitBucketRecord = InferSchemaType<typeof rateLimitBucketSchema>;
export const RateLimitBucket = (models.RateLimitBucket as Model<RateLimitBucketRecord> | undefined) ?? model<RateLimitBucketRecord>("RateLimitBucket", rateLimitBucketSchema);
