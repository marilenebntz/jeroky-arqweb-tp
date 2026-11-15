FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY index.js storage.js jeroky.js worker.js ./

RUN mkdir -p /data && chown node:node /data

USER node

CMD ["node", "index.js"]
