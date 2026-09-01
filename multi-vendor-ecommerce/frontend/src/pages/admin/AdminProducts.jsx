import { useEffect, useState, useContext } from "react";
import API from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";

const AdminProducts = () => {

  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);

  useEffect(() => {

    const fetchProducts = async () => {
      try {
        const res = await API.get("/admin/products", {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        setProducts(res.data.products);

      } catch (error) {
        console.log(error);
      }
    };

    if (user?.token) {
      fetchProducts();
    }

  }, [user?.token]);


  const deleteProduct = async (id) => {

    try {

      await API.delete(`/admin/product/${id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      // refresh list
      setProducts((prev) =>
        prev.filter((p) => p._id !== id)
      );

    } catch (error) {
      console.log(error);
    }
  };


  return (
    <div>

      <h1 className="text-4xl font-bold mb-8">
        All Products
      </h1>

      {products.length === 0 ? (
        <p className="text-gray-500">
          No products found
        </p>
      ) : (

        <div className="grid md:grid-cols-3 gap-6">

          {products.map((product) => (

            <div
              key={product._id}
              className="bg-white rounded-2xl shadow overflow-hidden"
            >

              <img
                src={product.image}
                className="h-64 w-full object-cover"
              />

              <div className="p-5">

                <h2 className="text-2xl font-bold">
                  {product.name}
                </h2>

                <p className="text-gray-500 mt-2">
                  {product.category}
                </p>

                <p className="font-semibold mt-3">
                  Vendor: {product.vendor?.name}
                </p>

                <button
                  onClick={() => deleteProduct(product._id)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg mt-5"
                >
                  Delete
                </button>

              </div>

            </div>

          ))}

        </div>
      )}

    </div>
  );
};

export default AdminProducts;