// Core entry point for running an evaluation job.
// TSK-001+: scaffold + preflight wiring; Docker runner will follow in TSK-004.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { extractZip } = require('./extractZip');
const { preflightValidate } = require('./preflight');

function buildJobId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `job-${ts}-${rand}`;
}

async function loadChallengeConfig(challengeId) {
  if (!challengeId || typeof challengeId !== 'string') {
    throw new Error('Invalid challengeId: expected a string.');
  }
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
  // TODO (TSK-004+):
  // 5. Spawn Docker runner
  // 6. Normalize and return result
  const jobId = buildJobId();
  const workspaceDir = path.join(os.tmpdir(), 'eval', jobId, 'workspace');

  await extractZip({
    jobId,
    zipBuffer: submissionBuffer,
    targetDir: workspaceDir,
    filename,
  });

  const challengeConfig = await loadChallengeConfig(challengeId);

  // TSK-003: run preflight before any Docker work.
  await preflightValidate({ workspaceDir, challengeConfig });

  return {
    jobId,
    challengeId,
    status: 'error',
    durationMs: 0,
    tests: [],
    logs: 'Docker runner not implemented yet (TSK-004).',
  };
}

module.exports = {
  evaluateJob,
};
