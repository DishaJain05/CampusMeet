const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const wss = new WebSocket.Server({ port: 3000 });
const server = http.createServer(app);
let clients = [];

wss.on("connection", ws => {
  clients.push(ws);

  ws.on("message", message => {
    clients.forEach(client => {
      if (client !== ws) {
        client.send(message);
      }
    });
  });

  ws.on("close", () => {
    clients = clients.filter(c => c !== ws);
  });
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});
