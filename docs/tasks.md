# Tasks – Evaluation Engine MVP

## In Progress

## Ready to Start
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
- [x] TSK-008 **Fix runner NODE_PATH / test discovery inside Docker**
  - Notes:
    - Docker now sets `NODE_PATH=/app/node_modules:/deps/<challengeId>/node_modules` so the runner can `require('jest')`.
    - Ensures the mounted workspace root is writable by the non-root container user (chmod 0777) so the runner can materialize tests.
    - Runner copies hidden tests into `/workspace/challenge/tests` so relative imports like `../../src/app` resolve correctly.

- [x] TSK-000 **PRD & Initial Architecture Draft**
  - Notes: `docs/prd.md` and `docs/architecture.md` created for Evaluation Engine MVP.

- [x] TSK-001 **Project Scaffolding**
  - Notes:
    - `npm init` and base deps installed (express, multer, jest, supertest)
    - `index.js` + `src/server.js` created with `/health` and `POST /evaluate`
    - `engine/` folder scaffolded with `evaluateJob`, `extractZip`, `preflight`, `dockerRun`, `resultFormat` stubs wired into `/evaluate`.

- [x] TSK-002 **ZIP Extraction + Safety Checks**
  - Notes:
    - Implemented `engine/extractZip.js` using `yauzl` for streaming extraction.
    - Enforces path traversal protection (`..`, absolute paths, drive letters).
    - Enforces max extracted size with a running byte counter (default 20MB).
    - Rejects non-zip buffers with a clear `Invalid ZIP data` error.
    - Returns `{ workspaceDir }` on successful extraction.
