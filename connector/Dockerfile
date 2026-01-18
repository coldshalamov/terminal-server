# Multi-stage build for terminal-connector

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S connector && \
    adduser -S connector -u 1001 -G connector

# Change ownership
RUN chown -R connector:connector /app

# Switch to non-root user
USER connector

# Expose no ports (connector initiates connection)
# ENTRYPOINT is set by package.json
ENTRYPOINT ["node", "dist/index.js"]

CMD ["--help"]
