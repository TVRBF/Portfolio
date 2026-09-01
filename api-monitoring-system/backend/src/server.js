import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// 🔥 Load env FIRST (prevents undefined env issues everywhere)
dotenv.config();

import connectDB from "./config/db.js";
import apiRoutes from "./routes/apiRoutes.js";
import startMonitoringCron from "./cron/monitorCron.js";
import errorHandler from "./middleware/errorMiddleware.js";

const app = express();

// 🔥 Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);;
app.use(express.json());

// 🔥 DB Connection
connectDB();

// 🔥 Health Check Route
app.get("/", (req, res) => {
  res.json({
    message: "API Monitoring System Backend Running",
  });
});

// 🔥 Routes
app.use("/api/apis", apiRoutes);

// 🔥 Start Cron Job
startMonitoringCron();

// 🔥 Start Server
const PORT = process.env.PORT || 5000;
app.use(errorHandler);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});