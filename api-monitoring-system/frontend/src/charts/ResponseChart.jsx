import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const ResponseChart = ({ logs }) => {
  const chartData = logs
    .slice(0, 10)
    .reverse()
    .map((log) => ({
      time: new Date(
        log.checkedAt
      ).toLocaleTimeString(),

      responseTime: log.responseTime,
    }));

  return (
    <div className="bg-slate-900 p-6 rounded-xl">
      <h2 className="text-xl font-bold mb-6">
        Response Time Analytics
      </h2>

      <div className="h-80">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <LineChart data={chartData}>
            <XAxis dataKey="time" />

            <YAxis />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="responseTime"
              stroke="#06b6d4"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ResponseChart;