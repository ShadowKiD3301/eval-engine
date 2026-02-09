// Core entry point for running an evaluation job.
// TSK-001: scaffold only – real logic will be filled by later tasks.

const fs = require('fs/promises');
const path = require('path');
const { preflightValidate } = require('./preflight');
const { runInDocker } = require('./dockerRun');

async function loadChallengeConfig(challengeId) {
  const configPath = path.resolve(__dirname, '..', 'challenges', challengeId, 'config.json');
  const raw = await fs.readFile(configPath, 'utf8');
  return JSON.parse(raw);
}

async function evaluateJob({ challengeId, submissionBuffer, filename }) {
  // TODO (TSK-002+):
  // 1. Create job workspace
  // 2. Extract ZIP safely
  // 3. Load challenge config
  // 4. Run preflight validation
  // 5. Spawn Docker runner
  // 6. Normalize and return result

  const jobId = `job-${Date.now()}`;
  const workspaceDir = process.env.EVAL_ENGINE_WORKSPACE_DIR || null;

  try {
    const challengeConfig = await loadChallengeConfig(challengeId);

    if (!workspaceDir) {
      return {
        jobId,
        challengeId,
        status: 'error',
        durationMs: 0,
        tests: [],
        logs: 'Workspace not initialized yet (TSK-002). Set EVAL_ENGINE_WORKSPACE_DIR to test Docker runner.',
      };
    }

    await preflightValidate({ workspaceDir, challengeConfig });
    const dockerResult = await runInDocker({ workspaceDir, challengeConfig });

    return {
      jobId,
      challengeId,
      status: dockerResult.exitCode === 0 ? 'completed' : 'error',
      durationMs: dockerResult.durationMs,
      tests: [],
      logs: dockerResult.logs,
    };
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
};
