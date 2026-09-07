FROM node:22-alpine

WORKDIR /app

# Native node:sqlite ve node:http kullandığı için ekstra bağımlılık gerektirmez
COPY package.json tsconfig.json ./
COPY src ./src

# TypeScript derlemesi
RUN npm install -g typescript && tsc

# SQLite kalıcı veri dizini
RUN mkdir -p /app/data && chown -R node:node /app

USER node
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DB_PATH=/app/data/rutin.sqlite

EXPOSE 3000

CMD ["node", "dist/index.js"]
