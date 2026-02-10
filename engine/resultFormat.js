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

function resolveStatus({ exitCode, rawResultJson, runnerStatus }) {
  if (!rawResultJson || runnerStatus === 'error') {
    return 'error';
  }
  const success = rawResultJson.success === true;
  if (exitCode === 0 && success) {
    return 'completed';
  }
  return 'failed';
}

function normalizeResult({ jobId, challengeId, rawRunnerResult }) {
  const safeRunnerResult = rawRunnerResult || {};
  const rawResultJson = safeRunnerResult.rawResultJson || null;
  const testsFromJest = mapTestsFromJest(rawResultJson);
  const tests =
    testsFromJest.length > 0
      ? testsFromJest
      : Array.isArray(safeRunnerResult.tests)
        ? safeRunnerResult.tests
        : [];

  return {
    jobId: jobId || safeRunnerResult.jobId || 'unknown-job',
    challengeId,
    status: resolveStatus({
      exitCode: safeRunnerResult.exitCode ?? null,
      rawResultJson,
      runnerStatus: safeRunnerResult.status,
    }),
    exitCode: safeRunnerResult.exitCode ?? null,
    durationMs: safeRunnerResult.durationMs ?? 0,
    tests,
    logs: safeRunnerResult.logs || '',
  };
}

module.exports = { normalizeResult, mapTestsFromJest, resolveStatus };
