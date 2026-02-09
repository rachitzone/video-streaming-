import { useEffect, useState } from "react";
import api from "../api/axios";

export default function AdminDashboard() {
  const [title, setTitle] = useState("");
  const [streams, setStreams] = useState([]);

  // ✅ LOAD STREAMS ON PAGE LOAD
  useEffect(() => {
    loadStreams();
  }, []);

  async function loadStreams() {
    try {
      const res = await api.get("/stream/my");
      setStreams(res.data);
    } catch (err) {
      console.error("Failed to load streams", err);
    }
  }

  async function createStream() {
    if (!title.trim()) return alert("Enter title");

    await api.post("/stream/create", { title });
    setTitle("");
    loadStreams(); // refresh list
  }

  async function startStream(id) {
    await api.post(`/stream/start/${id}`);
    loadStreams();
  }

  async function stopStream(id) {
    await api.post(`/stream/stop/${id}`);
    loadStreams();
  }

  function watchStream(id) {
    window.open(`/watch/${id}`, "_blank");
  }

  return (
    <div className="p-6 text-white bg-neutral-950 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      {/* CREATE STREAM */}
      <div className="mb-6 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Stream title"
          className="bg-neutral-800 p-2 rounded w-64"
        />
        <button
          onClick={createStream}
          className="bg-blue-500 px-4 rounded"
        >
          Create
        </button>
      </div>

      {/* STREAM LIST */}
      <div className="space-y-3">
        {streams.map((s) => (
          <div
            key={s.id}
            className="bg-neutral-900 p-4 rounded flex justify-between items-center"
          >
            <div>
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm text-neutral-400">
                Status: {s.status}
              </div>
            </div>

            <div className="flex gap-2">
              {s.status !== "LIVE" && (
                <button
                  onClick={() => startStream(s.id)}
                  className="bg-green-600 px-3 py-1 rounded text-sm"
                >
                  Start
                </button>
              )}

              {s.status === "LIVE" && (
                <>
                  <button
                    onClick={() => watchStream(s.id)}
                    className="bg-blue-600 px-3 py-1 rounded text-sm"
                  >
                    Watch
                  </button>

                  <button
                    onClick={() => stopStream(s.id)}
                    className="bg-red-600 px-3 py-1 rounded text-sm"
                  >
                    Stop
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
