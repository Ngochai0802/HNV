import { Navigate } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";

export default function PrivateRoute({ children, roles }) {
  const { user, accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role))
    return <Navigate to="/login" replace />;
  return children;
}
