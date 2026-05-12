const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const RED_SUITS = new Set(['hearts', 'diamonds']);

// Small single card for community / hand display
export function Card({ card, index = 0, size = 'md', animate = false }) {
  const sizeClasses = {
    sm: 'w-8 h-12 text-xs',
    md: 'w-12 h-16 text-sm',
    lg: 'w-16 h-24 text-base',
  };

  if (!card || card.hidden) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-md flex items-center justify-center
          bg-card-back border border-blue-800 shadow-md select-none
          ${animate ? `animate-deal-in deal-delay-${Math.min(index, 4)}` : ''}`}
      >
        <div className="text-blue-600 text-lg opacity-60">♦</div>
      </div>
    );
  }

  const symbol = SUIT_SYMBOLS[card.suit] || '?';
  const isRed = RED_SUITS.has(card.suit);

  return (
    <div
      className={`${sizeClasses[size]} rounded-md bg-white border border-gray-200 shadow-md
        flex flex-col items-start justify-between p-1 select-none font-bold
        ${isRed ? 'text-red-600' : 'text-gray-900'}
        ${animate ? `animate-deal-in deal-delay-${Math.min(index, 4)}` : ''}`}
    >
      <div className="leading-none text-[0.65em]">{card.rank}</div>
      <div className="w-full text-center text-[1.1em] leading-none">{symbol}</div>
      <div className="leading-none text-[0.65em] self-end rotate-180">{card.rank}</div>
    </div>
  );
}

// A horizontal row of cards
export function CardRow({ cards = [], size = 'md', animate = false, emptySlots = 0 }) {
  const total = cards.length + emptySlots;
  return (
    <div className="flex gap-1.5 items-center justify-center flex-wrap">
      {cards.map((card, i) => (
        <Card key={i} card={card} index={i} size={size} animate={animate} />
      ))}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className={`${size === 'lg' ? 'w-16 h-24' : size === 'sm' ? 'w-8 h-12' : 'w-12 h-16'}
            rounded-md border-2 border-dashed border-white/15`}
        />
      ))}
    </div>
  );
}
