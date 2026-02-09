# Tasks – Evaluation Engine MVP

## In Progress

## Ready to Start
- [ ] TSK-002 **ZIP Extraction + Safety Checks**
  - Scope: Implement ZIP extraction into `/tmp/eval/<jobId>/workspace` with size and path traversal protections.
  - Acceptance:
    - Rejects non-zip payloads
    - Rejects zip entries with `../` or absolute paths
    - Enforces max extracted size (e.g. 20 MB)

- [ ] TSK-003 **Pre-flight Validation (package.json + file allowlist)**
  - Scope: Parse `package.json` and enforce dependency + scripts policy and allowed paths.
  - Acceptance:
    - Rejects submissions with dependencies outside `allowedDependencies`
    - Rejects dangerous scripts (`postinstall`, `prepare`, etc.)
    - Ensures only `allowedPaths` are modified (e.g. `src/**`)

- [ ] TSK-004 **Docker Runner Integration**
  - Scope: Implement Docker invocation with correct mounts, limits, and timeout handling.
  - Acceptance:
    - Starts container with no network and resource limits
    - Mounts workspace (rw), tests (ro), runner scripts (ro)
    - Kills container on timeout and returns `status: "error"`

- [ ] TSK-005 **express-supertest Runner Implementation**
  - Scope: Implement runner script that imports `src/app.js`, runs Jest + Supertest hidden tests, and returns normalized results.
  - Acceptance:
    - Distinguishes `passed` vs `failed` vs `error` (import/syntax issues)
    - Produces result JSON matching `runner/express-supertest-result-shape.md`

- [ ] TSK-006 **Result Normalization & API Response**
  - Scope: Wrap runner output into final engine response with log truncation.
  - Acceptance:
    - API returns `jobId`, `challengeId`, `status`, `durationMs`, `tests`, `logs`
    - Logs truncated to max size (e.g. 64KB)

## Blocked
- [ ] TSK-007 **Persistent Storage for Submissions/Results**
  - Blocker: Decide on DB (Postgres vs. SQLite) and schema integration timing.

## Done ✓
- [x] TSK-000 **PRD & Initial Architecture Draft**
  - Notes: `docs/prd.md` and `docs/architecture.md` created for Evaluation Engine MVP.

- [x] TSK-001 **Project Scaffolding**
  - Notes:
    - `npm init` and base deps installed (express, multer, jest, supertest)
    - `index.js` + `src/server.js` created with `/health` and `POST /evaluate`
    - `engine/` folder scaffolded with `evaluateJob`, `extractZip`, `preflight`, `dockerRun`, `resultFormat` stubs wired into `/evaluate`.
