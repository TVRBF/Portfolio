import User from "../auth/User.js";
import Product from "../products/Product.js";
import Order from "../orders/Order.js";

// ---------------- ALL USERS ----------------
export const getUsers = async (req, res) => {
  try {
    const users = await User.find();

    res.status(200).json({
      success: true,
      users,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------------- ALL VENDORS (FIXED ONLY HERE) ----------------
export const getVendors = async (req, res) => {
  try {
    // ✅ FIX: vendors are users with role = vendor
    const vendors = await User.find({ role: "vendor" });

    res.status(200).json({
      success: true,
      vendors,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------------- ALL PRODUCTS ----------------
export const getProductsAdmin = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("vendor", "name");

    res.status(200).json({
      success: true,
      products,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------------- ALL ORDERS ----------------
export const getOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("orderItems.product");

    res.status(200).json({
      success: true,
      orders,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------------- DELETE PRODUCT ----------------
export const deleteProductAdmin = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: "Product deleted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};