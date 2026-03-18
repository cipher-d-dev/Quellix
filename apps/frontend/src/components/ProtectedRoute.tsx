import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./ui/Spinner";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#000" }}
      >
        <Spinner size={18} />
      </div>
    );

  return isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate to="/signin" state={{ from: location }} replace />
  );
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#000" }}
      >
        <Spinner size={18} />
      </div>
    );

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
