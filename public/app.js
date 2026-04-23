(() => {
  'use strict';

  // ── Constants ──
  const CANVAS_W = 1400, CANVAS_H = 900;
  const AVATAR_R = 10;
  const AVATAR_R_VIDEO = 22;
  const MOVE_SPEED = 4;
  const PROXIMITY_AUDIO = 300;
  const PROXIMITY_VIDEO = 150;
  const PROXIMITY_FULL = 80;
  const PROXIMITY_RING_VISUAL = 35;
  const TILE_SIZE = 20;
  const WALL_W = 10;
  const GRID_CELL = 6;

  // ── Room definitions (new layout with corridors) ──
  // Main corridor: y:260..320 | Second corridor: y:580..640
  // Center vertical corridor: x:670..730 | Right open area: x:960+
  const ROOMS = [
    { id: 'ventas',        name: 'Ventas',               x: 0,    y: 0,   w: 340, h: 260 },
    { id: 'soporte',       name: 'Soporte T\u00e9cnico', x: 340,  y: 0,   w: 330, h: 260 },
    { id: 'produccion',    name: 'Producci\u00f3n',      x: 730,  y: 0,   w: 290, h: 260 },
    { id: 'carlos',        name: 'Oficina Carlos',       x: 1020, y: 0,   w: 190, h: 260, private: true, color: '#0a1628' },
    { id: 'brian',         name: 'Oficina Brian',        x: 1210, y: 0,   w: 190, h: 260, private: true, color: '#120a28' },
    { id: 'desarrollo',    name: 'Desarrollo',           x: 0,    y: 320, w: 340, h: 260 },
    { id: 'lobby',         name: 'Lobby',                x: 340,  y: 320, w: 330, h: 260 },
    { id: 'admin',         name: 'Administraci\u00f3n',  x: 730,  y: 320, w: 230, h: 260 },
    { id: 'breakroom',     name: 'Break Room',           x: 0,    y: 640, w: 340, h: 180 },
    { id: 'conferencia',   name: 'Sala de Conferencias', x: 340,  y: 640, w: 330, h: 180 },
    { id: 'mantenimiento', name: 'Mantenimiento',        x: 730,  y: 640, w: 230, h: 180 },
  ];

  // ── Corridor detection (for lighter floor color) ──
  function isCorridor(px, py) {
    if (py >= 260 && py <= 320) return true;
    if (py >= 580 && py <= 640) return true;
    if (px >= 670 && px <= 730) return true;
    if (px >= 960 && py >= 260) return true;
    if (py >= 820) return true;
    return false;
  }

  // ── Wall generation ──
  const WALLS = (() => {
    const w = [];
    const D = 30;
    function hDoor(x1, x2, y, cx) {
      if (cx - D > x1) w.push([x1, y, cx - D, y]);
      if (cx + D < x2) w.push([cx + D, y, x2, y]);
    }
    // Outer boundary
    w.push([0,0, 1400,0], [1400,0, 1400,900], [1400,900, 0,900], [0,900, 0,0]);
    // Top row south walls (y=260) with 60px door gaps
    hDoor(0,   340,  260, 170);
    hDoor(340, 670,  260, 505);
    hDoor(730, 1020, 260, 875);
    hDoor(1020,1210, 260, 1115);
    hDoor(1210,1400, 260, 1305);
    // Middle row north walls (y=320) with doors
    hDoor(0,   340,  320, 170);
    hDoor(340, 670,  320, 505);
    hDoor(730, 960,  320, 845);
    // Middle row south walls (y=580) with doors
    hDoor(0,   340,  580, 170);
    hDoor(340, 670,  580, 505);
    hDoor(730, 960,  580, 845);
    // Bottom row north walls (y=640) with doors
    hDoor(0,   340,  640, 170);
    hDoor(340, 670,  640, 505);
    hDoor(730, 960,  640, 845);
    // Bottom row south walls (y=820) with doors
    hDoor(0,   340,  820, 170);
    hDoor(340, 670,  820, 505);
    hDoor(730, 960,  820, 845);
    // Vertical dividers — top row
    w.push([340,0, 340,260]);
    w.push([670,0, 670,260]);
    w.push([730,0, 730,260]);
    w.push([1020,0, 1020,260]);
    w.push([1210,0, 1210,260]);
    // Vertical dividers — middle row
    w.push([340,320, 340,580]);
    w.push([670,320, 670,580]);
    w.push([730,320, 730,580]);
    w.push([960,320, 960,580]);
    // Vertical dividers — bottom row
    w.push([340,640, 340,820]);
    w.push([670,640, 670,820]);
    w.push([730,640, 730,820]);
    w.push([960,640, 960,820]);
    return w;
  })();

  // ── Furniture (empty — admins place via panel, synced via server) ──
  let FURNITURE = [];

  // ── Collision rects ──
  let COLLISION_RECTS = [];
  function recalcCollisionRects() {
    COLLISION_RECTS = FURNITURE.filter(f =>
      ['desk','worktable','conference_table','reception','sofa','vending','coffeetable','equipment','toolrack','round_table','firepit'].includes(f.type)
    ).map(f => {
      if (f.type === 'round_table' || f.type === 'firepit') {
        return { x: f.x - f.r, y: f.y - f.r, w: f.r * 2, h: f.r * 2 };
      }
      return f;
    });
  }
  recalcCollisionRects();

  // ── A* Pathfinding (grid cell = 6px) ──
  const GRID_W = Math.ceil(CANVAS_W / GRID_CELL);
  const GRID_H = Math.ceil(CANVAS_H / GRID_CELL);
  let navGrid = null;

  function buildNavGrid() {
    navGrid = new Uint8Array(GRID_W * GRID_H);
    // Padding must match moveSelf collision checks exactly:
    // moveSelf rejects if pointToSegDist < AVATAR_R + WALL_W/2 for walls
    // moveSelf rejects if AABB overlap with AVATAR_R margin for furniture
    const furniturePad = AVATAR_R + 2; // match moveSelf AABB + small buffer
    const wallThick = AVATAR_R + WALL_W / 2 + 2; // match moveSelf wall check + small buffer
    for (const f of COLLISION_RECTS) {
      const fx = f.x !== undefined ? f.x : 0;
      const fy = f.y !== undefined ? f.y : 0;
      const fw = f.w !== undefined ? f.w : 0;
      const fh = f.h !== undefined ? f.h : 0;
      const x0 = Math.max(0, Math.floor((fx - furniturePad) / GRID_CELL));
      const y0 = Math.max(0, Math.floor((fy - furniturePad) / GRID_CELL));
      const x1 = Math.min(GRID_W - 1, Math.ceil((fx + fw + furniturePad) / GRID_CELL));
      const y1 = Math.min(GRID_H - 1, Math.ceil((fy + fh + furniturePad) / GRID_CELL));
      for (let gy = y0; gy <= y1; gy++)
        for (let gx = x0; gx <= x1; gx++)
          navGrid[gy * GRID_W + gx] = 1;
    }
    for (const [x1, y1, x2, y2] of WALLS) {
      const pad = wallThick + GRID_CELL;
      const minX = Math.max(0, Math.floor((Math.min(x1, x2) - pad) / GRID_CELL));
      const maxX = Math.min(GRID_W - 1, Math.ceil((Math.max(x1, x2) + pad) / GRID_CELL));
      const minY = Math.max(0, Math.floor((Math.min(y1, y2) - pad) / GRID_CELL));
      const maxY = Math.min(GRID_H - 1, Math.ceil((Math.max(y1, y2) + pad) / GRID_CELL));
      for (let gy = minY; gy <= maxY; gy++) {
        for (let gx = minX; gx <= maxX; gx++) {
          const cx = gx * GRID_CELL + GRID_CELL / 2;
          const cy = gy * GRID_CELL + GRID_CELL / 2;
          if (pointToSegDist(cx, cy, x1, y1, x2, y2) < wallThick) {
            navGrid[gy * GRID_W + gx] = 1;
          }
        }
      }
    }
    // No corridor unblocking — the grid must be at least as conservative as moveSelf
    // to prevent A* generating paths that moveSelf will reject (causing stuck avatars)
    // Canvas boundary cells blocked
    for (let gx = 0; gx < GRID_W; gx++) {
      navGrid[gx] = 1;
      navGrid[(GRID_H - 1) * GRID_W + gx] = 1;
    }
    for (let gy = 0; gy < GRID_H; gy++) {
      navGrid[gy * GRID_W] = 1;
      navGrid[gy * GRID_W + GRID_W - 1] = 1;
    }
  }

  function pointToSegDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const nearX = x1 + t * dx, nearY = y1 + t * dy;
    return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2);
  }

  function findPath(sx, sy, ex, ey) {
    if (!navGrid) buildNavGrid();
    let sgx = Math.floor(sx / GRID_CELL), sgy = Math.floor(sy / GRID_CELL);
    const egx = Math.floor(ex / GRID_CELL), egy = Math.floor(ey / GRID_CELL);
    if (sgx < 0 || sgy < 0 || sgx >= GRID_W || sgy >= GRID_H) return null;
    if (egx < 0 || egy < 0 || egx >= GRID_W || egy >= GRID_H) return null;

    // If start cell is blocked, find nearest walkable cell
    if (navGrid[sgy * GRID_W + sgx]) {
      let bestDist = Infinity;
      for (let dy = -6; dy <= 6; dy++) {
        for (let dx = -6; dx <= 6; dx++) {
          const nx = sgx + dx, ny = sgy + dy;
          if (nx >= 0 && ny >= 0 && nx < GRID_W && ny < GRID_H && !navGrid[ny * GRID_W + nx]) {
            const d = dx * dx + dy * dy;
            if (d < bestDist) { bestDist = d; sgx = nx; sgy = ny; }
          }
        }
      }
      if (bestDist === Infinity) return null;
    }

    let targetGx = egx, targetGy = egy;
    if (navGrid[egy * GRID_W + egx]) {
      let bestDist = Infinity;
      const searchR = 15;
      for (let dy = -searchR; dy <= searchR; dy++) {
        for (let dx = -searchR; dx <= searchR; dx++) {
          const nx = egx + dx, ny = egy + dy;
          if (nx >= 0 && ny >= 0 && nx < GRID_W && ny < GRID_H && !navGrid[ny * GRID_W + nx]) {
            const d = dx * dx + dy * dy;
            if (d < bestDist) { bestDist = d; targetGx = nx; targetGy = ny; }
          }
        }
      }
      if (bestDist === Infinity) return null;
    }

    const startKey = sgy * GRID_W + sgx;
    const endKey = targetGy * GRID_W + targetGx;
    if (startKey === endKey) return [{ x: ex, y: ey }];

    const open = new MinHeap();
    const gScore = new Float32Array(GRID_W * GRID_H).fill(Infinity);
    const cameFrom = new Int32Array(GRID_W * GRID_H).fill(-1);
    gScore[startKey] = 0;
    open.push(startKey, heuristic(sgx, sgy, targetGx, targetGy));

    const dirs = [[-1,0,10],[1,0,10],[0,-1,10],[0,1,10],[-1,-1,14],[1,-1,14],[-1,1,14],[1,1,14]];
    let found = false;
    let iterations = 0;
    const maxIter = 5000;

    while (open.size > 0 && iterations < maxIter) {
      iterations++;
      const current = open.pop();
      const cx = current % GRID_W, cy = (current / GRID_W) | 0;
      if (current === endKey) { found = true; break; }

      for (const [ddx, ddy, cost] of dirs) {
        const nx = cx + ddx, ny = cy + ddy;
        if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) continue;
        const nk = ny * GRID_W + nx;
        if (navGrid[nk] && nk !== endKey) continue;
        if (ddx !== 0 && ddy !== 0) {
          if (navGrid[(cy + ddy) * GRID_W + cx] || navGrid[cy * GRID_W + (cx + ddx)]) continue;
        }
        const ng = gScore[current] + cost;
        if (ng < gScore[nk]) {
          gScore[nk] = ng;
          cameFrom[nk] = current;
          open.push(nk, ng + heuristic(nx, ny, targetGx, targetGy));
        }
      }
    }

    if (!found) {
      let bestKey = -1, bestDist = Infinity;
      for (let k = 0; k < gScore.length; k++) {
        if (gScore[k] < Infinity) {
          const kx = k % GRID_W, ky = (k / GRID_W) | 0;
          const d = (kx - targetGx) ** 2 + (ky - targetGy) ** 2;
          if (d < bestDist) { bestDist = d; bestKey = k; }
        }
      }
      if (bestKey === -1 || bestKey === startKey) return null;
      const partial = [];
      let pc = bestKey;
      while (pc !== startKey && pc !== -1) {
        const ppx = (pc % GRID_W) * GRID_CELL + GRID_CELL / 2;
        const ppy = ((pc / GRID_W) | 0) * GRID_CELL + GRID_CELL / 2;
        partial.unshift({ x: ppx, y: ppy });
        pc = cameFrom[pc];
      }
      return partial.length > 0 ? smoothPath(partial) : null;
    }

    const path = [];
    let cur = endKey;
    while (cur !== startKey && cur !== -1) {
      const px = (cur % GRID_W) * GRID_CELL + GRID_CELL / 2;
      const py = ((cur / GRID_W) | 0) * GRID_CELL + GRID_CELL / 2;
      path.unshift({ x: px, y: py });
      cur = cameFrom[cur];
    }
    return path.length > 0 ? smoothPath(path) : null;
  }

  function heuristic(ax, ay, bx, by) {
    const dx = Math.abs(ax - bx), dy = Math.abs(ay - by);
    return 10 * (dx + dy) + (14 - 20) * Math.min(dx, dy);
  }

  function lineOfSight(x0, y0, x1, y1) {
    // Check multiple parallel rays to account for avatar radius
    const ddx = x1 - x0, ddy = y1 - y0;
    const len = Math.sqrt(ddx * ddx + ddy * ddy);
    if (len < 1) return true;
    const px = -ddy / len, py = ddx / len;
    const offsets = [0, AVATAR_R * 0.7, -AVATAR_R * 0.7];
    for (const off of offsets) {
      if (!_rayWalkable(x0 + px * off, y0 + py * off, x1 + px * off, y1 + py * off)) return false;
    }
    return true;
  }

  function _rayWalkable(x0, y0, x1, y1) {
    const gx0 = Math.floor(x0 / GRID_CELL), gy0 = Math.floor(y0 / GRID_CELL);
    const gx1 = Math.floor(x1 / GRID_CELL), gy1 = Math.floor(y1 / GRID_CELL);
    let cx = gx0, cy = gy0;
    const dx = Math.abs(gx1 - gx0), dy = Math.abs(gy1 - gy0);
    const sx = gx0 < gx1 ? 1 : -1, sy = gy0 < gy1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      if (cx < 0 || cy < 0 || cx >= GRID_W || cy >= GRID_H) return false;
      if (navGrid[cy * GRID_W + cx]) return false;
      if (cx === gx1 && cy === gy1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; cx += sx; }
      if (e2 < dx) { err += dx; cy += sy; }
    }
    return true;
  }

  function smoothPath(path) {
    let result = path;
    for (let pass = 0; pass < 5; pass++) {
      if (result.length <= 2) return result;
      const smooth = [result[0]];
      let anchor = 0;
      while (anchor < result.length - 1) {
        let farthest = anchor + 1;
        for (let i = anchor + 2; i < result.length; i++) {
          if (lineOfSight(result[anchor].x, result[anchor].y, result[i].x, result[i].y)) {
            farthest = i;
          }
        }
        smooth.push(result[farthest]);
        anchor = farthest;
      }
      result = smooth;
    }
    return result;
  }

  class MinHeap {
    constructor() { this.data = []; this.size = 0; }
    push(key, priority) {
      this.data[this.size] = { key, priority };
      this._bubbleUp(this.size++);
    }
    pop() {
      const top = this.data[0].key;
      this.size--;
      if (this.size > 0) { this.data[0] = this.data[this.size]; this._sinkDown(0); }
      return top;
    }
    _bubbleUp(i) {
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (this.data[i].priority >= this.data[p].priority) break;
        [this.data[i], this.data[p]] = [this.data[p], this.data[i]];
        i = p;
      }
    }
    _sinkDown(i) {
      while (true) {
        let smallest = i;
        const l = 2 * i + 1, r = 2 * i + 2;
        if (l < this.size && this.data[l].priority < this.data[smallest].priority) smallest = l;
        if (r < this.size && this.data[r].priority < this.data[smallest].priority) smallest = r;
        if (smallest === i) break;
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      }
    }
  }

  // ── State ──
  let ws = null;
  let myId = null;
  let myUser = { name: '', color: '#1E90FF', x: 700, y: 850 };
  let users = new Map();
  let localStream = null;
  let screenStream = null;
  let peers = new Map();
  let isMuted = false;
  let isCameraOff = true;
  let isScreenSharing = false;
  let keys = {};
  let animFrame = null;
  let isSpeaking = false;
  let userStatus = 'available';
  let userStatusNote = '';

  // Admin furniture panel state
  let furniturePanelOpen = false;
  let adminSelectedIdx = -1;
  let adminDraggingIdx = -1;
  let adminDragOffsetX = 0;
  let adminDragOffsetY = 0;
  let mouseCanvasX = 0, mouseCanvasY = 0;

  // Local camera video element for canvas rendering
  let localVideoEl = null;

  // Room tracking
  let myCurrentRoom = null;
  let userRooms = new Map();

  // Room panel state
  let roomPanelExpanded = true;

  // Whiteboard state
  let boardContents = {};
  let currentBoardRoom = null;

  // Gallery state
  let galleryActive = false;

  // Recording state
  let mediaRecorder = null;
  let recordedChunks = [];

  // Stuck detection (time-based, 500ms threshold)
  let lastMoveTime = 0;
  let lastMoveX = 0, lastMoveY = 0;

  // Debug mode
  let debugNavGrid = false;

  // ── Door system ──
  const doorState = { carlos: false, brian: false };
  const DOOR_WALLS = {
    carlos: [1085, 260, 1145, 260],
    brian: [1275, 260, 1335, 260]
  };

  function isAdminUser() {
    const name = myUser.name.toLowerCase();
    return name.includes('carlos') || name.includes('brian');
  }

  function getOwnedOffice() {
    const name = myUser.name.toLowerCase();
    if (name.includes('carlos')) return 'carlos';
    if (name.includes('brian')) return 'brian';
    return null;
  }

  function applyDoorState() {
    for (const key of ['carlos', 'brian']) {
      const dw = DOOR_WALLS[key];
      const idx = WALLS.findIndex(w => w[0]===dw[0] && w[1]===dw[1] && w[2]===dw[2] && w[3]===dw[3]);
      if (doorState[key] && idx < 0) {
        WALLS.push(dw);
      } else if (!doorState[key] && idx >= 0) {
        WALLS.splice(idx, 1);
      }
    }
    navGrid = null;
  }

  function toggleDoor(roomId) {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'door_toggle', roomId, locked: !doorState[roomId] }));
    }
  }

  function sendKnock(roomId) {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'knock', roomId, fromName: myUser.name }));
      showNotification('Knocking...');
    }
  }

  function handleDoorClick(pos) {
    for (const roomId of ['carlos', 'brian']) {
      const dw = DOOR_WALLS[roomId];
      const midX = (dw[0] + dw[2]) / 2;
      const doorY = dw[1];
      const btnX = midX + 38, btnY = doorY - 14;
      const dx = pos.x - btnX, dy = pos.y - btnY;
      if (dx * dx + dy * dy <= 18 * 18) {
        const ownedOffice = getOwnedOffice();
        const myRoom = getRoomAt(myUser.x, myUser.y);
        if (ownedOffice === roomId && myRoom && myRoom.id === roomId) {
          toggleDoor(roomId);
          return true;
        } else if (doorState[roomId] && ownedOffice !== roomId) {
          const dist = Math.sqrt((myUser.x - midX) ** 2 + (myUser.y - doorY) ** 2);
          if (dist < 100) {
            sendKnock(roomId);
            return true;
          }
        }
      }
    }
    return false;
  }

  function showKnockNotification(roomId, fromName, fromId) {
    if (userStatus === 'focusing') return;
    const existing = document.getElementById('knock-notification');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'knock-notification';
    el.className = 'knock-notification';
    el.innerHTML = '<span>\ud83d\udc4b ' + fromName + ' is knocking.</span>' +
      '<button class="knock-btn knock-let-in">Let in</button>' +
      '<button class="knock-btn knock-ignore">Ignore</button>';
    document.getElementById('canvas-wrapper').appendChild(el);
    el.querySelector('.knock-let-in').addEventListener('click', function() {
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'knock_response', roomId: roomId, targetId: fromId, allowed: true }));
        ws.send(JSON.stringify({ type: 'door_toggle', roomId: roomId, locked: false }));
      }
      el.remove();
      showNotification('Door opened');
    });
    el.querySelector('.knock-ignore').addEventListener('click', function() {
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'knock_response', roomId: roomId, targetId: fromId, allowed: false }));
      }
      el.remove();
    });
    setTimeout(function() { if (el.parentNode) el.remove(); }, 15000);
  }

  // ── DOM ──
  const loginScreen = document.getElementById('login-screen');
  const app = document.getElementById('app');
  const inputName = document.getElementById('input-name');
  const inputCode = document.getElementById('input-code');
  const btnJoin = document.getElementById('btn-join');
  const loginError = document.getElementById('login-error');
  const colorOptions = document.getElementById('color-options');
  const canvas = document.getElementById('office-canvas');
  const ctx = canvas.getContext('2d');
  const minimap = document.getElementById('minimap');
  const minimapCtx = minimap.getContext('2d');
  const btnMic = document.getElementById('btn-mic');
  const btnCamera = document.getElementById('btn-camera');
  const btnScreen = document.getElementById('btn-screen');
  const btnLeave = document.getElementById('btn-leave');
  const btnStatus = document.getElementById('btn-status');
  const btnInvite = document.getElementById('btn-invite');
  const btnFurniture = document.getElementById('btn-furniture');
  const btnRecord = document.getElementById('btn-record');
  const btnGallery = document.getElementById('btn-gallery');
  const connectionStatus = document.getElementById('connection-status');
  const onlineCount = document.getElementById('online-count');
  const currentZone = document.getElementById('current-zone');
  const videoPanel = document.getElementById('video-panel');
  const userListEl = document.getElementById('user-list');
  const peopleCountEl = document.getElementById('people-count');
  const channelListEl = document.getElementById('channel-list');
  const roomPanel = document.getElementById('room-panel');
  const roomPanelTitle = document.getElementById('room-panel-title');
  const roomPanelToggle = document.getElementById('room-panel-toggle');
  const roomPanelGrid = document.getElementById('room-panel-grid');
  const notificationEl = document.getElementById('notification');
  const furniturePanel = document.getElementById('furniture-panel');
  const furnitureCtxMenu = document.getElementById('furniture-ctx-menu');

  // ── Init ──
  const saved = JSON.parse(localStorage.getItem('exacto_user') || '{}');
  if (saved.name) inputName.value = saved.name;
  if (saved.color) selectColor(saved.color);

  colorOptions.addEventListener('click', e => {
    const btn = e.target.closest('.color-btn');
    if (btn) selectColor(btn.dataset.color);
  });

  function selectColor(color) {
    myUser.color = color;
    document.querySelectorAll('.color-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.color === color);
    });
  }

  btnJoin.addEventListener('click', joinOffice);
  inputName.addEventListener('keydown', e => { if (e.key === 'Enter') inputCode.focus(); });
  inputCode.addEventListener('keydown', e => { if (e.key === 'Enter') joinOffice(); });

  function joinOffice() {
    const name = inputName.value.trim();
    const code = inputCode.value.trim();
    if (!name) { loginError.textContent = 'Please enter your name'; return; }
    if (!code) { loginError.textContent = 'Please enter the room code'; return; }
    myUser.name = name;
    localStorage.setItem('exacto_user', JSON.stringify({ name, color: myUser.color }));
    loginError.textContent = '';
    btnJoin.textContent = 'Connecting...';
    btnJoin.disabled = true;
    connectWS(code);
  }

  // ── Channels ──
  channelListEl.addEventListener('click', e => {
    const item = e.target.closest('.channel-item');
    if (!item) return;
    channelListEl.querySelectorAll('.channel-item').forEach(c => c.classList.remove('active'));
    item.classList.add('active');
  });

  // ── Status system ──
  function setStatus(status, note) {
    userStatus = status;
    userStatusNote = note || '';
    updateStatusUI();
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'status_change', status: userStatus, note: userStatusNote }));
    }
    updateUserList();
  }

  function updateStatusUI() {
    const indicator = btnStatus.querySelector('.status-indicator');
    indicator.className = 'status-indicator ' + (userStatus === 'available' ? 'available' : userStatus === 'out' ? 'away' : 'busy');
    btnStatus.title = 'Status: ' + userStatus.charAt(0).toUpperCase() + userStatus.slice(1) + (userStatusNote ? ' - ' + userStatusNote : '');
  }

  btnStatus.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('status-dropdown');
    dropdown.classList.toggle('hidden');
  });

  document.querySelectorAll('.status-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.status;
      const noteRow = document.getElementById('status-note-row');
      if (status === 'out') {
        noteRow.classList.remove('hidden');
        const noteInput = document.getElementById('status-note-input');
        noteInput.focus();
        noteInput.addEventListener('keydown', function handler(e) {
          if (e.key === 'Enter') {
            setStatus('out', noteInput.value.trim());
            noteRow.classList.add('hidden');
            document.getElementById('status-dropdown').classList.add('hidden');
            noteInput.removeEventListener('keydown', handler);
          }
        });
        return;
      }
      document.getElementById('status-note-row').classList.add('hidden');
      setStatus(status, '');
      document.getElementById('status-dropdown').classList.add('hidden');
    });
  });

  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('status-dropdown');
    if (!dropdown.classList.contains('hidden') && !dropdown.contains(e.target) && e.target !== btnStatus) {
      dropdown.classList.add('hidden');
    }
    // Hide furniture context menu
    if (!furnitureCtxMenu.classList.contains('hidden') && !furnitureCtxMenu.contains(e.target)) {
      furnitureCtxMenu.classList.add('hidden');
    }
  });

  btnInvite.addEventListener('click', () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(location.href).then(() => {
        btnInvite.textContent = 'Copied!';
        setTimeout(() => { btnInvite.textContent = 'Invite'; }, 2000);
      });
    }
  });

  // ── Admin Furniture Panel ──
  btnFurniture.addEventListener('click', toggleFurniturePanel);
  document.getElementById('fp-close').addEventListener('click', toggleFurniturePanel);

  function toggleFurniturePanel() {
    furniturePanelOpen = !furniturePanelOpen;
    furniturePanel.classList.toggle('hidden', !furniturePanelOpen);
    btnFurniture.classList.toggle('active', furniturePanelOpen);
  }

  // Drag from panel items
  document.querySelectorAll('.fp-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', item.dataset.type);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });

  // Furniture context menu actions
  furnitureCtxMenu.querySelectorAll('.ctx-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const idx = furnitureCtxMenu._targetIdx;
      if (idx === undefined || idx < 0 || idx >= FURNITURE.length) return;
      if (action === 'delete') {
        FURNITURE.splice(idx, 1);
        adminSelectedIdx = -1;
        onFurnitureChanged();
        sendFurnitureUpdate();
        showNotification('Furniture removed');
      } else if (action === 'rename') {
        const f = FURNITURE[idx];
        if (f.type === 'desk') {
          const name = prompt('Renombrar escritorio:', f.deskName || '');
          if (name !== null) {
            f.deskName = name;
            sendFurnitureUpdate();
          }
        }
      }
      furnitureCtxMenu.classList.add('hidden');
    });
  });

  function sendFurnitureUpdate() {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'furniture_update', furniture: FURNITURE }));
    }
  }

  function onFurnitureChanged() {
    recalcCollisionRects();
    buildNavGrid();
  }

  function placeFurnitureAt(type, x, y) {
    switch (type) {
      case 'desk': {
        const name = prompt('\u00bfNombre del empleado?') || '';
        FURNITURE.push({ type: 'desk', x: x - 35, y: y - 19, w: 70, h: 38, deskName: name });
        FURNITURE.push({ type: 'monitor', x: x - 23, y: y - 15, w: 26, h: 5 });
        FURNITURE.push({ type: 'chair', x: x, y: y + 29 });
        break;
      }
      case 'chair':
        FURNITURE.push({ type: 'chair', x, y });
        break;
      case 'plant':
        FURNITURE.push({ type: 'plant', x, y });
        break;
      case 'whiteboard':
        FURNITURE.push({ type: 'whiteboard', x: x - 5, y: y - 40, w: 10, h: 80 });
        break;
      case 'sofa':
        FURNITURE.push({ type: 'sofa', x: x - 50, y: y - 17, w: 100, h: 35 });
        break;
      case 'monitor_kb':
        FURNITURE.push({ type: 'monitor_kb', x: x - 15, y: y - 12, w: 30, h: 24 });
        break;
    }
    onFurnitureChanged();
    sendFurnitureUpdate();
    showNotification(type + ' placed');
  }

  function getFurnitureAt(px, py) {
    for (let i = FURNITURE.length - 1; i >= 0; i--) {
      const f = FURNITURE[i];
      if (f.type === 'round_table' || f.type === 'firepit') {
        const dx = px - f.x, dy = py - f.y;
        if (dx * dx + dy * dy <= (f.r + 8) * (f.r + 8)) return i;
      } else if (f.type === 'chair' || f.type === 'conf_chair' || f.type === 'beanbag') {
        const dx = px - f.x, dy = py - f.y;
        if (dx * dx + dy * dy <= 20 * 20) return i;
      } else if (f.type === 'tree' || f.type === 'plant' || f.type === 'plant_large') {
        const dx = px - f.x, dy = py - f.y;
        if (dx * dx + dy * dy <= 30 * 30) return i;
      } else if (f.w && f.h) {
        if (px >= f.x && px <= f.x + f.w && py >= f.y && py <= f.y + f.h) return i;
      }
    }
    return -1;
  }

  // ── Notification helper ──
  let notifTimeout = null;
  function showNotification(text, duration) {
    duration = duration || 3000;
    notificationEl.textContent = text;
    notificationEl.classList.remove('hidden');
    if (notifTimeout) clearTimeout(notifTimeout);
    notifTimeout = setTimeout(() => { notificationEl.classList.add('hidden'); }, duration);
  }

  // ── Whiteboard ──
  function openWhiteboard(roomId) {
    currentBoardRoom = roomId;
    const modal = document.getElementById('whiteboard-modal');
    const textarea = document.getElementById('wb-textarea');
    const title = document.getElementById('wb-modal-title');
    const room = ROOMS.find(r => r.id === roomId);
    title.textContent = (room ? room.name : roomId) + ' - Whiteboard';
    textarea.value = boardContents[roomId] || '';
    modal.classList.remove('hidden');
    textarea.focus();
  }

  function closeWhiteboard() {
    document.getElementById('whiteboard-modal').classList.add('hidden');
    currentBoardRoom = null;
  }

  function saveWhiteboard() {
    if (!currentBoardRoom) return;
    const content = document.getElementById('wb-textarea').value;
    boardContents[currentBoardRoom] = content;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'board_update', roomId: currentBoardRoom, content }));
    }
    closeWhiteboard();
    showNotification('Whiteboard saved');
  }

  document.getElementById('wb-modal-close').addEventListener('click', closeWhiteboard);
  document.getElementById('wb-save').addEventListener('click', saveWhiteboard);
  document.getElementById('whiteboard-modal').addEventListener('click', (e) => {
    if (e.target.id === 'whiteboard-modal') closeWhiteboard();
  });

  // ── Recording ──
  btnRecord.addEventListener('click', toggleRecording);

  function toggleRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      stopRecording();
    } else {
      startRecording();
    }
  }

  async function startRecording() {
    try {
      const tracks = [];
      if (localStream) localStream.getAudioTracks().forEach(t => { if (t.enabled) tracks.push(t); });
      if (screenStream) screenStream.getTracks().forEach(t => tracks.push(t));
      if (tracks.length === 0) {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach(t => tracks.push(t));
      }
      const combinedStream = new MediaStream(tracks);
      const hasVideo = tracks.some(t => t.kind === 'video');
      const options = {};
      if (hasVideo && MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        options.mimeType = 'video/webm;codecs=vp9,opus';
      } else if (hasVideo && MediaRecorder.isTypeSupported('video/webm')) {
        options.mimeType = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      }
      mediaRecorder = new MediaRecorder(combinedStream, options);
      recordedChunks = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
      mediaRecorder.onstop = downloadRecording;
      mediaRecorder.start(1000);
      document.getElementById('recording-indicator').classList.remove('hidden');
      btnRecord.classList.add('active');
      showNotification('Recording started');
    } catch (e) {
      showNotification('Could not start recording');
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      document.getElementById('recording-indicator').classList.add('hidden');
      btnRecord.classList.remove('active');
      showNotification('Recording saved');
    }
  }

  function downloadRecording() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '-' + pad(now.getHours());
    a.href = url;
    a.download = 'exacto-meeting-' + dateStr + '.webm';
    a.click();
    URL.revokeObjectURL(url);
    recordedChunks = [];
  }

  // ── Gallery view ──
  btnGallery.addEventListener('click', toggleGallery);

  function toggleGallery() {
    galleryActive = !galleryActive;
    document.getElementById('gallery-view').classList.toggle('hidden', !galleryActive);
    document.getElementById('canvas-wrapper').classList.toggle('hidden', galleryActive);
    btnGallery.classList.toggle('active', galleryActive);
    if (galleryActive) updateGalleryView();
  }

  document.getElementById('btn-gallery-back').addEventListener('click', () => {
    if (galleryActive) toggleGallery();
  });

  function updateGalleryView() {
    if (!galleryActive) return;
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '';
    const showAll = !myCurrentRoom || myCurrentRoom.id === 'lobby';
    grid.appendChild(createGalleryTile({ name: myUser.name, color: myUser.color, muted: isMuted, cameraOff: isCameraOff, speaking: isSpeaking, isSelf: true, status: userStatus }));
    users.forEach((u, id) => {
      if (!showAll) {
        const urId = userRooms.get(id);
        if (urId !== myCurrentRoom.id) return;
      }
      grid.appendChild(createGalleryTile({ ...u, userId: id }));
    });
    const count = grid.children.length;
    let cols = 2;
    if (count >= 5) cols = 3;
    if (count >= 10) cols = 4;
    grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
  }

  function createGalleryTile(opts) {
    const tile = document.createElement('div');
    tile.className = 'gallery-tile';
    if (opts.speaking && !opts.muted) tile.classList.add('speaking');
    let videoSrc = null;
    if (!opts.cameraOff) {
      if (opts.isSelf && localVideoEl && localVideoEl.srcObject) {
        videoSrc = localVideoEl.srcObject;
      } else if (opts.userId) {
        const peer = peers.get(opts.userId);
        if (peer && peer.videoEl && peer.videoEl.srcObject) videoSrc = peer.videoEl.srcObject;
      }
    }
    if (videoSrc) {
      const video = document.createElement('video');
      video.autoplay = true; video.playsInline = true; video.muted = !!opts.isSelf;
      video.srcObject = videoSrc;
      tile.appendChild(video);
    } else {
      const avatarDiv = document.createElement('div');
      avatarDiv.className = 'gallery-avatar';
      avatarDiv.style.background = opts.color;
      avatarDiv.textContent = (opts.name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      tile.appendChild(avatarDiv);
    }
    const info = document.createElement('div');
    info.className = 'gallery-tile-info';
    const statusIcons = { available: '\ud83d\udfe2', out: '\ud83d\udeb6', focusing: '\ud83c\udfaf' };
    const st = opts.isSelf ? userStatus : (opts.status || 'available');
    const nameSpan = document.createElement('span');
    nameSpan.textContent = (statusIcons[st] || '') + ' ' + opts.name + (opts.isSelf ? ' (you)' : '');
    const micDot = document.createElement('span');
    micDot.className = 'gallery-mic' + (opts.muted ? ' muted' : '');
    info.appendChild(nameSpan);
    info.appendChild(micDot);
    tile.appendChild(info);
    return tile;
  }

  // ── WebSocket ──
  function connectWS(code) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(proto + '://' + location.host);
    ws.onopen = () => {
      connectionStatus.className = 'status-dot connected';
      ws.send(JSON.stringify({ type: 'auth', code, name: myUser.name, color: myUser.color }));
    };
    ws.onmessage = (e) => handleMessage(JSON.parse(e.data));
    ws.onclose = () => {
      connectionStatus.className = 'status-dot disconnected';
      if (myId) {
        setTimeout(() => {
          if (!ws || ws.readyState === WebSocket.CLOSED) connectWS(inputCode.value.trim());
        }, 3000);
      }
    };
    ws.onerror = () => {
      connectionStatus.className = 'status-dot disconnected';
      loginError.textContent = 'Connection failed. Is the server running?';
      btnJoin.textContent = 'Join Office';
      btnJoin.disabled = false;
    };
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case 'auth_ok':
        myId = msg.id;
        loginScreen.classList.add('hidden');
        app.classList.remove('hidden');
        msg.users.forEach(u => {
          if (u.id !== myId) {
            users.set(u.id, { ...u, targetX: u.x, targetY: u.y, speaking: false, status: u.status || 'available', statusNote: u.statusNote || '' });
          } else {
            myUser.x = u.x;
            myUser.y = u.y;
          }
        });
        updateOnlineCount();
        updateUserList();
        if (msg.doorStates) {
          doorState.carlos = msg.doorStates.carlos || false;
          doorState.brian = msg.doorStates.brian || false;
          applyDoorState();
        }
        if (msg.boards) {
          Object.assign(boardContents, msg.boards);
        }
        // Load furniture from server
        if (msg.furniture && Array.isArray(msg.furniture)) {
          FURNITURE = msg.furniture;
          recalcCollisionRects();
        }
        // Show furniture button for admins
        if (isAdminUser()) {
          btnFurniture.classList.remove('hidden');
        }
        initCanvas();
        initAudio();
        break;
      case 'auth_error':
        loginError.textContent = msg.message;
        btnJoin.textContent = 'Join Office';
        btnJoin.disabled = false;
        break;
      case 'user_joined':
        if (msg.user.id !== myId) {
          users.set(msg.user.id, { ...msg.user, targetX: msg.user.x, targetY: msg.user.y, speaking: false, status: msg.user.status || 'available', statusNote: msg.user.statusNote || '' });
          updateOnlineCount();
          updateUserList();
        }
        break;
      case 'user_left':
        users.delete(msg.id);
        userRooms.delete(msg.id);
        closePeer(msg.id);
        updateOnlineCount();
        updateUserList();
        updateRoomPanel();
        if (galleryActive) updateGalleryView();
        break;
      case 'user_moved':
        if (msg.id !== myId) {
          const u = users.get(msg.id);
          if (u) { u.targetX = msg.x; u.targetY = msg.y; }
        }
        break;
      case 'user_muted': {
        const u = users.get(msg.id);
        if (u) u.muted = msg.muted;
        updateRoomPanel();
        if (galleryActive) updateGalleryView();
        break;
      }
      case 'user_camera': {
        const u = users.get(msg.id);
        if (u) u.cameraOff = msg.cameraOff;
        updateRoomPanel();
        if (galleryActive) updateGalleryView();
        break;
      }
      case 'user_speaking': {
        const u = users.get(msg.id);
        if (u) u.speaking = msg.speaking;
        updateUserList();
        if (galleryActive) updateGalleryView();
        break;
      }
      case 'signal':
        handleSignal(msg.fromId, msg.signal);
        break;
      case 'room_change': {
        if (msg.room) {
          userRooms.set(msg.id, msg.room);
        } else {
          userRooms.delete(msg.id);
        }
        updateRoomPanel();
        if (galleryActive) updateGalleryView();
        break;
      }
      case 'status_change': {
        const u = users.get(msg.id);
        if (u) { u.status = msg.status; u.statusNote = msg.note; }
        updateUserList();
        if (galleryActive) updateGalleryView();
        break;
      }
      case 'board_update':
        boardContents[msg.roomId] = msg.content;
        break;
      case 'door_state': {
        doorState[msg.roomId] = msg.locked;
        applyDoorState();
        break;
      }
      case 'knock_notify': {
        const ownedOffice = getOwnedOffice();
        if (ownedOffice === msg.roomId) {
          showKnockNotification(msg.roomId, msg.fromName, msg.fromId);
        }
        break;
      }
      case 'knock_result': {
        if (msg.allowed) {
          showNotification('Door opened! Go in.');
        } else {
          showNotification('Not available right now');
        }
        break;
      }
      case 'furniture_update': {
        if (msg.furniture && Array.isArray(msg.furniture)) {
          FURNITURE = msg.furniture;
          onFurnitureChanged();
        }
        break;
      }
    }
  }

  function updateOnlineCount() {
    const count = users.size + 1;
    onlineCount.textContent = count + ' online';
    peopleCountEl.textContent = count;
  }

  function updateUserList() {
    userListEl.innerHTML = '';
    userListEl.appendChild(createUserListItem(myUser, true));
    users.forEach(u => userListEl.appendChild(createUserListItem(u, false)));
  }

  function createUserListItem(u, isMe) {
    const li = document.createElement('li');
    li.className = 'user-item';
    const avatar = document.createElement('div');
    avatar.className = 'user-avatar-small';
    avatar.style.background = u.color;
    avatar.textContent = (u.name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const name = document.createElement('span');
    name.className = 'user-name-sidebar' + (isMe ? ' is-me' : '');
    name.textContent = u.name + (isMe ? ' (you)' : '');
    const status = isMe ? userStatus : (u.status || 'available');
    const statusNote = isMe ? userStatusNote : (u.statusNote || '');
    const statusIcons = { available: '\ud83d\udfe2', out: '\ud83d\udeb6', focusing: '\ud83c\udfaf' };
    const statusSpan = document.createElement('span');
    statusSpan.className = 'user-status-sidebar';
    statusSpan.textContent = statusIcons[status] || '\ud83d\udfe2';
    statusSpan.title = statusNote || status;
    const dot = document.createElement('span');
    dot.className = 'user-status-dot' + (u.speaking ? ' speaking' : '');
    li.appendChild(avatar);
    li.appendChild(name);
    li.appendChild(statusSpan);
    li.appendChild(dot);
    return li;
  }

  // ── Audio ──
  async function initAudio() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setupSpeechDetection(localStream);
    } catch (err) {
      localStream = new MediaStream();
      isMuted = true;
      updateMicUI();
    }
  }

  function setupSpeechDetection(stream) {
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      function checkLevel() {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        const nowSpeaking = avg > 15 && !isMuted;
        if (nowSpeaking !== isSpeaking) {
          isSpeaking = nowSpeaking;
          if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'speaking', speaking: isSpeaking }));
        }
        requestAnimationFrame(checkLevel);
      }
      checkLevel();
    } catch (e) { /* not critical */ }
  }

  // ── WebRTC ──
  const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

  function getOrCreatePeer(remoteId, initiator) {
    if (peers.has(remoteId)) return peers.get(remoteId);
    const pc = new RTCPeerConnection(rtcConfig);
    const peer = { pc, audioEl: null, videoEl: null, connected: false, videoBoxEl: null };
    peers.set(remoteId, peer);
    if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    pc.onicecandidate = (e) => {
      if (e.candidate && ws && ws.readyState === 1)
        ws.send(JSON.stringify({ type: 'signal', targetId: remoteId, signal: { candidate: e.candidate } }));
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (!stream) return;
      if (e.track.kind === 'audio') {
        if (!peer.audioEl) { peer.audioEl = new Audio(); peer.audioEl.autoplay = true; }
        peer.audioEl.srcObject = stream;
      }
      if (e.track.kind === 'video') showRemoteVideo(remoteId, stream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') peer.connected = true;
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') closePeer(remoteId);
    };
    if (initiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: 'signal', targetId: remoteId, signal: { sdp: offer } }));
      });
    }
    return peer;
  }

  async function handleSignal(fromId, signal) {
    const peer = getOrCreatePeer(fromId, false);
    try {
      if (signal.sdp) {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === 'offer') {
          const answer = await peer.pc.createAnswer();
          await peer.pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'signal', targetId: fromId, signal: { sdp: answer } }));
        }
      } else if (signal.candidate) {
        await peer.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) { console.warn('Signal error:', err.message); }
  }

  function closePeer(id) {
    const peer = peers.get(id);
    if (peer) {
      if (peer.pc) peer.pc.close();
      if (peer.audioEl) peer.audioEl.srcObject = null;
      if (peer.videoBoxEl) peer.videoBoxEl.remove();
      peers.delete(id);
    }
  }

  function showRemoteVideo(remoteId, stream) {
    const peer = peers.get(remoteId);
    if (!peer) return;
    const u = users.get(remoteId);
    if (peer.videoBoxEl) peer.videoBoxEl.remove();
    const box = document.createElement('div');
    box.className = 'video-box';
    const video = document.createElement('video');
    video.autoplay = true; video.playsInline = true; video.muted = false; video.srcObject = stream;
    const label = document.createElement('div');
    label.className = 'video-label';
    label.textContent = u ? u.name : 'User';
    box.appendChild(video);
    box.appendChild(label);
    videoPanel.appendChild(box);
    peer.videoBoxEl = box;
    peer.videoEl = video;
    updateRoomPanel();
    if (galleryActive) updateGalleryView();
  }

  // ── Proximity auto-connect ──
  function updateProximityConnections() {
    users.forEach((u, id) => {
      const dx = myUser.x - u.x, dy = myUser.y - u.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const sameRoom = myCurrentRoom && userRooms.get(id) === myCurrentRoom.id;
      if (dist <= PROXIMITY_AUDIO || sameRoom) {
        const peer = peers.get(id);
        if (!peer) { if (myId < id) getOrCreatePeer(id, true); }
        else if (peer.audioEl) {
          if (sameRoom) {
            peer.audioEl.volume = 1;
          } else {
            peer.audioEl.volume = dist < PROXIMITY_FULL ? 1 : Math.max(0, 1 - (dist - PROXIMITY_FULL) / (PROXIMITY_AUDIO - PROXIMITY_FULL));
          }
        }
        if (peer && peer.videoBoxEl) {
          peer.videoBoxEl.style.display = (dist <= PROXIMITY_VIDEO || sameRoom) ? '' : 'none';
        }
      } else {
        if (peers.has(id)) closePeer(id);
      }
    });
  }

  // ── Controls ──
  async function toggleCamera() {
    isCameraOff = !isCameraOff;
    updateCameraUI();
    if (!isCameraOff) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        if (!localVideoEl) {
          localVideoEl = document.createElement('video');
          localVideoEl.autoplay = true;
          localVideoEl.playsInline = true;
          localVideoEl.muted = true;
          localVideoEl.style.display = 'none';
          document.body.appendChild(localVideoEl);
        }
        localVideoEl.srcObject = videoStream;
        peers.forEach((peer) => {
          const videoSender = peer.pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (videoSender) { videoSender.replaceTrack(videoTrack); }
          else {
            peer.pc.addTrack(videoTrack, localStream);
            peer.pc.createOffer().then(offer => {
              peer.pc.setLocalDescription(offer);
              peers.forEach((p, pid) => { if (p === peer) ws.send(JSON.stringify({ type: 'signal', targetId: pid, signal: { sdp: offer } })); });
            });
          }
        });
        localStream.addTrack(videoTrack);
      } catch (err) { isCameraOff = true; updateCameraUI(); }
    } else {
      localStream.getVideoTracks().forEach(t => { t.stop(); localStream.removeTrack(t); });
      if (localVideoEl) { localVideoEl.srcObject = null; }
    }
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'camera_toggle', cameraOff: isCameraOff }));
    updateRoomPanel();
    if (galleryActive) updateGalleryView();
  }

  function toggleMic() {
    isMuted = !isMuted;
    if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
    updateMicUI();
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'mute_toggle', muted: isMuted }));
    updateRoomPanel();
  }

  function updateMicUI() {
    btnMic.querySelector('.icon-mic-on').classList.toggle('hidden', isMuted);
    btnMic.querySelector('.icon-mic-off').classList.toggle('hidden', !isMuted);
    btnMic.classList.toggle('muted', isMuted);
    btnMic.classList.toggle('active', !isMuted);
  }

  function updateCameraUI() {
    btnCamera.querySelector('.icon-cam-on').classList.toggle('hidden', isCameraOff);
    btnCamera.querySelector('.icon-cam-off').classList.toggle('hidden', !isCameraOff);
    btnCamera.classList.toggle('active', !isCameraOff);
  }

  btnMic.addEventListener('click', toggleMic);
  btnCamera.addEventListener('click', toggleCamera);
  btnScreen.addEventListener('click', async () => {
    if (!isScreenSharing) {
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        isScreenSharing = true;
        btnScreen.classList.add('active');
        const screenTrack = screenStream.getVideoTracks()[0];
        peers.forEach((peer, pid) => {
          const videoSender = peer.pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          } else {
            peer.pc.addTrack(screenTrack, screenStream);
            peer.pc.createOffer().then(offer => {
              peer.pc.setLocalDescription(offer);
              if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'signal', targetId: pid, signal: { sdp: offer } }));
            });
          }
        });
        screenTrack.onended = () => { stopScreenShare(); };
      } catch (e) {
        if (e.name === 'NotAllowedError') {
          showNotification('Screen share blocked by browser.');
        } else if (e.name !== 'AbortError') {
          showNotification('Screen share failed: ' + e.message);
        }
      }
    } else {
      stopScreenShare();
    }
  });

  function stopScreenShare() {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      screenStream = null;
    }
    isScreenSharing = false;
    btnScreen.classList.remove('active');
    const cameraTrack = (!isCameraOff && localStream) ? localStream.getVideoTracks()[0] : null;
    peers.forEach((peer) => {
      const videoSender = peer.pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (videoSender) { videoSender.replaceTrack(cameraTrack); }
    });
  }

  btnLeave.addEventListener('click', () => {
    if (ws) ws.close();
    peers.forEach((_, id) => closePeer(id));
    users.clear();
    userRooms.clear();
    myId = null;
    myCurrentRoom = null;
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (localVideoEl) { localVideoEl.srcObject = null; }
    if (animFrame) cancelAnimationFrame(animFrame);
    app.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    btnJoin.textContent = 'Join Office';
    btnJoin.disabled = false;
    videoPanel.innerHTML = '';
    roomPanel.classList.add('hidden');
    furniturePanelOpen = false;
    furniturePanel.classList.add('hidden');
    btnFurniture.classList.add('hidden');
    if (galleryActive) toggleGallery();
    if (mediaRecorder && mediaRecorder.state === 'recording') stopRecording();
  });

  // Room panel toggle
  roomPanelToggle.addEventListener('click', () => {
    roomPanelExpanded = !roomPanelExpanded;
    roomPanel.classList.toggle('collapsed', !roomPanelExpanded);
  });
  roomPanel.querySelector('#room-panel-header').addEventListener('click', (e) => {
    if (e.target === roomPanelToggle) return;
    roomPanelExpanded = !roomPanelExpanded;
    roomPanel.classList.toggle('collapsed', !roomPanelExpanded);
  });

  // ── Canvas ──
  function initCanvas() {
    buildNavGrid();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('touchstart', onCanvasTouch, { passive: false });
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('contextmenu', onCanvasContextMenu);
    // Drag & drop from furniture panel
    canvas.addEventListener('dragover', (e) => { if (isAdminUser()) e.preventDefault(); });
    canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!isAdminUser()) return;
      const type = e.dataTransfer.getData('text/plain');
      if (!type) return;
      const pos = getCanvasCoords(e);
      placeFurnitureAt(type, pos.x, pos.y);
    });
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      keys[e.key.toLowerCase()] = true;
      // G key toggles nav grid debug overlay
      if (e.key.toLowerCase() === 'g' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        debugNavGrid = !debugNavGrid;
        showNotification(debugNavGrid ? 'Debug: Nav grid ON' : 'Debug: Nav grid OFF');
      }
    });
    document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
    render();
  }

  function resizeCanvas() {
    const wrapper = document.getElementById('canvas-wrapper');
    const scale = Math.min(wrapper.clientWidth / CANVAS_W, wrapper.clientHeight / CANVAS_H, 1);
    canvas.style.width = (CANVAS_W * scale) + 'px';
    canvas.style.height = (CANVAS_H * scale) + 'px';
  }

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (CANVAS_W / rect.width), y: (e.clientY - rect.top) * (CANVAS_H / rect.height) };
  }

  let moveTarget = null;
  let movePath = null;
  let movePathIdx = 0;

  function onCanvasMouseMove(e) {
    const pos = getCanvasCoords(e);
    mouseCanvasX = pos.x;
    mouseCanvasY = pos.y;
    // Admin dragging furniture
    if (adminDraggingIdx >= 0 && isAdminUser()) {
      const f = FURNITURE[adminDraggingIdx];
      if (f) {
        if (f.w !== undefined && f.h !== undefined) {
          f.x = pos.x - adminDragOffsetX;
          f.y = pos.y - adminDragOffsetY;
        } else {
          f.x = pos.x - adminDragOffsetX;
          f.y = pos.y - adminDragOffsetY;
        }
      }
    }
  }

  function onCanvasMouseDown(e) {
    if (e.button !== 0) return;
    if (!isAdminUser()) return;
    const pos = getCanvasCoords(e);
    const idx = getFurnitureAt(pos.x, pos.y);
    if (idx >= 0 && adminSelectedIdx === idx) {
      // Start dragging selected furniture
      adminDraggingIdx = idx;
      const f = FURNITURE[idx];
      if (f.w !== undefined && f.h !== undefined) {
        adminDragOffsetX = pos.x - f.x;
        adminDragOffsetY = pos.y - f.y;
      } else {
        adminDragOffsetX = pos.x - (f.x || 0);
        adminDragOffsetY = pos.y - (f.y || 0);
      }
    }
  }

  function onCanvasMouseUp(e) {
    if (adminDraggingIdx >= 0) {
      adminDraggingIdx = -1;
      onFurnitureChanged();
      sendFurnitureUpdate();
    }
  }

  function onCanvasContextMenu(e) {
    e.preventDefault();
    if (!isAdminUser()) return;
    const pos = getCanvasCoords(e);
    const idx = getFurnitureAt(pos.x, pos.y);
    if (idx >= 0) {
      const wrapper = document.getElementById('canvas-wrapper');
      const wrapRect = wrapper.getBoundingClientRect();
      furnitureCtxMenu.style.left = (e.clientX - wrapRect.left) + 'px';
      furnitureCtxMenu.style.top = (e.clientY - wrapRect.top) + 'px';
      furnitureCtxMenu.classList.remove('hidden');
      furnitureCtxMenu._targetIdx = idx;
      // Show rename only for desks
      const f = FURNITURE[idx];
      const renameBtn = furnitureCtxMenu.querySelector('.ctx-rename');
      if (renameBtn) renameBtn.classList.toggle('hidden', f.type !== 'desk');
    } else {
      furnitureCtxMenu.classList.add('hidden');
    }
  }

  function onCanvasClick(e) {
    const pos = getCanvasCoords(e);

    // Admin: select/deselect furniture
    if (isAdminUser()) {
      // If we just finished a drag, don't process click
      if (adminDraggingIdx >= 0) return;
      const idx = getFurnitureAt(pos.x, pos.y);
      if (idx >= 0) {
        adminSelectedIdx = idx;
        return;
      } else {
        adminSelectedIdx = -1;
      }
    }

    // Check whiteboard click
    for (let i = 0; i < FURNITURE.length; i++) {
      const f = FURNITURE[i];
      if (f.type !== 'whiteboard') continue;
      if (pos.x >= f.x - 5 && pos.x <= f.x + f.w + 5 && pos.y >= f.y - 5 && pos.y <= f.y + f.h + 5) {
        const room = getRoomAt(f.x + f.w / 2, f.y + f.h / 2);
        if (!room) break;
        if ((myCurrentRoom && myCurrentRoom.id === room.id) || isAdminUser()) {
          openWhiteboard(room.id);
          return;
        }
        break;
      }
    }

    // Check door buttons
    if (handleDoorClick(pos)) return;

    const tx = clamp(pos.x, AVATAR_R, CANVAS_W - AVATAR_R);
    const ty = clamp(pos.y, AVATAR_R, CANVAS_H - AVATAR_R);
    const path = findPath(myUser.x, myUser.y, tx, ty);
    if (path && path.length > 0) {
      movePath = path;
      movePathIdx = 0;
      moveTarget = movePath[0];
      lastMoveTime = performance.now();
    } else {
      // Teleport fallback: A* couldn't find a path, teleport directly
      teleportTo(tx, ty);
    }
  }

  function onCanvasTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchPos = { x: (touch.clientX - rect.left) * (CANVAS_W / rect.width), y: (touch.clientY - rect.top) * (CANVAS_H / rect.height) };
    if (handleDoorClick(touchPos)) return;
    const tx = clamp(touchPos.x, AVATAR_R, CANVAS_W - AVATAR_R);
    const ty = clamp(touchPos.y, AVATAR_R, CANVAS_H - AVATAR_R);
    const path = findPath(myUser.x, myUser.y, tx, ty);
    if (path && path.length > 0) {
      movePath = path;
      movePathIdx = 0;
      moveTarget = movePath[0];
      lastMoveTime = performance.now();
    } else {
      // Teleport fallback: A* couldn't find a path, teleport directly
      teleportTo(tx, ty);
    }
  }

  function teleportTo(tx, ty) {
    // Try the target position first via moveSelf (respects collision)
    if (moveSelf(tx, ty)) {
      moveTarget = null;
      movePath = null;
      return;
    }
    // Target blocked — find nearest walkable cell
    if (!navGrid) buildNavGrid();
    const gx = Math.floor(tx / GRID_CELL);
    const gy = Math.floor(ty / GRID_CELL);
    for (let r = 1; r < 30; r++) {
      for (let ddy = -r; ddy <= r; ddy++) {
        for (let ddx = -r; ddx <= r; ddx++) {
          if (Math.abs(ddx) !== r && Math.abs(ddy) !== r) continue;
          const nx = gx + ddx, ny = gy + ddy;
          if (nx >= 0 && ny >= 0 && nx < GRID_W && ny < GRID_H && !navGrid[ny * GRID_W + nx]) {
            const newX = nx * GRID_CELL + GRID_CELL / 2;
            const newY = ny * GRID_CELL + GRID_CELL / 2;
            if (moveSelf(newX, newY)) {
              moveTarget = null;
              movePath = null;
              return;
            }
          }
        }
      }
    }
    // Last resort: force position to nearest open cell
    moveTarget = null;
    movePath = null;
  }

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  function render() {
    update();
    draw();
    drawMinimap();
    animFrame = requestAnimationFrame(render);
  }

  function update() {
    // Keyboard movement
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= MOVE_SPEED;
    if (keys['s'] || keys['arrowdown']) dy += MOVE_SPEED;
    if (keys['a'] || keys['arrowleft']) dx -= MOVE_SPEED;
    if (keys['d'] || keys['arrowright']) dx += MOVE_SPEED;
    if (dx || dy) { moveTarget = null; movePath = null; moveSelf(myUser.x + dx, myUser.y + dy); }

    if (moveTarget) {
      const tdx = moveTarget.x - myUser.x, tdy = moveTarget.y - myUser.y;
      const dist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (dist < MOVE_SPEED) {
        moveSelf(moveTarget.x, moveTarget.y);
        if (movePath && movePathIdx < movePath.length - 1) {
          movePathIdx++;
          moveTarget = movePath[movePathIdx];
        } else {
          moveTarget = null;
          movePath = null;
        }
      } else {
        const ok = moveSelf(myUser.x + (tdx / dist) * MOVE_SPEED, myUser.y + (tdy / dist) * MOVE_SPEED);
        if (!ok && movePath && movePathIdx < movePath.length - 1) {
          // Skip to next waypoint if current one causes collision
          movePathIdx++;
          moveTarget = movePath[movePathIdx];
        } else if (!ok && !movePath) {
          // Direct move failed, give up
          moveTarget = null;
        } else if (!ok) {
          // All waypoints exhausted, teleport to final destination
          const finalTarget = movePath[movePath.length - 1];
          teleportTo(finalTarget.x, finalTarget.y);
        }
      }
    }

    // Stuck detection (500ms time-based)
    if (moveTarget) {
      const now = performance.now();
      if (Math.abs(myUser.x - lastMoveX) > 1 || Math.abs(myUser.y - lastMoveY) > 1) {
        lastMoveTime = now;
        lastMoveX = myUser.x;
        lastMoveY = myUser.y;
      } else if (now - lastMoveTime > 500) {
        // Stuck for 500ms — try rerouting first
        const dest = movePath ? movePath[movePath.length - 1] : moveTarget;
        navGrid = null; // Force grid rebuild in case something changed
        const newPath = findPath(myUser.x, myUser.y, dest.x, dest.y);
        if (newPath && newPath.length > 0) {
          movePath = newPath;
          movePathIdx = 0;
          moveTarget = movePath[0];
        } else {
          // Reroute failed — teleport to destination
          teleportTo(dest.x, dest.y);
        }
        lastMoveTime = now;
        lastMoveX = myUser.x;
        lastMoveY = myUser.y;
      }
    }

    users.forEach(u => {
      const ddx = u.targetX - u.x, ddy = u.targetY - u.y;
      if (Math.abs(ddx) + Math.abs(ddy) > 1) { u.x += ddx * 0.15; u.y += ddy * 0.15; }
      else { u.x = u.targetX; u.y = u.targetY; }
    });

    // Room tracking
    const room = getRoomAt(myUser.x, myUser.y);
    currentZone.textContent = room ? room.name : 'Hallway';

    const newRoomId = room ? room.id : null;
    const oldRoomId = myCurrentRoom ? myCurrentRoom.id : null;
    if (newRoomId !== oldRoomId) {
      myCurrentRoom = room;
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'room_change', room: newRoomId }));
      }
      if (room) {
        const peopleInRoom = getRoomUserCount(room.id);
        if (peopleInRoom > 0) {
          showNotification('You joined ' + room.name + ' \u2014 ' + peopleInRoom + ' people here');
        } else {
          showNotification('You entered ' + room.name);
        }
      }
      updateRoomPanel();
      if (galleryActive) updateGalleryView();
    }

    updateProximityConnections();
  }

  function getRoomUserCount(roomId) {
    let count = 0;
    userRooms.forEach((rid) => { if (rid === roomId) count++; });
    return count;
  }

  let lastSentPos = { x: 0, y: 0 };

  function moveSelf(nx, ny) {
    nx = clamp(nx, AVATAR_R, CANVAS_W - AVATAR_R);
    ny = clamp(ny, AVATAR_R, CANVAS_H - AVATAR_R);
    for (const [x1, y1, x2, y2] of WALLS) {
      if (pointToSegDist(nx, ny, x1, y1, x2, y2) < AVATAR_R + WALL_W / 2) {
        return false;
      }
    }
    for (const f of COLLISION_RECTS) {
      if (nx + AVATAR_R > f.x && nx - AVATAR_R < f.x + f.w && ny + AVATAR_R > f.y && ny - AVATAR_R < f.y + f.h) return false;
    }
    myUser.x = nx;
    myUser.y = ny;
    if (Math.abs(nx - lastSentPos.x) > 2 || Math.abs(ny - lastSentPos.y) > 2) {
      lastSentPos = { x: nx, y: ny };
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'move', x: nx, y: ny }));
    }
    return true;
  }

  function getRoomAt(x, y) {
    return ROOMS.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  }

  // ── Room Video Panel ──
  function updateRoomPanel() {
    if (!myCurrentRoom) {
      roomPanel.classList.add('hidden');
      return;
    }
    const roomUsers = [];
    users.forEach((u, id) => {
      if (userRooms.get(id) === myCurrentRoom.id) {
        roomUsers.push({ ...u, odId: id });
      }
    });
    if (roomUsers.length === 0) {
      roomPanel.classList.add('hidden');
      return;
    }
    roomPanel.classList.remove('hidden');
    roomPanelTitle.textContent = '\ud83c\udfe2 ' + myCurrentRoom.name + ' \u2014 ' + (roomUsers.length + 1) + ' people';
    roomPanelGrid.innerHTML = '';
    roomPanelGrid.appendChild(createRoomTile({
      name: myUser.name, color: myUser.color, muted: isMuted, cameraOff: isCameraOff, isSelf: true
    }));
    roomUsers.forEach(u => {
      roomPanelGrid.appendChild(createRoomTile({
        name: u.name, color: u.color, muted: u.muted, cameraOff: u.cameraOff, userId: u.odId
      }));
    });
  }

  function createRoomTile(opts) {
    const tile = document.createElement('div');
    tile.className = 'room-tile';
    if (!opts.cameraOff) {
      let videoSrc = null;
      if (opts.isSelf && localVideoEl && localVideoEl.srcObject) {
        videoSrc = localVideoEl.srcObject;
      } else if (opts.userId) {
        const peer = peers.get(opts.userId);
        if (peer && peer.videoEl && peer.videoEl.srcObject) videoSrc = peer.videoEl.srcObject;
      }
      if (videoSrc) {
        const video = document.createElement('video');
        video.autoplay = true; video.playsInline = true; video.muted = !!opts.isSelf;
        video.srcObject = videoSrc;
        tile.appendChild(video);
      } else {
        addTileAvatar(tile, opts);
      }
    } else {
      addTileAvatar(tile, opts);
    }
    const label = document.createElement('div');
    label.className = 'tile-label';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = opts.name + (opts.isSelf ? ' (you)' : '');
    const micDot = document.createElement('span');
    micDot.className = 'tile-mic-indicator' + (opts.muted ? ' muted' : '');
    label.appendChild(nameSpan);
    label.appendChild(micDot);
    tile.appendChild(label);
    return tile;
  }

  function addTileAvatar(tile, opts) {
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'tile-avatar';
    avatarDiv.style.background = opts.color;
    avatarDiv.textContent = (opts.name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    tile.appendChild(avatarDiv);
  }

  // ── Drawing ──
  function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawFloor();
    drawRooms();
    drawWalls();
    drawDoors();
    drawFurniture();
    drawEntrance();
    drawLobbyLogo();
    if (debugNavGrid) drawNavGridOverlay();
    drawProximityRings();
    users.forEach(u => drawAvatar(u, false));
    drawAvatar({ ...myUser, id: myId, muted: isMuted, cameraOff: isCameraOff, speaking: isSpeaking, status: userStatus }, true);
  }

  function drawFloor() {
    const rColors1 = ['#3D2810', '#3A2610', '#3B2711'];
    const rColors2 = ['#4A3520', '#483318', '#4C371E'];
    const cColors1 = ['#4E3A22', '#4B3822', '#4C3923'];
    const cColors2 = ['#5B4732', '#594530', '#5D4936'];
    for (let ty = 0; ty < CANVAS_H; ty += TILE_SIZE) {
      for (let tx = 0; tx < CANVAS_W; tx += TILE_SIZE) {
        const checker = ((tx / TILE_SIZE) + (ty / TILE_SIZE)) % 2 === 0;
        const ci = ((tx * 7 + ty * 13) >> 5) % 3;
        const inCorr = isCorridor(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2);
        ctx.fillStyle = checker
          ? (inCorr ? cColors1[ci] : rColors1[ci])
          : (inCorr ? cColors2[ci] : rColors2[ci]);
        ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 0.5;
        const grainOffset = ((tx * 3 + ty * 7) % 5);
        ctx.beginPath();
        ctx.moveTo(tx, ty + 4 + grainOffset);
        ctx.lineTo(tx + TILE_SIZE, ty + 4 + grainOffset);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tx, ty + 12 + (grainOffset % 3));
        ctx.lineTo(tx + TILE_SIZE, ty + 12 + (grainOffset % 3));
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 0.3;
        ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  function drawRooms() {
    ROOMS.forEach(r => {
      if (r.private) {
        ctx.fillStyle = r.color || 'rgba(10,22,40,0.9)';
        ctx.fillRect(r.x + WALL_W / 2, r.y + WALL_W / 2, r.w - WALL_W, r.h - WALL_W);
        ctx.strokeStyle = 'rgba(30,144,255,0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x + WALL_W / 2, r.y + WALL_W / 2, r.w - WALL_W, r.h - WALL_W);
      } else if (r.id === 'lobby') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(r.x + WALL_W / 2, r.y + WALL_W / 2, r.w - WALL_W, r.h - WALL_W);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(r.x + WALL_W / 2, r.y + WALL_W / 2, r.w - WALL_W, r.h - WALL_W);
      }
      ctx.save();
      const labelText = r.name;
      ctx.font = 'bold 11px "Courier New", monospace';
      const tw = ctx.measureText(labelText).width + 16;
      const lx = r.x + r.w / 2 - tw / 2;
      const ly = r.y + 10;
      ctx.fillStyle = 'rgba(20,15,10,0.85)';
      roundRect(ctx, lx, ly, tw, 18, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(200,180,140,0.4)';
      ctx.lineWidth = 1;
      roundRect(ctx, lx, ly, tw, 18, 3); ctx.stroke();
      ctx.fillStyle = r.private ? 'rgba(100,180,255,0.9)' : 'rgba(255,250,240,0.85)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, r.x + r.w / 2, ly + 9);
      ctx.restore();
    });
  }

  function drawWalls() {
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = WALL_W + 4;
    ctx.lineCap = 'round';
    WALLS.forEach(([x1, y1, x2, y2]) => {
      if (x1 === x2 && y1 === y2) return;
      ctx.beginPath(); ctx.moveTo(x1 + 2, y1 + 2); ctx.lineTo(x2 + 2, y2 + 2); ctx.stroke();
    });
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = WALL_W;
    ctx.lineCap = 'round';
    WALLS.forEach(([x1, y1, x2, y2]) => {
      if (x1 === x2 && y1 === y2) return;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(200,180,140,0.3)';
    ctx.lineWidth = 2;
    WALLS.forEach(([x1, y1, x2, y2]) => {
      if (x1 === x2 && y1 === y2) return;
      ctx.beginPath(); ctx.moveTo(x1 - 1, y1 - 1); ctx.lineTo(x2 - 1, y2 - 1); ctx.stroke();
    });
  }

  function drawEntrance() {
    const cx = 700, cy = 860;
    // Welcome mat
    ctx.save();
    ctx.fillStyle = '#6B3A1F';
    roundRect(ctx, cx - 50, cy + 5, 100, 22, 4); ctx.fill();
    ctx.strokeStyle = '#8B5A3F';
    ctx.lineWidth = 1;
    roundRect(ctx, cx - 50, cy + 5, 100, 22, 4); ctx.stroke();
    ctx.font = 'bold 8px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#D4A574';
    ctx.fillText('WELCOME', cx, cy + 16);
    ctx.restore();
    // Double glass doors
    ctx.save();
    // Left door
    ctx.fillStyle = 'rgba(120,200,255,0.25)';
    ctx.fillRect(cx - 38, cy - 40, 34, 44);
    ctx.strokeStyle = '#6A9AB0';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 38, cy - 40, 34, 44);
    // Right door
    ctx.fillStyle = 'rgba(120,200,255,0.25)';
    ctx.fillRect(cx + 4, cy - 40, 34, 44);
    ctx.strokeStyle = '#6A9AB0';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + 4, cy - 40, 34, 44);
    // Door handles
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.arc(cx - 8, cy - 18, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 8, cy - 18, 3, 0, Math.PI * 2); ctx.fill();
    // Cross pattern on glass
    ctx.strokeStyle = 'rgba(120,200,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(cx - 21, cy - 40); ctx.lineTo(cx - 21, cy + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 21, cy - 40); ctx.lineTo(cx + 21, cy + 4); ctx.stroke();
    ctx.restore();
    // "EXACTO OFFICE" sign above
    ctx.save();
    ctx.fillStyle = 'rgba(0,20,40,0.85)';
    roundRect(ctx, cx - 80, cy - 62, 160, 20, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(0,180,255,0.4)';
    ctx.lineWidth = 1;
    roundRect(ctx, cx - 80, cy - 62, 160, 20, 4); ctx.stroke();
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00BFFF';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00CFFF';
    ctx.fillText('EXACTO OFFICE', cx, cy - 52);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawFurniture() {
    FURNITURE.forEach((f, idx) => {
      // Admin selected highlight
      if (isAdminUser() && idx === adminSelectedIdx) {
        ctx.save();
        ctx.strokeStyle = '#1E90FF';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 3]);
        if (f.type === 'round_table' || f.type === 'firepit') {
          ctx.beginPath(); ctx.arc(f.x, f.y, (f.r || 15) + 6, 0, Math.PI * 2); ctx.stroke();
        } else if (f.type === 'chair' || f.type === 'conf_chair' || f.type === 'beanbag') {
          ctx.beginPath(); ctx.arc(f.x, f.y, 18, 0, Math.PI * 2); ctx.stroke();
        } else if (f.type === 'tree' || f.type === 'plant' || f.type === 'plant_large') {
          ctx.beginPath(); ctx.arc(f.x, f.y, 28, 0, Math.PI * 2); ctx.stroke();
        } else if (f.w && f.h) {
          ctx.strokeRect(f.x - 3, f.y - 3, f.w + 6, f.h + 6);
        }
        ctx.setLineDash([]);
        ctx.restore();
      }

      switch (f.type) {
        case 'desk': drawDesk(f); break;
        case 'monitor': drawMonitor(f); break;
        case 'monitor_kb': drawMonitorKB(f); break;
        case 'chair': drawChair(f.x, f.y); break;
        case 'conf_chair': drawConfChair(f.x, f.y); break;
        case 'plant': drawPlant(f.x, f.y, 14); break;
        case 'plant_large': drawPlant(f.x, f.y, 20); break;
        case 'tree': drawTree(f.x, f.y); break;
        case 'sofa': drawSofa(f); break;
        case 'coffeetable': drawCoffeeTable(f); break;
        case 'conference_table': drawConferenceTable(f); break;
        case 'worktable': drawWorktable(f); break;
        case 'reception': drawReception(f); break;
        case 'vending': drawVending(f); break;
        case 'screen': drawScreen(f); break;
        case 'exec_desk': drawDesk(f); break;
        case 'beanbag': drawBeanbag(f.x, f.y, f.color); break;
        case 'round_table': drawRoundTable(f.x, f.y, f.r); break;
        case 'firepit': drawFirepit(f.x, f.y, f.r); break;
        case 'whiteboard': drawWhiteboardFurniture(f); break;
        case 'equipment': drawEquipment(f); break;
        case 'toolrack': drawToolrack(f); break;
      }
    });
  }

  function drawDesk(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, f.x + 2, f.y + 2, f.w, f.h, 3); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x + f.w, f.y + f.h);
    grad.addColorStop(0, '#5C4033'); grad.addColorStop(0.3, '#6B4C3B');
    grad.addColorStop(0.7, '#5A3D2E'); grad.addColorStop(1, '#4A3020');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 3); ctx.fill();
    ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 1.5;
    roundRect(ctx, f.x, f.y, f.w, f.h, 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const gy = f.y + 8 + i * 10;
      if (gy < f.y + f.h - 4) {
        ctx.beginPath(); ctx.moveTo(f.x + 4, gy); ctx.lineTo(f.x + f.w - 4, gy); ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(f.x + 3, f.y + 1); ctx.lineTo(f.x + f.w - 3, f.y + 1); ctx.stroke();
    if (f.deskName) {
      ctx.save();
      ctx.font = '10px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(f.deskName, f.x + f.w / 2, f.y - 2);
      ctx.restore();
    }
  }

  function drawMonitor(f) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(f.x - 1, f.y - 1, f.w + 2, f.h + 4);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(f.x, f.y, f.w, f.h);
    const glow = ctx.createRadialGradient(f.x + f.w / 2, f.y + f.h / 2, 0, f.x + f.w / 2, f.y + f.h / 2, f.w / 2);
    glow.addColorStop(0, 'rgba(80,180,255,0.6)');
    glow.addColorStop(0.6, 'rgba(40,120,200,0.3)');
    glow.addColorStop(1, 'rgba(20,60,120,0.1)');
    ctx.fillStyle = glow;
    ctx.fillRect(f.x + 1, f.y + 1, f.w - 2, f.h - 2);
  }

  function drawMonitorKB(f) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(f.x - 1, f.y - 1, f.w + 2, 12);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(f.x, f.y, f.w, 10);
    const glow = ctx.createRadialGradient(f.x + f.w / 2, f.y + 5, 0, f.x + f.w / 2, f.y + 5, f.w / 2);
    glow.addColorStop(0, 'rgba(80,180,255,0.6)');
    glow.addColorStop(1, 'rgba(20,60,120,0.1)');
    ctx.fillStyle = glow;
    ctx.fillRect(f.x + 1, f.y + 1, f.w - 2, 8);
    ctx.fillStyle = '#333';
    roundRect(ctx, f.x + 2, f.y + 14, f.w - 4, 8, 2); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 0.5;
    roundRect(ctx, f.x + 2, f.y + 14, f.w - 4, 8, 2); ctx.stroke();
  }

  function drawChair(x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(x + 1, y + 2, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 9);
    grad.addColorStop(0, '#5a5a5a'); grad.addColorStop(1, '#333');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1; ctx.stroke();
  }

  function drawConfChair(x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(x + 1, y + 2, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 10);
    grad.addColorStop(0, '#6a6a6a'); grad.addColorStop(1, '#444');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke();
  }

  function drawPlant(cx, cy, r) {
    ctx.fillStyle = '#8B4513';
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.3, r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6B3510'; ctx.lineWidth = 1; ctx.stroke();
    const leafColors = ['#2D8B2D', '#3AA63A', '#228B22', '#1B7A1B', '#2E9E2E'];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const lx = cx + Math.cos(angle) * r * 0.35;
      const ly = cy + Math.sin(angle) * r * 0.35 - r * 0.15;
      const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 0.45);
      lg.addColorStop(0, leafColors[i % leafColors.length]); lg.addColorStop(1, '#1a5e1a');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(lx, ly, r * 0.45, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#1B5E1B';
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 0.3, 0, Math.PI * 2); ctx.fill();
  }

  function drawTree(cx, cy) {
    const r = 28;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(cx + 2, cy + r * 0.6 + 2, r * 0.7, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4A3020';
    ctx.fillRect(cx - 4, cy + r * 0.2, 8, r * 0.5);
    const layers = [
      { offset: 0, rad: r, color: '#1a4a1a' },
      { offset: -3, rad: r * 0.85, color: '#1f5e1f' },
      { offset: -5, rad: r * 0.7, color: '#2a7a2a' },
      { offset: -6, rad: r * 0.5, color: '#35903a' },
    ];
    for (const l of layers) {
      const g = ctx.createRadialGradient(cx, cy + l.offset, 0, cx, cy + l.offset, l.rad);
      g.addColorStop(0, l.color); g.addColorStop(0.7, l.color); g.addColorStop(1, 'rgba(0,40,0,0.3)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy + l.offset, l.rad, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawSofa(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, f.x + 2, f.y + 2, f.w, f.h, 8); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x, f.y + f.h);
    grad.addColorStop(0, '#5A7B50'); grad.addColorStop(1, '#3A5231');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 8); ctx.fill();
    ctx.strokeStyle = '#2D4226'; ctx.lineWidth = 1.5;
    roundRect(ctx, f.x, f.y, f.w, f.h, 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(f.x + 10, f.y + f.h / 2); ctx.lineTo(f.x + f.w - 10, f.y + f.h / 2); ctx.stroke();
    ctx.fillStyle = '#4A6741';
    roundRect(ctx, f.x, f.y, 12, f.h, 4); ctx.fill();
    roundRect(ctx, f.x + f.w - 12, f.y, 12, f.h, 4); ctx.fill();
  }

  function drawCoffeeTable(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, f.x + 1, f.y + 1, f.w, f.h, 4); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x + f.w, f.y + f.h);
    grad.addColorStop(0, '#7B5B3F'); grad.addColorStop(1, '#5C4033');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.fill();
    ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 1;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.stroke();
  }

  function drawConferenceTable(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(f.x + f.w / 2 + 3, f.y + f.h / 2 + 3, f.w / 2, f.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(f.x + f.w / 2, f.y + f.h / 2, 0, f.x + f.w / 2, f.y + f.h / 2, f.w / 2);
    grad.addColorStop(0, '#7B5B3F'); grad.addColorStop(0.8, '#5C4033'); grad.addColorStop(1, '#4A3020');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(f.x + f.w / 2, f.y + f.h / 2, f.w / 2, f.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 2; ctx.stroke();
  }

  function drawWorktable(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, f.x + 2, f.y + 2, f.w, f.h, 4); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x + f.w, f.y);
    grad.addColorStop(0, '#7A6B5F'); grad.addColorStop(0.5, '#8A7B6F'); grad.addColorStop(1, '#6B5B4F');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.fill();
    ctx.strokeStyle = '#4A3D33'; ctx.lineWidth = 1.5;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.stroke();
  }

  function drawReception(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, f.x + 2, f.y + 2, f.w, f.h, 6); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x + f.w, f.y);
    grad.addColorStop(0, '#4A3520'); grad.addColorStop(0.5, '#5C4033'); grad.addColorStop(1, '#4A3520');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 6); ctx.fill();
    ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 1.5;
    roundRect(ctx, f.x, f.y, f.w, f.h, 6); ctx.stroke();
    ctx.fillStyle = 'rgba(80,180,255,0.3)';
    ctx.fillRect(f.x + f.w / 2 - 15, f.y + 6, 30, 8);
  }

  function drawVending(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, f.x + 2, f.y + 2, f.w, f.h, 4); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x, f.y + f.h);
    grad.addColorStop(0, '#5B6070'); grad.addColorStop(1, '#3D4250');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.fill();
    ctx.strokeStyle = '#2D3240'; ctx.lineWidth = 1;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.stroke();
    ctx.fillStyle = 'rgba(100,200,255,0.25)';
    roundRect(ctx, f.x + 4, f.y + 5, f.w - 8, f.h - 20, 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,100,100,0.4)';
    ctx.beginPath(); ctx.arc(f.x + f.w / 2, f.y + f.h - 8, 3, 0, Math.PI * 2); ctx.fill();
  }

  function drawScreen(f) {
    ctx.fillStyle = '#666';
    ctx.fillRect(f.x + f.w / 2 - 3, f.y - 5, 6, 5);
    ctx.fillStyle = '#222';
    roundRect(ctx, f.x, f.y, f.w, f.h, 2); ctx.fill();
    ctx.fillStyle = 'rgba(60,140,255,0.2)';
    ctx.fillRect(f.x + 2, f.y + 2, f.w - 4, f.h - 4);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
    roundRect(ctx, f.x, f.y, f.w, f.h, 2); ctx.stroke();
  }

  function drawBeanbag(x, y, color) {
    color = color || '#E74C3C';
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(x + 1, y + 2, 19, 8, 0, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 18);
    grad.addColorStop(0, lightenColor(color, 40)); grad.addColorStop(0.6, color); grad.addColorStop(1, darkenColor(color, 30));
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = darkenColor(color, 40); ctx.lineWidth = 1.5; ctx.stroke();
  }

  function drawRoundTable(x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.arc(x + 1, y + 1, r, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, '#7B5B3F'); grad.addColorStop(1, '#5C4033');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 1; ctx.stroke();
  }

  function drawFirepit(x, y, r) {
    ctx.fillStyle = '#5A5A5A';
    ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath(); ctx.arc(x, y, r - 2, 0, Math.PI * 2); ctx.fill();
    const t = Date.now() / 300;
    const flicker = 0.7 + 0.3 * Math.sin(t);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, 'rgba(255,160,20,' + (0.6 * flicker) + ')');
    glow.addColorStop(0.5, 'rgba(255,80,20,' + (0.3 * flicker) + ')');
    glow.addColorStop(1, 'rgba(100,30,0,0.05)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function drawWhiteboardFurniture(f) {
    ctx.fillStyle = '#DDD';
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1;
    ctx.strokeRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = 'rgba(0,0,200,0.1)'; ctx.lineWidth = 0.5;
    const stepX = f.w > f.h ? 15 : 5;
    const stepY = f.w > f.h ? 5 : 15;
    for (let i = 1; i < (f.w > f.h ? f.h : f.w) / stepY; i++) {
      ctx.beginPath();
      if (f.w > f.h) {
        ctx.moveTo(f.x + 3, f.y + i * stepY);
        ctx.lineTo(f.x + f.w - 3, f.y + i * stepY);
      } else {
        ctx.moveTo(f.x + i * stepX, f.y + 3);
        ctx.lineTo(f.x + i * stepX, f.y + f.h - 3);
      }
      ctx.stroke();
    }
    const room = getRoomAt(f.x + f.w / 2, f.y + f.h / 2);
    if (room && boardContents[room.id]) {
      const lines = boardContents[room.id].split('\n').filter(l => l.trim()).length;
      if (lines > 0) {
        ctx.save();
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const isH = f.w > f.h;
        const labelX = isH ? f.x + f.w / 2 : f.x + f.w + 14;
        const labelY = isH ? f.y + f.h + 10 : f.y + f.h / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        roundRect(ctx, labelX - 22, labelY - 7, 44, 14, 3); ctx.fill();
        ctx.fillStyle = '#FFD43B';
        ctx.fillText('\ud83d\udcdd ' + lines, labelX, labelY);
        ctx.restore();
      }
    }
  }

  function drawEquipment(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, f.x + 2, f.y + 2, f.w, f.h, 4); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x, f.y + f.h);
    grad.addColorStop(0, '#6A6A70'); grad.addColorStop(1, '#4A4A50');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.fill();
    ctx.strokeStyle = '#3A3A40'; ctx.lineWidth = 1;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.fillRect(f.x + 8, f.y + 8, f.w - 16, f.h / 2 - 8);
    ctx.fillStyle = 'rgba(0,255,0,0.5)';
    ctx.beginPath(); ctx.arc(f.x + 15, f.y + f.h - 12, 3, 0, Math.PI * 2); ctx.fill();
  }

  function drawToolrack(f) {
    ctx.fillStyle = '#5A4A3A';
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 1;
    ctx.strokeRect(f.x, f.y, f.w, f.h);
    ctx.fillStyle = '#888';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(f.x + 5, f.y + 15 + i * 25, f.w - 10, 3);
    }
  }

  function drawLobbyLogo() {
    const lobby = ROOMS.find(r => r.id === 'lobby');
    if (!lobby) return;
    const lx = lobby.x + 20;
    const ly = lobby.y + lobby.h / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,20,40,0.5)';
    roundRect(ctx, lx - 5, ly - 25, 160, 50, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(0,180,255,0.3)'; ctx.lineWidth = 1;
    roundRect(ctx, lx - 5, ly - 25, 160, 50, 6); ctx.stroke();
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00BFFF'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#00CFFF';
    ctx.fillText('EXACTO', lx, ly - 6);
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#00AADD';
    ctx.fillText('SIGNAGE', lx + 2, ly + 14);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Door drawing ──
  function drawDoors() {
    for (const roomId of ['carlos', 'brian']) {
      const dw = DOOR_WALLS[roomId];
      const midX = (dw[0] + dw[2]) / 2;
      const doorY = dw[1];
      const locked = doorState[roomId];

      if (locked) {
        ctx.save();
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = WALL_W;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(dw[0], dw[1]); ctx.lineTo(dw[2], dw[3]); ctx.stroke();
        ctx.strokeStyle = 'rgba(200,180,140,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(dw[0] - 1, dw[1] - 1); ctx.lineTo(dw[2] - 1, dw[3] - 1); ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = '9px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        roundRect(ctx, midX - 32, doorY - 22, 64, 16, 3); ctx.fill();
        ctx.fillStyle = '#ff4757';
        ctx.fillText('\ud83d\udd34 Locked', midX, doorY - 14);
        ctx.restore();
      } else {
        ctx.save();
        ctx.font = '9px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        roundRect(ctx, midX - 26, doorY - 22, 52, 16, 3); ctx.fill();
        ctx.fillStyle = '#51CF66';
        ctx.fillText('\ud83d\udfe2 Open', midX, doorY - 14);
        ctx.restore();
      }

      const ownedOffice = getOwnedOffice();
      const myRoom = getRoomAt(myUser.x, myUser.y);
      const btnX = midX + 38, btnY = doorY - 14;

      if (ownedOffice === roomId && myRoom && myRoom.id === roomId) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        roundRect(ctx, btnX - 14, btnY - 11, 28, 22, 4); ctx.fill();
        ctx.strokeStyle = locked ? '#ff4757' : '#51CF66';
        ctx.lineWidth = 1;
        roundRect(ctx, btnX - 14, btnY - 11, 28, 22, 4); ctx.stroke();
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\ud83d\udd12', btnX, btnY);
        ctx.restore();
      } else if (locked && ownedOffice !== roomId) {
        const dist = Math.sqrt((myUser.x - midX) ** 2 + (myUser.y - doorY) ** 2);
        if (dist < 100) {
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          roundRect(ctx, btnX - 14, btnY - 11, 28, 22, 4); ctx.fill();
          ctx.strokeStyle = '#FFD43B';
          ctx.lineWidth = 1;
          roundRect(ctx, btnX - 14, btnY - 11, 28, 22, 4); ctx.stroke();
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\ud83d\udeaa', btnX, btnY);
          ctx.restore();
        }
      }
    }
  }

  function drawNavGridOverlay() {
    if (!navGrid) return;
    ctx.save();
    ctx.globalAlpha = 0.3;
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const blocked = navGrid[gy * GRID_W + gx];
        ctx.fillStyle = blocked ? 'rgba(255,0,0,0.5)' : 'rgba(0,255,0,0.15)';
        ctx.fillRect(gx * GRID_CELL, gy * GRID_CELL, GRID_CELL, GRID_CELL);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawProximityRings() {
    const x = myUser.x, y = myUser.y;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, PROXIMITY_RING_VISUAL, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawAvatar(u, isSelf) {
    const x = u.x, y = u.y;
    const hasVideo = isSelf ? (!isCameraOff && localVideoEl && localVideoEl.srcObject) : (!u.cameraOff);
    const drawR = hasVideo ? AVATAR_R_VIDEO : AVATAR_R;

    if (u.speaking && !u.muted) {
      const pulse = 1 + 0.15 * Math.sin(Date.now() / 150);
      ctx.beginPath(); ctx.arc(x, y, drawR * pulse + 6, 0, Math.PI * 2);
      ctx.strokeStyle = u.color; ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Date.now() / 150);
      ctx.stroke(); ctx.globalAlpha = 1;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x + 1, y + drawR + 2, drawR * 0.8, 5, 0, 0, Math.PI * 2); ctx.fill();

    let drewVideo = false;
    if (hasVideo) {
      let videoEl = null;
      if (isSelf && localVideoEl && localVideoEl.readyState >= 2) {
        videoEl = localVideoEl;
      } else if (!isSelf && u.id) {
        const peer = peers.get(u.id);
        if (peer && peer.videoEl && peer.videoEl.readyState >= 2) videoEl = peer.videoEl;
      }
      if (videoEl) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, drawR, 0, Math.PI * 2);
        ctx.clip();
        const vw = videoEl.videoWidth || drawR * 2;
        const vh = videoEl.videoHeight || drawR * 2;
        const scale = Math.max(drawR * 2 / vw, drawR * 2 / vh);
        const sw = vw * scale, sh = vh * scale;
        try {
          ctx.drawImage(videoEl, x - sw / 2, y - sh / 2, sw, sh);
          drewVideo = true;
        } catch (e) { /* video not ready */ }
        ctx.restore();
      }
    }

    if (!drewVideo) {
      ctx.beginPath(); ctx.arc(x, y, drawR, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(x - drawR * 0.4, y - drawR * 0.4, 2, x, y, drawR);
      grad.addColorStop(0, lightenColor(u.color, 40)); grad.addColorStop(1, u.color);
      ctx.fillStyle = grad; ctx.fill();
    }

    ctx.beginPath(); ctx.arc(x, y, drawR, 0, Math.PI * 2);
    ctx.strokeStyle = isSelf ? '#fff' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = isSelf ? 3 : 2; ctx.stroke();
    if (isSelf) {
      ctx.strokeStyle = darkenColor(u.color, 30);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, drawR + 3, 0, Math.PI * 2); ctx.stroke();
    }

    if (!drewVideo) {
      const initials = (u.name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      const fontSize = hasVideo ? 18 : 9;
      ctx.font = 'bold ' + fontSize + 'px "Courier New", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillText(initials, x + 1, y + 1);
      ctx.fillStyle = '#fff';
      ctx.fillText(initials, x, y);
    }

    ctx.font = '10px "Courier New", monospace';
    ctx.textBaseline = 'top';
    const nameW = ctx.measureText(u.name).width + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    roundRect(ctx, x - nameW / 2, y + drawR + 6, nameW, 16, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 0.5;
    roundRect(ctx, x - nameW / 2, y + drawR + 6, nameW, 16, 3); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(u.name, x, y + drawR + 9);

    if (u.muted) {
      ctx.fillStyle = '#ff4757';
      ctx.beginPath(); ctx.arc(x + drawR - 4, y - drawR + 4, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + drawR - 7, y - drawR + 1); ctx.lineTo(x + drawR - 1, y - drawR + 7); ctx.stroke();
    }

    const camDotX = x + drawR - 2;
    const camDotY = y + drawR - 2;
    ctx.beginPath(); ctx.arc(camDotX, camDotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = hasVideo ? '#51CF66' : '#888';
    ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();

    const uStatus = isSelf ? userStatus : (u.status || 'available');
    const statusColors = { available: '#51CF66', out: '#FFD43B', focusing: '#ff4757' };
    const dotColor = statusColors[uStatus] || '#51CF66';
    const statusDotX = x - drawR + 4;
    const statusDotY = y + drawR - 4;
    ctx.beginPath(); ctx.arc(statusDotX, statusDotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();

    if (isSelf && peers.size > 0) {
      ctx.save();
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      let anyVideo = false;
      peers.forEach(p => { if (p.videoEl && p.videoBoxEl && p.videoBoxEl.style.display !== 'none') anyVideo = true; });
      const icon = anyVideo ? '\ud83d\udcf9' : '\ud83c\udf99\ufe0f';
      ctx.fillText(icon, x - drawR - 16, y);
      ctx.restore();
    }
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }

  function lightenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    return 'rgb(' + Math.min(255, (num >> 16) + amount) + ',' + Math.min(255, ((num >> 8) & 0xFF) + amount) + ',' + Math.min(255, (num & 0xFF) + amount) + ')';
  }

  function darkenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    return 'rgb(' + Math.max(0, (num >> 16) - amount) + ',' + Math.max(0, ((num >> 8) & 0xFF) - amount) + ',' + Math.max(0, (num & 0xFF) - amount) + ')';
  }

  // ── Minimap ──
  function drawMinimap() {
    const mmW = minimap.width, mmH = minimap.height;
    const sx = mmW / CANVAS_W, sy = mmH / CANVAS_H;
    minimapCtx.fillStyle = '#2A1D10';
    minimapCtx.fillRect(0, 0, mmW, mmH);
    // Draw corridors
    minimapCtx.fillStyle = 'rgba(80,65,45,0.6)';
    minimapCtx.fillRect(0, 260 * sy, mmW, 60 * sy);
    minimapCtx.fillRect(0, 580 * sy, mmW, 60 * sy);
    minimapCtx.fillRect(670 * sx, 0, 60 * sx, mmH);
    minimapCtx.fillRect(960 * sx, 260 * sy, (1400 - 960) * sx, (900 - 260) * sy);
    minimapCtx.fillRect(0, 820 * sy, mmW, (900 - 820) * sy);
    ROOMS.forEach(r => {
      if (r.id === 'lobby') {
        minimapCtx.fillStyle = 'rgba(0,0,0,0.3)';
      } else if (r.private) {
        minimapCtx.fillStyle = r.color;
      } else {
        minimapCtx.fillStyle = 'rgba(255,255,255,0.06)';
      }
      minimapCtx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
      minimapCtx.strokeStyle = '#8B7355'; minimapCtx.lineWidth = 1;
      minimapCtx.strokeRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
    });
    // Entrance marker
    minimapCtx.fillStyle = '#00CFFF';
    minimapCtx.fillRect(690 * sx, 855 * sy, 20 * sx, 10 * sy);
    users.forEach(u => {
      minimapCtx.beginPath(); minimapCtx.arc(u.x * sx, u.y * sy, 3, 0, Math.PI * 2);
      minimapCtx.fillStyle = u.color; minimapCtx.fill();
    });
    minimapCtx.beginPath(); minimapCtx.arc(myUser.x * sx, myUser.y * sy, 4, 0, Math.PI * 2);
    minimapCtx.fillStyle = '#fff'; minimapCtx.fill();
    minimapCtx.strokeStyle = myUser.color; minimapCtx.lineWidth = 1.5; minimapCtx.stroke();
  }

  // ── Service Worker ──
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
