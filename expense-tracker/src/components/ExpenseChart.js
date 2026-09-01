import React, { useContext } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { ExpenseContext } from "../context/ExpenseContext";

ChartJS.register(ArcElement, Tooltip, Legend);

function ExpenseChart() {
  const { expenses, filterCategory } = useContext(ExpenseContext);

  const categories = ["Food", "Travel", "Bills", "Shopping", "Other"];
  const categoryTotals = categories.map((cat) =>
    expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0)
  );

  const data = {
    labels: categories,
    datasets: [
      {
        data: categoryTotals,
        backgroundColor: ["#34D399", "#60A5FA", "#FBBF24", "#F87171", "#A78BFA"],
      },
    ],
  };

  return (
    <div className="bg-white p-4 rounded shadow mt-6">
      <h2 className="text-xl font-semibold mb-4 text-center">Expenses by Category</h2>
      <Pie data={data} />
    </div>
  );
}

export default ExpenseChart;