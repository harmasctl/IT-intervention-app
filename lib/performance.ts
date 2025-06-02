// Performance Monitoring and Error Logging Service

interface PerformanceMetric {
  id: string;
  name: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  context?: Record<string, any>;
  user_agent?: string;
  url?: string;
}

interface SystemHealth {
  memory_usage: number;
  network_status: 'online' | 'offline' | 'slow';
  database_latency: number;
  active_users: number;
  error_rate: number;
  last_updated: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorLog[] = [];
  private isEnabled: boolean = true;
  private maxMetrics: number = 1000;
  private maxErrors: number = 500;

  constructor() {
    this.setupGlobalErrorHandler();
    this.startHealthMonitoring();
  }

  // Performance Tracking
  startTimer(name: string, metadata?: Record<string, any>): () => void {
    if (!this.isEnabled) return () => {};

    const startTime = performance.now();
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        id,
        name,
        duration,
        timestamp: new Date().toISOString(),
        metadata,
      });
    };
  }

  recordMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return;

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow operations
    if (metric.duration > 1000) {
      console.warn(`Slow operation detected: ${metric.name} took ${metric.duration.toFixed(2)}ms`);
    }

    // Store in localStorage for persistence
    this.persistMetrics();
  }

  // Error Logging
  logError(error: Error | string, level: 'error' | 'warning' | 'info' = 'error', context?: Record<string, any>): void {
    const errorLog: ErrorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      level,
      context,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    this.errors.push(errorLog);

    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Console logging based on level
    switch (level) {
      case 'error':
        console.error('Performance Monitor Error:', errorLog);
        break;
      case 'warning':
        console.warn('Performance Monitor Warning:', errorLog);
        break;
      case 'info':
        console.info('Performance Monitor Info:', errorLog);
        break;
    }

    // Store in localStorage for persistence
    this.persistErrors();

    // Send critical errors to external service (if configured)
    if (level === 'error') {
      this.sendToExternalService(errorLog);
    }
  }

  // System Health Monitoring
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.checkSystemHealth();
    }, 30000); // Check every 30 seconds
  }

  private async checkSystemHealth(): Promise<SystemHealth> {
    const health: SystemHealth = {
      memory_usage: this.getMemoryUsage(),
      network_status: await this.checkNetworkStatus(),
      database_latency: await this.measureDatabaseLatency(),
      active_users: this.getActiveUsers(),
      error_rate: this.calculateErrorRate(),
      last_updated: new Date().toISOString(),
    };

    // Store health data (cross-platform compatible)
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('system_health', JSON.stringify(health));
    }

    // Alert on critical issues
    if (health.error_rate > 0.1) { // More than 10% error rate
      this.logError(`High error rate detected: ${(health.error_rate * 100).toFixed(1)}%`, 'warning');
    }

    if (health.database_latency > 2000) { // More than 2 seconds
      this.logError(`High database latency: ${health.database_latency}ms`, 'warning');
    }

    return health;
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  private async checkNetworkStatus(): Promise<'online' | 'offline' | 'slow'> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'offline';
    }

    try {
      // For React Native/mobile environments, assume online if navigator says so
      // In a real implementation, this would ping a reliable endpoint
      return 'online';
    } catch {
      return 'offline';
    }
  }

  private async measureDatabaseLatency(): Promise<number> {
    try {
      // For React Native/mobile environments, return a simulated latency
      // In a real implementation, this would measure actual database response time
      return Math.random() * 100 + 50; // 50-150ms simulated latency
    } catch {
      return -1; // Error state
    }
  }

  private getActiveUsers(): number {
    // In a real implementation, this would track active sessions
    return 1; // Current user
  }

  private calculateErrorRate(): number {
    const recentErrors = this.errors.filter(error => {
      const errorTime = new Date(error.timestamp).getTime();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      return errorTime > oneHourAgo && error.level === 'error';
    });

    const recentMetrics = this.metrics.filter(metric => {
      const metricTime = new Date(metric.timestamp).getTime();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      return metricTime > oneHourAgo;
    });

    if (recentMetrics.length === 0) return 0;
    return recentErrors.length / recentMetrics.length;
  }

  // Global Error Handler
  private setupGlobalErrorHandler(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logError(event.error || event.message, 'error', {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.logError(event.reason, 'error', {
          type: 'unhandled_promise_rejection',
        });
      });
    }
  }

  // Data Persistence (Cross-platform compatible)
  private persistMetrics(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const recentMetrics = this.metrics.slice(-100); // Keep last 100 metrics
        localStorage.setItem('performance_metrics', JSON.stringify(recentMetrics));
      }
    } catch (error) {
      console.warn('Failed to persist metrics:', error);
    }
  }

  private persistErrors(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const recentErrors = this.errors.slice(-50); // Keep last 50 errors
        localStorage.setItem('error_logs', JSON.stringify(recentErrors));
      }
    } catch (error) {
      console.warn('Failed to persist errors:', error);
    }
  }

  // External Service Integration
  private async sendToExternalService(errorLog: ErrorLog): Promise<void> {
    try {
      // In a real implementation, send to external logging service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorLog),
      // });
      console.log('Error would be sent to external service:', errorLog);
    } catch (error) {
      console.warn('Failed to send error to external service:', error);
    }
  }

  // Public API
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getErrors(): ErrorLog[] {
    return [...this.errors];
  }

  getSystemHealth(): SystemHealth | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const health = localStorage.getItem('system_health');
        return health ? JSON.parse(health) : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  clearMetrics(): void {
    this.metrics = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('performance_metrics');
    }
  }

  clearErrors(): void {
    this.errors = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('error_logs');
    }
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  // Analytics
  getAverageResponseTime(operationName?: string): number {
    const relevantMetrics = operationName
      ? this.metrics.filter(m => m.name === operationName)
      : this.metrics;

    if (relevantMetrics.length === 0) return 0;

    const total = relevantMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / relevantMetrics.length;
  }

  getSlowOperations(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.duration > threshold);
  }

  getErrorsByLevel(level: 'error' | 'warning' | 'info'): ErrorLog[] {
    return this.errors.filter(error => error.level === level);
  }

  generateReport(): string {
    const health = this.getSystemHealth();
    const avgResponseTime = this.getAverageResponseTime();
    const slowOps = this.getSlowOperations();
    const errors = this.getErrorsByLevel('error');

    return `
PERFORMANCE MONITORING REPORT
Generated: ${new Date().toLocaleString()}

=== SYSTEM HEALTH ===
Memory Usage: ${health?.memory_usage?.toFixed(2) || 'N/A'} MB
Network Status: ${health?.network_status || 'Unknown'}
Database Latency: ${health?.database_latency || 'N/A'} ms
Error Rate: ${((health?.error_rate || 0) * 100).toFixed(2)}%

=== PERFORMANCE METRICS ===
Total Operations: ${this.metrics.length}
Average Response Time: ${avgResponseTime.toFixed(2)} ms
Slow Operations (>1s): ${slowOps.length}

=== ERROR SUMMARY ===
Total Errors: ${this.errors.length}
Critical Errors: ${errors.length}
Warnings: ${this.getErrorsByLevel('warning').length}

=== RECENT SLOW OPERATIONS ===
${slowOps.slice(-5).map(op => `- ${op.name}: ${op.duration.toFixed(2)}ms`).join('\n')}

=== RECENT ERRORS ===
${errors.slice(-5).map(error => `- ${error.message} (${error.timestamp})`).join('\n')}
    `.trim();
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export const trackOperation = (name: string, metadata?: Record<string, any>) =>
  performanceMonitor.startTimer(name, metadata);

export const logError = (error: Error | string, level?: 'error' | 'warning' | 'info', context?: Record<string, any>) =>
  performanceMonitor.logError(error, level, context);

export const getSystemHealth = () => performanceMonitor.getSystemHealth();

export const generatePerformanceReport = () => performanceMonitor.generateReport();
