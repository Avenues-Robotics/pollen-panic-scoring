const http = require("http");
const { WebSocketServer } = require("ws");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
let latestState = null;

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    const file = path.join(__dirname, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      return res.end("index.html not found — place it next to server.js");
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(fs.readFileSync(file));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Client connected. Total:", wss.clients.size);
  if (latestState) ws.send(JSON.stringify({ type: "state", payload: latestState }));

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === "state") {
      latestState = msg.payload;
      for (const client of wss.clients) {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify({ type: "state", payload: latestState }));
        }
      }
    }
  });

  ws.on("close", () => console.log("Client disconnected. Total:", wss.clients.size));
  ws.on("error", (e) => console.error("WS error:", e.message));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\nPollen Panic server running at http://0.0.0.0:${PORT}`);
  console.log(`Connect from other machines: http://<YOUR_LOCAL_IP>:${PORT}\n`);
});