import express from "express";

import { createPayment } from "./payment.controller.js";

import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/create",
  protect,
  createPayment
);

export default router;