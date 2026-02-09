# WebDev Challenge Platform – Evaluation Engine

## What
A secure, offline evaluation engine for Node.js/Express web dev challenges. It takes a user submission (zip), runs it against hidden tests in an isolated Docker sandbox, and returns clear pass/fail/error results.

## For Whom
Junior developers and upskillers who want practical, production-style web dev challenges instead of only algorithm puzzles.

## Core Features (MVP)
- Accepts Node.js/Express challenge submissions as ZIP files
- Pre-flight validation (package.json allowlist, file/path safety, zip size limits)
- Hidden test injection per challenge config
- Docker-based sandbox with no network, strict CPU/memory/PID limits
- Jest + Supertest-based test runner for API-style challenges
- Structured results: passed/failed/error + per-test messages + logs

## Tech Stack
Backend engine: Node.js
Sandboxing: Docker (no network, non-root, read-only tests)
Testing: Jest + Supertest (express-supertest runner)
Storage: None for MVP (results returned inline; DB later)

## Quick Start (target state)
```bash
# Install deps
npm install

# Run local evaluation API (dev)
npm run dev

# Evaluate a sample submission (pseudo)
curl -X POST \
  -F "challengeId=jwt-middleware" \
  -F "submission=@submission.zip" \
  http://localhost:3000/evaluate
```

## Project Status
Current phase: Evaluation Engine MVP (planning → scaffolding)
