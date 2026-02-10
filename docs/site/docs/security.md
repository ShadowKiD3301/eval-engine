---
sidebar_position: 5
title: Security
---

# Security

Eval Engine runs untrusted code. The security model assumes the submission is hostile and must be isolated, resource-limited, and prevented from tampering with tests.

## Threat model

- Malicious code attempts to escape the sandbox
- Submissions attempt to access the network or host filesystem
- Resource exhaustion (CPU, memory, disk, or PIDs)
- Test tampering or exfiltration of hidden tests

## Mitigations (current)

- **Docker isolation**
  - Network disabled: `--network none`
  - Non-root user: `--user 1000:1000`
  - Resource limits: `--cpus 1`, `--memory 512m`, `--pids-limit 256`
  - Hard timeout enforced by the engine

- **Read-only mounts for trusted assets**
  - Hidden tests: mounted at `/challenge/tests:ro`
  - Runner scripts: mounted at `/runner:ro`

- **Preflight validation**
  - Dependency allowlist (no arbitrary packages)
  - Disallowed lifecycle scripts (`postinstall`, `prepare`, etc.)
  - Required files and allowed paths enforced

- **ZIP safety checks**
  - Path traversal protection
  - Maximum extracted size
  - Entry count limit
  - No symlinks

## Why `NODE_PATH` includes `/app/node_modules` and `/deps/<id>/node_modules`

The runner image ships with its own dependencies (Jest and Supertest) under `/app/node_modules`. Each challenge can also have runtime dependencies baked into the image under `/deps/<challengeId>/node_modules`. The engine sets:

```
NODE_PATH=/app/node_modules:/deps/<challengeId>/node_modules
```

This ensures:

- Runner scripts can always resolve Jest/Supertest
- Challenge-specific dependencies are available to user code without allowing arbitrary installs

## Hidden tests: mount + copy

Hidden tests live on the host at `challenges/<id>/tests` and are mounted read-only into the container at `/challenge/tests`. The runner then **copies** these tests into `/workspace/challenge/tests` so that:

- Jest sees tests inside the project workspace
- Relative imports like `../../src/app` resolve correctly
- The original tests remain immutable (read-only mount)

## Operational limits

These protections are deliberate but not exhaustive. The engine is intended for a controlled environment and should be deployed with additional host-level hardening (cgroups, container runtime policies, monitoring) before exposing to untrusted public traffic.
