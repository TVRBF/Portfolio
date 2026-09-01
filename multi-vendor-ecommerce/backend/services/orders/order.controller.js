import Order from "./Order.js";
import Cart from "../cart/Cart.js";
import Product from "../products/Product.js";


// PLACE ORDER
export const placeOrder = async (req, res) => {
  try {

    const {
      address,
      city,
      postalCode,
      country,
    } = req.body;

    // get cart items
    const cartItems = await Cart.find({
      user: req.user._id,
    }).populate("product");

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // order items
    const orderItems = cartItems.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
    }));

    // total
    const totalPrice = cartItems.reduce(
      (acc, item) =>
        acc + item.product.price * item.quantity,
      0
    );

    // create order
    const order = await Order.create({
      user: req.user._id,

      orderItems,

      shippingAddress: {
        address,
        city,
        postalCode,
        country,
      },

      totalPrice,
    });

    // reduce stock
    for (const item of cartItems) {

      const product = await Product.findById(
        item.product._id
      );

      product.stock -= item.quantity;

      await product.save();
    }

    // clear cart
    await Cart.deleteMany({
      user: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Order placed",
      order,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// USER ORDERS
export const getMyOrders = async (req, res) => {
  try {

    const orders = await Order.find({
      user: req.user._id,
    }).populate("orderItems.product");

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


// VENDOR ORDERS
export const getVendorOrders = async (req, res) => {
  try {

    const orders = await Order.find()
      .populate("orderItems.product")
      .populate("user", "name email");

    // filter vendor products
    const vendorOrders = orders.filter((order) =>
      order.orderItems.some(
        (item) =>
          item.product.vendor.toString() ===
          req.user._id.toString()
      )
    );

    res.status(200).json({
      success: true,
      vendorOrders,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// UPDATE STATUS
export const updateOrderStatus = async (req, res) => {
  try {

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.orderStatus = req.body.status;

    await order.save();

    res.status(200).json({
      success: true,
      message: "Status updated",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};