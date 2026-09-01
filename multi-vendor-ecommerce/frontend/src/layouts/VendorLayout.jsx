import { Outlet, Link } from "react-router-dom";

const VendorLayout = () => {
  return (
    <div className="flex min-h-screen">

      <aside className="w-64 bg-black text-white p-5">

        <h1 className="text-2xl font-bold mb-10">
          Vendor Panel
        </h1>

        <div className="flex flex-col gap-4">

          <Link to="/vendor/dashboard">
            Dashboard
          </Link>

          <Link to="/vendor/products">
            Products
          </Link>

          <Link to="/vendor/orders">
            Orders
          </Link>

          <Link to="/vendor/add-product">
            Add Product
          </Link>

        </div>

      </aside>

      <main className="flex-1 p-6 bg-gray-100">
        <Outlet />
      </main>

    </div>
  );
};

export default VendorLayout;