/**
 * In-memory TTL cache for rules and memory prompt data.
 *
 * Cache key: scope combination (projectId|agentId|departmentId|...).
 * TTL: 5 minutes. Entries are lazily evicted on read.
 *
 * Invalidate manually when rules/memories are written (POST/PATCH/DELETE).
 */

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class PromptCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    this.store.set(key, { data, expiresAt: Date.now() + TTL_MS });
  }

  /** Invalidate all entries whose key starts with the given prefix. */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  invalidateAll(): void {
    this.store.clear();
  }
}

// Singleton caches — shared across all requests in the same process
export const rulesCache = new PromptCache<unknown[]>();
export const memoriesCache = new PromptCache<unknown[]>();

/** Build a cache key from nullable scope identifiers. */
export function scopeKey(...parts: (string | null | undefined)[]): string {
  return parts.map((p) => p ?? "").join("|");
}
