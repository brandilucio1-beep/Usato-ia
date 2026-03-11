FROM node:20-slim

# Install Chromium for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Install server deps
COPY server/package*.json ./server/
RUN cd server && npm ci --production

# Install client deps and build
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Copy server source
COPY server/ ./server/
COPY .env.example ./.env.example
COPY start.sh ./start.sh
RUN chmod +x start.sh

# Create data directory
RUN mkdir -p server/data server/logs

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["./start.sh"]
