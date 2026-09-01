import { useEffect, useState, useContext } from "react";
import API from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";

const AdminVendors = () => {

  const { user } = useContext(AuthContext);
  const [vendors, setVendors] = useState([]);

  useEffect(() => {

    const fetchVendors = async () => {
      try {
        const res = await API.get("/admin/vendors", {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        setVendors(res.data.vendors);

      } catch (error) {
        console.log(error);
      }
    };

    if (user?.token) fetchVendors();

  }, [user?.token]);

  return (
    <div>

      <h1 className="text-4xl font-bold mb-8">
        All Vendors
      </h1>

      {vendors.length === 0 ? (
        <p className="text-gray-500">
          No vendors found
        </p>
      ) : (

        <div className="bg-white rounded-xl shadow overflow-hidden">

          {vendors.map((v) => (
            <div
              key={v._id}
              className="p-5 border-b flex justify-between"
            >

              <div>
                <h2 className="font-bold">{v.name}</h2>
                <p className="text-gray-500">{v.email}</p>
              </div>

              <span className="text-indigo-600 font-semibold">
                {v.role}
              </span>

            </div>
          ))}

        </div>
      )}

    </div>
  );
};

export default AdminVendors;