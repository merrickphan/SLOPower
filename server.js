const fs = require("fs");
const http = require("http");
const path = require("path");
const express = require("express");

const app = express();
const root = __dirname;
const publicDir = path.join(root, "public");
const indexPath = path.join(publicDir, "index.html");

if (!fs.existsSync(indexPath)) {
  console.error("Expected public/index.html — create the public folder and entry file.");
  process.exit(1);
}

const host = process.env.HOST || "0.0.0.0";
const rawPort = process.env.PORT;
const portLocked =
  rawPort !== undefined &&
  String(rawPort).trim() !== "" &&
  !Number.isNaN(Number(rawPort));
const firstPort = portLocked ? Number(rawPort) : Number(rawPort) || 3000;
const startPort =
  Number.isFinite(firstPort) && firstPort > 0 ? firstPort : 3000;
const maxTries = portLocked ? 1 : 30;

app.use(express.static(publicDir, { index: false }));

app.get("/", (_req, res) => {
  res.sendFile(indexPath);
});

const assetsDir = path.join(publicDir, "_assets");
try {
  const html = fs.readFileSync(indexPath, "utf8");
  const expectsCanvaAssets =
    html.includes("__canva_website_bootstrap__") ||
    html.includes('src="_assets/');
  if (!fs.existsSync(assetsDir) && expectsCanvaAssets) {
    console.warn(
      "public/_assets is missing but index.html looks like a Canva export. " +
        "Copy _assets from the Canva zip into public/, or use the standalone HTML in public/index.html."
    );
  }
} catch {
  /* ignore */
}

function listen(port, triesLeft) {
  const server = http.createServer(app);
  server.listen(port, host, () => {
    const addr = server.address();
    const actual = typeof addr === "object" && addr ? addr.port : port;
    const loopback = `http://127.0.0.1:${actual}`;
    console.log(`SLO Power  →  ${loopback}`);
    if (host === "0.0.0.0") {
      console.log(`           →  http://localhost:${actual}`);
    }
    console.log("Serving public/ …  (Ctrl+C to stop)");
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && !portLocked && triesLeft > 1) {
      listen(port + 1, triesLeft - 1);
      return;
    }
    if (err.code === "EADDRINUSE") {
      console.error(
        portLocked
          ? `Port ${port} is already in use. Set PORT to a free port and run again.`
          : `Could not find a free port (tried ${startPort}–${port + (triesLeft - 1)}).`
      );
      process.exit(1);
      return;
    }
    console.error(err);
    process.exit(1);
  });
}

listen(startPort, maxTries);
