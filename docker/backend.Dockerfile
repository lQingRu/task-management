FROM node:24-bookworm-slim AS base
WORKDIR /app

FROM base AS build
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY backend/tsconfig.json backend/tsconfig.docker.json backend/prisma.config.ts ./
COPY backend/src ./src
COPY backend/migrations ./migrations
RUN npm exec tsc -- -p tsconfig.docker.json

FROM build AS migrate
COPY docker/migrate-and-seed.sh /usr/local/bin/migrate-and-seed
RUN chmod +x /usr/local/bin/migrate-and-seed
CMD ["migrate-and-seed"]

FROM base AS api
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY backend/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY backend/config ./config
USER node
EXPOSE 3001
CMD ["node", "dist/server.js"]
