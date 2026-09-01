import { useEffect, useState } from "react";
import API from "../../api/axios";
import { Link } from "react-router-dom";

const Home = () => {

  const [products, setProducts] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false); // ✅ STEP 8 ADDED

  useEffect(() => {

    // STEP 11 — PAGE TITLE
    document.title = "Home | MultiVendor";

    const fetchProducts = async () => {

      try {

        setLoading(true); // START LOADING

        const res = await API.get(
          `/products?keyword=${keyword}&category=${category}`
        );

        setProducts(res.data.products);

      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false); // STOP LOADING
      }
    };

    fetchProducts();

  }, [keyword, category]);

  // ===============================
  // STEP 8 — LOADING UI
  // ===============================
  if (loading) {
    return (
      <h1 className="text-3xl font-bold">
        Loading...
      </h1>
    );
  }

  return (
    <div>

      {/* HEADER */}
      <div className="mb-10">

        <h1 className="text-5xl font-bold mb-3">
          Latest Products
        </h1>

        <p className="text-gray-500">
          Explore trending products from vendors
        </p>

      </div>

      {/* SEARCH + FILTER UI */}
      <div className="flex gap-4 mb-8">

        <input
          type="text"
          placeholder="Search products..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="border p-3 rounded-lg w-full bg-white"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border p-3 rounded-lg bg-white"
        >

          <option value="">
            All Categories
          </option>

          <option value="Shoes">Shoes</option>
          <option value="Clothes">Clothes</option>
          <option value="Electronics">Electronics</option>

        </select>

      </div>

      {/* PRODUCTS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">

        {products.length > 0 ? (

          products.map((product) => (

            <div
              key={product._id}
              className="bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition duration-300"
            >

              <img
                src={product.image}
                alt={product.name}
                className="h-64 w-full object-cover"
              />

              <div className="p-5">

                <p className="text-sm text-indigo-600 mb-2">
                  {product.category}
                </p>

                <h2 className="text-xl font-semibold">
                  {product.name}
                </h2>

                <p className="text-gray-500 mt-2 line-clamp-2">
                  {product.description}
                </p>

                <div className="flex items-center justify-between mt-5">

                  <p className="text-2xl font-bold">
                    ₹ {product.price}
                  </p>

                  <Link
                    to={`/product/${product._id}`}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
                  >
                    View
                  </Link>

                </div>

              </div>

            </div>

          ))

        ) : (

          <p className="text-gray-500 col-span-full">
            No products found
          </p>

        )}

      </div>

    </div>
  );
};

export default Home;