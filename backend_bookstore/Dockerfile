FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node src ./src
RUN mkdir -p /app/uploads/covers /app/uploads/backgrounds && chown -R node:node /app/uploads

ENV NODE_ENV=production
EXPOSE 3000

USER node

CMD ["node", "src/server.js"]
