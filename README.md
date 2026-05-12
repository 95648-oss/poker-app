# Texas Hold'em Poker

A full multiplayer Texas Hold'em poker app. All game state lives on the server — clients never see other players' hole cards.

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express + Socket.io
- **State:** In-memory, server-authoritative

## Quick Start

### 1. Install dependencies

```bash
# From the project root
npm run install:all
```

Or manually:
```bash
npm install
npm install --prefix server
npm install --prefix client
```

### 2. Run (both servers)

```bash
npm run dev
```

This starts:
- Server on **http://localhost:3001**
- Client on **http://localhost:5173** (proxies Socket.io to the server)

### 3. Play

1. Open **http://localhost:5173** in your browser
2. Enter your name and click **Create New Room**
3. Share the 6-character invite code with friends
4. Friends open the same URL, enter the code, and join
5. Host clicks **Start Game** once 2+ players are ready

## How It Works

### Security
- Deck and all hole cards live only on the server
- `getPublicState()` strips other players' hole cards before sending — each player's Socket.io emission is individually filtered
- The server validates every action (correct turn, legal bet size, etc.)

### Game Flow
1. Host creates room → gets invite code
2. Players join lobby → host configures settings
3. Host starts game → hole cards dealt, blinds posted
4. Betting rounds: pre-flop → flop → turn → river
5. Showdown: best hand wins; side pots handled for all-in situations
6. Eliminated players (0 chips) are removed; last player with chips wins

### Reconnection
Player IDs are stored in `localStorage`. If you refresh or temporarily disconnect, re-entering the same room code auto-restores your seat.

### Turn Timer
Each player has 30 seconds to act. On timeout, the server auto-folds (or auto-checks if no bet is pending).

## Project Structure

```
poker/
├── server/
│   └── src/
│       ├── index.js          # Express + Socket.io server, room management
│       ├── gameEngine.js     # Game state machine, betting logic, side pots
│       └── handEvaluator.js  # 5-card & 7-card hand evaluation
└── client/
    └── src/
        ├── App.jsx           # Root — socket listeners, screen routing
        ├── socket.js         # Shared Socket.io client instance
        ├── pages/
        │   ├── Home.jsx      # Landing: create/join room
        │   ├── Lobby.jsx     # Pre-game lobby
        │   └── Table.jsx     # Live poker table
        └── components/
            ├── Card.jsx          # Card & CardRow components
            ├── PlayerSeat.jsx    # Per-player seat with chips/cards/badges
            ├── ActionPanel.jsx   # Fold/Check/Call/Raise controls
            ├── CommunityCards.jsx # Board cards + pot
            └── ChatSidebar.jsx   # Room chat
```
