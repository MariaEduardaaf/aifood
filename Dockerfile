# syntax=docker/dockerfile:1
# Production image: Next.js standalone server + Prisma migrations on start.
# Debian slim (not Alpine) so Prisma's engines match without extra config.
FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1

# 1. Dependencies (postinstall runs prisma generate, so the schema comes along)
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# 2. Build
FROM base AS build
# NEXT_PUBLIC_* values are inlined at build time; pass them as build args
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SHOW_DEMO_LOGINS=false
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_SHOW_DEMO_LOGINS=$NEXT_PUBLIC_SHOW_DEMO_LOGINS \
    NEXT_OUTPUT_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholder so Prisma can initialise during the build; never used at runtime
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm run build

# 3. Runtime
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/prisma ./prisma
# Prisma CLI + engines for `migrate deploy` (standalone only traces the client)
COPY --from=build --chown=node:node /app/node_modules/prisma ./node_modules/prisma
COPY --from=build --chown=node:node /app/node_modules/@prisma ./node_modules/@prisma
# Needed by scripts/create-admin.ts, which runs outside the traced Next bundle
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=build --chown=node:node /app/scripts/create-admin.ts ./scripts/create-admin.ts
# Menu photos (local storage when Cloudinary is not configured). Mount a
# persistent volume here, or photos are lost on every redeploy.
RUN mkdir -p /app/uploads && chown node:node /app/uploads
VOLUME /app/uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Apply pending migrations, then start the server
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && exec node server.js"]
