# Texas Hold'em Poker

A real-time multiplayer Texas Hold'em poker game.

## Features

- 2-6 players per table
- AI players to fill empty seats
- Spectator mode
- Sound effects
- Auto-fold on disconnect (30s timeout)
- Shareable room links

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + Vite
- **Backend:** Node.js + Express + Socket.io
- **Hosting:** Vercel (frontend) + Render (backend)

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Setup

1. Install dependencies:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

2. Start the server:

```bash
cd server
npm run dev
```

3. Start the client (in a new terminal):

```bash
cd client
npm run dev
```

4. Open http://localhost:5173 in your browser

## Deployment

### Backend (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repo
3. Set root directory to `server`
4. Build command: `npm install && npm run build`
5. Start command: `npm start`
6. Add environment variable `CLIENT_URL` with your Vercel frontend URL

### Frontend (Vercel)

1. Import project on Vercel
2. Set root directory to `client`
3. Add environment variable `VITE_SERVER_URL` with your Render backend URL
4. Deploy

## Game Rules

Standard Texas Hold'em rules apply:

1. Each player receives 2 hole cards
2. 5 community cards are dealt (flop, turn, river)
3. Make the best 5-card hand using any combination
4. Betting rounds occur before flop and after each community card deal
5. Best hand wins, or last player standing if others fold

## Hand Rankings (highest to lowest)

1. Royal Flush
2. Straight Flush
3. Four of a Kind
4. Full House
5. Flush
6. Straight
7. Three of a Kind
8. Two Pair
9. Pair
10. High Card
