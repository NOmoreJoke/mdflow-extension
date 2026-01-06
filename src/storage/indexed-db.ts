/**
 * IndexedDB Storage Layer
 * Provides persistent storage for conversion history and task queue
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { HistoryItem, ConversionResult } from '@/types';

interface MDFlowDB extends DBSchema {
  history: {
    key: string;
    value: HistoryItem;
    indexes: {
      'by-timestamp': number;
      'by-title': string;
      'by-type': string;
    };
  };
  tasks: {
    key: string;
    value: {
      id: string;
      data: ConversionResult;
      timestamp: number;
    };
    indexes: {
      'by-timestamp': number;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

export class IndexedDBStorage {
  private db: IDBPDatabase<MDFlowDB> | null = null;
  private dbName = 'MDFlowDB';
  private dbVersion = 1;

  /**
   * Initialize database
   */
  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<MDFlowDB>(this.dbName, this.dbVersion, {
      upgrade(db) {
        // History store
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', {
            keyPath: 'id',
          });
          historyStore.createIndex('by-timestamp', 'timestamp');
          historyStore.createIndex('by-title', 'title');
          historyStore.createIndex('by-type', 'type');
        }

        // Tasks store
        if (!db.objectStoreNames.contains('tasks')) {
          const tasksStore = db.createObjectStore('tasks', {
            keyPath: 'id',
          });
          tasksStore.createIndex('by-timestamp', 'timestamp');
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }

  /**
   * Add item to history
   */
  async addHistory(item: HistoryItem): Promise<void> {
    await this.ensureInit();
    await this.db!.add('history', item);
  }

  /**
   * Get history item by ID
   */
  async getHistory(id: string): Promise<HistoryItem | undefined> {
    await this.ensureInit();
    return await this.db!.get('history', id);
  }

  /**
   * Get all history items
   */
  async getAllHistory(): Promise<HistoryItem[]> {
    await this.ensureInit();
    return await this.db!.getAll('history');
  }

  /**
   * Get history with pagination
   */
  async getHistoryPaginated(options: {
    offset?: number;
    limit?: number;
    startDate?: number;
    endDate?: number;
    search?: string;
  } = {}): Promise<{ items: HistoryItem[]; total: number }> {
    await this.ensureInit();
    const { offset = 0, limit = 20, startDate, endDate, search } = options;

    let items: HistoryItem[];

    if (search) {
      // Search by title
      items = await this.db!.getAllFromIndex('history', 'by-title');
      items = items.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.markdown.toLowerCase().includes(search.toLowerCase())
      );
    } else {
      // Get all items
      items = await this.db!.getAll('history');
    }

    // Filter by date range
    if (startDate !== undefined) {
      items = items.filter(item => item.timestamp >= startDate);
    }
    if (endDate !== undefined) {
      items = items.filter(item => item.timestamp <= endDate);
    }

    // Sort by timestamp descending
    items.sort((a, b) => b.timestamp - a.timestamp);

    // Get total before pagination
    const total = items.length;

    // Apply pagination
    const paginatedItems = items.slice(offset, offset + limit);

    return { items: paginatedItems, total };
  }

  /**
   * Update history item
   */
  async updateHistory(item: HistoryItem): Promise<void> {
    await this.ensureInit();
    await this.db!.put('history', item);
  }

  /**
   * Delete history item
   */
  async deleteHistory(id: string): Promise<void> {
    await this.ensureInit();
    await this.db!.delete('history', id);
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    await this.ensureInit();
    await this.db!.clear('history');
  }

  /**
   * Get history statistics
   */
  async getHistoryStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    totalWords: number;
    totalImages: number;
  }> {
    await this.ensureInit();
    const items = await this.db!.getAll('history');

    const stats = {
      total: items.length,
      byType: {} as Record<string, number>,
      totalWords: 0,
      totalImages: 0,
    };

    for (const item of items) {
      // Count by type
      const type = item.url ? this.getUrlType(item.url) : 'file';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Sum words and images
      if (item.metadata) {
        stats.totalWords += item.metadata.wordCount || 0;
        stats.totalImages += item.metadata.imageCount || 0;
      }
    }

    return stats;
  }

  /**
   * Get URL type from URL string
   */
  private getUrlType(url: string): string {
    if (url.endsWith('.pdf')) return 'pdf';
    if (url.match(/\.(docx?|txt)$/i)) return 'document';
    if (url.match(/^https?:\/\//i)) return 'webpage';
    return 'other';
  }

  /**
   * Search history
   */
  async searchHistory(query: string): Promise<HistoryItem[]> {
    const { items } = await this.getHistoryPaginated({ search: query, limit: 100 });
    return items;
  }

  /**
   * Get history by date range
   */
  async getHistoryByDateRange(startDate: number, endDate: number): Promise<HistoryItem[]> {
    const { items } = await this.getHistoryPaginated({
      startDate,
      endDate,
      limit: 1000,
    });
    return items;
  }

  /**
   * Export history as JSON
   */
  async exportHistory(): Promise<string> {
    const items = await this.getAllHistory();
    return JSON.stringify(items, null, 2);
  }

  /**
   * Import history from JSON
   */
  async importHistory(json: string): Promise<number> {
    const items: HistoryItem[] = JSON.parse(json);

    await this.ensureInit();
    const tx = this.db!.transaction('history', 'readwrite');

    for (const item of items) {
      await tx.store.put(item);
    }

    await tx.done;
    return items.length;
  }

  /**
   * Batch add history items
   */
  async batchAddHistory(items: HistoryItem[]): Promise<void> {
    await this.ensureInit();
    const tx = this.db!.transaction('history', 'readwrite');

    for (const item of items) {
      await tx.store.put(item);
    }

    await tx.done;
  }

  /**
   * Save setting
   */
  async saveSetting(key: string, value: any): Promise<void> {
    await this.ensureInit();
    await this.db!.put('settings', value, key);
  }

  /**
   * Get setting
   */
  async getSetting(key: string): Promise<any> {
    await this.ensureInit();
    return await this.db!.get('settings', key);
  }

  /**
   * Delete setting
   */
  async deleteSetting(key: string): Promise<void> {
    await this.ensureInit();
    await this.db!.delete('settings', key);
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    await this.ensureInit();
    await this.db!.clear('history');
    await this.db!.clear('tasks');
    await this.db!.clear('settings');
  }

  /**
   * Get database size estimate
   */
  async getDatabaseSize(): Promise<number> {
    await this.ensureInit();

    // Estimate size based on history item count
    const items = await this.getAllHistory();
    const avgItemSize = 5000; // Estimated 5KB per item
    return items.length * avgItemSize;
  }

  /**
   * Compact database (remove old items)
   */
  async compact(maxItems: number = 100): Promise<number> {
    await this.ensureInit();

    const allItems = await this.getAllHistory();
    const sortedItems = allItems.sort((a, b) => b.timestamp - a.timestamp);

    if (sortedItems.length <= maxItems) {
      return 0;
    }

    const itemsToRemove = sortedItems.slice(maxItems);
    const tx = this.db!.transaction('history', 'readwrite');

    for (const item of itemsToRemove) {
      await tx.store.delete(item.id);
    }

    await tx.done;
    return itemsToRemove.length;
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInit(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Delete database
   */
  async deleteDatabase(): Promise<void> {
    await this.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
export const indexedDBStorage = new IndexedDBStorage();
