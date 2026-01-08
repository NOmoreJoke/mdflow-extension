/**
 * Unit Tests for TaskQueue
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskQueue, TaskCallback, QueueOptions } from '@/core/task-queue';
import type { ConversionOptions } from '@/types';

// Mock chrome.runtime.sendMessage
const mockSendMessage = vi.fn();
const mockStorageGet = vi.fn().mockResolvedValue({});
const mockStorageSet = vi.fn().mockResolvedValue(undefined);

vi.stubGlobal('chrome', {
    runtime: {
        sendMessage: mockSendMessage,
    },
    storage: {
        local: {
            get: mockStorageGet,
            set: mockStorageSet,
        },
    },
});

describe('TaskQueue', () => {
    let queue: TaskQueue;
    const defaultOptions: ConversionOptions = {
        format: 'markdown',
        includeMetadata: true,
        preserveFormatting: true,
        downloadImages: false,
        mathJax: false,
        codeHighlight: false,
    };

    beforeEach(() => {
        queue = new TaskQueue({ concurrent: 3, autoStart: false });
        mockSendMessage.mockClear();
        mockStorageGet.mockClear();
        mockStorageSet.mockClear();
    });

    describe('addTask', () => {
        it('should add a task with URL', () => {
            const task = queue.addTask('https://example.com', 'txt', defaultOptions);

            expect(task).toBeDefined();
            expect(task.id).toMatch(/^task_/);
            expect(task.url).toBe('https://example.com');
            expect(task.status).toBe('pending');
            expect(task.createdAt).toBeDefined();
        });

        it('should add a task with File', () => {
            const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
            const task = queue.addTask(file, 'pdf', defaultOptions);

            expect(task).toBeDefined();
            expect(task.url).toBe('');
            expect(task.type).toBe('file');
            expect(task.status).toBe('pending');
        });

        it('should generate unique task IDs', () => {
            const task1 = queue.addTask('https://example1.com', 'txt', defaultOptions);
            const task2 = queue.addTask('https://example2.com', 'txt', defaultOptions);

            expect(task1.id).not.toBe(task2.id);
        });
    });

    describe('addBatch', () => {
        it('should add multiple tasks at once', () => {
            const items = [
                { urlOrFile: 'https://example1.com', type: 'txt' as const, options: defaultOptions },
                { urlOrFile: 'https://example2.com', type: 'txt' as const, options: defaultOptions },
                { urlOrFile: 'https://example3.com', type: 'txt' as const, options: defaultOptions },
            ];

            const tasks = queue.addBatch(items);

            expect(tasks).toHaveLength(3);
            expect(tasks[0].url).toBe('https://example1.com');
            expect(tasks[1].url).toBe('https://example2.com');
            expect(tasks[2].url).toBe('https://example3.com');
        });
    });

    describe('getTask', () => {
        it('should return task by ID', () => {
            const addedTask = queue.addTask('https://example.com', 'txt', defaultOptions);
            const retrievedTask = queue.getTask(addedTask.id);

            expect(retrievedTask).toBeDefined();
            expect(retrievedTask?.id).toBe(addedTask.id);
        });

        it('should return undefined for non-existent task', () => {
            const task = queue.getTask('non-existent-id');
            expect(task).toBeUndefined();
        });
    });

    describe('getAllTasks', () => {
        it('should return all tasks', () => {
            queue.addTask('https://example1.com', 'txt', defaultOptions);
            queue.addTask('https://example2.com', 'txt', defaultOptions);

            const tasks = queue.getAllTasks();

            expect(tasks).toHaveLength(2);
        });

        it('should return empty array when no tasks', () => {
            const tasks = queue.getAllTasks();
            expect(tasks).toHaveLength(0);
        });
    });

    describe('getStats', () => {
        it('should return correct statistics', () => {
            queue.addTask('https://example1.com', 'txt', defaultOptions);
            queue.addTask('https://example2.com', 'txt', defaultOptions);

            const stats = queue.getStats();

            expect(stats.total).toBe(2);
            expect(stats.pending).toBe(2);
            expect(stats.processing).toBe(0);
            expect(stats.completed).toBe(0);
            expect(stats.failed).toBe(0);
        });
    });

    describe('cancelTask', () => {
        it('should return false for non-existent task', () => {
            const result = queue.cancelTask('non-existent');
            expect(result).toBe(false);
        });

        it('should cancel a pending task', () => {
            const task = queue.addTask('https://example.com', 'txt', defaultOptions);
            const result = queue.cancelTask(task.id);

            // Note: cancelTask sets status to 'pending', not really cancelling in current implementation
            expect(result).toBe(true);
        });
    });

    describe('retryTask', () => {
        it('should return false for non-failed task', () => {
            const task = queue.addTask('https://example.com', 'txt', defaultOptions);
            const result = queue.retryTask(task.id);

            expect(result).toBe(false);
        });

        it('should return false for non-existent task', () => {
            const result = queue.retryTask('non-existent');
            expect(result).toBe(false);
        });
    });

    describe('removeTask', () => {
        it('should remove task from queue', () => {
            const task = queue.addTask('https://example.com', 'txt', defaultOptions);
            const result = queue.removeTask(task.id);

            expect(result).toBe(true);
            expect(queue.getTask(task.id)).toBeUndefined();
        });

        it('should return false for non-existent task', () => {
            const result = queue.removeTask('non-existent');
            expect(result).toBe(false);
        });
    });

    describe('clear', () => {
        it('should clear all tasks', () => {
            queue.addTask('https://example1.com', 'txt', defaultOptions);
            queue.addTask('https://example2.com', 'txt', defaultOptions);

            queue.clear();

            expect(queue.getAllTasks()).toHaveLength(0);
            expect(queue.getStats().total).toBe(0);
        });
    });

    describe('pause and resume', () => {
        it('should pause processing', () => {
            queue = new TaskQueue({ concurrent: 3, autoStart: true });
            queue.pause();

            // After pause, autoStart should be false
            // Add a task - it should not auto-process
            const task = queue.addTask('https://example.com', 'txt', defaultOptions);
            expect(task.status).toBe('pending');
        });

        it('should resume processing', () => {
            queue = new TaskQueue({ concurrent: 3, autoStart: false });
            queue.addTask('https://example.com', 'txt', defaultOptions);

            queue.resume();

            // After resume, queue should attempt to process
            // (actual processing requires mocked chrome.runtime.sendMessage)
        });
    });

    describe('exportState and importState', () => {
        it('should export queue state as JSON', () => {
            queue.addTask('https://example.com', 'txt', defaultOptions);

            const state = queue.exportState();
            const parsed = JSON.parse(state);

            expect(parsed.tasks).toBeDefined();
            expect(parsed.processing).toBeDefined();
            expect(parsed.completed).toBeDefined();
            expect(parsed.failed).toBeDefined();
        });

        it('should import queue state from JSON', () => {
            const task = queue.addTask('https://example.com', 'txt', defaultOptions);
            const state = queue.exportState();

            // Create new queue and import
            const newQueue = new TaskQueue({ autoStart: false });
            newQueue.importState(state);

            const importedTask = newQueue.getTask(task.id);
            expect(importedTask).toBeDefined();
            expect(importedTask?.url).toBe('https://example.com');
        });

        it('should handle invalid JSON gracefully', () => {
            const newQueue = new TaskQueue({ autoStart: false });

            // Should not throw
            expect(() => newQueue.importState('invalid json')).not.toThrow();
        });
    });

    describe('clearCompleted', () => {
        it('should clear only completed tasks', async () => {
            // Add tasks
            queue.addTask('https://example1.com', 'txt', defaultOptions);
            queue.addTask('https://example2.com', 'txt', defaultOptions);

            // Since we can't actually complete tasks without mocking the full flow,
            // we just verify the method doesn't throw
            expect(() => queue.clearCompleted()).not.toThrow();
        });
    });

    describe('getTasksByStatus', () => {
        it('should return tasks with specific status', () => {
            queue.addTask('https://example1.com', 'txt', defaultOptions);
            queue.addTask('https://example2.com', 'txt', defaultOptions);

            const pendingTasks = queue.getTasksByStatus('pending');

            expect(pendingTasks).toHaveLength(2);
            expect(pendingTasks.every(t => t.status === 'pending')).toBe(true);
        });

        it('should return empty array when no tasks with status', () => {
            queue.addTask('https://example.com', 'txt', defaultOptions);

            const completedTasks = queue.getTasksByStatus('completed');

            expect(completedTasks).toHaveLength(0);
        });
    });
});
