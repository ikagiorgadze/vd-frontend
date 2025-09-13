import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "7a16aba27114.ngrok-free.app"
    ],
    proxy: {
      // REST API → local backend
      '/api': {
        target: 'http://localhost:3000', // your backend
        changeOrigin: true,
        secure: false,
  // Strip the /api prefix when forwarding to backend
  // e.g. /api/v-dem/query -> http://localhost:3000/v-dem/query
  rewrite: (path) => path.replace(/^\/api/, ''),
      },
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
