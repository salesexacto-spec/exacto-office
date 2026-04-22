require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOM_CODE = process.env.ROOM_CODE || 'exacto2024';
const MAX_USERS = 20;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

const users = new Map();
let nextId = 1;

function broadcast(data, excludeWs) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client !== excludeWs && client.readyState === 1) {
      client.send(msg);
    }
  });
}

function sendTo(ws, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

function getUserList() {
  const list = [];
  users.forEach((user, ws) => {
    list.push({ id: user.id, name: user.name, color: user.color, x: user.x, y: user.y, muted: user.muted, cameraOff: user.cameraOff });
  });
  return list;
}

wss.on('connection', (ws) => {
  let authenticated = false;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'auth') {
      if (msg.code !== ROOM_CODE) {
        sendTo(ws, { type: 'auth_error', message: 'Invalid room code' });
        ws.close();
        return;
      }
      if (users.size >= MAX_USERS) {
        sendTo(ws, { type: 'auth_error', message: 'Room is full (max 20 users)' });
        ws.close();
        return;
      }

      authenticated = true;
      const id = nextId++;
      const user = {
        id,
        name: msg.name || 'Anonymous',
        color: msg.color || '#1E90FF',
        x: 350 + Math.random() * 200,
        y: 440 + Math.random() * 100,
        muted: false,
        cameraOff: true,
      };
      users.set(ws, user);

      sendTo(ws, { type: 'auth_ok', id, users: getUserList() });
      broadcast({ type: 'user_joined', user: { id: user.id, name: user.name, color: user.color, x: user.x, y: user.y, muted: user.muted, cameraOff: user.cameraOff } }, ws);
      console.log(`[+] ${user.name} joined (${users.size} online)`);
      return;
    }

    if (!authenticated) return;
    const user = users.get(ws);
    if (!user) return;

    switch (msg.type) {
      case 'move':
        user.x = Math.max(20, Math.min(1380, msg.x));
        user.y = Math.max(20, Math.min(880, msg.y));
        broadcast({ type: 'user_moved', id: user.id, x: user.x, y: user.y });
        break;

      case 'mute_toggle':
        user.muted = msg.muted;
        broadcast({ type: 'user_muted', id: user.id, muted: user.muted });
        break;

      case 'camera_toggle':
        user.cameraOff = msg.cameraOff;
        broadcast({ type: 'user_camera', id: user.id, cameraOff: user.cameraOff });
        break;

      case 'signal':
        // WebRTC signaling relay
        wss.clients.forEach(client => {
          const target = users.get(client);
          if (target && target.id === msg.targetId) {
            sendTo(client, { type: 'signal', fromId: user.id, signal: msg.signal });
          }
        });
        break;

      case 'speaking':
        broadcast({ type: 'user_speaking', id: user.id, speaking: msg.speaking }, ws);
        break;
    }
  });

  ws.on('close', () => {
    const user = users.get(ws);
    if (user) {
      broadcast({ type: 'user_left', id: user.id });
      console.log(`[-] ${user.name} left (${users.size - 1} online)`);
      users.delete(ws);
    }
  });

  ws.on('error', () => {
    users.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`Exacto Office running on http://localhost:${PORT}`);
});
