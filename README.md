# Real-Time Notification System

A full-stack notification app built with:

- Backend: Node.js, Express, WebSockets (`ws`)
- Frontend: React, Vite, `lucide-react`
- Package manager: `pnpm`

## Features

- WebSocket connection between the React client and Express server
- Automatic server broadcast every 10 seconds
- Toast notifications in the UI for incoming messages
- Real-time active client count tracking
- Graceful reconnect handling on the client
- Production build served by the Express backend

## Run

Install dependencies:

```bash
pnpm install
```

Start the frontend and backend in development:

```bash
pnpm dev
```

- React client: `http://localhost:5173`
- Express/WebSocket server: `http://localhost:3001`

Build the frontend:

```bash
pnpm build
```

Serve the built app from Express:

```bash
pnpm start
```
