/**
 * Task Queue System
 * Manages conversion tasks with queue, priority, and batch processing
 */

import type { ConversionTask, ConversionResult, ConversionOptions } from '@/types';

export type TaskStatus = ConversionTask['status'];

export interface TaskCallback {
  onProgress?: (task: ConversionTask) => void;
  onComplete?: (task: ConversionTask, result: ConversionResult) => void;
  onError?: (task: ConversionTask, error: Error) => void;
}

export interface QueueOptions {
  concurrent?: number;
  autoStart?: boolean;
}

export class TaskQueue {
  private queue: Map<string, ConversionTask> = new Map();
  private processing: Set<string> = new Set();
  private completed: Set<string> = new Set();
  private failed: Set<string> = new Set();
  private callbacks: Map<string, TaskCallback> = new Map();
  private concurrent: number;
  private autoStart: boolean;

  constructor(options: QueueOptions = {}) {
    this.concurrent = options.concurrent || 3;
    this.autoStart = options.autoStart ?? true;
  }

  /**
   * Add a task to the queue
   */
  addTask(
    urlOrFile: string | File,
    type: ConversionTask['fileType'],
    options: ConversionOptions,
    callback?: TaskCallback
  ): ConversionTask {
    const id = this.generateTaskId();
    const url = typeof urlOrFile === 'string' ? urlOrFile : '';
    const file = typeof urlOrFile === 'object' ? urlOrFile : undefined;

    const task: ConversionTask = {
      id,
      url,
      type: url ? 'page' : 'file',
      fileType: type,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.queue.set(id, task);
    if (callback) {
      this.callbacks.set(id, callback);
    }

    if (this.autoStart) {
      this.processNext();
    }

    return task;
  }

  /**
   * Add multiple tasks (batch)
   */
  addBatch(
    items: Array<{ urlOrFile: string | File; type: ConversionTask['fileType']; options: ConversionOptions }>,
    callback?: TaskCallback
  ): ConversionTask[] {
    const tasks: ConversionTask[] = [];

    for (const item of items) {
      const task = this.addTask(item.urlOrFile, item.type, item.options, callback);
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Process next tasks in queue
   */
  private async processNext(): Promise<void> {
    // Check if we can process more tasks
    if (this.processing.size >= this.concurrent) {
      return;
    }

    // Get next pending tasks
    const pendingTasks = Array.from(this.queue.values())
      .filter(task => task.status === 'pending' && !this.processing.has(task.id))
      .slice(0, this.concurrent - this.processing.size);

    if (pendingTasks.length === 0) {
      return;
    }

    // Process each task
    const promises = pendingTasks.map(task => this.processTask(task));
    await Promise.allSettled(promises);

    // Continue processing if there are more pending tasks
    if (Array.from(this.queue.values()).some(t => t.status === 'pending')) {
      this.processNext();
    }
  }

  /**
   * Process a single task
   */
  private async processTask(task: ConversionTask): Promise<void> {
    // Mark as processing
    task.status = 'processing';
    this.processing.add(task.id);

    const callback = this.callbacks.get(task.id);

    try {
      // Notify progress
      if (callback?.onProgress) {
        callback.onProgress(task);
      }

      // Execute task based on type
      const result = await this.executeTask(task);

      // Mark as completed
      task.status = 'completed';
      task.completedAt = Date.now();
      task.result = result;
      this.processing.delete(task.id);
      this.completed.add(task.id);

      // Notify completion
      if (callback?.onComplete) {
        callback.onComplete(task, result);
      }

      // Save to history
      await this.saveToHistory(task, result);
    } catch (error) {
      // Mark as failed
      task.status = 'failed';
      task.completedAt = Date.now();
      task.error = (error as Error).message;
      this.processing.delete(task.id);
      this.failed.add(task.id);

      // Notify error
      if (callback?.onError) {
        callback.onError(task, error as Error);
      }
    }
  }

  /**
   * Execute a task (send message to appropriate handler)
   */
  private async executeTask(task: ConversionTask): Promise<ConversionResult> {
    return new Promise((resolve, reject) => {
      const message =
        task.type === 'file'
          ? {
              type: 'CONVERT_FILE' as const,
              data: { file: task.file },
            }
          : task.type === 'link'
            ? {
                type: 'CONVERT_LINK' as const,
                data: { url: task.url },
              }
            : {
                type: 'CONVERT_PAGE' as const,
                data: { url: task.url || '', options: {} },
              };

      chrome.runtime.sendMessage(message, (response) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Task failed'));
        }
      });
    });
  }

  /**
   * Save task result to history
   */
  private async saveToHistory(task: ConversionTask, result: ConversionResult): Promise<void> {
    const { STORAGE_KEYS } = await import('@/types/config');
    const storageResult = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    const history = storageResult[STORAGE_KEYS.HISTORY] || [];

    // Add to history
    history.unshift({
      id: task.id,
      taskId: task.id,
      ...result,
    });

    // Limit history size
    const maxHistory = 100;
    if (history.length > maxHistory) {
      history.splice(maxHistory);
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.HISTORY]: history,
    });
  }

  /**
   * Get task by ID
   */
  getTask(id: string): ConversionTask | undefined {
    return this.queue.get(id);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): ConversionTask[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): ConversionTask[] {
    return Array.from(this.queue.values()).filter(task => task.status === status);
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    return {
      total: this.queue.size,
      pending: this.getTasksByStatus('pending').length,
      processing: this.getTasksByStatus('processing').length,
      completed: this.completed.size,
      failed: this.failed.size,
    };
  }

  /**
   * Cancel a task
   */
  cancelTask(id: string): boolean {
    const task = this.queue.get(id);
    if (!task || task.status === 'completed' || task.status === 'failed') {
      return false;
    }

    task.status = 'pending';
    this.processing.delete(id);
    return true;
  }

  /**
   * Retry a failed task
   */
  retryTask(id: string): boolean {
    const task = this.queue.get(id);
    if (!task || task.status !== 'failed') {
      return false;
    }

    task.status = 'pending';
    task.error = undefined;
    this.failed.delete(id);

    if (this.autoStart) {
      this.processNext();
    }

    return true;
  }

  /**
   * Remove a task from queue
   */
  removeTask(id: string): boolean {
    this.processing.delete(id);
    this.completed.delete(id);
    this.failed.delete(id);
    this.callbacks.delete(id);
    return this.queue.delete(id);
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.queue.clear();
    this.processing.clear();
    this.completed.clear();
    this.failed.clear();
    this.callbacks.clear();
  }

  /**
   * Clear completed tasks
   */
  clearCompleted(): void {
    const completed = Array.from(this.completed);
    for (const id of completed) {
      this.removeTask(id);
    }
  }

  /**
   * Pause processing
   */
  pause(): void {
    this.autoStart = false;
  }

  /**
   * Resume processing
   */
  resume(): void {
    this.autoStart = true;
    this.processNext();
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export queue state
   */
  exportState(): string {
    const state = {
      tasks: Array.from(this.queue.entries()),
      processing: Array.from(this.processing),
      completed: Array.from(this.completed),
      failed: Array.from(this.failed),
    };
    return JSON.stringify(state);
  }

  /**
   * Import queue state
   */
  importState(stateJson: string): void {
    try {
      const state = JSON.parse(stateJson);
      this.queue = new Map(state.tasks);
      this.processing = new Set(state.processing);
      this.completed = new Set(state.completed);
      this.failed = new Set(state.failed);
    } catch (error) {
      console.error('Failed to import queue state:', error);
    }
  }
}
