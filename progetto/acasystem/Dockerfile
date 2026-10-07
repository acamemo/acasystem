# Acasystem — one image, two workspaces (ADR-0008).
# Stage 1 builds the frontend; stage 2 runs the backend, which also serves the built frontend.

FROM node:26-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci
COPY frontend frontend
# Build the frontend (typecheck strict runs first, see frontend/package.json prebuild)
RUN npm run build -w frontend

FROM node:26-alpine
# Build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci --omit=dev -w backend
RUN apk del python3 make g++

COPY backend/src backend/src
COPY --from=builder /app/frontend/dist frontend/dist

ENV NODE_ENV=production
ENV PORT=3002
ENV DATA_DIR=/app/data

EXPOSE 3002
VOLUME ["/app/data"]

WORKDIR /app/backend
CMD ["node", "src/server.ts"]
