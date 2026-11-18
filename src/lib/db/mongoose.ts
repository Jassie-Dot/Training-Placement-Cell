import "server-only";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri && process.env.NODE_ENV !== "test") {
  // Defer the error to connectMongo so public pages can render without a database.
}

type MongooseCache = { connection: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalWithMongoose = globalThis as typeof globalThis & { mongooseCache?: MongooseCache };
const cache = globalWithMongoose.mongooseCache ?? { connection: null, promise: null };
globalWithMongoose.mongooseCache = cache;

export async function connectMongo() {
  if (cache.connection) return cache.connection;
  if (!uri) throw new Error("MONGODB_URI is required for this operation.");

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: process.env.NODE_ENV === "production" ? 20 : 10,
      minPoolSize: 0,
      autoIndex: process.env.NODE_ENV !== "production",
    });
  }
  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    cache.connection = null;
    const msg = error instanceof Error ? error.message : String(error);
    console.error("MongoDB connection failed:", msg);
    if (msg.includes("ETIMEDOUT") || msg.includes("timed out") || msg.includes("ServerSelection") || msg.includes("ENOTFOUND")) {
      throw new Error("Unable to connect to MongoDB. Please ensure MongoDB Atlas Network Access allows connections from anywhere (0.0.0.0/0) for Vercel deployments.", { cause: error });
    }
    throw new Error(`Unable to connect to MongoDB: ${msg}`, { cause: error });
  }
}
