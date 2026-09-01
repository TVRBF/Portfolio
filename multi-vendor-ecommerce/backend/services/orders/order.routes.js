import express from "express";

import {
  placeOrder,
  getMyOrders,
  getVendorOrders,
  updateOrderStatus,
} from "./order.controller.js";

import {
  protect,
  authorizeRoles,
} from "../../middleware/authMiddleware.js";

const router = express.Router();


// USER
router.post(
  "/place",
  protect,
  authorizeRoles("user"),
  placeOrder
);

router.get(
  "/my-orders",
  protect,
  authorizeRoles("user"),
  getMyOrders
);


// VENDOR
router.get(
  "/vendor-orders",
  protect,
  authorizeRoles("vendor"),
  getVendorOrders
);

router.put(
  "/:id",
  protect,
  authorizeRoles("vendor"),
  updateOrderStatus
);

export default router;