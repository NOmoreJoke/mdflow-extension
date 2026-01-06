import { AppConfig, ConversionOptions } from './index';

// Default configuration values
export const DEFAULT_CONFIG: AppConfig = {
  language: 'en',
  theme: 'auto',
  defaultFormat: 'markdown',
  autoDownload: false,
  showNotifications: true,
  maxHistoryItems: 100,
  keyboardShortcuts: {
    convertPage: 'Ctrl+Shift+M',
    convertSelection: 'Ctrl+Shift+K',
  },
};

// Default conversion options
export const DEFAULT_CONVERSION_OPTIONS: ConversionOptions = {
  format: 'markdown',
  includeMetadata: true,
  preserveFormatting: true,
  downloadImages: false,
  mathJax: true,
  codeHighlight: true,
};

// Storage keys
export const STORAGE_KEYS = {
  CONFIG: 'mdflow_config',
  HISTORY: 'mdflow_history',
  TASKS: 'mdflow_tasks',
} as const;

// Context menu item IDs
export const CONTEXT_MENU_IDS = {
  CONVERT_PAGE: 'convert-page',
  CONVERT_SELECTION: 'convert-selection',
  CONVERT_LINK: 'convert-link',
  CONVERT_IMAGE: 'convert-image',
} as const;

// Supported file types
export const SUPPORTED_FILE_TYPES = {
  PDF: ['application/pdf'],
  DOCX: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ],
  TXT: ['text/plain'],
  HTML: ['text/html', 'application/xhtml+xml'],
} as const;
