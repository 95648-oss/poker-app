import { useState } from 'react';

export default function ActionPanel({ player, currentBet, minRaise, pot, onAction, disabled }) {
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showRaise, setShowRaise] = useState(false);

  if (!player || disabled) return null;

  const toCall = Math.max(0, Math.min(currentBet - (player.bet || 0), player.chips));
  const canCheck = toCall === 0;
  const canCall = toCall > 0 && toCall < player.chips;
  const canRaise = player.chips > toCall;

  // Minimum total bet for a raise (player's existing bet + amount needed to call + minRaise)
  const minNewBet = currentBet + (minRaise || 0);
  const maxNewBet = (player.bet || 0) + player.chips;

  const raiseMin = Math.min(minNewBet, maxNewBet);
  const raiseMax = maxNewBet;

  // Preset raise sizes
  const halfPot = Math.min(Math.floor((pot || 0) / 2), raiseMax);
  const fullPot = Math.min(pot || 0, raiseMax);
  const twoPot = Math.min((pot || 0) * 2, raiseMax);

  const handleRaiseToggle = () => {
    setShowRaise(v => !v);
    setRaiseAmount(raiseMin);
  };

  const handleRaise = () => {
    if (raiseAmount >= raiseMax) {
      onAction('allin');
    } else {
      onAction('raise', raiseAmount);
    }
    setShowRaise(false);
  };

  const handleAllIn = () => {
    onAction('allin');
    setShowRaise(false);
  };

  return (
    <div className="space-y-3">
      {/* Raise slider */}
      {showRaise && canRaise && (
        <div className="bg-black/40 rounded-2xl p-4 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Raise amount</span>
            <span className="text-amber-400 font-bold text-lg">{raiseAmount.toLocaleString()}</span>
          </div>

          <input
            type="range"
            min={raiseMin}
            max={raiseMax}
            step={Math.max(1, Math.floor(raiseMax / 100))}
            value={raiseAmount}
            onChange={e => setRaiseAmount(+e.target.value)}
            className="w-full accent-amber-400"
          />

          {/* Preset buttons */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: '½ Pot', val: halfPot },
              { label: 'Pot', val: fullPot },
              { label: '2× Pot', val: twoPot },
              { label: 'All-In', val: raiseMax },
            ].map(({ label, val }) => (
              <button
                key={label}
                className="text-xs btn-ghost py-1 px-2"
                onClick={() => setRaiseAmount(val)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => setShowRaise(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleRaise}>
              Raise to {raiseAmount >= raiseMax ? 'All-In' : raiseAmount.toLocaleString()}
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          className="btn btn-danger min-w-[90px]"
          onClick={() => onAction('fold')}
        >
          Fold
        </button>

        {canCheck && (
          <button
            className="btn bg-blue-600 hover:bg-blue-500 text-white min-w-[90px]"
            onClick={() => onAction('check')}
          >
            Check
          </button>
        )}

        {canCall && (
          <button
            className="btn bg-green-600 hover:bg-green-500 text-white min-w-[90px]"
            onClick={() => onAction('call')}
          >
            Call {toCall.toLocaleString()}
          </button>
        )}

        {canRaise && !showRaise && (
          <button
            className="btn bg-amber-500 hover:bg-amber-400 text-gray-900 min-w-[90px]"
            onClick={handleRaiseToggle}
          >
            Raise
          </button>
        )}

        {/* All-in shortcut if can't raise above minimum */}
        {player.chips > 0 && !showRaise && (
          <button
            className="btn bg-orange-600 hover:bg-orange-500 text-white min-w-[90px]"
            onClick={handleAllIn}
          >
            All-In ({player.chips.toLocaleString()})
          </button>
        )}
      </div>
    </div>
  );
}
