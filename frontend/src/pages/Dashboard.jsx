import { useEffect, useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const [title, setTitle] = useState("");
  const [streams, setStreams] = useState([]);
  const navigate = useNavigate();

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

    try {
      await api.post("/stream/create", { title });
      setTitle("");
      loadStreams();
    } catch (err) {
      console.error("Create failed", err);
    }
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

  function shareStream(id) {
    const link = `${window.location.origin}/watch/${id}`;
    navigator.clipboard.writeText(link);
    alert("Stream link copied!");
  }

  function copyRTMPKey(streamKey) {
    navigator.clipboard.writeText(
      `rtmp://localhost:1935/stream/${streamKey}`
    );
    alert("RTMP URL copied!");
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("guestId");
    localStorage.removeItem("guestName");
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>

        <button
          onClick={logout}
          className="bg-red-600 px-4 py-1 rounded text-sm"
        >
          Logout
        </button>
      </div>

      {/* CREATE STREAM */}
      <div className="mb-8 flex gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Stream title"
          className="bg-neutral-800 p-2 rounded w-64"
        />
        <button
          onClick={createStream}
          className="bg-blue-600 px-4 rounded"
        >
          Create Stream
        </button>
      </div>

      {/* STREAM LIST */}
      <div className="space-y-4">
        {streams.map((s) => (
          <div
            key={s.id}
            className="bg-neutral-900 p-4 rounded flex flex-col gap-3"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-lg">
                  {s.title}
                </div>
                <div className="text-sm text-neutral-400">
                  Status:{" "}
                  <span
                    className={
                      s.status === "LIVE"
                        ? "text-green-400"
                        : "text-gray-400"
                    }
                  >
                    {s.status}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
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

                <button
                  onClick={() => shareStream(s.id)}
                  className="bg-purple-600 px-3 py-1 rounded text-sm"
                >
                  Share Link
                </button>
              </div>
            </div>

            {/* RTMP INFO */}
            {s.stream_key && (
              <div className="bg-neutral-800 p-3 rounded text-sm flex justify-between items-center">
                <div className="truncate">
                  rtmp://localhost:1935/stream/{s.stream_key}
                </div>
                <button
                  onClick={() => copyRTMPKey(s.stream_key)}
                  className="bg-yellow-600 px-3 py-1 rounded text-xs"
                >
                  Copy RTMP
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}