import { useEffect, useState } from "react";
import api from "../api/axios";
import { Link } from "react-router-dom";

export default function LiveStreams() {
  const [streams, setStreams] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await api.get("/stream");
    setStreams(res.data.filter((s) => s.status === "LIVE"));
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-6 text-blue-400">
        🔴 Live Streams
      </h1>

      {streams.length === 0 && (
        <p className="text-neutral-500">No live streams right now</p>
      )}

      <div className="grid grid-cols-3 gap-6">
        {streams.map((s) => (
          <Link
            key={s.id}
            to={`/watch/${s.id}`}
            className="bg-neutral-900 p-4 rounded-lg hover:bg-neutral-800"
          >
            <h2 className="font-semibold">{s.title}</h2>
            <p className="text-sm text-red-400 mt-1">LIVE</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
