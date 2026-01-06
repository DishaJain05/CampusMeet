const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

// Serve frontend
app.use(express.static("public"));

app.get("/health", (req, res) => {
  res.send("CampusMeet server running 🚀");
});

// WebSocket
const wss = new WebSocket.Server({ server });

// roomId -> clients
const rooms = new Map();

wss.on("connection", ws => {
  ws.roomId = null;

  ws.on("message", message => {
    const msg = JSON.parse(message.toString());

    // Join room
    if (msg.type === "join") {
      ws.roomId = msg.roomId;

      if (!rooms.has(ws.roomId)) {
        rooms.set(ws.roomId, new Set());
      }

      rooms.get(ws.roomId).add(ws);

      // Notify others
      rooms.get(ws.roomId).forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "user-joined" }));
        }
      });
    }

    // Signaling
    if (msg.type === "signal") {
      rooms.get(ws.roomId)?.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "signal",
            data: msg.data
          }));
        }
      });
    }
  });

  ws.on("close", () => {
    if (ws.roomId && rooms.has(ws.roomId)) {
      rooms.get(ws.roomId).delete(ws);
    }
  });
});

// Render port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
