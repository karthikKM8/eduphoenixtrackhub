/**
 * Simple in-memory cache utility with TTL support
 * Reduces redundant API calls and improves response times
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Get value from cache if it exists and hasn't expired
   * @param key Cache key
   * @returns Cached value or null if expired/not found
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set value in cache with TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time-to-live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, data: T, ttl = 5 * 60 * 1000): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clear specific cache entry
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Automatically invalidate cache after specified time
   */
  invalidateAfter(key: string, delay = 1000): void {
    setTimeout(() => this.invalidate(key), delay);
  }
}

// Export singleton instance
export const cache = new Cache();

/**
 * Helper function to use cache with API calls
 * Returns cached data if available, otherwise calls the API and caches result
 */
export async function cachedApiCall<T>(
  cacheKey: string,
  apiCall: () => Promise<T>,
  ttl = 5 * 60 * 1000
): Promise<T> {
  // Try to get from cache first
  const cached = cache.get<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // If not cached, make the API call
  const result = await apiCall();

  // Cache the result
  cache.set(cacheKey, result, ttl);

  return result;
}
