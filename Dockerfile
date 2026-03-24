# ---- Stage 1: Build ----
FROM node:22-alpine AS build

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config first for better caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY client/package.json client/
COPY server/package.json server/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY client/ client/
COPY server/ server/

# Build client (Vite) and server (TypeScript)
RUN pnpm --filter client build
RUN pnpm --filter server build

# Prune dev dependencies for production
RUN pnpm --filter server deploy --prod /app/server-prod

# ---- Stage 2: Runtime ----
FROM node:22-alpine AS runtime

WORKDIR /app

# Copy built client static files
COPY --from=build /app/client/dist ./client/dist

# Copy compiled server + production node_modules
COPY --from=build /app/server-prod ./server
COPY --from=build /app/server/dist ./server/dist

# Copy server .env.example as reference (actual .env mounted at runtime)
COPY server/.env.example ./server/.env.example

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
