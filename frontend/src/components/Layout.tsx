import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth.tsx";

function navClass({ isActive }: { isActive: boolean }) {
  return `px-3 py-1.5 rounded text-sm font-medium ${isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-200"}`;
}

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold text-slate-900">
            coditar
          </Link>
          <nav className="flex items-center gap-2">
            <NavLink to="/" end className={navClass}>
              Problems
            </NavLink>
            <NavLink to="/submissions" className={navClass}>
              My Submissions
            </NavLink>
            {user?.role === "ADMIN" && (
              <NavLink to="/admin/problems/new" className={navClass}>
                New Problem
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>
              {user?.name} <span className="text-slate-400">({user?.role})</span>
            </span>
            <button onClick={logout} className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
