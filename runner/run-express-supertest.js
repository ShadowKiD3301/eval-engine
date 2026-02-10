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
  return path.resolve('/workspace', entry);
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

    const argv = {
      runInBand: true,
      json: true,
      silent: true,
      testLocationInResults: false,
      reporters: ['default'],
      runTestsByPath: true,
      _: testFiles,
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

run();
