import type { StorageService } from '@/types';

/**
 * Chrome Storage API wrapper
 * Provides a simple interface for storing and retrieving data
 */
export class ChromeStorageService implements StorageService {
  private area: 'local' | 'sync';

  constructor(area: 'local' | 'sync' = 'local') {
    this.area = area;
  }

  /**
   * Get a value from storage
   * @param key The key to retrieve
   * @returns The value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      chrome.storage[this.area].get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[key] ?? null);
        }
      });
    });
  }

  /**
   * Set a value in storage
   * @param key The key to set
   * @param value The value to store
   */
  async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage[this.area].set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Remove a value from storage
   * @param key The key to remove
   */
  async remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage[this.area].remove([key], () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Clear all values from storage
   */
  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage[this.area].clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get multiple values from storage
   * @param keys Array of keys to retrieve
   * @returns Object with key-value pairs
   */
  async getMultiple<T>(keys: string[]): Promise<Record<string, T>> {
    return new Promise((resolve, reject) => {
      chrome.storage[this.area].get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Set multiple values in storage
   * @param items Object with key-value pairs to store
   */
  async setMultiple<T>(items: Record<string, T>): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage[this.area].set(items, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Listen for storage changes
   * @param callback Function to call when storage changes
   * @returns Function to stop listening
   */
  onChanged(
    callback: (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => void
  ): () => void {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === this.area) {
        callback(changes, areaName);
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }

  /**
   * Get the current bytes in use for storage
   * @returns Number of bytes in use
   */
  async getBytesInUse(): Promise<number> {
    return new Promise((resolve) => {
      chrome.storage[this.area].getBytesInUse(null, (bytesInUse) => {
        resolve(bytesInUse);
      });
    });
  }
}

// Export singleton instances
export const storageLocal = new ChromeStorageService('local');
export const storageSync = new ChromeStorageService('sync');
