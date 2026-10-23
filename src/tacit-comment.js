import { RECORD_KIND, buildEditTemplate, cleanAuthorName } from './tacit-events.js';
import { isInsight } from './tacit-insight.js';

const dOf = key => key.slice(key.indexOf(':') + 1);
const uuidOf = key => dOf(key).replace(/^tacit-entry-/, '');

export const worksD = target => `tacit-works-${uuidOf(target)}`;

export const isWorks = content => content?.type === 'works';

export const isComment = content => content?.type === 'comment';

export const isRecord = content => !isInsight(content) && !isWorks(content) && !isComment(content);

export const COMMENT_BODY_MAX = 2000;
const RECORD_KEY = /^[0-9a-f]{64}:tacit-entry-./;
const COMMENT_KEY = /^[0-9a-f]{64}:tacit-comment-./;

export const isValidComment = (content, key) => isComment(content) && dOf(key).startsWith('tacit-comment-')
    && typeof content.root === 'string' && RECORD_KEY.test(content.root)
    && typeof content.parent === 'string' && (content.parent === content.root || COMMENT_KEY.test(content.parent))
    && typeof content.body === 'string' && content.body.length >= 1 && content.body.length <= COMMENT_BODY_MAX
    && Number.isFinite(content.postedAt);

export const isValidWorks = (content, key) => isWorks(content) && typeof content.target === 'string'
    && /^[0-9a-f]{64}:tacit-entry-./.test(content.target) && dOf(key) === worksD(content.target);

export function worksCount(recordKey, library, { selfKeys = new Set(), trustedKeys = new Set() } = {}) {
    const authors = new Set(library.filter(item => item.content?.target === recordKey && isValidWorks(item.content, item.key)).map(item => item.event.pubkey));
    const counted = [...authors].filter(pubkey => pubkey !== recordKey.slice(0, recordKey.indexOf(':')));
    return { n: counted.length, t: counted.filter(pubkey => selfKeys.has(pubkey) || trustedKeys.has(pubkey)).length, mine: [...authors].some(pubkey => selfKeys.has(pubkey)) };
}

export const fullViewIdOf = key => uuidOf(key).slice(0, 8);

export function resolveFullView(library, id) {
    const matches = library.filter(item => isRecord(item.content) && fullViewIdOf(item.key) === id);
    if (matches.length === 1) return { status: 'found', item: matches[0], matches };
    return { status: matches.length ? 'ambiguous' : 'missing', matches };
}

export const cascadeTargets = (recordKey, library, currentKey) =>
    library.filter(item => item.key === `${currentKey}:${worksD(recordKey)}` && item.content?.target === recordKey
        || item.event.pubkey === currentKey && isComment(item.content) && item.content.root === recordKey);

export const buildWorksTemplate = ({ target, subject, after = 0 }, now = Math.floor(Date.now() / 1000), authorName = '') => ({
    kind: RECORD_KIND,
    created_at: Math.max(now, after + 1),
    tags: [['d', worksD(target)], ['subject', subject], ...(cleanAuthorName(authorName) ? [['author_name', cleanAuthorName(authorName)]] : [])],
    content: JSON.stringify({ schemaVersion: 1, type: 'works', target }),
});

export const buildCommentTemplate = ({ root, parent, body, subject }, now = Math.floor(Date.now() / 1000), authorName = '', uuid = crypto.randomUUID()) => ({
    kind: RECORD_KIND,
    created_at: now,
    tags: [['d', `tacit-comment-${uuid}`], ['subject', subject], ...(cleanAuthorName(authorName) ? [['author_name', cleanAuthorName(authorName)]] : [])],
    content: JSON.stringify({ schemaVersion: 1, type: 'comment', root, parent, body, postedAt: now }),
});

export const buildCommentEdit = (event, body, now = Math.floor(Date.now() / 1000), authorName = '') =>
    buildEditTemplate(event, { ...JSON.parse(event.content), body }, now, authorName);

const authorOf = key => key.slice(0, key.indexOf(':'));

export function buildThread(rootKey, { library, folded = [], tombstones = {}, hiddenKeys = new Set(), blockedKeys = new Set() }) {
    if (!library.some(item => item.key === rootKey && isRecord(item.content))) return [];
    const entries = [...library.map(item => ({ item, folded: false })), ...folded.map(item => ({ item, folded: true }))].filter(entry => isComment(entry.item.content));
    const byKey = new Map(entries.map(entry => [entry.item.key, entry]));
    const shown = new Map(entries.filter(({ item }) => item.content.root === rootKey && isValidComment(item.content, item.key)
        && !(tombstones[item.key] >= item.event.created_at) && !hiddenKeys.has(item.key) && !blockedKeys.has(item.event.pubkey)
        && (item.content.parent === rootKey || !byKey.has(item.content.parent) || byKey.get(item.content.parent).item.content.root === rootKey))
        .map(entry => [entry.item.key, entry]));
    const inCycle = key => {
        const seen = new Set();
        for (let current = key; shown.has(current); current = shown.get(current).item.content.parent) {
            if (seen.has(current)) return current === key;
            seen.add(current);
        }
        return false;
    };
    for (const key of [...shown.keys()].filter(inCycle)) shown.delete(key);

    const children = new Map();
    for (const entry of shown.values()) {
        const parent = entry.item.content.parent;
        children.set(parent, [...(children.get(parent) ?? []), entry]);
    }
    const stubReason = key => tombstones[key] !== undefined ? 'deleted' : hiddenKeys.has(key) || blockedKeys.has(authorOf(key)) ? 'hidden' : 'missing';
    const build = (entry, depth) => ({
        key: entry.item.key, item: entry.item, stub: null, folded: entry.folded, edited: entry.item.event.created_at > entry.item.content.postedAt,
        depth, postedAt: entry.item.content.postedAt, children: nodesUnder(entry.item.key, depth + 1),
    });
    const nodesUnder = (parentKey, depth) => (children.get(parentKey) ?? []).map(entry => build(entry, depth)).sort(byPosted);
    const roots = nodesUnder(rootKey, 0);
    const stubKeys = [...children.keys()].filter(key => key !== rootKey && !shown.has(key));
    const stubs = stubKeys.map(key => {
        const below = nodesUnder(key, 1);
        return { key, item: null, stub: stubReason(key), folded: false, edited: false, depth: 0, postedAt: below[0].postedAt, children: below };
    });
    return [...roots, ...stubs].sort(byPosted);
}

const byPosted = (a, b) => a.postedAt - b.postedAt || (a.key < b.key ? -1 : 1);

export const shownCount = nodes => nodes.reduce((total, node) => total + (node.stub || node.folded ? 0 : 1) + shownCount(node.children), 0);
