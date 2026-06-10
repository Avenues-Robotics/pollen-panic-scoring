# pollen-panic-scoring

1. Install dependency
```bashnpm install ws```
2. Run
```bashnode server.js```
3. Connect
Local machine: http://localhost:3000
Other machine: http://192.168.x.x:3000 (use your actual LAN IP)

How sync works now: Every click immediately sends the full state over WebSocket directly to all connected clients — no polling, no debounce, no storage layer. Latency is just your local network (~1ms on WiFi, essentially zero on wired). The server holds the last known state so late-joining clients catch up instantly, and the client auto-reconnects if the connection drops.