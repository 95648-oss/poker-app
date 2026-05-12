'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { initGame, startHand, executeAction, getPublicState } = require('./gameEngine');

const app = express();
app.use(cors());
app.use(express.json());

// In production, serve the compiled React app from client/dist
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  const distPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(distPath));
  // SPA fallback — all non-socket routes return index.html
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// rooms: Map<code, Room>
const rooms = new Map();

// socketToRoom: Map<socketId, { code, playerId }>
const socketToRoom = new Map();

const TIMER_SECONDS = 30;
const HAND_END_DELAY_MS = 4000;

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

// Emit game state to every player in the room (each gets a filtered view)
function broadcastGameState(room) {
  for (const player of room.players) {
    const socket = io.sockets.sockets.get(player.socketId);
    if (socket) {
      socket.emit('gameStateUpdate', getPublicState(room.game, player.id));
    }
  }
}

function getLobbyState(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    settings: room.settings,
    status: room.status,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
    })),
  };
}

// ── Timer management ──────────────────────────────────────────────────────────

function clearRoomTimer(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
}

function startTurnTimer(room) {
  clearRoomTimer(room);
  if (!room.game || room.game.currentPlayerIndex < 0) return;

  let timeLeft = TIMER_SECONDS;
  const currentPlayer = room.game.players[room.game.currentPlayerIndex];
  if (!currentPlayer) return;

  io.to(room.code).emit('timerUpdate', { playerId: currentPlayer.id, timeLeft });

  room.timerInterval = setInterval(() => {
    timeLeft--;
    const cp = room.game && room.game.players[room.game.currentPlayerIndex];
    if (!cp) { clearRoomTimer(room); return; }

    io.to(room.code).emit('timerUpdate', { playerId: cp.id, timeLeft });

    if (timeLeft <= 0) {
      clearRoomTimer(room);
      // Auto-fold if there's a bet to call, otherwise auto-check
      const canCheck = room.game.currentBet <= cp.bet;
      handleAction(room, cp.id, canCheck ? 'check' : 'fold', 0);
    }
  }, 1000);
}

// ── Core action handler ───────────────────────────────────────────────────────

function handleAction(room, playerId, action, amount) {
  clearRoomTimer(room);
  const result = executeAction(room.game, playerId, action, amount);

  if (result.error) {
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      const socket = io.sockets.sockets.get(player.socketId);
      if (socket) socket.emit('actionError', { message: result.error });
    }
    // Restart timer since action was rejected
    startTurnTimer(room);
    return;
  }

  room.game = result.game;
  broadcastGameState(room);

  const phase = room.game.phase;

  if (phase === 'showdown' || phase === 'handEnd') {
    io.to(room.code).emit('handResult', {
      winners: room.game.winners,
      showdownHands: room.game.showdownHands,
    });
    scheduleNextHand(room);
    return;
  }

  if (phase === 'gameOver') {
    const champ = room.game.players.find(p => p.chips > 0);
    io.to(room.code).emit('gameOver', { winnerId: champ?.id, winnerName: champ?.name });
    room.status = 'finished';
    return;
  }

  startTurnTimer(room);
}

function scheduleNextHand(room) {
  setTimeout(() => {
    if (!rooms.has(room.code)) return;

    // Eliminate broke players
    room.players = room.players.filter(p => {
      const gp = room.game.players.find(gpl => gpl.id === p.id);
      return gp && gp.chips > 0;
    });

    const remaining = room.game.players.filter(p => p.chips > 0);
    if (remaining.length <= 1) {
      const champ = remaining[0];
      io.to(room.code).emit('gameOver', { winnerId: champ?.id, winnerName: champ?.name });
      room.status = 'finished';
      return;
    }

    room.game = startHand(room.game);
    broadcastGameState(room);

    if (room.game.phase === 'gameOver') {
      const champ = room.game.players.find(p => p.chips > 0);
      io.to(room.code).emit('gameOver', { winnerId: champ?.id, winnerName: champ?.name });
      room.status = 'finished';
      return;
    }

    startTurnTimer(room);
  }, HAND_END_DELAY_MS);
}

// ── Socket.io event handlers ──────────────────────────────────────────────────

io.on('connection', socket => {
  console.log(`[+] connected: ${socket.id}`);

  // Create a new room
  socket.on('createRoom', ({ playerName, playerId, settings }) => {
    const code = generateCode();
    const pId = playerId || socket.id;

    const room = {
      code,
      hostId: pId,
      status: 'lobby',
      settings: {
        maxPlayers: Math.min(9, Math.max(2, settings?.maxPlayers || 6)),
        startingChips: Math.max(100, settings?.startingChips || 1000),
        smallBlind: Math.max(1, settings?.smallBlind || 10),
        bigBlind: Math.max(2, settings?.bigBlind || 20),
      },
      players: [{
        id: pId,
        name: playerName || 'Player',
        socketId: socket.id,
        connected: true,
      }],
      game: null,
      timerInterval: null,
    };

    rooms.set(code, room);
    socketToRoom.set(socket.id, { code, playerId: pId });
    socket.join(code);

    socket.emit('roomCreated', { code, playerId: pId, room: getLobbyState(room) });
    console.log(`[room] ${code} created by ${playerName}`);
  });

  // Join an existing room
  socket.on('joinRoom', ({ code, playerName, playerId }) => {
    const room = rooms.get(code?.toUpperCase());
    if (!room) { socket.emit('joinError', { message: 'Room not found' }); return; }
    if (room.status !== 'lobby') { socket.emit('joinError', { message: 'Game already in progress' }); return; }
    if (room.players.length >= room.settings.maxPlayers) { socket.emit('joinError', { message: 'Room is full' }); return; }

    const pId = playerId || socket.id;

    // Check if player is rejoining
    const existing = room.players.find(p => p.id === pId);
    if (existing) {
      existing.socketId = socket.id;
      existing.connected = true;
    } else {
      room.players.push({ id: pId, name: playerName || 'Player', socketId: socket.id, connected: true });
    }

    socketToRoom.set(socket.id, { code: room.code, playerId: pId });
    socket.join(room.code);

    socket.emit('roomJoined', { code: room.code, playerId: pId, room: getLobbyState(room) });
    io.to(room.code).emit('roomUpdate', getLobbyState(room));
    console.log(`[room] ${playerName} joined ${room.code}`);
  });

  // Rejoin a room mid-game
  socket.on('rejoinRoom', ({ code, playerId }) => {
    const room = rooms.get(code?.toUpperCase());
    if (!room) { socket.emit('joinError', { message: 'Room not found' }); return; }

    const lobbyPlayer = room.players.find(p => p.id === playerId);
    if (!lobbyPlayer) { socket.emit('joinError', { message: 'Player not found in room' }); return; }

    lobbyPlayer.socketId = socket.id;
    lobbyPlayer.connected = true;

    if (room.game) {
      const gp = room.game.players.find(p => p.id === playerId);
      if (gp) gp.connected = true;
    }

    socketToRoom.set(socket.id, { code: room.code, playerId });
    socket.join(room.code);

    socket.emit('roomJoined', { code: room.code, playerId, room: getLobbyState(room) });
    if (room.game) {
      socket.emit('gameStateUpdate', getPublicState(room.game, playerId));
      socket.emit('gameStarted', { settings: room.settings });
    }
    io.to(room.code).emit('playerReconnected', { playerId });
    console.log(`[room] ${playerId} rejoined ${room.code}`);
  });

  // Update room settings (host only)
  socket.on('updateSettings', ({ code, settings }) => {
    const meta = socketToRoom.get(socket.id);
    const room = rooms.get(code);
    if (!room || !meta || meta.playerId !== room.hostId) return;
    if (room.status !== 'lobby') return;

    room.settings = {
      maxPlayers: Math.min(9, Math.max(2, settings.maxPlayers || room.settings.maxPlayers)),
      startingChips: Math.max(100, settings.startingChips || room.settings.startingChips),
      smallBlind: Math.max(1, settings.smallBlind || room.settings.smallBlind),
      bigBlind: Math.max(2, settings.bigBlind || room.settings.bigBlind),
    };

    io.to(room.code).emit('roomUpdate', getLobbyState(room));
  });

  // Start the game (host only)
  socket.on('startGame', ({ code }) => {
    const meta = socketToRoom.get(socket.id);
    const room = rooms.get(code);
    if (!room || !meta || meta.playerId !== room.hostId) return;
    if (room.status !== 'lobby') return;
    if (room.players.length < 2) {
      socket.emit('startError', { message: 'Need at least 2 players' });
      return;
    }

    room.status = 'playing';
    room.game = initGame(room.players, room.settings);
    room.game = startHand(room.game);

    io.to(room.code).emit('gameStarted', { settings: room.settings });
    broadcastGameState(room);
    startTurnTimer(room);

    console.log(`[game] started in ${room.code} with ${room.players.length} players`);
  });

  // Player action
  socket.on('playerAction', ({ code, action, amount }) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return;
    const room = rooms.get(code);
    if (!room || room.status !== 'playing' || !room.game) return;

    handleAction(room, meta.playerId, action, Number(amount) || 0);
  });

  // Chat message
  socket.on('chatMessage', ({ code, message }) => {
    const meta = socketToRoom.get(socket.id);
    const room = rooms.get(code);
    if (!room || !meta) return;

    const player = room.players.find(p => p.id === meta.playerId);
    if (!player) return;

    const msg = String(message).slice(0, 200);
    io.to(room.code).emit('chatMessage', {
      playerId: meta.playerId,
      playerName: player.name,
      message: msg,
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return;

    const room = rooms.get(meta.code);
    if (!room) { socketToRoom.delete(socket.id); return; }

    const player = room.players.find(p => p.id === meta.playerId);
    if (player) player.connected = false;

    if (room.game) {
      const gp = room.game.players.find(p => p.id === meta.playerId);
      if (gp) gp.connected = false;
    }

    socketToRoom.delete(socket.id);
    io.to(room.code).emit('playerDisconnected', { playerId: meta.playerId });

    console.log(`[-] disconnected: ${meta.playerId} from ${meta.code}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Poker server running on http://localhost:${PORT}`);
});
