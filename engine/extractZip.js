// TSK-002: ZIP extraction + safety checks
const fs = require('fs');
const path = require('path');
const yauzl = require('yauzl');

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;

function isUnsafeEntryName(entryName) {
  const normalized = entryName.replace(/\\/g, '/');
  if (normalized.startsWith('/') || normalized.startsWith('\\')) return true;
  if (/^[A-Za-z]:/.test(normalized)) return true;

  const cleaned = path.posix.normalize(normalized);
  if (cleaned === '..' || cleaned.startsWith('../')) return true;
  if (cleaned.includes('/../')) return true;
  const segments = normalized.split('/');
  if (segments.includes('..')) return true;
  return false;
}

function ensureWithinTarget(targetDir, entryName) {
  const normalized = entryName.replace(/\\/g, '/');
  const destPath = path.join(targetDir, normalized);
  const resolvedTarget = path.resolve(targetDir);
  const resolvedDest = path.resolve(destPath);

  if (resolvedDest === resolvedTarget) return { destPath, resolvedDest };
  if (!resolvedDest.startsWith(resolvedTarget + path.sep)) {
    throw new Error(`Unsafe path outside targetDir: ${entryName}`);
  }

  return { destPath, resolvedDest };
}

function openZipFromBuffer(zipBuffer) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      return resolve(zipfile);
    });
  });
}

async function extractEntry(zipfile, entry, targetDir, state) {
  const entryName = entry.fileName || '';
  if (!entryName) {
    throw new Error('Zip entry missing file name.');
  }
  if (isUnsafeEntryName(entryName)) {
    throw new Error(`Unsafe zip entry path: ${entryName}`);
  }

  const { destPath } = ensureWithinTarget(targetDir, entryName);

  if (/\/$/.test(entryName)) {
    await fs.promises.mkdir(destPath, { recursive: true });
    return;
  }

  const entrySize = Number(entry.uncompressedSize || 0);
  if (!Number.isFinite(entrySize) || entrySize < 0) {
    throw new Error(`Invalid entry size for ${entryName}`);
  }
  if (state.totalBytes + entrySize > state.maxBytes) {
    throw new Error('Extracted size exceeds maximum allowed bytes.');
  }

  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });

  await new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, readStream) => {
      if (err) return reject(err);

      let bytesWritten = 0;
      const writeStream = fs.createWriteStream(destPath, { flags: 'wx' });

      const onError = (error) => {
        readStream.destroy();
        writeStream.destroy();
        reject(error);
      };

      readStream.on('data', (chunk) => {
        bytesWritten += chunk.length;
        if (state.totalBytes + bytesWritten > state.maxBytes) {
          onError(new Error('Extracted size exceeds maximum allowed bytes.'));
        }
      });

      readStream.on('error', onError);
      writeStream.on('error', onError);
      writeStream.on('close', () => {
        state.totalBytes += bytesWritten;
        resolve();
      });

      readStream.pipe(writeStream);
    });
  });
}

// Example:
// await extractZip({ jobId, zipBuffer, targetDir: '/tmp/eval/123/workspace' });
async function extractZip({ jobId, zipBuffer, targetDir, maxBytes = DEFAULT_MAX_BYTES }) {
  if (!zipBuffer || !Buffer.isBuffer(zipBuffer)) {
    throw new Error('Invalid zipBuffer: expected a Buffer.');
  }
  if (!targetDir || typeof targetDir !== 'string') {
    throw new Error('Invalid targetDir: expected a string path.');
  }

  await fs.promises.mkdir(targetDir, { recursive: true });

  let zipfile;
  try {
    zipfile = await openZipFromBuffer(zipBuffer);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    throw new Error(`Invalid ZIP data${jobId ? ` (job ${jobId})` : ''}: ${msg}`);
  }

  const state = { totalBytes: 0, maxBytes };

  await new Promise((resolve, reject) => {
    const onError = (err) => reject(err);
    zipfile.on('error', onError);

    zipfile.readEntry();
    zipfile.on('entry', (entry) => {
      extractEntry(zipfile, entry, targetDir, state)
        .then(() => zipfile.readEntry())
        .catch((err) => {
          zipfile.close();
          reject(err);
        });
    });

    zipfile.on('end', () => {
      zipfile.close();
      resolve();
    });
  });

  return { workspaceDir: targetDir };
}

module.exports = { extractZip };
