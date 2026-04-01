# Multi-stage Dockerfile for EasyPing Next.js application
# Optimized for Turborepo monorepo with minimal image size

# Stage 1: Base - Install dependencies
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Stage 2: Pruner - Extract workspace dependencies using turbo prune
FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo@^2.5.8 prune @easyping/web --docker

# Stage 3: Builder - Install dependencies and build
FROM base AS builder
WORKDIR /app

# Accept build arguments for Next.js environment variables
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL

# Set environment variables for build
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# Copy pruned workspace files
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Install dependencies (production + dev for build)
RUN pnpm install --frozen-lockfile

# Copy pruned source code
COPY --from=pruner /app/out/full/ .

# Copy turbo.json and other config files
COPY turbo.json turbo.json

# Build the application
RUN pnpm build --filter=@easyping/web

# Stage 4: Runner - Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# Copy public assets
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy Next.js build artifacts
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next

# Copy node_modules (only production dependencies needed)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

# Copy package files for running
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/next.config.ts ./apps/web/next.config.ts

# Copy healthcheck script
COPY --chown=nextjs:nodejs docker/healthcheck.cjs ./healthcheck.cjs

# Switch to non-root user
USER nextjs

# Expose port 8000 (avoiding 3000 series used by other projects)
EXPOSE 8000

# Set Next.js to listen on 0.0.0.0
ENV HOSTNAME="0.0.0.0"
ENV PORT=8000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node /app/healthcheck.cjs || exit 1

# Start Next.js application
WORKDIR /app/apps/web
CMD ["node_modules/.bin/next", "start", "-p", "8000"]
