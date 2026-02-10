const { evaluateJob, validateChallengeId } = require('../evaluateJob');

describe('validateChallengeId', () => {
  test('rejects challengeId values containing unsafe segments', () => {
    const invalid = ['../evil', 'evil/thing', 'evil\\thing', '..', 'safe..bad'];
    for (const value of invalid) {
      expect(() => validateChallengeId(value)).toThrow(/Invalid challengeId/);
    }
  });

  test('accepts simple challengeId values', () => {
    expect(() => validateChallengeId('jwt-middleware')).not.toThrow();
  });

  test('rejects challengeId values that are not strict slugs', () => {
    const invalid = ['JWT-Middleware', 'jwt_middleware', 'jwt middleware', 'jwt.middleware', ''];
    for (const value of invalid) {
      expect(() => validateChallengeId(value)).toThrow(/Invalid challengeId/);
    }
  });
});

describe('evaluateJob challengeId validation', () => {
  test('rejects invalid challengeId before running evaluation steps', async () => {
    await expect(evaluateJob({
      challengeId: '../bad',
      submissionBuffer: Buffer.from(''),
      filename: 'submission.zip',
    })).rejects.toThrow(/Invalid challengeId/);
  });
});
