/**
 * Image Processor
 * Downloads images and rewrites relative paths
 */

interface ImageInfo {
  originalUrl: string;
  localPath: string;
  alt: string;
  downloaded: boolean;
}

interface DownloadOptions {
  downloadImages: boolean;
  imagePath: string;
  rewriteAbsolute: boolean;
}

export class ImageProcessor {
  private downloadedImages: Map<string, ImageInfo> = new Map();
  private imageCounter: number = 0;

  /**
   * Process all images in HTML content
   */
  async processImages(html: string, options: DownloadOptions, baseUrl?: string): Promise<string> {
    this.downloadedImages.clear();
    this.imageCounter = 0;

    // Find all <img> tags
    const imgRegex = /<img[^>]*>/gi;
    let processed = html;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const imgTag = match[0];
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);

      if (!srcMatch) continue;

      const originalUrl = srcMatch[1];
      const alt = altMatch ? altMatch[1] : '';
      const imageUrl = this.resolveUrl(originalUrl, baseUrl);

      let newSrc = originalUrl;
      let newImgTag = imgTag;

      if (options.downloadImages && this.shouldDownload(imageUrl)) {
        // Download image and get local path
        const imageInfo = await this.downloadImage(imageUrl, alt, options.imagePath);
        newSrc = imageInfo.localPath;
        newImgTag = imgTag.replace(/src=["'][^"']*["']/i, `src="${newSrc}"`);
      } else if (options.rewriteAbsolute && this.isAbsoluteUrl(imageUrl)) {
        // Rewrite absolute URL to relative path
        newSrc = this.rewriteToRelative(imageUrl, baseUrl);
        newImgTag = imgTag.replace(/src=["'][^"']*["']/i, `src="${newSrc}"`);
      }

      // Replace in processed content
      processed = processed.replace(imgTag, newImgTag);
    }

    return processed;
  }

  /**
   * Download image and return local path
   */
  private async downloadImage(url: string, alt: string, imagePath: string): Promise<ImageInfo> {
    // Check if already downloaded
    if (this.downloadedImages.has(url)) {
      return this.downloadedImages.get(url)!;
    }

    try {
      // Fetch image
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();
      const extension = this.getExtensionFromMimeType(blob.type) || this.getExtensionFromUrl(url);

      // Generate filename
      const filename = this.generateFilename(alt, extension);
      const localPath = `${imagePath}/${filename}`;

      // Download using Chrome Downloads API
      const blobUrl = URL.createObjectURL(blob);
      await chrome.downloads.download({
        url: blobUrl,
        filename: localPath,
        saveAs: false,
      });

      // Clean up blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      const imageInfo: ImageInfo = {
        originalUrl: url,
        localPath,
        alt,
        downloaded: true,
      };

      this.downloadedImages.set(url, imageInfo);
      return imageInfo;
    } catch (error) {
      console.error(`Failed to download image ${url}:`, error);

      // Return original URL as fallback
      const imageInfo: ImageInfo = {
        originalUrl: url,
        localPath: url,
        alt,
        downloaded: false,
      };

      this.downloadedImages.set(url, imageInfo);
      return imageInfo;
    }
  }

  /**
   * Resolve URL relative to base URL
   */
  private resolveUrl(url: string, baseUrl?: string): string {
    if (!baseUrl || this.isAbsoluteUrl(url)) {
      return url;
    }

    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  /**
   * Check if URL is absolute
   */
  private isAbsoluteUrl(url: string): boolean {
    return /^https?:\/\//i.test(url) || /^\/\//i.test(url);
  }

  /**
   * Check if image should be downloaded
   */
  private shouldDownload(url: string): boolean {
    // Skip data URLs
    if (url.startsWith('data:')) {
      return false;
    }

    // Skip blob URLs
    if (url.startsWith('blob:')) {
      return false;
    }

    // Skip SVG (usually small and can be embedded)
    if (url.toLowerCase().endsWith('.svg')) {
      return false;
    }

    return true;
  }

  /**
   * Rewrite absolute URL to relative path
   */
  private rewriteToRelative(url: string, baseUrl?: string): string {
    if (!baseUrl) {
      return url;
    }

    try {
      const urlObj = new URL(url, baseUrl);
      const baseObj = new URL(baseUrl);

      // Same origin
      if (urlObj.origin === baseObj.origin) {
        // Calculate relative path
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        const baseParts = baseObj.pathname.split('/').filter(p => p);

        // Find common prefix
        let commonLength = 0;
        for (let i = 0; i < Math.min(pathParts.length, baseParts.length); i++) {
          if (pathParts[i] === baseParts[i]) {
            commonLength++;
          } else {
            break;
          }
        }

        // Build relative path
        const upLevels = baseParts.length - commonLength - 1;
        const relativePath = '../'.repeat(Math.max(0, upLevels)) +
          pathParts.slice(commonLength).join('/');

        return relativePath || './';
      }

      // Different origin, keep original
      return url;
    } catch {
      return url;
    }
  }

  /**
   * Generate filename for downloaded image
   */
  private generateFilename(alt: string, extension: string): string {
    const timestamp = Date.now();
    const counter = this.imageCounter++;
    const sanitizedAlt = this.sanitizeFilename(alt);

    if (sanitizedAlt) {
      return `${sanitizedAlt}_${timestamp}.${extension}`;
    } else {
      return `image_${timestamp}_${counter}.${extension}`;
    }
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/x-icon': 'ico',
      'image/bmp': 'bmp',
    };

    return extensions[mimeType.toLowerCase()] || '';
  }

  /**
   * Get file extension from URL
   */
  private getExtensionFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();

      // Extract extension
      const match = pathname.match(/\.([a-z0-9]+)(?:\?|$)/);
      if (match) {
        const ext = match[1];

        // Common image extensions
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'];
        if (validExtensions.includes(ext)) {
          return ext;
        }
      }

      // Default to png
      return 'png';
    } catch {
      return 'png';
    }
  }

  /**
   * Extract all images from HTML
   */
  extractImages(html: string): ImageInfo[] {
    const images: ImageInfo[] = [];
    const imgRegex = /<img[^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const imgTag = match[0];
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);

      if (srcMatch) {
        images.push({
          originalUrl: srcMatch[1],
          localPath: srcMatch[1],
          alt: altMatch ? altMatch[1] : '',
          downloaded: false,
        });
      }
    }

    return images;
  }

  /**
   * Count images in content
   */
  countImages(html: string): number {
    const matches = html.match(/<img[^>]*>/gi);
    return matches ? matches.length : 0;
  }

  /**
   * Get image statistics
   */
  getImageStatistics(html: string): {
    total: number;
    withAlt: number;
    withoutAlt: number;
    dataUrls: number;
    externalUrls: number;
  } {
    const images = this.extractImages(html);

    const stats = {
      total: images.length,
      withAlt: 0,
      withoutAlt: 0,
      dataUrls: 0,
      externalUrls: 0,
    };

    for (const img of images) {
      if (img.alt) {
        stats.withAlt++;
      } else {
        stats.withoutAlt++;
      }

      if (img.originalUrl.startsWith('data:')) {
        stats.dataUrls++;
      } else if (/^https?:\/\//i.test(img.originalUrl)) {
        stats.externalUrls++;
      }
    }

    return stats;
  }

  /**
   * Clean up temporary resources
   */
  cleanup(): void {
    this.downloadedImages.clear();
    this.imageCounter = 0;
  }

  /**
   * Get download progress
   */
  getProgress(): { downloaded: number; total: number } {
    return {
      downloaded: this.downloadedImages.size,
      total: this.downloadedImages.size,
    };
  }
}
