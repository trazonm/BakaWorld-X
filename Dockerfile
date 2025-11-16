# SvelteKit Application Dockerfile
# This builds and runs the full SvelteKit application including:
# - Frontend (Svelte components and pages)
# - API routes (server-side endpoints)
# - Server-side rendering
#
# This is the standard SvelteKit deployment pattern where API routes
# are part of the same application as the frontend
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# System deps needed during build for yt-dlp/ffmpeg usage (even if mainly runtime)
# Install Python and pip for spotdl (Spotify downloads)
RUN apk add --no-cache ffmpeg yt-dlp python3 py3-pip

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm if using pnpm, otherwise use npm
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime system deps (yt-dlp + ffmpeg) for YouTube downloading
# Install Python and pip for spotdl (Spotify downloads)
RUN apk add --no-cache ffmpeg yt-dlp python3 py3-pip

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder (adapter-node outputs to build/)
COPY --from=builder /app/build ./build
COPY --from=builder /app/static ./static
COPY --from=builder /app/package.json ./

# Copy Python script and install spotdl for Spotify downloads
COPY scripts/ ./scripts/
RUN pip3 install --no-cache-dir --break-system-packages spotdl requests beautifulsoup4 python-dotenv spotipy

# Expose port (default, can be overridden by env var)
EXPOSE 5002

# Set environment to production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5002

# Start the application (adapter-node creates index.js as entry point)
CMD ["node", "build/index.js"]

