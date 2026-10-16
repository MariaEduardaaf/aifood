# Deploying aiFood

aiFood runs as one long-running Node process (Docker image built from the
`Dockerfile`) plus a Postgres database. On start the container applies pending
Prisma migrations (`prisma migrate deploy`) and then starts the Next.js
standalone server on `$PORT` (default 3000).

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. |
| `AUTH_SECRET` | yes | `openssl rand -base64 32`. Changing it logs everyone out. |
| `AUTH_TRUST_HOST` | yes | `true`. The app sits behind the platform's proxy. |
| `NEXT_PUBLIC_APP_URL` | recommended | Public URL, e.g. `https://pedidos.cafesol.es`. Used in QR codes. Baked in at **build** time (build arg). Without it the QR URL is derived from the request host. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | for photos | Menu photo uploads. Everything else works without them. |
| `NEXT_PUBLIC_SHOW_DEMO_LOGINS` | no | Build arg. Keep `false` in production. |

`TZ` is not needed: the server runs in UTC and each restaurant's timezone lives
in its settings (`Settings.timezone`).

Health check path: `GET /api/health` (200 `{"status":"ok","db":"up"}`, 503 when
the database is unreachable).

## Railway

1. **New project** → *Deploy from GitHub repo* → pick the repo and branch.
   Railway detects the `Dockerfile` and builds with it.
2. **Add Postgres**: *New* → *Database* → *PostgreSQL*.
3. In the app service → *Variables*:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (reference variable)
   - `AUTH_SECRET` = output of `openssl rand -base64 32`
   - `AUTH_TRUST_HOST` = `true`
   - `NEXT_PUBLIC_APP_URL` = `https://<your-domain>` (Railway passes service
     variables to Docker builds as build args, so this reaches the build)
   - `CLOUDINARY_*` if you use photo uploads
4. *Settings* → *Deploy* → **Healthcheck Path** = `/api/health`.
   Keep **one replica** (realtime uses an in-process event bus).
5. Deploy. The logs show `prisma migrate deploy` applying migrations, then
   `Ready`. Migrations run on every start and are a no-op when up to date.
6. **First admin.** Open a shell in the running container with the Railway
   CLI and run the script the image ships (Node strips the types):
   ```bash
   railway ssh --service <app-service>
   node scripts/create-admin.ts --restaurant "Café Sol" --slug cafe-sol \
     --email owner@cafesol.es --password "a-long-password"
   ```
   Alternative from a local checkout: enable public networking on Postgres and
   run `DATABASE_URL=<DATABASE_PUBLIC_URL> npm run create-admin -- ...`.
   The script is idempotent: an existing restaurant or user is left unchanged.
   Add `--role SUPER_ADMIN` for the studio's own super admin account.
7. **Custom domain**: *Settings* → *Networking* → *Custom Domain* → add
   `pedidos.cafesol.es` and create the CNAME Railway shows at your DNS provider.
   Update `NEXT_PUBLIC_APP_URL` and redeploy so QR codes use the new domain.

## Fly.io

1. Install `flyctl` and log in. From the repo root:
   ```bash
   fly launch --no-deploy          # detects the Dockerfile, creates fly.toml
   ```
   Pick a region close to the restaurant (e.g. `mad`).
2. **Postgres**:
   ```bash
   fly postgres create --name aifood-db --region mad
   fly postgres attach aifood-db   # sets DATABASE_URL as a secret
   ```
   (Or use any managed Postgres and `fly secrets set DATABASE_URL=...`.)
3. **Secrets**:
   ```bash
   fly secrets set AUTH_SECRET="$(openssl rand -base64 32)" AUTH_TRUST_HOST=true \
     CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=...
   ```
4. In `fly.toml` make sure of:
   ```toml
   [build.args]
     NEXT_PUBLIC_APP_URL = "https://pedidos.cafesol.es"

   [http_service]
     internal_port = 3000
     force_https = true
     auto_stop_machines = "off"   # staff screens hold SSE connections open
     min_machines_running = 1

   [[http_service.checks]]
     grace_period = "30s"
     interval = "15s"
     timeout = "5s"
     method = "GET"
     path = "/api/health"
   ```
5. `fly deploy`. Keep a single machine (`fly scale count 1`): realtime uses an
   in-process event bus.
6. **First admin** (the image ships the script; Node strips the types):
   ```bash
   fly ssh console -C "node scripts/create-admin.ts --restaurant 'Café Sol' \
     --slug cafe-sol --email owner@cafesol.es --password 'a-long-password'"
   ```
7. **Custom domain**:
   ```bash
   fly certs add pedidos.cafesol.es
   ```
   Create the DNS records it prints (CNAME to `<app>.fly.dev`, or A/AAAA), then
   update the `NEXT_PUBLIC_APP_URL` build arg and `fly deploy` again.

## Local Docker check

```bash
docker build -t aifood --build-arg NEXT_PUBLIC_APP_URL=http://localhost:3000 .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host.docker.internal:5432/aifood" \
  -e AUTH_SECRET=dev-secret -e AUTH_TRUST_HOST=true aifood
curl localhost:3000/api/health
```

## Why not Vercel

Staff screens get orders and calls over Server-Sent Events fed by an in-process
event bus. Serverless functions are short-lived and run as many separate
instances, so an event emitted by one request never reaches a stream held by
another, and long-lived streams hit function time limits. Vercel is fine for
UI previews; production needs a long-running host. Scaling past one instance
means moving the bus to Redis or Postgres `LISTEN/NOTIFY` (see
`src/lib/events.ts`).
