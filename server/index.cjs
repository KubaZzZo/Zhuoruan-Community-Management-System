const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { attachRecruitmentApi } = require("./api.cjs");
const { loadLocalEnv } = require("./env.cjs");
const { createMysqlApplicationStore, createMysqlPool } = require("./mysqlStore.cjs");

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", contentSecurityPolicy);
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

function sendFile(req, res, filePath) {
  const stream = fs.createReadStream(filePath);
  stream.on("error", (error) => {
    if (res.headersSent) return res.destroy();
    res.statusCode = error.code === "ENOENT" ? 404 : 500;
    setSecurityHeaders(res);
    res.end("File unavailable");
  });
  stream.on("open", () => {
    res.statusCode = 200;
    setSecurityHeaders(res);
    res.setHeader("Content-Type", types[path.extname(filePath)] || "application/octet-stream");
    if (req.method === "HEAD") {
      stream.destroy();
      res.end();
    } else stream.pipe(res);
  });
  res.on("close", () => stream.destroy());
}

function insideRoot(root, target) {
  const relative = path.relative(root, target);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function createHttpHandler({ api, root = path.resolve(__dirname, "../dist") }) {
  root = path.resolve(root);
  return (req, res) => {
    try {
      api(req, res, () => {
        const url = new URL(req.url, "http://127.0.0.1");
        const pathname = decodeURIComponent(url.pathname);
        if (/[\\\0:]/.test(pathname) || pathname.split("/").includes("..")) {
          res.statusCode = 400;
          setSecurityHeaders(res);
          res.end("Bad request");
          return;
        }

        const filePath = path.resolve(root, `.${pathname}`);
        if (!insideRoot(root, filePath)) {
          res.statusCode = 400;
          setSecurityHeaders(res);
          res.end("Bad request");
          return;
        }

        if (!["GET", "HEAD"].includes(req.method)) {
          res.statusCode = 405;
          res.setHeader("Allow", "GET, HEAD");
          setSecurityHeaders(res);
          res.end("Method not allowed");
          return;
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          if (!insideRoot(fs.realpathSync(root), fs.realpathSync(filePath))) {
            res.statusCode = 400;
            setSecurityHeaders(res);
            res.end("Bad request");
            return;
          }
          sendFile(req, res, filePath);
          return;
        }

        const indexFile = path.join(root, "index.html");
        if (!fs.existsSync(indexFile)) {
          res.statusCode = 503;
          setSecurityHeaders(res);
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("页面还没有构建。请先在项目目录运行 npm run build。");
          return;
        }
        if (!insideRoot(fs.realpathSync(root), fs.realpathSync(indexFile))) {
          res.statusCode = 400;
          setSecurityHeaders(res);
          res.end("Bad request");
          return;
        }
        sendFile(req, res, indexFile);
      });
    } catch (error) {
      if (res.headersSent) return res.destroy();
      res.statusCode = error instanceof URIError || error instanceof TypeError ? 400 : 500;
      setSecurityHeaders(res);
      res.end(res.statusCode === 400 ? "Bad request" : "File unavailable");
    }
  };
}

async function main() {
  loadLocalEnv();
  const port = Number(process.env.PORT || 5173);
  const pool = await createMysqlPool({ migrate: false });
  const api = attachRecruitmentApi(null, { store: createMysqlApplicationStore(pool) });
  const server = http.createServer(createHttpHandler({ api }));

  server.listen(port, "0.0.0.0", () => {
    console.log(`报名服务器已启动：http://0.0.0.0:${port}`);
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
module.exports = { createHttpHandler };
