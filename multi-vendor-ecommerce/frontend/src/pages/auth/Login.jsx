import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import API from "../../api/axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Login = () => {

  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

      const res = await API.post("/auth/login", formData);

      localStorage.setItem(
        "user",
        JSON.stringify(res.data)
      );

      setUser(res.data);

      toast.success("Login successful");

      // role redirects
      if (res.data.user.role === "admin") {
        navigate("/admin/dashboard");
      }
      else if (res.data.user.role === "vendor") {
        navigate("/vendor/dashboard");
      }
      else {
        navigate("/");
      }

    } catch (error) {

      toast.error(
        error?.response?.data?.message || "Login failed"
      );

    }
  };

  return (
    <div className="p-10">

      <h1 className="text-3xl font-bold mb-5">
        Login
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 max-w-md"
      >

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

        <button className="bg-black text-white p-3">
          Login
        </button>

      </form>
    </div>
  );
};

export default Login;