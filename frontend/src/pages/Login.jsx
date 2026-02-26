import { useState } from "react";
import api from "../api/axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const navigate = useNavigate();

  /* ======================
     LOGIN (REGISTERED USER)
  ====================== */
  async function login() {
    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      const token = res.data.access_token;

      localStorage.removeItem("guestId");
      localStorage.removeItem("guestName");

      localStorage.setItem("token", token);

      const decoded = jwtDecode(token);

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

  /* ======================
     JOIN AS GUEST (FINAL FIX)
  ====================== */
  async function joinAsGuest() {
    if (!guestName.trim()) {
      alert("Please enter a guest name");
      return;
    }

    try {
      localStorage.removeItem("token");

      const guestId = crypto.randomUUID();
      localStorage.setItem("guestId", guestId);
      localStorage.setItem("guestName", guestName);

      const res = await api.get("/stream");

      console.log("Streams:", res.data);

      if (!res.data || res.data.length === 0) {
        alert("No streams available");
        return;
      }

      const liveStream = res.data.find(
        (s) => s.status?.toUpperCase() === "LIVE"
      );

      const streamId = liveStream
        ? liveStream.id
        : res.data[0].id;

      // 🔥 FORCE REDIRECT (No router issue)
      window.location.href = `/watch/${streamId}`;

    } catch (err) {
      console.error("Stream fetch error:", err);
      alert("Failed to load streams");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-6 rounded w-80">

        <h2 className="text-xl mb-4 text-center">Login</h2>

        {/* EMAIL LOGIN */}
        <input
          className="w-full p-2 mb-2 bg-zinc-800 rounded"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full p-2 mb-4 bg-zinc-800 rounded"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="w-full bg-blue-500 p-2 rounded mb-4"
        >
          Login
        </button>

        <div className="text-center text-gray-500 text-sm mb-3">
          ─── OR ───
        </div>

        {/* GUEST LOGIN */}
        <input
          className="w-full p-2 mb-2 bg-zinc-800 rounded"
          placeholder="Enter Guest Name"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
        />

        <button
          onClick={joinAsGuest}
          className="w-full bg-gray-700 p-2 rounded"
        >
          Join as Guest
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