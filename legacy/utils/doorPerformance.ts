// Simplified door performance utilities - keeping only essential monitoring

/**
 * Performance monitoring for doors
 */
export class DoorPerformanceMonitor {
  private renderTimes: number[] = [];
  private doorCounts: number[] = [];
  private maxSamples = 100;
  
  /**
   * Record render performance
   */
  recordRender(doorCount: number, renderTime: number): void {
    this.doorCounts.push(doorCount);
    this.renderTimes.push(renderTime);
    
    if (this.doorCounts.length > this.maxSamples) {
      this.doorCounts.shift();
      this.renderTimes.shift();
    }
  }
  
  /**
   * Get performance stats
   */
  getStats(): {
    averageRenderTime: number;
    averageDoorCount: number;
    fps: number;
    performance: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    const avgRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
    const avgDoorCount = this.doorCounts.reduce((a, b) => a + b, 0) / this.doorCounts.length;
    const fps = avgRenderTime > 0 ? 1000 / avgRenderTime : 0;
    
    let performance: 'excellent' | 'good' | 'fair' | 'poor';
    if (fps >= 60) performance = 'excellent';
    else if (fps >= 45) performance = 'good';
    else if (fps >= 30) performance = 'fair';
    else performance = 'poor';
    
    return {
      averageRenderTime: avgRenderTime,
      averageDoorCount: avgDoorCount,
      fps,
      performance
    };
  }
  
  /**
   * Reset stats
   */
  reset(): void {
    this.renderTimes = [];
    this.doorCounts = [];
  }
}
