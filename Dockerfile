FROM node:20

WORKDIR /app

# Copy everything at once
COPY . .

# Install everything (including dev deps needed for build)
RUN npm install

# Build
RUN npm run build:clean

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]