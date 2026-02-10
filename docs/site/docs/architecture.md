---
sidebar_position: 4
title: Architecture
---

# Architecture

Eval Engine is built as a thin API layer backed by a core evaluator that orchestrates extraction, validation, sandboxed execution, and result normalization. The following diagrams capture the system from different angles.

## High-level flow

This diagram shows the end-to-end evaluation path from HTTP request to normalized result.

```mermaid
flowchart LR
  C[Client] -->|POST /evaluate\nchallengeId + submission.zip| API[API Layer]
  API --> CORE[Engine Core]
  CORE --> ZIP[Extract ZIP\n/tmp/eval/<jobId>/workspace]
  ZIP --> PREFLIGHT[Preflight Validate\npackage.json + paths]
  PREFLIGHT --> DOCKER[Docker Run\nno network + limits]
  DOCKER --> RUNNER[Runner Script\nJest + Supertest]
  RUNNER --> NORMALIZE[Normalize Result]
  NORMALIZE --> API
  API --> C
```

## Sequence diagram

This sequence shows how the API, core, and Docker runtime interact during a single evaluation.

```mermaid
sequenceDiagram
  participant Client
  participant API as API Server
  participant Core as Engine Core
  participant Docker as Docker Runtime

  Client->>API: POST /evaluate (challengeId, submission.zip)
  API->>Core: evaluateJob(...)
  Core->>Core: extractZip() -> /tmp/eval/<jobId>/workspace
  Core->>Core: preflightValidate()
  Core->>Docker: docker run (mount workspace/tests/runner)
  Docker-->>Core: stdout/stderr + JSON result
  Core->>Core: normalizeResult()
  Core-->>API: normalized JSON
  API-->>Client: 200 OK + result
```

## Component diagram

Components are separated by responsibility: the API is thin, the core owns validation and orchestration, Docker isolates execution, and challenges provide config + tests.

```mermaid
flowchart TB
  subgraph API[API Layer]
    A1[Express server\nPOST /evaluate]
  end

  subgraph Core[Engine Core]
    C1[ZIP Extractor]
    C2[Preflight Validator]
    C3[Docker Orchestrator]
    C4[Result Normalizer]
  end

  subgraph Runner[Runner Image]
    R1[run-express-supertest.js]
    R2[Jest + Supertest]
  end

  subgraph Challenges[Challenges]
    CH1[challenges/<id>/config.json]
    CH2[challenges/<id>/tests]
  end

  A1 --> C1 --> C2 --> C3 --> R1 --> R2 --> C4
  CH1 --> C2
  CH2 --> C3
```

## Security boundaries

This diagram highlights trust boundaries between the host and the sandboxed container.

```mermaid
flowchart LR
  subgraph Host[Host]
    H1[Engine Core]
    H2[Workspace\n/tmp/eval/<jobId>/workspace]
    H3[Hidden Tests\nchallenges/<id>/tests]
    H4[Runner Scripts\nrunner/*.js]
  end

  subgraph Container[Docker Container]
    C1[/workspace (rw)]
    C2[/challenge/tests (ro)]
    C3[/runner (ro)]
    C4[Runner + Jest]
  end

  H1 -->|docker run\n--network none\n--user 1000:1000| Container
  H2 -->|mount rw| C1
  H3 -->|mount ro| C2
  H4 -->|mount ro| C3
  C4 --> C1
```

## Notes

- The runner copies hidden tests from `/challenge/tests` into `/workspace/challenge/tests` so relative imports like `../../src/app` resolve against the workspace.
- Dependencies are resolved via `NODE_PATH=/app/node_modules:/deps/<challengeId>/node_modules` so the runner and challenge runtime deps are both available.
