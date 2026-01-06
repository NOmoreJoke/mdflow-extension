/**
 * Content Script for MDFlow Extension
 * Injected into web pages to extract content and handle conversion
 */

import type { Message, MessageResponse, ConversionResult, ConversionOptions } from '@/types';
import { HTMLParser } from '@/core/parsers/html-parser';
import { ContentExtractor } from '@/core/processors/content-extractor';
import { NoiseFilter } from '@/core/processors/noise-filter';

class ContentScript {
  private observer: MutationObserver | null = null;
  private htmlParser: HTMLParser;
  private contentExtractor: ContentExtractor;
  private noiseFilter: NoiseFilter;

  constructor() {
    // Initialize parsers and processors
    this.htmlParser = new HTMLParser();
    this.contentExtractor = new ContentExtractor();
    this.noiseFilter = new NoiseFilter();

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
          return await this.convertPage(message.data.url, message.data.options);

        case 'CONVERT_SELECTION':
          return await this.convertSelection(message.data.options);

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
  private async convertPage(url: string, options: ConversionOptions): Promise<MessageResponse> {
    try {
      // Extract main content using intelligent extraction
      const contentElement = this.contentExtractor.extractMainContent(document);
      const cleanHtml = this.contentExtractor.cleanupContent(contentElement);

      // Apply noise filtering
      const filteredHtml = this.noiseFilter.clean(cleanHtml);

      // Convert to Markdown using TurndownJS
      const result = await this.htmlParser.parse(filteredHtml, options);

      // Override URL and add metadata
      result.url = url;
      result.metadata = {
        ...result.metadata,
        ...this.contentExtractor.extractMetadata(document),
      };

      await this.saveToHistory(result);

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Convert selected text to Markdown
   */
  private async convertSelection(options: ConversionOptions): Promise<MessageResponse> {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return { success: false, error: 'No text selected' };
      }

      const range = selection.getRangeAt(0);
      const container = range.cloneContents();
      const div = document.createElement('div');
      div.appendChild(container);

      // Get HTML from selection
      let html = div.innerHTML;

      // Apply noise filtering
      html = this.noiseFilter.clean(html);

      // Convert to Markdown
      const result = await this.htmlParser.parse(html, options);

      // Override title and URL
      const selectedText = selection.toString();
      result.title = selectedText.slice(0, 50) + (selectedText.length > 50 ? '...' : '');
      result.url = window.location.href;

      await this.saveToHistory(result);

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Save conversion result to history
   */
  private async saveToHistory(result: ConversionResult) {
    const { STORAGE_KEYS } = await import('@/types/config');
    const storageResult = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    const history = storageResult[STORAGE_KEYS.HISTORY] || [];

    // Generate unique ID
    const id = `mdflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add new item to the beginning
    history.unshift({ id, taskId: id, ...result });

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
   * Setup page monitoring for dynamic content
   */
  private setupPageMonitoring() {
    // Monitor for page changes that might affect content extraction
    this.observer = new MutationObserver(() => {
      // Page content has changed - could be useful for auto-conversion
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
