import { Outlet, Link } from "react-router-dom";

const AdminLayout = () => {
  return (
    <div className="flex min-h-screen">

      <aside className="w-64 bg-blue-900 text-white p-5">

        <h1 className="text-2xl font-bold mb-10">
          Admin Panel
        </h1>

        <div className="flex flex-col gap-4">

          <Link to="/admin/dashboard">
            Dashboard
          </Link>

          <Link to="/admin/users">
            Users
          </Link>

          <Link to="/admin/vendors">
            Vendors
          </Link>
          <Link to="/admin/products">
            Products
          </Link>

        </div>

      </aside>

      <main className="flex-1 p-6 bg-gray-100">
        <Outlet />
      </main>

    </div>
  );
};

export default AdminLayout;