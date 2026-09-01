import express from "express";

import {
  getUsers,
  getVendors,
  getProductsAdmin,
  getOrdersAdmin,
  deleteProductAdmin,
} from "./admin.controller.js";

import {
  protect,
  authorizeRoles,
} from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorizeRoles("admin"));

router.get("/users", getUsers);
router.get("/vendors", getVendors);
router.get("/products", getProductsAdmin);
router.get("/orders", getOrdersAdmin);

router.delete("/product/:id", deleteProductAdmin);

export default router;