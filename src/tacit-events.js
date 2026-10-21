import { verifyEvent } from '../vendor/nostr-tools.js';

export const RECORD_KIND = 30078;
export const DELETION_KIND = 5;

export const AUTHOR_NAME_MAX = 40;
export const cleanAuthorName = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, AUTHOR_NAME_MAX).trim() : '';
export const authorNameOf = event => cleanAuthorName(event.tags.find(tag => tag[0] === 'author_name')?.[1]);
const nameTags = authorName => cleanAuthorName(authorName) ? [['author_name', cleanAuthorName(authorName)]] : [];

export const latestAuthorNames = events => {
    const latest = {};
    for (const event of events) if (!(latest[event.pubkey]?.created_at >= event.created_at)) latest[event.pubkey] = event;
    return Object.fromEntries(Object.entries(latest).map(([pubkey, event]) => [pubkey, authorNameOf(event)]).filter(([, name]) => name));
};

export const buildRecordTemplate = (content, now = Math.floor(Date.now() / 1000), uuid = crypto.randomUUID(), authorName = '') => ({
    kind: RECORD_KIND,
    created_at: now,
    tags: [['d', `tacit-entry-${uuid}`], ['subject', content.subject], ...nameTags(authorName)],
    content: JSON.stringify(content),
});

export const buildEditTemplate = (event, content, now = Math.floor(Date.now() / 1000), authorName = '') => ({
    kind: RECORD_KIND,
    created_at: Math.max(now, event.created_at + 1),
    tags: [...event.tags.filter(tag => tag[0] !== 'author_name'), ...nameTags(authorName)],
    content: JSON.stringify(content),
});

export const buildDeletionTemplate = (event, now = Math.floor(Date.now() / 1000)) => ({
    kind: DELETION_KIND,
    created_at: Math.max(now, event.created_at + 1),
    tags: [['a', `${RECORD_KIND}:${recordKey(event)}`], ['subject', event.tags.find(tag => tag[0] === 'subject')?.[1]]],
    content: '',
});

export const recordKey = event => `${event.pubkey}:${event.tags.find(tag => tag[0] === 'd')?.[1]}`;

export const deletionKey = event => {
    const match = /^30078:([0-9a-f]{64}):(.+)$/.exec(event.tags.find(tag => tag[0] === 'a')?.[1] ?? '');
    return match && { pubkey: match[1], key: `${match[1]}:${match[2]}` };
};

export const isValidSignature = event => verifyEvent(JSON.parse(JSON.stringify(event)));
export const isValidRecord = event => event?.kind === RECORD_KIND && verifyEvent(JSON.parse(JSON.stringify(event)));
