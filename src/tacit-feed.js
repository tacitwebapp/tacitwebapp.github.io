import { isRecord } from './tacit-comment.js';

export function highlightParts(text, search = '') {
    const value = String(text ?? '');
    const needle = search.trim();
    if (!needle) return [{ text: value, hit: false }];
    const pattern = new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return value.split(pattern).map((part, index) => ({ text: part, hit: index % 2 === 1 })).filter(part => part.text !== '');
}

export function filterFeed(library, { subject = '', author = '', visibility = '', search = '' }, { selfKeys, trustedKeys }) {
    const needle = search.trim().toLowerCase();
    const authorGroup = pubkey => selfKeys.has(pubkey) ? 'mine' : trustedKeys.has(pubkey) ? 'trusted' : 'others';
    return library.filter(item =>
        isRecord(item.content)
        && (!subject || item.subjectSlug === subject)
        && (!author || authorGroup(item.event.pubkey) === author)
        && (!visibility || item.visibility === visibility)
        && (!needle || [item.content.information_chunks, item.content.actionable_workflows].some(text => String(text ?? '').toLowerCase().includes(needle))));
}
