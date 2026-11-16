import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth.tsx";

export function ProtectedRoute() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") return <Navigate to="/" replace />;
  return <Outlet />;
}
