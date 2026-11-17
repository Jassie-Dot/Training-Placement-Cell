import "../src/models/user";
import "../src/models/student";
import "../src/models/faculty";
import "../src/models/training";
import "../src/models/enrollment";
import "../src/models/reporting-period";
import "../src/models/report";
import "../src/models/notification";
import "../src/models/audit-log";
import "../src/models/otp-challenge";
import "../src/models/rate-limit-bucket";
import "../src/models/system-setting";
import { connectMongo } from "../src/lib/db/mongoose";
import { User } from "../src/models/user";
import { Student } from "../src/models/student";
import { Faculty } from "../src/models/faculty";
import { Training } from "../src/models/training";
import { Enrollment } from "../src/models/enrollment";
import { ReportingPeriod } from "../src/models/reporting-period";
import { Report } from "../src/models/report";
import { Notification } from "../src/models/notification";
import { AuditLog } from "../src/models/audit-log";
import { OtpChallenge } from "../src/models/otp-challenge";
import { RateLimitBucket } from "../src/models/rate-limit-bucket";
import { SystemSetting } from "../src/models/system-setting";
import mongoose from "mongoose";

async function main() {
  await connectMongo();
  const studentIndexes = await Student.collection.indexes().catch(() => []);
  const legacyEmailIndex = studentIndexes.find((index) => index.key.email === 1 && Object.keys(index.key).length === 1 && index.unique !== true);
  if (legacyEmailIndex?.name) {
    await Student.collection.dropIndex(legacyEmailIndex.name);
    console.info("Replaced the legacy non-unique student email index; unique email index will be created next.");
  }
  for (const collection of [User, Student, Faculty, Training, Enrollment, ReportingPeriod, Report, Notification, AuditLog, OtpChallenge, RateLimitBucket, SystemSetting]) {
    await collection.createIndexes();
    console.info(`Indexes ready: ${collection.collection.collectionName}`);
  }
}

main().catch((error: unknown) => { console.error("Index synchronization failed. Resolve duplicate data before retrying.", error); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
