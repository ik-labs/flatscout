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

# Build client (Vite) only — server runs from source via tsx
RUN pnpm --filter client build

# ---- Stage 2: Runtime ----
FROM node:22-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/server/package.json server/

# Install server production deps only (tsx is a prod dependency)
RUN pnpm install --prod --frozen-lockfile

# Copy built client static files
COPY --from=build /app/client/dist ./client/dist

# Copy server source (tsx runs TypeScript directly)
COPY --from=build /app/server/ ./server/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npx", "tsx", "server/index.ts"]
