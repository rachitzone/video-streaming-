import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function ProtectedRoute({ children, adminOnly }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const user = jwtDecode(token);

  if (adminOnly && user.role !== "ADMIN") {
    return <Navigate to="/streams" replace />;
  }

  return children;
}
