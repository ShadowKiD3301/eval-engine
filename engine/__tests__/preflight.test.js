const fs = require('fs');
const os = require('os');
const path = require('path');

const { preflightValidate } = require('../preflight');
const jwtConfig = require('../../challenges/jwt-middleware/config.json');

async function withWorkspace(fn) {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'eval-engine-preflight-'));
  try {
    return await fn(tempDir);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

async function writeJson(filePath, data) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
}

describe('preflightValidate', () => {
  test('passes when package.json uses only allowedDependencies from jwt-middleware config', async () => {
    await withWorkspace(async (workspaceDir) => {
      await writeJson(path.join(workspaceDir, 'package.json'), {
        name: 'submission',
        version: '1.0.0',
        dependencies: {
          express: '^5.2.1',
          jsonwebtoken: '^9.0.0',
        },
      });

      await fs.promises.mkdir(path.join(workspaceDir, 'src'), { recursive: true });
      await fs.promises.writeFile(path.join(workspaceDir, 'src/app.js'), 'module.exports = {}');

      await expect(preflightValidate({
        workspaceDir,
        challengeConfig: {
          allowedDependencies: jwtConfig.allowedDependencies,
          allowedPaths: jwtConfig.allowedPaths,
          requiredFiles: jwtConfig.requiredFiles,
        },
      })).resolves.toBeUndefined();
    });
  });

  test('fails when extra dependencies are present', async () => {
    await withWorkspace(async (workspaceDir) => {
      await writeJson(path.join(workspaceDir, 'package.json'), {
        name: 'submission',
        version: '1.0.0',
        dependencies: {
          express: '^5.2.1',
          jsonwebtoken: '^9.0.0',
          lodash: '^4.17.21',
        },
      });

      await fs.promises.mkdir(path.join(workspaceDir, 'src'), { recursive: true });
      await fs.promises.writeFile(path.join(workspaceDir, 'src/app.js'), 'module.exports = {}');

      await expect(preflightValidate({
        workspaceDir,
        challengeConfig: {
          allowedDependencies: jwtConfig.allowedDependencies,
          allowedPaths: jwtConfig.allowedPaths,
          requiredFiles: jwtConfig.requiredFiles,
        },
      })).rejects.toThrow(/Disallowed dependencies/);
    });
  });

  test('fails when disallowed lifecycle scripts are present', async () => {
    await withWorkspace(async (workspaceDir) => {
      await writeJson(path.join(workspaceDir, 'package.json'), {
        name: 'submission',
        version: '1.0.0',
        dependencies: {
          express: '^5.2.1',
          jsonwebtoken: '^9.0.0',
        },
        scripts: {
          install: 'echo nope',
        },
      });

      await fs.promises.mkdir(path.join(workspaceDir, 'src'), { recursive: true });
      await fs.promises.writeFile(path.join(workspaceDir, 'src/app.js'), 'module.exports = {}');

      await expect(preflightValidate({
        workspaceDir,
        challengeConfig: {
          allowedDependencies: jwtConfig.allowedDependencies,
          allowedPaths: jwtConfig.allowedPaths,
          requiredFiles: jwtConfig.requiredFiles,
        },
      })).rejects.toThrow(/Disallowed lifecycle scripts/);
    });
  });

  test('fails when requiredFiles are outside allowedPaths', async () => {
    await withWorkspace(async (workspaceDir) => {
      await writeJson(path.join(workspaceDir, 'package.json'), {
        name: 'submission',
        version: '1.0.0',
        dependencies: {
          express: '^5.2.1',
          jsonwebtoken: '^9.0.0',
        },
      });

      await fs.promises.mkdir(path.join(workspaceDir, 'src'), { recursive: true });
      await fs.promises.writeFile(path.join(workspaceDir, 'src/app.js'), 'module.exports = {}');
      await fs.promises.mkdir(path.join(workspaceDir, 'lib'), { recursive: true });
      await fs.promises.writeFile(path.join(workspaceDir, 'lib/extra.js'), 'module.exports = {}');

      await expect(preflightValidate({
        workspaceDir,
        challengeConfig: {
          allowedDependencies: jwtConfig.allowedDependencies,
          allowedPaths: ['src/'],
          requiredFiles: ['lib/extra.js'],
        },
      })).rejects.toThrow(/outside allowedPaths/);
    });
  });
});
