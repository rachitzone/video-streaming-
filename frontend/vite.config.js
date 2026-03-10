import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,          // 🔥 allow mobile access
    port: 5173,
    strictPort: true,

    // 🔥 IMPORTANT — Proxy to backend
    proxy: {
      "/api": {
        target: "http://192.168.0.103:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});