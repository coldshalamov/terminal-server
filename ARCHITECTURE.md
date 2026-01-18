# Terminal Server Architecture

## Executive Summary

A distributed terminal system that allows remote command execution from any web browser, with a terminal interface that exactly matches the local terminal experience. The system consists of three main components:

1. **Backend Server** (Render.com): WebSocket relay and session management
2. **Web Frontend**: Terminal emulation with xterm.js
3. **Local Connector**: PTY bridge running on user's machine

---

## Technology Stack

### Backend (Render.com)
- **Runtime**: Node.js 20.x LTS
- **Framework**: Express.js for HTTP + Socket.io for WebSocket
- **Reasoning**: Render.com has native Node.js support, Socket.io provides robust WebSocket handling with automatic reconnection, rooms, and binary data support.

### Frontend (Web)
- **Framework**: React 18 with TypeScript
- **Terminal Emulator**: xterm.js + xterm-addon-fit (responsive)
- **Styling**: Tailwind CSS
- **Reasoning**: xterm.js is the industry standard (VS Code, GitLab, Hyper). Full ANSI/color support, GPU-accelerated rendering.

### Local Connector
- **Runtime**: Node.js 20.x LTS
- **PTY Library**: node-pty
- **WebSocket Client**: socket.io-client
- **Reasoning**: node-pty is battle-tested (VS Code), works on all platforms. Single binary distribution via pkg or nexe.

### Communication Protocol
- **Transport**: WebSocket over TLS (Socket.io)
- **Encoding**: Binary data for terminal I/O, JSON for control messages
- **Reconnection**: Automatic with exponential backoff (Socket.io built-in)

### Authentication
- **Mechanism**: JWT tokens signed with HS256
- **Storage**: Redis on Render.com (or in-memory for MVP)
- **Session Management**: Room-based mapping (session_id ↔ connector_id)

---

## System Architecture

### High-Level Diagram

```
┌─────────────────┐         WebSocket (TLS)        ┌─────────────────┐
│   Web Browser   │◄──────────────────────────────►│  Render Server  │
│                 │                                │  (Express +     │
│  - xterm.js     │   Session ID (JWT Token)       │   Socket.io)    │
│  - React UI     │◄──────────────────────────────►│                 │
└─────────────────┘                                └────────┬────────┘
                                                          │
                                                          │ WebSocket (TLS)
                                                          │ Room: session_id
                                                          │
                                                    ┌─────▼─────┐
                                                    │  Redis    │
                                                    │ (Optional)│
                                                    └───────────┘

... Internet ...

┌─────────────────┐         WebSocket (TLS)        ┌─────────────────┐
│  Local Machine  │◄──────────────────────────────►│  Local          │
│                 │   Session ID (JWT Token)       │  Connector      │
│  - PTY Process  │◄──────────────────────────────►│  (Node.js +     │
│  - Terminal Emu │                                │   node-pty)     │
└─────────────────┘                                └─────────────────┘
```

### Data Flow

#### 1. Terminal Output Flow (Local → Web)
```
Local Shell Process (bash/zsh/...)
  ↓ stdout/stderr
Local Connector (node-pty)
  ↓ Terminal data (ANSI escape sequences, colors)
WebSocket Client → Socket.io
  ↓ Binary payload
Render Server (Socket.io)
  ↓ Route to room
WebSocket → Web Client
  ↓ xterm.js
Browser Terminal UI
```

#### 2. User Input Flow (Web → Local)
```
User Keyboard in Browser
  ↓ keydown/keypress events
Web Client (xterm.js)
  ↓ Input data
WebSocket → Socket.io
  ↓ Input payload
Render Server (Socket.io)
  ↓ Route to connector's room
WebSocket → Local Connector
  ↓ Write to PTY
Local Shell Process
```

#### 3. Session Initialization Flow
```
Web Browser
  ↓ Request session token
Render Server (POST /api/session)
  ↓ Generate JWT with session_id
Web Browser ← JWT Token
  ↓ Connect WebSocket with token
WebSocket Client ←─┘
Render Server (Socket.io)
  ↓ Verify JWT, join room
Waiting for connector...

Local Connector
  ↓ Request to join session (POST /api/connect with JWT)
Render Server (POST /api/connect)
  ↓ Verify JWT, map connector to room
Local Connector ←──┘
  ↓ Connect WebSocket with token
WebSocket Client ←──┘
Render Server (Socket.io)
  ↓ PTY ready, notify web client
Web Client ←─┘
  ↓ Initialize xterm.js
Terminal Session Active!
```

---

## Component Breakdown

### Backend Server (Render.com)

#### Directory Structure
```
server/
├── src/
│   ├── index.ts              # Entry point, Express + Socket.io setup
│   ├── routes/
│   │   ├── session.ts        # POST /api/session (create session)
│   │   └── connect.ts        # POST /api/connect (connector registration)
│   ├── socket/
│   │   ├── web-handler.ts    # WebSocket handling for web clients
│   │   ├── connector-handler.ts # WebSocket handling for local connectors
│   │   └── rooms.ts          # Room management (session_id ↔ connector_id)
│   ├── auth/
│   │   ├── jwt.ts            # JWT generation and verification
│   │   └── middleware.ts     # Express auth middleware
│   ├── storage/
│   │   ├── memory.ts         # In-memory session store (MVP)
│   │   └── redis.ts          # Redis session store (production)
│   └── config.ts             # Environment configuration
├── package.json
├── tsconfig.json
├── Dockerfile                # Render.com deployment
└── render.yaml                # Render.com service definition
```

#### Key Modules

**`src/index.ts`**
- Express server setup
- Socket.io server setup
- Route registration
- Error handling middleware

**`src/routes/session.ts`**
- POST /api/session
- Generate JWT with unique session_id
- Response: `{ token: "jwt", sessionId: "uuid" }`

**`src/routes/connect.ts`**
- POST /api/connect
- Verify JWT, ensure session exists
- Map connector_id to session_id
- Response: `{ success: true, serverUrl: "wss://..." }`

**`src/socket/rooms.ts`**
- Track active sessions
- Map: `session_id → { webClient: Socket | null, connector: Socket | null }`
- Handle connection/disconnection events
- Manage terminal state buffer (for reconnection)

**`src/socket/web-handler.ts`**
- Handle WebSocket connection from web client
- Verify JWT token
- Join session room
- Forward PTY data to web client
- Forward user input to connector
- Handle resize events from xterm.js

**`src/socket/connector-handler.ts`**
- Handle WebSocket connection from local connector
- Verify JWT token
- Join session room
- Forward PTY output to web client
- Forward web input to PTY
- Handle PTY spawn/kill
- Manage PTY size

**`src/auth/jwt.ts`**
- JWT signing/verification with HS256
- Token payload: `{ sessionId: string, type: "web" | "connector", exp: number }`
- Secret key from environment variable

#### Dependencies
```json
{
  "express": "^4.18.2",
  "socket.io": "^4.7.4",
  "jsonwebtoken": "^9.0.2",
  "dotenv": "^16.3.1",
  "uuid": "^9.0.0",
  "@types/express": "^4.17.21",
  "@types/node": "^20.10.0",
  "typescript": "^5.3.3"
}
```

#### Environment Variables
```bash
PORT=3000
JWT_SECRET=your-secret-key-here
NODE_ENV=production
# Optional: Redis
REDIS_URL=redis://your-redis-url
```

---

### Web Frontend

#### Directory Structure
```
web/
├── src/
│   ├── App.tsx               # Main React component
│   ├── components/
│   │   ├── Terminal.tsx      # xterm.js wrapper
│   │   ├── AuthPrompt.tsx    # Session ID entry / QR code
│   │   └── StatusIndicator.tsx # Connection status
│   ├── hooks/
│   │   ├── useSocket.ts      # Socket.io connection hook
│   │   └── useTerminal.ts    # Terminal management hook
│   ├── utils/
│   │   ├── api.ts            # API calls (session creation)
│   │   └── token.ts          # Token storage (localStorage)
│   └── index.tsx             # Entry point
├── public/
│   └── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts            # Vite build config
└── Dockerfile                # Render.com deployment (or serve from backend)
```

#### Key Components

**`src/components/Terminal.tsx`**
- xterm.js instance management
- Handle keyboard input → WebSocket
- Handle WebSocket data → xterm.js.write()
- Handle resize events
- Dispose on unmount

**`src/App.tsx`**
- Session state management (creating/loading)
- Connection status UI
- Show terminal when connected
- Show prompt when disconnected

**`src/hooks/useSocket.ts`**
- Socket.io connection management
- Auto-reconnection logic
- Event listeners for terminal data, status changes

**`src/utils/api.ts`**
- `createSession()`: POST to /api/session
- `validateSession(token)`: GET to /api/session/validate

#### Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "xterm": "^5.3.0",
  "xterm-addon-fit": "^0.8.0",
  "socket.io-client": "^4.7.4",
  "axios": "^1.6.2",
  "tailwindcss": "^3.3.6"
}
```

---

### Local Connector

#### Directory Structure
```
connector/
├── src/
│   ├── index.ts              # Entry point
│   ├── pty/
│   │   └── manager.ts        # node-pty spawn/kill/resize/write
│   ├── socket/
│   │   └── client.ts         # Socket.io client wrapper
│   ├── cli/
│   │   └── args.ts           # CLI argument parsing
│   └── config.ts             # Configuration (shell, env vars)
├── package.json
├── tsconfig.json
└── Dockerfile                # For building standalone binary
```

#### Key Modules

**`src/index.ts`**
- Parse CLI arguments (session token, server URL, optional shell)
- Initialize Socket.io client
- Initialize PTY manager
- Handle graceful shutdown

**`src/pty/manager.ts`**
- Spawn PTY with user's shell (default: /bin/bash or shell env var)
- Write input to PTY
- Read output from PTY
- Handle PTY resize (cols, rows)
- Kill PTY on disconnect

**`src/socket/client.ts`**
- Connect to Render server with JWT token
- Emit PTY output events
- Listen for input events
- Listen for resize events
- Emit connection status

#### CLI Usage
```bash
# Basic usage (prompts for session URL and token)
terminal-connector

# Direct connection
terminal-connector --url https://your-server.onrender.com --token eyJhbGciOiJIUzI1NiIs...

# Custom shell
terminal-connector --shell /bin/zsh

# Specify environment variables
terminal-connector --env "TERM=xterm-256color" --env "LANG=en_US.UTF-8"
```

#### Dependencies
```json
{
  "node-pty": "^1.0.0",
  "socket.io-client": "^4.7.4",
  "commander": "^11.1.0",
  "dotenv": "^16.3.1"
}
```

---

## Deployment Structure

### Render.com Configuration

#### Service 1: Backend Server (Web Service)
**Type**: Web Service
**Runtime**: Docker
**Dockerfile**: server/Dockerfile

**Dockerfile**:
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

**Environment Variables** (configured in Render dashboard):
- `PORT`: 3000
- `JWT_SECRET`: generated via `openssl rand -base64 32`
- `NODE_ENV`: production

**Build Command**: `docker build -t terminal-server .`
**Start Command**: `node dist/index.js`

#### Service 2: Frontend (Static Site or Same Backend)
**Option 1 (Recommended)**: Serve static files from backend
- Build React app and copy to server/public
- Express serves `/` → index.html, `/api/*` → API routes

**Option 2**: Separate Render Static Site
- Build Vite app, deploy to `render.com/your-app`
- Requires CORS configuration on backend

**Recommended**: Option 1 for simplicity and CORS avoidance.

#### Service 3: Redis (Optional)
**Type**: Redis
- Only needed for production with multiple backend replicas
- For MVP: Use in-memory storage (works with single replica)

---

## Security Considerations

### Authentication
1. **JWT Tokens**: All connections require valid JWT
   - Web client token: includes sessionId, type="web"
   - Connector token: includes sessionId, type="connector"
   - Expiration: 24 hours (configurable)

2. **Session Isolation**: Each session has unique UUID
   - Cannot access other sessions' data
   - Socket.io rooms enforce isolation

3. **Token Validation**: On every WebSocket connection and API call

### Transport Security
1. **TLS Required**: All connections over HTTPS/WSS
   - Render.com provides automatic SSL certificates
   - Reject non-TLS connections

2. **Input Sanitization**:
   - Validate session IDs (UUID format)
   - Validate shell paths (prevent directory traversal)
   - Limit PTY size (prevent resource exhaustion)

### Rate Limiting
1. **Connection Rate Limit**: Prevent abuse
   - Express-rate-limit on session creation endpoint
   - Max 10 requests/minute per IP

2. **Session Expiration**:
   - Auto-terminate inactive sessions after 1 hour
   - Cleanup on server restart

---

## Implementation Plan

### Phase 1: Core Backend (Day 1)
**Goal**: Deployable backend with Socket.io and JWT auth

1. Initialize Node.js project (server/)
   - Install dependencies (express, socket.io, jsonwebtoken, uuid)
   - Setup TypeScript, tsconfig.json

2. Implement authentication module
   - JWT generation/verification (src/auth/jwt.ts)
   - Express middleware (src/auth/middleware.ts)

3. Setup Express server with Socket.io
   - Basic server setup (src/index.ts)
   - Health check endpoint (GET /health)

4. Implement session creation API
   - POST /api/session (src/routes/session.ts)
   - Generate unique session IDs

5. Add room management
   - Session tracking (src/socket/rooms.ts)
   - Join/leave logic

6. **Verification**:
   - Test session creation with curl
   - Verify JWT token format
   - Ensure server starts without errors

---

### Phase 2: Local Connector (Day 2)
**Goal**: Connector that can spawn PTY and connect to server

1. Initialize connector project (connector/)
   - Install node-pty, socket.io-client, commander

2. Implement PTY manager
   - Spawn PTY with user's shell (src/pty/manager.ts)
   - Handle stdout/stderr → WebSocket emit
   - Handle WebSocket → PTY stdin
   - Handle resize events

3. Implement Socket.io client
   - Connect with JWT token (src/socket/client.ts)
   - Emit PTY output
   - Listen for input

4. Create CLI interface
   - Parse arguments (src/cli/args.ts)
   - Help text and validation

5. **Verification**:
   - Manually test: spawn PTY, write to stdin, read stdout
   - Test WebSocket connection to backend
   - Test resize handling

---

### Phase 3: Web Frontend (Day 3)
**Goal**: Web terminal UI with xterm.js and Socket.io

1. Initialize React project (web/)
   - Install xterm, socket.io-client, tailwindcss
   - Setup Vite for dev/build

2. Implement Terminal component
   - xterm.js wrapper (src/components/Terminal.tsx)
   - Handle keyboard input → WebSocket
   - Handle WebSocket data → xterm.js
   - Fit addon for responsiveness

3. Implement App component
   - Session creation UI (src/App.tsx)
   - Connection status display
   - Show/hide terminal based on state

4. Create hooks
   - Socket connection management (src/hooks/useSocket.ts)
   - Terminal lifecycle (src/hooks/useTerminal.ts)

5. **Verification**:
   - Open localhost:5173
   - Create session, see terminal UI
   - Type in terminal (expect no output yet)

---

### Phase 4: End-to-End Integration (Day 4)
**Goal**: Complete flow: web → server → local → output → web

1. Integrate all components
   - Ensure backend routes and WebSocket handlers work together
   - Test connector registration (POST /api/connect)
   - Test room mapping (web ↔ connector)

2. Implement terminal data flow
   - Connector: PTY output → WebSocket
   - Backend: Forward connector data → web client
   - Web: xterm.js.write() received data

3. Implement user input flow
   - Web: Keyboard → WebSocket
   - Backend: Forward input → connector
   - Connector: Write to PTY

4. Test real-time scenarios
   - Type `ls`, see output
   - Run interactive commands (`vim`, `htop`)
   - Test ANSI colors and formatting
   - Test resize (mobile vs desktop)

5. **Verification**:
   - Full integration test: web → server → local
   - Test on actual mobile device
   - Test with various shells (bash, zsh)

---

### Phase 5: Deployment to Render.com (Day 5)
**Goal**: Deploy and verify on production

1. Prepare Dockerfiles
   - Backend Dockerfile (server/Dockerfile)
   - Build and test locally

2. Push to GitHub
   - Ensure all code committed
   - Add .gitignore for node_modules

3. Connect repository to Render.com
   - Create new web service
   - Select GitHub repository
   - Configure runtime: Docker

4. Set environment variables
   - JWT_SECRET (generate strong secret)
   - PORT=3000
   - NODE_ENV=production

5. Trigger deployment
   - Wait for build to complete
   - Check render.com logs for errors

6. Test deployed version
   - Access https://your-app.onrender.com
   - Create session
   - Run connector locally with deployed URL
   - Verify full functionality

7. **Verification**:
   - All success criteria from SUCCESS_CRITERIA.md
   - Manual testing on mobile and desktop
   - Test reconnection scenarios

---

### Phase 6: Polish & Edge Cases (Day 6-7)
**Goal**: Handle edge cases and improve UX

1. **Error Handling**:
   - Disconnection detection
   - Reconnection logic (exponential backoff)
   - PTY crash recovery
   - Invalid JWT error messages

2. **Session Persistence**:
   - Terminal buffer for reconnection
   - Restore terminal state on reconnect

3. **Security Hardening**:
   - Rate limiting (express-rate-limit)
   - Input validation
   - CORS configuration (if needed)

4. **UX Improvements**:
   - Copy/paste support
   - Scrollback buffer
   - Font selection
   - Theme configuration

5. **Documentation**:
   - README with setup instructions
   - Connector usage guide
   - Deployment guide

6. **Final Testing**:
   - Agent verification (per SUCCESS_CRITERIA.md)
   - Fix any remaining issues
   - Performance testing

---

## Data Structures

### JWT Token Payload
```typescript
interface JWTPayload {
  sessionId: string;   // UUID
  type: "web" | "connector";
  iat: number;         // Issued at
  exp: number;         // Expiration
}
```

### Session State (Backend)
```typescript
interface Session {
  sessionId: string;
  webClient: Socket | null;
  connector: Socket | null;
  createdAt: number;
  lastActivity: number;
  terminalBuffer?: Buffer; // For reconnection
}
```

### WebSocket Events

#### Server → Web Client
- `terminal:data` (binary): PTY output
- `terminal:status` (json): `{ status: "connected" | "disconnected" | "error", message?: string }`

#### Web Client → Server
- `terminal:input` (binary): User keystrokes
- `terminal:resize` (json): `{ cols: number, rows: number }`

#### Server → Connector
- `terminal:input` (binary): User keystrokes
- `terminal:resize` (json): `{ cols: number, rows: number }`
- `terminal:close`: Request to close PTY

#### Connector → Server
- `terminal:data` (binary): PTY output
- `terminal:status` (json): `{ status: "ready" | "closed" | "error", message?: string }`

---

## Performance Considerations

### Terminal Data Throttling
- PTY output can be bursty (e.g., `cat largefile`)
- Use small buffer and send in chunks to prevent memory issues
- Consider batching if data rate exceeds 1MB/s

### Binary Data Handling
- Use Socket.io binary support for terminal data
- Avoid JSON encoding for large binary payloads

### Connection Limits
- Maximum sessions: 1000 (configurable)
- Session timeout: 1 hour inactivity
- PTY timeout: Auto-kill if no connector for 5 minutes

---

## Testing Strategy

### Unit Tests
- JWT token generation/verification
- Session ID validation
- CLI argument parsing

### Integration Tests
- Session creation → connector registration → terminal flow
- Reconnection scenarios
- Error handling (invalid tokens, disconnection)

### Manual Testing Checklist
- [ ] Create session from web
- [ ] Connect local connector with token
- [ ] See prompt in web terminal
- [ ] Run `ls`, see output
- [ ] Run interactive command (e.g., `top`)
- [ ] Test arrow keys and special keys
- [ ] Test ANSI colors (e.g., `ls --color=auto`)
- [ ] Resize browser window, verify terminal adapts
- [ ] Disconnect and reconnect, verify session persists
- [ ] Test on mobile device (iPhone/Android)
- [ ] Verify unauthorized access is blocked

---

## Future Enhancements

### v1.1
- Multiple simultaneous terminals per session
- File upload/download (drag-drop to terminal)
- Clipboard integration (sync across devices)

### v1.2
- Redis for session persistence (multi-instance support)
- WebSocket compression (permessage-deflate)
- Session recording/playback

### v2.0
- Native mobile apps (React Native)
- SSH key authentication
- Session sharing (invite users to view session)

---

## Troubleshooting

### Common Issues

**1. PTY fails to spawn**
- Check shell path exists on local machine
- Verify node-pty is installed correctly (native bindings)
- Check permissions (connector needs read/execute on shell)

**2. WebSocket connection drops**
- Verify Render.com service is running
- Check network connectivity
- Ensure JWT token is valid (not expired)
- Check Render.com logs for errors

**3. Terminal output corrupted**
- Verify binary data is sent/received correctly
- Check for mismatched terminal types (TERM env var)
- Ensure xterm.js version is compatible

**4. Mobile terminal looks wrong**
- Verify xterm-addon-fit is working
- Check CSS for mobile viewport
- Test on actual device (emulator may differ)

---

## Success Criteria Mapping

| Requirement | Implementation |
|-------------|----------------|
| Deployable to Render.com | Docker-based deployment, Node.js runtime |
| Terminal matches local experience | xterm.js with full ANSI/color support |
| Real-time bidirectional communication | Socket.io with binary data support |
| Mobile-responsive | xterm-addon-fit, Tailwind CSS responsive design |
| Secure authentication | JWT tokens, room-based isolation |

---

## References

- [xterm.js Documentation](https://xtermjs.org/)
- [Socket.io Documentation](https://socket.io/docs/)
- [node-pty GitHub](https://github.com/microsoft/node-pty)
- [Render.com Docker Guide](https://render.com/docs/docker)
- [WezTerm Escape Parser](https://github.com/wezterm/wezterm) - for reference on terminal emulation

---

**Last Updated**: 2025-01-18
**Version**: 1.0
**Status**: Ready for Implementation
