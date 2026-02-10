---
sidebar_position: 7
title: Troubleshooting
---

# Troubleshooting

Below are common failure modes, example logs, and what to check.

## Cannot find module "jest"

**Symptoms**

The runner fails immediately with a module error.

Example log:

```text
Docker execution failed: Error: Cannot find module 'jest'
```

**What to check**

- The runner image was built with `npm run build:runner-image`.
- The Docker build completed successfully and tagged `eval-engine-runner:latest`.
- You did not override `NODE_PATH` in a way that hides `/app/node_modules`.

## Jest can't find tests

**Symptoms**

The runner cannot locate any test files.

Example log:

```text
Error: No test files found under /challenge/tests.
```

**What to check**

- The challenge directory exists: `challenges/<id>/tests`.
- Tests are mounted read-only into the container at `/challenge/tests`.
- Test files end in `.test.js` or `.spec.js`.

## EACCES in `/workspace`

**Symptoms**

The container cannot write into the workspace.

Example log:

```text
EACCES: permission denied, mkdir '/workspace/challenge/tests'
```

**What to check**

- The engine attempts a best-effort `chmod 777` on the workspace. If it fails, Docker may run with insufficient permissions.
- Ensure the host filesystem allows writes by the container user (`1000:1000`).
- Check whether your Docker daemon is running with restricted permissions or rootless mode constraints.

## Docker not available or image missing

**Symptoms**

Docker command fails or the image cannot be found.

Example logs:

```text
Docker execution failed: spawn docker ENOENT
```

```text
docker: Error response from daemon: pull access denied for eval-engine-runner, repository does not exist.
```

**What to check**

- Docker is installed and the daemon is running.
- Your user has permission to run `docker`.
- The image `eval-engine-runner:latest` exists locally.

## ZIP extraction errors

**Symptoms**

Submission is rejected before preflight.

Example logs:

```text
Invalid ZIP data (job job-abc123): end of central directory record signature not found
```

```text
Unsafe zip entry path: ../evil.js
```

```text
Extracted size exceeds maximum allowed bytes.
```

**What to check**

- The upload is a valid ZIP file.
- The ZIP does not contain symlinks or path traversal entries.
- The total extracted size is under the 20 MB limit.

## Preflight validation errors

**Symptoms**

Evaluation fails before Docker runs; the API returns a 500 with a generic error.

Example server logs:

```text
Disallowed dependencies found: lodash. Allowed: express, jsonwebtoken
```

```text
Required file missing: src/app.js
```

**What to check**

- `package.json` only contains allowed dependencies.
- Required files exist and are within `allowedPaths`.
- Disallowed lifecycle scripts are not present in `package.json`.
