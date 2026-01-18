# Multi-stage build for Terminal Server with frontend included
# This Dockerfile builds both the server and web frontend

# Stage 1: Build web frontend
FROM node:20-alpine AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine
WORKDIR /app

# Copy server dependencies and built code
COPY --from=server-builder /app/server/package*.json ./
RUN npm ci --production
COPY --from=server-builder /app/server/dist ./dist

# Copy web frontend build
COPY --from=web-builder /app/web/dist ./web/dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
