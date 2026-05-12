import { useState } from 'react';
import socket from '../socket';

export default function Home({ playerId }) {
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('poker_name') || '');
  const [joinCode, setJoinCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [settings, setSettings] = useState({
    maxPlayers: 6,
    startingChips: 1000,
    smallBlind: 10,
    bigBlind: 20,
  });

  const saveName = (name) => {
    setPlayerName(name);
    localStorage.setItem('poker_name', name);
  };

  const handleCreate = () => {
    if (!playerName.trim()) { alert('Enter your name first'); return; }
    socket.emit('createRoom', { playerName: playerName.trim(), playerId, settings });
  };

  const handleJoin = () => {
    if (!playerName.trim()) { alert('Enter your name first'); return; }
    if (!joinCode.trim()) { alert('Enter a room code'); return; }
    socket.emit('joinRoom', { code: joinCode.trim().toUpperCase(), playerName: playerName.trim(), playerId });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-felt-dark to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-6xl">🃏</div>
          <h1 className="text-4xl font-bold text-amber-400 tracking-tight">Texas Hold'em</h1>
          <p className="text-white/50 text-sm">Private multiplayer poker</p>
        </div>

        {/* Name input */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Your Name</label>
            <input
              className="input"
              placeholder="Enter your name..."
              value={playerName}
              maxLength={20}
              onChange={e => saveName(e.target.value)}
            />
          </div>

          {/* Join room */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Join a Room</label>
            <div className="flex gap-2">
              <input
                className="input uppercase tracking-widest"
                placeholder="ROOM CODE"
                value={joinCode}
                maxLength={6}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
              <button className="btn-primary whitespace-nowrap" onClick={handleJoin}>
                Join
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-white/30">
            <hr className="flex-1 border-white/10" />
            <span className="text-xs">or</span>
            <hr className="flex-1 border-white/10" />
          </div>

          <button
            className="btn-ghost w-full"
            onClick={() => setShowCreate(v => !v)}
          >
            {showCreate ? 'Hide Options ▲' : 'Create New Room ▼'}
          </button>

          {/* Create room settings */}
          {showCreate && (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <h3 className="font-semibold text-white/80 text-sm">Room Settings</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Max Players</label>
                  <input
                    type="number" min={2} max={9}
                    className="input"
                    value={settings.maxPlayers}
                    onChange={e => setSettings(s => ({ ...s, maxPlayers: +e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Starting Chips</label>
                  <input
                    type="number" min={100} step={100}
                    className="input"
                    value={settings.startingChips}
                    onChange={e => setSettings(s => ({ ...s, startingChips: +e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Small Blind</label>
                  <input
                    type="number" min={1}
                    className="input"
                    value={settings.smallBlind}
                    onChange={e => setSettings(s => ({
                      ...s,
                      smallBlind: +e.target.value,
                      bigBlind: Math.max(+e.target.value * 2, s.bigBlind),
                    }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Big Blind</label>
                  <input
                    type="number" min={2}
                    className="input"
                    value={settings.bigBlind}
                    onChange={e => setSettings(s => ({ ...s, bigBlind: +e.target.value }))}
                  />
                </div>
              </div>
              <button className="btn-primary w-full" onClick={handleCreate}>
                Create Room
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/20 text-xs">
          All game state is server-authoritative · No account needed
        </p>
      </div>
    </div>
  );
}
