// TSK-004: Docker runner integration

const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_TIMEOUT_SEC = 10;
const DEFAULT_CPU_LIMIT = '1';
const DEFAULT_MEMORY_LIMIT = '512m';
const DEFAULT_PIDS_LIMIT = '256';
const DEFAULT_DOCKER_IMAGE = 'eval-engine-runner:latest';
const DEFAULT_DOCKER_BIN = 'docker';
const DEFAULT_USER = '1000:1000';

function buildDockerArgs({ workspaceDir, challengeConfig, dockerImage, runnerDir, challengesDir }) {
  if (!workspaceDir) {
    throw new Error('workspaceDir is required to run in Docker.');
  }
  if (!challengeConfig || !challengeConfig.id) {
    throw new Error('challengeConfig with an id is required to run in Docker.');
  }

  const testsDir = path.join(challengesDir, challengeConfig.id, 'tests');
  const runnerScript = `run-${challengeConfig.runner || 'express-supertest'}.js`;
  const runnerPath = `/runner/${runnerScript}`;
  const challengeConfigJson = JSON.stringify(challengeConfig);

  return [
    'run',
    '--rm',
    '--network',
    'none',
    '--user',
    DEFAULT_USER,
    '--cpus',
    DEFAULT_CPU_LIMIT,
    '--memory',
    DEFAULT_MEMORY_LIMIT,
    '--pids-limit',
    DEFAULT_PIDS_LIMIT,
    '--workdir',
    '/workspace',
    '-v',
    `${workspaceDir}:/workspace:rw`,
    '-v',
    `${testsDir}:/challenge/tests:ro`,
    '-v',
    `${runnerDir}:/runner:ro`,
    '-e',
    `CHALLENGE_CONFIG=${challengeConfigJson}`,
    dockerImage,
    'node',
    runnerPath,
  ];
}

async function runInDocker({ workspaceDir, challengeConfig, options = {} }) {
  const startTime = Date.now();
  const timeoutSec = Number.isFinite(challengeConfig?.timeoutSec)
    ? challengeConfig.timeoutSec
    : DEFAULT_TIMEOUT_SEC;
  const timeoutMs = Math.max(1, Math.floor(timeoutSec * 1000));
  const dockerImage = options.dockerImage || DEFAULT_DOCKER_IMAGE;
  const dockerBin = options.dockerBin || DEFAULT_DOCKER_BIN;
  const spawnFn = options.spawn || spawn;

  if (process.env.EVAL_ENGINE_SKIP_DOCKER === '1' || process.env.NODE_ENV === 'test') {
    return {
      exitCode: null,
      durationMs: 0,
      logs: 'Docker execution skipped (EVAL_ENGINE_SKIP_DOCKER or NODE_ENV=test).',
    };
  }

  const runnerDir = options.runnerDir || path.resolve(__dirname, '..', 'runner');
  const challengesDir = options.challengesDir || path.resolve(__dirname, '..', 'challenges');
  const args = buildDockerArgs({
    workspaceDir,
    challengeConfig,
    dockerImage,
    runnerDir,
    challengesDir,
  });

  return new Promise((resolve) => {
    const stdoutChunks = [];
    const stderrChunks = [];
    let timedOut = false;
    let settled = false;

    const child = spawnFn(dockerBin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const finalize = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      if (child && typeof child.kill === 'function') {
        child.kill('SIGKILL');
      }
    }, timeoutMs);

    if (child.stdout) {
      child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk) => stderrChunks.push(chunk));
    }

    child.on('error', (error) => {
      clearTimeout(timeoutHandle);
      const durationMs = Date.now() - startTime;
      finalize({
        exitCode: null,
        durationMs,
        logs: `Docker execution failed: ${error.message}`,
      });
    });

    child.on('close', (code) => {
      clearTimeout(timeoutHandle);
      const durationMs = Date.now() - startTime;
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8');
      const timeoutNote = timedOut ? '\nDocker execution timed out.' : '';
      finalize({
        exitCode: timedOut ? 124 : code,
        durationMs,
        logs: `${stdout}${stderr}${timeoutNote}`,
      });
    });
  });
}

module.exports = { runInDocker, buildDockerArgs };
