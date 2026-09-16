/**
 * Bounded, generation-scoped work queue for the vault index (P0-1a).
 *
 * - At most `limit` tasks run concurrently.
 * - Every task captures a generation; results from stale generations are
 *   discarded by the caller via `WorkToken.isStale()`.
 * - Rejection never breaks the queue; the error is routed to the caller.
 */
import type { WorkToken } from './types.js';

class GenerationToken implements WorkToken {
  constructor(
    readonly generation: number,
    private readonly queue: WorkQueue
  ) {}

  isStale(): boolean {
    return this.generation !== this.queue.currentGeneration;
  }
}

export interface WorkQueueOptions {
  /** Max concurrent tasks. Must be a positive integer. */
  readonly limit: number;
}

export class WorkQueue {
  private generation = 0;
  private running = 0;
  private readonly limit: number;
  private readonly waiters: Array<() => void> = [];

  constructor(options: WorkQueueOptions) {
    if (!Number.isInteger(options.limit) || options.limit < 1) {
      throw new Error('WorkQueue limit must be a positive integer');
    }
    this.limit = options.limit;
  }

  /** Current generation; bumped by `invalidate()`. */
  get currentGeneration(): number {
    return this.generation;
  }

  /** Number of tasks currently executing. */
  get activeCount(): number {
    return this.running;
  }

  /** Capture a token bound to the current generation. */
  token(): WorkToken {
    return new GenerationToken(this.generation, this);
  }

  /**
   * Invalidate all queued and in-flight work. Callers holding older tokens
   * observe `isStale() === true` and must discard their results.
   */
  invalidate(): void {
    this.generation += 1;
  }

  /**
   * Run `task` when a slot frees. The token captures the generation at
   * enqueue time (before waiting), so work queued before `invalidate()`
   * observes `isStale() === true` even if it acquires a slot afterwards.
   * Rejects with the task's error; stale tasks still release their slot.
   */
  async run<T>(task: (token: WorkToken) => Promise<T>): Promise<T> {
    const token = new GenerationToken(this.generation, this);
    await this.acquire();
    try {
      return await task(token);
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.limit) {
      this.running += 1;
      return Promise.resolve();
    }
    // Slot transfers directly to the waiter on release; running is unchanged.
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next) {
      next();
      return;
    }
    this.running -= 1;
  }
}
