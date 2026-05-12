import { useState, useEffect, useCallback } from 'react';
import socket from './socket';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Table from './pages/Table';

const PLAYER_ID_KEY = 'poker_player_id';

function getOrCreatePlayerId() {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = `p_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export default function App() {
  const [screen, setScreen] = useState('home'); // 'home' | 'lobby' | 'table' | 'end'
  const [playerId] = useState(getOrCreatePlayerId);
  const [roomCode, setRoomCode] = useState(null);
  const [roomState, setRoomState] = useState(null);   // lobby data
  const [gameState, setGameState] = useState(null);   // live game state
  const [gameSettings, setGameSettings] = useState(null);
  const [handResult, setHandResult] = useState(null); // { winners, showdownHands }
  const [gameOver, setGameOver] = useState(null);     // { winnerId, winnerName }
  const [chat, setChat] = useState([]);
  const [timer, setTimer] = useState(null);           // { playerId, timeLeft }
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('roomCreated', ({ code, room }) => {
      setRoomCode(code);
      setRoomState(room);
      setScreen('lobby');
    });

    socket.on('roomJoined', ({ code, room }) => {
      setRoomCode(code);
      setRoomState(room);
      setScreen('lobby');
    });

    socket.on('roomUpdate', (room) => {
      setRoomState(room);
    });

    socket.on('joinError', ({ message }) => {
      alert(`Could not join: ${message}`);
    });

    socket.on('startError', ({ message }) => {
      alert(message);
    });

    socket.on('gameStarted', ({ settings }) => {
      setGameSettings(settings);
      setHandResult(null);
      setGameOver(null);
      setScreen('table');
    });

    socket.on('gameStateUpdate', (state) => {
      setGameState(state);
      // Clear hand result once new hand begins (phase resets)
      if (state.phase === 'preflop') {
        setHandResult(null);
      }
    });

    socket.on('handResult', (result) => {
      setHandResult(result);
    });

    socket.on('gameOver', (data) => {
      setGameOver(data);
    });

    socket.on('chatMessage', (msg) => {
      setChat(prev => [...prev.slice(-99), msg]);
    });

    socket.on('timerUpdate', (data) => {
      setTimer(data);
    });

    socket.on('playerDisconnected', ({ playerId: pid }) => {
      setChat(prev => [...prev, { system: true, message: `Player disconnected`, timestamp: Date.now(), playerId: pid }]);
    });

    socket.on('playerReconnected', ({ playerId: pid }) => {
      setChat(prev => [...prev, { system: true, message: `Player reconnected`, timestamp: Date.now(), playerId: pid }]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('roomUpdate');
      socket.off('joinError');
      socket.off('startError');
      socket.off('gameStarted');
      socket.off('gameStateUpdate');
      socket.off('handResult');
      socket.off('gameOver');
      socket.off('chatMessage');
      socket.off('timerUpdate');
      socket.off('playerDisconnected');
      socket.off('playerReconnected');
    };
  }, []);

  // Reconnect on reload if we have a room code stored
  useEffect(() => {
    const savedCode = sessionStorage.getItem('poker_room_code');
    if (savedCode && connected) {
      socket.emit('rejoinRoom', { code: savedCode, playerId });
    }
  }, [connected, playerId]);

  useEffect(() => {
    if (roomCode) sessionStorage.setItem('poker_room_code', roomCode);
  }, [roomCode]);

  const sendAction = useCallback((action, amount = 0) => {
    socket.emit('playerAction', { code: roomCode, action, amount });
  }, [roomCode]);

  const sendChat = useCallback((message) => {
    socket.emit('chatMessage', { code: roomCode, message });
  }, [roomCode]);

  const goHome = useCallback(() => {
    sessionStorage.removeItem('poker_room_code');
    setScreen('home');
    setRoomCode(null);
    setRoomState(null);
    setGameState(null);
    setHandResult(null);
    setGameOver(null);
    setChat([]);
    setTimer(null);
  }, []);

  if (screen === 'home') {
    return <Home playerId={playerId} onRoomCreated={setRoomCode} onJoinRoom={() => {}} />;
  }

  if (screen === 'lobby') {
    return (
      <Lobby
        playerId={playerId}
        roomCode={roomCode}
        roomState={roomState}
        chat={chat}
        onChat={sendChat}
        onLeave={goHome}
      />
    );
  }

  if (screen === 'table') {
    return (
      <Table
        playerId={playerId}
        roomCode={roomCode}
        gameState={gameState}
        handResult={handResult}
        gameOver={gameOver}
        chat={chat}
        timer={timer}
        onAction={sendAction}
        onChat={sendChat}
        onLeave={goHome}
      />
    );
  }

  return null;
}
