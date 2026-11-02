import mongoose from "mongoose";
import dns from "node:dns";

// Force Node.js to use Google DNS and prefer IPv4
// Fixes SRV lookup failures on restricted networks
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");

const ensureMongoUri = (uri) => {
  if (!uri || typeof uri !== "string" || !uri.trim()) {
    throw new Error(
      'Missing DB_URI. Set DB_URI in your environment to a valid connection string starting with "mongodb://" or "mongodb+srv://".',
    );
  }

  const trimmed = uri.trim();
  if (!/^mongodb(?:\+srv)?:\/\//.test(trimmed)) {
    throw new Error(
      `Invalid DB_URI scheme. Expected connection string to start with "mongodb://" or "mongodb+srv://". Received: ${trimmed}`,
    );
  }

  return trimmed;
};

export const ConnectDB = async () => {
  try {

    const connectionDB = await mongoose.connect(process.env.DB_URI, {
      dbName: process.env.DB_NAME,
      maxPoolSize: 10,
      minPoolSize: 2,
      autoIndex: process.env.NODE_ENV !== "production",
      serverSelectionTimeoutMS: 5000,
    });
    console.log("DB HOSTED ON:", connectionDB.connection.host);
    console.log("DB NAME CONNECTED:", connectionDB.connection.name);

    // Remove stale MongoDB $jsonSchema validators from collections
    // that conflict with current Mongoose schema definitions.
    try {
      const db = connectionDB.connection.db;
      await db.command({
        collMod: "orders",
        validator: {},
        validationLevel: "off",
      });
      console.log("✅ Removed stale validator from 'orders' collection");
    } catch (validatorErr) {
      if (validatorErr.codeName !== "NamespaceNotFound") {
        console.warn(
          "⚠️ Could not remove orders validator:",
          validatorErr.message,
        );
      }
    }
  } catch (error) {
    if (error.name === "MongooseServerSelectionError") {
      console.error(
        "\n❌ MongoDB Connection Error: Could not connect to any servers.",
      );
      console.error(
        "👉 This is usually caused by your IP address not being whitelisted in MongoDB Atlas.",
      );
      console.error("🔗 Whitelist your IP here: https://cloud.mongodb.com/\n");
    } else {
      console.log("DataBase Connection ERROR:", error.message || error);
    }
    process.exit(1);
  }
};
