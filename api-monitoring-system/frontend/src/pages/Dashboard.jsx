import { useEffect, useState } from "react";

import api from "../api/api";

import ApiTable from "../components/ApiTable";
import ResponseChart from "../charts/ResponseChart";

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [apis, setApis] = useState([]);
  const [logs, setLogs] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, apisRes, logsRes] = await Promise.all([
        api.get("/apis/stats/dashboard"),
        api.get("/apis"),
        api.get("/apis/logs/all"),
      ]);

      setStats(statsRes.data);
      setApis(apisRes.data);
      setLogs(logsRes.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchDashboardData();
    };

    loadData();

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">
          Monitoring Dashboard
        </h1>

        <div className="text-slate-400">
          Auto Refresh: 30s
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 p-6 rounded-xl">
          <h2 className="text-slate-400">Total APIs</h2>
          <p className="text-4xl font-bold mt-4">
            {stats.totalApis || 0}
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <h2 className="text-slate-400">APIs UP</h2>
          <p className="text-4xl font-bold text-green-500 mt-4">
            {stats.upApis || 0}
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <h2 className="text-slate-400">APIs DOWN</h2>
          <p className="text-4xl font-bold text-red-500 mt-4">
            {stats.downApis || 0}
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <h2 className="text-slate-400">Avg Response</h2>
          <p className="text-4xl font-bold text-cyan-400 mt-4">
            {stats.avgResponseTime || 0}ms
          </p>
        </div>
      </div>

      <div className="mb-8">
        <ResponseChart logs={logs} />
      </div>

      <ApiTable
        apis={apis}
        refreshApis={fetchDashboardData}
      />
    </div>
  );
};

export default Dashboard;