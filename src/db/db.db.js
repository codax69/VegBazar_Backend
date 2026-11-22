import mongoose from "mongoose";
import dns from "node:dns";

// Set reliable DNS resolvers for MongoDB SRV record lookup
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  dns.setDefaultResultOrder("ipv4first");
} catch (_) {}

export const ConnectDB = async () => {
  if (!process.env.DB_URI) {
    console.error("❌ MongoDB Error: DB_URI is missing in environment variables (.env)");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(process.env.DB_URI, {
      dbName: process.env.DB_NAME,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB Connected!`);
    console.log(`   Host:     ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);

    if (error.name === "MongooseServerSelectionError") {
      console.error(error.message);
    } else if (error.message && error.message.includes("bad auth")) {
      console.error("👉 Tip: Authentication failed. Verify username and password in DB_URI.");
    } else if (error.message && error.message.includes("querySrv")) {
      console.error("👉 Tip: DNS SRV record lookup failed. Check DNS / network connection.");
    }

    process.exit(1);
  }
};
