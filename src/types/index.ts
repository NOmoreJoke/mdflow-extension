// Chrome Extension Types
declare global {
  interface Window {
    chrome: typeof chrome;
  }
}

export {};

// Core Types
export interface ConversionResult {
  markdown: string;
  title: string;
  url: string;
  timestamp: number;
  metadata?: ConversionMetadata;
}

export interface ConversionMetadata {
  author?: string;
  date?: string;
  tags?: string[];
  wordCount?: number;
  imageCount?: number;
  codeBlocks?: number;
}

export interface ConversionOptions {
  format: 'markdown' | 'html' | 'txt' | 'pdf';
  includeMetadata: boolean;
  preserveFormatting: boolean;
  downloadImages: boolean;
  mathJax: boolean;
  codeHighlight: boolean;
  customRules?: Record<string, string>;
}

export interface ConversionTask {
  id: string;
  url: string;
  type: 'page' | 'selection' | 'link' | 'file';
  fileType?: 'pdf' | 'docx' | 'txt';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: ConversionResult;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface HistoryItem extends ConversionResult {
  id: string;
  taskId: string;
}

export interface AppConfig {
  language: 'en' | 'zh_CN';
  theme: 'light' | 'dark' | 'auto';
  defaultFormat: 'markdown' | 'html' | 'txt' | 'pdf';
  autoDownload: boolean;
  showNotifications: boolean;
  maxHistoryItems: number;
  keyboardShortcuts: {
    convertPage: string;
    convertSelection: string;
  };
}

// Parser Types
export interface Parser {
  canParse(content: string, type: string): boolean;
  parse(content: string, options: ConversionOptions): Promise<ConversionResult>;
}

export interface Formatter {
  format(content: string, options: ConversionOptions): string;
}

// Storage Types
export interface StorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Message Types for Chrome Runtime
export type Message =
  | { type: 'CONVERT_PAGE'; data: { url: string; options: ConversionOptions } }
  | { type: 'CONVERT_SELECTION'; data: { html: string; options: ConversionOptions } }
  | { type: 'CONVERT_FILE'; data: { file: File; options: ConversionOptions } }
  | { type: 'CONVERT_LINK'; data: { url: string } }
  | { type: 'GET_HISTORY' }
  | { type: 'DELETE_HISTORY_ITEM'; data: { id: string } }
  | { type: 'GET_CONFIG' }
  | { type: 'UPDATE_CONFIG'; data: Partial<AppConfig> }
  | { type: 'COPY_TO_CLIPBOARD'; data: { text: string } }
  | { type: 'BATCH_CONVERT'; data: { items: Array<{ urlOrFile: string | File; type: string }>; options: ConversionOptions } }
  | { type: 'GET_QUEUE_STATS' }
  | { type: 'PAUSE_QUEUE' }
  | { type: 'RESUME_QUEUE' }
  | { type: 'CLEAR_QUEUE' };

export type MessageResponse =
  | { success: true; data: ConversionResult }
  | { success: true; data: HistoryItem[] }
  | { success: true; data: AppConfig }
  | { success: true; data: { tasks: Array<{ id: string; status: string }>; message: string } }
  | { success: true; data: { total: number; pending: number; processing: number; completed: number; failed: number } }
  | { success: true; data: { message: string } }
  | { success: false; error: string }
  | { success: boolean };
