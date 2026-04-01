import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1
            className="cursor-pointer text-xl font-bold text-indigo-600"
            onClick={() => navigate("/products")}
          >
            Product Manager
          </h1>
          <button
            onClick={handleLogout}
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
