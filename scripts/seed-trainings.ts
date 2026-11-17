import "../src/models/training";
import { connectMongo } from "../src/lib/db/mongoose";
import { Training } from "../src/models/training";

async function main() {
  await connectMongo();
  const codes = ["TR-101", "TR-102", "TR-103", "TR-104"] as const;
  for (const code of codes) {
    await Training.updateOne({ code }, { $setOnInsert: { code, name: code, description: "", startDate: null, endDate: null, reportingFrequencyDays: 15, status: "INACTIVE" } }, { upsert: true, runValidators: true });
  }
  console.info("Training records verified. Existing descriptions, dates, and status were preserved.");
}

main().catch((error: unknown) => { console.error("Training configuration failed.", error); process.exitCode = 1; }).finally(async () => {
  const mongoose = await import("mongoose");
  await mongoose.default.disconnect();
});
