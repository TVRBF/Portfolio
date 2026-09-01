  import { useEffect, useState } from "react";

  const VendorProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchProducts = async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) return;

          const res = await fetch("http://localhost:5000/api/vendor/my-products", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await res.json();

          console.log("API RESPONSE:", data);

          if (data?.success && Array.isArray(data.products)) {
            setProducts(data.products);
          } else {
            setProducts([]);
          }

        } catch (err) {
          console.log(err);
          setProducts([]);
        } finally {
          setLoading(false);
        }
      };

      fetchProducts();
    }, []);

    if (loading) {
      return <p className="text-gray-500">Loading products...</p>;
    }

    return (
      <div>
        <h1 className="text-4xl font-bold mb-6">My Products</h1>

        {products.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p._id} className="border p-4 rounded shadow">

                <img
                  src={p.image}
                  alt={p.name}
                  className="h-32 w-full object-cover"
                />

                <h2 className="font-bold mt-2">{p.name}</h2>
                <p>₹{p.price}</p>
                <p className="text-sm text-gray-500">{p.category}</p>

              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No products found</p>
        )}
      </div>
    );
  };

  export default VendorProducts;