import mongoose from "mongoose";

async function updateTwilioNumber() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!twilioPhoneNumber) {
    throw new Error("TWILIO_PHONE_NUMBER is not configured.");
  }

  await mongoose.connect(mongoUri);

  console.log("MongoDB connected");

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB database not available.");
  }

  /*
   * We currently have one test business.
   * Update that business with the Twilio
   * number from .env.local.
   */
  const business = await db.collection("businesses").findOne({});

  if (!business) {
    throw new Error("No business found.");
  }

  const result = await db.collection("businesses").updateOne(
    {
      _id: business._id,
    },
    {
      $set: {
        twilioPhoneNumber,
      },
    },
  );

  console.log("Twilio number updated:", {
    businessId: business._id.toString(),

    businessName: business.name,

    matched: result.matchedCount,

    modified: result.modifiedCount,

    twilioPhoneNumber,
  });

  await mongoose.disconnect();
}

updateTwilioNumber().catch(async (error) => {
  console.error("Update failed:", error);

  await mongoose.disconnect();

  process.exit(1);
});
