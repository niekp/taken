FROM node:20-alpine AS frontend-build

WORKDIR /app
COPY package.json package-lock.json ./
# Only install devDependencies needed for Vite build (skip native modules)
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

# Install build tools for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

# Install only production dependencies for the server
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++

# Copy server code
COPY server/ ./server/

# Copy built frontend
COPY --from=frontend-build /app/dist ./dist

# Create data directory for SQLite
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/chores.db

EXPOSE 3000

VOLUME ["/data"]

CMD ["node", "server/index.js"]
