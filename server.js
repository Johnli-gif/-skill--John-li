const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const PORTS = [8090, 8091, 9000];
const ROOT = path.resolve(__dirname);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};
const statePath = path.join(ROOT, "data", "today-orders.json");
const majorInfoPath = path.join(ROOT, "data", "major-info.json");
const majorInfoScript = path.join(ROOT, "scripts", "update_major_info.py");

function readStateFile() {
  try { return JSON.parse(fs.readFileSync(statePath, "utf-8")); }
  catch (e) { return { orders: [], feedback: {}, updatedAt: null }; }
}
function writeStateFile(value) { fs.writeFileSync(statePath, JSON.stringify(value, null, 2), "utf-8"); }

function sendJson(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(value));
}

function runMajorInfoUpdater() {
  return new Promise((resolve) => {
    execFile("python3", [majorInfoScript, "--output", majorInfoPath], {
      cwd: ROOT,
      timeout: 25000
    }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: String(stdout || "").trim(),
        stderr: String(stderr || "").trim(),
        error: error ? String(error.message || error) : ""
      });
    });
  });
}

function readMajorInfoFile() {
  try {
    return JSON.parse(fs.readFileSync(majorInfoPath, "utf-8"));
  } catch (e) {
    return {
      updatedAt: null,
      source: "未更新",
      headlineCount: 0,
      items: [],
      note: "重大财经资讯缓存不存在，请点击一键刷新数据。"
    };
  }
}

function createServer(port) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    if (pathname === "/api/health") { sendJson(res, 200, { ok: true, now: new Date().toISOString() }); return; }

    if (pathname === "/api/major-info") {
      if (req.method !== "GET") { sendJson(res, 405, { ok: false, error: "method_not_allowed" }); return; }
      const refresh = url.searchParams.get("refresh") !== "0";
      if (!refresh) {
        sendJson(res, 200, { ok: true, refreshed: false, data: readMajorInfoFile() });
        return;
      }
      runMajorInfoUpdater().then((result) => {
        const data = readMajorInfoFile();
        sendJson(res, 200, { ok: true, refreshed: result.ok, updater: result, data });
      });
      return;
    }

    if (pathname === "/_today_orders") {
      if (req.method === "GET") {
        const trigger = url.searchParams.get("trigger");
        const source = url.searchParams.get("source") || "unknown";
        const file = readStateFile();
        return sendJson(res, 200, { ok: true, source, trigger: trigger === "1", updatedAt: file.updatedAt, orders: file.orders || [], feedback: file.feedback || {} });
      }
      if (req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
          try {
            const input = JSON.parse(body || "{}");
            const current = readStateFile();
            const next = {
              updatedAt: new Date().toISOString(),
              orders: Array.isArray(input.orders) ? input.orders : current.orders,
              feedback: input.feedback && typeof input.feedback === "object" ? input.feedback : current.feedback
            };
            writeStateFile(next);
            sendJson(res, 200, { ok: true, saved: next });
          } catch (e) {
            sendJson(res, 400, { ok: false, error: "invalid_json" });
          }
        });
        return;
      }
    }

    let filePath = pathname === "/" ? "/index.html" : pathname;
    if (filePath === "/client-demo.html") filePath = "/client-demo.html";
    filePath = path.join(ROOT, decodeURIComponent(filePath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("Forbidden"); return; }

    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end("Not found"); return; }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
}

function listenWithFallback(ports) {
  return new Promise((resolve, reject) => {
    const tryPort = (index) => {
      if (index >= ports.length) return reject(new Error("no_port_available"));
      const port = ports[index];
      const server = createServer(port);
      server.listen(port, "127.0.0.1", () => {
        console.log(`✔ workbench server on http://127.0.0.1:${port}`);
        resolve({ server, port });
      });
      server.on("error", (e) => {
        if (e && e.code === "EADDRINUSE") {
          console.log(`⚠ ${port} busy, trying next...`);
          tryPort(index + 1);
        } else {
          reject(e);
        }
      });
    };
    tryPort(0);
  });
}

listenWithFallback(PORTS).catch((e) => {
  console.error("ERROR:", e && e.message || e);
  process.exit(1);
});
