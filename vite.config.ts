import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const backendProxy = {
  "/graphql": { target: "http://127.0.0.1:3008", changeOrigin: true },
  "/csrf-token": { target: "http://127.0.0.1:3008", changeOrigin: true },
  "/csrf": { target: "http://127.0.0.1:3008", changeOrigin: true },
  "/uploads": { target: "http://127.0.0.1:3008", changeOrigin: true },
  "/socket.io": { target: "http://127.0.0.1:3008", changeOrigin: true, ws: true },
};

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "0.0.0.0",
    port: 8088,
    strictPort: true,
    allowedHosts: ["myroomi.tech", "www.myroomi.tech"],
    proxy: backendProxy,
  },
  preview: {
    host: "0.0.0.0",
    port: 8088,
    strictPort: true,
    allowedHosts: ["myroomi.tech", "www.myroomi.tech"],
    proxy: backendProxy,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
