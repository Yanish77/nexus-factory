# Hermes Starter Skills

These folders are copy-ready starter skills for Hermes Agent. They are documentation artifacts only.

Do not copy these skills into `runtime/hermes-ultron` automatically. If Hermes later supports local skill installation, copy only the specific skill folder you want to test, review the `SKILL.md`, and keep all secrets out of the runtime directory.

## Skills

- `nexus-daily-audit`
- `nexus-token-review`
- `nexus-approval-review`
- `nexus-agent-debugging`
- `nexus-ultron-brief`
- `nexus-dry-run-workflow-review`

All skills assume Hermes can only use safe Nexus tools through authenticated backend routes. Hermes must never receive Etsy, Printify, payment, email, production database, or deployment credentials.
