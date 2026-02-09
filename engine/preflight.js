// TSK-003: pre-flight validation (package.json + file allowlist)
const fs = require('fs');
const path = require('path');

const DISALLOWED_SCRIPTS = new Set([
  'preinstall',
  'install',
  'postinstall',
  'prepublish',
  'prepublishOnly',
  'prepare',
  'postprepare',
  'prepack',
  'postpack',
  'preuninstall',
  'uninstall',
  'postuninstall',
  'publish',
  'postpublish',
  'preversion',
  'version',
  'postversion',
]);

function normalizeRelPath(inputPath, label) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error(`Invalid ${label}: expected a string path.`);
  }
  const normalized = inputPath.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`Invalid ${label}: must be relative, got ${inputPath}`);
  }
  const cleaned = path.posix.normalize(normalized);
  if (cleaned === '..' || cleaned.startsWith('../') || cleaned.includes('/../')) {
    throw new Error(`Invalid ${label}: path traversal not allowed (${inputPath})`);
  }
  return cleaned.replace(/^\.\//, '');
}

function isWithinAllowedPaths(relPath, allowedPaths) {
  return allowedPaths.some((allowedPath) => {
    if (!allowedPath) return false;
    if (relPath === allowedPath) return true;
    const prefix = allowedPath.endsWith('/') ? allowedPath : `${allowedPath}/`;
    return relPath.startsWith(prefix);
  });
}

async function readPackageJson(workspaceDir) {
  const packagePath = path.join(workspaceDir, 'package.json');
  let raw;
  try {
    raw = await fs.promises.readFile(packagePath, 'utf8');
  } catch (err) {
    throw new Error('Missing package.json in workspace.');
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error('Invalid package.json: failed to parse JSON.');
  }
}

function collectDependencyNames(packageJson) {
  const deps = packageJson && typeof packageJson.dependencies === 'object'
    ? Object.keys(packageJson.dependencies)
    : [];
  const devDeps = packageJson && typeof packageJson.devDependencies === 'object'
    ? Object.keys(packageJson.devDependencies)
    : [];
  return Array.from(new Set([...deps, ...devDeps]));
}

function validateDependencies(packageJson, allowedDependencies) {
  if (!Array.isArray(allowedDependencies)) {
    throw new Error('Invalid challenge config: allowedDependencies must be an array.');
  }
  const allowlist = new Set(allowedDependencies);
  const dependencyNames = collectDependencyNames(packageJson);
  const extra = dependencyNames.filter((dep) => !allowlist.has(dep));
  if (extra.length > 0) {
    throw new Error(
      `Disallowed dependencies found: ${extra.join(', ')}. Allowed: ${allowedDependencies.join(', ')}`
    );
  }
}

function validateScripts(packageJson) {
  const scripts = packageJson && typeof packageJson.scripts === 'object'
    ? packageJson.scripts
    : null;
  if (!scripts) return;

  const violations = Object.keys(scripts).filter((scriptName) =>
    DISALLOWED_SCRIPTS.has(scriptName)
  );

  if (violations.length > 0) {
    throw new Error(
      `Disallowed lifecycle scripts in package.json: ${violations.join(', ')}.`
    );
  }
}

async function validateRequiredFiles(workspaceDir, allowedPaths, requiredFiles) {
  if (!Array.isArray(allowedPaths) || allowedPaths.length === 0) {
    throw new Error('Invalid challenge config: allowedPaths must be a non-empty array.');
  }
  if (!Array.isArray(requiredFiles) || requiredFiles.length === 0) {
    throw new Error('Invalid challenge config: requiredFiles must be a non-empty array.');
  }

  const normalizedAllowed = allowedPaths.map((allowedPath) =>
    normalizeRelPath(allowedPath, 'allowedPath')
  );

  for (const requiredFile of requiredFiles) {
    const normalizedFile = normalizeRelPath(requiredFile, 'requiredFile');
    if (!isWithinAllowedPaths(normalizedFile, normalizedAllowed)) {
      throw new Error(
        `Required file ${requiredFile} is outside allowedPaths: ${allowedPaths.join(', ')}`
      );
    }

    const absPath = path.join(workspaceDir, normalizedFile);
    try {
      const stat = await fs.promises.stat(absPath);
      if (!stat.isFile()) {
        throw new Error();
      }
    } catch (err) {
      throw new Error(`Required file missing: ${requiredFile}`);
    }
  }
}

async function preflightValidate({ workspaceDir, challengeConfig }) {
  if (!workspaceDir || typeof workspaceDir !== 'string') {
    throw new Error('Invalid workspaceDir: expected a string path.');
  }
  if (!challengeConfig || typeof challengeConfig !== 'object') {
    throw new Error('Invalid challengeConfig: expected an object.');
  }

  const packageJson = await readPackageJson(workspaceDir);

  validateDependencies(packageJson, challengeConfig.allowedDependencies);
  validateScripts(packageJson);
  await validateRequiredFiles(
    workspaceDir,
    challengeConfig.allowedPaths,
    challengeConfig.requiredFiles
  );
}

module.exports = { preflightValidate };
