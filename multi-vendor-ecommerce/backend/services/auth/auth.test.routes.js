import express from "express";

import {
  protect,
  authorizeRoles,
} from "../../middleware/authMiddleware.js";

const router = express.Router();


// USER ROUTE
router.get(
  "/user",
  protect,
  authorizeRoles("user"),
  (req, res) => {
    res.json({
      success: true,
      message: "User Dashboard",
    });
  }
);


// VENDOR ROUTE
router.get(
  "/vendor",
  protect,
  authorizeRoles("vendor"),
  (req, res) => {
    res.json({
      success: true,
      message: "Vendor Dashboard",
    });
  }
);


// ADMIN ROUTE
router.get(
  "/admin",
  protect,
  authorizeRoles("admin"),
  (req, res) => {
    res.json({
      success: true,
      message: "Admin Dashboard",
    });
  }
);

export default router;