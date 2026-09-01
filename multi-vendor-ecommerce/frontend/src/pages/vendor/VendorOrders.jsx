import {
  useEffect,
  useState,
  useContext,
} from "react";

import API from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";

const VendorOrders = () => {

  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);

  useEffect(() => {

    const fetchOrders = async () => {

      try {

        const res = await API.get(
          "/orders/vendor-orders",
          {
            headers: {
              Authorization: `Bearer ${user?.token}`,
            },
          }
        );

        setOrders(res.data.vendorOrders);

      } catch (error) {
        console.log(error);
      }
    };

    fetchOrders();

  }, [user?.token]); // ✅ correct dependency


  const updateStatus = async (id, status) => {

    try {

      await API.put(
        `/orders/${id}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        }
      );

      // refresh after update
      const res = await API.get("/orders/vendor-orders", {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });

      setOrders(res.data.vendorOrders);

    } catch (error) {
      console.log(error);
    }
  };


  return (
    <div>

      <h1 className="text-4xl font-bold mb-8">
        Vendor Orders
      </h1>

      <div className="space-y-6">

        {orders.map((order) => (

          <div
            key={order._id}
            className="bg-white p-6 rounded-2xl shadow"
          >

            <div className="flex justify-between items-center mb-5">

              <div>

                <h2 className="font-bold">
                  {order.user.name}
                </h2>

                <p className="text-gray-500">
                  {order.user.email}
                </p>

              </div>

              <div>

                <select
                  value={order.orderStatus}
                  onChange={(e) =>
                    updateStatus(order._id, e.target.value)
                  }
                  className="border p-2 rounded"
                >

                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>

                </select>

              </div>

            </div>

            <div className="space-y-3">

              {order.orderItems.map((item) => (

                <div
                  key={item._id}
                  className="flex gap-4 items-center"
                >

                  <img
                    src={item.product.image}
                    className="w-20 h-20 rounded object-cover"
                  />

                  <div>

                    <h2 className="font-semibold">
                      {item.product.name}
                    </h2>

                    <p>
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

export default VendorOrders;