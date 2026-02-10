const fs = require('fs');
const os = require('os');
const path = require('path');

const { extractZip } = require('../extractZip');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(value, 0);
  return buf;
}

function u32(value) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value, 0);
  return buf;
}

function buildZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const dataBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const checksum = crc32(dataBuf);
    const externalAttrs = Number.isFinite(entry.externalFileAttributes)
      ? entry.externalFileAttributes
      : 0;
    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(dataBuf.length),
      u32(dataBuf.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
    ]);

    localParts.push(localHeader, dataBuf);

    const centralHeader = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(dataBuf.length),
      u32(dataBuf.length),
      u16(nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(externalAttrs),
      u32(offset),
      nameBuf,
    ]);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBuf.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const centralDirOffset = offset;
  const endRecord = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDir.length),
    u32(centralDirOffset),
    u16(0),
  ]);

  return Buffer.concat([...localParts, centralDir, endRecord]);
}

async function withTempDir(fn) {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'eval-engine-'));
  try {
    return await fn(tempDir);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

describe('extractZip', () => {
  test('extracts a simple valid zip into a temp workspace', async () => {
    const zipBuffer = buildZip([{ name: 'src/app.js', data: 'console.log("ok");' }]);

    await withTempDir(async (tempDir) => {
      const { workspaceDir } = await extractZip({
        jobId: 'job-1',
        zipBuffer,
        targetDir: tempDir,
      });

      const extracted = await fs.promises.readFile(path.join(workspaceDir, 'src/app.js'), 'utf8');
      expect(extracted).toBe('console.log("ok");');
    });
  });

  test('rejects entries with ../ in the path', async () => {
    const zipBuffer = buildZip([{ name: '../evil.txt', data: 'nope' }]);

    await withTempDir(async (tempDir) => {
      await expect(extractZip({
        jobId: 'job-2',
        zipBuffer,
        targetDir: tempDir,
      })).rejects.toThrow(/Unsafe zip entry path|invalid relative path/i);
    });
  });

  test('cleans up targetDir after extraction error', async () => {
    const zipBuffer = buildZip([
      { name: 'src/app.js', data: 'console.log(\"ok\");' },
      { name: '../evil.txt', data: 'nope' },
    ]);

    await withTempDir(async (tempDir) => {
      await expect(extractZip({
        jobId: 'job-cleanup',
        zipBuffer,
        targetDir: tempDir,
      })).rejects.toThrow(/Unsafe zip entry path|invalid relative path/i);

      await expect(fs.promises.stat(tempDir)).rejects.toThrow(/ENOENT/);
    });
  });

  test('rejects entries with absolute paths', async () => {
    const zipBuffer = buildZip([{ name: '/abs.txt', data: 'nope' }]);

    await withTempDir(async (tempDir) => {
      await expect(extractZip({
        jobId: 'job-3',
        zipBuffer,
        targetDir: tempDir,
      })).rejects.toThrow(/Unsafe zip entry path|absolute path/i);
    });
  });

  test('rejects entries with Windows drive-letter paths', async () => {
    const zipBuffer = buildZip([{ name: 'C:/abs.txt', data: 'nope' }]);

    await withTempDir(async (tempDir) => {
      await expect(extractZip({
        jobId: 'job-3b',
        zipBuffer,
        targetDir: tempDir,
      })).rejects.toThrow(/Unsafe zip entry path|absolute path|drive/i);
    });
  });

  test('enforces maxBytes (size over limit throws)', async () => {
    const zipBuffer = buildZip([{ name: 'file.txt', data: '12345' }]);

    await withTempDir(async (tempDir) => {
      await expect(extractZip({
        jobId: 'job-4',
        zipBuffer,
        targetDir: tempDir,
        maxBytes: 4,
      })).rejects.toThrow(/exceeds maximum allowed bytes/);
    });
  });

  test('rejects when entry count exceeds maxEntries', async () => {
    const entries = [
      { name: 'a.txt', data: 'a' },
      { name: 'b.txt', data: 'b' },
      { name: 'c.txt', data: 'c' },
    ];
    const zipBuffer = buildZip(entries);

    await withTempDir(async (tempDir) => {
      await expect(extractZip({
        jobId: 'job-5',
        zipBuffer,
        targetDir: tempDir,
        maxEntries: 2,
      })).rejects.toThrow(/entry count exceeds maximum/i);
    });
  });

  test('rejects symlink entries', async () => {
    const symlinkAttrs = 0o120777 * 0x10000;
    const zipBuffer = buildZip([{
      name: 'link',
      data: 'target.txt',
      externalFileAttributes: symlinkAttrs,
    }]);

    await withTempDir(async (tempDir) => {
      await expect(extractZip({
        jobId: 'job-6',
        zipBuffer,
        targetDir: tempDir,
      })).rejects.toThrow(/Symlink entries are not allowed/i);
    });
  });
});
