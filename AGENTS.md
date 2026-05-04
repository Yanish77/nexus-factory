# AGENTS.md

You are helping build Nexus Factory, a gamified autonomous AI business dashboard.

## Product goal

Build a web app where multiple AI agents operate business workflows, report progress through a game-like dashboard, and require human approval before risky actions.

## Hard rules

- Never commit secrets.
- Never ask for or store raw API keys in code.
- Use .env.example for required environment variables.
- All external business actions must support dry-run mode.
- Publishing, spending money, refunding, customer messaging, and production deployment require human approval.
- Prefer tests before implementation.
- Prefer typed interfaces and structured JSON outputs.
- Keep model routing centralized.
- Only the supervisor agent may use gpt-5.5.
- Specialist agents should use cheaper models by default.
- Every agent action must be logged as an event.
- Every tool call must be auditable.
- Build MVP first; avoid overengineering.

## Suggested stack

- Next.js app router
- TypeScript
- Prisma
- Postgres
- Redis + BullMQ
- OpenAI Agents SDK or Responses API
- WebSocket or SSE event stream
- Docker Compose for local development
- Playwright/Vitest for tests

## MVP business

Start with an Etsy/Printify-style print-on-demand workflow in draft-only mode.

## Initial agents

- Ultron: supervisor, gpt-5.5
- Trend Scout: research, gpt-5.4-mini
- Listing Writer: listing copy, gpt-5.4-mini or nano
- Design Brief Agent: design ideas, gpt-5.4-mini
- QA Agent: policy/copyright/quality review, gpt-5.4-mini
- Store Ops Agent: order/status drafts, gpt-5.4-mini

## Approval policy

Human approval required for:
- live product publishing
- spending money
- customer messages
- refunds
- production deploys
- new API credentials
- changing model routing
