import React, { useState, useEffect, useContext } from "react";
import { ExpenseContext } from "../context/ExpenseContext";

function ExpenseForm({ expenseToEdit, setExpenseToEdit }) {
  const { addOrEditExpense } = useContext(ExpenseContext);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");

  useEffect(() => {
    if (expenseToEdit) {
      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount);
      setCategory(expenseToEdit.category);
    }
  }, [expenseToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedDesc = description.trim();
    const parsedAmount = Number(amount);
    if (!trimmedDesc || !parsedAmount || parsedAmount <= 0) return;

    const expense = {
      id: expenseToEdit ? expenseToEdit.id : Date.now(),
      description: trimmedDesc,
      amount: parsedAmount,
      category,
    };

    addOrEditExpense(expense);

    setDescription("");
    setAmount("");
    setCategory("Food");
    setExpenseToEdit(null); // reset edit
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-4 bg-gray-100 rounded-lg shadow-sm"
    >
      <input
        type="text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
      />

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        <option value="Food">Food</option>
        <option value="Travel">Travel</option>
        <option value="Bills">Bills</option>
        <option value="Shopping">Shopping</option>
        <option value="Other">Other</option>
      </select>

      <button
        type="submit"
        className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded transition"
      >
        {expenseToEdit ? "Update Expense" : "Add Expense"}
      </button>
    </form>
  );
}

export default ExpenseForm;