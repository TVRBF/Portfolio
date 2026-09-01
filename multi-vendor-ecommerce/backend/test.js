import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

dotenv.config();

// CONFIG CLOUDINARY
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("🔄 Testing Cloudinary config...");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "OK" : "MISSING");

// STEP 1: TEST CONNECTION
async function testConnection() {
  try {
    const result = await cloudinary.api.ping();
    console.log("✅ Cloudinary Connected:", result);
  } catch (err) {
    console.log("❌ Cloudinary Connection Failed:");
    console.log(err.message);
    return;
  }
}

// STEP 2: TEST IMAGE UPLOAD
async function testUpload() {
  try {
    // IMPORTANT: put any image in same folder named "test.jpg"
    const filePath = "./test.jpg";

    if (!fs.existsSync(filePath)) {
      console.log("❌ test.jpg not found in project root");
      return;
    }

    const result = await cloudinary.uploader.upload(filePath, {
      folder: "test-folder",
    });

    console.log("✅ Upload Success:");
    console.log("URL:", result.secure_url);
  } catch (err) {
    console.log("❌ Upload Failed:");
    console.log(err.message);
  }
}

// RUN TESTS
(async () => {
  await testConnection();
  await testUpload();
})();