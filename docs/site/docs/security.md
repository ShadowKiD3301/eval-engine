---
sidebar_position: 4
title: Security model
---

# Security model

**Threat model:** submissions are untrusted code.

## Controls (MVP)

- **Docker sandbox**
  - network disabled (`--network none`)
  - non-root container user
  - resource limits (CPU/memory/PIDs)
  - hard timeout

- **Hidden tests are read-only**
  - mounted into container under `/challenge/tests:ro`

- **Dependency allowlist**
  - preflight rejects submissions that add deps outside `allowedDependencies`

- **ZIP safety**
  - path traversal protection
  - maximum extracted size

## Important operational notes

- The Docker runner image contains runner deps (`jest`, `supertest`) under `/app/node_modules`.
- Challenge-specific deps are baked under `/deps/<challengeId>/node_modules`.
- The engine sets `NODE_PATH=/app/node_modules:/deps/<challengeId>/node_modules`.
