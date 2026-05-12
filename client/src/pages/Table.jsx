import { useState, useMemo } from 'react';
import PlayerSeat from '../components/PlayerSeat';
import CommunityCards from '../components/CommunityCards';
import ActionPanel from '../components/ActionPanel';
import ChatSidebar from '../components/ChatSidebar';
import { CardRow } from '../components/Card';

// Oval seat positions for N players. Seat 0 = bottom center, going clockwise.
function getSeatStyle(seatIndex, total) {
  // Place players clockwise around an ellipse, seat 0 at bottom center.
  // Subtracting from PI/2 gives clockwise direction (y-axis is inverted in CSS).
  const angle = Math.PI / 2 - (seatIndex / total) * 2 * Math.PI;
  const rx = 40; // % of container width
  const ry = 36; // % of container height
  return {
    left: `${50 + rx * Math.cos(angle)}%`,
    top: `${50 + ry * Math.sin(angle)}%`,
    transform: 'translate(-50%, -50%)',
  };
}

export default function Table({
  playerId,
  roomCode,
  gameState,
  handResult,
  gameOver,
  chat,
  timer,
  onAction,
  onChat,
  onLeave,
}) {
  const [showChat, setShowChat] = useState(false);

  const game = gameState;

  // Find my player
  const myPlayer = game?.players.find(p => p.id === playerId);
  const myIndex = game?.players.findIndex(p => p.id === playerId);
  const isMyTurn = game?.currentPlayerIndex === myIndex && myIndex >= 0;
  const myTimer = isMyTurn && timer?.playerId === playerId ? timer : null;

  // Order players so I'm at position 0 (bottom), others clockwise
  const orderedPlayers = useMemo(() => {
    if (!game?.players) return [];
    const total = game.players.length;
    const myIdx = game.players.findIndex(p => p.id === playerId);
    if (myIdx < 0) return game.players.map((p, i) => ({ ...p, seatPos: i }));
    return game.players.map((p, i) => ({
      ...p,
      seatPos: (i - myIdx + total) % total,
    }));
  }, [game?.players, playerId]);

  // Showdown hands by playerId
  const showdownMap = useMemo(() => {
    if (!handResult?.showdownHands) return {};
    return Object.fromEntries(handResult.showdownHands.map(h => [h.playerId, h.handName]));
  }, [handResult]);

  if (!game) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white/50 animate-pulse">Waiting for game state...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 flex overflow-hidden">
      {/* Main table area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5 z-10">
          <div className="flex items-center gap-3">
            <span className="text-white/30 text-xs font-mono">Room: {roomCode}</span>
            <span className="text-white/20 text-xs">Hand #{game.handNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost text-xs px-3 py-1"
              onClick={() => setShowChat(v => !v)}
            >
              💬 Chat {chat.length > 0 ? `(${chat.length})` : ''}
            </button>
            <button className="btn-ghost text-xs px-3 py-1" onClick={onLeave}>
              Leave
            </button>
          </div>
        </div>

        {/* Poker table */}
        <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
          {/* Felt oval */}
          <div
            className="relative rounded-[50%] bg-felt border-8 border-amber-900/60 shadow-2xl"
            style={{ width: '100%', maxWidth: 900, aspectRatio: '16/9' }}
          >
            {/* Inner felt rim */}
            <div className="absolute inset-3 rounded-[50%] border-2 border-amber-900/30" />

            {/* Community cards + pot — center of table */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <CommunityCards
                communityCards={game.communityCards}
                pot={game.pot}
                phase={game.phase}
              />
            </div>

            {/* Player seats around the oval */}
            {orderedPlayers.map(player => {
              const total = orderedPlayers.length;
              const isActive = game.currentPlayerIndex === game.players.findIndex(p => p.id === player.id);
              const playerTimer = isActive && timer?.playerId === player.id ? timer : null;
              const isMe = player.id === playerId;

              return (
                <div
                  key={player.id}
                  className="absolute z-20"
                  style={getSeatStyle(player.seatPos, total)}
                >
                  <PlayerSeat
                    player={player}
                    isMe={isMe}
                    isActive={isActive}
                    isDealer={player.isDealer}
                    isSmallBlind={player.isSmallBlind}
                    isBigBlind={player.isBigBlind}
                    showCards={isMe || game.phase === 'showdown'}
                    handResult={showdownMap[player.id]}
                    timer={playerTimer}
                    compact={total > 5}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* My cards + action panel (bottom) */}
        <div className="border-t border-white/5 bg-black/60 px-4 py-3 space-y-3 z-10">
          {myPlayer && (
            <>
              {/* My hole cards (larger display at bottom) */}
              {myPlayer.holeCards?.length > 0 && (
                <div className="flex items-center justify-center gap-3">
                  <CardRow
                    cards={myPlayer.holeCards.filter(c => !c.hidden)}
                    size="lg"
                    animate
                  />
                  {myPlayer.folded && (
                    <span className="text-red-400/60 text-sm italic">folded</span>
                  )}
                </div>
              )}

              {/* Action buttons — only shown on my turn */}
              {isMyTurn && !myPlayer.folded && !myPlayer.allIn && (
                <ActionPanel
                  player={myPlayer}
                  currentBet={game.currentBet}
                  minRaise={game.minRaise}
                  pot={game.pot}
                  onAction={onAction}
                  disabled={!isMyTurn}
                />
              )}

              {!isMyTurn && !myPlayer.folded && !myPlayer.allIn && game.phase !== 'showdown' && game.phase !== 'handEnd' && (
                <div className="text-center text-white/30 text-sm">
                  Waiting for other players...
                </div>
              )}

              {myPlayer.allIn && !myPlayer.folded && (
                <div className="text-center text-orange-400 font-bold text-sm">
                  ALL-IN — waiting for showdown
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chat sidebar */}
      {showChat && (
        <div className="w-72 flex-shrink-0 flex flex-col border-l border-white/10">
          <ChatSidebar
            chat={chat}
            onChat={onChat}
            onClose={() => setShowChat(false)}
          />
        </div>
      )}

      {/* Hand result overlay */}
      {handResult && handResult.winners && (
        <HandResultOverlay winners={handResult.winners} players={game.players} />
      )}

      {/* Game over overlay */}
      {gameOver && (
        <GameOverOverlay winner={gameOver} playerId={playerId} onLeave={onLeave} />
      )}
    </div>
  );
}

function HandResultOverlay({ winners, players }) {
  // Group by player for display
  const byPlayer = {};
  winners.forEach(w => {
    if (!byPlayer[w.playerId]) byPlayer[w.playerId] = { ...w, total: 0 };
    byPlayer[w.playerId].total += w.amount;
  });

  return (
    <div className="absolute inset-0 flex items-end justify-center pb-36 pointer-events-none z-30">
      <div className="bg-black/80 backdrop-blur rounded-2xl px-6 py-4 border border-amber-500/30 shadow-2xl space-y-2 animate-fade-in">
        <h3 className="text-amber-400 font-bold text-center text-sm uppercase tracking-widest">Hand Result</h3>
        {Object.values(byPlayer).map((w) => {
          const player = players.find(p => p.id === w.playerId);
          return (
            <div key={w.playerId} className="flex items-center gap-3 text-sm">
              <span className="font-bold text-white">{player?.name || 'Player'}</span>
              <span className="text-white/50">wins</span>
              <span className="text-green-400 font-bold">+{w.total.toLocaleString()}</span>
              {w.handName && w.handName !== 'Last player standing' && (
                <span className="text-amber-300 text-xs italic">({w.handName})</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GameOverOverlay({ winner, playerId, onLeave }) {
  const isWinner = winner.winnerId === playerId;
  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40">
      <div className="bg-gray-900 rounded-3xl p-10 border border-amber-500/30 shadow-2xl text-center space-y-4 animate-fade-in">
        <div className="text-6xl">{isWinner ? '🏆' : '💸'}</div>
        <h2 className="text-3xl font-bold text-amber-400">
          {isWinner ? 'You Win!' : 'Game Over'}
        </h2>
        <p className="text-white/70">
          {isWinner
            ? 'Congratulations, you\'re the last player standing!'
            : `${winner.winnerName} wins the game!`}
        </p>
        <button className="btn-primary px-8 py-3 text-lg" onClick={onLeave}>
          Return to Lobby
        </button>
      </div>
    </div>
  );
}
