import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axios";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function register() {
    if (!name || !email || !password) {
      alert("All fields required");
      return;
    }

    try {
      await axios.post("/auth/register", {
        name,
        email,
        password,
      });

      alert("Registered successfully. Login now.");
      navigate("/login");
    } catch (err) {
      alert("Registration failed");
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-6 rounded w-80">
        <h2 className="text-xl mb-4">Register</h2>

        <input
          className="w-full p-2 mb-2 bg-zinc-800 rounded"
          placeholder="Name"
          onChange={(e) => setName(e.target.value)}
        />

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
          onClick={register}
          className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded"
        >
          Register
        </button>

        <p className="text-sm text-center mt-4 text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
