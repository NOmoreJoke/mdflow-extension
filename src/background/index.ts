/**
 * Background Service Worker for MDFlow Extension
 * Handles context menus, keyboard shortcuts, and message passing
 */

import { CONTEXT_MENU_IDS, STORAGE_KEYS } from '@/types/config';
import type { Message, MessageResponse, ConversionResult, AppConfig, ConversionOptions } from '@/types';
import { PDFParser } from '@/core/parsers/pdf-parser';
import { DocxParser } from '@/core/parsers/docx-parser';

class BackgroundService {
  private pdfParser: PDFParser;
  private docxParser: DocxParser;

  constructor() {
    // Initialize parsers
    this.pdfParser = new PDFParser();
    this.docxParser = new DocxParser();

    this.init();
  }

  private async init() {
    await this.createContextMenus();
    this.setupMessageListener();
    this.setupCommandListener();
    this.setupInstallListener();
  }

  /**
   * Create context menu items
   */
  private async createContextMenus() {
    try {
      // Remove existing menus
      await chrome.contextMenus.removeAll();

      // Create "Convert Page" menu
      chrome.contextMenus.create({
        id: CONTEXT_MENU_IDS.CONVERT_PAGE,
        title: chrome.i18n.getMessage('contextMenuPage'),
        contexts: ['page'],
        documentUrlPatterns: ['<all_urls>'],
      });

      // Create "Convert Selection" menu
      chrome.contextMenus.create({
        id: CONTEXT_MENU_IDS.CONVERT_SELECTION,
        title: chrome.i18n.getMessage('contextMenuSelection'),
        contexts: ['selection'],
        documentUrlPatterns: ['<all_urls>'],
      });

      // Create "Convert Link" menu
      chrome.contextMenus.create({
        id: CONTEXT_MENU_IDS.CONVERT_LINK,
        title: chrome.i18n.getMessage('contextMenuLink'),
        contexts: ['link'],
        documentUrlPatterns: ['<all_urls>'],
      });

      // Create context menu click handler
      chrome.contextMenus.onClicked.addListener((info, tab) => {
        this.handleContextMenuClick(info, tab);
      });
    } catch (error) {
      console.error('Error creating context menus:', error);
    }
  }

  /**
   * Handle context menu clicks
   */
  private async handleContextMenuClick(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ) {
    if (!tab?.id) return;

    try {
      switch (info.menuItemId) {
        case CONTEXT_MENU_IDS.CONVERT_PAGE:
          await this.convertPage(tab.id, tab.url!);
          break;
        case CONTEXT_MENU_IDS.CONVERT_SELECTION:
          await this.convertSelection(tab.id);
          break;
        case CONTEXT_MENU_IDS.CONVERT_LINK:
          await this.convertLink(info.linkUrl!);
          break;
      }
    } catch (error) {
      console.error('Error handling context menu click:', error);
      this.showNotification('Conversion failed', 'error');
    }
  }

  /**
   * Convert current page
   */
  private async convertPage(tabId: number, url: string) {
    try {
      // Get user config
      const configResult = await this.getConfig();
      const config = (configResult.data || {}) as AppConfig;

      // Get conversion options
      const options = this.getConversionOptions(config);

      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'CONVERT_PAGE',
        data: { url, options },
      });

      if (response?.success) {
        const result = response.data as ConversionResult;

        // Handle output based on config
        if (config.autoDownload) {
          await this.downloadFile(result);
        } else {
          await this.copyToClipboard(result.markdown);
        }

        this.showNotification('Page converted successfully!', 'success');
      } else {
        this.showNotification('Conversion failed: ' + response?.error, 'error');
      }
    } catch (error) {
      console.error('Error converting page:', error);
      this.showNotification('Conversion failed', 'error');
    }
  }

  /**
   * Convert selected text
   */
  private async convertSelection(tabId: number) {
    try {
      // Get user config
      const configResult = await this.getConfig();
      const config = (configResult.data || {}) as AppConfig;

      // Get conversion options
      const options = this.getConversionOptions(config);

      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'CONVERT_SELECTION',
        data: { options },
      });

      if (response?.success) {
        const result = response.data as ConversionResult;

        // Always copy selection to clipboard
        await this.copyToClipboard(result.markdown);

        this.showNotification('Selection converted!', 'success');
      } else {
        this.showNotification('Conversion failed: ' + response?.error, 'error');
      }
    } catch (error) {
      console.error('Error converting selection:', error);
      this.showNotification('Conversion failed', 'error');
    }
  }

  /**
   * Get conversion options from config
   */
  private getConversionOptions(config: AppConfig): ConversionOptions {
    return {
      format: config.defaultFormat || 'markdown',
      includeMetadata: true,
      preserveFormatting: true,
      downloadImages: false,
      mathJax: false,
      codeHighlight: true,
    };
  }

  /**
   * Convert linked page
   */
  private async convertLink(url: string) {
    try {
      // Open the link in a new tab
      const tab = await chrome.tabs.create({ url });

      // Wait for the tab to load, then convert
      const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          this.convertPage(tabId, url);
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    } catch (error) {
      console.error('Error converting link:', error);
      this.showNotification('Conversion failed', 'error');
    }
  }

  /**
   * Setup message listener for communication with content scripts and popup
   */
  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      this.handleMessage(message, sender).then(sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(message: Message, sender: chrome.runtime.MessageSender): Promise<MessageResponse> {
    try {
      switch (message.type) {
        case 'CONVERT_FILE':
          return await this.handleFileConversion(message.data.file);

        case 'GET_HISTORY':
          return await this.getHistory();

        case 'DELETE_HISTORY_ITEM':
          return await this.deleteHistoryItem(message.data.id);

        case 'GET_CONFIG':
          return await this.getConfig();

        case 'UPDATE_CONFIG':
          return await this.updateConfig(message.data);

        case 'COPY_TO_CLIPBOARD':
          return await this.copyToClipboard(message.data.text);

        default:
          return { success: false, error: 'Unknown message type' };
      }
    } catch (error) {
      console.error('Error handling message:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Handle file conversion
   */
  private async handleFileConversion(file: File): Promise<MessageResponse> {
    try {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      const configResult = await this.getConfig();
      const config = (configResult.data || {}) as AppConfig;
      const options = this.getConversionOptions(config);

      let result: ConversionResult;

      // Detect file type and use appropriate parser
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        result = await this.pdfParser.parse(file, options);
      } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileType === 'application/msword' ||
        fileName.endsWith('.docx') ||
        fileName.endsWith('.doc')
      ) {
        result = await this.docxParser.parse(file, options);
      } else {
        return {
          success: false,
          error: `Unsupported file type: ${fileType}`,
        };
      }

      // Generate unique ID
      const id = `mdflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add to history
      await this.saveConversionToHistory({ id, taskId: id, ...result });

      // Handle output based on config
      if (config.autoDownload) {
        await this.downloadFile(result);
      } else {
        await this.copyToClipboard(result.markdown);
      }

      this.showNotification('File converted successfully!', 'success');

      return { success: true, data: result };
    } catch (error) {
      console.error('Error converting file:', error);
      this.showNotification('File conversion failed: ' + (error as Error).message, 'error');
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Save conversion result to history
   */
  private async saveConversionToHistory(result: ConversionResult & { id: string; taskId: string }): Promise<void> {
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
   * Get conversion history
   */
  private async getHistory(): Promise<MessageResponse> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      const history = result[STORAGE_KEYS.HISTORY] || [];
      return { success: true, data: history };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Delete history item
   */
  private async deleteHistoryItem(id: string): Promise<MessageResponse> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      const history = result[STORAGE_KEYS.HISTORY] || [];
      const newHistory = history.filter((item: any) => item.id !== id);

      await chrome.storage.local.set({
        [STORAGE_KEYS.HISTORY]: newHistory,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get configuration
   */
  private async getConfig(): Promise<MessageResponse> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
      const config = result[STORAGE_KEYS.CONFIG] || {};
      return { success: true, data: config };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Update configuration
   */
  private async updateConfig(updates: any): Promise<MessageResponse> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
      const config = { ...result[STORAGE_KEYS.CONFIG], ...updates };

      await chrome.storage.local.set({
        [STORAGE_KEYS.CONFIG]: config,
      });

      return { success: true, data: config };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Copy text to clipboard
   */
  private async copyToClipboard(text: string): Promise<MessageResponse> {
    try {
      await navigator.clipboard.writeText(text);

      // Get config to check if notification should be shown
      const configResult = await this.getConfig();
      const config = configResult.data as AppConfig;

      if (config.showNotifications !== false) {
        this.showNotification('Copied to clipboard!', 'success');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Download markdown as a file
   */
  private async downloadFile(result: ConversionResult): Promise<void> {
    try {
      // Create blob
      const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      // Sanitize filename
      const filename = this.sanitizeFilename(result.title);

      // Download file
      await chrome.downloads.download({
        url,
        filename: `mdflow/${filename}.md`,
        saveAs: false,
      });

      // Clean up object URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Sanitize filename for safe download
   */
  private sanitizeFilename(filename: string): string {
    // Remove invalid characters
    let sanitized = filename
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 200); // Limit length

    // If empty, use default
    if (!sanitized) {
      sanitized = 'untitled';
    }

    return sanitized;
  }

  /**
   * Setup keyboard shortcut listeners
   */
  private setupCommandListener() {
    chrome.commands.onCommand.addListener(async (command) => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      try {
        switch (command) {
          case 'convert-page':
            await this.convertPage(tab.id, tab.url!);
            break;
          case 'convert-selection':
            await this.convertSelection(tab.id);
            break;
        }
      } catch (error) {
        console.error('Error executing command:', error);
      }
    });
  }

  /**
   * Setup install/update listener
   */
  private setupInstallListener() {
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === 'install') {
        // On first install, open options page
        chrome.runtime.openOptionsPage();
      } else if (details.reason === 'update') {
        // Handle updates if needed
        console.log('Extension updated to version:', chrome.runtime.getManifest().version);
      }
    });
  }

  /**
   * Show system notification
   */
  private showNotification(message: string, type: 'success' | 'error' = 'success') {
    const notificationOptions: chrome.notifications.NotificationOptions = {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: type === 'success' ? 'Success' : 'Error',
      message,
      priority: 2,
    };

    chrome.notifications.create(notificationOptions);
  }
}

// Initialize background service
new BackgroundService();
