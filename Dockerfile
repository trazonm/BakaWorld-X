# Frontend Dockerfile (SvelteKit application)
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

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

# Expose port (default, can be overridden by env var)
EXPOSE 5002

# Set environment to production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5002

# Start the application (adapter-node creates index.js as entry point)
CMD ["node", "build/index.js"]

