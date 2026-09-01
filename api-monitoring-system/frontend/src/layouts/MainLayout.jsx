import { Link } from "react-router-dom";

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 p-5">
          <h1 className="text-2xl font-bold mb-10">
            API Monitor
          </h1>

          <nav className="flex flex-col gap-4">
            <Link to="/">Dashboard</Link>

            <Link to="/add-api">Add API</Link>

            <Link to="/logs">Logs</Link>
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;