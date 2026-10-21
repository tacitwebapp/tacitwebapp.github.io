import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortIdOf, resolveShortId, buildInsightTemplate, buildInsightEdit, insightD, shareBlocker, visibleInsights, relationsOf, findOwnInsight, groupInsights, cascadeTargets, incomingInsightCard, feedBadges, isWellFormedInsight, RELATIONS, validPromptLimit, recordBlock, ownLinkedPairs, buildInsightPrompt, planInsightPrompts, insightPromptCards, importInsightRows, applyToDraft, updateInsightDraft } from '../src/tacit-insight.js';
import { filterFeed } from '../src/tacit-feed.js';
import { announcementFor, decideIncoming } from '../src/tacit-sync.js';
import { buildDrafts, existingRecords } from '../src/tacit-import.js';
import { recordKey } from '../src/tacit-events.js';
import { createLocalSigner, generateSecretKeyHex } from '../src/tacit-identity.js';

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

test('an insight whose d is not the deterministic link id for its records is never visible', () => {
    const one = rec(A, U1), two = rec(B, U2), three = rec(B, U3);
    const forged = { ...insightItem(A, one.key, two.key), key: `${A}:tacit-link-${U1}-${U3}` };
    assert.deepEqual(visibleInsights([one, two, three, forged]), []);
});

test('an insight is not visible unless both records are in the insight subject', () => {
    const one = rec(A, U1), two = rec(B, U2, { subjectSlug: 'other' });
    const cross = insightItem(A, one.key, two.key);
    assert.deepEqual(visibleInsights([one, two, cross]), []);
    assert.deepEqual(visibleInsights([one, { ...two, subjectSlug: 'pest' }, cross]).length, 1);
});

test('well-formed insight check rejects missing endpoints and a mismatched d', () => {
    const a = rec(A, U1).key, b = rec(B, U2).key, d = insightD(a, b);
    const good = { schemaVersion: 1, type: 'insight', relation: 'conflicts', from: a, to: b };
    assert.equal(isWellFormedInsight(good, `${A}:${d}`), true);
    assert.equal(isWellFormedInsight({ ...good, from: undefined }, `${A}:${d}`), false);
    assert.equal(isWellFormedInsight({ ...good, to: 7 }, `${A}:${d}`), false);
    assert.equal(isWellFormedInsight(good, `${A}:tacit-link-${U1}-${U3}`), false);
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

test('cascade targets are only the current key\'s insights and insight drafts on the deleted record', () => {
    const one = rec(A, U1), two = rec(B, U2), three = rec(B, U3);
    const mine = insightItem(A, one.key, two.key), mineOther = insightItem(A, two.key, three.key);
    const theirs = insightItem(B, one.key, three.key), previousKey = insightItem('c'.repeat(64), one.key, two.key);
    const onRecord = { id: 'd1', kind: 'insight-draft', content: { from: two.key, to: one.key } };
    const elsewhere = { id: 'd2', kind: 'insight-draft', content: { from: two.key, to: three.key } };
    const recordDraft = { id: 'd3', kind: 'draft', content: { subject: 'Pest' } };
    const targets = cascadeTargets([one, two, three, mine, mineOther, theirs, previousKey], [onRecord, elsewhere, recordDraft], A, one.key);
    assert.deepEqual(targets.insights.map(item => item.key), [mine.key]);
    assert.deepEqual(targets.drafts.map(draft => draft.id), ['d1']);
});

test('incoming insight card names the relation, direction, rationale and both records', () => {
    const held = rec(A, U1), queued = rec(B, U2);
    const link = insightItem(B, held.key, queued.key, { relation: 'supersedes', rationale: 'newer data' });
    const pending = [{ id: queued.key, content: queued.content }];
    assert.deepEqual(incomingInsightCard(link.content, [held], pending), {
        label: 'supersedes', directed: true, rationale: 'newer data',
        from: { shortId: 't:3f9a1c2e', preview: 'chunk 3f9a' },
        to: { shortId: 't:7b20aa91', preview: 'chunk 7b20' },
    });
});

test('incoming insight card shows a record held nowhere as not in your library', () => {
    const held = rec(A, U1), missing = rec(B, U2);
    const card = incomingInsightCard(insightItem(B, held.key, missing.key).content, [held], []);
    assert.equal(card.directed, false);
    assert.deepEqual(card.to, { shortId: 't:7b20aa91', preview: null });
});

test('incoming insights from one author count toward the 50 item queue cap', async () => {
    const signer = createLocalSigner(generateSecretKeyHex());
    const a = rec(A, U1).key, b = rec(B, U2).key;
    const event = await signer.signEvent(buildInsightTemplate({ relation: 'conflicts', from: a, to: b, subject: 'Pest' }, 100));
    const base = { held: {}, trustedPubkeys: new Set() };
    assert.equal(decideIncoming(event, { ...base, pendingCount: 49 }).action, 'review');
    assert.deepEqual(decideIncoming(event, { ...base, pendingCount: 50 }), { action: 'drop', reason: 'queue-full' });
});

test('a record that a visible insight says is superseded gets the Superseded badge', () => {
    const old = rec(A, U1), fresh = rec(B, U2);
    const link = insightItem(A, fresh.key, old.key, { relation: 'supersedes' });
    const badges = feedBadges([old, fresh, link]);
    assert.deepEqual(badges.get(old.key), { superseded: true, conflicts: 0 });
    assert.equal(badges.has(fresh.key), false);
});

test('the superseded badge goes when the superseding record is gone', () => {
    const old = rec(A, U1), fresh = rec(B, U2);
    const link = insightItem(A, fresh.key, old.key, { relation: 'supersedes' });
    assert.equal(feedBadges([old, link]).size, 0);
});

test('conflicts counts distinct records, so two authors flagging the same pair count once', () => {
    const one = rec(A, U1), two = rec(B, U2), three = rec(B, U3);
    const badges = feedBadges([one, two, three,
        insightItem(A, one.key, two.key), insightItem(B, one.key, two.key),
        insightItem(A, one.key, three.key)]);
    assert.deepEqual(badges.get(one.key), { superseded: false, conflicts: 2 });
    assert.deepEqual(badges.get(two.key), { superseded: false, conflicts: 1 });
});

test('badges ignore invisible insights and other relations', () => {
    const one = rec(A, U1), two = rec(B, U2), three = rec(B, U3);
    const badges = feedBadges([one, two,
        insightItem(A, one.key, three.key),
        insightItem(A, one.key, two.key, { relation: 'reinforces' })]);
    assert.equal(badges.size, 0);
});

const uuidN = n => `${n.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`;
const many = (n, extra = () => ({})) => Array.from({ length: n }, (_, i) => rec(i % 2 ? A : B, uuidN(i + 1), { event: { pubkey: i % 2 ? A : B, created_at: 1700000000 + i * 86400 }, ...extra(i) }));
const pairsOf = cards => new Set(cards.flatMap(card => { const ids = [...card.text.split('Records:')[1].matchAll(/^\[(t:[0-9a-f]{8})\]/gm)].map(m => m[1]); return ids.flatMap((a, i) => ids.slice(i + 1).map(b => [a, b].sort().join('|'))); }));
const pctx = (library = [], drafts = [], pubkey = A) => ({ library, drafts, pubkey });

test('prompt limit accepts only even integers from 4 to 200', () => {
    for (const ok of [4, 30, 200]) assert.equal(validPromptLimit(ok), true);
    for (const bad of [2, 3, 31, 202, 0, -4, 4.5, '30', NaN, undefined]) assert.equal(validPromptLimit(bad), false);
});

test('N at or under the limit gives one prompt; fewer than 2 records gives none', () => {
    assert.equal(planInsightPrompts(many(30), 30).length, 1);
    assert.equal(planInsightPrompts(many(2), 30).length, 1);
    assert.equal(planInsightPrompts(many(1), 30).length, 0);
    assert.equal(planInsightPrompts([], 30).length, 0);
});

test('batches: m(m-1)/2 prompts, none over k records, every pair of records covered', () => {
    for (const [n, k] of [[31, 30], [40, 30], [45, 10], [60, 30], [100, 8], [17, 4], [200, 200], [201, 200]]) {
        const records = many(n), plans = planInsightPrompts(records, k), m = n <= k ? 1 : Math.ceil(2 * n / k);
        assert.equal(plans.length, n <= k ? 1 : m * (m - 1) / 2, `count for ${n},${k}`);
        assert.ok(plans.every(plan => plan.records.length <= k), `size for ${n},${k}`);
        const cards = insightPromptCards(records, k, pctx());
        const covered = pairsOf(cards);
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) assert.ok(covered.has([shortIdOf(records[i].key), shortIdOf(records[j].key)].sort().join('|')), `pair ${i},${j} for ${n},${k}`);
    }
});

test('records are sorted by specialty then date and cards are labelled with their groups', () => {
    const records = many(40, i => ({ content: { subject: 'Pest', information_chunks: `c${i}`, specialty: i % 2 ? 'B' : 'A' } }));
    const plans = planInsightPrompts(records, 30);
    assert.equal(plans.length, 3);
    assert.deepEqual(plans.map(plan => plan.groups), [[1, 2], [1, 3], [2, 3]]);
    const specialties = plans[0].records.map(item => item.content.specialty);
    assert.deepEqual(specialties, [...specialties].sort());
    assert.equal(insightPromptCards(records, 30, pctx())[1].label, 'Prompt 2 of 3 · groups 1+3');
    assert.equal(insightPromptCards(many(5), 30, pctx())[0].label, 'Prompt 1 of 1');
});

test('record block has short ID, date, specialty, chunk and workflow but never the author', () => {
    const item = rec(A, U1, { event: { pubkey: A, created_at: Date.UTC(2026, 2, 14) / 1000 }, content: { subject: 'Pest', specialty: 'Kitchen Garden', information_chunks: 'chunk', actionable_workflows: 'steps', author_name: 'Ann' } });
    assert.equal(recordBlock(item), '[t:3f9a1c2e] 2026-03-14 · Specialty: Kitchen Garden\nInformation: chunk\nWorkflow: steps');
    const bare = recordBlock(rec(B, U2, { event: { pubkey: B, created_at: 0 } }));
    assert.equal(bare, '[t:7b20aa91] 1970-01-01\nInformation: chunk 7b20');
    const prompt = buildInsightPrompt([item]);
    assert.ok(!prompt.includes(A) && !prompt.includes('Ann'));
});

test('prompt defines all seven relations, asks for [] and the JSON format', () => {
    const prompt = buildInsightPrompt(many(2));
    for (const name of Object.keys(RELATIONS)) assert.ok(prompt.includes(name));
    assert.ok(prompt.includes('output []'));
    assert.ok(prompt.includes('"rationale"'));
    assert.ok(!prompt.includes('Already linked'));
});

const uuidLink = (pubkey, a, b, relation = 'conflicts') => {
    const from = rec(A, a).key, to = rec(A, b).key;
    return { key: `${pubkey}:${insightD(from, to)}`, subjectSlug: 'pest', visibility: 'local', event: { pubkey, created_at: 200 }, content: { schemaVersion: 1, type: 'insight', relation, from, to, rationale: 'r', source: 'manual' } };
};

test('skip list holds only own current-key pairs inside the prompt, as pairs without relation', () => {
    const records = [rec(A, U1), rec(A, U2), rec(A, U3)];
    const mine = uuidLink(A, U1, U2, 'supersedes'), theirs = uuidLink(B, U1, U3), outside = uuidLink(A, U1, uuidN(99));
    const draft = { kind: 'insight-draft', content: uuidLink(A, U2, U3).content };
    const prompt = buildInsightPrompt(records, ownLinkedPairs([...records, mine, theirs, outside], [draft], A));
    const line = prompt.split('\n').find(l => l.includes('Already linked'));
    assert.equal(line, '- Already linked, do not output: t:3f9a1c2e–t:7b20aa91, t:3f9a1c2e–t:3f9a1c2e'.replace('t:3f9a1c2e–t:3f9a1c2e', [shortIdOf(rec(A, U2).key), shortIdOf(rec(A, U3).key)].sort().join('–')));
    assert.ok(!line.includes('supersedes'));
    const without = ownLinkedPairs([...records, uuidLink(B, U1, U2)], [], A);
    assert.deepEqual(without, []);
});

test('skip list only appears in prompts that hold both records of a pair', () => {
    const records = many(40), link = insightItem(A, records[0].key, records[1].key);
    const cards = insightPromptCards(records, 30, pctx([...records, link]));
    const withSkip = cards.filter(card => card.text.includes('Already linked'));
    assert.ok(withSkip.length >= 1 && withSkip.length < cards.length || cards.length === 1);
    for (const card of withSkip) assert.ok(card.text.includes('t:00000001–t:00000002'));
});

const lib = () => [rec(A, U1, { event: { pubkey: A, created_at: 100 } }), rec(B, U2, { event: { pubkey: B, created_at: 200 } }), rec(A, uuidN(3), { event: { pubkey: A, created_at: 300 }, subjectSlug: 'other' })];
const run = (rows, library = lib(), drafts = [], pubkey = A) => importInsightRows(typeof rows === 'string' ? rows : JSON.stringify(rows), { library, drafts, pubkey });
const row = (extra = {}) => ({ from: 't:3f9a1c2e', to: 't:7b20aa91', relation: 'conflicts', rationale: 'because', ...extra });

test('import rejects non-JSON and non-arrays', () => {
    assert.throws(() => run('nope'), /not valid JSON/);
    assert.throws(() => run('{}'), /JSON array/);
    assert.deepEqual(run([]), { drafts: [], disagreements: [], rejected: [], duplicates: 0 });
});

test('import rejects each bad row with its reason', () => {
    const result = run([row({ to: 't:00000000' }), row({ to: 't:7b20aa91', from: 't:7b20aa91' }), 5, row({ relation: 'likes' }), row({ rationale: '  ' }), row({ rationale: undefined })]);
    assert.deepEqual(result.rejected.map(entry => entry.reason), ['unknown ID t:00000000', 'from and to are the same record', 'not an object', 'unknown relation likes', 'missing rationale', 'missing rationale']);
    assert.equal(result.drafts.length, 0);
    const clash = run([row({ to: 't:3f9a1c2e', from: 't:7b20aa91' })], [...lib(), rec(B, '3f9a1c2e-9999-4999-8999-999999999999')]);
    assert.deepEqual(clash.rejected, [{ row: 1, reason: 'ambiguous ID t:3f9a1c2e' }]);
});

test('import rejects a pair from different subjects', () => {
    const library = [...lib(), rec(A, '5c5c5c5c-5555-4555-8555-555555555555', { subjectSlug: 'other' })];
    const result = run([row({ to: 't:5c5c5c5c' })], library);
    assert.deepEqual(result.rejected, [{ row: 1, reason: 'records are in different subjects' }]);
});

test('import makes llm drafts with sorted symmetric pairs and trimmed rationale', () => {
    const result = run([row({ from: 't:7b20aa91', to: 't:3f9a1c2e', rationale: ' why ' })]);
    assert.equal(result.drafts.length, 1);
    const [draft] = result.drafts;
    assert.equal(draft.kind, 'insight-draft');
    assert.deepEqual(draft.content, { schemaVersion: 1, type: 'insight', relation: 'conflicts', from: rec(A, U1).key, to: rec(B, U2).key, rationale: 'why', source: 'llm' });
    assert.deepEqual(draft.warnings, []);
});

test('rationale over 500 characters is cut with a warning', () => {
    const [draft] = run([row({ rationale: 'x'.repeat(501) })]).drafts;
    assert.equal(draft.content.rationale.length, 500);
    assert.deepEqual(draft.warnings, ['rationale shortened']);
    assert.deepEqual(run([row({ rationale: 'x'.repeat(500) })]).drafts[0].warnings, []);
});

test('supersedes from an older record to a newer one is warned', () => {
    assert.deepEqual(run([row({ relation: 'supersedes' })]).drafts[0].warnings, ['supersedes a newer record']);
    assert.deepEqual(run([row({ relation: 'supersedes', from: 't:7b20aa91', to: 't:3f9a1c2e' })]).drafts[0].warnings, []);
});

test('importing the same rows twice makes no new drafts, only duplicates', () => {
    const rows = [row()], first = run(rows);
    const second = run(rows, lib(), first.drafts);
    assert.equal(second.drafts.length, 0);
    assert.equal(second.duplicates, 1);
    assert.equal(run(rows, [...lib(), insightItem(A, rec(A, U1).key, rec(B, U2).key)]).duplicates, 1);
});

test('a different relation or direction for a linked pair is a disagreement, not a draft', () => {
    const signed = insightItem(A, rec(A, U1).key, rec(B, U2).key, { relation: 'supersedes' });
    const library = [...lib(), signed];
    const different = run([row({ relation: 'duplicates' })], library);
    assert.equal(different.drafts.length, 0);
    assert.equal(different.disagreements.length, 1);
    assert.equal(different.disagreements[0].type, 'insight');
    assert.equal(different.disagreements[0].existing.relation, 'supersedes');
    assert.equal(different.disagreements[0].proposed.relation, 'duplicates');
});

test('reversed direction of a directed relation is a disagreement', () => {
    const first = run([row({ relation: 'supersedes', from: 't:7b20aa91', to: 't:3f9a1c2e' })]);
    const again = run([row({ relation: 'supersedes' })], lib(), first.drafts);
    assert.equal(again.disagreements.length, 1);
    assert.equal(again.disagreements[0].type, 'draft');
});

test('other authors\' insights and previous-key insights do not count as linked', () => {
    assert.equal(run([row()], [...lib(), insightItem(B, rec(A, U1).key, rec(B, U2).key)]).drafts.length, 1);
    assert.equal(run([row()], [...lib(), insightItem('c'.repeat(64), rec(A, U1).key, rec(B, U2).key)], [], A).drafts.length, 1);
});

test('within one import the first row for a pair wins', () => {
    const result = run([row({ relation: 'conflicts' }), row({ relation: 'conflicts', rationale: 'again' }), row({ relation: 'duplicates' })]);
    assert.equal(result.drafts.length, 1);
    assert.equal(result.duplicates, 1);
    assert.equal(result.disagreements.length, 1);
    assert.equal(result.disagreements[0].item.id, result.drafts[0].id);
    assert.equal(result.drafts[0].content.relation, 'conflicts');
});

test('Accept on a draft replaces relation, direction and rationale', () => {
    const [draft] = run([row({ relation: 'supersedes' })]).drafts;
    const [disagreement] = run([row({ relation: 'supersedes', from: 't:7b20aa91', to: 't:3f9a1c2e', rationale: 'flipped' })], lib(), [draft]).disagreements;
    const updated = applyToDraft(draft, disagreement.proposed);
    assert.equal(updated.id, draft.id);
    assert.deepEqual([updated.content.from, updated.content.to, updated.content.rationale], [rec(B, U2).key, rec(A, U1).key, 'flipped']);
});

test('Accept on a signed insight signs an edit with the same d and keeps its subject', () => {
    const from = rec(A, U1).key, to = rec(A, U2).key;
    const signed = { ...uuidLink(A, U1, U2, 'supersedes'), event: { pubkey: A, created_at: 200, kind: 30078, tags: [['d', insightD(from, to)], ['subject', 'Pest']], content: JSON.stringify({ ...uuidLink(A, U1, U2).content, relation: 'supersedes', from, to }) } };
    const library = [rec(A, U1), rec(A, U2), signed];
    const [disagreement] = importInsightRows(JSON.stringify([row({ relation: 'duplicates', rationale: 'same' })]), { library, drafts: [], pubkey: A }).disagreements;
    const edit = buildInsightEdit(disagreement.item.event, disagreement.proposed, 900);
    assert.deepEqual(edit.tags.slice(0, 2), signed.event.tags);
    const content = JSON.parse(edit.content);
    assert.deepEqual([content.relation, content.rationale, content.source], ['duplicates', 'same', 'llm']);
    assert.equal(edit.created_at, 900);
});

test('editing a draft normalizes symmetric order and keeps its id', () => {
    const [draft] = run([row({ relation: 'supersedes' })]).drafts;
    const edited = updateInsightDraft(draft, { relation: 'conflicts', from: rec(B, U2).key, to: rec(A, U1).key, rationale: 'new' });
    assert.equal(edited.id, draft.id);
    assert.deepEqual([edited.content.relation, edited.content.from, edited.content.rationale], ['conflicts', rec(A, U1).key, 'new']);
});
