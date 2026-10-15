const { defineConfig } = require("vite");
const vue = require("@vitejs/plugin-vue");
const path = require("node:path");
const { attachRecruitmentApi } = require("./server/api.cjs");
const { loadLocalEnv } = require("./server/env.cjs");
const { createMysqlApplicationStore, createMysqlPool } = require("./server/mysqlStore.cjs");

function recruitmentApiPlugin() {
  let middleware = null;
  let starting = null;

  function ensureMiddleware() {
    if (!starting) {
      loadLocalEnv();
      starting = createMysqlPool()
        .then((pool) => {
          middleware = attachRecruitmentApi(null, { store: createMysqlApplicationStore(pool) });
        })
        .catch((error) => {
          starting = null;
          throw error;
        });
    }
    return starting;
  }

  function handle(req, res, next) {
    const pathname = (req.url || "").split("?")[0];
    if (!pathname.startsWith("/api/")) {
      next();
      return;
    }
    ensureMiddleware()
      .then(() => middleware(req, res, next))
      .catch((error) => {
        console.error(error.message || error);
        if (res.headersSent || res.writableEnded) return;
        res.statusCode = 503;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ message: "报名数据库暂时不可用。请确认本机 MySQL 已启动。" }));
      });
  }

  return {
    name: "recruitment-api",
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}

module.exports = defineConfig({
  plugins: [vue(), recruitmentApiPlugin()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
  },
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
