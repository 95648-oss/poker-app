# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Install ALL client dependencies (including devDeps like vite)
COPY client/package*.json ./client/
RUN cd client && npm install

# Copy source and build the React app
COPY . .
RUN cd client && npm run build

# ── Production stage ───────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Only copy what's needed to run
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/src/index.js"]
