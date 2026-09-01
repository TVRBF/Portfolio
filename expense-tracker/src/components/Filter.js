import React, { useContext } from "react";
import { ExpenseContext } from "../context/ExpenseContext";

function Filter() {
  const { filterCategory, setFilterCategory } = useContext(ExpenseContext);

  return (
    <div className="mt-4 mb-4 flex justify-center">
      <select
        value={filterCategory}
        onChange={(e) => setFilterCategory(e.target.value)}
        className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        <option value="All">All Categories</option>
        <option value="Food">Food</option>
        <option value="Travel">Travel</option>
        <option value="Bills">Bills</option>
        <option value="Shopping">Shopping</option>
        <option value="Other">Other</option>
      </select>
    </div>
  );
}

export default Filter;