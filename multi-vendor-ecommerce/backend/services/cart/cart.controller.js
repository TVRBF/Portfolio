import Cart from "./Cart.js";


// ===============================
// ADD TO CART
// ===============================
export const addToCart = async (req, res) => {
  try {

    const { productId } = req.body;

    const existingItem = await Cart.findOne({
      user: req.user._id,
      product: productId,
    });

    if (existingItem) {

      existingItem.quantity += 1;
      await existingItem.save();

      return res.status(200).json({
        success: true,
        message: "Cart updated",
      });
    }

    await Cart.create({
      user: req.user._id,
      product: productId,
      quantity: 1,
    });

    res.status(201).json({
      success: true,
      message: "Added to cart",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// ===============================
// GET USER CART
// ===============================
export const getCart = async (req, res) => {
  try {

    const cartItems = await Cart.find({
      user: req.user._id,
    }).populate("product");

    res.status(200).json({
      success: true,
      cartItems,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// ===============================
// UPDATE QUANTITY
// ===============================
export const updateQuantity = async (req, res) => {
  try {

    const { id } = req.params;

    const item = await Cart.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    item.quantity = req.body.quantity;

    await item.save();

    res.status(200).json({
      success: true,
      message: "Quantity updated",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// ===============================
// REMOVE ITEM (FIXED)
// ===============================
export const removeCartItem = async (req, res) => {
  try {

    const { productId } = req.params; // ✅ IMPORTANT FIX

    const item = await Cart.findOne({
      user: req.user._id,
      product: productId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    await item.deleteOne();

    res.status(200).json({
      success: true,
      message: "Item removed",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};