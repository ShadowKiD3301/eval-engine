---
sidebar_position: 3
title: API
---

# API

## `GET /health`

Returns a simple status payload when the API is up:

```json
{ "status": "ok" }
```

## `POST /evaluate`

Evaluates a submission ZIP for a given challenge.

### Request

- Content-Type: `multipart/form-data`
- Fields:
  - `challengeId` (string, required)
  - `submission` (file, required, `.zip`)

Example:

```bash
curl -X POST \
  -F "challengeId=todo-api" \
  -F "submission=@submission.zip" \
  http://localhost:3000/evaluate
```

### Success response (HTTP 200)

The API returns a normalized result object, even when the runner fails inside Docker.

```json
{
  "jobId": "job-mb7x6o3s-k2z9xn",
  "challengeId": "todo-api",
  "status": "completed",
  "exitCode": 0,
  "durationMs": 1234,
  "tests": [
    {
      "name": "TODO API Challenge GET /todos returns an array (initially empty)",
      "status": "passed",
      "message": null
    }
  ],
  "logs": ""
}
```

### Status semantics

- `completed`
  The runner succeeded and the Jest JSON indicated success. This is the current “pass” signal.
- `failed`
  The runner completed but tests failed or the exit code was non-zero.
- `error`
  The runner failed before producing valid Jest output, or Docker execution failed.

The runner itself emits `passed | failed | error`, but the API currently normalizes successful runs to `completed`. Long-term, we plan to align with `passed | failed | error`.

### Error responses

**400 Bad Request**

Missing required fields:

```json
{ "error": "Missing challengeId or submission file" }
```

**500 Internal Server Error**

An unexpected error occurred before the engine could return a normalized result (invalid challenge ID, missing config, preflight errors, etc.):

```json
{ "error": "Internal evaluation error" }
```

In this case, details are logged server-side; the client receives only the generic error payload.
