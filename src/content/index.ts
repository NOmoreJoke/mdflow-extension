/**
 * Content Script for MDFlow Extension
 * Injected into web pages to extract content and handle conversion
 */

import type { Message, MessageResponse, ConversionResult } from '@/types';

class ContentScript {
  private observer: MutationObserver | null = null;

  constructor() {
    this.init();
  }

  private init() {
    this.setupMessageListener();
    this.setupPageMonitoring();
  }

  /**
   * Setup message listener for communication with background script
   */
  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      this.handleMessage(message).then(sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  /**
   * Handle incoming messages from background script
   */
  private async handleMessage(message: Message): Promise<MessageResponse> {
    try {
      switch (message.type) {
        case 'CONVERT_PAGE':
          return await this.convertPage(message.data.url);

        case 'CONVERT_SELECTION':
          return await this.convertSelection();

        default:
          return { success: false, error: 'Unknown message type' };
      }
    } catch (error) {
      console.error('Error handling message:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Convert the entire page to Markdown
   */
  private async convertPage(url: string): Promise<MessageResponse> {
    try {
      const result = this.extractPageContent();
      const markdown = this.htmlToMarkdown(result.html);

      const conversionResult: ConversionResult = {
        markdown,
        title: result.title,
        url,
        timestamp: Date.now(),
        metadata: {
          wordCount: this.countWords(markdown),
          imageCount: this.countImages(markdown),
          codeBlocks: this.countCodeBlocks(markdown),
        },
      };

      await this.saveToHistory(conversionResult);

      return { success: true, data: conversionResult };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Convert selected text to Markdown
   */
  private async convertSelection(): Promise<MessageResponse> {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return { success: false, error: 'No text selected' };
      }

      const range = selection.getRangeAt(0);
      const container = range.cloneContents();
      const div = document.createElement('div');
      div.appendChild(container);

      const html = div.innerHTML;
      const markdown = this.htmlToMarkdown(html);

      const conversionResult: ConversionResult = {
        markdown,
        title: selection.toString().slice(0, 50) + '...',
        url: window.location.href,
        timestamp: Date.now(),
        metadata: {
          wordCount: this.countWords(markdown),
        },
      };

      await this.saveToHistory(conversionResult);

      return { success: true, data: conversionResult };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Extract the main content from the page
   */
  private extractPageContent(): { html: string; title: string } {
    // Try to find the main content area
    const contentSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.content',
      '.post',
      '.article',
      '.entry-content',
      '#content',
      'body',
    ];

    let contentElement: HTMLElement | null = null;
    for (const selector of contentSelectors) {
      contentElement = document.querySelector(selector);
      if (contentElement) break;
    }

    if (!contentElement) {
      contentElement = document.body;
    }

    // Clone the element to avoid modifying the page
    const clone = contentElement.cloneNode(true) as HTMLElement;

    // Remove unwanted elements
    const unwantedSelectors = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      '.sidebar',
      '.comments',
      '.advertisement',
      '.ad',
      '.social-share',
      '.related-posts',
    ];

    unwantedSelectors.forEach((selector) => {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    });

    return {
      html: clone.innerHTML,
      title: document.title || 'Untitled',
    };
  }

  /**
   * Convert HTML to Markdown
   * TODO: Replace with TurndownJS in Phase 2
   */
  private htmlToMarkdown(html: string): string {
    // Basic HTML to Markdown conversion
    // This is a simplified version - will be replaced with TurndownJS

    let markdown = html;

    // Headers
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

    // Bold and Italic
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

    // Links
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

    // Images
    markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
    markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');

    // Code blocks
    markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n');
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

    // Lists
    markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
    });
    markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
      let index = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${index++}. $1\n`) + '\n';
    });

    // Blockquotes
    markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n\n');

    // Paragraphs and line breaks
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    markdown = markdown.replace(/<br[^>]*>/gi, '\n');

    // Remove remaining HTML tags
    markdown = markdown.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    const textArea = document.createElement('textarea');
    markdown = markdown.replace(/&([^;]+);/g, (match, entity) => {
      textArea.innerHTML = match;
      return textArea.value;
    });

    // Clean up extra whitespace
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    return markdown.trim();
  }

  /**
   * Save conversion result to history
   */
  private async saveToHistory(result: ConversionResult) {
    const { STORAGE_KEYS } = await import('@/types/config');
    const storageResult = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    const history = storageResult[STORAGE_KEYS.HISTORY] || [];

    // Add new item to the beginning
    history.unshift(result);

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
   * Count words in markdown text
   */
  private countWords(markdown: string): number {
    return markdown.trim().split(/\s+/).length;
  }

  /**
   * Count images in markdown text
   */
  private countImages(markdown: string): number {
    return (markdown.match(/!\[.*?\]\(.*?\)/g) || []).length;
  }

  /**
   * Count code blocks in markdown text
   */
  private countCodeBlocks(markdown: string): number {
    return (markdown.match(/```/g) || []).length / 2;
  }

  /**
   * Setup page monitoring for dynamic content
   */
  private setupPageMonitoring() {
    // Monitor for page changes that might affect content extraction
    this.observer = new MutationObserver(() => {
      // Page content has changed - could be useful for auto-conversion
      // For now, we just log it
      console.debug('Page content changed');
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Clean up resources
   */
  private destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Initialize content script
new ContentScript();

// Clean up on page unload
window.addEventListener('unload', () => {
  // @ts-ignore
  if (window.__mdflowContentScript) {
    // @ts-ignore
    window.__mdflowContentScript.destroy();
  }
});

// Store instance for cleanup
// @ts-ignore
window.__mdflowContentScript = new ContentScript();
