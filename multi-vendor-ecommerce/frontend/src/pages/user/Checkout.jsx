import { useState, useContext } from "react";
import toast from "react-hot-toast";

import API from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";

const Checkout = () => {

  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleOrder = async (e) => {

    e.preventDefault();

    try {

      setLoading(true);

      // get cart
      const cartRes = await API.get(
        "/cart",
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        }
      );

      const total = cartRes.data.cartItems.reduce(
        (acc, item) =>
          acc + (item.product.price * item.quantity),
        0
      );

      // create razorpay order
      const paymentRes = await API.post(
        "/payment/create",
        {
          amount: total,
        },
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        }
      );

      const order = paymentRes.data.order;

      const options = {

        key: import.meta.env.VITE_RAZORPAY_KEY,

        amount: order.amount,

        currency: order.currency,

        name: "MultiVendor",

        description: "Order Payment",

        order_id: order.id,

        handler: async function (response) {

          try {

            // place final order
            await API.post(
              "/orders/place",
              {
                ...formData,
                paymentId: response.razorpay_payment_id,
              },
              {
                headers: {
                  Authorization: `Bearer ${user?.token}`,
                },
              }
            );

            toast.success("Payment Successful");

            // clear form
            setFormData({
              address: "",
              city: "",
              postalCode: "",
              country: "",
            });

          } catch (error) {

            console.log(error);

            toast.error("Order placement failed");

          }
        },

        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },

        theme: {
          color: "#4f46e5",
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.open();

    } catch (error) {

      console.log(error);

      toast.error(
        error?.response?.data?.message || "Payment failed"
      );

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="max-w-2xl bg-white p-8 rounded-2xl">

      <h1 className="text-4xl font-bold mb-8">
        Checkout
      </h1>

      <form
        onSubmit={handleOrder}
        className="flex flex-col gap-5"
      >

        <input
          type="text"
          name="address"
          placeholder="Address"
          value={formData.address}
          onChange={handleChange}
          className="border p-4 rounded-lg"
          required
        />

        <input
          type="text"
          name="city"
          placeholder="City"
          value={formData.city}
          onChange={handleChange}
          className="border p-4 rounded-lg"
          required
        />

        <input
          type="text"
          name="postalCode"
          placeholder="Postal Code"
          value={formData.postalCode}
          onChange={handleChange}
          className="border p-4 rounded-lg"
          required
        />

        <input
          type="text"
          name="country"
          placeholder="Country"
          value={formData.country}
          onChange={handleChange}
          className="border p-4 rounded-lg"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className={`text-white py-4 rounded-xl ${
            loading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-black"
          }`}
        >
          {loading ? "Processing..." : "Place Order"}
        </button>

      </form>

    </div>
  );
};

export default Checkout;