import express from "express";

import {
  addToCart,
  getCart,
  updateQuantity,
  removeCartItem,
} from "./cart.controller.js";

import {
  protect,
  authorizeRoles,
} from "../../middleware/authMiddleware.js";

const router = express.Router();


// ===============================
// ADD TO CART
// ===============================
router.post(
  "/add",
  protect,
  authorizeRoles("user"),
  addToCart
);


// ===============================
// GET CART
// ===============================
router.get(
  "/",
  protect,
  authorizeRoles("user"),
  getCart
);


// ===============================
// UPDATE QUANTITY
// ===============================
router.put(
  "/:id",
  protect,
  authorizeRoles("user"),
  updateQuantity
);


// ===============================
// REMOVE FROM CART (FIXED)
// matches frontend: /cart/remove/:productId
// ===============================
router.delete(
  "/remove/:productId",
  protect,
  authorizeRoles("user"),
  removeCartItem
);


export default router;