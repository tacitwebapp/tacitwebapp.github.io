import { RELATIONS, shortIdOf } from './tacit-insight.js';

const GENERAL = 'General';
const LABEL_CHARS = 40;
const SPECIALTY_RADIUS = 160;
const MIN_RECORD_RADIUS = 360;
const RECORD_SPACING = 150;
const NODE_WIDTH = 132;
const NODE_HEIGHT = 48;
export const LINKED_ONLY_THRESHOLD = 40;

export const linkedOnlyByDefault = recordCount => recordCount > LINKED_ONLY_THRESHOLD;

export const RELATION_STYLE = {
    conflicts: { color: 'danger', pattern: 'solid', swatch: 'border-danger border-solid' },
    supersedes: { color: 'warn', pattern: 'solid', swatch: 'border-warn border-solid' },
    reinforces: { color: 'success', pattern: 'solid', swatch: 'border-success border-solid' },
    refines: { color: 'accent', pattern: 'solid', swatch: 'border-accent border-solid' },
    duplicates: { color: 'muted', pattern: 'dotted', swatch: 'border-muted border-dotted' },
    alternative_to: { color: 'ink', pattern: 'dashed', swatch: 'border-ink border-dashed' },
    prerequisite_of: { color: 'warn', pattern: 'dashed', swatch: 'border-warn border-dashed' },
};

const round = n => Math.round(n * 100) / 100 || 0;
const polar = (radius, angle) => ({ x: round(radius * Math.cos(angle)), y: round(radius * Math.sin(angle)) });
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const recordLabel = record => {
    const text = String(record.content.information_chunks ?? '').replace(/\s+/g, ' ').trim();
    return `${shortIdOf(record.key)} ${text.length > LABEL_CHARS ? `${text.slice(0, LABEL_CHARS)}…` : text}`;
};

const specialtyOf = record => String(record.content.specialty ?? '').trim() || GENERAL;

function edgeBuckets(group) {
    if (!RELATIONS[group.relation].directed) {
        const [source, target] = group.records.map(record => record.key);
        return [{ id: group.id, relation: group.relation, source, target, items: group.items }];
    }
    const byDirection = new Map();
    for (const item of group.items) {
        const { from, to } = item.content;
        if (!byDirection.has(from)) byDirection.set(from, { id: `${group.id}>${from}`, relation: group.relation, source: from, target: to, items: [] });
        byDirection.get(from).items.push(item);
    }
    return [...byDirection.values()];
}

function linkedOrder(sorted, adjacency) {
    const index = new Map(sorted.map((record, position) => [record.key, position]));
    const seen = new Set(), order = [];
    for (const start of sorted) {
        const stack = [start.key];
        while (stack.length) {
            const key = stack.pop();
            if (seen.has(key)) continue;
            seen.add(key); order.push(key);
            stack.push(...[...(adjacency.get(key) ?? [])].filter(other => index.has(other) && !seen.has(other)).sort((a, b) => index.get(b) - index.get(a)));
        }
    }
    return order;
}

export function buildMap(records, groups, { subjectLabel = '', relations = Object.keys(RELATIONS), linkedOnly = false } = {}) {
    const shown = new Set(relations);
    const known = new Set(records.map(record => record.key));
    const usable = groups.filter(group => group.records.every(record => known.has(record.key)));
    const buckets = usable.flatMap(edgeBuckets).sort((a, b) => compare(a.id, b.id));
    const superseded = new Set(buckets.filter(bucket => bucket.relation === 'supersedes').map(bucket => bucket.target));

    const adjacency = new Map();
    const connect = (a, b) => adjacency.set(a, (adjacency.get(a) ?? new Set()).add(b));
    for (const { source, target } of buckets) { connect(source, target); connect(target, source); }
    const drawn = buckets.filter(bucket => shown.has(bucket.relation));
    const linked = new Set(drawn.flatMap(bucket => [bucket.source, bucket.target]));

    const included = records.filter(record => !linkedOnly || linked.has(record.key))
        .sort((a, b) => a.event.created_at - b.event.created_at || compare(a.key, b.key));
    const bySpecialty = new Map();
    for (const record of included) bySpecialty.set(specialtyOf(record), [...(bySpecialty.get(specialtyOf(record)) ?? []), record]);
    const names = [...bySpecialty.keys()].sort((a, b) => (a === GENERAL) - (b === GENERAL) || compare(a, b));

    const recordRadius = Math.max(MIN_RECORD_RADIUS, (included.length * RECORD_SPACING) / (2 * Math.PI));
    const elements = [{ group: 'nodes', data: { id: 'subject', label: subjectLabel }, position: { x: 0, y: 0 }, classes: 'subject' }];
    const recordNodes = [];
    let start = -Math.PI / 2;
    for (const name of names) {
        const members = bySpecialty.get(name);
        const width = (2 * Math.PI * members.length) / included.length;
        elements.push({ group: 'nodes', data: { id: `specialty:${name}`, label: name }, position: polar(SPECIALTY_RADIUS, start + width / 2), classes: 'specialty' });
        const byKey = new Map(members.map(record => [record.key, record]));
        linkedOrder(members, adjacency).forEach((key, i) => {
            const record = byKey.get(key);
            recordNodes.push({ group: 'nodes', data: { id: key, label: recordLabel(record) }, position: polar(recordRadius, start + ((i + 0.5) / members.length) * width), classes: superseded.has(key) ? 'record superseded' : 'record' });
        });
        start += width;
    }
    elements.push(...recordNodes);

    for (const { id, relation, source, target, items } of drawn) {
        const count = items.length;
        elements.push({
            group: 'edges',
            data: { id, source, target, relation, count, label: count > 1 ? `×${count}` : '', keys: items.map(item => item.key).sort() },
            classes: `rel-${relation} ${RELATIONS[relation].directed ? 'directed' : 'symmetric'}`,
        });
    }
    return { elements };
}

export function buildStyle(colors) {
    const relationRules = Object.entries(RELATION_STYLE).map(([relation, { color, pattern }]) => ({
        selector: `edge.rel-${relation}`,
        style: { 'line-color': colors[color], 'target-arrow-color': colors[color], 'line-style': pattern, 'target-arrow-shape': RELATIONS[relation].directed ? 'triangle' : 'none' },
    }));
    return [
        { selector: 'node', style: { label: 'data(label)', shape: 'round-rectangle', width: NODE_WIDTH, height: NODE_HEIGHT, 'background-color': colors.surface, 'border-width': 1, 'border-color': colors.line, color: colors.ink, 'font-size': 10, 'text-wrap': 'wrap', 'text-max-width': NODE_WIDTH - 12, 'text-valign': 'center', 'text-halign': 'center' } },
        { selector: 'node.subject', style: { shape: 'ellipse', width: 120, height: 120, 'font-size': 14, 'font-weight': 'bold', 'background-color': colors.accent, 'border-color': colors.accent, color: colors.accentInk } },
        { selector: 'node.specialty', style: { 'background-color': colors.accentSoft, 'border-color': colors.accent, color: colors.accent, 'font-size': 12, 'font-weight': 'bold' } },
        { selector: 'node.record:selected', style: { 'border-width': 3, 'border-color': colors.accent } },
        { selector: 'node.superseded', style: { opacity: 0.45 } },
        { selector: 'edge', style: { width: 2.5, 'curve-style': 'bezier', 'arrow-scale': 1.4, label: 'data(label)', color: colors.ink, 'font-size': 12, 'font-weight': 'bold', 'text-background-color': colors.surface, 'text-background-opacity': 1, 'text-background-padding': 2 } },
        ...relationRules,
        { selector: 'edge:selected', style: { width: 4 } },
    ];
}
