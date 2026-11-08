
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .


FROM node:22-alpine AS runtime
WORKDIR /app


RUN apk upgrade --no-cache && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

RUN addgroup -S appgroup && adduser -S appuser -G appgroup


COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app .


RUN mkdir -p /app/logs && chown -R appuser:appgroup /app/logs

ENV NODE_ENV=production
USER appuser
EXPOSE 5000
CMD ["node", "server.js"]
