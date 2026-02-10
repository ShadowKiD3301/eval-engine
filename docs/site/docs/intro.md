---
sidebar_position: 1
title: Overview
---

# Eval Engine

Eval Engine is a secure, offline **evaluation engine** for Node.js/Express coding challenges.

It accepts a user submission as a **ZIP file**, runs **pre-flight validation**, executes **hidden Jest + Supertest tests** inside a locked-down **Docker container** (no network), and returns structured results.

## What you get

- Deterministic results: `passed | failed | error`
- Per-test outcome list (name + status + failure message)
- Captured logs (stdout/stderr)
- A simple API: `POST /evaluate`

## Quick start (local)

```bash
cd eval-engine
npm install

# Build the runner image used for sandboxed execution
npm run build:runner-image

# Start the API
npm run dev
# API: http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/health
```

Evaluate a submission:

```bash
curl -X POST \
  -F "challengeId=jwt-middleware" \
  -F "submission=@submission.zip" \
  http://localhost:3000/evaluate
```
