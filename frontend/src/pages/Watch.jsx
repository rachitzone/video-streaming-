import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Hls from "hls.js";
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";

const SOCKET_URL = "http://192.168.0.102:3000";
const HLS_BASE = "http://192.168.0.102:8080/live";

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const chatRef = useRef(null);
  const socketRef = useRef(null);
  const hlsRef = useRef(null);
  const muteTimerRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(false);
  const [muteSeconds, setMuteSeconds] = useState(0);

  const token = localStorage.getItem("token");
  const guestId = localStorage.getItem("guestId");
  const guestName = localStorage.getItem("guestName");

  const user = token ? jwtDecode(token) : null;
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!token && !guestId) navigate("/login");
  }, []);

  useEffect(() => {
    loadStream();
    initSocket();

    return () => {
      socketRef.current?.disconnect();
      hlsRef.current?.destroy();
      clearInterval(muteTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  async function loadStream() {
    try {
      const res = await api.get(`/stream/${id}`);
      const url = `${HLS_BASE}/${res.data.stream_key}.m3u8`;

      if (Hls.isSupported()) {
        const hls = new Hls({
          lowLatencyMode: true,
          liveSyncDurationCount: 1,
          liveMaxLatencyDurationCount: 2,
          maxBufferLength: 5,
          maxMaxBufferLength: 10,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(videoRef.current);
      } else {
        videoRef.current.src = url;
      }
    } catch (e) {
      console.log(e);
    }
  }

  function initSocket() {
    socketRef.current = io(SOCKET_URL, {
      auth: { token, guestId, guestName },
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("joinStream", Number(id));
    });

    socketRef.current.on("chatHistory", setMessages);
    socketRef.current.on("chatMessage", (m) =>
      setMessages((prev) => [...prev, m])
    );
    socketRef.current.on("viewerCount", setViewerCount);
  }

  function send() {
    if (muted || !input.trim()) return;

    socketRef.current.emit("chatMessage", {
      streamId: Number(id),
      message: input,
    });

    setInput("");
  }

  function logout() {
    localStorage.clear();
    navigate("/login");
  }

  function share() {
    const url = window.location.href;

    if (navigator.share) {
      navigator
        .share({
          title: "Live Stream",
          text: "Watch this stream:",
          url: url,
        })
        .then(() => showToast())
        .catch(() => {});
      return;
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(url)
        .then(() => showToast())
        .catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    showToast();
  }

  function showToast() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* 🔥 IMPORTANT CHANGE HERE */}
      <div className="h-screen bg-black text-white flex flex-col md:flex-row overflow-hidden">

        {/* VIDEO SECTION */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center px-4 py-3 bg-black border-b border-neutral-800">
            <div className="text-sm truncate max-w-[60%]">
              👤 {token ? user?.name : guestName}
            </div>

            <div className="flex gap-2">
              <button
                onClick={share}
                className="bg-blue-600 px-3 py-1 rounded text-xs md:text-sm"
              >
                Share
              </button>

              <button
                onClick={logout}
                className="bg-red-600 px-3 py-1 rounded text-xs md:text-sm"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="w-full bg-black aspect-video">
            <video
              ref={videoRef}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* CHAT */}
        {/* 🔥 IMPORTANT CHANGE HERE */}
        <div className="md:w-[400px] w-full flex flex-col bg-neutral-950 border-t md:border-t-0 md:border-l border-neutral-800 min-h-0">

          <div className="p-3 border-b border-neutral-800 text-sm">
            👁 {viewerCount} watching
          </div>

          {/* 🔥 IMPORTANT CHANGE HERE */}
          <div
            ref={chatRef}
            className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2"
          >
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
              disabled={muted}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded bg-neutral-800 text-sm"
              placeholder={muted ? "You are muted..." : "Type a message"}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button
              onClick={send}
              disabled={muted}
              className="px-4 rounded bg-blue-500 text-sm"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {copied && (
        <div className="fixed bottom-6 right-6 bg-green-600 px-4 py-2 rounded shadow text-sm">
          Link copied ✓
        </div>
      )}
    </>
  );
}