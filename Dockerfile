FROM node:20-alpine

WORKDIR /app

# Install dependencies only (cached layer)
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --prefer-offline

# Install PM2 globally for production process management
RUN npm install -g pm2

# Copy source code
COPY . .

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Run with PM2 runtime for container process management & monitoring
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]
