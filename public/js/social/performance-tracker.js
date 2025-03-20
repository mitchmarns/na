// Performance and Error Tracking Utility
export class PerformanceTracker {
  constructor() {
    this.metrics = {
      pageLoadTime: null,
      apiCallTimes: [],
      errorLog: [],
      memoryUsage: []
    };

    this._setupPerformanceTracking();
    this._setupErrorLogging();
    this._setupMemoryTracking();
  }

  // Track page load performance
  _setupPerformanceTracking() {
    if (window.performance) {
      window.addEventListener('load', () => {
        const timing = window.performance.timing;
        this.metrics.pageLoadTime = timing.loadEventEnd - timing.navigationStart;
        this.logMetric('Page Load Time', this.metrics.pageLoadTime + 'ms');
      });
    }
  }

  // Centralized error logging
  _setupErrorLogging() {
    window.addEventListener('error', (event) => {
      this.logError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
  }

  // Track memory usage
  _setupMemoryTracking() {
    if (window.performance && window.performance.memory) {
      // Setup periodic memory tracking
      setInterval(() => {
        const memory = window.performance.memory;
        const memoryUsage = {
          timestamp: Date.now(),
          totalJSHeapSize: memory.totalJSHeapSize,
          usedJSHeapSize: memory.usedJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        };

        this.metrics.memoryUsage.push(memoryUsage);

        // Keep only last 50 memory snapshots
        if (this.metrics.memoryUsage.length > 50) {
          this.metrics.memoryUsage.shift();
        }

        // Log warning if memory usage is high
        const usagePercent = (memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          this.logMetric('High Memory Usage', `${usagePercent.toFixed(2)}%`);
        }
      }, 5000); // Check every 5 seconds
    }
  }

  // Log API call performance
  trackApiCall(url, startTime) {
    const duration = Date.now() - startTime;
    this.metrics.apiCallTimes.push({ url, duration });

    // Keep only last 50 API call times
    if (this.metrics.apiCallTimes.length > 50) {
      this.metrics.apiCallTimes.shift();
    }

    if (duration > 1000) {
      this.logMetric(`Slow API Call: ${url}`, `${duration}ms`);
    }
  }

  // Log errors with context
  logError(errorDetails) {
    this.metrics.errorLog.push({
      timestamp: new Date().toISOString(),
      ...errorDetails
    });

    // Keep only last 100 errors
    if (this.metrics.errorLog.length > 100) {
      this.metrics.errorLog.shift();
    }

    // Optional: Send to server or logging service
    console.error('Tracked Error:', errorDetails);
  }

  // Log general metrics
  logMetric(name, value) {
    console.log(`[Performance] ${name}: ${value}`);
  }

  // Generate performance report
  getReport() {
    return {
      pageLoadTime: this.metrics.pageLoadTime,
      slowApiCalls: this.metrics.apiCallTimes.filter(call => call.duration > 1000),
      recentErrors: this.metrics.errorLog.slice(-10),
      memoryUsage: this.metrics.memoryUsage
    };
  }

  // Log memory warning if needed
  checkMemoryWarning() {
    if (this.metrics.memoryUsage.length > 0) {
      const latestMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
      const usagePercent = (latestMemory.usedJSHeapSize / latestMemory.jsHeapSizeLimit) * 100;
      
      if (usagePercent > 90) {
        console.warn(`CRITICAL: Memory usage extremely high (${usagePercent.toFixed(2)}%)`);
        // Optional: Add mechanism to clear cache or take action
        this.clearOldMetrics();
      }
    }
  }

  // Clear old metrics to free up memory
  clearOldMetrics() {
    this.metrics.apiCallTimes = this.metrics.apiCallTimes.slice(-20);
    this.metrics.errorLog = this.metrics.errorLog.slice(-20);
    this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-20);
  }
}

// Singleton performance tracker
export const performanceTracker = new PerformanceTracker();