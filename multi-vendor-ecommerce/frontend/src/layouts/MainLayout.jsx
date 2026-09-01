import { Outlet, Link } from "react-router-dom";
import { FaShoppingCart } from "react-icons/fa";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const MainLayout = () => {

  const { user, setUser } = useContext(AuthContext);

  const logoutHandler = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <div>

      <nav className="bg-white shadow-sm border-b">

        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <Link
            to="/"
            className="text-3xl font-bold text-indigo-600"
          >
            MultiVendor
          </Link>

          <div className="flex items-center gap-6">

            <Link className="hover:text-indigo-600" to="/">
              Home
            </Link>

            {/* ================= USER LINKS ================= */}
            {user?.user?.role === "user" && (
              <>
                <Link
                  className="hover:text-indigo-600"
                  to="/my-orders"
                >
                  Orders
                </Link>

                <Link to="/cart">
                  <FaShoppingCart size={22} />
                </Link>
              </>
            )}

            {/* ================= AUTH LINKS ================= */}
            {!user ? (
              <>
                <Link className="hover:text-indigo-600" to="/login">
                  Login
                </Link>

                <Link
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
                  to="/register"
                >
                  Register
                </Link>
              </>
            ) : (
              <button
                onClick={logoutHandler}
                className="bg-red-500 text-white px-4 py-2 rounded-lg"
              >
                Logout
              </button>
            )}

          </div>

        </div>

      </nav>

      <main className="max-w-7xl mx-auto p-6">
        <Outlet />
      </main>

    </div>
  );
};

export default MainLayout;