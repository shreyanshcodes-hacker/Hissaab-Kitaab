# ==============================================================================
# ShopLedger Backend Dockerfile (Google Cloud Run & Container Orchestration)
# ==============================================================================

# Stage 1: Build & Typecheck
FROM node:22-alpine AS builder

WORKDIR /app

# Enable Corepack & pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml* tsconfig.json ./

# Install all dependencies including devDependencies for compilation
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN pnpm run build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Enable pnpm for production install
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy production package manifests
COPY package.json pnpm-lock.yaml* ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Create and switch to non-root user
USER node

# Expose standard Cloud Run HTTP port
EXPOSE 8080

# Start server
CMD ["node", "dist/server.js"]
