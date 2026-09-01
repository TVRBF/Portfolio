import express from "express";
import { getVendorProducts } from "./vendor.controller.js";
import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/my-products",
  protect,
  authorizeRoles("vendor"),
  getVendorProducts
);

export default router;