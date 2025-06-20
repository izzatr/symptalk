# Use Node.js 18 (more stable than 22 for production)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the Next.js application (without Cloudflare interference)
RUN npm run build:clean

# Expose the port your app runs on
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start your custom server
CMD ["node", "server.js"]