import React, { useState } from "react";
import { ExpenseProvider } from "./context/ExpenseContext";
import Navbar from "./components/Navbar";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";
import SummaryCards from "./components/SummaryCards";
import ExpenseChart from "./components/ExpenseChart";
import Filter from "./components/Filter";

function App() {
  const [expenseToEdit, setExpenseToEdit] = useState(null);

  return (
    <ExpenseProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <SummaryCards />
          <Filter />
          <ExpenseForm expenseToEdit={expenseToEdit} setExpenseToEdit={setExpenseToEdit} />
          <ExpenseList setExpenseToEdit={setExpenseToEdit} />
          <ExpenseChart />
        </div>
      </div>
    </ExpenseProvider>
  );
}

export default App;