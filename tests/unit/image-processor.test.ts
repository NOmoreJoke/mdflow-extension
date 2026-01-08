/**
 * Unit Tests for ImageProcessor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageProcessor } from '@/core/processors/image-processor';

// Mock chrome.downloads API
vi.stubGlobal('chrome', {
    downloads: {
        download: vi.fn().mockResolvedValue(1),
    },
});

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock URL.createObjectURL and revokeObjectURL
vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn().mockReturnValue('blob:test'),
    revokeObjectURL: vi.fn(),
});

describe('ImageProcessor', () => {
    let processor: ImageProcessor;

    beforeEach(() => {
        processor = new ImageProcessor();
        mockFetch.mockClear();
        vi.mocked(chrome.downloads.download).mockClear();
    });

    describe('extractImages', () => {
        it('should extract all images from HTML', () => {
            const html = `
        <p>Text</p>
        <img src="image1.jpg" alt="First image">
        <img src="image2.png" alt="Second image">
        <img src="image3.gif">
      `;

            const images = processor.extractImages(html);

            expect(images).toHaveLength(3);
            expect(images[0].originalUrl).toBe('image1.jpg');
            expect(images[0].alt).toBe('First image');
            expect(images[1].originalUrl).toBe('image2.png');
            expect(images[2].alt).toBe('');
        });

        it('should return empty array for HTML without images', () => {
            const html = '<p>No images here</p>';
            const images = processor.extractImages(html);

            expect(images).toHaveLength(0);
        });

        it('should handle various src attribute formats', () => {
            const html = `
        <img src="http://example.com/img.jpg" alt="Absolute">
        <img src="/images/img.png" alt="Root relative">
        <img src="./img.gif" alt="Relative">
        <img src="data:image/png;base64,ABC" alt="Data URL">
      `;

            const images = processor.extractImages(html);

            expect(images).toHaveLength(4);
            expect(images[0].originalUrl).toBe('http://example.com/img.jpg');
            expect(images[1].originalUrl).toBe('/images/img.png');
            expect(images[2].originalUrl).toBe('./img.gif');
            expect(images[3].originalUrl).toContain('data:image');
        });
    });

    describe('countImages', () => {
        it('should count images correctly', () => {
            const html = `
        <img src="1.jpg">
        <img src="2.jpg">
        <img src="3.jpg">
      `;

            expect(processor.countImages(html)).toBe(3);
        });

        it('should return 0 for no images', () => {
            expect(processor.countImages('<p>No images</p>')).toBe(0);
        });
    });

    describe('getImageStatistics', () => {
        it('should return correct statistics', () => {
            const html = `
        <img src="http://example.com/1.jpg" alt="Has alt">
        <img src="http://example.com/2.jpg" alt="Also has alt">
        <img src="local.png">
        <img src="data:image/png;base64,ABC" alt="Data URL">
      `;

            const stats = processor.getImageStatistics(html);

            expect(stats.total).toBe(4);
            expect(stats.withAlt).toBe(3);
            expect(stats.withoutAlt).toBe(1);
            expect(stats.dataUrls).toBe(1);
            expect(stats.externalUrls).toBe(2);
        });

        it('should handle empty HTML', () => {
            const stats = processor.getImageStatistics('');

            expect(stats.total).toBe(0);
            expect(stats.withAlt).toBe(0);
            expect(stats.withoutAlt).toBe(0);
            expect(stats.dataUrls).toBe(0);
            expect(stats.externalUrls).toBe(0);
        });
    });

    describe('cleanup', () => {
        it('should clear internal state', () => {
            // First extract some images
            processor.extractImages('<img src="test.jpg">');

            // Cleanup
            processor.cleanup();

            // Progress should be reset
            const progress = processor.getProgress();
            expect(progress.downloaded).toBe(0);
            expect(progress.total).toBe(0);
        });
    });

    describe('getProgress', () => {
        it('should return progress information', () => {
            const progress = processor.getProgress();

            expect(progress).toHaveProperty('downloaded');
            expect(progress).toHaveProperty('total');
            expect(typeof progress.downloaded).toBe('number');
            expect(typeof progress.total).toBe('number');
        });
    });

    describe('processImages', () => {
        it('should process images without download', async () => {
            const html = '<img src="test.jpg" alt="Test">';
            const options = {
                downloadImages: false,
                imagePath: 'images',
                rewriteAbsolute: false,
            };

            const result = await processor.processImages(html, options);

            // Should not modify if not downloading
            expect(result).toContain('src="test.jpg"');
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should skip data URLs', async () => {
            const html = '<img src="data:image/png;base64,ABC" alt="Data">';
            const options = {
                downloadImages: true,
                imagePath: 'images',
                rewriteAbsolute: false,
            };

            const result = await processor.processImages(html, options);

            // Data URLs should not be downloaded
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should skip blob URLs', async () => {
            const html = '<img src="blob:http://example.com/abc" alt="Blob">';
            const options = {
                downloadImages: true,
                imagePath: 'images',
                rewriteAbsolute: false,
            };

            await processor.processImages(html, options);

            // Blob URLs should not be downloaded
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should skip SVG files', async () => {
            const html = '<img src="icon.svg" alt="SVG">';
            const options = {
                downloadImages: true,
                imagePath: 'images',
                rewriteAbsolute: false,
            };

            await processor.processImages(html, options);

            // SVG files should not be downloaded
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should download regular images when enabled', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                blob: () => Promise.resolve(new Blob([''], { type: 'image/jpeg' })),
            });

            const html = '<img src="https://example.com/photo.jpg" alt="Photo">';
            const options = {
                downloadImages: true,
                imagePath: 'mdflow/images',
                rewriteAbsolute: false,
            };

            const result = await processor.processImages(html, options);

            expect(mockFetch).toHaveBeenCalledWith('https://example.com/photo.jpg');
            expect(result).toContain('mdflow/images');
        });

        it('should handle download errors gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const html = '<img src="https://example.com/error.jpg" alt="Error">';
            const options = {
                downloadImages: true,
                imagePath: 'images',
                rewriteAbsolute: false,
            };

            const result = await processor.processImages(html, options);

            // Should fallback to original URL
            expect(result).toContain('https://example.com/error.jpg');
        });
    });
});
