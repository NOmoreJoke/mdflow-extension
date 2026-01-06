import { STORAGE_KEYS } from '@/types/config';
import type { ConversionResult } from '@/types';
import { indexedDBStorage } from '@/storage';

interface BatchOperation {
  action: 'download' | 'delete' | 'export';
  items: ConversionResult[];
}

class HistoryApp {
  private historyList: HTMLElement;
  private searchInput: HTMLInputElement;
  private filterSelect: HTMLSelectElement;
  private emptyState: HTMLElement;
  private detailModal: HTMLElement;
  private modalContent: HTMLElement;
  private modalTitle: HTMLElement;
  private modalPreview: HTMLElement;
  private history: ConversionResult[] = [];
  private filteredHistory: ConversionResult[] = [];
  private selectedItem: ConversionResult | null = null;
  private selectedItems: Set<string> = new Set();
  private batchMode: boolean = false;
  private selectAllCheckbox: HTMLInputElement | null = null;
  private exportBtn: HTMLElement | null = null;

  constructor() {
    this.historyList = document.getElementById('historyList')!;
    this.searchInput = document.getElementById('searchInput') as HTMLInputElement;
    this.filterSelect = document.getElementById('filterSelect') as HTMLSelectElement;
    this.emptyState = document.getElementById('emptyState')!;
    this.detailModal = document.getElementById('detailModal')!;
    this.modalContent = this.detailModal.querySelector('.modal-content') as HTMLElement;
    this.modalTitle = document.getElementById('modalTitle')!;
    this.modalPreview = document.getElementById('modalContent')!;
    this.selectAllCheckbox = document.getElementById('selectAllCheckbox') as HTMLInputElement;
    this.exportBtn = document.getElementById('exportBtn');

    this.init();
  }

  private async init() {
    await this.loadHistory();
    await this.initIndexedDB();
    this.bindEvents();
    this.renderHistory();
  }

  /**
   * Initialize IndexedDB
   */
  private async initIndexedDB() {
    try {
      await indexedDBStorage.init();
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
    }
  }

  private async loadHistory() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      this.history = result[STORAGE_KEYS.HISTORY] || [];
      this.filteredHistory = [...this.history];
    } catch (error) {
      console.error('Error loading history:', error);
      this.history = [];
      this.filteredHistory = [];
    }
  }

  private bindEvents() {
    // Back button
    document.getElementById('backBtn')?.addEventListener('click', () => {
      window.close();
    });

    // Clear all button
    document.getElementById('clearAllBtn')?.addEventListener('click', () => this.clearAllHistory());

    // Search input
    this.searchInput.addEventListener('input', (e) => {
      this.filterHistory((e.target as HTMLInputElement).value, this.filterSelect.value);
    });

    // Filter select
    this.filterSelect.addEventListener('change', (e) => {
      this.filterHistory(this.searchInput.value, (e.target as HTMLSelectElement).value);
    });

    // Close modal
    document.getElementById('closeModalBtn')?.addEventListener('click', () => this.closeModal());
    this.detailModal.querySelector('.modal-overlay')?.addEventListener('click', () => this.closeModal());

    // Modal actions
    document.getElementById('copyModalBtn')?.addEventListener('click', () => this.copySelectedItem());
    document.getElementById('downloadModalBtn')?.addEventListener('click', () => this.downloadSelectedItem());

    // Batch mode toggle
    document.getElementById('batchModeBtn')?.addEventListener('click', () => this.toggleBatchMode());

    // Select all checkbox
    this.selectAllCheckbox?.addEventListener('change', () => this.toggleSelectAll());

    // Batch actions
    document.getElementById('batchDownloadBtn')?.addEventListener('click', () => this.batchDownload());
    document.getElementById('batchDeleteBtn')?.addEventListener('click', () => this.batchDelete());

    // Export button
    this.exportBtn?.addEventListener('click', () => this.exportHistory());

    // Re-export button in modal
    document.getElementById('reexportBtn')?.addEventListener('click', () => this.reexportSelectedItem());

    // Keyboard shortcut to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  private renderHistory() {
    if (this.filteredHistory.length === 0) {
      this.historyList.style.display = 'none';
      this.emptyState.style.display = 'flex';
      return;
    }

    this.historyList.style.display = 'grid';
    this.emptyState.style.display = 'none';

    this.historyList.innerHTML = this.filteredHistory
      .map(
        (item, index) => `
      <div class="history-item${this.selectedItems.has(`${item.timestamp}`) ? ' selected' : ''}" data-index="${index}">
        ${this.batchMode ? `
        <div class="history-item-checkbox">
          <input type="checkbox" ${this.selectedItems.has(`${item.timestamp}`) ? 'checked' : ''} data-item-checkbox="${index}">
        </div>
        ` : ''}
        <div class="history-item-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="history-item-content">
          <div class="history-item-header">
            <div class="history-item-title">${this.escapeHtml(item.title)}</div>
            <span class="history-item-badge">${this.getBadgeText(item)}</span>
          </div>
          <div class="history-item-url">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 13C10 13 9.5 14 9.5 16C9.5 18 10 19 10 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M14 13C14 13 14.5 14 14.5 16C14.5 18 14 19 14 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 13H10L12 10L14 13H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="history-item-url-text">${this.escapeHtml(item.url)}</span>
          </div>
          <div class="history-item-meta">
            <div class="history-item-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>${this.formatDate(item.timestamp)}</span>
            </div>
            ${item.metadata?.wordCount ? `
              <div class="history-item-meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2"/>
                  <path d="M7 8H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M7 12H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M7 16H11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>${item.metadata.wordCount} words</span>
              </div>
            ` : ''}
            ${item.metadata?.imageCount ? `
              <div class="history-item-meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                  <path d="M21 15L16 10L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>${item.metadata.imageCount} images</span>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="history-item-actions">
          <button class="action-icon-button" data-action="view" title="View">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button class="action-icon-button" data-action="copy" title="Copy">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 16H6C5.46957 16 4.96086 15.7893 4.58579 15.4142C4.21071 15.0391 4 14.5304 4 14V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H14C14.5304 4 15.0391 4.21071 15.4142 4.58579C15.7893 4.96086 16 5.46957 16 6V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 8H18C18.5304 8 19.0391 8.21071 19.4142 8.58579C19.7893 8.96086 20 9.46957 20 10V18C20 18.5304 19.7893 19.0391 19.4142 19.4142C19.0391 19.7893 18.5304 20 18 20H10C9.46957 20 8.96086 19.7893 8.58579 19.4142C8.21071 19.0391 8 18.5304 8 18V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="action-icon-button" data-action="download" title="Download">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="action-icon-button" data-action="delete" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    `
      )
      .join('');

    // Bind action buttons
    this.historyList.querySelectorAll('.action-icon-button').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (btn as HTMLElement).dataset.action;
        const index = btn.closest('.history-item')?.dataset.index;
        if (index) {
          this.handleItemAction(action!, parseInt(index));
        }
      });
    });

    // Bind item checkboxes in batch mode
    if (this.batchMode) {
      this.historyList.querySelectorAll('[data-item-checkbox]').forEach((checkbox) => {
        checkbox.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt((checkbox as HTMLElement).dataset.itemCheckbox!);
          const item = this.filteredHistory[index];
          if (item) {
            this.toggleItemSelection(item);
          }
        });
      });
    }

    // Bind item click to open modal or select in batch mode
    this.historyList.querySelectorAll('.history-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('.action-icon-button') &&
            !(e.target as HTMLElement).closest('[data-item-checkbox]')) {
          const index = (item as HTMLElement).dataset.index;
          if (index) {
            if (this.batchMode) {
              const itemData = this.filteredHistory[parseInt(index)];
              if (itemData) {
                this.toggleItemSelection(itemData);
              }
            } else {
              this.openModal(parseInt(index));
            }
          }
        }
      });
    });
  }

  private getBadgeText(item: ConversionResult): string {
    const url = item.url.toLowerCase();
    if (url.startsWith('file:')) return 'File';
    if (url.includes('.pdf')) return 'PDF';
    if (url.includes('.doc') || url.includes('.docx')) return 'Word';
    return 'Page';
  }

  private filterHistory(searchTerm: string, filterType: string) {
    let filtered = [...this.history];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(term) ||
          item.url.toLowerCase().includes(term) ||
          item.markdown.toLowerCase().includes(term)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((item) => {
        const url = item.url.toLowerCase();
        switch (filterType) {
          case 'page':
            return url.startsWith('http') && !url.includes('.pdf') && !url.includes('.doc');
          case 'file':
            return url.startsWith('file:');
          case 'selection':
            return false; // We'll need to track selection types in the future
          default:
            return true;
        }
      });
    }

    this.filteredHistory = filtered;
    this.renderHistory();
  }

  private async handleItemAction(action: string, index: number) {
    const item = this.filteredHistory[index];
    if (!item) return;

    switch (action) {
      case 'view':
        if (this.batchMode) {
          this.toggleItemSelection(item);
        } else {
          this.openModal(index);
        }
        break;
      case 'copy':
        if (this.batchMode) {
          this.toggleItemSelection(item);
        } else {
          await this.copyToClipboard(item.markdown);
          this.showToast('Copied to clipboard!', 'success');
        }
        break;
      case 'download':
        if (this.batchMode) {
          this.toggleItemSelection(item);
        } else {
          this.downloadItem(item);
        }
        break;
      case 'delete':
        if (this.batchMode) {
          this.toggleItemSelection(item);
        } else {
          await this.deleteItem(item);
        }
        break;
    }
  }

  private openModal(index: number) {
    const item = this.filteredHistory[index];
    if (!item) return;

    this.selectedItem = item;
    this.modalTitle.textContent = item.title;
    this.modalPreview.textContent = item.markdown;
    this.detailModal.classList.add('show');
  }

  private closeModal() {
    this.detailModal.classList.remove('show');
    this.selectedItem = null;
  }

  private async copySelectedItem() {
    if (!this.selectedItem) return;
    await this.copyToClipboard(this.selectedItem.markdown);
    this.showToast('Copied to clipboard!', 'success');
  }

  private downloadSelectedItem() {
    if (!this.selectedItem) return;
    this.downloadItem(this.selectedItem);
  }

  private async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy:', error);
      this.showToast('Failed to copy', 'error');
    }
  }

  private downloadItem(item: ConversionResult) {
    const blob = new Blob([item.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const filename = this.sanitizeFilename(item.title);

    chrome.downloads.download({
      url,
      filename: `mdflow/${filename}.md`,
      saveAs: true,
    });
  }

  private async deleteItem(item: ConversionResult, skipConfirm: boolean = false) {
    if (!skipConfirm && !confirm('Are you sure you want to delete this item?')) return;

    this.history = this.history.filter((h) => h.timestamp !== item.timestamp);
    await chrome.storage.local.set({
      [STORAGE_KEYS.HISTORY]: this.history,
    });

    if (!skipConfirm) {
      await this.loadHistory();
      this.filterHistory(this.searchInput.value, this.filterSelect.value);
      this.showToast('Item deleted', 'success');
    }
  }

  private async clearAllHistory() {
    if (!confirm('Are you sure you want to clear all history? This cannot be undone.')) return;

    this.history = [];
    await chrome.storage.local.set({
      [STORAGE_KEYS.HISTORY]: [],
    });

    await this.loadHistory();
    this.filterHistory(this.searchInput.value, this.filterSelect.value);
    this.showToast('History cleared', 'success');
  }

  private showToast(message: string, type: 'success' | 'error') {
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
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private sanitizeFilename(title: string): string {
    return title
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .slice(0, 50);
  }

  /**
   * Toggle batch mode
   */
  private toggleBatchMode() {
    this.batchMode = !this.batchMode;
    document.body.classList.toggle('batch-mode', this.batchMode);
    this.selectedItems.clear();
    this.renderHistory();
  }

  /**
   * Toggle select all items
   */
  private toggleSelectAll() {
    if (this.selectAllCheckbox?.checked) {
      for (const item of this.filteredHistory) {
        this.selectedItems.add(`${item.timestamp}`);
      }
    } else {
      this.selectedItems.clear();
    }
    this.renderHistory();
  }

  /**
   * Toggle item selection
   */
  private toggleItemSelection(item: ConversionResult) {
    const key = `${item.timestamp}`;
    if (this.selectedItems.has(key)) {
      this.selectedItems.delete(key);
    } else {
      this.selectedItems.add(key);
    }
    this.renderHistory();
  }

  /**
   * Batch download
   */
  private async batchDownload() {
    const selected = this.getSelectedItems();
    if (selected.length === 0) {
      this.showToast('No items selected', 'error');
      return;
    }

    let downloaded = 0;
    for (const item of selected) {
      this.downloadItem(item);
      downloaded++;
    }

    this.showToast(`Downloaded ${downloaded} items`, 'success');
    this.exitBatchMode();
  }

  /**
   * Batch delete
   */
  private async batchDelete() {
    const selected = this.getSelectedItems();
    if (selected.length === 0) {
      this.showToast('No items selected', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selected.length} items?`)) return;

    for (const item of selected) {
      await this.deleteItem(item, false);
    }

    await this.loadHistory();
    this.filterHistory(this.searchInput.value, this.filterSelect.value);
    this.showToast(`Deleted ${selected.length} items`, 'success');
    this.exitBatchMode();
  }

  /**
   * Get selected items
   */
  private getSelectedItems(): ConversionResult[] {
    return this.filteredHistory.filter(item =>
      this.selectedItems.has(`${item.timestamp}`)
    );
  }

  /**
   * Exit batch mode
   */
  private exitBatchMode() {
    this.batchMode = false;
    this.selectedItems.clear();
    document.body.classList.remove('batch-mode');
    if (this.selectAllCheckbox) {
      this.selectAllCheckbox.checked = false;
    }
    this.renderHistory();
  }

  /**
   * Export history
   */
  private async exportHistory() {
    try {
      // Get all history from IndexedDB
      const allHistory = await indexedDBStorage.getAllHistory();

      // Create JSON export
      const json = JSON.stringify(allHistory, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Download
      const timestamp = new Date().toISOString().slice(0, 10);
      await chrome.downloads.download({
        url,
        filename: `mdflow/history_export_${timestamp}.json`,
        saveAs: true,
      });

      URL.revokeObjectURL(url);
      this.showToast('History exported successfully!', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      this.showToast('Export failed', 'error');
    }
  }

  /**
   * Re-export selected item with different format
   */
  private async reexportSelectedItem() {
    if (!this.selectedItem) return;

    // For now, just download the markdown
    // In the future, this could support HTML/TXT/PDF export
    this.downloadItem(this.selectedItem);
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    const stats = await indexedDBStorage.getHistoryStats();
    return stats;
  }
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new HistoryApp());
} else {
  new HistoryApp();
}
