const { defineConfig } = require("vite");
const vue = require("@vitejs/plugin-vue");
const path = require("node:path");

module.exports = defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/vue")) return "vendor-vue";
          return undefined;
        },
      },
    },
  },
});
