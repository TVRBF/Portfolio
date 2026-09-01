import { useState } from "react";
import API from "../../api/axios";
import toast from "react-hot-toast";

const Register = () => {

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
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

      const res = await API.post("/auth/register", formData);

      toast.success(res.data.message || "Registered successfully");

    } catch (error) {

      toast.error(
        error?.response?.data?.message || "Registration failed"
      );

    }
  };

  return (
    <div className="p-10">

      <h1 className="text-3xl font-bold mb-5">
        Register
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 max-w-md"
      >

        <input
          type="text"
          name="name"
          placeholder="Name"
          onChange={handleChange}
          className="border p-3"
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          className="border p-3"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          className="border p-3"
        />

        <select
          name="role"
          onChange={handleChange}
          className="border p-3"
        >
          <option value="user">User</option>
          <option value="vendor">Vendor</option>
        </select>

        <button className="bg-black text-white p-3">
          Register
        </button>

      </form>
    </div>
  );
};

export default Register;