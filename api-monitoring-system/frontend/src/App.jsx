import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Dashboard from "./pages/Dashboard";
import AddApi from "./pages/AddApi";
import Logs from "./pages/Logs";

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/add-api"
            element={<AddApi />}
          />

          <Route
            path="/logs"
            element={<Logs />}
          />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;