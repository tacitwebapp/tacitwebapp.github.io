import { verifyEvent } from './vendor/nostr-tools.js';

export const RECORD_KIND = 30078;
export const DELETION_KIND = 5;

export const buildRecordTemplate = (content, now = Math.floor(Date.now() / 1000), uuid = crypto.randomUUID()) => ({
    kind: RECORD_KIND,
    created_at: now,
    tags: [['d', `tacit-entry-${uuid}`], ['subject', content.subject]],
    content: JSON.stringify(content),
});

export const buildEditTemplate = (event, content, now = Math.floor(Date.now() / 1000)) => ({
    kind: RECORD_KIND,
    created_at: Math.max(now, event.created_at + 1),
    tags: event.tags,
    content: JSON.stringify(content),
});

export const buildDeletionTemplate = (event, now = Math.floor(Date.now() / 1000)) => ({
    kind: DELETION_KIND,
    created_at: now,
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
