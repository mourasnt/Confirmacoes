FROM node:24-slim AS builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

FROM node:24-slim AS runner
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
COPY --from=builder /app/client/dist ./server/public

ENV NODE_ENV=production
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://localhost:5000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/src/index.js"]