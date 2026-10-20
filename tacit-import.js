import { TacitJsonParser } from './tacit-json-parser.js';
import { TacitCsvParser } from './tacit-csv-parser.js';
import { slugify } from './tacit-subject.js';

export const detectFormat = (text, fileName) => {
    if (fileName) return fileName.toLowerCase().endsWith('.json') ? 'json' : 'csv';
    return /^\s*[[{]/.test(text) ? 'json' : 'csv';
};

export const parseText = (text, fileName) => (detectFormat(text, fileName) === 'json' ? TacitJsonParser : TacitCsvParser).parse(text);

const chunkOf = value => (typeof value === 'string' ? value.trim() : '');

export function buildDrafts(rawObjects, subject, existing = []) {
    const seen = new Set(existing.map(item => `${item.slug}\n${item.chunk}`));
    const drafts = [], rejected = [], skipped = [];
    rawObjects.forEach((raw, index) => {
        const chunk = chunkOf(raw.information_chunks);
        if (!chunk) return rejected.push({ row: index + 1, reason: 'missing information_chunks' });
        const signature = `${subject.slug}\n${chunk}`;
        if (seen.has(signature)) return skipped.push({ row: index + 1, reason: 'duplicate' });
        seen.add(signature);
        const warnings = [];
        if (raw.subject && slugify(String(raw.subject)) !== subject.slug) warnings.push(`subject overwritten (was "${raw.subject}")`);
        if (!chunkOf(raw.actionable_workflows)) warnings.push('no actionable workflow');
        drafts.push({ content: { ...raw, schemaVersion: 1, subject: subject.label }, warnings });
    });
    return { drafts, rejected, skipped };
}
