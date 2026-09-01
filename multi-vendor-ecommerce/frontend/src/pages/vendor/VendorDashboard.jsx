import { useEffect, useState, useContext, useMemo } from "react";
import API from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";

const StatCard = ({ title, value, subtitle }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h3 className="text-sm text-gray-500">{title}</h3>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
};

const VendorDashboard = () => {
  const { user } = useContext(AuthContext);

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  // ---------------- FETCH PRODUCTS ----------------
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = user?.token || localStorage.getItem("token");

        const res = await API.get("/vendor/my-products", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProducts(res.data?.products || []);
      } catch (err) {
        console.log(err);
      }
    };

    fetchProducts();
  }, [user]);

  // ---------------- FETCH ORDERS ----------------
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await API.get("/orders/vendor-orders", {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        });

        setOrders(res.data?.vendorOrders || []);
      } catch (err) {
        console.log(err);
      }
    };

    if (user?.token) fetchOrders();
  }, [user]);

  // ---------------- CALCULATIONS (REAL DATA) ----------------
  const stats = useMemo(() => {
    const totalProducts = products.length;

    const totalOrders = orders.length;

    const revenue = orders.reduce((acc, order) => {
      return acc + (order.totalPrice || 0);
    }, 0);

    const deliveredOrders = orders.filter(
      (o) => o.orderStatus === "Delivered"
    ).length;

    return [
      {
        title: "Total Products",
        value: totalProducts,
        subtitle: "Your listed products",
      },
      {
        title: "Total Orders",
        value: totalOrders,
        subtitle: `${deliveredOrders} delivered`,
      },
      {
        title: "Revenue",
        value: `₹${revenue}`,
        subtitle: "All-time earnings",
      },
    ];
  }, [products, orders]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Vendor Dashboard</h1>
        <p className="text-gray-500">
          Real-time overview of your store
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {stats.map((s, i) => (
          <StatCard
            key={i}
            title={s.title}
            value={s.value}
            subtitle={s.subtitle}
          />
        ))}
      </div>

      {/* Extra sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-8">

        {/* Recent Products */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold mb-4">Recent Products</h2>

          {products.slice(0, 5).map((p) => (
            <div key={p._id} className="flex gap-3 mb-3">
              <img
                src={p.image}
                className="w-12 h-12 object-cover rounded"
              />
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-gray-500">₹{p.price}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold mb-4">Recent Orders</h2>

          {orders.slice(0, 5).map((o) => (
            <div key={o._id} className="mb-3 border-b pb-2">
              <p className="text-sm font-medium">
                {o.user?.name}
              </p>
              <p className="text-xs text-gray-500">
                ₹{o.totalPrice} • {o.orderStatus}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default VendorDashboard;