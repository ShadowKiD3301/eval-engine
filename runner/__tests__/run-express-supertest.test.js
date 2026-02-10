const path = require('path');

const { resolveEntryPath } = require('../run-express-supertest');

describe('resolveEntryPath', () => {
  test('accepts valid relative entry paths', () => {
    expect(resolveEntryPath('src/app.js')).toBe(path.resolve('/workspace', 'src/app.js'));
  });

  test('rejects absolute entry paths', () => {
    expect(() => resolveEntryPath('/etc/passwd')).toThrow(/relative path/i);
  });

  test('rejects traversal entry paths', () => {
    expect(() => resolveEntryPath('../app.js')).toThrow(/traversal/i);
  });
});
