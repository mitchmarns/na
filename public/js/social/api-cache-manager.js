// Advanced API Caching with Memory Management
export class ApiCacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.options = {
      maxCacheSize: options.maxCacheSize || 50,  // Max number of cached responses
      defaultTTL: options.defaultTTL || 5 * 60 * 1000, // 5 minutes default
      ...options
    };
  }

  // Create a unique cache key
  _createCacheKey(url, params = {}) {
    const paramString = JSON.stringify(params);
    return `${url}:${paramString}`;
  }

  // Check if cache entry is valid
  _isValidCacheEntry(entry) {
    return entry && 
           (Date.now() - entry.timestamp) < this.options.defaultTTL;
  }

  // Fetch with intelligent caching
  async fetch(url, options = {}) {
    const startTime = Date.now();
    const cacheKey = this._createCacheKey(url, options);

    // Check cache first
    const cachedResponse = this.cache.get(cacheKey);
    if (cachedResponse && this._isValidCacheEntry(cachedResponse)) {
      console.log(`Cache hit for: ${url}`);
      return cachedResponse.data;
    }

    try {
      const response = await window.fetch(url, {
        ...options,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Store in cache, managing size
      this._addToCache(cacheKey, data);

      // Track API call performance
      this._trackApiPerformance(url, startTime);

      return data;
    } catch (error) {
      console.error(`API Call Failed: ${url}`, error);
      throw error;
    }
  }

  // Add to cache with size management
  _addToCache(key, data) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.options.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Track API call performance
  _trackApiPerformance(url, startTime) {
    const duration = Date.now() - startTime;
    
    if (duration > 1000) {
      console.warn(`Slow API Call: ${url} took ${duration}ms`);
    }
  }

  // Manually clear cache
  clear() {
    this.cache.clear();
    console.log('API cache cleared');
  }

  // Remove specific cache entry
  invalidate(url, params = {}) {
    const cacheKey = this._createCacheKey(url, params);
    this.cache.delete(cacheKey);
    console.log(`Invalidated cache for: ${url}`);
  }

  // Get cache statistics
  getStats() {
    return {
      totalEntries: this.cache.size,
      maxSize: this.options.maxCacheSize
    };
  }
}

// Singleton cache manager
export const apiCacheManager = new ApiCacheManager();