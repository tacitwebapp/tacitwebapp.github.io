import { verifyEvent } from './vendor/nostr-tools.js';

export const RECORD_KIND = 30078;

export const buildRecordTemplate = (content, now = Math.floor(Date.now() / 1000), uuid = crypto.randomUUID()) => ({
    kind: RECORD_KIND,
    created_at: now,
    tags: [['d', `tacit-entry-${uuid}`], ['subject', content.subject]],
    content: JSON.stringify(content),
});

export const recordKey = event => `${event.pubkey}:${event.tags.find(tag => tag[0] === 'd')?.[1]}`;

export const isValidRecord = event => event?.kind === RECORD_KIND && verifyEvent(JSON.parse(JSON.stringify(event)));
