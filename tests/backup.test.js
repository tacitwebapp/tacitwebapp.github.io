import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalSigner, generateSecretKeyHex } from '../tacit-identity.js';
import { buildRecordTemplate, buildEditTemplate, buildDeletionTemplate, recordKey } from '../tacit-events.js';
import { buildBackup, parseBackup, restoreBackup } from '../tacit-backup.js';

const secret = generateSecretKeyHex();
const signer = createLocalSigner(secret);
const content = { schemaVersion: 1, subject: 'Pest Control', information_chunks: 'a' };
const sign = (text, now, uuid) => signer.signEvent(buildRecordTemplate({ ...content, information_chunks: text }, now, uuid));
const item = (event, visibility = 'shared') => ({ key: recordKey(event), event, visibility, subjectSlug: 'pest-control', receivedAt: 1, content: JSON.parse(event.content) });
const empty = { library: [], tombstones: [], trust: [], hiddenKeys: [], subjects: [] };
const other = 'b'.repeat(64);

test('buildBackup keeps events and visibility, never keys or passwords', async () => {
    const event = await sign('a', 100, 'u1');
    const subjects = [{ label: 'Pest Control', slug: 'pest-control', subscribed: true, password: 'hunter2-room-pass' }];
    const backup = buildBackup({ library: [item(event, 'local')], tombstones: [], trust: [{ pubkey: other, status: 'trusted', nickname: 'Bob' }], subjects }, new Date('2026-01-02T03:04:05Z'));
    assert.deepEqual(backup, {
        format: 'tacit-backup', version: 1, exportedAt: '2026-01-02T03:04:05.000Z',
        records: [{ event, visibility: 'local' }], tombstones: [],
        trust: [{ pubkey: other, status: 'trusted', nickname: 'Bob' }],
        subjects: [{ label: 'Pest Control', slug: 'pest-control', subscribed: true }],
    });
    const file = JSON.stringify(backup);
    assert.equal(file.includes(secret), false);
    assert.equal(file.includes('hunter2-room-pass'), false);
    assert.equal(file.includes('password'), false);
});

test('parseBackup accepts a built backup and rejects other files', () => {
    const backup = buildBackup(empty);
    assert.deepEqual(parseBackup(JSON.stringify(backup)), backup);
    assert.throws(() => parseBackup('not json'), /not a Tacit backup/i);
    assert.throws(() => parseBackup('[]'), /not a Tacit backup/i);
    assert.throws(() => parseBackup(JSON.stringify({ ...backup, format: 'other' })), /not a Tacit backup/i);
    assert.throws(() => parseBackup(JSON.stringify({ ...backup, version: 2 })), /version/i);
    assert.throws(() => parseBackup(JSON.stringify({ ...backup, records: {} })), /not a Tacit backup/i);
});

test('restore into an empty profile keeps visibility, trust and subjects', async () => {
    const shared = await sign('s', 100, 'u1'), local = await sign('l', 100, 'u2');
    const backup = buildBackup({
        library: [item(shared, 'shared'), item(local, 'local')], tombstones: [],
        trust: [{ pubkey: other, status: 'blocked' }],
        subjects: [{ label: 'Pest Control', slug: 'pest-control', subscribed: true }],
    });
    const plan = restoreBackup(backup, empty, 5000);
    assert.deepEqual(plan.summary, { imported: 4, skipped: 0, rejected: 0 });
    assert.deepEqual(plan.puts.library.map(r => [r.key, r.visibility, r.subjectSlug, r.receivedAt]), [[recordKey(shared), 'shared', 'pest-control', 5000], [recordKey(local), 'local', 'pest-control', 5000]]);
    assert.deepEqual(plan.puts.trust, [{ pubkey: other, status: 'blocked' }]);
    assert.deepEqual(plan.subjects, [{ label: 'Pest Control', slug: 'pest-control', subscribed: true }]);
});

test('a changed event is rejected and the rest import', async () => {
    const good = await sign('good', 100, 'u1'), bad = await sign('bad', 100, 'u2');
    const backup = buildBackup({ library: [item(good), item(bad)], tombstones: [], trust: [], subjects: [] });
    backup.records[1].event.content = backup.records[1].event.content.replace('bad', 'evil');
    const plan = restoreBackup(backup, empty);
    assert.deepEqual(plan.summary, { imported: 1, skipped: 0, rejected: 1 });
    assert.deepEqual(plan.puts.library.map(r => r.key), [recordKey(good)]);
});

test('malformed entries are rejected', async () => {
    const event = await sign('a', 100, 'u1');
    const backup = { ...buildBackup(empty), records: [{ event, visibility: 'public' }, { visibility: 'local' }], trust: [{ pubkey: 'zz', status: 'trusted' }, { pubkey: other, status: 'meh' }], subjects: [{ label: 'X', slug: 'not-x', subscribed: false }], tombstones: [{}] };
    assert.deepEqual(restoreBackup(backup, empty).summary, { imported: 0, skipped: 0, rejected: 6 });
});

test('records follow the network merge rules: hidden, tombstoned, newer version', async () => {
    const hiddenEvent = await sign('h', 100, 'h1'), v1 = await sign('v1', 100, 'v'), v2 = await signer.signEvent(buildEditTemplate(v1, { ...content, information_chunks: 'v2' }, 200));
    const deleted = await sign('d', 100, 'd1');
    const tombstone = await signer.signEvent(buildDeletionTemplate(deleted, 150));
    const backup = buildBackup({ library: [item(hiddenEvent), item(v1), item(deleted)], tombstones: [{ key: recordKey(deleted), created_at: 150, event: tombstone }], trust: [], subjects: [] });
    const state = { ...empty, hiddenKeys: [recordKey(hiddenEvent)], library: [item(v2)] };
    const plan = restoreBackup(backup, state);
    assert.deepEqual(plan.puts.library, []);
    assert.equal(plan.puts.tombstones.length, 1);
    assert.deepEqual(plan.summary, { imported: 1, skipped: 3, rejected: 0 });

    const newer = restoreBackup(buildBackup({ library: [item(v2)], tombstones: [], trust: [], subjects: [] }), { ...empty, library: [item(v1)] });
    assert.deepEqual(newer.puts.library.map(r => r.event.id), [v2.id]);
});

test('a backup tombstone removes the older held record', async () => {
    const event = await sign('a', 100, 'u1');
    const tombstone = await signer.signEvent(buildDeletionTemplate(event, 150));
    const backup = buildBackup({ library: [], tombstones: [{ key: recordKey(event), created_at: 150, event: tombstone }], trust: [], subjects: [] });
    const plan = restoreBackup(backup, { ...empty, library: [item(event)] });
    assert.deepEqual(plan.removeLibrary, [recordKey(event)]);
    assert.deepEqual(plan.puts.tombstones.map(t => [t.key, t.created_at]), [[recordKey(event), 150]]);
});

test('existing trust entries win, existing subjects win, blocked authors stay blocked', async () => {
    const blocked = await createLocalSigner(generateSecretKeyHex()).signEvent(buildRecordTemplate(content, 100, 'u'));
    const backup = buildBackup({
        library: [item(blocked)], tombstones: [],
        trust: [{ pubkey: other, status: 'trusted', nickname: 'From file' }, { pubkey: blocked.pubkey, status: 'trusted' }],
        subjects: [{ label: 'Pest Control', slug: 'pest-control', subscribed: true }, { label: 'Tax', slug: 'tax', subscribed: false }],
    });
    const state = { ...empty, trust: [{ pubkey: other, status: 'blocked' }, { pubkey: blocked.pubkey, status: 'blocked' }], subjects: [{ label: 'Pest Control', slug: 'pest-control', subscribed: false, password: 'pw' }] };
    const plan = restoreBackup(backup, state);
    assert.deepEqual(plan.puts.trust, []);
    assert.deepEqual(plan.puts.library, []);
    assert.deepEqual(plan.subjects, [{ label: 'Pest Control', slug: 'pest-control', subscribed: false, password: 'pw' }, { label: 'Tax', slug: 'tax', subscribed: false }]);
    assert.deepEqual(plan.summary, { imported: 1, skipped: 4, rejected: 0 });
});

test('importing the same backup twice changes nothing the second time', async () => {
    const event = await sign('a', 100, 'u1'), gone = await sign('g', 100, 'u2');
    const tombstone = await signer.signEvent(buildDeletionTemplate(gone, 150));
    const backup = buildBackup({
        library: [item(event)], tombstones: [{ key: recordKey(gone), created_at: 150, event: tombstone }],
        trust: [{ pubkey: other, status: 'trusted' }], subjects: [{ label: 'Pest Control', slug: 'pest-control', subscribed: true }],
    });
    const first = restoreBackup(backup, empty);
    const state = { ...empty, library: first.puts.library, tombstones: first.puts.tombstones, trust: first.puts.trust, subjects: first.subjects };
    const second = restoreBackup(backup, state);
    assert.deepEqual(second.puts, { library: [], tombstones: [], trust: [] });
    assert.deepEqual(second.removeLibrary, []);
    assert.deepEqual(second.subjects, first.subjects);
    assert.deepEqual(second.summary, { imported: 0, skipped: 4, rejected: 0 });
});
