import { describe, expect, it } from 'vitest';
import { WorkQueue } from '../work-queue';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('WorkQueue', () => {
  it('rejects non-positive and non-integer limits', () => {
    expect(() => new WorkQueue({ limit: 0 })).toThrow('positive integer');
    expect(() => new WorkQueue({ limit: -2 })).toThrow('positive integer');
    expect(() => new WorkQueue({ limit: 1.5 })).toThrow('positive integer');
  });

  it('bounds concurrency to the configured limit', async () => {
    const queue = new WorkQueue({ limit: 2 });
    let active = 0;
    let peak = 0;
    const gates = Array.from({ length: 5 }, () => deferred<void>());
    const runs = gates.map((gate, index) =>
      queue.run(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await gate.promise;
        active -= 1;
        return index;
      })
    );
    // Let the first two acquire slots.
    await Promise.resolve();
    await Promise.resolve();
    expect(queue.activeCount).toBe(2);
    expect(peak).toBeLessThanOrEqual(2);
    gates.forEach((gate) => gate.resolve());
    const results = await Promise.all(runs);
    expect(results).toEqual([0, 1, 2, 3, 4]);
    expect(queue.activeCount).toBe(0);
  });

  it('propagates task failures without breaking the queue', async () => {
    const queue = new WorkQueue({ limit: 1 });
    await expect(
      queue.run(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(queue.activeCount).toBe(0);
    await expect(queue.run(async () => 'recovered')).resolves.toBe('recovered');
  });

  it('marks tokens stale after invalidate()', async () => {
    const queue = new WorkQueue({ limit: 2 });
    const before = queue.token();
    expect(before.isStale()).toBe(false);
    queue.invalidate();
    expect(before.isStale()).toBe(true);
    expect(queue.token().isStale()).toBe(false);
  });

  it('in-flight work observes staleness once invalidated', async () => {
    const queue = new WorkQueue({ limit: 1 });
    const gate = deferred<void>();
    const seen: boolean[] = [];
    const run = queue.run(async (token) => {
      await gate.promise;
      seen.push(token.isStale());
      return 'done';
    });
    await Promise.resolve();
    queue.invalidate();
    gate.resolve();
    await expect(run).resolves.toBe('done');
    expect(seen).toEqual([true]);
  });

  it('queued work captures its generation at enqueue time', async () => {
    const queue = new WorkQueue({ limit: 1 });
    const gate = deferred<void>();
    const first = queue.run(async () => {
      await gate.promise;
      return 'first';
    });
    const staleFlags: boolean[] = [];
    const second = queue.run(async (token) => {
      staleFlags.push(token.isStale());
      return 'second';
    });
    // Queued before invalidate: must observe staleness even though it runs after.
    queue.invalidate();
    gate.resolve();
    await expect(first).resolves.toBe('first');
    await expect(second).resolves.toBe('second');
    expect(staleFlags).toEqual([true]);
    void first;
  });

  it('immediate invalidation after run() marks the task stale', async () => {
    const queue = new WorkQueue({ limit: 1 });
    const gate = deferred<void>();
    const seen: boolean[] = [];
    const run = queue.run(async (token) => {
      await gate.promise;
      seen.push(token.isStale());
      return 'done';
    });
    queue.invalidate();
    gate.resolve();
    await expect(run).resolves.toBe('done');
    expect(seen).toEqual([true]);
  });

  it('releases slots when tasks reject under contention', async () => {
    const queue = new WorkQueue({ limit: 1 });
    const gate = deferred<void>();
    const first = queue.run(async () => {
      await gate.promise;
      throw new Error('first-fails');
    });
    const second = queue.run(async () => 'second-runs');
    gate.resolve();
    await expect(first).rejects.toThrow('first-fails');
    await expect(second).resolves.toBe('second-runs');
    expect(queue.activeCount).toBe(0);
  });
});
