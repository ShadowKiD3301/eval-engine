---
sidebar_position: 1
title: Overview
---

# Eval Engine

Eval Engine is a secure, offline judge for Node.js/Express coding challenges. It accepts a submission ZIP, validates it, runs hidden Jest/Supertest tests inside a locked-down Docker container, and returns a deterministic result for the caller.

## Who it is for

- Platform backends that need to grade untrusted Node.js submissions
- Internal services that want a simple HTTP interface for challenge evaluation
- Challenge authors who need consistent, reproducible test outcomes

## What problems it solves

- Runs untrusted code with strict isolation (no network, limited resources)
- Prevents tampering with hidden tests and runner scripts
- Enforces dependency and file allowlists before execution
- Normalizes test output into a stable API response

## Evaluation flow (current)

1. Extract the submission ZIP into a per-job workspace
2. Preflight validation of `package.json`, allowed deps, required files
3. Run the challenge inside Docker using the runner image
4. Runner executes hidden tests and emits JSON
5. Engine normalizes the result and returns it to the API

## Key concepts

- `challengeId`
  A strict slug (lowercase letters, digits, and dashes only) that selects a challenge directory under `challenges/<id>/`.

- Submission ZIP
  A zipped Node.js project containing at least `package.json` and the required files specified in the challenge config.

- Workspace
  A per-job directory on the host, created at `/tmp/eval/<jobId>/workspace`, where the submission is extracted.

- Preflight
  Validation that blocks unsafe or non-compliant submissions before Docker runs. It enforces:
  - Dependency allowlist
  - Disallowed lifecycle scripts in `package.json`
  - Required files and allowed paths

- Sandbox
  A Docker container with network disabled and strict resource limits. The container mounts:
  - `/workspace` (submission, read-write)
  - `/challenge/tests` (hidden tests, read-only)
  - `/runner` (runner scripts, read-only)

- Runner
  A challenge-specific execution script (MVP: `express-supertest`) that imports the user’s app, runs Jest/Supertest, and prints a JSON result line.

- Result normalization
  The engine converts raw runner output into a stable response shape. Today, a successful run is reported as `status: "completed"` even though the runner emits `passed`. Long-term, the API will align with `passed | failed | error`.
