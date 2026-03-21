FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src/ ./src/
COPY tsconfig.json tsup.config.ts ./
RUN npm run build

FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist/

ENV SEAM_PORT=3000
ENV SEAM_DB_PATH=/data/seam.db

EXPOSE 3000

CMD ["node", "dist/index.js"]
