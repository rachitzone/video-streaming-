import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/Dashboard";
import Streams from "./pages/LiveStreams";
import Watch from "./pages/Watch";
import ProtectedRoute from "./router/ProtectedRoute";
import Register from "./pages/Register";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* DEFAULT */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ADMIN ONLY */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* PUBLIC STREAM LIST (Guest allowed) */}
        <Route path="/streams" element={<Streams />} />

        {/* PUBLIC WATCH (Guest allowed) */}
        <Route path="/watch/:id" element={<Watch />} />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-black text-white text-2xl">
              404 Not Found
            </div>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}