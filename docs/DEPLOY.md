# Deploying aiFood

aiFood runs as one long-running Node process (Docker image built from the
`Dockerfile`) plus a Postgres database. On start the container applies pending
Prisma migrations (`prisma migrate deploy`) and then starts the Next.js
standalone server on `$PORT` (default 3000).

The image sets `NEXT_OUTPUT_STANDALONE=1` in its build stage, which switches
`next.config.mjs` to `output: "standalone"` (the self-contained `server.js`).
Outside Docker leave it unset: `npm run build && npm start` (`next start`)
does not run a standalone build.

On `SIGTERM`/`SIGINT` (a redeploy) the server ends every open SSE stream with
`event: bye`, so staff screens reconnect to the new instance on their own and
the old process exits right away instead of waiting for those connections.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. |
| `AUTH_SECRET` | yes | `openssl rand -base64 32`. Changing it logs everyone out. |
| `AUTH_URL` | recommended | Public URL of the app, e.g. `https://pedidos.cafesol.es`. Auth.js uses it for login redirects; without it, and without a proxy that sets `x-forwarded-host`, redirects can point at the container's bind address (`0.0.0.0:3000`). |
| `AUTH_TRUST_HOST` | no | The app already sets `trustHost: true` (it always sits behind a proxy). Setting `true` is harmless. |
| `NEXT_PUBLIC_APP_URL` | recommended | Public URL, e.g. `https://pedidos.cafesol.es`. Used in QR codes. Baked in at **build** time (build arg). Without it the QR URL is derived from the request host. |
| `UPLOAD_DIR` | no | Folder for menu photos stored on local disk. Default `<cwd>/uploads`; the Docker image sets `/app/uploads`. See [Photos](#photos). |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | no | Set all three to store menu photos on Cloudinary instead of local disk. |
| `NEXT_PUBLIC_SHOW_DEMO_LOGINS` | no | Build arg. Keep `false` in production. |

`TZ` is not needed: the server runs in UTC and each restaurant's timezone lives
in its settings (`Settings.timezone`).

Health check path: `GET /api/health` (200 `{"status":"ok","db":"up"}`, 503 when
the database is unreachable).

## Photos

Menu photos are stored on local disk by default, so a cafe needs no external
account. `POST /api/upload` writes them to `UPLOAD_DIR` (`/app/uploads` in the
Docker image) and `GET /api/uploads/<name>` serves them.

The container filesystem is thrown away on every redeploy, so **mount a
persistent volume at `/app/uploads`**, otherwise uploaded photos vanish:

- **Railway**: app service → right-click → *Attach Volume* (or *New* →
  *Volume*), mount path `/app/uploads`.
- **Fly.io**: `fly volumes create aifood_uploads --region mad --size 1`, then in
  `fly.toml`:
  ```toml
  [mounts]
    source = "aifood_uploads"
    destination = "/app/uploads"
  ```

A volume ties the app to one instance, which it already is (see the realtime
note below). For several instances, or to skip the volume, use Cloudinary:
set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`
and new uploads go there (photos uploaded before keep their local URLs).

## Railway

1. **New project** → *Deploy from GitHub repo* → pick the repo and branch.
   Railway detects the `Dockerfile` and builds with it.
2. **Add Postgres**: *New* → *Database* → *PostgreSQL*.
3. In the app service → *Variables*:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (reference variable)
   - `AUTH_SECRET` = output of `openssl rand -base64 32`
   - `NEXT_PUBLIC_APP_URL` = `https://<your-domain>` (Railway passes service
     variables to Docker builds as build args, so this reaches the build)
   - `CLOUDINARY_*` only if you store photos on Cloudinary
4. **Volume** for photos at `/app/uploads` (see [Photos](#photos)).
5. *Settings* → *Deploy* → **Healthcheck Path** = `/api/health`.
   Keep **one replica** (realtime uses an in-process event bus).
6. Deploy. The logs show `prisma migrate deploy` applying migrations, then
   `Ready`. Migrations run on every start and are a no-op when up to date.
7. **First admin.** Open a shell in the running container with the Railway
   CLI and run the script the image ships (Node strips the types). The
   password goes in `ADMIN_PASSWORD`, read without echo, so it stays out of
   shell history and the process list:
   ```bash
   railway ssh --service <app-service>
   bash   # if the shell is not bash already; `read -s` needs it
   read -rsp "Admin password: " ADMIN_PASSWORD && export ADMIN_PASSWORD
   node scripts/create-admin.ts --restaurant "Café Sol" --slug cafe-sol \
     --email owner@cafesol.es
   ```
   Alternative from a local checkout: enable public networking on Postgres and
   run `DATABASE_URL=<DATABASE_PUBLIC_URL> npm run create-admin -- ...` with
   `ADMIN_PASSWORD` exported the same way.
   An existing user (same email) is left unchanged. If a restaurant with the
   same slug already exists the script stops with an error; pass `--attach`
   only when you mean to add the admin to that existing restaurant.
   `--password` still works but prints a warning.
   Add `--role SUPER_ADMIN` for the studio's own super admin account.
8. **Custom domain**: *Settings* → *Networking* → *Custom Domain* → add
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
   fly secrets set AUTH_SECRET="$(openssl rand -base64 32)"
   ```
   Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and
   `CLOUDINARY_API_SECRET` only to store photos on Cloudinary. For the default
   local storage create the photo volume:
   ```bash
   fly volumes create aifood_uploads --region mad --size 1
   ```
4. In `fly.toml` make sure of:
   ```toml
   [build.args]
     NEXT_PUBLIC_APP_URL = "https://pedidos.cafesol.es"

   [mounts]
     source = "aifood_uploads"
     destination = "/app/uploads"

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
6. **First admin** (the image ships the script; Node strips the types). Open
   an interactive shell so the password never appears in a command line:
   ```bash
   fly ssh console -C bash
   read -rsp "Admin password: " ADMIN_PASSWORD && export ADMIN_PASSWORD
   node scripts/create-admin.ts --restaurant "Café Sol" --slug cafe-sol \
     --email owner@cafesol.es
   ```
   Same rules as on Railway: an existing slug stops the script unless you pass
   `--attach`.
7. **Custom domain**:
   ```bash
   fly certs add pedidos.cafesol.es
   ```
   Create the DNS records it prints (CNAME to `<app>.fly.dev`, or A/AAAA), then
   update the `NEXT_PUBLIC_APP_URL` build arg and `fly deploy` again.

## Baselining a database created with `db push`

A database set up earlier with `prisma db push` (instead of migrations) has
the tables but no `_prisma_migrations` history, so `prisma migrate deploy`
fails trying to create tables that already exist. Mark the first migration as
applied once, then deploy the rest:

```bash
DATABASE_URL=<url> npx prisma migrate resolve --applied 0001_init
DATABASE_URL=<url> npx prisma migrate deploy
```

Only do this when the schema really matches `0001_init`; if later migrations
(`0002_...`, `0003_...`) were also pushed already, mark each of them with
`migrate resolve --applied <name>` too. Check first with
`npx prisma migrate diff --from-url <url> --to-schema-datamodel prisma/schema.prisma`.

## Local Docker check

```bash
docker build -t aifood --build-arg NEXT_PUBLIC_APP_URL=http://localhost:3000 .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host.docker.internal:5432/aifood" \
  -e AUTH_SECRET=dev-secret aifood
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
