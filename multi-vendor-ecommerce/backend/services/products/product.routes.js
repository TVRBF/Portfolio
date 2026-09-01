import express from "express";
import upload from "../../middleware/uploadMiddleware.js";

import {
  addProduct,
  getProducts,
  getSingleProduct,
  getVendorProducts,
  deleteProduct,
} from "./product.controller.js";

import {
  protect,
  authorizeRoles,
} from "../../middleware/authMiddleware.js";

const router = express.Router();


// PUBLIC
router.get("/", getProducts);
router.get("/:id", getSingleProduct);


// VENDOR
router.post(
  "/add",
  protect,
  authorizeRoles("vendor"),
  upload.single("image"),
  addProduct
);

router.get(
  "/vendor/my-products",
  protect,
  authorizeRoles("vendor"),
  getVendorProducts
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("vendor"),
  deleteProduct
);

export default router;