import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorksTemplate, isValidWorks, worksCount, cascadeTargets } from '../src/tacit-comment.js';
import { decideIncoming, announcementFor } from '../src/tacit-sync.js';
import { filterFeed } from '../src/tacit-feed.js';
import { buildDrafts, existingRecords } from '../src/tacit-import.js';
import { recordKey, buildDeletionTemplate } from '../src/tacit-events.js';
import { buildBackup, parseBackup, restoreBackup } from '../src/tacit-backup.js';
import { createLocalSigner, generateSecretKeyHex } from '../src/tacit-identity.js';

const A = 'a'.repeat(64), B = 'b'.repeat(64);
const U1 = '3f9a1c2e-1111-4111-8111-111111111111', U2 = '7b20aa91-2222-4222-8222-222222222222';
const rec = (pubkey, uuid, extra = {}) => ({ key: `${pubkey}:tacit-entry-${uuid}`, subjectSlug: 'pest', visibility: 'shared', event: { pubkey, created_at: 100 }, content: { subject: 'Pest', information_chunks: `chunk ${uuid.slice(0, 4)}` }, ...extra });

test('Works template: d is tacit-works- plus the record uuid, content names the record key', () => {
    const target = rec(B, U1).key;
    const template = buildWorksTemplate({ target, subject: 'Pest' }, 500, 'Ann');
    assert.equal(template.kind, 30078);
    assert.equal(template.created_at, 500);
    assert.deepEqual(template.tags, [['d', `tacit-works-${U1}`], ['subject', 'Pest'], ['author_name', 'Ann']]);
    assert.deepEqual(JSON.parse(template.content), { schemaVersion: 1, type: 'works', target });
    assert.deepEqual(buildWorksTemplate({ target, subject: 'Pest' }, 900).tags, [['d', `tacit-works-${U1}`], ['subject', 'Pest']]);
});

test('marking again is signed after the tombstone of the last un-mark', () => {
    const target = rec(B, U1).key;
    assert.equal(buildWorksTemplate({ target, subject: 'Pest', after: 700 }, 700).created_at, 701);
    assert.equal(buildWorksTemplate({ target, subject: 'Pest', after: 600 }, 700).created_at, 700);
});

test('a Works mark is valid only when the uuid in its target matches the uuid in its d', () => {
    const target = rec(B, U1).key, key = `${A}:tacit-works-${U1}`;
    const good = { schemaVersion: 1, type: 'works', target };
    assert.equal(isValidWorks(good, key), true);
    assert.equal(isValidWorks({ ...good, target: rec(B, U2).key }, key), false);
    assert.equal(isValidWorks(good, `${A}:tacit-works-${U2}`), false);
    assert.equal(isValidWorks({ ...good, type: 'insight' }, key), false);
    assert.equal(isValidWorks({ ...good, target: 7 }, key), false);
    assert.equal(isValidWorks({ ...good, target: undefined }, key), false);
    assert.equal(isValidWorks({ ...good, target: `${B}:tacit-link-${U1}` }, key), false);
    assert.equal(isValidWorks({ ...good, target: `tacit-entry-${U1}` }, key), false);
    assert.equal(isValidWorks(null, key), false);
});

const C = 'c'.repeat(64), D = 'd'.repeat(64), E = 'e'.repeat(64);
const mark = (pubkey, target, extra = {}) => ({ key: `${pubkey}:tacit-works-${target.slice(target.indexOf(':') + 13)}`, subjectSlug: 'pest', visibility: 'shared', event: { pubkey, created_at: 200 }, content: { schemaVersion: 1, type: 'works', target }, ...extra });

test('worksCount counts distinct authors with a valid mark and splits out the trusted and self ones', () => {
    const record = rec(D, U1), other = rec(D, U2);
    const library = [record, other, mark(A, record.key), mark(B, record.key), mark(C, record.key), mark(E, other.key)];
    assert.deepEqual(worksCount(record.key, library, { selfKeys: new Set([A]), trustedKeys: new Set([B]) }), { n: 3, t: 2, mine: true });
    assert.deepEqual(worksCount(record.key, library, { selfKeys: new Set([E]), trustedKeys: new Set() }), { n: 3, t: 0, mine: false });
    assert.deepEqual(worksCount(other.key, library, { selfKeys: new Set([A]), trustedKeys: new Set() }), { n: 1, t: 0, mine: false });
    assert.deepEqual(worksCount(rec(D, '9c9c9c9c-4444-4444-8444-444444444444').key, library, { selfKeys: new Set([A]), trustedKeys: new Set() }), { n: 0, t: 0, mine: false });
});

test('worksCount leaves out the record author\'s own mark, which still shows as theirs', () => {
    const record = rec(A, U1);
    const library = [record, mark(A, record.key), mark(B, record.key)];
    assert.deepEqual(worksCount(record.key, library, { selfKeys: new Set([A]), trustedKeys: new Set([B]) }), { n: 1, t: 1, mine: true });
    assert.deepEqual(worksCount(record.key, [record, mark(A, record.key)], { selfKeys: new Set([A]), trustedKeys: new Set() }), { n: 0, t: 0, mine: true });
});

test('worksCount ignores invalid marks', () => {
    const record = rec(D, U1);
    const forged = { ...mark(B, record.key), key: `${B}:tacit-works-${U2}` };
    const wrongType = mark(C, record.key, { content: { type: 'insight', target: record.key } });
    assert.deepEqual(worksCount(record.key, [record, forged, wrongType], { selfKeys: new Set([B]), trustedKeys: new Set([C]) }), { n: 0, t: 0, mine: false });
});

const signer = createLocalSigner(generateSecretKeyHex());
const signMark = (target, now, content) => signer.signEvent({ ...buildWorksTemplate({ target, subject: 'Pest' }, now), ...(content && { content: JSON.stringify(content) }) });

test('decideIncoming accepts an unknown author\'s valid Works mark straight into the library, even with a full review queue', async () => {
    const event = await signMark(rec(B, U1).key, 100);
    const base = { held: {}, trustedPubkeys: new Set() };
    assert.deepEqual(decideIncoming(event, base), { action: 'accept' });
    assert.deepEqual(decideIncoming(event, { ...base, pendingCount: 50 }), { action: 'accept' });
    assert.equal(decideIncoming(event, { ...base, trustedPubkeys: new Set([event.pubkey]) }).action, 'accept');
});

test('decideIncoming drops an unknown author\'s invalid Works mark, but not a trusted author\'s', async () => {
    const mismatched = await signMark(rec(B, U1).key, 100, { schemaVersion: 1, type: 'works', target: rec(B, U2).key });
    const noTarget = await signMark(rec(B, U1).key, 100, { schemaVersion: 1, type: 'works' });
    const base = { held: {}, trustedPubkeys: new Set() };
    assert.deepEqual(decideIncoming(mismatched, base), { action: 'drop', reason: 'bad-works' });
    assert.deepEqual(decideIncoming(noTarget, base), { action: 'drop', reason: 'bad-works' });
    assert.equal(decideIncoming(mismatched, { ...base, trustedPubkeys: new Set([mismatched.pubkey]) }).action, 'accept');
});

test('Works marks still drop when blocked, hidden, tombstoned or older, and a newer mark passes an older tombstone', async () => {
    const event = await signMark(rec(B, U1).key, 100);
    const key = recordKey(event);
    const base = { held: {}, trustedPubkeys: new Set() };
    assert.equal(decideIncoming(event, { ...base, blockedPubkeys: new Set([event.pubkey]) }).reason, 'blocked');
    assert.equal(decideIncoming(event, { ...base, hiddenKeys: new Set([key]) }).reason, 'hidden');
    assert.equal(decideIncoming(event, { ...base, tombstones: { [key]: 100 } }).reason, 'tombstoned');
    assert.equal(decideIncoming(event, { ...base, held: { [key]: event } }).reason, 'duplicate-or-older');
    const again = await signMark(rec(B, U1).key, 101);
    assert.equal(recordKey(again), key);
    assert.equal(decideIncoming(again, { ...base, tombstones: { [key]: 100 } }).action, 'accept');
});

test('cascade targets are only the current key\'s mark on the deleted record', () => {
    const record = rec(A, U1), other = rec(A, U2);
    const mine = mark(A, record.key), theirs = mark(B, record.key), previousKey = mark(C, record.key), elsewhere = mark(A, other.key);
    const library = [record, other, mine, theirs, previousKey, elsewhere];
    assert.deepEqual(cascadeTargets(record.key, library, A).map(item => item.key), [mine.key]);
    assert.deepEqual(cascadeTargets(record.key, [record, theirs], A), []);
});

test('Feed, sharedCount and the record import duplicate check leave Works marks out', () => {
    const one = rec(A, U1), two = rec(A, U2);
    const works = mark(B, one.key);
    const ctx = { selfKeys: new Set([A]), trustedKeys: new Set() };
    assert.deepEqual(filterFeed([one, works, two], {}, ctx).map(item => item.key), [one.key, two.key]);
    assert.deepEqual(filterFeed([one, works, two], { author: 'others' }, ctx), []);
    const subjects = [{ label: 'Pest', slug: 'pest', subscribed: true }];
    assert.equal(announcementFor(subjects, [one, works, two])[0].sharedCount, 2);
    const existing = existingRecords([one.content, { ...works.content, subject: 'Pest', information_chunks: 'undefined' }]);
    assert.deepEqual(existing, [{ slug: 'pest', chunk: 'chunk 3f9a' }]);
    assert.equal(buildDrafts([{ information_chunks: 'undefined' }], { label: 'Pest', slug: 'pest' }, existing).drafts.length, 1);
});

test('Works marks and un-mark tombstones round-trip through backup', async () => {
    const marked = await signMark(rec(B, U1).key, 100), unmarked = await signMark(rec(B, U2).key, 100);
    const deletion = await signer.signEvent(buildDeletionTemplate(unmarked, 200));
    const item = event => ({ key: recordKey(event), event, visibility: 'shared', subjectSlug: 'pest', content: JSON.parse(event.content) });
    const backup = parseBackup(JSON.stringify(buildBackup({ library: [item(marked)], tombstones: [{ key: recordKey(unmarked), created_at: 200, event: deletion }], trust: [], subjects: [] })));
    const plan = restoreBackup(backup, { library: [], tombstones: [], trust: [], hiddenKeys: [], subjects: [] }, 5000);
    assert.deepEqual(plan.puts.library.map(r => [r.key, r.event.id, r.visibility, r.subjectSlug]), [[recordKey(marked), marked.id, 'shared', 'pest']]);
    assert.deepEqual(plan.puts.tombstones.map(entry => entry.key), [recordKey(unmarked)]);
});
