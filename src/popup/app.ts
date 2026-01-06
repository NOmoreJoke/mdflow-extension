import { STORAGE_KEYS } from '@/types/config';
import type { ConversionResult } from '@/types';

class PopupApp {
  private recentList: HTMLElement;
  private dropZone: HTMLElement;
  private fileInput: HTMLInputElement;

  constructor() {
    this.recentList = document.getElementById('recentList')!;
    this.dropZone = document.getElementById('dropZone')!;
    this.fileInput = document.getElementById('fileInput') as HTMLInputElement;
    this.init();
  }

  private init() {
    this.bindEvents();
    this.loadRecentConversions();
  }

  private bindEvents() {
    // Convert page button
    document.getElementById('convertPageBtn')?.addEventListener('click', () => this.convertCurrentPage());

    // Convert selection button
    document.getElementById('convertSelectionBtn')?.addEventListener('click', () => this.convertSelection());

    // Options button
    document.getElementById('optionsBtn')?.addEventListener('click', () => this.openOptions());

    // History button
    document.getElementById('historyBtn')?.addEventListener('click', () => this.openHistory());
    document.getElementById('viewHistoryBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openHistory();
    });

    // File upload
    this.dropZone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.dropZone.addEventListener('dragleave', () => this.handleDragLeave());
    this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));
  }

  private async convertCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;

      // Send message to background script
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'CONVERT_PAGE',
        data: { url: tab.url },
      });

      if (response.success) {
        this.showToast('Page converted successfully!', 'success');
        await this.loadRecentConversions();
      } else {
        this.showToast('Conversion failed: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('Error converting page:', error);
      this.showToast('An error occurred', 'error');
    }
  }

  private async convertSelection() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'CONVERT_SELECTION',
        data: {},
      });

      if (response.success) {
        this.showToast('Selection converted!', 'success');
        await this.loadRecentConversions();
      } else {
        this.showToast('Conversion failed: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('Error converting selection:', error);
      this.showToast('No selection or error occurred', 'error');
    }
  }

  private async handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      await this.processFile(file);
    }
    input.value = '';
  }

  private handleDragOver(event: DragEvent) {
    event.preventDefault();
    this.dropZone.classList.add('drag-over');
  }

  private handleDragLeave() {
    this.dropZone.classList.remove('drag-over');
  }

  private async handleDrop(event: DragEvent) {
    event.preventDefault();
    this.dropZone.classList.remove('drag-over');

    const file = event.dataTransfer?.files[0];
    if (file) {
      await this.processFile(file);
    }
  }

  private async processFile(file: File) {
    this.showToast('Processing file...', 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CONVERT_FILE',
        data: { file },
      });

      if (response.success) {
        this.showToast('File converted successfully!', 'success');
        await this.loadRecentConversions();
      } else {
        this.showToast('Conversion failed: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      this.showToast('An error occurred', 'error');
    }
  }

  private async loadRecentConversions() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      const history: ConversionResult[] = result[STORAGE_KEYS.HISTORY] || [];

      // Show last 5 items
      const recentItems = history.slice(0, 5);
      this.renderRecentConversions(recentItems);
    } catch (error) {
      console.error('Error loading history:', error);
      this.renderEmptyState();
    }
  }

  private renderRecentConversions(items: ConversionResult[]) {
    if (items.length === 0) {
      this.renderEmptyState();
      return;
    }

    this.recentList.innerHTML = items
      .map(
        (item) => `
      <div class="recent-item" data-id="${item.timestamp}">
        <div class="recent-item-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="recent-item-content">
          <div class="recent-item-title">${this.escapeHtml(item.title)}</div>
          <div class="recent-item-meta">
            <span>${this.formatDate(item.timestamp)}</span>
          </div>
        </div>
        <div class="recent-item-actions">
          <button class="recent-item-action" data-action="copy" title="Copy to clipboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 16H6C5.46957 16 4.96086 15.7893 4.58579 15.4142C4.21071 15.0391 4 14.5304 4 14V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H14C14.5304 4 15.0391 4.21071 15.4142 4.58579C15.7893 4.96086 16 5.46957 16 6V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 8H18C18.5304 8 19.0391 8.21071 19.4142 8.58579C19.7893 8.96086 20 9.46957 20 10V18C20 18.5304 19.7893 19.0391 19.4142 19.4142C19.0391 19.7893 18.5304 20 18 20H10C9.46957 20 8.96086 19.7893 8.58579 19.4142C8.21071 19.0391 8 18.5304 8 18V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="recent-item-action" data-action="download" title="Download">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    `
      )
      .join('');

    // Bind action buttons
    this.recentList.querySelectorAll('.recent-item-action').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (btn as HTMLElement).dataset.action;
        const itemId = btn.closest('.recent-item')?.dataset.id;
        if (itemId) {
          this.handleItemAction(action!, itemId);
        }
      });
    });
  }

  private renderEmptyState() {
    this.recentList.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>No recent conversions</p>
      </div>
    `;
  }

  private async handleItemAction(action: string, itemId: string) {
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    const history: ConversionResult[] = result[STORAGE_KEYS.HISTORY] || [];
    const item = history.find((i) => i.timestamp === Number(itemId));

    if (!item) return;

    if (action === 'copy') {
      await this.copyToClipboard(item.markdown);
      this.showToast('Copied to clipboard!', 'success');
    } else if (action === 'download') {
      this.downloadMarkdown(item);
    }
  }

  private async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  private downloadMarkdown(item: ConversionResult) {
    const blob = new Blob([item.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const filename = this.sanitizeFilename(item.title);

    chrome.downloads.download({
      url,
      filename: `mdflow/${filename}.md`,
      saveAs: true,
    });
  }

  private openOptions() {
    chrome.runtime.openOptionsPage();
  }

  private openHistory() {
    chrome.tabs.create({ url: 'history.html' });
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    let toast = document.querySelector('.toast') as HTMLElement;
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  private sanitizeFilename(title: string): string {
    return title
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .slice(0, 50);
  }
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PopupApp());
} else {
  new PopupApp();
}
