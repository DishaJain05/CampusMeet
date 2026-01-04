// const express = require("express");
// const http = require("http");
// const { Server } = require("socket.io");

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server);

// app.use(express.static("public"));

// io.on("connection", (socket) => {
//   console.log("User connected:", socket.id);

//   socket.on("join-room", (roomId) => {
//     socket.join(roomId);
//     socket.to(roomId).emit("user-joined", socket.id);
//   });

//   socket.on("signal", ({ to, data }) => {
//     io.to(to).emit("signal", {
//       from: socket.id,
//       data
//     });
//   });

//   socket.on("disconnect", () => {
//     console.log("User disconnected:", socket.id);
//   });
// });

// server.listen(3000, () => {
//   console.log("Server running at http://localhost:3000");
// });



//code 2

// const express = require("express");
// const http = require("http");
// const { Server } = require("socket.io");

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server);

// app.use(express.static("public"));

// io.on("connection", (socket) => {
//   console.log("User connected:", socket.id);

//   socket.on("join-room", (roomId) => {
//     socket.join(roomId);
//     socket.to(roomId).emit("user-joined", socket.id);
//   });

//   socket.on("signal", ({ to, data }) => {
//     io.to(to).emit("signal", {
//       from: socket.id,
//       data
//     });
//   });

//   socket.on("disconnect", () => {
//     console.log("User disconnected:", socket.id);
//   });
// });

// server.listen(3000, () => {
//   console.log("Server running at http://localhost:3000");
// });




const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

// roomId -> clients
const rooms = new Map();

wss.on("connection", (ws) => {
  ws.roomId = null;

  ws.on("message", (message) => {
    const msg = JSON.parse(message);

    // Join room
    if (msg.type === "join") {
      ws.roomId = msg.roomId;

      if (!rooms.has(ws.roomId)) {
        rooms.set(ws.roomId, new Set());
      }

      rooms.get(ws.roomId).add(ws);

      // notify others
      rooms.get(ws.roomId).forEach(client => {
        if (client !== ws) {
          client.send(JSON.stringify({ type: "user-joined" }));
        }
      });
    }

    // WebRTC signaling
    if (msg.type === "signal") {
      rooms.get(ws.roomId)?.forEach(client => {
        if (client !== ws) {
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

server.listen(3000, () => {
  console.log("WebSocket server running on http://localhost:3000");
});
