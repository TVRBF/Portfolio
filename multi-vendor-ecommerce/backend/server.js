import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";

import authRoutes from "./services/auth/auth.routes.js";
import testRoutes from "./services/auth/auth.test.routes.js";
import productRoutes from "./services/products/product.routes.js";
import cartRoutes from "./services/cart/cart.routes.js";
import orderRoutes from "./services/orders/order.routes.js";
import adminRoutes from "./services/admin/admin.routes.js";
import vendorRoutes from "./services/vendor/vendor.routes.js";
import paymentRoutes from "./services/payment/payment.routes.js";

// MUST be first
dotenv.config();

const app = express();

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

app.use(express.json());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/payment", paymentRoutes);

// health check
app.get("/", (req, res) => {
  res.send("API Running");
});

const PORT = process.env.PORT || 5000;

// connect DB first
connectDB();

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});