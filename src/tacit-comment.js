import { RECORD_KIND, cleanAuthorName } from './tacit-events.js';
import { isInsight } from './tacit-insight.js';

const dOf = key => key.slice(key.indexOf(':') + 1);
const uuidOf = key => dOf(key).replace(/^tacit-entry-/, '');

export const worksD = target => `tacit-works-${uuidOf(target)}`;

export const isWorks = content => content?.type === 'works';

export const isRecord = content => !isInsight(content) && !isWorks(content);

export const isValidWorks = (content, key) => isWorks(content) && typeof content.target === 'string'
    && /^[0-9a-f]{64}:tacit-entry-./.test(content.target) && dOf(key) === worksD(content.target);

export function worksCount(recordKey, library, { selfKeys = new Set(), trustedKeys = new Set() } = {}) {
    const authors = new Set(library.filter(item => item.content?.target === recordKey && isValidWorks(item.content, item.key)).map(item => item.event.pubkey));
    const counted = [...authors].filter(pubkey => pubkey !== recordKey.slice(0, recordKey.indexOf(':')));
    return { n: counted.length, t: counted.filter(pubkey => selfKeys.has(pubkey) || trustedKeys.has(pubkey)).length, mine: [...authors].some(pubkey => selfKeys.has(pubkey)) };
}

export const cascadeTargets = (recordKey, library, currentKey) =>
    library.filter(item => item.key === `${currentKey}:${worksD(recordKey)}` && item.content?.target === recordKey);

export const buildWorksTemplate = ({ target, subject, after = 0 }, now = Math.floor(Date.now() / 1000), authorName = '') => ({
    kind: RECORD_KIND,
    created_at: Math.max(now, after + 1),
    tags: [['d', worksD(target)], ['subject', subject], ...(cleanAuthorName(authorName) ? [['author_name', cleanAuthorName(authorName)]] : [])],
    content: JSON.stringify({ schemaVersion: 1, type: 'works', target }),
});
