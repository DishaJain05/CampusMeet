const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve frontend
app.use(express.static("public"));

// Rooms: roomId -> Set of clients
const rooms = new Map();

wss.on("connection", (ws) => {
  ws.roomId = null;

  ws.on("message", (message) => {
    const msg = JSON.parse(message);

    // JOIN ROOM
    if (msg.type === "join") {
      ws.roomId = msg.roomId;

      if (!rooms.has(ws.roomId)) rooms.set(ws.roomId, new Set());
      rooms.get(ws.roomId).add(ws);

      // Notify other peers in the room
      rooms.get(ws.roomId).forEach(client => {
        if (client !== ws) {
          client.send(JSON.stringify({ type: "user-joined" }));
        }
      });
    }

    // SIGNALING: offer / answer / candidate
    if (msg.type === "signal") {
      rooms.get(ws.roomId)?.forEach(client => {
        if (client !== ws) {
          client.send(JSON.stringify({ type: "signal", data: msg.data }));
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

// Render provides PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
