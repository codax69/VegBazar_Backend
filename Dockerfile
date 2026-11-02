FROM node:20-alpine

WORKDIR /app

# Install dependencies only (cached layer)
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --prefer-offline

# Copy source code
COPY . .

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Run with capped V8 memory for low server RAM usage
CMD ["node", "--max-old-space-size=384", "index.js"]
