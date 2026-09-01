import Product from "../products/Product.js";

// GET vendor products ONLY (SAFE VERSION)
export const getVendorProducts = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized vendor",
      });
    }

    const products = await Product.find({
      vendor: req.user._id,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      products,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};