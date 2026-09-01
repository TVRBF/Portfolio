import toast from "react-hot-toast";
import api from "../api/api";

const ApiTable = ({ apis, refreshApis }) => {
  const deleteApi = async (id) => {
    try {
      await api.delete(`/apis/${id}`);
      toast.success("API Deleted");
      refreshApis();
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white">
          Monitored APIs
        </h2>
      </div>

      {/* Table */}
      <table className="w-full text-white">
        <thead className="bg-slate-800">
          <tr>
            <th className="p-4 text-left">Name</th>
            <th className="p-4 text-left">URL</th>
            <th className="p-4 text-left">Status</th>
            <th className="p-4 text-left">Last Checked</th>
            <th className="p-4 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {/* EMPTY STATE */}
          {apis.length === 0 ? (
            <tr>
              <td
                colSpan="5"
                className="p-8 text-center text-slate-400"
              >
                No APIs Added Yet
              </td>
            </tr>
          ) : (
            apis.map((apiItem) => (
              <tr
                key={apiItem._id}
                className="border-t border-slate-800 hover:bg-slate-800/40"
              >
                <td className="p-4">{apiItem.name}</td>

                <td className="p-4 break-all text-sm text-slate-300">
                  {apiItem.url}
                </td>

                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold ${
                      apiItem.lastStatus === "UP"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {apiItem.lastStatus}
                  </span>
                </td>

                <td className="p-4 text-sm text-slate-300">
                  {apiItem.lastChecked
                    ? new Date(apiItem.lastChecked).toLocaleString()
                    : "Not Checked"}
                </td>

                <td className="p-4">
                  <button
                    onClick={() => deleteApi(apiItem._id)}
                    className="bg-red-600 hover:bg-red-700 transition px-4 py-2 rounded text-white"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ApiTable;