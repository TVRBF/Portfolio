import { useEffect, useState, useContext } from "react";
import API from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";
import { Link } from "react-router-dom";

const Cart = () => {
  const { user } = useContext(AuthContext);
  const [cartItems, setCartItems] = useState([]);

  // ===============================
  // FETCH CART
  // ===============================
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await API.get("/cart", {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        });

        setCartItems(res.data.cartItems);
      } catch (error) {
        console.log(error);
      }
    };

    fetchCart();
  }, [user?.token]);

  // ===============================
  // REMOVE FROM CART
  // ===============================
  const removeFromCart = async (productId) => {
    try {
      await API.delete(`/cart/remove/${productId}`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });

      setCartItems((prev) =>
        prev.filter((item) => item.product._id !== productId)
      );
    } catch (error) {
      console.log(error);
    }
  };

  const total = cartItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  // ===============================
  // EMPTY STATE (ADDED)
  // ===============================
  if (cartItems.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold mb-4">Cart is Empty</h1>
        <p className="text-gray-500">
          Add products to continue shopping
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">
        Shopping Cart
      </h1>

      <div className="space-y-5">
        {cartItems.map((item) => (
          <div
            key={item._id}
            className="bg-white p-5 rounded-xl flex gap-5 items-center"
          >
            <img
              src={item.product.image}
              className="w-32 h-32 object-cover rounded"
            />

            <div className="flex-1">
              <h2 className="text-2xl font-semibold">
                {item.product.name}
              </h2>

              <p className="text-gray-500">
                Quantity: {item.quantity}
              </p>

              <button
                onClick={() =>
                  removeFromCart(item.product._id)
                }
                className="mt-2 text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>

            <h2 className="text-2xl font-bold">
              ₹ {item.product.price}
            </h2>
          </div>
        ))}
      </div>

      <div className="bg-white mt-10 p-6 rounded-xl">
        <h2 className="text-3xl font-bold">
          Total: ₹ {total}
        </h2>

        <Link
          to="/checkout"
          className="bg-black text-white px-6 py-3 rounded-xl inline-block mt-5"
        >
          Proceed To Checkout
        </Link>
      </div>
    </div>
  );
};

export default Cart;