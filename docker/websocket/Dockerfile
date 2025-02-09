FROM node:20-alpine

WORKDIR /app

COPY websocket-server/package*.json ./
COPY websocket-server .

RUN npm install

EXPOSE 3001

CMD ["node", "server.js"]