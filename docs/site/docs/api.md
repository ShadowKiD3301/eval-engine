---
sidebar_position: 2
title: API
---

# API

## `GET /health`

Returns:

```json
{ "status": "ok" }
```

## `POST /evaluate`

Evaluates a submission for a given challenge.

### Request

- Content-Type: `multipart/form-data`
- Fields:
  - `challengeId` (string)
  - `submission` (file, `.zip`)

Example:

```bash
curl -X POST \
  -F "challengeId=todo-api" \
  -F "submission=@submission.zip" \
  http://localhost:3000/evaluate
```

### Response (normalized)

```json
{
  "jobId": "job-...",
  "challengeId": "todo-api",
  "status": "passed | failed | error | completed",
  "exitCode": 0,
  "durationMs": 1234,
  "tests": [
    {
      "name": "...",
      "status": "passed | failed",
      "message": "...optional failure message..."
    }
  ],
  "logs": "..."
}
```

Notes:
- `status` comes from the runner; some historical code paths may emit `completed`.
- `tests[]` is derived from Jest JSON results when available.
