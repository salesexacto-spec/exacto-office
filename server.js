require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOM_CODE = process.env.ROOM_CODE || 'exacto2024';
const MAX_USERS = 20;

// Furniture persistence
const FURNITURE_FILE = path.join(__dirname, 'furniture.json');
let storedFurniture = [];
try {
  const data = fs.readFileSync(FURNITURE_FILE, 'utf8');
  storedFurniture = JSON.parse(data);
} catch (e) {
  storedFurniture = [];
}
function saveFurnitureToFile() {
  try { fs.writeFileSync(FURNITURE_FILE, JSON.stringify(storedFurniture), 'utf8'); } catch (e) { /* ignore */ }
}

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
const doorStates = { carlos: false, brian: false };
const boards = {};

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
  users.forEach((user) => {
    list.push({ id: user.id, name: user.name, color: user.color, x: user.x, y: user.y, muted: user.muted, cameraOff: user.cameraOff, status: user.status, statusNote: user.statusNote });
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
        x: 685 + Math.random() * 30,
        y: 845 + Math.random() * 20,
        muted: false,
        cameraOff: true,
        status: 'available',
        statusNote: '',
      };
      users.set(ws, user);

      sendTo(ws, { type: 'auth_ok', id, users: getUserList(), doorStates, boards, furniture: storedFurniture });
      broadcast({ type: 'user_joined', user: { id: user.id, name: user.name, color: user.color, x: user.x, y: user.y, muted: user.muted, cameraOff: user.cameraOff, status: user.status, statusNote: user.statusNote } }, ws);
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

      case 'room_change':
        user.room = msg.room || null;
        broadcast({ type: 'room_change', id: user.id, room: user.room }, ws);
        break;

      case 'status_change':
        user.status = msg.status || 'available';
        user.statusNote = msg.note || '';
        broadcast({ type: 'status_change', id: user.id, status: user.status, note: user.statusNote });
        break;

      case 'board_update':
        if (msg.roomId && typeof msg.content === 'string') {
          boards[msg.roomId] = msg.content;
          broadcast({ type: 'board_update', roomId: msg.roomId, content: msg.content });
        }
        break;

      case 'door_toggle': {
        const uname = user.name.toLowerCase();
        const isOwner = (msg.roomId === 'carlos' && uname.includes('carlos')) ||
                        (msg.roomId === 'brian' && uname.includes('brian'));
        if (!isOwner) break;
        doorStates[msg.roomId] = msg.locked !== undefined ? msg.locked : !doorStates[msg.roomId];
        broadcast({ type: 'door_state', roomId: msg.roomId, locked: doorStates[msg.roomId] });
        break;
      }

      case 'knock': {
        wss.clients.forEach(client => {
          const target = users.get(client);
          if (target) {
            if (target.status === 'focusing') return;
            const tname = target.name.toLowerCase();
            if ((msg.roomId === 'carlos' && tname.includes('carlos')) ||
                (msg.roomId === 'brian' && tname.includes('brian'))) {
              sendTo(client, { type: 'knock_notify', roomId: msg.roomId, fromName: user.name, fromId: user.id });
            }
          }
        });
        break;
      }

      case 'furniture_update': {
        const uname = user.name.toLowerCase();
        if (uname.includes('carlos') || uname.includes('brian')) {
          if (Array.isArray(msg.furniture)) {
            storedFurniture = msg.furniture;
            saveFurnitureToFile();
            broadcast({ type: 'furniture_update', furniture: storedFurniture }, ws);
          }
        }
        break;
      }

      case 'knock_response': {
        wss.clients.forEach(client => {
          const target = users.get(client);
          if (target && target.id === msg.targetId) {
            sendTo(client, { type: 'knock_result', allowed: msg.allowed });
          }
        });
        if (msg.allowed && msg.roomId) {
          doorStates[msg.roomId] = false;
          broadcast({ type: 'door_state', roomId: msg.roomId, locked: false });
        }
        break;
      }
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
