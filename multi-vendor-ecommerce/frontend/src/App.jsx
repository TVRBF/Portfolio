import { Routes, Route } from "react-router-dom";
import { useContext } from "react";

import { AuthContext } from "./context/AuthContext";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import MainLayout from "./layouts/MainLayout";
import VendorLayout from "./layouts/VendorLayout";
import AdminLayout from "./layouts/AdminLayout";

import VendorDashboard from "./pages/vendor/VendorDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

import ProtectedRoute from "./routes/ProtectedRoute";

import AddProduct from "./pages/vendor/AddProduct";
import VendorOrders from "./pages/vendor/VendorOrders";
import VendorProducts from "./pages/vendor/VendorProducts";

import Home from "./pages/user/Home";
import ProductDetails from "./pages/user/ProductDetails";
import Cart from "./pages/user/Cart";
import Checkout from "./pages/user/Checkout";
import MyOrders from "./pages/user/MyOrders";

import AdminUsers from "./pages/admin/AdminUsers";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminVendors from "./pages/admin/AdminVendors";

function App() {

  const { user } = useContext(AuthContext);

  return (

    <Routes>

      {/* =========================
          PUBLIC ROUTES
      ========================== */}
      <Route element={<MainLayout />}>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/product/:id"
          element={<ProductDetails />}
        />

        <Route
          path="/cart"
          element={<Cart />}
        />

        <Route
          path="/checkout"
          element={<Checkout />}
        />

        <Route
          path="/my-orders"
          element={<MyOrders />}
        />

      </Route>


      {/* =========================
          VENDOR ROUTES
      ========================== */}
      <Route
        path="/vendor"
        element={
          <ProtectedRoute
            user={user}
            role="vendor"
          >
            <VendorLayout />
          </ProtectedRoute>
        }
      >

        <Route
          path="dashboard"
          element={<VendorDashboard />}
        />

        <Route
          path="add-product"
          element={<AddProduct />}
        />

        <Route
          path="orders"
          element={<VendorOrders />}
        />

        <Route
          path="products"
          element={<VendorProducts />}
        />

      </Route>


      {/* =========================
          ADMIN ROUTES
      ========================== */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute
            user={user}
            role="admin"
          >
            <AdminLayout />
          </ProtectedRoute>
        }
      >

        <Route
          path="dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="users"
          element={<AdminUsers />}
        />

        <Route
          path="products"
          element={<AdminProducts />}
        />

        <Route
          path="vendors"
          element={<AdminVendors />}
        />

      </Route>

    </Routes>

  );
}

export default App;