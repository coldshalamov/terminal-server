#!/bin/bash
# Example usage script for terminal-connector

# Set your server URL and token here
SERVER_URL="https://your-app.onrender.com"
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Optional: Custom shell
SHELL_PATH="/bin/bash"

# Optional: Environment variables
ENV_VARS=(
  "TERM=xterm-256color"
  "LANG=en_US.UTF-8"
)

# Build the connector first
echo "Building terminal-connector..."
npm run build

# Run the connector
echo "Starting terminal-connector..."
echo "Server: $SERVER_URL"
echo "Shell: $SHELL_PATH"
echo ""

# Run with all options
node dist/index.js \
  --url "$SERVER_URL" \
  --token "$JWT_TOKEN" \
  --shell "$SHELL_PATH" \
  "${ENV_VARS[@]/#/--env }"
