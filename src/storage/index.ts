/**
 * Storage module entry point
 * Exports storage utilities and helpers for managing extension data
 */

export { ChromeStorageService, storageLocal, storageSync } from './chrome-storage';

// Re-export types for convenience
export type { StorageService } from '@/types';

// Storage keys and constants
export * from '@/types/config';
