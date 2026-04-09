import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";

const PORT = Number(process.env.PORT) || 3001;
const NOTIFICATION_INTERVAL_MS = 10_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

let notificationSequence = 0;
let lastNotificationAt = null;

app.use(express.json());

app.get("/api/status", (_request, response) => {
  response.json({
    activeClients: wss.clients.size,
    lastNotificationAt,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.use(express.static(clientDistPath));

app.use((request, response, next) => {
  if (request.path.startsWith("/api")) {
    next();
    return;
  }

  response.sendFile(path.join(clientDistPath, "index.html"), (error) => {
    if (error) {
      response
        .status(503)
        .json({ message: "Client build not found. Run `pnpm build` first." });
    }
  });
});

wss.on("connection", (socket, request) => {
  socket.id = randomUUID();
  socket.isAlive = true;

  logClientCount(`Client connected from ${request.socket.remoteAddress}`);

  socket.send(
    JSON.stringify({
      type: "connection:ready",
      clientId: socket.id,
      activeClients: wss.clients.size,
      connectedAt: new Date().toISOString(),
    }),
  );

  broadcast({
    type: "clients:count",
    count: wss.clients.size,
  });

  socket.on("pong", () => {
    socket.isAlive = true;
  });

  socket.on("close", () => {
    logClientCount("Client disconnected");
    broadcast({
      type: "clients:count",
      count: wss.clients.size,
    });
  });

  socket.on("error", (error) => {
    console.error(`[ws] Client error: ${error.message}`);
  });
});

const notificationTimer = setInterval(() => {
  if (wss.clients.size === 0) {
    return;
  }

  notificationSequence += 1;
  lastNotificationAt = new Date().toISOString();

  const payload = {
    type: "notification",
    id: randomUUID(),
    sequence: notificationSequence,
    message: "New update from server",
    sentAt: lastNotificationAt,
  };

  console.log(
    `[broadcast] Sent notification #${notificationSequence} to ${wss.clients.size} active client(s)`,
  );

  broadcast(payload);
}, NOTIFICATION_INTERVAL_MS);

const heartbeatTimer = setInterval(() => {
  for (const socket of wss.clients) {
    if (!socket.isAlive) {
      socket.terminate();
      continue;
    }

    socket.isAlive = false;
    socket.ping();
  }
}, HEARTBEAT_INTERVAL_MS);

wss.on("close", () => {
  clearInterval(notificationTimer);
  clearInterval(heartbeatTimer);
});

server.listen(PORT, () => {
  console.log(`Notification server listening on http://localhost:${PORT}`);
});

function broadcast(payload) {
  const encoded = JSON.stringify(payload);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(encoded);
    }
  }
}

function logClientCount(message) {
  console.log(`[clients] ${message}. Active clients: ${wss.clients.size}`);
}
