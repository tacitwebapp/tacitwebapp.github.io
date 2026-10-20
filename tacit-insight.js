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

export const isWellFormedInsight = (content, key) => isInsight(content) && Object.hasOwn(RELATIONS, content.relation)
    && typeof content.from === 'string' && typeof content.to === 'string' && content.from !== content.to
    && dOf(key) === insightD(content.from, content.to);

export function shareBlocker(content, library) {
    const unshared = [content.from, content.to].find(key => library.find(item => item.key === key)?.visibility !== 'shared');
    return unshared ? `Share record ${shortIdOf(unshared)} first` : '';
}

export function visibleInsights(library) {
    const records = new Map(library.filter(item => !isInsight(item.content)).map(item => [item.key, item]));
    const inSubject = (key, item) => records.get(key)?.subjectSlug === item.subjectSlug;
    return library.filter(item => isWellFormedInsight(item.content, item.key) && inSubject(item.content.from, item) && inSubject(item.content.to, item));
}

export function relationsOf(library, key) {
    const byKey = new Map(library.map(item => [item.key, item]));
    const mine = visibleInsights(library).filter(item => item.content.from === key || item.content.to === key);
    return Object.keys(RELATIONS)
        .map(relation => ({ relation, items: mine.filter(item => item.content.relation === relation).map(insight => ({ insight, other: byKey.get(insight.content.from === key ? insight.content.to : insight.content.from) })) }))
        .filter(group => group.items.length);
}

export function feedBadges(library) {
    const superseded = new Set(), conflicts = new Map();
    const link = (key, other) => conflicts.set(key, (conflicts.get(key) ?? new Set()).add(other));
    for (const { content } of visibleInsights(library)) {
        if (content.relation === 'supersedes') superseded.add(content.to);
        if (content.relation === 'conflicts') { link(content.from, content.to); link(content.to, content.from); }
    }
    return new Map([...new Set([...superseded, ...conflicts.keys()])].map(key => [key, { superseded: superseded.has(key), conflicts: conflicts.get(key)?.size ?? 0 }]));
}

export const findOwnInsight = (library, pubkey, keyA, keyB) => library.find(item => item.key === `${pubkey}:${insightD(keyA, keyB)}`);

export function groupInsights(library, { subject = '', relation = '', author = '' } = {}, { selfKeys = new Set(), trustedKeys = new Set() } = {}) {
    const byKey = new Map(library.map(item => [item.key, item]));
    const authorGroup = pubkey => selfKeys.has(pubkey) ? 'mine' : trustedKeys.has(pubkey) ? 'trusted' : 'others';
    const groups = new Map();
    for (const insight of visibleInsights(library)) {
        if ((subject && insight.subjectSlug !== subject) || (relation && insight.content.relation !== relation) || (author && authorGroup(insight.event.pubkey) !== author)) continue;
        const pair = [insight.content.from, insight.content.to].sort();
        const id = `${pair.join('|')}|${insight.content.relation}`;
        if (!groups.has(id)) groups.set(id, { id, pair: pair.join('|'), relation: insight.content.relation, records: pair.map(key => byKey.get(key)), items: [] });
        groups.get(id).items.push(insight);
    }
    const order = Object.keys(RELATIONS);
    return [...groups.values()].map(group => ({ ...group, count: group.items.length }))
        .sort((x, y) => x.pair.localeCompare(y.pair) || order.indexOf(x.relation) - order.indexOf(y.relation));
}

export const cascadeTargets = (library, drafts, pubkey, recordKey) => {
    const onRecord = content => content?.from === recordKey || content?.to === recordKey;
    return {
        insights: library.filter(item => isInsight(item.content) && item.event.pubkey === pubkey && onRecord(item.content)),
        drafts: drafts.filter(draft => draft.kind === 'insight-draft' && onRecord(draft.content)),
    };
};

export function incomingInsightCard(content, library, pending) {
    const previewOf = key => (library.find(item => item.key === key) ?? pending.find(item => item.id === key))?.content.information_chunks ?? null;
    const end = key => ({ shortId: shortIdOf(key), preview: previewOf(key) });
    return { label: RELATIONS[content.relation]?.label ?? content.relation, directed: !!RELATIONS[content.relation]?.directed, rationale: content.rationale ?? '', from: end(content.from), to: end(content.to) };
}
