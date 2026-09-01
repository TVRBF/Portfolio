import React, { useContext } from "react";
import { ExpenseContext } from "../context/ExpenseContext";

function SummaryCards() {
  const { expenses, income, setIncome } = useContext(ExpenseContext);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = income - totalExpenses;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
      {/* Income */}
      <div className="bg-green-100 p-4 rounded-lg shadow-sm text-center">
        <h3 className="text-sm font-medium text-green-700">Total Income</h3>
        <input
          type="number"
          value={income}
          onChange={(e) => setIncome(Number(e.target.value))}
          className="mt-2 w-full p-2 border rounded text-center focus:outline-none focus:ring-2 focus:ring-green-300"
          placeholder="Enter Income"
        />
      </div>

      {/* Expenses */}
      <div className="bg-red-100 p-4 rounded-lg shadow-sm text-center">
        <h3 className="text-sm font-medium text-red-700">Total Expenses</h3>
        <p className="text-2xl font-bold text-red-800">₹{totalExpenses.toFixed(2)}</p>
      </div>

      {/* Balance */}
      <div className="bg-blue-100 p-4 rounded-lg shadow-sm text-center">
                <h3 className="text-sm font-medium text-blue-700">Balance</h3>
        <p className="text-2xl font-bold text-blue-800">
          ₹{balance.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

export default SummaryCards;