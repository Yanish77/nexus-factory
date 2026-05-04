# Hostinger VPS Deployment

This guide prepares Nexus Factory and Hermes for a Hostinger VPS using Docker Compose.

## Security Defaults

- `LIVE_MODE=false` by default.
- `DRY_RUN_DEFAULT=true` by default.
- `HERMES_PUBLIC_DASHBOARD=false` by default.
- Hermes is internal-only and is not published to the host.
- Nexus web may be exposed publicly through `NEXUS_WEB_PORT`.
- Set `HERMES_ENABLED=true` only after `HERMES_API_KEY` and `NEXUS_MCP_TOKEN` are configured.
- Hermes must not receive Etsy, Printify, payment, email, production database, or deployment credentials.
- Hermes cannot bypass approval gates; Nexus backend remains the authority for approvals, budgets, permissions, and business actions.

## Files

- `docker-compose.hostinger.yml`
- `.env.hostinger.example`
- `scripts/smoke-hostinger.sh`

## First Deploy

1. Copy the example environment file on the VPS:

```bash
cp .env.hostinger.example .env.hostinger
```

2. Edit `.env.hostinger` on the VPS and replace placeholder values:

```bash
POSTGRES_PASSWORD=use-a-long-random-password
HERMES_API_KEY=use-a-local-hermes-token
NEXUS_MCP_TOKEN=use-a-long-random-token
```

3. Keep Hermes disabled until both Hermes secrets are configured:

```bash
HERMES_ENABLED=false
```

4. Start the stack:

```bash
docker compose --env-file .env.hostinger -f docker-compose.hostinger.yml up -d
```

5. Check service health:

```bash
docker compose --env-file .env.hostinger -f docker-compose.hostinger.yml ps
```

6. Run the smoke test:

```bash
sh scripts/smoke-hostinger.sh
```

## Enabling Hermes

After `HERMES_API_KEY` and `NEXUS_MCP_TOKEN` are configured in `.env.hostinger`, set:

```bash
HERMES_ENABLED=true
```

Then restart Nexus web and worker:

```bash
docker compose --env-file .env.hostinger -f docker-compose.hostinger.yml up -d nexus-web nexus-worker hermes-ultron
```

Hermes must remain internal to Docker. Do not add a `ports` mapping for `hermes-ultron`.

## Services

- `nexus-web`: public Next.js web app on `${NEXUS_WEB_PORT:-3000}`.
- `nexus-worker`: background worker placeholder for queue processing.
- `postgres`: persistent Postgres database.
- `redis`: persistent Redis queue/cache service.
- `hermes-ultron`: internal Hermes sidecar on Docker network port `8642`.

## Backups

### Postgres

Create a compressed SQL backup:

```bash
mkdir -p backups
docker compose --env-file .env.hostinger -f docker-compose.hostinger.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "backups/postgres-$(date +%Y%m%d-%H%M%S).sql.gz"
```

Restore a backup into Postgres:

```bash
gunzip -c backups/postgres-YYYYMMDD-HHMMSS.sql.gz | \
  docker compose --env-file .env.hostinger -f docker-compose.hostinger.yml exec -T postgres \
  psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

### Hermes Data Directory

Hermes data is stored in the Docker volume `hermes-data`.

Create a tar backup:

```bash
mkdir -p backups
docker run --rm \
  -v nexus-factory_hermes-data:/data:ro \
  -v "$PWD/backups:/backups" \
  alpine tar czf "/backups/hermes-data-$(date +%Y%m%d-%H%M%S).tar.gz" -C /data .
```

Restore a tar backup:

```bash
docker run --rm \
  -v nexus-factory_hermes-data:/data \
  -v "$PWD/backups:/backups" \
  alpine sh -lc "cd /data && tar xzf /backups/hermes-data-YYYYMMDD-HHMMSS.tar.gz"
```

### Environment Files

Back up environment files separately and store them securely:

```bash
mkdir -p backups/private
cp .env.hostinger "backups/private/env-hostinger-$(date +%Y%m%d-%H%M%S)"
chmod 600 backups/private/env-hostinger-*
```

Never commit `.env.hostinger`, production secrets, or backup files.

## Smoke Test

The smoke test is safe for production-style dry-run deployments. It does not require
live Etsy, Printify, payment, email, publishing, or deployment credentials.

The smoke test checks:

- Docker Compose config is valid.
- Hermes port `8642` is not publicly exposed.
- Redis, Postgres, and worker services are healthy.
- Nexus health endpoint responds.
- Optional database, queue, and worker health API endpoints if they exist.
- Hermes health through the Nexus backend.
- Event API.
- Agent status API.
- Dry-run workflow trigger.
- Approval inbox API.
- Cost/model routing API.
- Nexus can reach Hermes over the internal Docker network when Hermes is enabled.

Run:

```bash
sh scripts/smoke-hostinger.sh
```

By default the script checks `http://127.0.0.1:${NEXUS_WEB_PORT:-3000}` from the VPS.
If Nexus is only reachable through the public Traefik hostname, pass `NEXUS_BASE_URL`:

```bash
NEXUS_BASE_URL="https://your-nexus-host.example" sh scripts/smoke-hostinger.sh
```

You can also override the compose and environment files:

```bash
COMPOSE_FILE=docker-compose.hostinger.yml ENV_FILE=.env.hostinger sh scripts/smoke-hostinger.sh
```

## Notes

This compose file uses `node:22-alpine` directly because the project does not yet include a production Dockerfile. When a Dockerfile and real worker entrypoint are added, replace the `nexus-web` and `nexus-worker` commands with the production image commands.
