FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/

ENV SEAM_PORT=3000
ENV SEAM_DB_PATH=/data/seam.db

EXPOSE 3000

CMD ["node", "dist/index.js"]
