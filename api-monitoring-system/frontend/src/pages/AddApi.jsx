import { useState } from "react";

import api from "../api/api";
import toast from "react-hot-toast";

const AddApi = () => {
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    expectedStatusCode: 200,
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
      await api.post("/apis", formData);

      toast.success("API Added Successfully");

      setFormData({
        name: "",
        url: "",
        expectedStatusCode: 200,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">
        Add API
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 p-8 rounded-xl max-w-xl"
      >
        <div className="mb-5">
          <label className="block mb-2">
            API Name
          </label>

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-3 rounded bg-slate-800"
            required
          />
        </div>

        <div className="mb-5">
          <label className="block mb-2">
            API URL
          </label>

          <input
            type="text"
            name="url"
            value={formData.url}
            onChange={handleChange}
            className="w-full p-3 rounded bg-slate-800"
            required
          />
        </div>

        <div className="mb-5">
          <label className="block mb-2">
            Expected Status Code
          </label>

          <input
            type="number"
            name="expectedStatusCode"
            value={formData.expectedStatusCode}
            onChange={handleChange}
            className="w-full p-3 rounded bg-slate-800"
          />
        </div>

        <button className="bg-cyan-600 px-6 py-3 rounded">
          Add API
        </button>
      </form>
    </div>
  );
};

export default AddApi;