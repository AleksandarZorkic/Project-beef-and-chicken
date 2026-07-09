import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { AppRole } from "./roles";

type RoleProtectedRouteProps = {
  allowedRoles: AppRole[];
};

export default function RoleProtectedRoute({
  allowedRoles,
}: RoleProtectedRouteProps) {
  const { isAuthenticated, hasAnyRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAnyRole(allowedRoles)) {
    return <Navigate to="/menu" replace />;
  }

  return <Outlet />;
}
