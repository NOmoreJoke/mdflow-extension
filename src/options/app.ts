import { STORAGE_KEYS, DEFAULT_CONFIG } from '@/types/config';
import type { AppConfig } from '@/types';
import { ruleManager, type CustomRule } from '@/core/rule-manager';
import { templateManager, type Template } from '@/core/template-manager';

class OptionsApp {
  private currentSection: string = 'general';
  private config: AppConfig;
  private rules: CustomRule[] = [];
  private templates: Template[] = [];

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.init();
  }

  private async init() {
    await this.loadConfig();
    await this.loadRulesAndTemplates();
    this.bindEvents();
    this.populateForm();
    this.renderRules();
    this.renderTemplates();
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

  private async loadRulesAndTemplates() {
    try {
      await ruleManager.init();
      await templateManager.init();
      this.rules = ruleManager.getRules();
      this.templates = templateManager.getTemplates();
    } catch (error) {
      console.error('Error loading rules/templates:', error);
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

    // Rules section buttons
    document.getElementById('addRuleBtn')?.addEventListener('click', () => this.showAddRuleDialog());
    document.getElementById('importRulesBtn')?.addEventListener('click', () => this.importRules());
    document.getElementById('exportRulesBtn')?.addEventListener('click', () => this.exportRules());

    // Templates section buttons
    document.getElementById('addTemplateBtn')?.addEventListener('click', () => this.showAddTemplateDialog());
  }

  private switchSection(sectionId: string) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach((item) => {
      const navItem = item as HTMLElement;
      if (navItem.dataset.section === sectionId) {
        navItem.classList.add('active');
      } else {
        navItem.classList.remove('active');
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

    // Export settings
    this.setSelectValue('exportFormat', this.config.defaultFormat);
    this.setCheckboxValue('exportIncludeTitle', this.config.exportOptions?.includeTitle ?? true);
    this.setCheckboxValue('exportIncludeMetadata', this.config.exportOptions?.includeMetadata ?? false);
    this.setTextAreaValue('customStyles', this.config.exportOptions?.customStyles ?? '');

    // Default template
    this.populateTemplateDropdown();
    if (this.config.defaultTemplateId) {
      this.setSelectValue('defaultTemplate', this.config.defaultTemplateId);
    }
  }

  private populateTemplateDropdown() {
    const select = document.getElementById('defaultTemplate') as HTMLSelectElement;
    if (!select) return;

    // Clear existing options except first
    while (select.options.length > 1) {
      select.remove(1);
    }

    // Add template options
    for (const template of this.templates) {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = `${template.icon || '📄'} ${template.name}`;
      select.appendChild(option);
    }
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

  private setTextAreaValue(id: string, value: string) {
    const textarea = document.getElementById(id) as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = value;
    }
  }

  private getTextAreaValue(id: string): string {
    const textarea = document.getElementById(id) as HTMLTextAreaElement;
    return textarea?.value ?? '';
  }

  // Rules rendering
  private renderRules() {
    const container = document.getElementById('rulesList');
    const emptyState = document.getElementById('rulesEmptyState');
    if (!container) return;

    // Clear existing rules (keep empty state)
    Array.from(container.children).forEach((child) => {
      if (child.id !== 'rulesEmptyState') {
        child.remove();
      }
    });

    if (this.rules.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    for (const rule of this.rules) {
      const ruleEl = this.createRuleElement(rule);
      container.appendChild(ruleEl);
    }
  }

  private createRuleElement(rule: CustomRule): HTMLElement {
    const div = document.createElement('div');
    div.className = `rule-item ${rule.enabled ? '' : 'disabled'}`;
    div.dataset.ruleId = rule.id;

    div.innerHTML = `
      <label class="rule-toggle">
        <input type="checkbox" ${rule.enabled ? 'checked' : ''} />
        <span class="toggle"></span>
      </label>
      <div class="rule-info">
        <div class="rule-name">${this.escapeHtml(rule.name)}</div>
        <div class="rule-description">${this.escapeHtml(rule.description || 'No description')}</div>
      </div>
      <span class="rule-type">${rule.type}</span>
      <div class="rule-actions">
        <button class="edit-btn" title="Edit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18.5 2.50023C18.8978 2.1024 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.1024 21.5 2.50023C21.8978 2.89805 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.1024 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="delete-btn danger" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    `;

    // Bind events
    const checkbox = div.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.addEventListener('change', () => this.toggleRule(rule.id));

    const editBtn = div.querySelector('.edit-btn');
    editBtn?.addEventListener('click', () => this.editRule(rule.id));

    const deleteBtn = div.querySelector('.delete-btn');
    deleteBtn?.addEventListener('click', () => this.deleteRule(rule.id));

    return div;
  }

  private async toggleRule(id: string) {
    await ruleManager.toggleRule(id);
    this.rules = ruleManager.getRules();
    this.renderRules();
  }

  private async deleteRule(id: string) {
    if (confirm('Are you sure you want to delete this rule?')) {
      await ruleManager.deleteRule(id);
      this.rules = ruleManager.getRules();
      this.renderRules();
      this.showToast('Rule deleted', 'success');
    }
  }

  private editRule(_id: string) {
    // TODO: Implement rule editing dialog
    this.showToast('Rule editor coming soon', 'success');
  }

  private showAddRuleDialog() {
    // TODO: Implement add rule dialog
    this.showToast('Rule creator coming soon', 'success');
  }

  private async importRules() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const count = await ruleManager.importRules(text, true);
        this.rules = ruleManager.getRules();
        this.renderRules();
        this.showToast(`Imported ${count} rules`, 'success');
      } catch (error) {
        this.showToast('Failed to import rules', 'error');
      }
    };
    input.click();
  }

  private exportRules() {
    const json = ruleManager.exportRules();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mdflow-rules.json';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Rules exported', 'success');
  }

  // Templates rendering
  private renderTemplates() {
    const container = document.getElementById('templatesList');
    if (!container) return;

    container.innerHTML = '';

    for (const template of this.templates) {
      const templateEl = this.createTemplateElement(template);
      container.appendChild(templateEl);
    }
  }

  private createTemplateElement(template: Template): HTMLElement {
    const div = document.createElement('div');
    div.className = `template-card ${this.config.defaultTemplateId === template.id ? 'selected' : ''}`;
    div.dataset.templateId = template.id;

    div.innerHTML = `
      <div class="template-icon">${template.icon || '📄'}</div>
      <div class="template-name">${this.escapeHtml(template.name)}</div>
      <div class="template-description">${this.escapeHtml(template.description)}</div>
      <span class="template-badge ${template.isBuiltIn ? 'built-in' : ''}">${template.isBuiltIn ? 'Built-in' : 'Custom'}</span>
    `;

    div.addEventListener('click', () => this.selectTemplate(template.id));

    return div;
  }

  private selectTemplate(id: string) {
    this.config.defaultTemplateId = id;
    this.setSelectValue('defaultTemplate', id);

    // Update visual selection
    document.querySelectorAll('.template-card').forEach((card) => {
      const cardEl = card as HTMLElement;
      if (cardEl.dataset.templateId === id) {
        cardEl.classList.add('selected');
      } else {
        cardEl.classList.remove('selected');
      }
    });
  }

  private showAddTemplateDialog() {
    // TODO: Implement add template dialog
    this.showToast('Template creator coming soon', 'success');
  }

  private async saveSettings() {
    try {
      // Gather form data
      const language = (document.getElementById('language') as HTMLSelectElement)?.value || 'en';
      const theme = (document.getElementById('theme') as HTMLSelectElement)?.value || 'auto';
      const defaultFormat = (document.getElementById('defaultFormat') as HTMLSelectElement)?.value || 'markdown';
      const autoDownload = (document.getElementById('autoDownload') as HTMLInputElement)?.checked ?? false;
      const showNotifications = (document.getElementById('showNotifications') as HTMLInputElement)?.checked ?? true;

      // Export settings
      const exportIncludeTitle = (document.getElementById('exportIncludeTitle') as HTMLInputElement)?.checked ?? true;
      const exportIncludeMetadata = (document.getElementById('exportIncludeMetadata') as HTMLInputElement)?.checked ?? false;
      const customStyles = this.getTextAreaValue('customStyles');

      // Template selection
      const defaultTemplateId = (document.getElementById('defaultTemplate') as HTMLSelectElement)?.value || undefined;

      const newConfig: Partial<AppConfig> = {
        language: language as 'en' | 'zh_CN',
        theme: theme as 'light' | 'dark' | 'auto',
        defaultFormat: defaultFormat as 'markdown' | 'html' | 'txt' | 'pdf',
        autoDownload,
        showNotifications,
        defaultTemplateId: defaultTemplateId || undefined,
        exportOptions: {
          includeTitle: exportIncludeTitle,
          includeMetadata: exportIncludeMetadata,
          customStyles: customStyles || undefined,
        },
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

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
