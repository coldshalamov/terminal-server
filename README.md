# Terminal Server - Quick Start Guide

## Bottom Line

Use **Node.js + Express + Socket.io** for backend, **React + xterm.js** for frontend, and **Node.js + node-pty** for local connector. Deploy to Render.com using Docker. This stack is battle-tested, has excellent WebSocket support, and fits Render.com's infrastructure perfectly.

## Technology Stack Summary

| Component | Technology | Why |
|-----------|------------|-----|
| Backend | Node.js 20 + Express + Socket.io | Render.com native support, robust WebSocket handling |
| Frontend | React 18 + xterm.js + Tailwind | Industry-standard terminal emulator, GPU-accelerated |
| Connector | Node.js + node-pty | Cross-platform PTY, same ecosystem as backend |
| Protocol | WebSocket (Socket.io) | Bidirectional, auto-reconnect, binary data |
| Auth | JWT (HS256) | Simple, stateless, works with Socket.io |
| Deployment | Docker on Render.com | Containerized, reproducible builds |

## Directory Structure Overview

```
Terminal Server/
├── server/               # Backend (Render.com deployment)
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/       # Express routes
│   │   ├── socket/       # WebSocket handlers
│   │   ├── auth/         # JWT logic
│   │   └── storage/      # Session storage (memory/Redis)
│   ├── Dockerfile
│   └── render.yaml
├── web/                  # Frontend (served from backend)
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   └── package.json
├── connector/            # Local connector
│   ├── src/
│   │   ├── pty/          # PTY management
│   │   ├── socket/       # WebSocket client
│   │   └── cli/          # CLI interface
│   └── package.json
├── ARCHITECTURE.md       # Full architecture document
├── SUCCESS_CRITERIA.md   # Success criteria
└── README.md             # This file
```

## Data Flow - Simplified

```
Web Browser
  ↓ (keydown)
xterm.js → WebSocket
  ↓ (input)
Render Server → WebSocket
  ↓ (input)
Local Connector → PTY
  ↓ (stdout)
Local Machine Shell
  ↓ (output)
PTY → Local Connector → WebSocket
  ↓ (data)
Render Server → WebSocket
  ↓ (data)
xterm.js.write()
```

## Key Components - 60-Second Overview

### Backend (server/)
- **Express**: HTTP server for session creation API
- **Socket.io**: WebSocket server for terminal I/O
- **Rooms**: Map session_id to web client + connector
- **JWT**: Authenticate all connections

### Frontend (web/)
- **xterm.js**: Renders terminal with full ANSI support
- **Socket.io Client**: Connects to backend, sends/receives terminal data
- **React**: Manages UI state (connected/disconnected, prompts)

### Connector (connector/)
- **node-pty**: Spawns local shell, captures I/O
- **Socket.io Client**: Connects to backend with JWT, bridges PTY to WebSocket
- **CLI**: Simple interface to start with session token

## WebSocket Events

### Web Client ↔ Server
```javascript
// Web → Server
socket.emit('terminal:input', buffer);        // User keystrokes
socket.emit('terminal:resize', {cols, rows}); // Resize event

// Server → Web
socket.on('terminal:data', buffer);          // PTY output
socket.on('terminal:status', {status, msg});  // Connection status
```

### Connector ↔ Server
```javascript
// Connector → Server
socket.emit('terminal:data', buffer);         // PTY output
socket.emit('terminal:status', {status});     // PTY ready/closed

// Server → Connector
socket.on('terminal:input', buffer);         // User keystrokes
socket.on('terminal:resize', {cols, rows});  // Resize from web
```

## Quick Implementation Order

### Day 1: Backend Core (2-3 hours)
```bash
cd server
npm init -y
npm install express socket.io jsonwebtoken uuid @types/node typescript
# Implement: JWT auth, Express routes, Socket.io server
```

### Day 2: Connector (2-3 hours)
```bash
cd connector
npm init -y
npm install node-pty socket.io-client commander
# Implement: PTY spawn, Socket.io client, CLI
```

### Day 3: Frontend (2-3 hours)
```bash
cd web
npm create vite@latest . -- --template react-ts
npm install xterm xterm-addon-fit socket.io-client tailwindcss
# Implement: xterm.js wrapper, React UI, Socket.io client
```

### Day 4: Integration (3-4 hours)
- Connect all three components
- Test full flow: web → server → connector → shell → web
- Debug WebSocket routing and room management

### Day 5: Deployment (2-3 hours)
- Create Dockerfile
- Push to GitHub
- Deploy to Render.com
- Test production instance

## Critical Dependencies

```json
{
  "server": {
    "express": "^4.18.2",
    "socket.io": "^4.7.4",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^9.0.0"
  },
  "web": {
    "xterm": "^5.3.0",
    "xterm-addon-fit": "^0.8.0",
    "socket.io-client": "^4.7.4",
    "react": "^18.2.0"
  },
  "connector": {
    "node-pty": "^1.0.0",
    "socket.io-client": "^4.7.4",
    "commander": "^11.1.0"
  }
}
```

## Render.com Deployment

### Backend Service
- **Type**: Web Service
- **Runtime**: Docker
- **Dockerfile**:
  ```dockerfile
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  FROM node:20-alpine
  WORKDIR /app
  COPY --from=builder /app/package*.json ./
  RUN npm ci --production
  COPY --from=builder /app/dist ./dist
  EXPOSE 3000
  CMD ["node", "dist/index.js"]
  ```

### Environment Variables (Render Dashboard)
```bash
PORT=3000
JWT_SECRET=<generate with openssl rand -base64 32>
NODE_ENV=production
```

### Build Settings
- **Context**: `./server`
- **Dockerfile Path**: `Dockerfile`
- **Branch**: `main`

## Session Lifecycle

```
1. Web: POST /api/session → JWT token (session_id)
2. Web: Connect WebSocket with token → join room(session_id)
3. Local: terminal-connector --token <jwt> --url <server>
4. Connector: POST /api/connect → validate token, map to room
5. Connector: Connect WebSocket with token → join room(session_id)
6. Backend: Notify web "terminal:ready"
7. Web: Initialize xterm.js, show prompt
8. User types → WebSocket → Connector → PTY → Shell
9. Shell output → PTY → Connector → WebSocket → Web → xterm.js
10. Session active!
```

## Security Checklist

- [ ] All connections require valid JWT
- [ ] JWT expires after 24 hours
- [ ] Sessions isolated by UUID (Socket.io rooms)
- [ ] TLS enforced (HTTPS/WSS on Render.com)
- [ ] Input validation (UUID format, shell paths)
- [ ] Rate limiting on session creation (10 req/min)
- [ ] Session cleanup after 1 hour inactivity

## Testing Commands

### Backend
```bash
# Create session
curl -X POST https://your-app.onrender.com/api/session
# Response: {"token":"eyJ...","sessionId":"abc-123-def-456"}

# Health check
curl https://your-app.onrender.com/health
```

### Connector
```bash
# Start connector
cd connector
node dist/index.js --url https://your-app.onrender.com --token eyJ...

# With custom shell
node dist/index.js --url https://your-app.onrender.com --token eyJ... --shell /bin/zsh
```

### Frontend
```bash
# Dev server
cd web
npm run dev
# Open http://localhost:5173

# Build for production
npm run build
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| PTY spawn fails | Verify shell path: `which bash`, ensure executable permissions |
| WebSocket disconnects | Check Render.com logs, verify JWT token validity |
| Terminal looks wrong | Ensure TERM env var set (xterm-256color), check xterm-addon-fit |
| Mobile layout broken | Add viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0">` |
| CORS errors | Serve frontend from backend (Option 1) or configure CORS (Option 2) |

## Next Steps

1. **Read full ARCHITECTURE.md** for detailed design
2. **Start with Phase 1** (Backend Core) - it's the foundation
3. **Build incrementally** - test each phase before moving on
4. **Use existing lucidity code** for escape sequence parsing if needed (advanced)
5. **Deploy early** - get on Render.com by Day 5 to catch deployment issues

## Time to First Terminal

With this architecture:
- **Day 3**: First working terminal (localhost)
- **Day 4**: Full integration with connector
- **Day 5**: Deployed and accessible on mobile
- **Day 7**: Production-ready with polish

## Questions?

Refer to ARCHITECTURE.md for:
- Detailed data flow diagrams
- Complete implementation plans
- Security considerations
- Performance optimizations
- Troubleshooting guide

**Happy building!** 🚀
