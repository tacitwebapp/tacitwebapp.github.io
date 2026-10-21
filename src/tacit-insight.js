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

export const DEFAULT_PROMPT_LIMIT = 30;
export const validPromptLimit = value => Number.isInteger(value) && value >= 4 && value <= 200 && value % 2 === 0;

const RELATION_MEANING = {
    conflicts: 'same situation, incompatible advice or outcome',
    supersedes: 'from replaces to\'s way of doing it; to is outdated',
    reinforces: 'from adds evidence or experience backing to',
    refines: 'from is a narrower or more precise version of to; both still hold',
    duplicates: 'same knowledge, said differently',
    alternative_to: 'different approach to the same goal; both hold',
    prerequisite_of: 'do from before to',
};

const isoDate = seconds => new Date(seconds * 1000).toISOString().slice(0, 10);

export const recordBlock = item => [
    `[${shortIdOf(item.key)}] ${isoDate(item.event.created_at)}${item.content.specialty ? ` · Specialty: ${item.content.specialty}` : ''}`,
    `Information: ${item.content.information_chunks ?? ''}`,
    ...(item.content.actionable_workflows ? [`Workflow: ${item.content.actionable_workflows}`] : []),
].join('\n');

const pairId = (a, b) => [a, b].sort().join('|');

export function ownLinkedPairs(library, drafts, pubkey) {
    const insights = library.filter(item => item.event.pubkey === pubkey && isWellFormedInsight(item.content, item.key)).map(item => item.content);
    const own = drafts.filter(draft => draft.kind === 'insight-draft').map(draft => draft.content);
    return [...new Set([...insights, ...own].map(content => pairId(content.from, content.to)))].map(id => id.split('|'));
}

export function buildInsightPrompt(records, linkedPairs = []) {
    const keys = new Set(records.map(item => item.key));
    const skip = linkedPairs.filter(([a, b]) => keys.has(a) && keys.has(b))
        .map(([a, b]) => [shortIdOf(a), shortIdOf(b)].sort().join('–')).sort();
    const relations = Object.entries(RELATIONS).map(([name, info]) => `- ${name} (${info.directed ? 'from → to' : 'symmetric, order does not matter'}): ${RELATION_MEANING[name]}`);
    return [
        'You relate pieces of knowledge. Below are records about one subject. Find pairs of records with a clear relation.',
        '',
        'Relation types:',
        ...relations,
        '',
        'Rules:',
        '- Output only pairs with a clear relation. Skip weak or speculative ones.',
        '- Use only the seven relation types above.',
        '- If there are no clear relations, output [].',
        '- Give a short rationale for every pair that names what differs or agrees.',
        ...(skip.length ? [`- Already linked, do not output: ${skip.join(', ')}`] : []),
        '',
        'Return only a JSON array, with no other text, in this format:',
        '[{"from": "t:3f9a1c2e", "to": "t:7b20aa91", "relation": "supersedes", "rationale": "Why they are related."}]',
        '',
        'Records:',
        '',
        records.map(recordBlock).join('\n\n'),
    ].join('\n');
}

export function planInsightPrompts(records, limit = DEFAULT_PROMPT_LIMIT) {
    const sorted = [...records].sort((a, b) => String(a.content.specialty ?? '').localeCompare(String(b.content.specialty ?? '')) || a.event.created_at - b.event.created_at || a.key.localeCompare(b.key));
    if (sorted.length <= limit) return sorted.length >= 2 ? [{ number: 1, total: 1, groups: null, records: sorted }] : [];
    const m = Math.ceil(2 * sorted.length / limit), base = Math.floor(sorted.length / m), extra = sorted.length % m;
    const groups = [];
    for (let i = 0, at = 0; i < m; i++) { const size = base + (i < extra ? 1 : 0); groups.push(sorted.slice(at, at + size)); at += size; }
    const pairs = [];
    for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) pairs.push([i, j]);
    return pairs.map(([i, j], index) => ({ number: index + 1, total: pairs.length, groups: [i + 1, j + 1], records: [...groups[i], ...groups[j]] }));
}

export function insightPromptCards(records, limit, { library, drafts, pubkey }) {
    const linked = ownLinkedPairs(library, drafts, pubkey);
    return planInsightPrompts(records, limit).map(plan => ({
        label: `Prompt ${plan.number} of ${plan.total}${plan.groups ? ` · groups ${plan.groups.join('+')}` : ''}`,
        count: plan.records.length,
        text: buildInsightPrompt(plan.records, linked),
    }));
}

const MAX_RATIONALE = 500;
const normalized = fields => insightContent({ source: 'llm', ...fields });
const sameInsight = (a, b) => a.relation === b.relation && a.from === b.from && a.to === b.to;

export function importInsightRows(text, { library, drafts, pubkey }) {
    let rows;
    try { rows = JSON.parse(text); } catch (error) { throw new Error(`not valid JSON (${error.message})`); }
    if (!Array.isArray(rows)) throw new Error('expected a JSON array of insight rows');
    const records = library.filter(item => !isInsight(item.content)), byKey = new Map(records.map(item => [item.key, item]));
    const existing = new Map();
    for (const item of library) if (item.event.pubkey === pubkey && isWellFormedInsight(item.content, item.key)) existing.set(dOf(item.key), { type: 'insight', item, content: item.content });
    for (const draft of drafts) if (draft.kind === 'insight-draft') existing.set(insightD(draft.content.from, draft.content.to), { type: 'draft', item: draft, content: draft.content });
    const result = { drafts: [], disagreements: [], rejected: [], duplicates: 0 };
    rows.forEach((row, index) => {
        const reject = reason => result.rejected.push({ row: index + 1, reason });
        if (!row || typeof row !== 'object' || Array.isArray(row)) return reject('not an object');
        const from = resolveShortId(records, row.from), to = resolveShortId(records, row.to);
        if (from.error) return reject(`${from.error === 'ambiguous' ? 'ambiguous' : 'unknown'} ID ${row.from}`);
        if (to.error) return reject(`${to.error === 'ambiguous' ? 'ambiguous' : 'unknown'} ID ${row.to}`);
        if (from.key === to.key) return reject('from and to are the same record');
        if (byKey.get(from.key).subjectSlug !== byKey.get(to.key).subjectSlug) return reject('records are in different subjects');
        if (!Object.hasOwn(RELATIONS, row.relation)) return reject(`unknown relation ${row.relation}`);
        const rationale = typeof row.rationale === 'string' ? row.rationale.trim() : '';
        if (!rationale) return reject('missing rationale');
        const warnings = [];
        const cut = rationale.length > MAX_RATIONALE;
        if (cut) warnings.push('rationale shortened');
        if (row.relation === 'supersedes' && byKey.get(from.key).event.created_at < byKey.get(to.key).event.created_at) warnings.push('supersedes a newer record');
        const content = normalized({ relation: row.relation, from: from.key, to: to.key, rationale: cut ? rationale.slice(0, MAX_RATIONALE) : rationale });
        const current = existing.get(insightD(content.from, content.to));
        if (!current) {
            const draft = { id: crypto.randomUUID(), kind: 'insight-draft', content, warnings, createdAt: Date.now() };
            result.drafts.push(draft); existing.set(insightD(content.from, content.to), { type: 'draft', item: draft, content });
        } else if (sameInsight(current.content, content)) result.duplicates++;
        else result.disagreements.push({ id: `${index}-${insightD(content.from, content.to)}`, type: current.type, item: current.item, existing: current.content, proposed: content });
    });
    return result;
}

export const applyToDraft = (draft, proposed) => ({ ...draft, content: normalized({ ...draft.content, relation: proposed.relation, from: proposed.from, to: proposed.to, rationale: proposed.rationale }) });

export const updateInsightDraft = (draft, changes) => ({ ...draft, content: normalized({ ...draft.content, ...changes }) });
