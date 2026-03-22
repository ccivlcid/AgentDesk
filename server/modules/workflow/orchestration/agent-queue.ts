import logger from "../../../lib/logger.ts";

/**
 * FIFO agent execution queue with a configurable concurrency limit.
 * When the running count reaches maxConcurrent, new tasks are enqueued
 * and started automatically as slots become available.
 *
 * Tracks taskId to prevent duplicate enqueues and running-counter leaks.
 */
export function createAgentQueue(maxConcurrent: number) {
  let running = 0;
  const queue: { taskId: string; fn: () => void }[] = [];
  /** All taskIds currently queued OR running — prevents duplicate enqueue */
  const activeTaskIds = new Set<string>();

  function tryNext(): void {
    if (running >= maxConcurrent || queue.length === 0) return;
    running++;
    const next = queue.shift()!;
    next.fn();
  }

  /**
   * Enqueue a task execution callback.
   * If the same taskId is already queued or running, the call is silently skipped.
   */
  function enqueue(taskId: string, fn: () => void): void {
    if (activeTaskIds.has(taskId)) {
      logger.debug({ taskId, running, queued: queue.length }, "agent queue: skipped duplicate taskId");
      return;
    }
    activeTaskIds.add(taskId);
    queue.push({ taskId, fn });
    logger.info({ taskId, running, queued: queue.length, maxConcurrent }, "agent queue: task enqueued");
    tryNext();
  }

  /**
   * Signal that a running task has finished (success or failure).
   * Decrements the running counter and starts the next queued task.
   */
  function onComplete(taskId?: string): void {
    running = Math.max(0, running - 1);
    if (taskId) activeTaskIds.delete(taskId);
    logger.info({ taskId, running, queued: queue.length, maxConcurrent }, "agent queue: task completed, checking for next");
    tryNext();
  }

  /** Check whether a taskId is already queued or running. */
  function hasTask(taskId: string): boolean {
    return activeTaskIds.has(taskId);
  }

  /** Remove a taskId from tracking without decrementing running counter (e.g. task was never started). */
  function removeFromTracking(taskId: string): void {
    activeTaskIds.delete(taskId);
    // Also remove from pending queue if present
    const idx = queue.findIndex((entry) => entry.taskId === taskId);
    if (idx !== -1) queue.splice(idx, 1);
  }

  function getQueueLength(): number {
    return queue.length;
  }

  function getRunningCount(): number {
    return running;
  }

  return { enqueue, onComplete, hasTask, removeFromTracking, getQueueLength, getRunningCount };
}
