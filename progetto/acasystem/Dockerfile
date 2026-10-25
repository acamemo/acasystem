# Acasystem — one image, three workspaces (ADR-0008, ADR-0014).
# Stage 1 builds the frontend and the Casa 3D bundles; stage 2 runs the backend, which also serves both builds.

FROM node:26-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
COPY casa3d/package.json casa3d/
# --ignore-scripts: the build stage needs no native module; esbuild runs from its platform package (no postinstall download).
RUN npm ci --ignore-scripts
COPY frontend frontend
# The release of progetto/.env (REP-20261012-004), shown in Sistema by the frontend build.
ARG ACASYSTEM_VERSION=""
ENV ACASYSTEM_VERSION=$ACASYSTEM_VERSION
# Build the frontend (typecheck strict runs first, see frontend/package.json prebuild)
RUN npm run build -w frontend
# Casa 3D (ADR-0014, T2b): its own esbuild build (typecheck and brand check first, see casa3d/package.json prebuild);
# the output casa3d/dist is served by the backend under /casa3d/.
COPY casa3d casa3d
RUN npm run build -w casa3d

FROM node:26-alpine
# Build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
COPY casa3d/package.json casa3d/
RUN npm ci --omit=dev -w backend
RUN apk del python3 make g++

COPY backend/src backend/src
COPY --from=builder /app/frontend/dist frontend/dist
COPY --from=builder /app/casa3d/dist casa3d/dist

ENV NODE_ENV=production
ENV PORT=3002
ENV DATA_DIR=/app/data

EXPOSE 3002
VOLUME ["/app/data"]

WORKDIR /app/backend
CMD ["node", "src/server.ts"]
