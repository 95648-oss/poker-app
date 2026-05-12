import { Card } from './Card';

const PHASE_LABELS = {
  preflop: 'Pre-Flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
  handEnd: 'Hand Over',
};

export default function CommunityCards({ communityCards = [], pot = 0, phase }) {
  const empty = 5 - communityCards.length;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phase label */}
      <div className="text-xs text-white/40 uppercase tracking-widest font-semibold">
        {PHASE_LABELS[phase] || phase}
      </div>

      {/* Community cards */}
      <div className="flex gap-2 items-center">
        {communityCards.map((card, i) => (
          <Card key={i} card={card} index={i} size="lg" animate />
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-16 h-24 rounded-md border-2 border-dashed border-white/10"
          />
        ))}
      </div>

      {/* Pot */}
      {pot > 0 && (
        <div className="flex items-center gap-2 bg-black/40 rounded-full px-4 py-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />
          <span className="text-amber-300 font-bold">
            Pot: {pot.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
