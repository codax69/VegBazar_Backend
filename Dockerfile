FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=4000

WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --chown=node:node app.js index.js const.js ./
COPY --chown=node:node config ./config
COPY --chown=node:node font ./font
COPY --chown=node:node src ./src
RUN mkdir -p /app/temp /app/public/temp /app/src/temp \
    && chown -R node:node /app/temp /app/public /app/src/temp

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "--max-old-space-size=384", "index.js"]
