import { useEffect, useState, useContext } from "react";
import API from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";

const MyOrders = () => {

  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);

  useEffect(() => {

    const fetchOrders = async () => {

      try {

        const res = await API.get(
          "/orders/my-orders",
          {
            headers: {
              Authorization: `Bearer ${user?.token}`,
            },
          }
        );

        setOrders(res.data.orders);

      } catch (error) {
        console.log(error);
      }
    };

    fetchOrders();

  }, [user?.token]); // ✅ correct dependency


  return (
    <div>

      <h1 className="text-4xl font-bold mb-8">
        My Orders
      </h1>

      <div className="space-y-6">

        {orders.map((order) => (

          <div
            key={order._id}
            className="bg-white rounded-2xl p-6 shadow"
          >

            <div className="flex justify-between mb-5">

              <div>

                <h2 className="font-bold text-xl">
                  Order ID
                </h2>

                <p className="text-gray-500">
                  {order._id}
                </p>

              </div>

              <div>

                <p className="font-semibold">
                  {order.orderStatus}
                </p>

              </div>

            </div>

            <div className="space-y-4">

              {order.orderItems.map((item) => (

                <div
                  key={item._id}
                  className="flex items-center gap-4"
                >

                  <img
                    src={item.product.image}
                    className="w-20 h-20 object-cover rounded"
                  />

                  <div>

                    <h2 className="font-semibold">
                      {item.product.name}
                    </h2>

                    <p className="text-gray-500">
                      Qty: {item.quantity}
                    </p>

                  </div>

                </div>

              ))}

            </div>

            <h2 className="text-2xl font-bold mt-6">
              ₹ {order.totalPrice}
            </h2>

          </div>

        ))}

      </div>

    </div>
  );
};

export default MyOrders;