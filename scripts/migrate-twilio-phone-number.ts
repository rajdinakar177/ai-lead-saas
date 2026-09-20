import mongoose from "mongoose";

async function migrate() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  await mongoose.connect(mongoUri);

  console.log("MongoDB connected");

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB database not available.");
  }

  const result = await db.collection("businesses").updateMany(
    {
      twilioPhoneNumber: {
        $exists: false,
      },
    },
    {
      $set: {
        twilioPhoneNumber: null,
      },
    },
  );

  console.log("Migration completed:", {
    matched: result.matchedCount,

    modified: result.modifiedCount,
  });

  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error("Migration failed:", error);

  await mongoose.disconnect();

  process.exit(1);
});
