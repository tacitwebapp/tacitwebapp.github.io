import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortIdOf, resolveShortId, buildInsightTemplate, buildInsightEdit, insightD, shareBlocker, visibleInsights, relationsOf, findOwnInsight, groupInsights } from '../tacit-insight.js';
import { filterFeed } from '../tacit-feed.js';
import { announcementFor, decideIncoming } from '../tacit-sync.js';
import { buildDrafts, existingRecords } from '../tacit-import.js';
import { recordKey } from '../tacit-events.js';
import { createLocalSigner, generateSecretKeyHex } from '../tacit-identity.js';

const A ='a'.repeat(64), B = 'b'.repeat(64);
const U1 = '3f9a1c2e-1111-4111-8111-111111111111', U2 = '7b20aa91-2222-4222-8222-222222222222', U3 = '3f9a1c2e-3333-4333-8333-333333333333';
const rec = (pubkey, uuid, extra = {}) => ({ key: `${pubkey}:tacit-entry-${uuid}`, subjectSlug: 'pest', visibility: 'shared', event: { pubkey, created_at: 100 }, content: { subject: 'Pest', information_chunks: `chunk ${uuid.slice(0, 4)}` }, ...extra });

test('short ID is t: plus the first 8 hex characters of the record uuid', () => {
    assert.equal(shortIdOf(rec(A, U1).key), 't:3f9a1c2e');
});

test('resolveShortId finds one record, none, or an ambiguous match', () => {
    const library = [rec(A, U1), rec(B, U2)];
    assert.deepEqual(resolveShortId(library, 't:7b20aa91'), { key: rec(B, U2).key });
    assert.deepEqual(resolveShortId(library, 't:00000000'), { error: 'unknown' });
    assert.deepEqual(resolveShortId([...library, rec(B, U3)], 't:3f9a1c2e'), { error: 'ambiguous' });
});

test('insight template: deterministic d from sorted uuids, full record keys in content', () => {
    const a = rec(A, U1).key, b = rec(B, U2).key;
    const forward = buildInsightTemplate({ relation: 'supersedes', from: a, to: b, rationale: 'newer', subject: 'Pest' }, 500, 'Ann');
    const backward = buildInsightTemplate({ relation: 'supersedes', from: b, to: a, rationale: 'newer', subject: 'Pest' }, 500);
    assert.equal(forward.kind, 30078);
    assert.equal(forward.created_at, 500);
    assert.deepEqual(forward.tags, [['d', `tacit-link-${U1}-${U2}`], ['subject', 'Pest'], ['author_name', 'Ann']]);
    assert.deepEqual(backward.tags.slice(0, 2), forward.tags.slice(0, 2));
    assert.deepEqual(JSON.parse(forward.content), { schemaVersion: 1, type: 'insight', relation: 'supersedes', from: a, to: b, rationale: 'newer', source: 'manual' });
    assert.equal(JSON.parse(backward.content).from, b);
});

test('symmetric relations store from and to in sorted order', () => {
    const a = rec(A, U1).key, b = rec(B, U2).key;
    for (const [from, to] of [[a, b], [b, a]]) {
        const content = JSON.parse(buildInsightTemplate({ relation: 'conflicts', from, to, subject: 'Pest' }, 1).content);
        assert.deepEqual([content.from, content.to], [a, b]);
        assert.equal(content.rationale, '');
    }
});

const insightItem = (author, from, to, extra = {}) => {
    const event = { pubkey: author, created_at: 200, tags: [['d', insightD(from, to)], ['subject', 'Pest']], content: '' };
    const content = { schemaVersion: 1, type: 'insight', relation: 'conflicts', from, to, rationale: 'r', source: 'manual', ...extra };
    return { key: `${author}:${insightD(from, to)}`, subjectSlug: 'pest', visibility: 'shared', event: { ...event, content: JSON.stringify(content) }, content };
};

test('shareBlocker refuses sharing while either record is local, naming the record', () => {
    const shared = rec(A, U1), local = rec(A, U2, { visibility: 'local' });
    const insight = insightItem(A, shared.key, local.key).content;
    assert.equal(shareBlocker(insight, [shared, local]), 'Share record t:7b20aa91 first');
    assert.equal(shareBlocker(insight, [shared, { ...local, visibility: 'shared' }]), '');
    assert.equal(shareBlocker(insight, [shared]), 'Share record t:7b20aa91 first');
});

test('visible insights need both records in the library', () => {
    const one = rec(A, U1), two = rec(B, U2), three = rec(B, U3);
    const link = insightItem(A, one.key, two.key);
    const other = insightItem(A, one.key, three.key);
    assert.deepEqual(visibleInsights([one, two, link, other]).map(item => item.key), [link.key]);
    assert.deepEqual(visibleInsights([one, link]), []);
    assert.deepEqual(visibleInsights([two, link]), []);
    assert.deepEqual(visibleInsights([one, two, three, link, other]).length, 2);
});

test('insights with invalid content are never visible', () => {
    const one = rec(A, U1), two = rec(B, U2);
    const bad = [insightItem(A, one.key, two.key, { relation: 'loves' }), insightItem(A, one.key, one.key), insightItem(A, one.key, two.key, { type: 'other' })];
    assert.deepEqual(visibleInsights([one, two, ...bad.slice(0, 2)]), []);
});

test('relationsOf groups a record\'s visible insights by relation type with the other record', () => {
    const one = rec(A, U1), two = rec(B, U2), three = rec(B, U3);
    const conflict = insightItem(A, one.key, two.key);
    const supersede = insightItem(B, three.key, one.key, { relation: 'supersedes' });
    const unrelated = insightItem(A, two.key, three.key);
    const groups = relationsOf([one, two, three, conflict, supersede, unrelated], one.key);
    assert.deepEqual(groups.map(group => group.relation), ['conflicts', 'supersedes']);
    assert.deepEqual(groups[0].items.map(entry => [entry.insight.key, entry.other.key]), [[conflict.key, two.key]]);
    assert.deepEqual(groups[1].items.map(entry => [entry.insight.key, entry.other.key]), [[supersede.key, three.key]]);
});

test('findOwnInsight finds the current key\'s insight on a pair in either order', () => {
    const one = rec(A, U1), two = rec(B, U2);
    const mine = insightItem(A, one.key, two.key), theirs = insightItem(B, one.key, two.key);
    assert.equal(findOwnInsight([one, two, theirs], A, two.key, one.key), undefined);
    assert.equal(findOwnInsight([one, two, theirs, mine], A, two.key, one.key), mine);
});

test('Feed, sharedCount and the record import duplicate check leave insights out', () => {
    const one = rec(A, U1), two = rec(A, U2);
    const link = insightItem(A, one.key, two.key);
    const ctx = { selfKeys: new Set([A]), trustedKeys: new Set() };
    assert.deepEqual(filterFeed([one, link, two], {}, ctx).map(item => item.key), [one.key, two.key]);
    assert.deepEqual(filterFeed([link], { search: 'r' }, ctx), []);
    const subjects = [{ label: 'Pest', slug: 'pest', subscribed: true }];
    assert.equal(announcementFor(subjects, [one, link, two])[0].sharedCount, 2);
    const subject = { label: 'Pest', slug: 'pest' };
    const existing = existingRecords([one.content, link.content, { ...link.content, subject: 'Pest', information_chunks: 'undefined' }]);
    assert.deepEqual(existing, [{ slug: 'pest', chunk: 'chunk 3f9a' }]);
    assert.equal(buildDrafts([{ information_chunks: 'undefined' }], subject, existing).drafts.length, 1);
});

test('decideIncoming treats insight events like records', async () => {
    const signer = createLocalSigner(generateSecretKeyHex());
    const a = rec(A, U1).key, b = rec(B, U2).key;
    const event = await signer.signEvent(buildInsightTemplate({ relation: 'supersedes', from: a, to: b, rationale: 'x', subject: 'Pest' }, 100));
    const key = recordKey(event);
    const base = { held: {}, trustedPubkeys: new Set() };
    assert.equal(decideIncoming(event, { ...base, trustedPubkeys: new Set([event.pubkey]) }).action, 'accept');
    assert.equal(decideIncoming(event, base).action, 'review');
    assert.equal(decideIncoming(event, { ...base, hiddenKeys: new Set([key]) }).reason, 'hidden');
    assert.equal(decideIncoming(event, { ...base, tombstones: { [key]: 100 } }).reason, 'tombstoned');
    assert.equal(decideIncoming(event, { ...base, blockedPubkeys: new Set([event.pubkey]) }).reason, 'blocked');
});

test('editing an insight keeps d and subject, re-sorts symmetric pairs and moves time forward', () => {
    const a = rec(A, U1).key, b = rec(B, U2).key;
    const original = { ...buildInsightTemplate({ relation: 'supersedes', from: a, to: b, rationale: 'x', subject: 'Pest' }, 500), pubkey: A };
    const edited = buildInsightEdit(original, { relation: 'conflicts', from: b, to: a, rationale: 'y' }, 100);
    assert.deepEqual(edited.tags, original.tags);
    assert.equal(edited.created_at, 501);
    assert.deepEqual(JSON.parse(edited.content), { schemaVersion: 1, type: 'insight', relation: 'conflicts', from: a, to: b, rationale: 'y', source: 'manual' });
});

const link = (pubkey, relation, from, to, extra = {}) => ({ key: `${pubkey}:${insightD(from.key, to.key)}`, subjectSlug: 'pest', visibility: 'shared', event: { pubkey, created_at: 200 }, content: { type: 'insight', relation, from: from.key, to: to.key, rationale: '' }, ...extra });
const ctx = { selfKeys: new Set([A]), trustedKeys: new Set() };

test('groupInsights groups by unordered pair and relation with a count', () => {
    const r1 = rec(A, U1), r2 = rec(B, U2), r3 = rec(A, U3);
    const library = [r1, r2, r3, link(A, 'conflicts', r1, r2), link(B, 'conflicts', r2, r1), link(A, 'duplicates', r1, r2), link(A, 'conflicts', r1, r3)];
    const groups = groupInsights(library, {}, ctx);
    assert.deepEqual(groups.map(group => [group.relation, group.count]).sort(), [['conflicts', 1], ['conflicts', 2], ['duplicates', 1]]);
    const pair = groups.find(group => group.count === 2);
    assert.deepEqual(pair.records.map(record => record.key).sort(), [r1.key, r2.key].sort());
    assert.deepEqual(pair.items.map(item => item.event.pubkey).sort(), [A, B]);
});

test('groupInsights leaves out invisible insights', () => {
    const r1 = rec(A, U1), r2 = rec(B, U2);
    assert.deepEqual(groupInsights([r1, link(A, 'conflicts', r1, r2)], {}, ctx), []);
});

test('groupInsights filters by subject, relation and author group, dropping emptied groups', () => {
    const r1 = rec(A, U1), r2 = rec(B, U2), r3 = rec(A, U3, { subjectSlug: 'other' }), r4 = rec(A, '9c9c9c9c-4444-4444-8444-444444444444', { subjectSlug: 'other' });
    const mine = link(A, 'conflicts', r1, r2), theirs = link(B, 'conflicts', r2, r1), refine = link(A, 'refines', r1, r2), elsewhere = link(A, 'duplicates', r3, r4, { subjectSlug: 'other' });
    const library = [r1, r2, r3, r4, mine, theirs, refine, elsewhere];
    assert.deepEqual(groupInsights(library, { subject: 'other' }, ctx).map(group => group.relation), ['duplicates']);
    assert.deepEqual(groupInsights(library, { relation: 'refines' }, ctx).map(group => group.relation), ['refines']);
    const others = groupInsights(library, { author: 'others' }, ctx);
    assert.deepEqual(others.map(group => [group.relation, group.count]), [['conflicts', 1]]);
    assert.deepEqual(others[0].items, [theirs]);
    const trusted = { selfKeys: ctx.selfKeys, trustedKeys: new Set([B]) };
    assert.deepEqual(groupInsights(library, { author: 'trusted' }, trusted)[0].items, [theirs]);
    assert.equal(groupInsights(library, { author: 'mine' }, ctx).length, 3);
});
