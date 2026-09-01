import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import API from "../../api/axios";
import toast from "react-hot-toast";

const AddProduct = () => {

  const { user } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "",
    image: null,
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {

      const productData = new FormData();

      productData.append("name", formData.name);
      productData.append("description", formData.description);
      productData.append("price", formData.price);
      productData.append("category", formData.category);
      productData.append("stock", formData.stock);

      if (formData.image) {
        productData.append("image", formData.image);
      }

      await API.post("/products/add", productData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      toast.success("Product added successfully");

      // optional reset form (better UX)
      setFormData({
        name: "",
        description: "",
        price: "",
        category: "",
        stock: "",
        image: null,
      });

    } catch (error) {

      toast.error(
        error?.response?.data?.message || "Failed to add product"
      );

      console.log("UPLOAD ERROR:", error?.response?.data || error.message);
    }
  };

  return (
    <div className="max-w-3xl bg-white p-8 rounded-2xl shadow">

      <h1 className="text-3xl font-bold mb-8">
        Add New Product
      </h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-5">

        <input
          type="text"
          name="name"
          placeholder="Product Name"
          value={formData.name}
          onChange={handleChange}
          className="border p-4 rounded-lg"
        />

        <input
          type="number"
          name="price"
          placeholder="Price"
          value={formData.price}
          onChange={handleChange}
          className="border p-4 rounded-lg"
        />

        <input
          type="text"
          name="category"
          placeholder="Category"
          value={formData.category}
          onChange={handleChange}
          className="border p-4 rounded-lg"
        />

        <input
          type="number"
          name="stock"
          placeholder="Stock"
          value={formData.stock}
          onChange={handleChange}
          className="border p-4 rounded-lg"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setFormData({
              ...formData,
              image: e.target.files[0],
            })
          }
          className="border p-4 rounded-lg col-span-2"
        />

        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
          className="border p-4 rounded-lg col-span-2 h-40"
        />

        <button className="bg-indigo-600 text-white py-4 rounded-xl col-span-2">
          Add Product
        </button>

      </form>
    </div>
  );
};

export default AddProduct;