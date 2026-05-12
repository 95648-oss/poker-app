import { useState, useRef, useEffect } from 'react';

export default function ChatSidebar({ chat, onChat, onClose }) {
  const [msg, setMsg] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const send = () => {
    if (!msg.trim()) return;
    onChat(msg.trim());
    setMsg('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur border-l border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="font-semibold text-sm text-white/80">Chat</h2>
        {onClose && (
          <button className="text-white/40 hover:text-white text-lg leading-none" onClick={onClose}>×</button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-3 py-2 space-y-2">
        {chat.length === 0 && (
          <p className="text-white/20 text-xs italic text-center mt-4">
            No messages yet
          </p>
        )}
        {chat.map((m, i) => (
          <div key={i}>
            {m.system ? (
              <p className="text-white/25 text-xs italic text-center">{m.message}</p>
            ) : (
              <div className="text-sm">
                <span className="font-semibold text-amber-400">{m.playerName}: </span>
                <span className="text-white/80 break-words">{m.message}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-white/10 flex gap-2">
        <input
          className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white
                     placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-amber-400"
          placeholder="Message..."
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          maxLength={200}
        />
        <button
          className="btn bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm px-3 py-1.5"
          onClick={send}
        >
          →
        </button>
      </div>
    </div>
  );
}
