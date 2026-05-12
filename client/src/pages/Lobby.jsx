import { useState, useRef, useEffect } from 'react';
import socket from '../socket';

export default function Lobby({ playerId, roomCode, roomState, chat, onChat, onLeave }) {
  const [msg, setMsg] = useState('');
  const [settings, setSettings] = useState(roomState?.settings || {});
  const chatEndRef = useRef(null);

  const isHost = roomState?.hostId === playerId;

  useEffect(() => {
    if (roomState?.settings) setSettings(roomState.settings);
  }, [roomState?.settings]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const handleStart = () => {
    socket.emit('startGame', { code: roomCode });
  };

  const handleSettingsChange = (key, val) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    socket.emit('updateSettings', { code: roomCode, settings: next });
  };

  const sendMsg = () => {
    if (!msg.trim()) return;
    onChat(msg.trim());
    setMsg('');
  };

  if (!roomState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white/50">Loading room...</div>
      </div>
    );
  }

  const canStart = isHost && roomState.players.length >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-felt-dark to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">Game Lobby</h1>
            <p className="text-white/50 text-sm">Waiting for players...</p>
          </div>
          <button className="btn-ghost text-sm" onClick={onLeave}>← Leave</button>
        </div>

        {/* Room code */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Invite Code</p>
          <div className="text-5xl font-mono font-bold text-amber-400 tracking-[0.2em]">
            {roomCode}
          </div>
          <p className="text-white/40 text-xs mt-2">Share this code with friends to join</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Players */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h2 className="font-semibold text-white/80 mb-3 flex items-center gap-2">
              Players
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/50">
                {roomState.players.length} / {roomState.settings.maxPlayers}
              </span>
            </h2>
            <ul className="space-y-2">
              {roomState.players.map(p => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2"
                >
                  <span className={`w-2 h-2 rounded-full ${p.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="flex-1 font-medium">{p.name}</span>
                  {p.id === roomState.hostId && (
                    <span className="text-xs text-amber-400 font-medium">HOST</span>
                  )}
                  {p.id === playerId && (
                    <span className="text-xs text-white/30">you</span>
                  )}
                </li>
              ))}
              {roomState.players.length < roomState.settings.maxPlayers && (
                <li className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2 opacity-30 border border-dashed border-white/20">
                  <span className="w-2 h-2 rounded-full bg-white/20" />
                  <span className="text-sm italic">Waiting for player...</span>
                </li>
              )}
            </ul>
          </div>

          {/* Settings / Info */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
            <h2 className="font-semibold text-white/80">Game Settings</h2>
            {isHost ? (
              <>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Max Players</label>
                  <input
                    type="number" min={2} max={9}
                    className="input"
                    value={settings.maxPlayers || 6}
                    onChange={e => handleSettingsChange('maxPlayers', +e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Starting Chips</label>
                  <input
                    type="number" min={100} step={100}
                    className="input"
                    value={settings.startingChips || 1000}
                    onChange={e => handleSettingsChange('startingChips', +e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Small Blind</label>
                    <input
                      type="number" min={1}
                      className="input"
                      value={settings.smallBlind || 10}
                      onChange={e => handleSettingsChange('smallBlind', +e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Big Blind</label>
                    <input
                      type="number" min={2}
                      className="input"
                      value={settings.bigBlind || 20}
                      onChange={e => handleSettingsChange('bigBlind', +e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2 text-sm text-white/60">
                <div className="flex justify-between"><span>Max Players</span><span className="text-white">{roomState.settings.maxPlayers}</span></div>
                <div className="flex justify-between"><span>Starting Chips</span><span className="text-white">{roomState.settings.startingChips.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Blinds</span><span className="text-white">{roomState.settings.smallBlind} / {roomState.settings.bigBlind}</span></div>
              </div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <h2 className="font-semibold text-white/80 mb-2 text-sm">Chat</h2>
          <div className="h-24 overflow-y-auto chat-scroll mb-2 space-y-1">
            {chat.length === 0 && <p className="text-white/20 text-xs italic">No messages yet</p>}
            {chat.map((m, i) => (
              <div key={i} className="text-sm">
                {m.system
                  ? <span className="text-white/30 italic">{m.message}</span>
                  : <><span className="text-amber-400 font-medium">{m.playerName}: </span><span className="text-white/80">{m.message}</span></>
                }
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <input
              className="input text-sm flex-1"
              placeholder="Say something..."
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
            />
            <button className="btn-ghost text-sm px-3" onClick={sendMsg}>Send</button>
          </div>
        </div>

        {/* Start / waiting */}
        {isHost ? (
          <button
            className="btn-primary w-full py-3 text-lg"
            onClick={handleStart}
            disabled={!canStart}
          >
            {canStart ? 'Start Game →' : `Waiting for players... (${roomState.players.length}/2 min)`}
          </button>
        ) : (
          <div className="text-center text-white/40 text-sm py-2">
            Waiting for the host to start the game...
          </div>
        )}
      </div>
    </div>
  );
}
