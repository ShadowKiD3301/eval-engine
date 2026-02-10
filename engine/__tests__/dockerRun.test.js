const { EventEmitter } = require('events');
const { runInDocker } = require('../dockerRun');

describe('runInDocker timeout cleanup', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.NODE_ENV = 'production';
    delete process.env.EVAL_ENGINE_SKIP_DOCKER;
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = { ...originalEnv };
  });

  test('attempts to kill and remove the container on timeout', async () => {
    const spawnCalls = [];
    let child = null;

    const spawnMock = jest.fn((bin, args, opts) => {
      spawnCalls.push({ bin, args, opts });
      if (args[0] === 'run') {
        child = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        child.kill = jest.fn();
        return child;
      }
      return new EventEmitter();
    });

    const promise = runInDocker({
      workspaceDir: '/tmp/workspace',
      challengeConfig: { id: 'jwt-middleware', timeoutSec: 0.001 },
      options: {
        spawn: spawnMock,
        dockerBin: 'docker',
        runnerDir: '/runner',
        challengesDir: '/challenges',
        containerName: 'test-container',
      },
    });

    jest.advanceTimersByTime(2);
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');

    child.emit('close', 137);

    const result = await promise;
    expect(result.exitCode).toBe(124);
    expect(result.logs).toMatch(/timed out/i);

    const callArgs = spawnCalls.map((call) => call.args.slice(0, 3).join(' '));
    expect(callArgs).toEqual(expect.arrayContaining([
      'kill test-container',
      'rm -f test-container',
    ]));
  });

  test('hard timeout resolves when child never closes', async () => {
    let child = null;
    const spawnMock = jest.fn((bin, args) => {
      if (args[0] === 'run') {
        child = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        child.kill = jest.fn();
        return child;
      }
      return new EventEmitter();
    });

    const promise = runInDocker({
      workspaceDir: '/tmp/workspace',
      challengeConfig: { id: 'jwt-middleware', timeoutSec: 0.001 },
      options: {
        spawn: spawnMock,
        dockerBin: 'docker',
        runnerDir: '/runner',
        challengesDir: '/challenges',
        containerName: 'test-container',
      },
    });

    jest.advanceTimersByTime(5);

    const result = await promise;
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    expect(result.exitCode).toBe(124);
    expect(result.logs).toMatch(/timed out/i);
  });

  test('captures cleanup errors in logs without crashing', async () => {
    let child = null;
    const spawnMock = jest.fn((bin, args) => {
      if (args[0] === 'run') {
        child = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        child.kill = jest.fn();
        return child;
      }
      if (args[0] === 'kill') {
        throw new Error('boom');
      }
      return new EventEmitter();
    });

    const promise = runInDocker({
      workspaceDir: '/tmp/workspace',
      challengeConfig: { id: 'jwt-middleware', timeoutSec: 0.001 },
      options: {
        spawn: spawnMock,
        dockerBin: 'docker',
        runnerDir: '/runner',
        challengesDir: '/challenges',
        containerName: 'test-container',
      },
    });

    jest.advanceTimersByTime(2);
    child.emit('close', 137);

    const result = await promise;
    expect(result.logs).toMatch(/cleanup errors/i);
    expect(result.logs).toMatch(/docker kill failed/i);
  });
});
