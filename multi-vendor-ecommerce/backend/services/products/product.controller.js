import Product from "./Product.js";

// ===============================
// ADD PRODUCT (CLOUDINARY SUPPORT)
// ===============================
export const addProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;

    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({
        success: false,
        message: "Image upload failed",
      });
    }

    const product = await Product.create({
      name,
      description,
      price,
      category: category.toLowerCase(), // ✅ normalize category
      stock,
      image: req.file.path,
      vendor: req.user._id,
    });

    res.status(201).json({
      success: true,
      product,
    });

  } catch (error) {
    console.log("ADD PRODUCT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ===============================
// GET ALL PRODUCTS (FIXED SEARCH + FILTER)
// ===============================
export const getProducts = async (req, res) => {
  try {

    const { keyword, category } = req.query;

    const query = {};

    // ✅ SEARCH (case-insensitive)
    if (keyword && keyword.trim() !== "") {
      query.name = {
        $regex: keyword,
        $options: "i",
      };
    }

    // ✅ CATEGORY FILTER (case-insensitive FIX)
    if (category && category.trim() !== "") {
      query.category = {
        $regex: `^${category}$`,
        $options: "i",
      };
    }

    const products = await Product.find(query)
      .populate("vendor", "name email");

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


// ===============================
// GET SINGLE PRODUCT
// ===============================
export const getSingleProduct = async (req, res) => {
  try {

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// ===============================
// GET VENDOR PRODUCTS
// ===============================
export const getVendorProducts = async (req, res) => {
  try {

    const products = await Product.find({
      vendor: req.user._id,
    });

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


// ===============================
// DELETE PRODUCT
// ===============================
export const deleteProduct = async (req, res) => {
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