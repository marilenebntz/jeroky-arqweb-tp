FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY index.js storage.js api.js ./

RUN mkdir -p /data && chown node:node /data

USER node

CMD ["node", "index.js"]
