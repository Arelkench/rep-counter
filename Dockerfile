# syntax=docker/dockerfile:1

# ---- build: install, compile core, api and web --------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Manifests first, so dependency install is cached until a package.json changes.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY packages packages
COPY apps apps
COPY fixtures fixtures
RUN npm run build:core \
 && npm run build -w @rep-counter/api \
 && npm run build -w @rep-counter/web

# ---- api-runtime: production dependencies only, nothing the API doesn't run ------
FROM build AS api-runtime
RUN npm prune --omit=dev \
 && rm -rf apps/web packages/core/src apps/api/src apps/api/test

# ---- api: Node + SQLite ----------------------------------------------------------
FROM node:22-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production \
    API_PORT=3000 \
    DB_PATH=/data/rep-counter.sqlite
COPY --from=api-runtime --chown=node:node /app /app
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
VOLUME /data
CMD ["node", "apps/api/dist/main.js"]

# ---- web: static files + /api proxy ---------------------------------------------
FROM nginx:1.27-alpine AS web
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
