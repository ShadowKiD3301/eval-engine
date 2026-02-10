const { mapTestsFromJest, normalizeResult, resolveStatus } = require('../engine/resultFormat');

describe('resultFormat', () => {
  test('mapTestsFromJest maps assertions into concise results', () => {
    const jestResults = {
      success: false,
      testResults: [
        {
          testResults: [
            {
              fullName: 'auth allows valid token',
              status: 'passed',
              failureMessages: [],
            },
            {
              fullName: 'auth rejects missing header',
              status: 'failed',
              failureMessages: ['Expected 401 but received 200'],
            },
          ],
        },
      ],
    };

    expect(mapTestsFromJest(jestResults)).toEqual([
      { name: 'auth allows valid token', status: 'passed', message: null },
      { name: 'auth rejects missing header', status: 'failed', message: 'Expected 401 but received 200' },
    ]);
  });

  test('resolveStatus marks completed only on clean success', () => {
    expect(resolveStatus({ exitCode: 0, rawResultJson: { success: true } })).toBe('completed');
    expect(resolveStatus({ exitCode: 0, rawResultJson: { success: false } })).toBe('failed');
    expect(resolveStatus({ exitCode: 1, rawResultJson: { success: false } })).toBe('failed');
    expect(resolveStatus({ exitCode: 1, rawResultJson: null })).toBe('error');
  });

  test('normalizeResult prefers mapped Jest tests', () => {
    const rawRunnerResult = {
      exitCode: 1,
      durationMs: 123,
      rawResultJson: {
        success: false,
        testResults: [
          {
            testResults: [
              {
                title: 'denies bad token',
                status: 'failed',
                failureMessages: ['invalid token'],
                ancestorTitles: ['auth'],
              },
            ],
          },
        ],
      },
      tests: [{ name: 'fallback', status: 'passed', message: null }],
      logs: 'jest output',
    };

    const normalized = normalizeResult({
      jobId: 'job-123',
      challengeId: 'jwt-middleware',
      rawRunnerResult,
    });

    expect(normalized.status).toBe('failed');
    expect(normalized.tests).toEqual([
      { name: 'auth denies bad token', status: 'failed', message: 'invalid token' },
    ]);
    expect(normalized.logs).toBe('jest output');
  });
});
