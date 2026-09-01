import React, { useContext } from "react";
import { ExpenseContext } from "../context/ExpenseContext";

function ExpenseList({ setExpenseToEdit }) {
  const { expenses, deleteExpense, filterCategory } = useContext(ExpenseContext);

  const filteredExpenses =
    filterCategory === "All"
      ? expenses
      : expenses.filter((e) => e.category === filterCategory);

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-3 text-gray-800">Expenses</h2>

      {filteredExpenses.length === 0 ? (
        <p className="text-gray-500 text-sm">No expenses added yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredExpenses.map((exp) => (
            <li
              key={exp.id}
              className="flex justify-between items-center p-3 hover:bg-gray-50 transition"
            >
              <div className="flex flex-col">
                <span className="font-medium text-gray-800">{exp.description}</span>
                <span className="text-xs text-gray-500">{exp.category}</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-blue-600 font-semibold">
                  ₹{Number(exp.amount).toFixed(2)}
                </span>

                <button
                  onClick={() => setExpenseToEdit(exp)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded text-sm transition"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteExpense(exp.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ExpenseList;