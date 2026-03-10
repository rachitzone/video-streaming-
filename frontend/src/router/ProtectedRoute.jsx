import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function ProtectedRoute({ children, adminOnly }) {

  const token = localStorage.getItem("token");
  const guestId = localStorage.getItem("guestId");

  // 🔥 Allow guest OR logged user
  if (!token && !guestId) {
    return <Navigate to="/login" replace />;
  }

  // 🔥 If admin route, only allow ADMIN token
  if (adminOnly) {
    if (!token) {
      return <Navigate to="/login" replace />;
    }

    try {
      const user = jwtDecode(token);

      if (user.role !== "ADMIN") {
        return <Navigate to="/streams" replace />;
      }
    } catch (err) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}