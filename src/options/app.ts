import { STORAGE_KEYS, DEFAULT_CONFIG } from '@/types/config';
import type { AppConfig } from '@/types';

class OptionsApp {
  private currentSection: string = 'general';
  private config: AppConfig;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.init();
  }

  private async init() {
    await this.loadConfig();
    this.bindEvents();
    this.populateForm();
  }

  private async loadConfig() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
      this.config = { ...DEFAULT_CONFIG, ...result[STORAGE_KEYS.CONFIG] };
    } catch (error) {
      console.error('Error loading config:', error);
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  private bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const section = target.dataset.section;
        if (section) {
          this.switchSection(section);
        }
      });
    });

    // Save button
    document.getElementById('saveBtn')?.addEventListener('click', () => this.saveSettings());
  }

  private switchSection(sectionId: string) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach((item) => {
      if (item.dataset.section === sectionId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update sections
    document.querySelectorAll('.content-section').forEach((section) => {
      if (section.id === `${sectionId}-section`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    this.currentSection = sectionId;
  }

  private populateForm() {
    // General settings
    this.setSelectValue('language', this.config.language);
    this.setSelectValue('theme', this.config.theme);
    this.setSelectValue('defaultFormat', this.config.defaultFormat);
    this.setCheckboxValue('autoDownload', this.config.autoDownload);
    this.setCheckboxValue('showNotifications', this.config.showNotifications);
  }

  private setSelectValue(id: string, value: string) {
    const select = document.getElementById(id) as HTMLSelectElement;
    if (select) {
      select.value = value;
    }
  }

  private setCheckboxValue(id: string, checked: boolean) {
    const checkbox = document.getElementById(id) as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = checked;
    }
  }

  private async saveSettings() {
    try {
      // Gather form data
      const newConfig: Partial<AppConfig> = {
        language: (document.getElementById('language') as HTMLSelectElement).value,
        theme: (document.getElementById('theme') as HTMLSelectElement).value,
        defaultFormat: (document.getElementById('defaultFormat') as HTMLSelectElement).value,
        autoDownload: (document.getElementById('autoDownload') as HTMLInputElement).checked,
        showNotifications: (document.getElementById('showNotifications') as HTMLInputElement).checked,
      };

      // Merge with existing config
      this.config = { ...this.config, ...newConfig };

      // Save to storage
      await chrome.storage.local.set({
        [STORAGE_KEYS.CONFIG]: this.config,
      });

      this.showToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showToast('Failed to save settings', 'error');
    }
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
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new OptionsApp());
} else {
  new OptionsApp();
}
