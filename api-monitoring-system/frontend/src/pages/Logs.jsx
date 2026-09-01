import { useEffect, useState } from "react";

import api from "../api/api";

const Logs = () => {
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    try {
      const res = await api.get("/apis/logs/all");

      setLogs(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">
        Logs
      </h1>

      <div className="overflow-x-auto bg-slate-900 rounded-xl">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="p-4 text-left">
                API
              </th>

              <th className="p-4 text-left">
                Status
              </th>

              <th className="p-4 text-left">
                Response Time
              </th>

              <th className="p-4 text-left">
                Status Code
              </th>

              <th className="p-4 text-left">
                Checked At
              </th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log) => (
              <tr
                key={log._id}
                className="border-t border-slate-800"
              >
                <td className="p-4">
                  {log.apiId?.name}
                </td>

                <td
                  className={`p-4 font-bold ${
                    log.status === "UP"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {log.status}
                </td>

                <td className="p-4">
                  {log.responseTime}ms
                </td>

                <td className="p-4">
                  {log.statusCode}
                </td>

                <td className="p-4">
                  {new Date(
                    log.checkedAt
                  ).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Logs;