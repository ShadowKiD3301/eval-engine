// TSK-006 placeholder: result normalization and API response formatting

function normalizeResult({ jobId, challengeId, rawRunnerResult }) {
  // For now, just pass through the stub runner result.
  return {
    jobId: jobId || rawRunnerResult.jobId || 'unknown-job',
    challengeId,
    status: rawRunnerResult.status || 'error',
    exitCode: rawRunnerResult.exitCode ?? null,
    durationMs: rawRunnerResult.durationMs ?? 0,
    tests: rawRunnerResult.tests || [],
    logs: rawRunnerResult.logs || '',
  };
}

module.exports = { normalizeResult };
