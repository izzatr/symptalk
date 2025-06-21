FROM node:18-alpine AS builder
WORKDIR /app

# 1. Copy package files & install deps
COPY package.json package-lock.json ./
RUN npm ci

# 2. Copy the rest of your source & build
COPY . .
RUN npm run build:clean

# 3. Production image
FROM node:18-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.* ./

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]