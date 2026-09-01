import React, { createContext, useState, useEffect } from "react";
import { saveExpenses, loadExpenses } from "../utils/storage";

export const ExpenseContext = createContext();

export const ExpenseProvider = ({ children }) => {
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState(0);
  const [filterCategory, setFilterCategory] = useState("All");

  // Load from LocalStorage on start
  useEffect(() => {
    const savedExpenses = loadExpenses();
    setExpenses(savedExpenses.expenses || []);
    setIncome(savedExpenses.income || 0);
  }, []);

  // Save to LocalStorage whenever expenses or income change
  useEffect(() => {
    saveExpenses({ expenses, income });
  }, [expenses, income]);

  const addOrEditExpense = (expense) => {
    setExpenses((prev) => {
      const exists = prev.find((e) => e.id === expense.id);
      if (exists) {
        return prev.map((e) => (e.id === expense.id ? expense : e));
      } else {
        return [...prev, expense];
      }
    });
  };

  const deleteExpense = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        addOrEditExpense,
        deleteExpense,
        income,
        setIncome,
        filterCategory,
        setFilterCategory,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};