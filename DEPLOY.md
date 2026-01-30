# Poker Game Deployment Guide

## Current Status
- **Client (Frontend):** Deployed to Vercel at https://client-steel-psi-78.vercel.app
- **Server (Backend):** Needs to be deployed to a service that supports WebSockets

## Quick Local Testing

1. Start the server:
```bash
cd server
npm install
npm run dev
```

2. Start the client (optional - for local development):
```bash
cd client
npm install
npm run dev
```

3. Open http://localhost:5173 in your browser

## Deploy Server to Render (Free Tier)

### Option 1: Deploy from GitHub (Recommended)

1. Push this code to a GitHub repository
2. Go to https://render.com and sign up/log in
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Configure:
   - **Name:** poker-server
   - **Root Directory:** server
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Add `CLIENT_URL` = your Vercel frontend URL
6. Click "Create Web Service"
7. Copy the Render URL (e.g., https://poker-server-xxxx.onrender.com)

### Option 2: Deploy using Render Blueprint

1. Push code to GitHub
2. Add this to your repo root as `render.yaml`:
```yaml
services:
  - type: web
    name: poker-server
    env: node
    rootDir: server
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```
3. Go to Render Dashboard → New → Blueprint
4. Connect repo and deploy

## Update Client to Use Your Server

After deploying the server, update the Vercel environment variable:

1. Go to Vercel Dashboard → your poker-client project → Settings → Environment Variables
2. Add: `VITE_SERVER_URL` = `https://your-render-server-url.onrender.com`
3. Redeploy the client

Or update `.env.production` and redeploy:
```
VITE_SERVER_URL=https://your-render-server-url.onrender.com
```

## Alternative: Railway Deployment

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select your repo, set root directory to `server`
4. Add environment variable `CLIENT_URL`
5. Deploy!

## Playing the Game

1. Share the Vercel URL with friends: https://client-steel-psi-78.vercel.app?room=YOUR_ROOM_CODE
2. Everyone enters the same room code
3. Click "Add AI" to add computer players
4. Click "Start Game" when ready!
