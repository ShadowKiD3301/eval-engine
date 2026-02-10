---
sidebar_position: 3
title: Challenges
---

# Challenges

Challenges live under:

```
challenges/<challengeId>/
  config.json
  tests/              # hidden tests (server-side)
```

## Challenge config

Example:

```json
{
  "id": "todo-api",
  "runner": "express-supertest",
  "entry": "src/app.js",
  "timeoutSec": 10,
  "allowedDependencies": ["express"],
  "allowedPaths": ["src/"],
  "requiredFiles": ["src/app.js"],
  "description": "Build a RESTful TODO API..."
}
```

Key fields:
- `runner`: which runner implementation to use (MVP: `express-supertest`)
- `entry`: where the submission exports an Express app
- `timeoutSec`: hard evaluation timeout
- `allowedDependencies`: allowlist enforced by preflight
- `allowedPaths` + `requiredFiles`: file policy / minimum structure

## Included challenges

### `jwt-middleware`
- Focus: JWT auth middleware + protected routes
- Allowed deps: `express`, `jsonwebtoken`

### `todo-api`
- Focus: CRUD REST API behavior + status codes
- Allowed deps: `express`

## Adding a new challenge

1. Create `challenges/<id>/config.json`
2. Add hidden tests to `challenges/<id>/tests/*.test.js`
3. Add runtime deps for the sandbox image:

```
docker/challenges/<id>/package.json
```

4. Update `docker/Dockerfile` to install/copy `/deps/<id>/node_modules`
5. Rebuild:

```bash
npm run build:runner-image
```
