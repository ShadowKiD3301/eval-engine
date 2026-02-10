// Core entry point for running an evaluation job.
// TSK-001+: scaffold + preflight + Docker wiring.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { extractZip } = require('./extractZip');
const { preflightValidate } = require('./preflight');
const { runInDocker } = require('./dockerRun');
const { normalizeResult } = require('./resultFormat');

function buildJobId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `job-${ts}-${rand}`;
}

function validateChallengeId(challengeId) {
  if (!challengeId || typeof challengeId !== 'string') {
    throw new Error('Invalid challengeId: expected a string.');
  }
  if (challengeId.includes('..') || challengeId.includes('/') || challengeId.includes('\\')) {
    throw new Error(`Invalid challengeId: ${challengeId}`);
  }
  if (!/^[a-z0-9-]+$/.test(challengeId)) {
    throw new Error(`Invalid challengeId: ${challengeId} (must match ^[a-z0-9-]+$)`);
  }
}

async function loadChallengeConfig(challengeId) {
  validateChallengeId(challengeId);
  const configPath = path.join(__dirname, '..', 'challenges', challengeId, 'config.json');
  let raw;
  try {
    raw = await fs.promises.readFile(configPath, 'utf8');
  } catch (err) {
    throw new Error(`Challenge config not found for ${challengeId}.`);
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid challenge config JSON for ${challengeId}.`);
  }
}

async function evaluateJob({ challengeId, submissionBuffer, filename }) {
  validateChallengeId(challengeId);
  const jobId = buildJobId();
  const workspaceDir = path.join(os.tmpdir(), 'eval', jobId, 'workspace');

  // 1–2: Extract ZIP safely into a per-job workspace
  await extractZip({
    jobId,
    zipBuffer: submissionBuffer,
    targetDir: workspaceDir,
    filename,
  });

  // 3: Load challenge config
  const challengeConfig = await loadChallengeConfig(challengeId);

  // 4: Run preflight validation (package.json, deps, required files, etc.)
  await preflightValidate({ workspaceDir, challengeConfig });

  // 5: Spawn Docker runner (TSK-004).
  // In dev/test, runInDocker may be configured to stub or skip actual Docker.
  try {
    const dockerResult = await runInDocker({ workspaceDir, challengeConfig, jobId });

    return normalizeResult({
      jobId,
      challengeId,
      rawRunnerResult: dockerResult,
    });
  } catch (error) {
    return {
      jobId,
      challengeId,
      status: 'error',
      durationMs: 0,
      tests: [],
      logs: `Evaluation failed: ${error.message}`,
    };
  }
}

module.exports = {
  evaluateJob,
  validateChallengeId,
};
