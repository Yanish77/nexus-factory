# Hermes Local Sidecar

Hermes is an optional local operations sidecar for Nexus Factory. The main app must continue to run when Hermes is disabled or unavailable.

## Safety rules

- Keep `HERMES_ENABLED=false` by default.
- Local and staging use must stay dry-run first.
- Do not store real API keys in the repo.
- Do not give Hermes Etsy, Printify, payment, email, production database, or deployment credentials.
- Do not expose Hermes publicly in production.
- If Hermes is ever deployed beyond localhost, put it behind authentication, firewalling, and reverse proxy protection.
- Nexus remains the authority for permissions, approvals, budgets, and business actions.

## Environment

Add these values to your local `.env` when needed:

```bash
HERMES_ENABLED=false
HERMES_API_URL=http://localhost:8642/v1
HERMES_API_KEY=
NEXUS_MCP_TOKEN=
HERMES_PUBLIC_DASHBOARD=false
```

Leave `HERMES_API_KEY` and `NEXUS_MCP_TOKEN` empty until you intentionally configure local-only credentials. Never commit real values.

## Run Hermes Setup Once

Run setup once before starting the local sidecar:

```bash
pnpm hermes:setup
```

This uses `nousresearch/hermes-agent:latest` and stores local Hermes runtime data under `./runtime/hermes-ultron`, mounted into the container at `/opt/data`.

## Start And Stop

Start Hermes locally:

```bash
pnpm hermes:up
```

View logs:

```bash
pnpm hermes:logs
```

Stop Hermes:

```bash
pnpm hermes:down
```

Hermes listens on `127.0.0.1:8642` for local development only.

## Safe Nexus Tools

Phase 3 exposes safe Nexus tools through internal server-side REST endpoints. MCP can be added later if the project adopts a dedicated MCP server.

```http
POST /api/hermes/tools/{tool}
Authorization: Bearer <NEXUS_MCP_TOKEN>
Content-Type: application/json
```

Request body:

```json
{
  "workflowRunId": "wf_hermes_tools",
  "autonomyLevel": "observe",
  "input": {}
}
```

Allowed tools are `get_agent_status`, `get_today_events`, `get_cost_summary`, `get_pending_approvals`, `create_internal_task`, `create_approval_request`, `request_ultron_review`, and `pause_agent`. Approval requests created by Hermes remain pending and never execute the requested action automatically.
