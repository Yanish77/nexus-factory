#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.hostinger.yml}"
ENV_FILE="${ENV_FILE:-.env.hostinger}"
BASE_URL="${NEXUS_BASE_URL:-}"
WEB_PORT="${NEXUS_WEB_PORT:-3000}"

if [ -z "$BASE_URL" ]; then
  BASE_URL="http://127.0.0.1:${WEB_PORT}"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Copy .env.hostinger.example to $ENV_FILE and fill VPS values." >&2
  exit 1
fi

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

request() {
  method="$1"
  path="$2"
  output_file="$3"
  status_file="$4"

  curl -sS -X "$method" \
    -H "content-type: application/json" \
    -o "$output_file" \
    -w "%{http_code}" \
    "${BASE_URL}${path}" >"$status_file"
}

assert_api() {
  name="$1"
  method="$2"
  path="$3"
  expected_status="${4:-200}"

  body_file="$(mktemp)"
  status_file="$(mktemp)"

  if ! request "$method" "$path" "$body_file" "$status_file"; then
    echo "FAIL: $name did not respond at ${BASE_URL}${path}" >&2
    rm -f "$body_file" "$status_file"
    exit 1
  fi

  status="$(cat "$status_file")"
  if [ "$status" != "$expected_status" ]; then
    echo "FAIL: $name returned HTTP $status, expected $expected_status." >&2
    cat "$body_file" >&2
    echo >&2
    rm -f "$body_file" "$status_file"
    exit 1
  fi

  if ! grep -Eq '\{|\[' "$body_file"; then
    echo "FAIL: $name did not return JSON-like output." >&2
    cat "$body_file" >&2
    echo >&2
    rm -f "$body_file" "$status_file"
    exit 1
  fi

  echo "PASS: $name"
  rm -f "$body_file" "$status_file"
}

optional_api() {
  name="$1"
  path="$2"

  body_file="$(mktemp)"
  status_file="$(mktemp)"

  if ! request "GET" "$path" "$body_file" "$status_file"; then
    echo "SKIP: $name endpoint is unavailable."
    rm -f "$body_file" "$status_file"
    return
  fi

  status="$(cat "$status_file")"
  case "$status" in
    200)
      echo "PASS: $name"
      ;;
    404)
      echo "SKIP: $name endpoint is not implemented."
      ;;
    *)
      echo "FAIL: $name returned HTTP $status." >&2
      cat "$body_file" >&2
      echo >&2
      rm -f "$body_file" "$status_file"
      exit 1
      ;;
  esac

  rm -f "$body_file" "$status_file"
}

env_value() {
  key="$1"
  grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- | tr -d '"' || true
}

echo "Checking Docker Compose config..."
compose config >/dev/null

echo "Checking service status..."
compose ps

echo "Checking that Hermes port 8642 is not publicly exposed..."
if compose port hermes-ultron 8642 >/tmp/hermes-port.out 2>/dev/null && [ -s /tmp/hermes-port.out ]; then
  echo "FAIL: Hermes port 8642 is publicly exposed. Remove host port publishing for hermes-ultron." >&2
  cat /tmp/hermes-port.out >&2
  rm -f /tmp/hermes-port.out
  exit 1
fi
rm -f /tmp/hermes-port.out
echo "PASS: Hermes is not publicly exposed on host port 8642"

echo "Checking container-level dependencies..."
compose exec -T postgres sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null
echo "PASS: Postgres container connectivity"

compose exec -T redis redis-cli ping >/dev/null
echo "PASS: Redis container connectivity"

compose exec -T nexus-worker test -f /tmp/nexus-worker-ready
echo "PASS: Worker container readiness"

echo "Checking Nexus safe HTTP APIs at ${BASE_URL}..."
assert_api "Nexus health endpoint" "GET" "/api/health" "200"
optional_api "Database connectivity API" "/api/health/database"
optional_api "Redis or queue health API" "/api/health/queue"
optional_api "Worker health API" "/api/health/worker"
assert_api "Hermes health through Nexus backend" "GET" "/api/hermes/health" "200"
assert_api "Event API" "GET" "/api/events" "200"
assert_api "Agent status API" "GET" "/api/agents" "200"
assert_api "Dry-run workflow trigger" "POST" "/api/workflows" "201"
assert_api "Approval inbox API" "GET" "/api/approvals" "200"
assert_api "Cost and model routing API" "GET" "/api/costs" "200"

HERMES_ENABLED_VALUE="$(env_value HERMES_ENABLED)"
if [ "$HERMES_ENABLED_VALUE" = "true" ]; then
  echo "Checking internal Hermes health from Nexus web container..."
  compose exec -T nexus-web sh -lc 'wget -qO- "$HERMES_API_URL/health" >/dev/null 2>&1 || wget -qO- "http://hermes-ultron:8642/health" >/dev/null 2>&1 || wget -qO- "http://hermes-ultron:8642/v1/health" >/dev/null 2>&1'
  echo "PASS: Internal Hermes health from Nexus container"
else
  echo "SKIP: Hermes is disabled; Nexus backend health endpoint still returned safely."
fi

echo "Hostinger smoke test passed. No live Etsy, Printify, payment, email, or publishing calls were required."
