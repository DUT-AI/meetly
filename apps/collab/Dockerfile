FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY server.js ./

ENV HOST=0.0.0.0
ENV PORT=1234
EXPOSE 1234

USER node

CMD ["node", "server.js"]
