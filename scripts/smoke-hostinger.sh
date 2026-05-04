#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.hostinger.yml}"
ENV_FILE="${ENV_FILE:-.env.hostinger}"
WEB_PORT="${NEXUS_WEB_PORT:-3000}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Copy .env.hostinger.example to $ENV_FILE and fill VPS values." >&2
  exit 1
fi

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

echo "Checking Docker Compose config..."
compose config >/dev/null

echo "Checking service status..."
compose ps

echo "Checking Nexus web health..."
if ! curl -fsS "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null; then
  echo "Nexus web health check failed on port ${WEB_PORT}." >&2
  exit 1
fi

echo "Checking that Hermes port 8642 is not publicly exposed..."
if compose port hermes-ultron 8642 >/tmp/hermes-port.out 2>/dev/null && [ -s /tmp/hermes-port.out ]; then
  echo "Hermes port 8642 is publicly exposed. Remove host port publishing for hermes-ultron." >&2
  cat /tmp/hermes-port.out >&2
  rm -f /tmp/hermes-port.out
  exit 1
fi
rm -f /tmp/hermes-port.out

echo "Checking Postgres from its container..."
compose exec -T postgres sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

echo "Checking Redis from its container..."
compose exec -T redis redis-cli ping >/dev/null

echo "Checking worker readiness..."
compose exec -T nexus-worker test -f /tmp/nexus-worker-ready

HERMES_ENABLED_VALUE="$(grep -E '^HERMES_ENABLED=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- | tr -d '"')"
if [ "$HERMES_ENABLED_VALUE" = "true" ]; then
  echo "Checking internal Hermes health from Nexus web container..."
  compose exec -T nexus-web sh -lc 'wget -qO- "$HERMES_API_URL/health" >/dev/null 2>&1 || wget -qO- "http://hermes-ultron:8642/health" >/dev/null 2>&1 || wget -qO- "http://hermes-ultron:8642/v1/health" >/dev/null 2>&1'
else
  echo "Hermes is disabled; skipping internal Hermes health request."
fi

echo "Hostinger smoke test passed."
