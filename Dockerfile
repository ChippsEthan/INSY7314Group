# --- Stage 1: Build & Install Dependencies ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

# --- Stage 2: Runtime Image ---
FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy from the builder stage
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app .

# Create logs directory and give our non-root user permission to write to it
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app/logs

ENV NODE_ENV=production
USER appuser
EXPOSE 5000
CMD ["node", "server.js"]