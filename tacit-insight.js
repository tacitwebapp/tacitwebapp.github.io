import { RECORD_KIND, buildEditTemplate, cleanAuthorName } from './tacit-events.js';

export const RELATIONS = {
    conflicts: { label: 'conflicts with', directed: false },
    supersedes: { label: 'supersedes', directed: true },
    reinforces: { label: 'reinforces', directed: true },
    refines: { label: 'refines', directed: true },
    duplicates: { label: 'duplicates', directed: false },
    alternative_to: { label: 'is an alternative to', directed: false },
    prerequisite_of: { label: 'is a prerequisite of', directed: true },
};

const dOf = key => key.slice(key.indexOf(':') + 1);
const uuidOf = key => dOf(key).replace(/^tacit-entry-/, '');

export const shortIdOf = key => `t:${uuidOf(key).slice(0, 8)}`;

export function resolveShortId(library, shortId) {
    const matches = library.filter(item => !isInsight(item.content) && shortIdOf(item.key) === shortId);
    return matches.length === 1 ? { key: matches[0].key } : { error: matches.length ? 'ambiguous' : 'unknown' };
}

export const isInsight = content => content?.type === 'insight';

const sortedUuids = (a, b) => [uuidOf(a), uuidOf(b)].sort();
export const insightD = (a, b) => `tacit-link-${sortedUuids(a, b).join('-')}`;

const insightContent = ({ relation, from, to, rationale = '', source = 'manual' }) => {
    const [first, second] = RELATIONS[relation].directed || uuidOf(from) <= uuidOf(to) ? [from, to] : [to, from];
    return { schemaVersion: 1, type: 'insight', relation, from: first, to: second, rationale, source };
};

export const buildInsightTemplate = ({ subject, ...fields }, now = Math.floor(Date.now() / 1000), authorName = '') => ({
    kind: RECORD_KIND,
    created_at: now,
    tags: [['d', insightD(fields.from, fields.to)], ['subject', subject], ...(cleanAuthorName(authorName) ? [['author_name', cleanAuthorName(authorName)]] : [])],
    content: JSON.stringify(insightContent(fields)),
});

export const buildInsightEdit = (event, changes, now = Math.floor(Date.now() / 1000), authorName = '') =>
    buildEditTemplate(event, insightContent({ source: 'manual', ...JSON.parse(event.content), ...changes }), now, authorName);

const isValidInsight = content => isInsight(content) && Object.hasOwn(RELATIONS, content.relation)
    && typeof content.from === 'string' && typeof content.to === 'string' && content.from !== content.to;

export function shareBlocker(content, library) {
    const unshared = [content.from, content.to].find(key => library.find(item => item.key === key)?.visibility !== 'shared');
    return unshared ? `Share record ${shortIdOf(unshared)} first` : '';
}

export function visibleInsights(library) {
    const records = new Set(library.filter(item => !isInsight(item.content)).map(item => item.key));
    return library.filter(item => isValidInsight(item.content) && records.has(item.content.from) && records.has(item.content.to));
}

export function relationsOf(library, key) {
    const byKey = new Map(library.map(item => [item.key, item]));
    const mine = visibleInsights(library).filter(item => item.content.from === key || item.content.to === key);
    return Object.keys(RELATIONS)
        .map(relation => ({ relation, items: mine.filter(item => item.content.relation === relation).map(insight => ({ insight, other: byKey.get(insight.content.from === key ? insight.content.to : insight.content.from) })) }))
        .filter(group => group.items.length);
}

export const findOwnInsight = (library, pubkey, keyA, keyB) => library.find(item => item.key === `${pubkey}:${insightD(keyA, keyB)}`);

export const cascadeTargets = (library, drafts, pubkey, recordKey) => {
    const onRecord = content => content?.from === recordKey || content?.to === recordKey;
    return {
        insights: library.filter(item => isInsight(item.content) && item.event.pubkey === pubkey && onRecord(item.content)),
        drafts: drafts.filter(draft => draft.kind === 'insight-draft' && onRecord(draft.content)),
    };
};
