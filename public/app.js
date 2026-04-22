(() => {
  'use strict';

  // ── Constants ──
  const CANVAS_W = 1400, CANVAS_H = 900;
  const AVATAR_R = 18;
  const MOVE_SPEED = 3.5;
  const PROXIMITY_AUDIO = 300;
  const PROXIMITY_VIDEO = 150;
  const PROXIMITY_FULL = 80;
  const TILE_SIZE = 40;
  const WALL_W = 8;

  // ── Room definitions ──
  const ROOMS = [
    { id: 'ventas',       name: 'Ventas',               x: 0,    y: 0,   w: 440,  h: 360 },
    { id: 'soporte',      name: 'Soporte Técnico',      x: 448,  y: 0,   w: 440,  h: 360 },
    { id: 'produccion',   name: 'Producción',           x: 896,  y: 0,   w: 220,  h: 360 },
    { id: 'desarrollo',   name: 'Desarrollo',           x: 1124, y: 0,   w: 276,  h: 520 },
    { id: 'lobby',        name: 'Lobby',                x: 0,    y: 368, w: 888,  h: 240 },
    { id: 'breakroom',    name: 'Break Room',           x: 0,    y: 616, w: 400,  h: 284 },
    { id: 'conferencia',  name: 'Sala de Conferencias', x: 408,  y: 616, w: 480,  h: 284 },
    { id: 'pasillo',      name: 'Pasillo',              x: 896,  y: 368, w: 220,  h: 532 },
  ];

  // ── Walls ── [x1,y1, x2,y2]
  const WALLS = [
    // Outer boundary
    [0,0, 1400,0], [1400,0, 1400,900], [1400,900, 0,900], [0,900, 0,0],
    // Under Ventas
    [0, 360, 380, 360],
    [440, 360, 888, 360],
    // Under Soporte / Produccion
    [896, 360, 1124, 360],
    // Ventas | Soporte vertical
    [444, 0, 444, 140],
    [444, 200, 444, 360],
    // Soporte | Produccion
    [892, 0, 892, 120],
    [892, 180, 892, 360],
    // Produccion | Desarrollo
    [1120, 0, 1120, 200],
    [1120, 260, 1120, 520],
    // Lobby bottom walls
    [0, 608, 160, 608],
    [220, 608, 400, 608],
    [408, 608, 490, 608],
    [550, 608, 888, 608],
    // Break | Conferencia
    [404, 616, 404, 700],
    [404, 760, 404, 900],
    // Conferencia right
    [888, 608, 888, 900],
    // Pasillo walls
    [888, 368, 888, 460],
    [888, 520, 888, 608],
    // Desarrollo bottom
    [1120, 520, 1200, 520],
    [1260, 520, 1400, 520],
  ];

  // ── Furniture ──
  const FURNITURE = [
    // === Ventas (Sales) ===
    { type: 'desk', x: 40, y: 60, w: 80, h: 45 },
    { type: 'monitor', x: 55, y: 65, w: 30, h: 6 },
    { type: 'chair', x: 75, y: 115 },
    { type: 'desk', x: 150, y: 60, w: 80, h: 45 },
    { type: 'monitor', x: 165, y: 65, w: 30, h: 6 },
    { type: 'chair', x: 185, y: 115 },
    { type: 'desk', x: 260, y: 60, w: 80, h: 45 },
    { type: 'monitor', x: 275, y: 65, w: 30, h: 6 },
    { type: 'chair', x: 295, y: 115 },
    { type: 'desk', x: 40, y: 180, w: 80, h: 45 },
    { type: 'monitor', x: 55, y: 185, w: 30, h: 6 },
    { type: 'chair', x: 75, y: 235 },
    { type: 'desk', x: 150, y: 180, w: 80, h: 45 },
    { type: 'monitor', x: 165, y: 185, w: 30, h: 6 },
    { type: 'chair', x: 185, y: 235 },
    { type: 'desk', x: 260, y: 180, w: 80, h: 45 },
    { type: 'monitor', x: 275, y: 185, w: 30, h: 6 },
    { type: 'chair', x: 295, y: 235 },
    { type: 'plant', x: 400, y: 40 },
    { type: 'plant', x: 400, y: 320 },

    // === Soporte Técnico ===
    { type: 'desk', x: 490, y: 60, w: 80, h: 45 },
    { type: 'monitor', x: 505, y: 65, w: 30, h: 6 },
    { type: 'chair', x: 525, y: 115 },
    { type: 'desk', x: 600, y: 60, w: 80, h: 45 },
    { type: 'monitor', x: 615, y: 65, w: 30, h: 6 },
    { type: 'chair', x: 635, y: 115 },
    { type: 'desk', x: 710, y: 60, w: 80, h: 45 },
    { type: 'monitor', x: 725, y: 65, w: 30, h: 6 },
    { type: 'chair', x: 745, y: 115 },
    { type: 'desk', x: 490, y: 200, w: 80, h: 45 },
    { type: 'monitor', x: 505, y: 205, w: 30, h: 6 },
    { type: 'chair', x: 525, y: 255 },
    { type: 'desk', x: 600, y: 200, w: 80, h: 45 },
    { type: 'monitor', x: 615, y: 205, w: 30, h: 6 },
    { type: 'chair', x: 635, y: 255 },
    { type: 'plant', x: 840, y: 40 },
    { type: 'plant', x: 840, y: 320 },

    // === Producción ===
    { type: 'desk', x: 920, y: 60, w: 80, h: 45 },
    { type: 'monitor', x: 935, y: 65, w: 30, h: 6 },
    { type: 'chair', x: 955, y: 115 },
    { type: 'desk', x: 1020, y: 60, w: 80, h: 45 },
    { type: 'monitor', x: 1035, y: 65, w: 30, h: 6 },
    { type: 'chair', x: 1055, y: 115 },
    { type: 'worktable', x: 930, y: 200, w: 150, h: 70 },
    { type: 'plant', x: 1080, y: 320 },

    // === Desarrollo ===
    { type: 'desk', x: 1160, y: 50, w: 80, h: 45 },
    { type: 'monitor', x: 1175, y: 55, w: 30, h: 6 },
    { type: 'chair', x: 1195, y: 105 },
    { type: 'desk', x: 1280, y: 50, w: 80, h: 45 },
    { type: 'monitor', x: 1295, y: 55, w: 30, h: 6 },
    { type: 'chair', x: 1315, y: 105 },
    { type: 'desk', x: 1160, y: 190, w: 80, h: 45 },
    { type: 'monitor', x: 1175, y: 195, w: 30, h: 6 },
    { type: 'chair', x: 1195, y: 245 },
    { type: 'desk', x: 1280, y: 190, w: 80, h: 45 },
    { type: 'monitor', x: 1295, y: 195, w: 30, h: 6 },
    { type: 'chair', x: 1315, y: 245 },
    { type: 'plant', x: 1360, y: 480 },
    { type: 'plant', x: 1145, y: 480 },

    // === Lobby ===
    { type: 'sofa', x: 60, y: 420, w: 100, h: 40 },
    { type: 'sofa', x: 60, y: 520, w: 100, h: 40 },
    { type: 'coffeetable', x: 80, y: 475, w: 60, h: 30 },
    { type: 'sofa', x: 700, y: 420, w: 100, h: 40 },
    { type: 'sofa', x: 700, y: 520, w: 100, h: 40 },
    { type: 'coffeetable', x: 720, y: 475, w: 60, h: 30 },
    { type: 'plant_large', x: 220, y: 395 },
    { type: 'plant_large', x: 660, y: 395 },
    { type: 'plant_large', x: 220, y: 575 },
    { type: 'plant_large', x: 660, y: 575 },
    { type: 'reception', x: 380, y: 380, w: 120, h: 35 },

    // === Break Room ===
    { type: 'sofa', x: 40, y: 660, w: 120, h: 45 },
    { type: 'sofa', x: 40, y: 780, w: 120, h: 45 },
    { type: 'coffeetable', x: 60, y: 720, w: 80, h: 35 },
    { type: 'vending', x: 310, y: 640, w: 50, h: 30 },
    { type: 'vending', x: 310, y: 690, w: 50, h: 30 },
    { type: 'plant', x: 360, y: 860 },
    { type: 'plant', x: 30, y: 860 },

    // === Sala de Conferencias ===
    { type: 'conference_table', x: 510, y: 700, w: 260, h: 110 },
    { type: 'conf_chair', x: 540, y: 690 },
    { type: 'conf_chair', x: 600, y: 690 },
    { type: 'conf_chair', x: 660, y: 690 },
    { type: 'conf_chair', x: 720, y: 690 },
    { type: 'conf_chair', x: 540, y: 820 },
    { type: 'conf_chair', x: 600, y: 820 },
    { type: 'conf_chair', x: 660, y: 820 },
    { type: 'conf_chair', x: 720, y: 820 },
    { type: 'conf_chair', x: 500, y: 740 },
    { type: 'conf_chair', x: 780, y: 740 },
    { type: 'conf_chair', x: 500, y: 770 },
    { type: 'conf_chair', x: 780, y: 770 },
    { type: 'screen', x: 610, y: 640, w: 70, h: 10 },
    { type: 'plant', x: 440, y: 860 },
    { type: 'plant', x: 850, y: 860 },
  ];

  const COLLISION_RECTS = FURNITURE.filter(f =>
    ['desk','worktable','conference_table','reception','sofa','vending','coffeetable'].includes(f.type)
  );

  // ── State ──
  let ws = null;
  let myId = null;
  let myUser = { name: '', color: '#1E90FF', x: 440, y: 490 };
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
  const connectionStatus = document.getElementById('connection-status');
  const onlineCount = document.getElementById('online-count');
  const currentZone = document.getElementById('current-zone');
  const videoPanel = document.getElementById('video-panel');
  const userListEl = document.getElementById('user-list');
  const peopleCountEl = document.getElementById('people-count');
  const channelListEl = document.getElementById('channel-list');

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
        closePeer(msg.id);
        updateOnlineCount();
        updateUserList();
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
        break;
      }
      case 'user_camera': {
        const u = users.get(msg.id);
        if (u) u.cameraOff = msg.cameraOff;
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
  }

  function updateProximityConnections() {
    users.forEach((u, id) => {
      const dx = myUser.x - u.x, dy = myUser.y - u.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= PROXIMITY_AUDIO) {
        const peer = peers.get(id);
        if (!peer) { if (myId < id) getOrCreatePeer(id, true); }
        else if (peer.audioEl) {
          peer.audioEl.volume = dist < PROXIMITY_FULL ? 1 : Math.max(0, 1 - (dist - PROXIMITY_FULL) / (PROXIMITY_AUDIO - PROXIMITY_FULL));
        }
        if (peer && peer.videoBoxEl) peer.videoBoxEl.style.display = dist <= PROXIMITY_VIDEO ? '' : 'none';
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
    }
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'camera_toggle', cameraOff: isCameraOff }));
  }

  function toggleMic() {
    isMuted = !isMuted;
    if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
    updateMicUI();
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'mute_toggle', muted: isMuted }));
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
    myId = null;
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (animFrame) cancelAnimationFrame(animFrame);
    app.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    btnJoin.textContent = 'Join Office';
    btnJoin.disabled = false;
    videoPanel.innerHTML = '';
  });

  // ── Canvas ──
  function initCanvas() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('touchstart', onCanvasTouch, { passive: false });
    document.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; keys[e.key.toLowerCase()] = true; });
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

  function onCanvasClick(e) {
    const pos = getCanvasCoords(e);
    moveTarget = { x: clamp(pos.x, AVATAR_R, CANVAS_W - AVATAR_R), y: clamp(pos.y, AVATAR_R, CANVAS_H - AVATAR_R) };
  }

  function onCanvasTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    moveTarget = {
      x: clamp((touch.clientX - rect.left) * (CANVAS_W / rect.width), AVATAR_R, CANVAS_W - AVATAR_R),
      y: clamp((touch.clientY - rect.top) * (CANVAS_H / rect.height), AVATAR_R, CANVAS_H - AVATAR_R)
    };
  }

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  function render() {
    update();
    draw();
    drawMinimap();
    animFrame = requestAnimationFrame(render);
  }

  function update() {
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= MOVE_SPEED;
    if (keys['s'] || keys['arrowdown']) dy += MOVE_SPEED;
    if (keys['a'] || keys['arrowleft']) dx -= MOVE_SPEED;
    if (keys['d'] || keys['arrowright']) dx += MOVE_SPEED;
    if (dx || dy) { moveTarget = null; moveSelf(myUser.x + dx, myUser.y + dy); }

    if (moveTarget) {
      const tdx = moveTarget.x - myUser.x, tdy = moveTarget.y - myUser.y;
      const dist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (dist < MOVE_SPEED) { moveSelf(moveTarget.x, moveTarget.y); moveTarget = null; }
      else moveSelf(myUser.x + (tdx / dist) * MOVE_SPEED, myUser.y + (tdy / dist) * MOVE_SPEED);
    }

    users.forEach(u => {
      const ddx = u.targetX - u.x, ddy = u.targetY - u.y;
      if (Math.abs(ddx) + Math.abs(ddy) > 1) { u.x += ddx * 0.15; u.y += ddy * 0.15; }
      else { u.x = u.targetX; u.y = u.targetY; }
    });

    const room = getRoomAt(myUser.x, myUser.y);
    currentZone.textContent = room ? room.name : 'Hallway';
    updateProximityConnections();
  }

  let lastSentPos = { x: 0, y: 0 };

  function moveSelf(nx, ny) {
    nx = clamp(nx, AVATAR_R, CANVAS_W - AVATAR_R);
    ny = clamp(ny, AVATAR_R, CANVAS_H - AVATAR_R);
    for (const f of COLLISION_RECTS) {
      if (nx + AVATAR_R > f.x && nx - AVATAR_R < f.x + f.w && ny + AVATAR_R > f.y && ny - AVATAR_R < f.y + f.h) return;
    }
    myUser.x = nx;
    myUser.y = ny;
    if (Math.abs(nx - lastSentPos.x) > 2 || Math.abs(ny - lastSentPos.y) > 2) {
      lastSentPos = { x: nx, y: ny };
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'move', x: nx, y: ny }));
    }
  }

  function getRoomAt(x, y) {
    return ROOMS.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  }

  // ── Drawing ──
  function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawFloor();
    drawRooms();
    drawWalls();
    drawFurniture();
    drawLobbyLogo();
    drawProximityRings();
    users.forEach(u => drawAvatar(u, false));
    drawAvatar({ ...myUser, id: myId, muted: isMuted, cameraOff: isCameraOff, speaking: isSpeaking }, true);
  }

  function drawFloor() {
    for (let ty = 0; ty < CANVAS_H; ty += TILE_SIZE) {
      for (let tx = 0; tx < CANVAS_W; tx += TILE_SIZE) {
        const checker = ((tx / TILE_SIZE) + (ty / TILE_SIZE)) % 2 === 0;
        ctx.fillStyle = checker ? '#3D2B1F' : '#4A3728';
        ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  function drawRooms() {
    ROOMS.forEach(r => {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(r.x + WALL_W / 2, r.y + WALL_W / 2, r.w - WALL_W, r.h - WALL_W);
      ctx.save();
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(r.name, r.x + r.w / 2, r.y + 12);
      ctx.restore();
    });
  }

  function drawWalls() {
    ctx.strokeStyle = '#E8E0D8';
    ctx.lineWidth = WALL_W;
    ctx.lineCap = 'round';
    WALLS.forEach(([x1, y1, x2, y2]) => {
      if (x1 === x2 && y1 === y2) return;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
  }

  function drawFurniture() {
    FURNITURE.forEach(f => {
      switch (f.type) {
        case 'desk':
          ctx.fillStyle = '#2C2216';
          roundRect(ctx, f.x, f.y, f.w, f.h, 3); ctx.fill();
          ctx.strokeStyle = '#1A150E'; ctx.lineWidth = 1;
          roundRect(ctx, f.x, f.y, f.w, f.h, 3); ctx.stroke();
          break;
        case 'monitor':
          ctx.fillStyle = '#87CEEB'; ctx.globalAlpha = 0.5;
          ctx.fillRect(f.x, f.y, f.w, f.h); ctx.globalAlpha = 1;
          break;
        case 'chair':
          ctx.fillStyle = '#444';
          ctx.beginPath(); ctx.arc(f.x, f.y, 8, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke();
          break;
        case 'conf_chair':
          ctx.fillStyle = '#555';
          ctx.beginPath(); ctx.arc(f.x, f.y, 9, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();
          break;
        case 'plant': drawPlant(f.x, f.y, 14); break;
        case 'plant_large': drawPlant(f.x, f.y, 20); break;
        case 'sofa':
          ctx.fillStyle = '#4A6741';
          roundRect(ctx, f.x, f.y, f.w, f.h, 8); ctx.fill();
          ctx.strokeStyle = '#3A5231'; ctx.lineWidth = 1.5;
          roundRect(ctx, f.x, f.y, f.w, f.h, 8); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(f.x + 10, f.y + f.h / 2); ctx.lineTo(f.x + f.w - 10, f.y + f.h / 2);
          ctx.strokeStyle = '#3A5231'; ctx.lineWidth = 1; ctx.stroke();
          break;
        case 'coffeetable':
          ctx.fillStyle = '#5C4033';
          roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.fill();
          ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 1;
          roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.stroke();
          break;
        case 'conference_table':
          ctx.fillStyle = '#5C4033';
          ctx.beginPath(); ctx.ellipse(f.x + f.w / 2, f.y + f.h / 2, f.w / 2, f.h / 2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#3D2B1F'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.beginPath(); ctx.ellipse(f.x + f.w / 2, f.y + f.h / 2 - 5, f.w / 2 - 15, f.h / 2 - 15, 0, 0, Math.PI * 2); ctx.fill();
          break;
        case 'worktable':
          ctx.fillStyle = '#6B5B4F';
          roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.fill();
          ctx.strokeStyle = '#4A3D33'; ctx.lineWidth = 1.5;
          roundRect(ctx, f.x, f.y, f.w, f.h, 4); ctx.stroke();
          break;
        case 'reception':
          ctx.fillStyle = '#2C2216';
          roundRect(ctx, f.x, f.y, f.w, f.h, 6); ctx.fill();
          ctx.strokeStyle = '#1A150E'; ctx.lineWidth = 1.5;
          roundRect(ctx, f.x, f.y, f.w, f.h, 6); ctx.stroke();
          ctx.fillStyle = '#87CEEB'; ctx.globalAlpha = 0.4;
          ctx.fillRect(f.x + f.w / 2 - 12, f.y + 8, 24, 6); ctx.globalAlpha = 1;
          break;
        case 'vending':
          ctx.fillStyle = '#555B6E';
          roundRect(ctx, f.x, f.y, f.w, f.h, 3); ctx.fill();
          ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
          roundRect(ctx, f.x, f.y, f.w, f.h, 3); ctx.stroke();
          ctx.fillStyle = 'rgba(100,200,255,0.3)';
          ctx.fillRect(f.x + 5, f.y + 4, f.w - 10, f.h - 12);
          break;
        case 'screen':
          ctx.fillStyle = '#DDD'; ctx.fillRect(f.x, f.y, f.w, f.h);
          ctx.strokeStyle = '#999'; ctx.lineWidth = 1; ctx.strokeRect(f.x, f.y, f.w, f.h);
          break;
      }
    });
  }

  function drawPlant(cx, cy, r) {
    ctx.fillStyle = '#8B4513';
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.3, r * 0.45, 0, Math.PI * 2); ctx.fill();
    const leafColors = ['#2D8B2D', '#3AA63A', '#228B22', '#1B7A1B'];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      ctx.fillStyle = leafColors[i % leafColors.length];
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * r * 0.35, cy + Math.sin(angle) * r * 0.35 - r * 0.15, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#1B5E1B';
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 0.3, 0, Math.PI * 2); ctx.fill();
  }

  function drawLobbyLogo() {
    const lobby = ROOMS.find(r => r.id === 'lobby');
    if (!lobby) return;
    const cx = lobby.x + lobby.w / 2, cy = lobby.y + lobby.h / 2 + 10;
    ctx.save();
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(30,90,200,0.2)';
    ctx.fillText('EXACTO SIGNAGE', cx, cy);
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(30,90,200,0.15)';
    ctx.fillText('Virtual Office', cx, cy + 26);
    ctx.restore();
  }

  function drawProximityRings() {
    ctx.beginPath(); ctx.arc(myUser.x, myUser.y, PROXIMITY_AUDIO, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30,144,255,0.02)'; ctx.fill();
    ctx.strokeStyle = 'rgba(30,144,255,0.06)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(myUser.x, myUser.y, PROXIMITY_VIDEO, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(30,144,255,0.1)'; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
  }

  function drawAvatar(u, isSelf) {
    const x = u.x, y = u.y;
    if (u.speaking && !u.muted) {
      const pulse = 1 + 0.15 * Math.sin(Date.now() / 150);
      ctx.beginPath(); ctx.arc(x, y, AVATAR_R * pulse + 6, 0, Math.PI * 2);
      ctx.strokeStyle = u.color; ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Date.now() / 150);
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(x, y + AVATAR_R + 2, AVATAR_R * 0.8, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Circle
    ctx.beginPath(); ctx.arc(x, y, AVATAR_R, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, AVATAR_R);
    grad.addColorStop(0, lightenColor(u.color, 30)); grad.addColorStop(1, u.color);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = isSelf ? '#fff' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = isSelf ? 2.5 : 1.5; ctx.stroke();
    // Initials
    const initials = (u.name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(initials, x, y + 1);
    // Name tag
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textBaseline = 'top';
    const nameW = ctx.measureText(u.name).width + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    roundRect(ctx, x - nameW / 2, y + AVATAR_R + 6, nameW, 17, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(u.name, x, y + AVATAR_R + 9);
    // Muted badge
    if (u.muted) {
      ctx.fillStyle = '#ff4757';
      ctx.beginPath(); ctx.arc(x + AVATAR_R - 4, y - AVATAR_R + 4, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + AVATAR_R - 7, y - AVATAR_R + 1); ctx.lineTo(x + AVATAR_R - 1, y - AVATAR_R + 7); ctx.stroke();
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

  // ── Minimap ──
  function drawMinimap() {
    const mmW = minimap.width, mmH = minimap.height;
    const sx = mmW / CANVAS_W, sy = mmH / CANVAS_H;
    minimapCtx.fillStyle = '#3D2B1F';
    minimapCtx.fillRect(0, 0, mmW, mmH);
    ROOMS.forEach(r => {
      minimapCtx.fillStyle = 'rgba(255,255,255,0.08)';
      minimapCtx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
      minimapCtx.strokeStyle = '#E8E0D8'; minimapCtx.lineWidth = 1;
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
