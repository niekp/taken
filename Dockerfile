# syntax=docker/dockerfile:1

# Stage 1: Build frontend assets
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts
COPY index.html vite.config.js postcss.config.js tailwind.config.js ./
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# Stage 2: Install production dependencies (needs build tools for better-sqlite3)
FROM node:20-alpine AS deps
WORKDIR /app
RUN --mount=type=cache,target=/var/cache/apk \
    apk add python3 make g++
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Stage 3: Final minimal runtime image
FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY server/ ./server/
COPY --from=frontend-build /app/dist ./dist

RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/chores.db

EXPOSE 3000
VOLUME ["/data"]

CMD ["node", "server/index.js"]
