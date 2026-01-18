# Terminal Connector

Local connector for Terminal Server - PTY bridge with WebSocket support.

## Overview

The terminal connector runs on your local machine and bridges a PTY (pseudo-terminal) to the Render server via WebSocket. This allows remote web clients to interact with your local terminal in real-time.

## Installation

```bash
cd connector
npm install
npm run build
```

## Usage

### Basic Usage

```bash
node dist/index.js --url https://your-app.onrender.com --token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### With Custom Shell

```bash
node dist/index.js --url https://your-app.onrender.com --token <token> --shell /bin/zsh
```

### With Environment Variables

```bash
node dist/index.js --url https://your-app.onrender.com --token <token> --env "TERM=xterm-256color" --env "LANG=en_US.UTF-8"
```

### Development Mode

```bash
npm run dev -- --url https://your-app.onrender.com --token <token>
```

## CLI Options

| Option | Description | Required |
|--------|-------------|----------|
| `-u, --url <server-url>` | Render server URL | Yes |
| `-t, --token <jwt-token>` | JWT token for authentication | Yes |
| `-s, --shell <shell-path>` | Shell to spawn (default: SHELL env var or /bin/bash) | No |
| `-e, --env <key=value>` | Environment variables (can be used multiple times) | No |
| `-h, --help` | Display help | No |

## Architecture

```
┌─────────────────┐         WebSocket (TLS)        ┌─────────────────┐
│  Render Server  │◄──────────────────────────────►│  Local          │
│  (Socket.io)    │   Session ID (JWT Token)       │  Connector      │
└────────┬────────┘                                └────────┬────────┘
         │                                                  │
         │ Forward terminal data                            │ Spawn PTY
         │ Forward user input                               │ Read/Write PTY
         │                                                  │
         ▼                                                  ▼
   Web Clients                                        Local Shell
```

## Features

- **PTY Management**: Spawns and manages pseudo-terminal processes
- **WebSocket Communication**: Real-time bidirectional communication with Render server
- **Automatic Reconnection**: Exponential backoff for connection recovery
- **Graceful Shutdown**: Proper cleanup on SIGINT/SIGTERM
- **Custom Shell Support**: Use any shell (bash, zsh, fish, etc.)
- **Environment Variables**: Pass custom environment variables to PTY

## Data Flow

### Terminal Output (Local → Web)
```
Local Shell → PTY → Connector → WebSocket → Render Server → Web Client → xterm.js
```

### User Input (Web → Local)
```
Web Client → WebSocket → Render Server → Connector → PTY → Local Shell
```

## WebSocket Events

### Connector → Server
- `terminal:data` (string): PTY output data
- `terminal:status` (object): Status updates
  ```json
  {
    "status": "ready" | "closed" | "error",
    "message": "optional message"
  }
  ```

### Server → Connector
- `terminal:input` (string): User keystrokes from web client
- `terminal:resize` (object): Resize request
  ```json
  {
    "cols": 80,
    "rows": 24
  }
  ```
- `terminal:close`: Request to close PTY

## Security

- **JWT Authentication**: All connections require valid JWT token
- **TLS Encryption**: All connections use HTTPS/WSS
- **Session Isolation**: Each session has unique token
- **Input Validation**: Shell paths and environment variables are validated

## Troubleshooting

### PTY fails to spawn
- Check that the shell path exists on your system
- Verify node-pty is installed correctly (native bindings)
- Ensure proper permissions

### WebSocket connection drops
- Verify Render server is running
- Check network connectivity
- Ensure JWT token is valid (not expired)
- Check Render server logs

### Terminal output corrupted
- Verify binary data is sent/received correctly
- Check TERM environment variable matches xterm.js settings

## Building Standalone Binary

To create a standalone binary (Linux/Mac/Windows):

```bash
npm install -g pkg
pkg package.json --targets node18-win-x64,node18-macos-x64,node18-linux-x64 --output dist/terminal-connector
```

## License

MIT
