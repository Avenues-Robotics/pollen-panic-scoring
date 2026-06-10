const http = require("http");
const { WebSocketServer } = require("ws");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const WS_OPEN = 1;
const rooms = new Map();

const STATIC_FILES = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", type: "text/html; charset=utf-8" },
  "/vendor/react.production.min.js": {
    file: path.join("node_modules", "react", "umd", "react.production.min.js"),
    type: "application/javascript; charset=utf-8",
  },
  "/vendor/react-dom.production.min.js": {
    file: path.join("node_modules", "react-dom", "umd", "react-dom.production.min.js"),
    type: "application/javascript; charset=utf-8",
  },
  "/vendor/babel.min.js": {
    file: path.join("node_modules", "@babel", "standalone", "babel.min.js"),
    type: "application/javascript; charset=utf-8",
  },
};

function normalizeRoom(value) {
  return String(value || "").trim().replace(/\s+/g, "-").slice(0, 32);
}

function getRoom(room) {
  if (!rooms.has(room)) rooms.set(room, { latestState: null });
  return rooms.get(room);
}

function isPeriodState(period) {
  return period &&
    Number.isFinite(period.pollen) &&
    Number.isFinite(period.hiveBonus) &&
    Number.isFinite(period.clearBonus);
}

function isTeamState(team) {
  return team &&
    Array.isArray(team.hives) &&
    team.hives.length === 3 &&
    team.hives.every(Number.isFinite) &&
    ["pre", "auto", "tele", "end"].includes(team.phase) &&
    isPeriodState(team.auto) &&
    isPeriodState(team.tele) &&
    Number.isFinite(team.penalties);
}

function isScoreState(state) {
  return state &&
    isTeamState(state.red) &&
    isTeamState(state.blue) &&
    Array.isArray(state.history);
}

function sendJson(ws, message) {
  if (ws.readyState === WS_OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastToRoom(room, sender, message) {
  for (const client of wss.clients) {
    if (client !== sender && client.readyState === WS_OPEN && client.room === room) {
      sendJson(client, message);
    }
  }
}

function localNetworkUrls() {
  const urls = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        urls.push(`http://${entry.address}:${PORT}`);
      }
    }
  }
  return urls;
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const asset = STATIC_FILES[pathname];

  if (!asset) {
    res.writeHead(404);
    return res.end("Not found");
  }

  const file = path.join(__dirname, asset.file);
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    return res.end(`${asset.file} not found. Run npm install, then npm run dev.`);
  }

  res.writeHead(200, { "Content-Type": asset.type, "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Client connected. Total:", wss.clients.size);

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "join") {
      const room = normalizeRoom(msg.room);
      if (!room) {
        sendJson(ws, { type: "error", message: "Enter a room number first." });
        return;
      }

      ws.room = room;
      const roomState = getRoom(room);
      sendJson(ws, { type: "room-state", room, payload: roomState.latestState });
      console.log(`Client joined room ${room}`);
      return;
    }

    if (msg.type === "leave") {
      ws.room = null;
      sendJson(ws, { type: "left" });
      return;
    }

    if (msg.type === "state") {
      if (!ws.room) {
        sendJson(ws, { type: "error", message: "Join a room before syncing." });
        return;
      }
      if (!isScoreState(msg.payload)) {
        sendJson(ws, { type: "error", message: "Invalid score state." });
        return;
      }

      const roomState = getRoom(ws.room);
      roomState.latestState = msg.payload;
      broadcastToRoom(ws.room, ws, { type: "state", room: ws.room, payload: roomState.latestState });
    }
  });

  ws.on("close", () => console.log("Client disconnected. Total:", wss.clients.size));
  ws.on("error", (e) => console.error("WS error:", e.message));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\nPollen Panic server running`);
  console.log(`Local: http://localhost:${PORT}`);
  const urls = localNetworkUrls();
  if (urls.length) {
    console.log("Same WiFi:");
    urls.forEach((url) => console.log(`  ${url}`));
  } else {
    console.log(`Same WiFi: http://<YOUR_LOCAL_IP>:${PORT}`);
  }
  console.log("");
});
