# PRD: Evaluation Engine (MVP)

**Product:** WebDev Challenge Platform
**Component:** Evaluation Engine (Sandbox + Runner)
**Version:** 1.0
**Date:** Feb 9, 2026
**Status:** Draft

---

## 1. Executive Summary

### 1.1 Goal

Build a secure, offline **Node.js code evaluation engine** that:

* Accepts a **user submission as a ZIP file**.
* Evaluates it against **hidden tests**.
* Returns a deterministic result: **Passed / Failed / Error**, plus logs.

This component is the first system to be built. All other platform features (challenge CRUD, frontend IDE, accounts, etc.) are considered external and will integrate later.

### 1.2 MVP Focus

The MVP supports **Express + Node.js challenges** that are testable using:

* **⁸Jest + Supertest**
* No real network access
* No real port binding requirement

### 1.3 Core Principle

This engine is not “running tests.”

It is a **secure offline judge**.

---

## 2. Problem Statement

A user uploads JavaScript/Node.js code. The system must:

* Execute the code safely.
* Prevent internet access.
* Prevent resource abuse.
* Prevent tampering with the hidden test suite.
* Produce reliable pass/fail output.

---

## 3. Users & Use Cases

### 3.1 Primary User

* Internal system (API layer / Orchestrator) that submits evaluation jobs.

### 3.2 Use Cases

1. **Evaluate submission**

   * Input: `challengeId`, `submission.zip`
   * Output: status + logs

2. **Reject unsafe submission**

   * Input: zip with banned dependencies / forbidden files
   * Output: `Error` with reason

3. **Handle malicious code**

   * Infinite loop
   * Process spawn attempts
   * Network calls
   * Output: `Error` or `Failed` with controlled logs

---

## 4. Scope

### 4.1 In Scope (MVP)

* ZIP ingestion
* Extraction to isolated workspace
* Pre-flight validation
* Hidden test injection
* Docker-based execution
* Strict sandbox limits
* Captured logs
* Result object returned to caller

### 4.2 Out of Scope (MVP)

* Queue system (BullMQ)
* User accounts
* Challenge CRUD UI
* Web IDE
* React / browser evaluation
* Plagiarism detection
* Leaderboards
* Multi-language support

---

## 5. Functional Requirements

### 5.1 Submission Input

**EE-FR-01**: The engine must accept submissions as a `.zip` file.

* The zip contains a Node.js project folder.
* The engine must support typical structures:

  * `src/`
  * `package.json`
  * `README.md` (optional)

**EE-FR-02**: The engine must reject:

* Non-zip inputs
* Zip bombs (compressed size vs extracted size ratio)
* Missing required files

---

### 5.2 Workspace & File Handling

**EE-FR-03**: The engine must extract the zip into a per-job isolated workspace.

* Example: `/tmp/eval/{jobId}/workspace`

**EE-FR-04**: The engine must enforce a maximum extracted size.

* Default: 20 MB

**EE-FR-05**: The engine must prevent path traversal.

* Reject any zip entry containing `../` or absolute paths.

---

### 5.3 Pre-flight Validation (Critical)

**EE-FR-06**: The engine must parse `package.json` and enforce a dependency allowlist.

**MVP Rule:**

* Users may not add arbitrary dependencies.
* Only dependencies provided in the starter template are allowed.

**EE-FR-07**: The engine must reject submissions that:

* Modify `scripts.test` to non-test commands
* Add `postinstall`, `prepare`, `preinstall` scripts
* Add dependencies outside the allowlist

**EE-FR-08**: The engine must enforce a file whitelist.

* Users may only modify specific files.
* Example:

  * Allowed: `src/**`
  * Disallowed: `tests/**`, `.github/**`, `Dockerfile`, runner scripts

---

### 5.4 Hidden Test Injection

**EE-FR-09**: The engine must inject hidden tests from a trusted server path.

* Example: `/opt/challenges/{challengeId}/tests`

**EE-FR-10**: Hidden tests must be mounted read-only inside the container.

**EE-FR-11**: The engine must inject a minimal test runner entry.

* Example: `/runner/run-tests.js`

---

### 5.5 Execution Model (MVP)

**EE-FR-12**: The engine must run tests using the **Express-Supertest runner**.

**Assumption enforced by challenge templates:**

* User exports `app` from a known path, e.g. `src/app.js`.

**EE-FR-13**: The engine must not require opening ports.

---

### 5.6 Sandbox & Security Requirements (Non-Negotiable)

**EE-FR-14**: Docker containers must run with network disabled.

* Equivalent of: `--network none`

**EE-FR-15**: Containers must run with strict resource limits.

* CPU limit (example: 0.5–1 core)
* Memory limit (example: 256–512MB)
* PIDs limit (example: 64)

**EE-FR-16**: Containers must run with:

* No privileged mode
* No Docker socket mount
* Read-only root filesystem

**EE-FR-17**: The engine must enforce a hard timeout.

* Default: 10 seconds
* Kill container if exceeded

**EE-FR-18**: The engine must prevent container escape vectors.

* Drop Linux capabilities
* Use non-root user inside container

---

### 5.7 Logs & Output

**EE-FR-19**: The engine must capture:

* stdout
* stderr
* exit code

**EE-FR-20**: The engine must return a structured result:

```json
{
  "jobId": "uuid",
  "challengeId": "jwt-middleware",
  "status": "passed | failed | error",
  "exitCode": 0,
  "durationMs": 4123,
  "logs": "..."
}
```

**EE-FR-21**: The engine must truncate logs.

* Default max: 64 KB

---

## 6. Challenge Runner Design (Extensibility Requirement)

### 6.1 Runners

MVP includes only one runner:

* `express-supertest`

But the engine must be designed so new runners can be added later without changing the core evaluation pipeline.

Examples of future runners (out of scope):

* websocket-runner
* proxy-runner
* worker-runner
* browser-runner

### 6.2 Challenge Config

Each challenge must have a config file stored on the server.

Example:

```json
{
  "id": "jwt-middleware",
  "runner": "express-supertest",
  "entry": "src/app.js",
  "timeoutSec": 10,
  "allowedDependencies": ["express", "jsonwebtoken"],
  "allowedPaths": ["src/"]
}
```

---

## 7. System Architecture (MVP)

### 7.1 Components

1. **Express API (thin wrapper)**

   * `POST /evaluate`
   * Accepts zip + challengeId
   * Calls evaluation engine
   * Returns result JSON

2. **Evaluation Engine Core**

   * Extract zip
   * Pre-flight checks
   * Setup workspace
   * Spawn docker container
   * Capture logs
   * Return result

3. **Docker Runner Image**

   * Prebuilt Node.js base image
   * Contains:

     * Node runtime
     * Jest
     * Supertest
     * runner scripts

---

## 8. API Contract (MVP)

### 8.1 Endpoint

`POST /evaluate`

### 8.2 Request

* Multipart form-data

  * `challengeId`: string
  * `submission`: zip file

### 8.3 Response

```json
{
  "jobId": "uuid",
  "status": "passed | failed | error",
  "durationMs": 1234,
  "logs": "..."
}
```

---

## 9. Evaluation Pipeline (Step-by-Step)

1. Receive zip + challengeId
2. Validate file type + size
3. Create job workspace
4. Extract zip safely
5. Load challenge config
6. Run pre-flight validation
7. Prepare docker volumes:

   * user workspace (read-write)
   * hidden tests (read-only)
   * runner scripts (read-only)
8. Start container with:

   * no network
   * strict limits
   * timeout enforcement
9. Execute runner command
10. Capture logs + exit code
11. Produce final result JSON
12. Cleanup workspace

---

## 10. Security Requirements (Detailed)

### 10.1 No Internet Policy

* Docker network disabled
* No DNS
* No outgoing connections

### 10.2 Filesystem Restrictions

* Hidden tests mounted read-only
* Runner mounted read-only
* Root filesystem read-only
* Only workspace writable

### 10.3 Process Restrictions

* PID limit
* CPU/memory limit
* Timeout kill

### 10.4 Dependency Control

* package.json must match allowlist
* scripts restrictions
* no lifecycle scripts

---

## 11. Observability & Debugging

### 11.1 Required Logs

* pre-flight failure reasons
* docker start errors
* timeout kill events

### 11.2 Debug Mode (Development Only)

* Option to keep workspace after evaluation
* Option to run container without auto-delete

---

## 12. Data Storage (MVP)

No database required.

The engine returns results immediately.

(Integration with Postgres + submissions table is later.)

---

## 13. Non-Functional Requirements

### 13.1 Performance

* Typical evaluation must complete in < 5 seconds

### 13.2 Reliability

* Engine must handle malformed submissions without crashing

### 13.3 Determinism

* Same submission + same tests → same result

---

## 14. Acceptance Criteria (MVP)

### 14.1 Correctness

* A correct submission passes all hidden tests
* An incorrect submission fails deterministically

### 14.2 Security

* A submission attempting:

  * `fetch("https://google.com")`
  * `curl`
  * `ping`
    must fail due to no network.

### 14.3 Timeout

* An infinite loop must be killed within 10 seconds.

### 14.4 Dependency Injection

* A submission that adds `axios` must be rejected.

### 14.5 Hidden Tests Protection

* User code must not be able to modify hidden tests.

---

## 15. MVP Folder Structure (Recommended)

```
/eval-engine
  /api
    server.js
  /engine
    evaluateJob.js
    extractZip.js
    preflight.js
    dockerRun.js
    resultFormat.js
  /challenges
    /jwt-middleware
      config.json
      /tests (hidden)
  /runner
    run-tests.js
  /docker
    Dockerfile
```

---

## 16. Risks & Mitigations

### Risk: Docker escape / host compromise

Mitigation:

* non-root container user
* drop capabilities
* no privileged mode
* no docker socket

### Risk: Flaky tests

Mitigation:

* Supertest-based testing
* no ports
* deterministic timeouts

### Risk: Zip bombs

Mitigation:

* extraction size limit
* entry count limit

---

## 17. Future Enhancements (Not MVP)

* BullMQ job queue
* WebSocket status updates
* Multiple languages (Python, Go)
* Browser-based React evaluation
* Plagiarism detection
* Per-test granular scoring
