import {
  useEffect,
  useState,
  useContext,
} from "react";

import API from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";

const AdminUsers = () => {

  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);

  useEffect(() => {

    if (!user?.token) return;

    const fetchUsers = async () => {
      try {

        const res = await API.get("/admin/users", {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        setUsers(res.data.users);

      } catch (error) {
        console.log(error);
      }
    };

    fetchUsers();

  }, [user?.token]);

  return (
    <div>

      <h1 className="text-4xl font-bold mb-8">
        All Users
      </h1>

      <div className="bg-white rounded-2xl shadow overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Role</th>
            </tr>
          </thead>

          <tbody>

            {users.map((u) => (
              <tr key={u._id} className="border-t">

                <td className="p-4">{u.name}</td>
                <td className="p-4">{u.email}</td>
                <td className="p-4 capitalize">{u.role}</td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
};

export default AdminUsers;