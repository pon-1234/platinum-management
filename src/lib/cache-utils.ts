import { BaseService } from "@/services/base.service";

/**
 * Cache utility functions for managing service caches
 */
export class CacheUtils {
  /**
   * Clear all caches across all service instances
   * Should be called on sign out or when permissions change
   */
  static clearAllCaches(): void {
    BaseService.clearAllInstanceCaches();
  }
}
