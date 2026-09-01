import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import API from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";

const ProductDetails = () => {

  const { id } = useParams();
  const { user } = useContext(AuthContext);

  const [product, setProduct] = useState(null);

  useEffect(() => {

    const fetchProduct = async () => {

      try {

        const res = await API.get(`/products/${id}`);

        setProduct(res.data.product);

      } catch (error) {
        console.log(error);
        toast.error("Failed to load product");
      }
    };

    fetchProduct();

  }, [id]);


  // ===============================
  // ADD TO CART FUNCTION
  // ===============================
  const addProductToCart = async () => {

    try {

      if (!product) return;

      await API.post(
        "/cart/add",
        {
          productId: product._id,
        },
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        }
      );

      toast.success("Added to cart");

    } catch (error) {

      console.log(error);

      toast.error(
        error?.response?.data?.message || "Failed to add to cart"
      );
    }
  };


  if (!product) {
    return <h1 className="text-xl font-semibold">Loading...</h1>;
  }

  return (
    <div className="grid md:grid-cols-2 gap-10">

      <img
        src={product.image}
        alt={product.name}
        className="w-full h-[500px] object-cover rounded-2xl bg-white"
      />

      <div>

        <p className="text-indigo-600 mb-3">
          {product.category}
        </p>

        <h1 className="text-5xl font-bold mb-5">
          {product.name}
        </h1>

        <p className="text-gray-600 leading-8 mb-6">
          {product.description}
        </p>

        <h2 className="text-4xl font-bold mb-6">
          ₹ {product.price}
        </h2>

        {/* ADD TO CART */}
        <button
          onClick={addProductToCart}
          disabled={!product}
          className="bg-black text-white px-8 py-4 rounded-xl disabled:opacity-50"
        >
          Add To Cart
        </button>

      </div>

    </div>
  );
};

export default ProductDetails;