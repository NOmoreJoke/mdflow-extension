/**
 * Template Manager
 * Manages preset conversion templates for MDFlow Extension
 */

import { chromeStorage } from '@/storage';
import type { ConversionOptions } from '@/types';

/**
 * Conversion template definition
 */
export interface Template {
    id: string;
    name: string;
    description: string;
    icon?: string;       // Emoji or icon identifier
    isBuiltIn: boolean;

    // Conversion options
    options: Partial<ConversionOptions>;

    // Output customization
    outputPrefix?: string;   // Text to prepend to output
    outputSuffix?: string;   // Text to append to output
    frontMatter?: Record<string, string>; // Custom front matter fields

    // Rule overrides
    enabledRuleIds?: string[];
    disabledRuleIds?: string[];

    // Metadata
    createdAt: number;
    updatedAt: number;
}

/**
 * Built-in templates for common use cases
 */
export const BUILT_IN_TEMPLATES: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
        name: 'Default',
        description: 'Standard markdown output with metadata',
        icon: '📄',
        isBuiltIn: true,
        options: {
            format: 'markdown',
            includeMetadata: true,
            preserveFormatting: true,
            downloadImages: false,
            mathJax: true,
            codeHighlight: true,
        },
    },
    {
        name: 'Clean Text',
        description: 'Minimal output without metadata or images',
        icon: '📝',
        isBuiltIn: true,
        options: {
            format: 'markdown',
            includeMetadata: false,
            preserveFormatting: true,
            downloadImages: false,
            mathJax: false,
            codeHighlight: false,
        },
    },
    {
        name: 'Academic',
        description: 'Optimized for research papers with citations',
        icon: '🎓',
        isBuiltIn: true,
        options: {
            format: 'markdown',
            includeMetadata: true,
            preserveFormatting: true,
            downloadImages: false,
            mathJax: true,
            codeHighlight: true,
        },
        frontMatter: {
            type: 'article',
            category: 'research',
        },
        outputPrefix: '> Source: {url}\n> Date: {date}\n\n---\n\n',
    },
    {
        name: 'Documentation',
        description: 'For technical documentation with code',
        icon: '📚',
        isBuiltIn: true,
        options: {
            format: 'markdown',
            includeMetadata: true,
            preserveFormatting: true,
            downloadImages: false,
            mathJax: false,
            codeHighlight: true,
        },
        frontMatter: {
            type: 'documentation',
        },
    },
    {
        name: 'Blog Post',
        description: 'For blog articles and news',
        icon: '📰',
        isBuiltIn: true,
        options: {
            format: 'markdown',
            includeMetadata: true,
            preserveFormatting: true,
            downloadImages: true,
            mathJax: false,
            codeHighlight: true,
        },
        frontMatter: {
            type: 'blog',
            draft: 'true',
        },
    },
    {
        name: 'Obsidian',
        description: 'Optimized for Obsidian vault',
        icon: '💎',
        isBuiltIn: true,
        options: {
            format: 'markdown',
            includeMetadata: true,
            preserveFormatting: true,
            downloadImages: false,
            mathJax: true,
            codeHighlight: true,
        },
        frontMatter: {
            source: '{url}',
            created: '{date}',
        },
        outputPrefix: '',
        outputSuffix: '\n\n---\n\n#web-clipping',
    },
    {
        name: 'Notion',
        description: 'Compatible with Notion import',
        icon: '📓',
        isBuiltIn: true,
        options: {
            format: 'markdown',
            includeMetadata: false,
            preserveFormatting: true,
            downloadImages: false,
            mathJax: true,
            codeHighlight: true,
        },
    },
];

const STORAGE_KEY = 'mdflow_templates';

class TemplateManager {
    private templates: Template[] = [];
    private initialized: boolean = false;

    /**
     * Initialize the template manager
     */
    async init(): Promise<void> {
        if (this.initialized) return;

        await this.loadTemplates();
        this.initialized = true;
    }

    /**
     * Load templates from storage
     */
    async loadTemplates(): Promise<Template[]> {
        try {
            const stored = await chromeStorage.get<Template[]>(STORAGE_KEY);
            this.templates = stored || [];

            // Ensure built-in templates are included
            await this.ensureBuiltInTemplates();

            return this.templates;
        } catch (error) {
            console.error('Failed to load templates:', error);
            this.templates = [];
            return [];
        }
    }

    /**
     * Ensure built-in templates exist
     */
    private async ensureBuiltInTemplates(): Promise<void> {
        const existingNames = new Set(this.templates.map(t => t.name));
        const now = Date.now();

        for (const builtIn of BUILT_IN_TEMPLATES) {
            if (!existingNames.has(builtIn.name)) {
                this.templates.push({
                    ...builtIn,
                    id: this.generateId(),
                    createdAt: now,
                    updatedAt: now,
                });
            }
        }

        await this.saveTemplates();
    }

    /**
     * Save templates to storage
     */
    private async saveTemplates(): Promise<void> {
        try {
            await chromeStorage.set(STORAGE_KEY, this.templates);
        } catch (error) {
            console.error('Failed to save templates:', error);
        }
    }

    /**
     * Get all templates
     */
    getTemplates(): Template[] {
        // Sort: built-in first, then by name
        return [...this.templates].sort((a, b) => {
            if (a.isBuiltIn && !b.isBuiltIn) return -1;
            if (!a.isBuiltIn && b.isBuiltIn) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Get built-in templates only
     */
    getBuiltInTemplates(): Template[] {
        return this.templates.filter(t => t.isBuiltIn);
    }

    /**
     * Get custom (user-created) templates only
     */
    getCustomTemplates(): Template[] {
        return this.templates.filter(t => !t.isBuiltIn);
    }

    /**
     * Get a template by ID
     */
    getTemplate(id: string): Template | undefined {
        return this.templates.find(t => t.id === id);
    }

    /**
     * Get a template by name
     */
    getTemplateByName(name: string): Template | undefined {
        return this.templates.find(t => t.name === name);
    }

    /**
     * Get the default template
     */
    getDefaultTemplate(): Template {
        const defaultTemplate = this.getTemplateByName('Default');
        if (defaultTemplate) return defaultTemplate;

        // Fallback if Default template not found
        return this.templates[0] || this.createFallbackTemplate();
    }

    /**
     * Create a fallback template
     */
    private createFallbackTemplate(): Template {
        return {
            id: 'fallback',
            name: 'Default',
            description: 'Standard markdown output',
            isBuiltIn: true,
            options: {
                format: 'markdown',
                includeMetadata: true,
                preserveFormatting: true,
                downloadImages: false,
                mathJax: true,
                codeHighlight: true,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    }

    /**
     * Add a new template
     */
    async addTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>): Promise<Template> {
        const now = Date.now();
        const newTemplate: Template = {
            ...template,
            id: this.generateId(),
            isBuiltIn: false,
            createdAt: now,
            updatedAt: now,
        };

        this.templates.push(newTemplate);
        await this.saveTemplates();

        return newTemplate;
    }

    /**
     * Update an existing template (only custom templates can be updated)
     */
    async updateTemplate(id: string, updates: Partial<Omit<Template, 'id' | 'createdAt' | 'isBuiltIn'>>): Promise<Template | null> {
        const index = this.templates.findIndex(t => t.id === id);
        if (index === -1) return null;

        const template = this.templates[index];
        if (template.isBuiltIn) {
            console.warn('Cannot update built-in template');
            return null;
        }

        this.templates[index] = {
            ...template,
            ...updates,
            updatedAt: Date.now(),
        };

        await this.saveTemplates();
        return this.templates[index];
    }

    /**
     * Delete a template (only custom templates can be deleted)
     */
    async deleteTemplate(id: string): Promise<boolean> {
        const template = this.getTemplate(id);
        if (!template || template.isBuiltIn) {
            return false;
        }

        const index = this.templates.findIndex(t => t.id === id);
        this.templates.splice(index, 1);
        await this.saveTemplates();

        return true;
    }

    /**
     * Duplicate a template
     */
    async duplicateTemplate(id: string): Promise<Template | null> {
        const original = this.getTemplate(id);
        if (!original) return null;

        const duplicate = await this.addTemplate({
            ...original,
            name: `${original.name} (Copy)`,
            description: original.description,
            icon: original.icon,
            options: { ...original.options },
            outputPrefix: original.outputPrefix,
            outputSuffix: original.outputSuffix,
            frontMatter: original.frontMatter ? { ...original.frontMatter } : undefined,
            enabledRuleIds: original.enabledRuleIds ? [...original.enabledRuleIds] : undefined,
            disabledRuleIds: original.disabledRuleIds ? [...original.disabledRuleIds] : undefined,
        });

        return duplicate;
    }

    /**
     * Apply template to get conversion options
     */
    applyTemplate(template: Template, baseOptions: Partial<ConversionOptions> = {}): ConversionOptions {
        return {
            format: 'markdown',
            includeMetadata: true,
            preserveFormatting: true,
            downloadImages: false,
            mathJax: true,
            codeHighlight: true,
            ...baseOptions,
            ...template.options,
        };
    }

    /**
     * Process output with template prefix/suffix
     */
    processOutput(output: string, template: Template, context: { url: string; date: string; title: string }): string {
        let result = output;

        // Apply prefix
        if (template.outputPrefix) {
            const prefix = this.replaceVariables(template.outputPrefix, context);
            result = prefix + result;
        }

        // Apply suffix
        if (template.outputSuffix) {
            const suffix = this.replaceVariables(template.outputSuffix, context);
            result = result + suffix;
        }

        return result;
    }

    /**
     * Generate front matter from template
     */
    generateFrontMatter(template: Template, context: { url: string; date: string; title: string }): string {
        if (!template.frontMatter || Object.keys(template.frontMatter).length === 0) {
            return '';
        }

        const lines = ['---'];

        for (const [key, value] of Object.entries(template.frontMatter)) {
            const processedValue = this.replaceVariables(value, context);
            lines.push(`${key}: ${processedValue}`);
        }

        lines.push('---', '');
        return lines.join('\n');
    }

    /**
     * Replace template variables
     */
    private replaceVariables(text: string, context: { url: string; date: string; title: string }): string {
        return text
            .replace(/\{url\}/g, context.url)
            .replace(/\{date\}/g, context.date)
            .replace(/\{title\}/g, context.title);
    }

    /**
     * Generate a unique ID
     */
    private generateId(): string {
        return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Export templates as JSON
     */
    exportTemplates(includeBuiltIn: boolean = false): string {
        const toExport = includeBuiltIn
            ? this.templates
            : this.getCustomTemplates();
        return JSON.stringify(toExport, null, 2);
    }

    /**
     * Import templates from JSON
     */
    async importTemplates(json: string, merge: boolean = true): Promise<number> {
        try {
            const imported = JSON.parse(json) as Template[];

            if (!Array.isArray(imported)) {
                throw new Error('Invalid templates format');
            }

            // Only import non-built-in templates
            const customImported = imported.filter(t => !t.isBuiltIn);

            if (merge) {
                const existingNames = new Map(this.getCustomTemplates().map(t => [t.name, t]));

                for (const template of customImported) {
                    if (existingNames.has(template.name)) {
                        // Update existing template
                        const existing = existingNames.get(template.name)!;
                        Object.assign(existing, template, { id: existing.id, updatedAt: Date.now() });
                    } else {
                        // Add new template
                        this.templates.push({
                            ...template,
                            id: this.generateId(),
                            isBuiltIn: false,
                            updatedAt: Date.now(),
                        });
                    }
                }
            } else {
                // Remove all custom templates and add imported ones
                this.templates = this.templates.filter(t => t.isBuiltIn);

                for (const template of customImported) {
                    this.templates.push({
                        ...template,
                        id: this.generateId(),
                        isBuiltIn: false,
                        updatedAt: Date.now(),
                    });
                }
            }

            await this.saveTemplates();
            return customImported.length;
        } catch (error) {
            console.error('Failed to import templates:', error);
            throw error;
        }
    }

    /**
     * Reset to built-in templates only
     */
    async resetToDefaults(): Promise<void> {
        this.templates = [];
        await this.ensureBuiltInTemplates();
    }
}

// Singleton instance
export const templateManager = new TemplateManager();
export { TemplateManager };
