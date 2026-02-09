# Architecture – Evaluation Engine

## Overview
The evaluation engine is a secure, offline judge for Node.js/Express challenges. It receives a submission as a ZIP file, validates and extracts it, injects hidden tests for a given challenge, runs tests inside a locked-down Docker container, and returns structured results.

This engine will later plug into a larger "WebDev Challenge Platform" that provides IDE, challenge catalog, accounts, and progress tracking.

## Core Components

1. **API Layer (thin Express/Fastify server)**
   - `POST /evaluate`: accepts `challengeId` + `submission.zip` via multipart form-data
   - Validates basic payload (file presence, size)
   - Calls the Evaluation Engine core
   - Returns normalized JSON result

2. **Evaluation Engine Core**
   - Extracts submission ZIP into a per-job workspace
   - Runs pre-flight checks:
     - Safe paths (no `../` or absolute paths)
     - Max extracted size
     - `package.json` dependency allowlist
     - `scripts` restrictions (no lifecycle hooks like `postinstall`)
     - File/dir allowlist (e.g. user only edits `src/**`)
   - Loads challenge config (`challenges/<id>/config.json`)
   - Prepares volumes for Docker:
     - User workspace (read-write)
     - Hidden tests (read-only)
     - Runner scripts (read-only)
   - Spawns Docker container with strict limits
   - Executes the challenge runner (e.g. `express-supertest`)
   - Captures stdout/stderr, exit code, duration
   - Normalizes and returns result JSON

3. **Challenge Definitions**
   - One folder per challenge under `challenges/`
   - Example: `challenges/jwt-middleware/`
   - Contains:
     - `config.json`: runner type, entry file, allowed deps, paths, timeouts
     - `tests/`: hidden Jest test files (not visible to end users)

4. **Runners**
   - Pluggable runner system that understands how to execute tests for a given type of challenge.
   - MVP runner: `express-supertest`
     - Imports Express app from `entry` (e.g. `src/app.js`)
     - Runs hidden Jest + Supertest tests
     - Produces normalized result JSON (see `runner/express-supertest-result-shape.md`)

5. **Docker Runner Image**
   - Prebuilt Node.js base image (e.g. `node:18-alpine`)
   - Includes:
     - Node runtime
     - Jest + Supertest
     - Shared runner scripts
   - Used by the engine core to run user code in isolation.

## Data Flow

1. Client calls `POST /evaluate` with `challengeId` and `submission.zip`.
2. API validates payload and hands off to Engine Core.
3. Engine Core creates a job ID and workspace: `/tmp/eval/<jobId>/workspace`.
4. ZIP is safely extracted (path + size checks).
5. Engine loads `challenges/<challengeId>/config.json`.
6. Pre-flight validation runs against the extracted workspace and config.
7. If pre-flight fails → engine returns `status: "error"` with reason.
8. If pre-flight passes:
   - Engine mounts:
     - workspace → container `/workspace` (rw)
     - challenge tests → `/challenge/tests` (ro)
     - runner scripts → `/runner` (ro)
   - Starts Docker container with:
     - no network
     - limited CPU/memory/PIDs
     - non-root user, dropped capabilities
   - Runs runner command (e.g. `node /runner/run-express-supertest.js`).
9. Runner:
   - Imports `entry` app from `/workspace/src/app.js`.
   - Invokes Jest with hidden tests and `--json --runInBand`.
   - Parses Jest JSON into per-test results.
   - Distinguishes between `passed`, `failed`, `error` states.
10. Engine collects runner result + raw logs, truncates logs, and returns final JSON.

## Security Model

**Threat model:** Untrusted user code runs on our infrastructure. We must assume:
- Users may try to escape the container.
- Users may attempt to access the network.
- Users may attempt resource exhaustion (CPU, memory, disk, PIDs).

**Controls (MVP):**
- No network: `--network none` or equivalent.
- Non-root user inside container.
- Drop Linux capabilities, no privileged mode.
- No Docker socket or sensitive host mounts.
- Read-only mounts for tests and runner scripts.
- Limited CPU (e.g. 0.5–1 core) and memory (e.g. 256–512MB).
- PID limit (e.g. 64).
- Hard timeout (default 10s) → kill container if exceeded.

## Challenge Runners (Extensibility)

Runners are configured by `config.json`:

```jsonc
{
  "id": "jwt-middleware",
  "runner": "express-supertest",
  "entry": "src/app.js",
  "timeoutSec": 10,
  "allowedDependencies": ["express", "jsonwebtoken"],
  "allowedPaths": ["src/"],
  "requiredFiles": ["src/app.js"]
}
```

The core only needs to know how to:
- Look up runner type (`express-supertest`)
- Pass the workspace + challenge config into the runner
- Interpret the runner's result shape

Future runners (out of scope for MVP) could include `browser-runner`, `worker-runner`, etc.

## Non-Functional Requirements

- **Performance:** Typical evaluation < 5 seconds; hard timeout 10 seconds.
- **Reliability:** Malformed zips or bad projects should not crash the engine.
- **Determinism:** Same submission + same challenge → same result.
- **Observability:** Log pre-flight errors, Docker failures, and timeouts with enough detail to debug.

## Open Questions / To Refine

- Exact Docker CLI vs. Node Docker client library.
- Log storage strategy (inline only vs. optional DB for history).
- How to version tests/challenges as the platform grows.
