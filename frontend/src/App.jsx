import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/Dashboard";
import Streams from "./pages/LiveStreams";
import Watch from "./pages/Watch";
import ProtectedRoute from "./router/ProtectedRoute";
import Register from "./pages/Register";



<Route path="/register" element={<Register />} />;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
      
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/streams"
          element={
            <ProtectedRoute>
              <Streams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/watch/:id"
          element={
            <ProtectedRoute>
              <Watch />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={<h1 className="text-white">404 Not Found</h1>}
        />
      </Routes>
    </BrowserRouter>
  );
}
