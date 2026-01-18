# Terminal Server Web Frontend

Web frontend for the Terminal Server project, providing a browser-based terminal interface using xterm.js and Socket.io.

## Features

- 🖥️ Full terminal emulation with xterm.js
- 🌐 Real-time bidirectional communication via WebSocket
- 📱 Mobile-responsive design with xterm-addon-fit
- 🔄 Auto-reconnection on WebSocket disconnect
- 🎨 Beautiful dark theme with proper ANSI color support
- 💾 Session persistence via localStorage
- 🔒 Secure JWT-based authentication

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Terminal Emulator**: xterm.js 5.3.0 + xterm-addon-fit
- **Real-time Communication**: Socket.io-client 4.7.4
- **Styling**: Tailwind CSS 3.3.6
- **Build Tool**: Vite 5.0.8
- **HTTP Client**: Axios 1.6.2

## Project Structure

```
web/
├── src/
│   ├── components/
│   │   ├── Terminal.tsx          # xterm.js wrapper component
│   │   ├── AuthPrompt.tsx        # Session creation/auth UI
│   │   └── StatusIndicator.tsx   # Connection status display
│   ├── hooks/
│   │   ├── useSocket.ts          # Socket.io connection management
│   │   └── useTerminal.ts        # Terminal lifecycle management
│   ├── utils/
│   │   ├── api.ts                # HTTP API calls (session creation)
│   │   └── token.ts              # Token storage (localStorage)
│   ├── App.tsx                   # Main application component
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Global styles and Tailwind imports
├── public/
│   └── index.html                # HTML template
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite build config
├── tailwind.config.js            # Tailwind CSS config
└── README.md                     # This file
```

## Setup Instructions

### Prerequisites

- Node.js 20.x or higher
- npm or yarn package manager

### Installation

1. Navigate to the web directory:
   ```bash
   cd web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

3. Configure environment variables (optional):
   Create a `.env` file in the web directory:
   ```env
   VITE_API_URL=http://localhost:3000
   VITE_SOCKET_URL=http://localhost:3000
   ```

### Build for Production

1. Build the application:
   ```bash
   npm run build
   ```

2. The optimized production build will be in the `dist/` directory.

3. Preview the production build:
   ```bash
   npm run preview
   ```

## Usage

### Creating a New Session

1. Open the web application
2. Click "Create New Session"
3. A JWT token and session ID will be generated
4. Copy the session ID and token

### Connecting to an Existing Session

1. Click "Connect to Existing Session"
2. Enter the Session ID
3. Paste the JWT token
4. Click "Connect"

### Terminal Interface

Once connected:
- Type commands in the terminal as you would in a local terminal
- The terminal will display output from the remote PTY
- Resize the browser window to adjust terminal size (auto-fit)
- Connection status is shown in the header

### Reconnection

If the connection is lost:
- A "Connection Lost" message will appear
- Click "Reconnect" to attempt reconnection
- Click "Back to Home" to return to the session prompt

## WebSocket Events

### Client → Server

- `terminal:input` (binary): User keystrokes from terminal
- `terminal:resize` (json): Terminal resize event `{ cols, rows }`

### Server → Client

- `terminal:data` (binary): PTY output from remote machine
- `terminal:status` (json): Connection status update

## Key Components

### Terminal Component

The `Terminal` component wraps xterm.js and provides:
- Keyboard input handling
- WebSocket data writing
- Resize event handling
- Responsive terminal sizing via xterm-addon-fit
- Custom dark theme with ANSI color support

### useSocket Hook

Manages Socket.io connection with:
- Auto-reconnection with exponential backoff
- Event listener registration
- Binary data transmission
- Connection status tracking

### useTerminal Hook

Manages terminal lifecycle with:
- xterm.js instance creation/disposal
- Fit addon integration
- Resize event handling
- Data writing to terminal

## Environment Variables

- `VITE_API_URL`: Backend API base URL (default: `http://localhost:3000`)
- `VITE_SOCKET_URL`: WebSocket server URL (default: `http://localhost:3000`)

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Troubleshooting

### Terminal not responding

1. Check that the backend server is running
2. Verify the WebSocket connection status
3. Check browser console for errors
4. Ensure JWT token is valid and not expired

### Terminal looks wrong on mobile

1. Ensure xterm-addon-fit is working (check console)
2. Refresh the page after rotating the device
3. Check viewport meta tag in index.html

### Connection keeps dropping

1. Check network connectivity
2. Verify backend server is stable
3. Check JWT token expiration
4. Review backend logs for connection errors

## Integration with Backend

For production deployment:

1. Build the web app:
   ```bash
   npm run build
   ```

2. Copy the `dist/` directory contents to the backend's `public/` directory

3. Configure the backend to serve static files from `/`

4. Ensure CORS is properly configured if deploying separately

See the main project README for more details on backend integration.

## License

This project is part of the Terminal Server system.

## Support

For issues or questions, please refer to the main project repository or create an issue.
