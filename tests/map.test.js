import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMap, buildStyle, linkedOnlyByDefault, RELATION_STYLE } from '../src/tacit-map.js';
import { groupInsights, insightD, RELATIONS } from '../src/tacit-insight.js';

const A = 'a'.repeat(64), B = 'b'.repeat(64);
const uuid = n => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
const rec = (n, specialty, extra = {}) => ({ key: `${A}:tacit-entry-${uuid(n)}`, subjectSlug: 'pest', visibility: 'shared', event: { pubkey: A, created_at: 100 + n }, content: { subject: 'Pest', specialty, information_chunks: `chunk ${n}` }, ...extra });
const link = (pubkey, relation, from, to) => ({ key: `${pubkey}:${insightD(from.key, to.key)}`, subjectSlug: 'pest', visibility: 'shared', event: { pubkey, created_at: 300 }, content: { type: 'insight', relation, from: from.key, to: to.key, rationale: '' } });
const mapOf = (records, insights = [], options = {}) => buildMap(records, groupInsights([...records, ...insights], { subject: 'pest' }), { subjectLabel: 'Pest', ...options });
const nodes = (map, cls) => map.elements.filter(el => el.group === 'nodes' && el.classes.split(' ').includes(cls));
const edges = map => map.elements.filter(el => el.group === 'edges');
const radius = ({ position: { x, y } }) => Math.hypot(x, y);
const turn = node => (Math.atan2(node.position.y, node.position.x) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);

test('subject sits in the centre, specialties on an inner ring, records on a larger outer ring', () => {
    const records = [rec(1, 'Kitchen Garden'), rec(2, 'Kitchen Garden'), rec(3, 'Orchard'), rec(4, 'Orchard')];
    const map = mapOf(records);
    const [subject] = nodes(map, 'subject');
    assert.deepEqual(subject.position, { x: 0, y: 0 });
    assert.equal(subject.data.label, 'Pest');
    const specialties = nodes(map, 'specialty');
    assert.deepEqual(specialties.map(node => node.data.label), ['Kitchen Garden', 'Orchard']);
    const inner = new Set(specialties.map(node => Math.round(radius(node))));
    const outer = new Set(nodes(map, 'record').map(node => Math.round(radius(node))));
    assert.equal(inner.size, 1);
    assert.equal(outer.size, 1);
    assert.ok([...outer][0] > [...inner][0] && [...inner][0] > 0);
});

test('the same library gives the same picture regardless of input order', () => {
    const records = [rec(1, 'Kitchen Garden'), rec(2, ''), rec(3, 'Orchard'), rec(4, 'Kitchen Garden')];
    const insights = [link(A, 'conflicts', records[0], records[3]), link(B, 'supersedes', records[2], records[1])];
    const first = mapOf(records, insights);
    const second = mapOf([...records].reverse(), [...insights].reverse());
    assert.deepEqual(first, second);
    assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
});

test('records without a specialty go under General, listed after the named specialties', () => {
    const records = [rec(1, undefined), rec(2, 'Zinnias'), rec(3, '  '), rec(4, 'Apples')];
    const map = mapOf(records);
    assert.deepEqual(nodes(map, 'specialty').map(node => node.data.label), ['Apples', 'Zinnias', 'General']);
});

test('records of one specialty sit in a contiguous run around the ring', () => {
    const records = [rec(1, 'B'), rec(2, 'A'), rec(3, 'B'), rec(4, 'A'), rec(5, 'B')];
    const map = mapOf(records);
    const specialtyOf = Object.fromEntries(records.map(record => [record.key, record.content.specialty]));
    const runs = nodes(map, 'record').sort((x, y) => turn(x) - turn(y)).map(node => specialtyOf[node.data.id]);
    assert.equal(runs.join(''), 'AABBB');
});

test('linked records within a specialty sit next to each other', () => {
    const records = [1, 2, 3, 4, 5, 6].map(n => rec(n, 'Garden'));
    const insights = [link(A, 'conflicts', records[0], records[3]), link(A, 'reinforces', records[3], records[5]), link(A, 'refines', records[1], records[4])];
    const order = nodes(mapOf(records, insights), 'record').sort((x, y) => turn(x) - turn(y)).map(node => records.findIndex(record => record.key === node.data.id));
    assert.deepEqual(order, [0, 3, 5, 1, 4, 2]);
});

test('a record node is labelled with its short ID and the first 40 characters of its chunk', () => {
    const long = rec(7, 'Garden', { content: { subject: 'Pest', specialty: 'Garden', information_chunks: 'Aphids   gather\non new growth in spring and need a weekly soapy rinse' } });
    const [node] = nodes(mapOf([long]), 'record');
    assert.equal(node.data.label, 't:00000007 Aphids gather on new growth in spring an…');
    assert.equal(node.data.id, long.key);
});

test('two authors stating one relation on a pair give one edge labelled with the count', () => {
    const [one, two, three] = [1, 2, 3].map(n => rec(n, 'Garden'));
    const map = mapOf([one, two, three], [link(A, 'conflicts', one, two), link(B, 'conflicts', two, one), link(A, 'duplicates', one, two), link(A, 'conflicts', one, three)]);
    const pair = edges(map).filter(edge => [edge.data.source, edge.data.target].sort().join() === [one.key, two.key].sort().join());
    assert.deepEqual(pair.map(edge => [edge.data.relation, edge.data.count, edge.data.label]).sort(), [['conflicts', 2, '×2'], ['duplicates', 1, '']]);
    assert.equal(edges(map).length, 3);
    assert.equal(pair.find(edge => edge.data.count === 2).data.keys.length, 2);
});

test('edges carry relation, direction and the stated source and target', () => {
    const [one, two, three] = [1, 2, 3].map(n => rec(n, 'Garden'));
    const map = mapOf([one, two, three], [link(A, 'supersedes', two, one), link(A, 'conflicts', one, three)]);
    const supersedes = edges(map).find(edge => edge.data.relation === 'supersedes');
    assert.equal(supersedes.classes, 'rel-supersedes directed');
    assert.deepEqual([supersedes.data.source, supersedes.data.target], [two.key, one.key]);
    assert.equal(edges(map).find(edge => edge.data.relation === 'conflicts').classes, 'rel-conflicts symmetric');
});

test('opposite directions of a directed relation stay separate edges', () => {
    const [one, two] = [1, 2].map(n => rec(n, 'Garden'));
    const map = mapOf([one, two], [link(A, 'supersedes', one, two), link(B, 'supersedes', two, one)]);
    assert.deepEqual(edges(map).map(edge => [edge.data.source, edge.data.target, edge.data.count]).sort(), [[one.key, two.key, 1], [two.key, one.key, 1]].sort());
});

test('a record that a visible insight says is superseded is marked superseded', () => {
    const [one, two, three] = [1, 2, 3].map(n => rec(n, 'Garden'));
    const map = mapOf([one, two, three], [link(A, 'supersedes', two, one), link(A, 'conflicts', two, three)]);
    assert.deepEqual(nodes(map, 'superseded').map(node => node.data.id), [one.key]);
});

test('the legend filter keeps only the chosen relation types and leaves positions alone', () => {
    const [one, two, three] = [1, 2, 3].map(n => rec(n, 'Garden'));
    const insights = [link(A, 'conflicts', one, two), link(A, 'reinforces', two, three)];
    const all = mapOf([one, two, three], insights), only = mapOf([one, two, three], insights, { relations: ['conflicts'] });
    assert.deepEqual(edges(only).map(edge => edge.data.relation), ['conflicts']);
    assert.deepEqual(nodes(only, 'record'), nodes(all, 'record'));
    assert.deepEqual(edges(mapOf([one, two, three], insights, { relations: [] })), []);
});

test('Linked only drops records without a drawn insight and respaces the rest', () => {
    const records = [1, 2, 3, 4].map(n => rec(n, n < 4 ? 'Garden' : ''));
    const insights = [link(A, 'conflicts', records[0], records[1]), link(A, 'reinforces', records[1], records[2])];
    const linkedOnly = mapOf(records, insights, { linkedOnly: true });
    assert.deepEqual(nodes(linkedOnly, 'record').map(node => node.data.id).sort(), records.slice(0, 3).map(record => record.key).sort());
    assert.deepEqual(nodes(linkedOnly, 'specialty').map(node => node.data.label), ['Garden']);
    assert.equal(nodes(mapOf(records, insights), 'record').length, 4);
    const filtered = mapOf(records, insights, { linkedOnly: true, relations: ['conflicts'] });
    assert.deepEqual(nodes(filtered, 'record').map(node => node.data.id).sort(), records.slice(0, 2).map(record => record.key).sort());
});

test('Linked only is on by default above 40 records', () => {
    assert.equal(linkedOnlyByDefault(40), false);
    assert.equal(linkedOnlyByDefault(41), true);
});

test('an empty subject gives only the subject node', () => {
    assert.deepEqual(mapOf([]).elements.map(el => el.data.id), ['subject']);
});

test('every relation type has its own colour and line pattern, and directed types have arrowheads', () => {
    assert.deepEqual(Object.keys(RELATION_STYLE), Object.keys(RELATIONS));
    const looks = Object.values(RELATION_STYLE).map(({ color, pattern }) => `${color}/${pattern}`);
    assert.equal(new Set(looks).size, looks.length);
    const colors = Object.fromEntries(['ink', 'muted', 'surface', 'line', 'accent', 'accentInk', 'accentSoft', 'danger', 'success', 'warn'].map(name => [name, `c-${name}`]));
    const style = buildStyle(colors);
    for (const [relation, { color, pattern }] of Object.entries(RELATION_STYLE)) {
        const rule = style.find(entry => entry.selector === `edge.rel-${relation}`).style;
        assert.equal(rule['line-color'], colors[color]);
        assert.equal(rule['line-style'], pattern);
        assert.equal(rule['target-arrow-shape'], RELATIONS[relation].directed ? 'triangle' : 'none');
    }
    assert.ok(style.find(entry => entry.selector === 'node.superseded').style.opacity < 1);
});
