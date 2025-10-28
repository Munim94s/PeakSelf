import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false,
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Enable minification
    minify: "esbuild",
    // Target modern browsers for better optimization
    target: "es2020",
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and router
          vendor: ["react", "react-dom", "react-router-dom"],
          // Separate chunk for lucide icons (will be optimized next)
          icons: ["lucide-react"],
        },
      },
    },
    // Set chunk size warning limit
    chunkSizeWarningLimit: 600,
  },
});
