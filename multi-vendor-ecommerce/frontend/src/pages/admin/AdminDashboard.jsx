import { useEffect, useState, useMemo, useContext } from "react";
import API from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";

const StatCard = ({ title, value, subtitle }) => (
  <div className="bg-white p-6 rounded-xl shadow">
    <h3 className="text-sm text-gray-500">{title}</h3>
    <p className="text-2xl font-bold mt-2">{value}</p>
    {subtitle && (
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    )}
  </div>
);

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);

  const token = user?.token || localStorage.getItem("token");

  // ---------------- USERS ----------------
  useEffect(() => {
    const fetchUsers = async () => {
      const res = await API.get("/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUsers(res.data?.users || []);
    };

    if (token) fetchUsers();
  }, [token]); // ✅ FIXED

  // ---------------- VENDORS ----------------
  useEffect(() => {
    const fetchVendors = async () => {
      const res = await API.get("/admin/vendors", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setVendors(res.data?.vendors || []);
    };

    if (token) fetchVendors();
  }, [token]); // ✅ FIXED

  // ---------------- ORDERS ----------------
  useEffect(() => {
    const fetchOrders = async () => {
      const res = await API.get("/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOrders(res.data?.orders || []);
    };

    if (token) fetchOrders();
  }, [token]); // ✅ FIXED

  // ---------------- STATS ----------------
  const stats = useMemo(() => {
    const revenue = orders.reduce(
      (acc, o) => acc + (o.totalPrice || 0),
      0
    );

    const pending = orders.filter(
      (o) => o.orderStatus !== "Delivered"
    ).length;

    return [
      {
        title: "Users",
        value: users.length,
        subtitle: "Registered customers",
      },
      {
        title: "Vendors",
        value: vendors.length,
        subtitle: "Active sellers",
      },
      {
        title: "Orders",
        value: orders.length,
        subtitle: `${pending} pending`,
      },
      {
        title: "Revenue",
        value: `₹${revenue}`,
        subtitle: "Total earnings",
      },
    ];
  }, [users, vendors, orders]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      <h1 className="text-3xl font-bold mb-6">
        Admin Dashboard
      </h1>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      {/* DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-8">

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold mb-4">Recent Users</h2>
          {users.slice(0, 5).map((u) => (
            <div key={u._id} className="border-b py-2">
              <p>{u.name}</p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold mb-4">Recent Orders</h2>
          {orders.slice(0, 5).map((o) => (
            <div key={o._id} className="border-b py-2">
              <p>{o.user?.name}</p>
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

export default AdminDashboard;