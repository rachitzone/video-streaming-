import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import Hls from "hls.js";
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";

const SOCKET_URL = "http://localhost:3000";
const HLS_BASE = "http://localhost:8080/live";

export default function Watch() {
  const { id } = useParams();
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const muteTimerRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [viewerCount, setViewerCount] = useState(0);

  const [muted, setMuted] = useState(false);
  const [muteSeconds, setMuteSeconds] = useState(0);

  const token = localStorage.getItem("token");
  const user = token ? jwtDecode(token) : null;
  const isAdmin = user?.role === "ADMIN";

  /* =======================
     INIT
  ======================= */
  useEffect(() => {
    loadStream();
    initSocket();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      clearInterval(muteTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =======================
     VIDEO
  ======================= */
  async function loadStream() {
    const res = await api.get(`/stream/${id}`);
    const hlsUrl = `${HLS_BASE}/${res.data.stream_key}.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current);
    } else {
      videoRef.current.src = hlsUrl;
    }
  }

  /* =======================
     SOCKET
  ======================= */
  function initSocket() {
    if (socketRef.current) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("joinStream", Number(id));
    });

    socketRef.current.on("chatHistory", setMessages);

    socketRef.current.on("chatMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // 🔄 message updated (delete → inline replace)
    socketRef.current.on("chatMessageUpdated", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m } : m
        )
      );
    });

    socketRef.current.on("viewerCount", setViewerCount);

    /* 🔇 YOU ARE MUTED */
    socketRef.current.on("youAreMuted", ({ secondsLeft }) => {
      setMuted(true);
      setMuteSeconds(secondsLeft);

      clearInterval(muteTimerRef.current);
      muteTimerRef.current = setInterval(() => {
        setMuteSeconds((s) => {
          if (s <= 1) {
            clearInterval(muteTimerRef.current);
            setMuted(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    });

    /* 🔓 YOU ARE UNMUTED */
    socketRef.current.on("userUnmuted", ({ userId }) => {
      if (userId === user?.sub) {
        setMuted(false);
        setMuteSeconds(0);
        clearInterval(muteTimerRef.current);
      }
    });
  }

  /* =======================
     CHAT ACTIONS
  ======================= */
  function send() {
    if (muted || !input.trim()) return;

    socketRef.current.emit("chatMessage", {
      streamId: Number(id),
      message: input,
    });

    setInput("");
  }

  function deleteMsg(messageId) {
    if (!isAdmin) return;

    socketRef.current.emit("adminDeleteMessage", {
      streamId: Number(id),
      messageId,
    });
  }

  function muteUser(userId) {
    if (!isAdmin) return;

    socketRef.current.emit("adminMuteUser", {
      streamId: Number(id),
      userId,
      duration: 300,
    });
  }

  /* =======================
     UI
  ======================= */
  return (
    <div className="h-screen flex bg-neutral-950 text-white">
      {/* VIDEO */}
      <div className="flex-1 flex items-center justify-center">
        <video ref={videoRef} controls autoPlay className="w-full h-full" />
      </div>

      {/* CHAT */}
      <div className="w-[400px] border-l border-neutral-800 flex flex-col">
        <div className="p-3 border-b border-neutral-800">
          👁 {viewerCount} watching
        </div>

        {muted && (
          <div className="bg-red-500/10 text-red-400 text-xs p-2 text-center">
            You are muted ({muteSeconds}s)
          </div>
        )}

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
              <div className="flex justify-between gap-2">
                <span>
                  <b
                    className={
                      m.role === "ADMIN"
                        ? "text-red-400"
                        : "text-blue-400"
                    }
                  >
                    {m.deleted
                      ? m.userId === user?.sub
                        ? "You"
                        : m.user
                      : m.user}
                  </b>
                  : {m.message}
                </span>

                {isAdmin && !m.deleted && (
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => deleteMsg(m.id)}
                      className="text-red-400"
                    >
                      ❌
                    </button>
                    <button
                      onClick={() => muteUser(m.userId)}
                      className="text-yellow-400"
                    >
                      🔇
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* INPUT */}
        <div className="p-2 flex gap-2 border-t border-neutral-800">
          <input
            value={input}
            disabled={muted}
            onChange={(e) => setInput(e.target.value)}
            placeholder={muted ? "You are muted…" : "Type a message"}
            className={`flex-1 px-3 py-2 rounded ${
              muted ? "bg-neutral-700" : "bg-neutral-800"
            }`}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button
            onClick={send}
            disabled={muted}
            className={`px-4 rounded ${
              muted ? "bg-gray-600" : "bg-blue-500"
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
