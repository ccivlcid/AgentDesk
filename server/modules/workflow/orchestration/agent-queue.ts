import logger from "../../../lib/logger.ts";

/**
 * FIFO agent execution queue with a configurable concurrency limit.
 * When the running count reaches maxConcurrent, new tasks are enqueued
 * and started automatically as slots become available.
 */
export function createAgentQueue(maxConcurrent: number) {
  let running = 0;
  const queue: (() => void)[] = [];

  function tryNext(): void {
    if (running >= maxConcurrent || queue.length === 0) return;
    running++;
    const next = queue.shift()!;
    next();
  }

  function enqueue(fn: () => void): void {
    queue.push(fn);
    logger.info({ running, queued: queue.length, maxConcurrent }, "agent queue: task enqueued");
    tryNext();
  }

  function onComplete(): void {
    running--;
    logger.info({ running, queued: queue.length, maxConcurrent }, "agent queue: task completed, checking for next");
    tryNext();
  }

  function getQueueLength(): number {
    return queue.length;
  }

  function getRunningCount(): number {
    return running;
  }

  return { enqueue, onComplete, getQueueLength, getRunningCount };
}
