import { CardRow } from './Card';

function ChipStack({ chips }) {
  const formatted = chips >= 1000 ? `${(chips / 1000).toFixed(1)}k` : chips;
  return (
    <div className="flex items-center gap-1">
      <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-600 shadow-sm" />
      <span className="text-amber-300 font-bold text-xs">{formatted}</span>
    </div>
  );
}

export default function PlayerSeat({
  player,
  isMe,
  isActive,         // it's this player's turn
  isDealer,
  isSmallBlind,
  isBigBlind,
  showCards,        // show actual cards (only at showdown or for self)
  handResult,       // { handName } if showdown
  timer,
  compact = false,
}) {
  if (!player) return null;

  const isEliminated = player.chips === 0 && player.folded;
  const isFolded = player.folded;

  const cardCount = player.holeCards?.length || 0;

  const borderColor = isActive
    ? 'border-amber-400 animate-pulse-glow'
    : isMe
    ? 'border-blue-500/60'
    : 'border-white/10';

  return (
    <div
      className={`relative flex flex-col items-center gap-1
        transition-all duration-300
        ${isFolded && !isMe ? 'opacity-40' : ''}
        ${isEliminated ? 'opacity-20' : ''}`}
    >
      {/* Timer arc (shown when it's this player's active turn) */}
      {isActive && timer && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
          <div className={`text-xs font-bold px-2 py-0.5 rounded-full
            ${timer.timeLeft <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-gray-900'}`}>
            {timer.timeLeft}s
          </div>
        </div>
      )}

      {/* Hole cards */}
      {cardCount > 0 && (
        <div className={`transition-opacity duration-300 ${isFolded ? 'opacity-30' : ''}`}>
          <CardRow
            cards={player.holeCards}
            size={compact ? 'sm' : isMe ? 'lg' : 'sm'}
            animate={true}
          />
        </div>
      )}

      {/* Player info box */}
      <div
        className={`rounded-xl border-2 px-3 py-1.5 min-w-[90px] text-center
          ${borderColor}
          ${isActive ? 'bg-amber-500/10' : 'bg-black/50 backdrop-blur-sm'}
          transition-all duration-200`}
      >
        {/* Dealer / blind badges */}
        <div className="flex items-center justify-center gap-1 mb-0.5 min-h-[14px]">
          {isDealer && (
            <span className="text-[10px] bg-amber-500 text-gray-900 font-bold px-1 rounded">D</span>
          )}
          {isSmallBlind && (
            <span className="text-[10px] bg-blue-500 text-white font-bold px-1 rounded">SB</span>
          )}
          {isBigBlind && (
            <span className="text-[10px] bg-purple-500 text-white font-bold px-1 rounded">BB</span>
          )}
        </div>

        <div className="font-semibold text-xs truncate max-w-[80px]">
          {player.name}
          {isMe && <span className="text-white/30 ml-1 font-normal">(you)</span>}
        </div>

        <ChipStack chips={player.chips} />

        {player.bet > 0 && (
          <div className="text-xs text-green-400 mt-0.5">
            Bet: {player.bet}
          </div>
        )}

        {player.allIn && !player.folded && (
          <div className="text-[10px] text-orange-400 font-bold mt-0.5">ALL-IN</div>
        )}

        {isFolded && (
          <div className="text-[10px] text-red-400/80 mt-0.5">FOLDED</div>
        )}

        {/* Showdown hand name */}
        {handResult && !isFolded && (
          <div className="text-[10px] text-amber-300 mt-0.5 font-medium">
            {handResult}
          </div>
        )}
      </div>
    </div>
  );
}
