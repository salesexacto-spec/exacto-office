(() => {
  'use strict';

  // ── Constants ──
  const CANVAS_W = 1400, CANVAS_H = 900;
  const AVATAR_R = 10;
  const AVATAR_R_VIDEO = 28; // bigger radius when camera is on
  const MOVE_SPEED = 4;
  const PROXIMITY_AUDIO = 300;
  const PROXIMITY_VIDEO = 150;
  const PROXIMITY_FULL = 80;
  const TILE_SIZE = 20;
  const WALL_W = 10;
  const GRID_CELL = 8; // pathfinding grid resolution

  // ── Room definitions (new layout) ──
  const ROOMS = [
    { id: 'ventas',         name: 'Ventas',                     x: 0,    y: 0,   w: 380,  h: 280 },
    { id: 'soporte',        name: 'Soporte T\u00e9cnico',       x: 380,  y: 0,   w: 300,  h: 280 },
    { id: 'coordinacion',   name: 'Coordinaci\u00f3n',          x: 680,  y: 0,   w: 200,  h: 280 },
    { id: 'produccion',     name: 'Producci\u00f3n',            x: 880,  y: 0,   w: 520,  h: 350 },
    { id: 'desarrollo',     name: 'Desarrollo',                 x: 0,    y: 280, w: 380,  h: 280 },
    { id: 'lobby',          name: 'Lobby',                      x: 380,  y: 280, w: 500,  h: 280 },
    { id: 'admin',          name: 'Administraci\u00f3n',        x: 880,  y: 350, w: 520,  h: 210 },
    { id: 'breakroom',      name: 'Break Room',                 x: 0,    y: 560, w: 380,  h: 340 },
    { id: 'conferencia',    name: 'Sala de Conferencias',       x: 380,  y: 560, w: 500,  h: 340 },
    { id: 'mantenimiento',  name: 'Mantenimiento',              x: 880,  y: 560, w: 520,  h: 340 },
    { id: 'carlos',         name: '\ud83d\udd35 Oficina Carlos',  x: 1180, y: 0,   w: 220,  h: 175, private: true, color: '#0a1628' },
    { id: 'brian',          name: '\ud83d\udfe3 Oficina Brian',    x: 1180, y: 175, w: 220,  h: 175, private: true, color: '#120a28' },
  ];

  // ── Walls ── [x1,y1, x2,y2]
  const WALLS = [
    // Outer boundary
    [0,0, 1400,0], [1400,0, 1400,900], [1400,900, 0,900], [0,900, 0,0],
    // ─── Top row horizontal dividers ───
    [0, 280, 160, 280], [220, 280, 380, 280],
    [380, 280, 480, 280], [540, 280, 680, 280],
    [680, 280, 780, 280], [840, 280, 880, 280],
    [880, 350, 1000, 350], [1060, 350, 1116, 350],
    // ─── Vertical dividers top row ───
    [380, 0, 380, 120], [380, 180, 380, 280],
    [680, 0, 680, 100], [680, 160, 680, 280],
    [880, 0, 880, 110], [880, 170, 880, 350],
    // ─── Middle row ───
    [0, 560, 150, 560], [210, 560, 380, 560],
    [380, 560, 500, 560], [560, 560, 880, 560],
    [880, 560, 1000, 560], [1060, 560, 1400, 560],
    // ─── Vertical dividers middle ───
    [380, 280, 380, 380], [380, 440, 380, 560],
    [880, 350, 880, 430], [880, 490, 880, 560],
    // ─── Bottom row ───
    [380, 560, 380, 660], [380, 720, 380, 900],
    [880, 560, 880, 660], [880, 720, 880, 900],
    // ─── Corridor left wall ───
    [1116, 0, 1116, 130], [1116, 190, 1116, 350],
    // ─── Private offices ───
    [1180, 0, 1180, 55], [1180, 100, 1180, 175],
    [1180, 175, 1180, 230], [1180, 280, 1180, 350],
    [1180, 175, 1280, 175], [1340, 175, 1400, 175],
  ];

  // ── Default Furniture ──
  const DEFAULT_FURNITURE = [
    // === Ventas (Sales) - 8 desks ===
    { type: 'desk', x: 30,  y: 50,  w: 70, h: 38 },
    { type: 'monitor', x: 42, y: 54, w: 26, h: 5 },
    { type: 'chair', x: 65, y: 98 },
    { type: 'desk', x: 120, y: 50,  w: 70, h: 38 },
    { type: 'monitor', x: 132, y: 54, w: 26, h: 5 },
    { type: 'chair', x: 155, y: 98 },
    { type: 'desk', x: 210, y: 50,  w: 70, h: 38 },
    { type: 'monitor', x: 222, y: 54, w: 26, h: 5 },
    { type: 'chair', x: 245, y: 98 },
    { type: 'desk', x: 300, y: 50,  w: 70, h: 38 },
    { type: 'monitor', x: 312, y: 54, w: 26, h: 5 },
    { type: 'chair', x: 335, y: 98 },
    { type: 'desk', x: 30,  y: 160, w: 70, h: 38 },
    { type: 'monitor', x: 42, y: 164, w: 26, h: 5 },
    { type: 'chair', x: 65, y: 208 },
    { type: 'desk', x: 120, y: 160, w: 70, h: 38 },
    { type: 'monitor', x: 132, y: 164, w: 26, h: 5 },
    { type: 'chair', x: 155, y: 208 },
    { type: 'desk', x: 210, y: 160, w: 70, h: 38 },
    { type: 'monitor', x: 222, y: 164, w: 26, h: 5 },
    { type: 'chair', x: 245, y: 208 },
    { type: 'desk', x: 300, y: 160, w: 70, h: 38 },
    { type: 'monitor', x: 312, y: 164, w: 26, h: 5 },
    { type: 'chair', x: 335, y: 208 },
    { type: 'tree', x: 20, y: 250 },
    { type: 'tree', x: 360, y: 250 },

    // === Soporte Tecnico - 6 desks ===
    { type: 'desk', x: 400, y: 50,  w: 70, h: 38 },
    { type: 'monitor', x: 412, y: 54, w: 26, h: 5 },
    { type: 'chair', x: 435, y: 98 },
    { type: 'desk', x: 490, y: 50,  w: 70, h: 38 },
    { type: 'monitor', x: 502, y: 54, w: 26, h: 5 },
    { type: 'chair', x: 525, y: 98 },
    { type: 'desk', x: 580, y: 50,  w: 70, h: 38 },
    { type: 'monitor', x: 592, y: 54, w: 26, h: 5 },
    { type: 'chair', x: 615, y: 98 },
    { type: 'desk', x: 400, y: 160, w: 70, h: 38 },
    { type: 'monitor', x: 412, y: 164, w: 26, h: 5 },
    { type: 'chair', x: 435, y: 208 },
    { type: 'desk', x: 490, y: 160, w: 70, h: 38 },
    { type: 'monitor', x: 502, y: 164, w: 26, h: 5 },
    { type: 'chair', x: 525, y: 208 },
    { type: 'desk', x: 580, y: 160, w: 70, h: 38 },
    { type: 'monitor', x: 592, y: 164, w: 26, h: 5 },
    { type: 'chair', x: 615, y: 208 },
    { type: 'tree', x: 660, y: 250 },

    // === Coordinacion - 4 desks ===
    { type: 'desk', x: 700, y: 50,  w: 70, h: 38 },
    { type: 'monitor', x: 712, y: 54, w: 26, h: 5 },
    { type: 'chair', x: 735, y: 98 },
    { type: 'desk', x: 790, y: 50,  w: 70, h: 38 },
    { type: 'monitor', x: 802, y: 54, w: 26, h: 5 },
    { type: 'chair', x: 825, y: 98 },
    { type: 'desk', x: 700, y: 160, w: 70, h: 38 },
    { type: 'monitor', x: 712, y: 164, w: 26, h: 5 },
    { type: 'chair', x: 735, y: 208 },
    { type: 'desk', x: 790, y: 160, w: 70, h: 38 },
    { type: 'monitor', x: 802, y: 164, w: 26, h: 5 },
    { type: 'chair', x: 825, y: 208 },
    { type: 'tree', x: 860, y: 20 },

    // === Produccion - 6 desks + worktable ===
    { type: 'desk', x: 900, y: 40,  w: 70, h: 38 },
    { type: 'monitor', x: 912, y: 44, w: 26, h: 5 },
    { type: 'chair', x: 935, y: 88 },
    { type: 'desk', x: 990, y: 40,  w: 70, h: 38 },
    { type: 'monitor', x: 1002, y: 44, w: 26, h: 5 },
    { type: 'chair', x: 1025, y: 88 },
    { type: 'desk', x: 1080, y: 40,  w: 70, h: 38 },
    { type: 'monitor', x: 1092, y: 44, w: 26, h: 5 },
    { type: 'chair', x: 1115, y: 88 },
    { type: 'desk', x: 900, y: 150, w: 70, h: 38 },
    { type: 'monitor', x: 912, y: 154, w: 26, h: 5 },
    { type: 'chair', x: 935, y: 198 },
    { type: 'desk', x: 990, y: 150, w: 70, h: 38 },
    { type: 'monitor', x: 1002, y: 154, w: 26, h: 5 },
    { type: 'chair', x: 1025, y: 198 },
    { type: 'desk', x: 1080, y: 150, w: 70, h: 38 },
    { type: 'monitor', x: 1092, y: 154, w: 26, h: 5 },
    { type: 'chair', x: 1115, y: 198 },
    { type: 'worktable', x: 920, y: 260, w: 200, h: 55 },
    { type: 'tree', x: 1150, y: 310 },
    { type: 'tree', x: 900, y: 310 },

    // === Oficina Carlos ===
    { type: 'exec_desk', x: 1200, y: 20, w: 140, h: 55, label: 'Carlos' },
    { type: 'monitor', x: 1225, y: 25, w: 30, h: 6 },
    { type: 'monitor', x: 1270, y: 25, w: 30, h: 6 },
    { type: 'chair', x: 1270, y: 85 },
    { type: 'sofa', x: 1200, y: 120, w: 90, h: 30 },
    { type: 'plant_large', x: 1375, y: 20 },
    { type: 'plant_large', x: 1375, y: 140 },
    { type: 'nameplate', x: 1210, y: 8, label: 'CARLOS M\u00c9NDEZ' },

    // === Oficina Brian ===
    { type: 'exec_desk', x: 1200, y: 195, w: 140, h: 55, label: 'Brian' },
    { type: 'monitor', x: 1225, y: 200, w: 30, h: 6 },
    { type: 'monitor', x: 1270, y: 200, w: 30, h: 6 },
    { type: 'chair', x: 1270, y: 260 },
    { type: 'sofa', x: 1200, y: 295, w: 90, h: 30 },
    { type: 'plant_large', x: 1375, y: 195 },
    { type: 'plant_large', x: 1375, y: 315 },
    { type: 'nameplate', x: 1210, y: 183, label: 'BRIAN RODR\u00cdGUEZ' },

    // === Desarrollo - creative workspace ===
    { type: 'desk', x: 30,  y: 320, w: 70, h: 38 },
    { type: 'monitor', x: 42, y: 324, w: 26, h: 5 },
    { type: 'chair', x: 65, y: 368 },
    { type: 'desk', x: 130, y: 320, w: 70, h: 38 },
    { type: 'monitor', x: 142, y: 324, w: 26, h: 5 },
    { type: 'chair', x: 165, y: 368 },
    { type: 'desk', x: 230, y: 320, w: 70, h: 38 },
    { type: 'monitor', x: 242, y: 324, w: 26, h: 5 },
    { type: 'chair', x: 265, y: 368 },
    { type: 'desk', x: 30,  y: 430, w: 70, h: 38 },
    { type: 'monitor', x: 42, y: 434, w: 26, h: 5 },
    { type: 'chair', x: 65, y: 478 },
    { type: 'desk', x: 130, y: 430, w: 70, h: 38 },
    { type: 'monitor', x: 142, y: 434, w: 26, h: 5 },
    { type: 'chair', x: 165, y: 478 },
    { type: 'desk', x: 230, y: 430, w: 70, h: 38 },
    { type: 'monitor', x: 242, y: 434, w: 26, h: 5 },
    { type: 'chair', x: 265, y: 478 },
    { type: 'whiteboard', x: 320, y: 310, w: 10, h: 80 },
    { type: 'tree', x: 350, y: 520 },
    { type: 'tree', x: 20, y: 520 },

    // === LOBBY - bean bags & logo ===
    { type: 'beanbag', x: 600, y: 350, color: '#E74C3C' },
    { type: 'beanbag', x: 636, y: 340, color: '#3498DB' },
    { type: 'beanbag', x: 660, y: 362, color: '#F1C40F' },
    { type: 'beanbag', x: 618, y: 378, color: '#2ECC71' },
    { type: 'beanbag', x: 650, y: 388, color: '#9B59B6' },
    { type: 'beanbag', x: 680, y: 346, color: '#E67E22' },
    { type: 'beanbag', x: 600, y: 460, color: '#E74C3C' },
    { type: 'beanbag', x: 636, y: 450, color: '#2ECC71' },
    { type: 'beanbag', x: 664, y: 470, color: '#3498DB' },
    { type: 'beanbag', x: 620, y: 488, color: '#F1C40F' },
    { type: 'beanbag', x: 656, y: 494, color: '#9B59B6' },
    { type: 'round_table', x: 640, y: 370, r: 12 },
    { type: 'round_table', x: 640, y: 475, r: 12 },
    { type: 'reception', x: 420, y: 380, w: 100, h: 35 },
    { type: 'tree', x: 400, y: 300 },
    { type: 'tree', x: 860, y: 300 },
    { type: 'tree', x: 400, y: 530 },
    { type: 'tree', x: 860, y: 530 },

    // === Administracion - 4 desks ===
    { type: 'desk', x: 910, y: 380, w: 70, h: 38 },
    { type: 'monitor', x: 922, y: 384, w: 26, h: 5 },
    { type: 'chair', x: 945, y: 428 },
    { type: 'desk', x: 1010, y: 380, w: 70, h: 38 },
    { type: 'monitor', x: 1022, y: 384, w: 26, h: 5 },
    { type: 'chair', x: 1045, y: 428 },
    { type: 'desk', x: 1110, y: 380, w: 70, h: 38 },
    { type: 'monitor', x: 1122, y: 384, w: 26, h: 5 },
    { type: 'chair', x: 1145, y: 428 },
    { type: 'desk', x: 910, y: 470, w: 70, h: 38 },
    { type: 'monitor', x: 922, y: 474, w: 26, h: 5 },
    { type: 'chair', x: 945, y: 518 },
    { type: 'desk', x: 1010, y: 470, w: 70, h: 38 },
    { type: 'monitor', x: 1022, y: 474, w: 26, h: 5 },
    { type: 'chair', x: 1045, y: 518 },
    { type: 'desk', x: 1110, y: 470, w: 70, h: 38 },
    { type: 'monitor', x: 1122, y: 474, w: 26, h: 5 },
    { type: 'chair', x: 1145, y: 518 },
    { type: 'tree', x: 1370, y: 370 },
    { type: 'tree', x: 1370, y: 530 },

    // === Break Room ===
    { type: 'round_table', x: 120, y: 680, r: 30 },
    { type: 'conf_chair', x: 85, y: 660 },
    { type: 'conf_chair', x: 155, y: 660 },
    { type: 'conf_chair', x: 85, y: 710 },
    { type: 'conf_chair', x: 155, y: 710 },
    { type: 'firepit', x: 200, y: 780, r: 25 },
    { type: 'sofa', x: 30, y: 780, w: 100, h: 35 },
    { type: 'sofa', x: 30, y: 840, w: 100, h: 35 },
    { type: 'vending', x: 310, y: 600, w: 45, h: 55 },
    { type: 'vending', x: 310, y: 670, w: 45, h: 55 },
    { type: 'coffeetable', x: 50, y: 820, w: 60, h: 15 },
    { type: 'tree', x: 360, y: 870 },
    { type: 'tree', x: 20, y: 870 },
    { type: 'plant', x: 280, y: 600 },

    // === Sala de Conferencias ===
    { type: 'conference_table', x: 500, y: 680, w: 260, h: 110 },
    { type: 'conf_chair', x: 530, y: 670 },
    { type: 'conf_chair', x: 590, y: 670 },
    { type: 'conf_chair', x: 650, y: 670 },
    { type: 'conf_chair', x: 710, y: 670 },
    { type: 'conf_chair', x: 530, y: 800 },
    { type: 'conf_chair', x: 590, y: 800 },
    { type: 'conf_chair', x: 650, y: 800 },
    { type: 'conf_chair', x: 710, y: 800 },
    { type: 'conf_chair', x: 490, y: 720 },
    { type: 'conf_chair', x: 770, y: 720 },
    { type: 'conf_chair', x: 490, y: 750 },
    { type: 'conf_chair', x: 770, y: 750 },
    { type: 'screen', x: 595, y: 590, w: 80, h: 12 },
    { type: 'whiteboard', x: 580, y: 585, w: 110, h: 5 },
    { type: 'tree', x: 400, y: 870 },
    { type: 'tree', x: 860, y: 870 },

    // === Mantenimiento - equipment & tools ===
    { type: 'worktable', x: 920, y: 600, w: 180, h: 55 },
    { type: 'worktable', x: 920, y: 700, w: 180, h: 55 },
    { type: 'equipment', x: 1150, y: 600, w: 60, h: 60 },
    { type: 'equipment', x: 1250, y: 600, w: 60, h: 60 },
    { type: 'equipment', x: 1150, y: 700, w: 60, h: 60 },
    { type: 'toolrack', x: 1340, y: 580, w: 40, h: 120 },
    { type: 'vending', x: 1340, y: 720, w: 45, h: 55 },
    { type: 'tree', x: 900, y: 870 },
    { type: 'tree', x: 1370, y: 870 },
    { type: 'plant', x: 1370, y: 790 },
  ];

  // ── Feature 1: Load furniture from localStorage, merge with defaults ──
  let FURNITURE;
  function loadFurniture() {
    const saved = localStorage.getItem('exacto-office-furniture');
    if (saved) {
      try {
        FURNITURE = JSON.parse(saved);
        return;
      } catch (e) { /* fall through to defaults */ }
    }
    FURNITURE = JSON.parse(JSON.stringify(DEFAULT_FURNITURE));
  }
  loadFurniture();

  function saveFurniture() {
    localStorage.setItem('exacto-office-furniture', JSON.stringify(FURNITURE));
  }

  // ── Collision rects (recalculated when furniture changes) ──
  let COLLISION_RECTS = [];
  function recalcCollisionRects() {
    COLLISION_RECTS = FURNITURE.filter(f =>
      ['desk','worktable','conference_table','reception','sofa','vending','coffeetable','exec_desk','equipment','toolrack','round_table','firepit'].includes(f.type)
    ).map(f => {
      if (f.type === 'round_table' || f.type === 'firepit') {
        return { x: f.x - f.r, y: f.y - f.r, w: f.r * 2, h: f.r * 2 };
      }
      return f;
    });
  }
  recalcCollisionRects();

  // ── A* Pathfinding ──
  const GRID_W = Math.ceil(CANVAS_W / GRID_CELL);
  const GRID_H = Math.ceil(CANVAS_H / GRID_CELL);
  let navGrid = null;

  function buildNavGrid() {
    navGrid = new Uint8Array(GRID_W * GRID_H);
    const furniturePad = AVATAR_R + 4;
    const wallPad = AVATAR_R + 4;
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
      const minX = Math.max(0, Math.floor((Math.min(x1, x2) - wallPad) / GRID_CELL));
      const maxX = Math.min(GRID_W - 1, Math.ceil((Math.max(x1, x2) + wallPad) / GRID_CELL));
      const minY = Math.max(0, Math.floor((Math.min(y1, y2) - wallPad) / GRID_CELL));
      const maxY = Math.min(GRID_H - 1, Math.ceil((Math.max(y1, y2) + wallPad) / GRID_CELL));
      const thick = WALL_W / 2 + wallPad;
      for (let gy = minY; gy <= maxY; gy++) {
        for (let gx = minX; gx <= maxX; gx++) {
          const cx = gx * GRID_CELL + GRID_CELL / 2;
          const cy = gy * GRID_CELL + GRID_CELL / 2;
          if (pointToSegDist(cx, cy, x1, y1, x2, y2) < thick) {
            navGrid[gy * GRID_W + gx] = 1;
          }
        }
      }
    }
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
    const sgx = Math.floor(sx / GRID_CELL), sgy = Math.floor(sy / GRID_CELL);
    const egx = Math.floor(ex / GRID_CELL), egy = Math.floor(ey / GRID_CELL);
    if (sgx < 0 || sgy < 0 || sgx >= GRID_W || sgy >= GRID_H) return null;
    if (egx < 0 || egy < 0 || egx >= GRID_W || egy >= GRID_H) return null;

    let targetGx = egx, targetGy = egy;
    if (navGrid[egy * GRID_W + egx]) {
      let bestDist = Infinity;
      const searchR = 8;
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
    if (path.length <= 2) return path;
    const smooth = [path[0]];
    let anchor = 0;
    while (anchor < path.length - 1) {
      let farthest = anchor + 1;
      for (let i = anchor + 2; i < path.length; i++) {
        if (lineOfSight(path[anchor].x, path[anchor].y, path[i].x, path[i].y)) {
          farthest = i;
        }
      }
      smooth.push(path[farthest]);
      anchor = farthest;
    }
    return smooth;
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
  let myUser = { name: '', color: '#1E90FF', x: 630, y: 420 };
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

  // Feature 1: Edit mode state
  let editMode = false;
  let editHoverIndex = -1; // index in FURNITURE being hovered
  let mouseCanvasX = 0, mouseCanvasY = 0;

  // Feature 2: Local camera video element for canvas rendering
  let localVideoEl = null;

  // Feature 4: Room tracking
  let myCurrentRoom = null;
  let userRooms = new Map(); // userId -> roomId

  // Feature 5: Room panel state
  let roomPanelExpanded = true;

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
  const btnEdit = document.getElementById('btn-edit');
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

  // ── Status toggle ──
  const statuses = ['available', 'busy', 'away'];
  btnStatus.addEventListener('click', () => {
    const idx = (statuses.indexOf(userStatus) + 1) % statuses.length;
    userStatus = statuses[idx];
    const indicator = btnStatus.querySelector('.status-indicator');
    indicator.className = 'status-indicator ' + userStatus;
    btnStatus.title = 'Status: ' + userStatus.charAt(0).toUpperCase() + userStatus.slice(1);
  });

  btnInvite.addEventListener('click', () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(location.href).then(() => {
        btnInvite.textContent = 'Copied!';
        setTimeout(() => { btnInvite.textContent = 'Invite'; }, 2000);
      });
    }
  });

  // ── Feature 1: Edit mode toggle ──
  btnEdit.addEventListener('click', toggleEditMode);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && editMode) toggleEditMode();
  });

  function toggleEditMode() {
    editMode = !editMode;
    btnEdit.classList.toggle('active', editMode);
    btnEdit.title = editMode ? 'Exit Edit Mode' : 'Edit Room';
    if (!editMode) {
      editHoverIndex = -1;
    }
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

  // ── WebSocket ──
  function connectWS(code) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}`);

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
            users.set(u.id, { ...u, targetX: u.x, targetY: u.y, speaking: false });
          } else {
            myUser.x = u.x;
            myUser.y = u.y;
          }
        });
        updateOnlineCount();
        updateUserList();
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
          users.set(msg.user.id, { ...msg.user, targetX: msg.user.x, targetY: msg.user.y, speaking: false });
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
        break;
      }
      case 'user_camera': {
        const u = users.get(msg.id);
        if (u) u.cameraOff = msg.cameraOff;
        updateRoomPanel();
        break;
      }
      case 'user_speaking': {
        const u = users.get(msg.id);
        if (u) u.speaking = msg.speaking;
        updateUserList();
        break;
      }
      case 'signal':
        handleSignal(msg.fromId, msg.signal);
        break;
      // Feature 4: room change from other users
      case 'room_change': {
        if (msg.room) {
          userRooms.set(msg.id, msg.room);
        } else {
          userRooms.delete(msg.id);
        }
        updateRoomPanel();
        break;
      }
    }
  }

  function updateOnlineCount() {
    const count = users.size + 1;
    onlineCount.textContent = `${count} online`;
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
    const dot = document.createElement('span');
    dot.className = 'user-status-dot' + (u.speaking ? ' speaking' : '');
    li.appendChild(avatar);
    li.appendChild(name);
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
    // Update room panel when new video arrives
    updateRoomPanel();
  }

  // ── Feature 4: Room-based + proximity auto-connect ──
  function updateProximityConnections() {
    users.forEach((u, id) => {
      const dx = myUser.x - u.x, dy = myUser.y - u.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Room-based: always connect if in same room
      const sameRoom = myCurrentRoom && userRooms.get(id) === myCurrentRoom.id;

      if (dist <= PROXIMITY_AUDIO || sameRoom) {
        const peer = peers.get(id);
        if (!peer) { if (myId < id) getOrCreatePeer(id, true); }
        else if (peer.audioEl) {
          // Volume: if same room, full volume; else distance-based
          if (sameRoom) {
            peer.audioEl.volume = 1;
          } else {
            peer.audioEl.volume = dist < PROXIMITY_FULL ? 1 : Math.max(0, 1 - (dist - PROXIMITY_FULL) / (PROXIMITY_AUDIO - PROXIMITY_FULL));
          }
        }
        // Video visibility: in same room or within proximity video range
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

        // Feature 2: Create local video element for canvas rendering
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
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        isScreenSharing = true;
        btnScreen.classList.add('active');
        screenStream.getVideoTracks()[0].onended = () => { isScreenSharing = false; btnScreen.classList.remove('active'); };
      } catch (e) { /* cancelled */ }
    } else {
      if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); screenStream = null; }
      isScreenSharing = false;
      btnScreen.classList.remove('active');
    }
  });

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
    editMode = false;
    btnEdit.classList.remove('active');
  });

  // Feature 5: Room panel toggle
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
    // Feature 1: track mouse for edit mode hover
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      keys[e.key.toLowerCase()] = true;
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

  // Feature 1: Mouse move handler for edit mode hover detection
  function onCanvasMouseMove(e) {
    if (!editMode) { editHoverIndex = -1; return; }
    const pos = getCanvasCoords(e);
    mouseCanvasX = pos.x;
    mouseCanvasY = pos.y;
    // Find furniture under mouse for delete hover
    editHoverIndex = -1;
    for (let i = FURNITURE.length - 1; i >= 0; i--) {
      const f = FURNITURE[i];
      if (f.type === 'round_table' || f.type === 'firepit') {
        const dx = pos.x - f.x, dy = pos.y - f.y;
        if (dx * dx + dy * dy <= (f.r + 5) * (f.r + 5)) { editHoverIndex = i; break; }
      } else if (f.type === 'chair' || f.type === 'conf_chair' || f.type === 'beanbag') {
        const dx = pos.x - f.x, dy = pos.y - f.y;
        if (dx * dx + dy * dy <= 20 * 20) { editHoverIndex = i; break; }
      } else if (f.type === 'tree' || f.type === 'plant' || f.type === 'plant_large') {
        const dx = pos.x - f.x, dy = pos.y - f.y;
        if (dx * dx + dy * dy <= 30 * 30) { editHoverIndex = i; break; }
      } else if (f.w && f.h) {
        if (pos.x >= f.x && pos.x <= f.x + f.w && pos.y >= f.y && pos.y <= f.y + f.h) { editHoverIndex = i; break; }
      }
    }
  }

  function onCanvasClick(e) {
    const pos = getCanvasCoords(e);

    // Feature 1: Edit mode handling
    if (editMode) {
      // Check if clicking "+" button in a room center
      for (const room of ROOMS) {
        const btnX = room.x + room.w / 2;
        const btnY = room.y + room.h / 2;
        const dx = pos.x - btnX, dy = pos.y - btnY;
        if (dx * dx + dy * dy <= 25 * 25) {
          addDeskToRoom(room);
          return;
        }
      }
      // Check if clicking on hovered furniture to remove
      if (editHoverIndex >= 0) {
        removeFurnitureAt(editHoverIndex);
        editHoverIndex = -1;
        return;
      }
      return; // don't move in edit mode
    }

    const tx = clamp(pos.x, AVATAR_R, CANVAS_W - AVATAR_R);
    const ty = clamp(pos.y, AVATAR_R, CANVAS_H - AVATAR_R);
    const path = findPath(myUser.x, myUser.y, tx, ty);
    if (path && path.length > 0) {
      movePath = path;
      movePathIdx = 0;
      moveTarget = movePath[0];
    } else {
      moveTarget = { x: tx, y: ty };
      movePath = null;
    }
  }

  function onCanvasTouch(e) {
    e.preventDefault();
    if (editMode) return; // disable touch movement in edit mode
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const tx = clamp((touch.clientX - rect.left) * (CANVAS_W / rect.width), AVATAR_R, CANVAS_W - AVATAR_R);
    const ty = clamp((touch.clientY - rect.top) * (CANVAS_H / rect.height), AVATAR_R, CANVAS_H - AVATAR_R);
    const path = findPath(myUser.x, myUser.y, tx, ty);
    if (path && path.length > 0) {
      movePath = path;
      movePathIdx = 0;
      moveTarget = movePath[0];
    } else {
      moveTarget = { x: tx, y: ty };
      movePath = null;
    }
  }

  // ── Feature 1: Add desk to room ──
  function addDeskToRoom(room) {
    // Find a smart position inside the room that doesn't overlap existing furniture
    const deskW = 70, deskH = 38;
    const padding = 20;
    const innerX = room.x + WALL_W + padding;
    const innerY = room.y + 35 + padding; // below room label
    const innerW = room.w - WALL_W * 2 - padding * 2;
    const innerH = room.h - WALL_W - 35 - padding * 2;

    // Try grid positions
    for (let tryY = innerY; tryY + deskH <= innerY + innerH; tryY += deskH + 20) {
      for (let tryX = innerX; tryX + deskW <= innerX + innerW; tryX += deskW + 20) {
        // Check overlap with existing furniture
        let overlap = false;
        for (const f of FURNITURE) {
          let fx = f.x, fy = f.y, fw = f.w || 20, fh = f.h || 20;
          if (f.type === 'round_table' || f.type === 'firepit') {
            fx = f.x - (f.r || 15); fy = f.y - (f.r || 15); fw = (f.r || 15) * 2; fh = fw;
          }
          if (f.type === 'chair' || f.type === 'conf_chair' || f.type === 'beanbag' || f.type === 'tree' || f.type === 'plant' || f.type === 'plant_large') {
            fx = f.x - 15; fy = f.y - 15; fw = 30; fh = 30;
          }
          if (tryX + deskW > fx - 5 && tryX < fx + fw + 5 && tryY + deskH > fy - 5 && tryY < fy + fh + 5) {
            overlap = true; break;
          }
        }
        if (!overlap) {
          // Add desk + monitor + chair
          FURNITURE.push({ type: 'desk', x: tryX, y: tryY, w: deskW, h: deskH });
          FURNITURE.push({ type: 'monitor', x: tryX + 12, y: tryY + 4, w: 26, h: 5 });
          FURNITURE.push({ type: 'chair', x: tryX + 35, y: tryY + deskH + 10 });
          onFurnitureChanged();
          showNotification('Desk added to ' + room.name.replace(/[\ud83d\udd35\ud83d\udfe3]\s*/g, ''));
          return;
        }
      }
    }
    showNotification('No space for another desk in ' + room.name.replace(/[\ud83d\udd35\ud83d\udfe3]\s*/g, ''));
  }

  function removeFurnitureAt(index) {
    const f = FURNITURE[index];
    const name = f.type;
    FURNITURE.splice(index, 1);
    onFurnitureChanged();
    showNotification('Removed ' + name);
  }

  function onFurnitureChanged() {
    saveFurniture();
    recalcCollisionRects();
    buildNavGrid();
  }

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  function render() {
    update();
    draw();
    drawMinimap();
    animFrame = requestAnimationFrame(render);
  }

  function update() {
    // Keyboard movement (disabled in edit mode)
    if (!editMode) {
      let dx = 0, dy = 0;
      if (keys['w'] || keys['arrowup']) dy -= MOVE_SPEED;
      if (keys['s'] || keys['arrowdown']) dy += MOVE_SPEED;
      if (keys['a'] || keys['arrowleft']) dx -= MOVE_SPEED;
      if (keys['d'] || keys['arrowright']) dx += MOVE_SPEED;
      if (dx || dy) { moveTarget = null; movePath = null; moveSelf(myUser.x + dx, myUser.y + dy); }
    }

    if (moveTarget && !editMode) {
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
          movePathIdx++;
          moveTarget = movePath[movePathIdx];
        } else if (!ok) {
          moveTarget = null;
          movePath = null;
        }
      }
    }

    users.forEach(u => {
      const ddx = u.targetX - u.x, ddy = u.targetY - u.y;
      if (Math.abs(ddx) + Math.abs(ddy) > 1) { u.x += ddx * 0.15; u.y += ddy * 0.15; }
      else { u.x = u.targetX; u.y = u.targetY; }
    });

    // Feature 4: Room tracking
    const room = getRoomAt(myUser.x, myUser.y);
    currentZone.textContent = room ? room.name : 'Hallway';

    // Detect room change for Feature 4
    const newRoomId = room ? room.id : null;
    const oldRoomId = myCurrentRoom ? myCurrentRoom.id : null;
    if (newRoomId !== oldRoomId) {
      myCurrentRoom = room;
      // Send room change to server
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'room_change', room: newRoomId }));
      }
      // Show notification
      if (room) {
        const peopleInRoom = getRoomUserCount(room.id);
        if (peopleInRoom > 0) {
          showNotification('You joined ' + room.name.replace(/[\ud83d\udd35\ud83d\udfe3]\s*/g, '') + ' \u2014 ' + peopleInRoom + ' people here');
        } else {
          showNotification('You entered ' + room.name.replace(/[\ud83d\udd35\ud83d\udfe3]\s*/g, ''));
        }
      }
      updateRoomPanel();
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

  // ── Feature 5: Room Video Panel ──
  function updateRoomPanel() {
    if (!myCurrentRoom) {
      roomPanel.classList.add('hidden');
      return;
    }

    // Get users in same room
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
    const roomLabel = myCurrentRoom.name.replace(/[\ud83d\udd35\ud83d\udfe3]\s*/g, '');
    roomPanelTitle.textContent = '\ud83c\udfe2 ' + roomLabel + ' \u2014 ' + (roomUsers.length + 1) + ' people';

    // Rebuild grid
    roomPanelGrid.innerHTML = '';

    // Add self tile
    roomPanelGrid.appendChild(createRoomTile({
      name: myUser.name,
      color: myUser.color,
      muted: isMuted,
      cameraOff: isCameraOff,
      isSelf: true
    }));

    // Add other users
    roomUsers.forEach(u => {
      roomPanelGrid.appendChild(createRoomTile({
        name: u.name,
        color: u.color,
        muted: u.muted,
        cameraOff: u.cameraOff,
        userId: u.odId
      }));
    });
  }

  function createRoomTile(opts) {
    const tile = document.createElement('div');
    tile.className = 'room-tile';

    if (!opts.cameraOff) {
      // Try to show video
      let videoSrc = null;
      if (opts.isSelf && localVideoEl && localVideoEl.srcObject) {
        videoSrc = localVideoEl.srcObject;
      } else if (opts.userId) {
        const peer = peers.get(opts.userId);
        if (peer && peer.videoEl && peer.videoEl.srcObject) {
          videoSrc = peer.videoEl.srcObject;
        }
      }
      if (videoSrc) {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = !!opts.isSelf;
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
    drawFurniture();
    drawLobbyLogo();
    // Feature 1: Edit mode overlays (add desk buttons)
    if (editMode) drawEditOverlays();
    drawProximityRings();
    users.forEach(u => drawAvatar(u, false));
    drawAvatar({ ...myUser, id: myId, muted: isMuted, cameraOff: isCameraOff, speaking: isSpeaking }, true);
  }

  // ── Floor: dark wood tiles with grain ──
  function drawFloor() {
    const colors1 = ['#3D2810', '#3A2610', '#3B2711'];
    const colors2 = ['#4A3520', '#483318', '#4C371E'];
    for (let ty = 0; ty < CANVAS_H; ty += TILE_SIZE) {
      for (let tx = 0; tx < CANVAS_W; tx += TILE_SIZE) {
        const checker = ((tx / TILE_SIZE) + (ty / TILE_SIZE)) % 2 === 0;
        const ci = ((tx * 7 + ty * 13) >> 5) % 3;
        ctx.fillStyle = checker ? colors1[ci] : colors2[ci];
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

  // ── Rooms: backgrounds + plaque labels ──
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
      const labelText = r.name.replace(/[\ud83d\udd35\ud83d\udfe3]\s*/g, '');
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

  // ── Walls ──
  function drawWalls() {
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = WALL_W + 4;
    ctx.lineCap = 'round';
    WALLS.forEach(([x1, y1, x2, y2]) => {
      if (x1 === x2 && y1 === y2) return;
      ctx.beginPath();
      ctx.moveTo(x1 + 2, y1 + 2);
      ctx.lineTo(x2 + 2, y2 + 2);
      ctx.stroke();
    });
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = WALL_W;
    ctx.lineCap = 'round';
    WALLS.forEach(([x1, y1, x2, y2]) => {
      if (x1 === x2 && y1 === y2) return;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(200,180,140,0.3)';
    ctx.lineWidth = 2;
    WALLS.forEach(([x1, y1, x2, y2]) => {
      if (x1 === x2 && y1 === y2) return;
      ctx.beginPath();
      ctx.moveTo(x1 - 1, y1 - 1);
      ctx.lineTo(x2 - 1, y2 - 1);
      ctx.stroke();
    });
  }

  // ── Furniture drawing ──
  function drawFurniture() {
    FURNITURE.forEach((f, idx) => {
      // Feature 1: highlight hovered furniture in edit mode
      if (editMode && idx === editHoverIndex) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = 'rgba(255,0,0,0.3)';
        if (f.type === 'round_table' || f.type === 'firepit') {
          ctx.beginPath(); ctx.arc(f.x, f.y, (f.r || 15) + 5, 0, Math.PI * 2); ctx.fill();
        } else if (f.type === 'chair' || f.type === 'conf_chair' || f.type === 'beanbag') {
          ctx.beginPath(); ctx.arc(f.x, f.y, 20, 0, Math.PI * 2); ctx.fill();
        } else if (f.type === 'tree' || f.type === 'plant' || f.type === 'plant_large') {
          ctx.beginPath(); ctx.arc(f.x, f.y, 30, 0, Math.PI * 2); ctx.fill();
        } else if (f.w && f.h) {
          ctx.fillRect(f.x - 3, f.y - 3, f.w + 6, f.h + 6);
        }
        ctx.restore();
      }

      switch (f.type) {
        case 'desk': drawDesk(f); break;
        case 'monitor': drawMonitor(f); break;
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
        case 'exec_desk': drawExecDesk(f); break;
        case 'nameplate': drawNameplate(f); break;
        case 'beanbag': drawBeanbag(f.x, f.y, f.color); break;
        case 'round_table': drawRoundTable(f.x, f.y, f.r); break;
        case 'firepit': drawFirepit(f.x, f.y, f.r); break;
        case 'whiteboard': drawWhiteboard(f); break;
        case 'equipment': drawEquipment(f); break;
        case 'toolrack': drawToolrack(f); break;
      }

      // Feature 1: Draw red X on hovered furniture
      if (editMode && idx === editHoverIndex) {
        let cx, cy;
        if (f.type === 'round_table' || f.type === 'firepit') { cx = f.x; cy = f.y - (f.r || 15) - 5; }
        else if (f.type === 'chair' || f.type === 'conf_chair' || f.type === 'beanbag') { cx = f.x + 10; cy = f.y - 15; }
        else if (f.type === 'tree' || f.type === 'plant' || f.type === 'plant_large') { cx = f.x + 20; cy = f.y - 25; }
        else if (f.w && f.h) { cx = f.x + f.w - 2; cy = f.y - 2; }
        else { cx = f.x + 10; cy = f.y - 10; }
        ctx.save();
        ctx.fillStyle = '#ff4757';
        ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4); ctx.stroke();
        ctx.restore();
      }
    });
  }

  // ── Feature 1: Edit mode overlays ──
  function drawEditOverlays() {
    // Draw "+ Add Desk" button in center of each room
    ROOMS.forEach(r => {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      ctx.save();
      // Button background
      ctx.fillStyle = 'rgba(30,144,255,0.2)';
      roundRect(ctx, cx - 40, cy - 12, 80, 24, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(30,144,255,0.5)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, cx - 40, cy - 12, 80, 24, 6); ctx.stroke();
      // Text
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(30,144,255,0.9)';
      ctx.fillText('+ Add Desk', cx, cy);
      ctx.restore();
    });

    // Draw "EDIT MODE" indicator
    ctx.save();
    ctx.fillStyle = 'rgba(255,200,50,0.15)';
    roundRect(ctx, CANVAS_W / 2 - 60, 2, 120, 20, 4); ctx.fill();
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,200,50,0.8)';
    ctx.fillText('EDIT MODE', CANVAS_W / 2, 12);
    ctx.restore();
  }

  function drawDesk(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, f.x + 2, f.y + 2, f.w, f.h, 3); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x + f.w, f.y + f.h);
    grad.addColorStop(0, '#5C4033');
    grad.addColorStop(0.3, '#6B4C3B');
    grad.addColorStop(0.7, '#5A3D2E');
    grad.addColorStop(1, '#4A3020');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 3); ctx.fill();
    ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 1.5;
    roundRect(ctx, f.x, f.y, f.w, f.h, 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const gy = f.y + 8 + i * 10;
      if (gy < f.y + f.h - 4) {
        ctx.beginPath();
        ctx.moveTo(f.x + 4, gy);
        ctx.lineTo(f.x + f.w - 4, gy);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(f.x + 3, f.y + 1);
    ctx.lineTo(f.x + f.w - 3, f.y + 1);
    ctx.stroke();
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
    ctx.fillStyle = 'rgba(60,140,255,0.05)';
    ctx.beginPath();
    ctx.ellipse(f.x + f.w / 2, f.y + f.h + 8, f.w * 0.6, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawChair(x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(x + 1, y + 2, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 9);
    grad.addColorStop(0, '#5a5a5a');
    grad.addColorStop(1, '#333');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke();
  }

  function drawConfChair(x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(x + 1, y + 2, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 10);
    grad.addColorStop(0, '#6a6a6a');
    grad.addColorStop(1, '#444');
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
      lg.addColorStop(0, leafColors[i % leafColors.length]);
      lg.addColorStop(1, '#1a5e1a');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(lx, ly, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#1B5E1B';
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(100,255,100,0.1)';
    ctx.beginPath(); ctx.arc(cx - r * 0.15, cy - r * 0.3, r * 0.15, 0, Math.PI * 2); ctx.fill();
  }

  function drawTree(cx, cy) {
    const r = 28;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(cx + 2, cy + r * 0.6 + 2, r * 0.7, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4A3020';
    ctx.fillRect(cx - 4, cy + r * 0.2, 8, r * 0.5);
    ctx.strokeStyle = '#3D2610'; ctx.lineWidth = 1;
    ctx.strokeRect(cx - 4, cy + r * 0.2, 8, r * 0.5);
    const layers = [
      { offset: 0, rad: r, color: '#1a4a1a' },
      { offset: -3, rad: r * 0.85, color: '#1f5e1f' },
      { offset: -5, rad: r * 0.7, color: '#2a7a2a' },
      { offset: -6, rad: r * 0.5, color: '#35903a' },
    ];
    for (const l of layers) {
      const g = ctx.createRadialGradient(cx, cy + l.offset, 0, cx, cy + l.offset, l.rad);
      g.addColorStop(0, l.color);
      g.addColorStop(0.7, l.color);
      g.addColorStop(1, 'rgba(0,40,0,0.3)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy + l.offset, l.rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(80,200,80,0.15)';
    ctx.beginPath(); ctx.arc(cx - 8, cy - 10, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 10, cy - 5, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,30,0,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }

  function drawSofa(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, f.x + 2, f.y + 2, f.w, f.h, 8); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x, f.y + f.h);
    grad.addColorStop(0, '#5A7B50');
    grad.addColorStop(1, '#3A5231');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 8); ctx.fill();
    ctx.strokeStyle = '#2D4226'; ctx.lineWidth = 1.5;
    roundRect(ctx, f.x, f.y, f.w, f.h, 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(f.x + 10, f.y + f.h / 2); ctx.lineTo(f.x + f.w - 10, f.y + f.h / 2);
    ctx.stroke();
    ctx.fillStyle = '#4A6741';
    roundRect(ctx, f.x, f.y, 12, f.h, 4); ctx.fill();
    roundRect(ctx, f.x + f.w - 12, f.y, 12, f.h, 4); ctx.fill();
  }

  function drawCoffeeTable(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, f.x + 1, f.y + 1, f.w, f.h, 4); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x + f.w, f.y + f.h);
    grad.addColorStop(0, '#7B5B3F');
    grad.addColorStop(1, '#5C4033');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.fill();
    ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 1;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.stroke();
  }

  function drawConferenceTable(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(f.x + f.w / 2 + 3, f.y + f.h / 2 + 3, f.w / 2, f.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(f.x + f.w / 2, f.y + f.h / 2, 0, f.x + f.w / 2, f.y + f.h / 2, f.w / 2);
    grad.addColorStop(0, '#7B5B3F');
    grad.addColorStop(0.8, '#5C4033');
    grad.addColorStop(1, '#4A3020');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(f.x + f.w / 2, f.y + f.h / 2, f.w / 2, f.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 0.5;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(f.x + f.w / 2, f.y + f.h / 2 + i * 8, f.w / 2 - 10, Math.max(5, f.h / 2 - 15 - Math.abs(i) * 3), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath(); ctx.ellipse(f.x + f.w / 2, f.y + f.h / 2 - 8, f.w / 2 - 20, f.h / 2 - 20, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawWorktable(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, f.x + 2, f.y + 2, f.w, f.h, 4); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x + f.w, f.y);
    grad.addColorStop(0, '#7A6B5F');
    grad.addColorStop(0.5, '#8A7B6F');
    grad.addColorStop(1, '#6B5B4F');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.fill();
    ctx.strokeStyle = '#4A3D33'; ctx.lineWidth = 1.5;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.stroke();
    ctx.strokeStyle = 'rgba(180,180,180,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(f.x + 3, f.y + 1); ctx.lineTo(f.x + f.w - 3, f.y + 1);
    ctx.stroke();
  }

  function drawReception(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, f.x + 2, f.y + 2, f.w, f.h, 6); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x + f.w, f.y);
    grad.addColorStop(0, '#4A3520');
    grad.addColorStop(0.5, '#5C4033');
    grad.addColorStop(1, '#4A3520');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 6); ctx.fill();
    ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 1.5;
    roundRect(ctx, f.x, f.y, f.w, f.h, 6); ctx.stroke();
    ctx.fillStyle = 'rgba(80,180,255,0.3)';
    ctx.fillRect(f.x + f.w / 2 - 15, f.y + 6, 30, 8);
    ctx.strokeStyle = 'rgba(200,180,140,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(f.x + 5, f.y + 2); ctx.lineTo(f.x + f.w - 5, f.y + 2); ctx.stroke();
  }

  function drawVending(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, f.x + 2, f.y + 2, f.w, f.h, 4); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x, f.y + f.h);
    grad.addColorStop(0, '#5B6070');
    grad.addColorStop(1, '#3D4250');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.fill();
    ctx.strokeStyle = '#2D3240'; ctx.lineWidth = 1;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.stroke();
    ctx.fillStyle = 'rgba(100,200,255,0.25)';
    roundRect(ctx, f.x + 4, f.y + 5, f.w - 8, f.h - 20, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(100,200,255,0.15)'; ctx.lineWidth = 0.5;
    roundRect(ctx, f.x + 4, f.y + 5, f.w - 8, f.h - 20, 2); ctx.stroke();
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

  function drawExecDesk(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, f.x + 3, f.y + 3, f.w, f.h, 5); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x + f.w, f.y + f.h);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#222244');
    grad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 5); ctx.fill();
    ctx.strokeStyle = '#1E90FF'; ctx.lineWidth = 2;
    roundRect(ctx, f.x, f.y, f.w, f.h, 5); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,50,0.5)'; ctx.lineWidth = 1;
    roundRect(ctx, f.x + 3, f.y + 3, f.w - 6, f.h - 6, 3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    roundRect(ctx, f.x + 5, f.y + 5, f.w - 10, f.h - 10, 2); ctx.fill();
  }

  function drawNameplate(f) {
    const pw = 130, ph = 14;
    ctx.fillStyle = 'rgba(255,200,50,0.15)';
    roundRect(ctx, f.x, f.y - 2, pw, ph, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,50,0.5)'; ctx.lineWidth = 1;
    roundRect(ctx, f.x, f.y - 2, pw, ph, 3); ctx.stroke();
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = 'rgba(255,200,50,0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.label, f.x + pw / 2, f.y + ph / 2 - 2);
    ctx.textAlign = 'left';
  }

  function drawBeanbag(x, y, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(x + 1, y + 2, 19, 8, 0, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 18);
    grad.addColorStop(0, lightenColor(color, 40));
    grad.addColorStop(0.6, color);
    grad.addColorStop(1, darkenColor(color, 30));
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = darkenColor(color, 40);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(x - 5, y - 6, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.arc(x - 3, y - 3, 10, 0, Math.PI * 2); ctx.fill();
  }

  function drawRoundTable(x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.arc(x + 1, y + 1, r, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, '#7B5B3F');
    grad.addColorStop(1, '#5C4033');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 1; ctx.stroke();
  }

  function drawFirepit(x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.arc(x + 1, y + 1, r + 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5A5A5A';
    ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath(); ctx.arc(x, y, r - 2, 0, Math.PI * 2); ctx.fill();
    const t = Date.now() / 300;
    const flicker = 0.7 + 0.3 * Math.sin(t);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, `rgba(255,160,20,${0.6 * flicker})`);
    glow.addColorStop(0.5, `rgba(255,80,20,${0.3 * flicker})`);
    glow.addColorStop(1, 'rgba(100,30,0,0.05)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,120,20,${0.04 * flicker})`;
    ctx.beginPath(); ctx.arc(x, y, r + 15, 0, Math.PI * 2); ctx.fill();
  }

  function drawWhiteboard(f) {
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
  }

  function drawEquipment(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, f.x + 2, f.y + 2, f.w, f.h, 4); ctx.fill();
    const grad = ctx.createLinearGradient(f.x, f.y, f.x, f.y + f.h);
    grad.addColorStop(0, '#6A6A70');
    grad.addColorStop(1, '#4A4A50');
    ctx.fillStyle = grad;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.fill();
    ctx.strokeStyle = '#3A3A40'; ctx.lineWidth = 1;
    roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.fillRect(f.x + 8, f.y + 8, f.w - 16, f.h / 2 - 8);
    ctx.fillStyle = 'rgba(0,255,0,0.5)';
    ctx.beginPath(); ctx.arc(f.x + 15, f.y + f.h - 12, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,0,0.4)';
    ctx.beginPath(); ctx.arc(f.x + 25, f.y + f.h - 12, 3, 0, Math.PI * 2); ctx.fill();
  }

  function drawToolrack(f) {
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(f.x + 1, f.y + 1, f.w, f.h);
    ctx.fillStyle = '#5A4A3A';
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 1;
    ctx.strokeRect(f.x, f.y, f.w, f.h);
    ctx.fillStyle = '#888';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(f.x + 5, f.y + 15 + i * 25, f.w - 10, 3);
    }
    ctx.fillStyle = '#666';
    ctx.fillRect(f.x + 8, f.y + 10, 6, 15);
    ctx.fillRect(f.x + 20, f.y + 8, 4, 18);
    ctx.fillRect(f.x + 10, f.y + 58, 8, 20);
  }

  // ── Lobby Logo ──
  function drawLobbyLogo() {
    const lobby = ROOMS.find(r => r.id === 'lobby');
    if (!lobby) return;
    const lx = lobby.x + 30;
    const ly = lobby.y + lobby.h / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,20,40,0.5)';
    roundRect(ctx, lx - 5, ly - 25, 160, 50, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(0,180,255,0.3)'; ctx.lineWidth = 1;
    roundRect(ctx, lx - 5, ly - 25, 160, 50, 6); ctx.stroke();
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00BFFF';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#00CFFF';
    ctx.fillText('EXACTO', lx, ly - 6);
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#00AADD';
    ctx.fillText('SIGNAGE', lx + 2, ly + 14);
    ctx.shadowBlur = 0;
    ctx.restore();

    const cx = lobby.x + lobby.w / 2, cy = lobby.y + lobby.h - 30;
    ctx.save();
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,180,255,0.15)';
    ctx.fillText('Virtual Office', cx, cy);
    ctx.restore();
  }

  // ── Feature 3: Enhanced proximity rings ──
  function drawProximityRings() {
    const x = myUser.x, y = myUser.y;
    // Outer ring: 300px, white, dashed, semi-transparent
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, PROXIMITY_AUDIO, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Inner ring: 150px, blue, semi-transparent, solid
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, PROXIMITY_VIDEO, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(30,144,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Subtle fill for inner ring
    ctx.fillStyle = 'rgba(30,144,255,0.02)';
    ctx.fill();
    ctx.restore();
  }

  // ── Feature 2 + 3: Enhanced avatar drawing with live video ──
  function drawAvatar(u, isSelf) {
    const x = u.x, y = u.y;

    // Determine draw radius: bigger when camera is on
    const hasVideo = isSelf ? (!isCameraOff && localVideoEl && localVideoEl.srcObject) : (!u.cameraOff);
    const drawR = hasVideo ? AVATAR_R_VIDEO : AVATAR_R;

    // Speaking pulse
    if (u.speaking && !u.muted) {
      const pulse = 1 + 0.15 * Math.sin(Date.now() / 150);
      ctx.beginPath(); ctx.arc(x, y, drawR * pulse + 6, 0, Math.PI * 2);
      ctx.strokeStyle = u.color; ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Date.now() / 150);
      ctx.stroke(); ctx.globalAlpha = 1;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x + 1, y + drawR + 2, drawR * 0.8, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Feature 2: Try to draw video inside avatar circle
    let drewVideo = false;
    if (hasVideo) {
      let videoEl = null;
      if (isSelf && localVideoEl && localVideoEl.readyState >= 2) {
        videoEl = localVideoEl;
      } else if (!isSelf && u.id) {
        const peer = peers.get(u.id);
        if (peer && peer.videoEl && peer.videoEl.readyState >= 2) {
          videoEl = peer.videoEl;
        }
      }
      if (videoEl) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, drawR, 0, Math.PI * 2);
        ctx.clip();
        // Draw video centered and cropped to circle
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
      // Fallback: colored circle with initials
      ctx.beginPath(); ctx.arc(x, y, drawR, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(x - drawR * 0.4, y - drawR * 0.4, 2, x, y, drawR);
      grad.addColorStop(0, lightenColor(u.color, 40)); grad.addColorStop(1, u.color);
      ctx.fillStyle = grad; ctx.fill();
    }

    // Border
    ctx.beginPath(); ctx.arc(x, y, drawR, 0, Math.PI * 2);
    ctx.strokeStyle = isSelf ? '#fff' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = isSelf ? 3 : 2; ctx.stroke();
    if (isSelf) {
      ctx.strokeStyle = darkenColor(u.color, 30);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, drawR + 3, 0, Math.PI * 2); ctx.stroke();
    }

    // Initials (only if no video drawn)
    if (!drewVideo) {
      const initials = (u.name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      const fontSize = hasVideo ? 18 : 9;
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillText(initials, x + 1, y + 1);
      ctx.fillStyle = '#fff';
      ctx.fillText(initials, x, y);
    }

    // Name tag
    ctx.font = '10px "Courier New", monospace';
    ctx.textBaseline = 'top';
    const nameW = ctx.measureText(u.name).width + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    roundRect(ctx, x - nameW / 2, y + drawR + 6, nameW, 16, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 0.5;
    roundRect(ctx, x - nameW / 2, y + drawR + 6, nameW, 16, 3); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(u.name, x, y + drawR + 9);

    // Muted badge
    if (u.muted) {
      ctx.fillStyle = '#ff4757';
      ctx.beginPath(); ctx.arc(x + drawR - 4, y - drawR + 4, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + drawR - 7, y - drawR + 1); ctx.lineTo(x + drawR - 1, y - drawR + 7); ctx.stroke();
    }

    // Feature 2: Camera indicator dot (green=on, red=off) bottom-right
    const camDotX = x + drawR - 2;
    const camDotY = y + drawR - 2;
    ctx.beginPath(); ctx.arc(camDotX, camDotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = hasVideo ? '#51CF66' : '#ff4757';
    ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();

    // Feature 3: Connection indicator when actively connected to someone
    const connectedPeerCount = peers.size;
    if (isSelf && connectedPeerCount > 0) {
      // Show mic/video icon near avatar
      ctx.save();
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      // Check if any peer has video
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
    return `rgb(${Math.min(255, (num >> 16) + amount)},${Math.min(255, ((num >> 8) & 0xFF) + amount)},${Math.min(255, (num & 0xFF) + amount)})`;
  }

  function darkenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    return `rgb(${Math.max(0, (num >> 16) - amount)},${Math.max(0, ((num >> 8) & 0xFF) - amount)},${Math.max(0, (num & 0xFF) - amount)})`;
  }

  // ── Minimap ──
  function drawMinimap() {
    const mmW = minimap.width, mmH = minimap.height;
    const sx = mmW / CANVAS_W, sy = mmH / CANVAS_H;
    minimapCtx.fillStyle = '#2A1D10';
    minimapCtx.fillRect(0, 0, mmW, mmH);
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
