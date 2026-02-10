---
sidebar_position: 2
title: Getting Started
---

# Getting Started

This guide walks you through running Eval Engine locally, building the runner image, and evaluating a sample submission.

## Prerequisites

- Node.js 18+ and npm
- Docker (daemon running)

## Local development

From the repo root:

```bash
npm install

# Build the sandbox runner image (required for real evaluations)
npm run build:runner-image

# Start the API server
npm run dev
```

The API listens on `PORT` (default `3000`). Override with:

```bash
PORT=4000 npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

## Evaluate a sample submission

The API expects a ZIP file containing a Node.js project with at least `package.json` and the files required by the challenge config.

```bash
curl -X POST \
  -F "challengeId=jwt-middleware" \
  -F "submission=@submission.zip" \
  http://localhost:3000/evaluate
```

## Rebuilding the runner image

Rebuild the Docker image any time you:

- Update runner scripts under `runner/`
- Add or update challenge dependencies in `docker/challenges/<id>/package.json`
- Modify `docker/Dockerfile`

```bash
npm run build:runner-image
```

## Common pitfalls

- Port already in use: set a different `PORT` or stop the conflicting process.
- Docker permissions: ensure your user can run `docker` without sudo or use `sudo` for the build.
- Image missing: the engine expects `eval-engine-runner:latest`; rebuild it if Docker reports the image doesn’t exist.
- No Docker in dev: you can skip execution with `EVAL_ENGINE_SKIP_DOCKER=1`, but results will not reflect real runs.
