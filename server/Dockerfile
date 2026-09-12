FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist

# SQLite kalıcı veri dizini
RUN mkdir -p /app/data && chown -R node:node /app

USER node
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DB_PATH=/app/data/rutin.sqlite

EXPOSE 3000

CMD ["node", "dist/index.js"]
