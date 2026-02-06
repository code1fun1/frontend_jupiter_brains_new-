import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useProxy = env.VITE_USE_VITE_PROXY === "true";
  const backendBaseUrl = env.VITE_BACKEND_BASE_URL;

  if (!backendBaseUrl) {
    throw new Error('VITE_BACKEND_BASE_URL is not configured. Please set it in your .env file.');
  }

  const cleanedBackendUrl = backendBaseUrl.replace(/\/$/, "");

  // When using proxy, set backend URL to empty for relative paths
  const proxyBackendUrl = useProxy ? "" : cleanedBackendUrl;

  return {
    server: {
      host: "::",
      port: 5173,
      hmr: {
        overlay: false,
      },
      proxy: useProxy
        ? {
            "/api": {
              target: cleanedBackendUrl,
              changeOrigin: true,
              secure: false,
            },
            "/openai": {
              target: cleanedBackendUrl,
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },
    plugins: [react()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "import.meta.env.VITE_PROXY_BACKEND_URL": JSON.stringify(proxyBackendUrl),
    },
  };
});
