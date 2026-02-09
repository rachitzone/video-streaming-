import { useState } from "react";
import api from "../api/axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function login() {
    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      const token = res.data.access_token;
      localStorage.setItem("token", token);

      const decoded = jwtDecode(token);

      // 🔀 Redirect based on role
      if (decoded.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/streams");
      }
    } catch (err) {
      alert("Login failed");
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-6 rounded w-80">
        <h2 className="text-xl mb-4">Login</h2>

        <input
          className="w-full p-2 mb-2 bg-zinc-800"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full p-2 mb-4 bg-zinc-800"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={login} className="w-full bg-blue-500 p-2 rounded">
          Login
        </button>
        <p className="text-sm text-center mt-4 text-gray-400">
          New user?{" "}
          <Link to="/register" className="text-blue-400">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
