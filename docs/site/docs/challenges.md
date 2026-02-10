---
sidebar_position: 6
title: Challenges
---

# Challenges

Each challenge lives under `challenges/<challengeId>/` with a `config.json` and hidden Jest tests.

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
  "description": "Build a RESTful TODO API with CRUD endpoints, validation, and proper HTTP status codes."
}
```

Key fields:

- `runner`: runner implementation (MVP: `express-supertest`)
- `entry`: relative path to the user’s Express app export
- `timeoutSec`: hard execution timeout
- `allowedDependencies`: allowlist enforced during preflight
- `allowedPaths`: directories that users may modify
- `requiredFiles`: files that must exist in the submission

## Existing challenges

### `jwt-middleware`

Contract (from hidden tests):

- App exported from `src/app.js`
- Uses `express.json()` for JSON bodies
- `POST /login` returns a JWT for valid credentials
- `GET /profile` and `GET /admin` are protected by JWT middleware
- `GET /public` is accessible without a token

Allowed dependencies:

- `express`
- `jsonwebtoken`

### `todo-api`

Contract (from hidden tests):

- App exported from `src/app.js`
- `GET /todos` returns an array (initially empty)
- `POST /todos` validates input and creates a todo
- `GET /todos/:id`, `PATCH /todos/:id`, `DELETE /todos/:id` behave as expected

Allowed dependencies:

- `express`

## Add a new challenge (end-to-end)

1. Create a new directory:

```
challenges/<id>/
```

2. Add `config.json` with allowed deps, allowed paths, and required files.

3. Add hidden tests under:

```
challenges/<id>/tests/*.test.js
```

4. Add runtime dependencies for the container image:

```
docker/challenges/<id>/package.json
```

5. Update `docker/Dockerfile` to copy `/deps/<id>/node_modules` into the final image.

6. Rebuild the runner image:

```bash
npm run build:runner-image
```

7. Restart the API and evaluate a submission using the new `challengeId`.
