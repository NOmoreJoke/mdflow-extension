/**
 * Rule Manager
 * Manages custom conversion rules for HTML to Markdown transformation
 */

import { chromeStorage } from '@/storage';

/**
 * Custom conversion rule definition
 */
export interface CustomRule {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    priority: number; // Higher priority rules are applied first
    type: 'element' | 'attribute' | 'class' | 'regex';

    // Rule matching criteria
    selector?: string;      // CSS selector for element rules
    attribute?: string;     // Attribute name for attribute rules
    className?: string;     // Class name for class rules
    pattern?: string;       // Regex pattern for regex rules

    // Transformation
    action: 'remove' | 'replace' | 'wrap' | 'custom';
    replacement?: string;   // Replacement text/markdown
    wrapBefore?: string;    // Text to insert before
    wrapAfter?: string;     // Text to insert after

    // Metadata
    createdAt: number;
    updatedAt: number;
}

/**
 * Built-in rules for common transformations
 */
export const BUILT_IN_RULES: Omit<CustomRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
        name: 'Remove Navigation',
        description: 'Remove navigation elements from output',
        enabled: true,
        priority: 100,
        type: 'element',
        selector: 'nav, [role="navigation"]',
        action: 'remove',
    },
    {
        name: 'Remove Footer',
        description: 'Remove footer elements from output',
        enabled: true,
        priority: 100,
        type: 'element',
        selector: 'footer, [role="contentinfo"]',
        action: 'remove',
    },
    {
        name: 'Remove Sidebar',
        description: 'Remove sidebar elements from output',
        enabled: true,
        priority: 100,
        type: 'element',
        selector: 'aside, [role="complementary"]',
        action: 'remove',
    },
    {
        name: 'Remove Ads',
        description: 'Remove common advertisement containers',
        enabled: true,
        priority: 100,
        type: 'class',
        className: 'ad,ads,advertisement,sponsored',
        action: 'remove',
    },
    {
        name: 'Highlight Important',
        description: 'Convert highlighted text to bold',
        enabled: false,
        priority: 50,
        type: 'element',
        selector: 'mark, .highlight',
        action: 'wrap',
        wrapBefore: '**',
        wrapAfter: '**',
    },
    {
        name: 'Keep Figure Captions',
        description: 'Format figure captions as italic',
        enabled: true,
        priority: 50,
        type: 'element',
        selector: 'figcaption',
        action: 'wrap',
        wrapBefore: '_',
        wrapAfter: '_',
    },
];

const STORAGE_KEY = 'mdflow_custom_rules';

class RuleManager {
    private rules: CustomRule[] = [];
    private initialized: boolean = false;

    /**
     * Initialize the rule manager
     */
    async init(): Promise<void> {
        if (this.initialized) return;

        await this.loadRules();
        this.initialized = true;
    }

    /**
     * Load rules from storage
     */
    async loadRules(): Promise<CustomRule[]> {
        try {
            const stored = await chromeStorage.get<CustomRule[]>(STORAGE_KEY);
            this.rules = stored || [];

            // Ensure built-in rules are included
            await this.ensureBuiltInRules();

            return this.rules;
        } catch (error) {
            console.error('Failed to load rules:', error);
            this.rules = [];
            return [];
        }
    }

    /**
     * Ensure built-in rules exist
     */
    private async ensureBuiltInRules(): Promise<void> {
        const existingNames = new Set(this.rules.map(r => r.name));
        const now = Date.now();

        for (const builtIn of BUILT_IN_RULES) {
            if (!existingNames.has(builtIn.name)) {
                this.rules.push({
                    ...builtIn,
                    id: this.generateId(),
                    createdAt: now,
                    updatedAt: now,
                });
            }
        }

        await this.saveRules();
    }

    /**
     * Save rules to storage
     */
    private async saveRules(): Promise<void> {
        try {
            await chromeStorage.set(STORAGE_KEY, this.rules);
        } catch (error) {
            console.error('Failed to save rules:', error);
        }
    }

    /**
     * Get all rules
     */
    getRules(): CustomRule[] {
        return [...this.rules].sort((a, b) => b.priority - a.priority);
    }

    /**
     * Get enabled rules only
     */
    getEnabledRules(): CustomRule[] {
        return this.getRules().filter(r => r.enabled);
    }

    /**
     * Get a rule by ID
     */
    getRule(id: string): CustomRule | undefined {
        return this.rules.find(r => r.id === id);
    }

    /**
     * Add a new rule
     */
    async addRule(rule: Omit<CustomRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomRule> {
        const now = Date.now();
        const newRule: CustomRule = {
            ...rule,
            id: this.generateId(),
            createdAt: now,
            updatedAt: now,
        };

        this.rules.push(newRule);
        await this.saveRules();

        return newRule;
    }

    /**
     * Update an existing rule
     */
    async updateRule(id: string, updates: Partial<Omit<CustomRule, 'id' | 'createdAt'>>): Promise<CustomRule | null> {
        const index = this.rules.findIndex(r => r.id === id);
        if (index === -1) return null;

        this.rules[index] = {
            ...this.rules[index],
            ...updates,
            updatedAt: Date.now(),
        };

        await this.saveRules();
        return this.rules[index];
    }

    /**
     * Delete a rule
     */
    async deleteRule(id: string): Promise<boolean> {
        const index = this.rules.findIndex(r => r.id === id);
        if (index === -1) return false;

        this.rules.splice(index, 1);
        await this.saveRules();

        return true;
    }

    /**
     * Toggle rule enabled state
     */
    async toggleRule(id: string): Promise<boolean> {
        const rule = this.getRule(id);
        if (!rule) return false;

        await this.updateRule(id, { enabled: !rule.enabled });
        return true;
    }

    /**
     * Apply rules to HTML content (pre-conversion)
     */
    applyRulesToHtml(html: string, doc: Document): string {
        const enabledRules = this.getEnabledRules();
        let modifiedHtml = html;

        for (const rule of enabledRules) {
            try {
                modifiedHtml = this.applyRule(modifiedHtml, rule, doc);
            } catch (error) {
                console.warn(`Failed to apply rule "${rule.name}":`, error);
            }
        }

        return modifiedHtml;
    }

    /**
     * Apply a single rule
     */
    private applyRule(html: string, rule: CustomRule, doc: Document): string {
        switch (rule.type) {
            case 'element':
                return this.applyElementRule(html, rule, doc);
            case 'class':
                return this.applyClassRule(html, rule, doc);
            case 'regex':
                return this.applyRegexRule(html, rule);
            default:
                return html;
        }
    }

    /**
     * Apply element-based rule using CSS selector
     */
    private applyElementRule(html: string, rule: CustomRule, doc: Document): string {
        if (!rule.selector) return html;

        const parser = new DOMParser();
        const tempDoc = parser.parseFromString(html, 'text/html');
        const elements = tempDoc.querySelectorAll(rule.selector);

        elements.forEach(el => {
            this.applyActionToElement(el, rule);
        });

        return tempDoc.body.innerHTML;
    }

    /**
     * Apply class-based rule
     */
    private applyClassRule(html: string, rule: CustomRule, doc: Document): string {
        if (!rule.className) return html;

        const parser = new DOMParser();
        const tempDoc = parser.parseFromString(html, 'text/html');
        const classNames = rule.className.split(',').map(c => c.trim());

        for (const className of classNames) {
            const elements = tempDoc.getElementsByClassName(className);
            Array.from(elements).forEach(el => {
                this.applyActionToElement(el, rule);
            });
        }

        return tempDoc.body.innerHTML;
    }

    /**
     * Apply regex-based rule
     */
    private applyRegexRule(html: string, rule: CustomRule): string {
        if (!rule.pattern) return html;

        try {
            const regex = new RegExp(rule.pattern, 'g');

            switch (rule.action) {
                case 'remove':
                    return html.replace(regex, '');
                case 'replace':
                    return html.replace(regex, rule.replacement || '');
                default:
                    return html;
            }
        } catch (error) {
            console.warn(`Invalid regex pattern: ${rule.pattern}`);
            return html;
        }
    }

    /**
     * Apply action to a DOM element
     */
    private applyActionToElement(el: Element, rule: CustomRule): void {
        switch (rule.action) {
            case 'remove':
                el.remove();
                break;
            case 'replace':
                el.outerHTML = rule.replacement || '';
                break;
            case 'wrap':
                el.innerHTML = `${rule.wrapBefore || ''}${el.innerHTML}${rule.wrapAfter || ''}`;
                break;
        }
    }

    /**
     * Generate a unique ID
     */
    private generateId(): string {
        return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Export rules as JSON
     */
    exportRules(): string {
        return JSON.stringify(this.rules, null, 2);
    }

    /**
     * Import rules from JSON
     */
    async importRules(json: string, merge: boolean = true): Promise<number> {
        try {
            const imported = JSON.parse(json) as CustomRule[];

            if (!Array.isArray(imported)) {
                throw new Error('Invalid rules format');
            }

            if (merge) {
                // Merge with existing rules, overwriting duplicates by name
                const existingNames = new Map(this.rules.map(r => [r.name, r]));

                for (const rule of imported) {
                    if (existingNames.has(rule.name)) {
                        // Update existing rule
                        const existing = existingNames.get(rule.name)!;
                        Object.assign(existing, rule, { id: existing.id, updatedAt: Date.now() });
                    } else {
                        // Add new rule
                        this.rules.push({
                            ...rule,
                            id: this.generateId(),
                            updatedAt: Date.now(),
                        });
                    }
                }
            } else {
                // Replace all rules
                this.rules = imported.map(r => ({
                    ...r,
                    id: this.generateId(),
                    updatedAt: Date.now(),
                }));
            }

            await this.saveRules();
            return imported.length;
        } catch (error) {
            console.error('Failed to import rules:', error);
            throw error;
        }
    }

    /**
     * Reset to built-in rules only
     */
    async resetToDefaults(): Promise<void> {
        this.rules = [];
        await this.ensureBuiltInRules();
    }
}

// Singleton instance
export const ruleManager = new RuleManager();
export { RuleManager };
