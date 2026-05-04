# AGENTS.md

You are helping build Nexus Factory, a gamified autonomous AI business dashboard.

## Product goal

Build a web app where multiple AI agents run business workflows, report progress through a game-like dashboard, and require human approval before risky actions.

## Core rules

- Build the MVP first; avoid overengineering.
- Never commit secrets or hard-code credentials.
- Never ask for, store, or display raw API keys in app code or logs.
- Use `.env.example` for required environment variables.
- All external business actions must support dry-run mode.
- Human approval is required before publishing, spending money, refunding, messaging customers, deploying to production, creating API credentials, or changing model routing.
- Prefer tests before implementation.
- Prefer typed interfaces and structured JSON outputs.
- Keep model routing centralized.
- Only the supervisor agent may use `gpt-5.5`.
- Specialist agents should use cheaper models by default.
- Every agent action must be logged as an event.
- Every tool call must be auditable.

## Suggested stack

- Next.js App Router
- TypeScript
- Prisma
- Postgres
- Redis + BullMQ
- OpenAI Agents SDK or Responses API
- WebSocket or SSE event stream
- Docker Compose for local development
- Playwright and Vitest for tests

## MVP business

Start with an Etsy/Printify-style print-on-demand workflow in draft-only mode.

## Initial agents

- Ultron: supervisor, `gpt-5.5`
- Trend Scout: research, `gpt-5.4-mini`
- Listing Writer: listing copy, `gpt-5.4-mini` or a cheaper approved model
- Design Brief Agent: design ideas, `gpt-5.4-mini`
- QA Agent: policy, copyright, and quality review, `gpt-5.4-mini`
- Store Ops Agent: order and status drafts, `gpt-5.4-mini`

## Verification

Before finishing a change, run the most relevant available checks and summarize what passed, what failed, and what could not be run.
