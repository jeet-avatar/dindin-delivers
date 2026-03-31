FROM node:20-slim
WORKDIR /app

RUN npm install -g tsx

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

COPY server/index.ts ./server/
COPY frontend/dist ./frontend/dist

EXPOSE 3001
ENV PORT=3001

WORKDIR /app/server
CMD ["tsx", "index.ts"]
