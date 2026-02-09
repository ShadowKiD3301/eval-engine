// Core entry point for running an evaluation job.
// TSK-001: scaffold only – real logic will be filled by later tasks.

async function evaluateJob({ challengeId, submissionBuffer, filename }) {
  // TODO (TSK-002+):
  // 1. Create job workspace
  // 2. Extract ZIP safely
  // 3. Load challenge config
  // 4. Run preflight validation
  // 5. Spawn Docker runner
  // 6. Normalize and return result

  return {
    jobId: 'stub-job-id',
    challengeId,
    status: 'error',
    durationMs: 0,
    tests: [],
    logs: 'Evaluation engine not implemented yet – stub from TSK-001 scaffolding.'
  };
}

module.exports = {
  evaluateJob,
};
