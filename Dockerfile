# SvelteKit app (adapter-node): SSR, client assets, and API routes in one process.
# Worker / download polling runs in a separate image (Dockerfile.backend).

FROM node:20-alpine AS builder
WORKDIR /app

# No ffmpeg/python here — not required for `vite build`.
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate \
	&& pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app

# Runtime tools for YouTube / Spotify features used by API routes + scripts
RUN apk add --no-cache ffmpeg yt-dlp python3 py3-pip \
	&& pip3 install --no-cache-dir --break-system-packages spotdl requests beautifulsoup4 python-dotenv spotipy

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate \
	&& pnpm install --prod --frozen-lockfile \
	&& pnpm store prune

COPY --from=builder /app/build ./build
COPY --from=builder /app/static ./static
COPY --from=builder /app/package.json ./

COPY scripts/ ./scripts/

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs \
	&& mkdir -p temp/youtube temp/spotify \
	&& chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5002

EXPOSE 5002

CMD ["node", "build/index.js"]
