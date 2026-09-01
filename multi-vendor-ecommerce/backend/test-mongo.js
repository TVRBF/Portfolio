import "dotenv/config";
import { MongoClient } from "mongodb";

console.log("🚀 MongoDB connection test started");

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!uri) {
  console.error("❌ MongoDB URI not found in .env");
  console.error("Expected MONGODB_URI or MONGO_URI");
  process.exit(1);
}

console.log("🔑 MongoDB URI found");

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
});

try {
  console.log("🔄 Connecting to MongoDB Atlas...");

  await client.connect();

  console.log("✅ MongoDB CONNECTED");

  // Actually ping MongoDB
  const result = await client.db().admin().ping();

  console.log("🏓 MongoDB ping:", result);
  console.log("🎉 MongoDB connection is working!");

} catch (error) {
  console.error("\n❌ MongoDB CONNECTION FAILED");
  console.error("--------------------------------");
  console.error("Error:", error.name);
  console.error("Message:", error.message);

  if (error.codeName) {
    console.error("Code:", error.codeName);
  }

  if (error.cause) {
    console.error("\nCause:", error.cause);
  }

  console.error("\nPossible problems:");
  console.error("• Incorrect MongoDB username/password");
  console.error("• Incorrect MongoDB URI");
  console.error("• Password contains unescaped special characters");
  console.error("• MongoDB Atlas user does not exist");
  console.error("• IP address is not allowed in Atlas");
  console.error("• Network/DNS/TLS problem");

  process.exitCode = 1;

} finally {
  await client.close();
  console.log("\n🔌 Connection closed");
}

