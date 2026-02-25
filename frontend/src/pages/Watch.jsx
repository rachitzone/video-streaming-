import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import Hls from "hls.js";
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";

const SOCKET_URL = "http://192.168.0.101:3000";
const HLS_BASE = "http://192.168.0.101:8080/live";

export default function Watch() {
  const { id } = useParams();
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const hlsRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [viewerCount, setViewerCount] = useState(0);

  const token = localStorage.getItem("token");

  // Guest handling
  let guestId = localStorage.getItem("guestId");
  if (!token && !guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem("guestId", guestId);
  }

  const user = token ? jwtDecode(token) : null;

  useEffect(() => {
    loadStream();
    initSocket();

    return () => {
      socketRef.current?.disconnect();
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  async function loadStream() {
    const res = await api.get(`/stream/${id}`);
    const hlsUrl = `${HLS_BASE}/${res.data.stream_key}.m3u8`;

    const video = videoRef.current;
    if (!video) return;

    video.playsInline = true;
    video.muted = false;

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,

        // 🔥 Stable LL-HLS settings
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,

        maxBufferLength: 15,
        maxMaxBufferLength: 30,

        enableWorker: true,
      });

      hlsRef.current = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      // Error recovery only
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.destroy();
          }
        }
      });

    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
      });
    }
  }

  function initSocket() {
    socketRef.current = io(SOCKET_URL, {
      auth: {
        token: token || null,
        guestId: guestId || null,
      },
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("joinStream", Number(id));
    });

    socketRef.current.on("chatHistory", setMessages);

    socketRef.current.on("chatMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socketRef.current.on("chatMessageUpdated", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, deleted: true } : m
        )
      );
    });

    socketRef.current.on("viewerCount", setViewerCount);
  }

  function send() {
    if (!input.trim()) return;

    socketRef.current.emit("chatMessage", {
      streamId: Number(id),
      message: input,
    });

    setInput("");
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutral-950 text-white">
      <div className="w-full md:flex-1 flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          className="w-full md:h-full object-contain"
        />
      </div>

      <div className="w-full md:w-[400px] border-t md:border-l border-neutral-800 flex flex-col">
        <div className="p-3 border-b border-neutral-800">
          👁 {viewerCount} watching
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-2 rounded text-sm ${
                m.deleted
                  ? "bg-neutral-800 text-gray-400 italic"
                  : "bg-neutral-900"
              }`}
            >
              <b
                className={
                  m.role === "ADMIN"
                    ? "text-red-400"
                    : m.role === "GUEST"
                    ? "text-green-400"
                    : "text-blue-400"
                }
              >
                {m.user}
              </b>
              : {m.message}
            </div>
          ))}
        </div>

        <div className="p-2 flex gap-2 border-t border-neutral-800">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message"
            className="flex-1 px-3 py-2 rounded bg-neutral-800"
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button
            onClick={send}
            className="px-4 rounded bg-blue-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}