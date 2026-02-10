const fs = require('fs');
const path = require('path');

function readChallengeConfig() {
  const raw = process.env.CHALLENGE_CONFIG;
  if (!raw) {
    throw new Error('CHALLENGE_CONFIG is not set.');
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid CHALLENGE_CONFIG JSON: ${err.message}`);
  }
}

function resolveEntryPath(entry) {
  if (!entry || typeof entry !== 'string') {
    throw new Error('Challenge config entry is missing or invalid.');
  }
  const normalized = entry.replace(/\\/g, '/');
  if (path.isAbsolute(normalized) || /^[A-Za-z]:/.test(normalized)) {
    throw new Error('Challenge config entry must be a relative path.');
  }
  const cleaned = path.posix.normalize(normalized);
  const segments = cleaned.split('/');
  if (segments.includes('..')) {
    throw new Error('Challenge config entry cannot contain path traversal.');
  }
  const resolved = path.resolve('/workspace', cleaned);
  const workspaceRoot = path.resolve('/workspace');
  if (resolved !== workspaceRoot && !resolved.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error('Challenge config entry resolves outside workspace.');
  }
  return resolved;
}

function loadApp(entryPath) {
  let appModule;
  try {
    appModule = require(entryPath);
  } catch (err) {
    const hint = err && err.code === 'MODULE_NOT_FOUND' ? ` (check ${entryPath})` : '';
    throw new Error(`Failed to import user app${hint}: ${err.message}`);
  }
  const app = appModule && appModule.default ? appModule.default : appModule;
  if (!app) {
    throw new Error('User app export is empty.');
  }
  global.__EXPRESS_APP__ = app;
  return app;
}

function listTestFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTestFiles(fullPath));
      continue;
    }
    if (/\.(test|spec)\.[jt]s$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function mapTestsFromJest(results) {
  if (!results || !Array.isArray(results.testResults)) return [];
  const mapped = [];
  for (const fileResult of results.testResults) {
    const assertions = Array.isArray(fileResult.testResults) ? fileResult.testResults : [];
    for (const assertion of assertions) {
      const fullName =
        assertion.fullName ||
        [
          ...(Array.isArray(assertion.ancestorTitles) ? assertion.ancestorTitles : []),
          assertion.title,
        ]
          .filter(Boolean)
          .join(' ');
      const status = assertion.status === 'passed' ? 'passed' : 'failed';
      let message = null;
      if (status === 'failed') {
        if (Array.isArray(assertion.failureMessages) && assertion.failureMessages.length > 0) {
          message = assertion.failureMessages[0];
        } else if (fileResult && typeof fileResult.failureMessage === 'string') {
          message = fileResult.failureMessage;
        } else if (assertion.status && assertion.status !== 'passed') {
          message = `Test ${assertion.status}`;
        }
      }
      mapped.push({
        name: fullName || assertion.title || 'unknown test',
        status,
        message,
      });
    }
  }
  return mapped;
}

async function run() {
  const startTime = Date.now();
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  try {
    const challengeConfig = readChallengeConfig();
    const entryPath = resolveEntryPath(challengeConfig.entry);
    loadApp(entryPath);

    const testsDir = '/challenge/tests';
    const testFiles = listTestFiles(testsDir);
    if (testFiles.length === 0) {
      throw new Error(`No test files found under ${testsDir}.`);
    }

    const { runCLI } = require('jest');

    // Jest expects tests to live under the project root. Our hidden tests are mounted
    // under /challenge/tests, so we symlink them into the writable workspace.
    // Place tests under /workspace/challenge/tests so relative imports like
    // require('../../src/app') resolve correctly (../../ from tests -> /workspace).
    const hiddenRoot = path.resolve('/workspace/challenge/tests');
    fs.mkdirSync(hiddenRoot, { recursive: true });

    const linkedTestFiles = [];
    for (const absTestFile of testFiles) {
      const rel = path.relative(testsDir, absTestFile);
      const target = path.join(hiddenRoot, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      try {
        // Overwrite if it already exists from a prior run.
        fs.rmSync(target, { force: true });
      } catch (_) {
        // ignore
      }
      fs.copyFileSync(absTestFile, target);
      linkedTestFiles.push(target);
    }

    const argv = {
      runInBand: true,
      json: true,
      silent: true,
      testLocationInResults: false,
      reporters: ['default'],
      runTestsByPath: true,
      _: linkedTestFiles,
      cache: false,
      rootDir: process.cwd(),
      testEnvironment: 'node',
    };

    const { results } = await runCLI(argv, [process.cwd()]);
    const durationMs = Date.now() - startTime;
    const tests = mapTestsFromJest(results);

    const resultPayload = {
      status: results && results.success ? 'passed' : 'failed',
      exitCode: results && results.success ? 0 : 1,
      durationMs,
      tests,
      rawResultJson: results || null,
      logs: results && typeof results.failureMessage === 'string' ? results.failureMessage : '',
    };

    process.stdout.write(`${JSON.stringify(resultPayload)}\n`);
    process.exitCode = resultPayload.exitCode;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorPayload = {
      status: 'error',
      exitCode: 1,
      durationMs,
      tests: [],
      rawResultJson: null,
      logs: err && err.stack ? err.stack : String(err),
    };
    process.stdout.write(`${JSON.stringify(errorPayload)}\n`);
    process.stderr.write(`${errorPayload.logs}\n`);
    process.exitCode = errorPayload.exitCode;
  }
}

if (require.main === module) {
  run();
}

module.exports = { resolveEntryPath };
