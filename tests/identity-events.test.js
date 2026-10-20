import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSecretKey, encodeNsec, createLocalSigner, generateSecretKeyHex } from '../tacit-identity.js';
import { buildRecordTemplate, buildEditTemplate, buildDeletionTemplate, isValidRecord, recordKey } from '../tacit-events.js';
import { decideIncoming, PENDING_CAP, roomConfig, announcementFor, validAnnouncements, groupDiscover } from '../tacit-sync.js';
import { slugify } from '../tacit-subject.js';

test('parseSecretKey accepts hex and nsec, rejects others', () => {
    const hex = generateSecretKeyHex();
    assert.equal(parseSecretKey(hex), hex);
    assert.equal(parseSecretKey(encodeNsec(hex)), hex);
    assert.throws(() => parseSecretKey('abc'));
    assert.throws(() => parseSecretKey('npub1qqqq'));
    assert.throws(() => parseSecretKey('nsec1qqqq'));
});

const content = { schemaVersion: 1, subject: 'Pest Control', information_chunks: 'a' };

test('template has expected shape', () => {
    const template = buildRecordTemplate(content, 100, 'u1');
    assert.equal(template.kind, 30078);
    assert.deepEqual(template.tags, [['d', 'tacit-entry-u1'], ['subject', 'Pest Control']]);
    assert.deepEqual(JSON.parse(template.content), content);
});

test('sign then verify round trip; tampering fails', async () => {
    const signer = createLocalSigner(generateSecretKeyHex());
    const event = await signer.signEvent(buildRecordTemplate(content));
    assert.equal(isValidRecord(event), true);
    assert.equal(isValidRecord({ ...event, content: event.content.replace('"a"', '"b"') }), false);
});

test('decideIncoming: self accepted, duplicate/older/tampered/foreign dropped', async () => {
    const signer = createLocalSigner(generateSecretKeyHex());
    const event = await signer.signEvent(buildRecordTemplate(content, 100, 'u'));
    const self = new Set([event.pubkey]);
    assert.equal(decideIncoming(event, { held: {}, trustedPubkeys: self }).action, 'accept');
    assert.equal(decideIncoming(event, { held: { [recordKey(event)]: event }, trustedPubkeys: self }).reason, 'duplicate-or-older');
    const newer = await signer.signEvent(buildRecordTemplate(content, 200, 'u'));
    assert.equal(decideIncoming(newer, { held: { [recordKey(event)]: event }, trustedPubkeys: self }).action, 'accept');
    assert.equal(decideIncoming({ ...event, content: '{}' }, { held: {}, trustedPubkeys: self }).reason, 'tampered');
    assert.equal(decideIncoming(event, { held: {}, trustedPubkeys: new Set() }).action, 'review');
});

test('decideIncoming: blocked dropped, hidden dropped, pending duplicate dropped, trusted accepted', async () => {
    const signer = createLocalSigner(generateSecretKeyHex());
    const event = await signer.signEvent(buildRecordTemplate(content, 100, 'u'));
    const base = { held: {}, trustedPubkeys: new Set() };
    assert.equal(decideIncoming(event, { ...base, blockedPubkeys: new Set([event.pubkey]) }).reason, 'blocked');
    assert.equal(decideIncoming(event, { ...base, hiddenKeys: new Set([recordKey(event)]) }).reason, 'hidden');
    assert.equal(decideIncoming(event, { ...base, pendingIncoming: { [recordKey(event)]: event } }).reason, 'duplicate-or-older');
    assert.equal(decideIncoming(event, { ...base, trustedPubkeys: new Set([event.pubkey]) }).action, 'accept');
    assert.equal(decideIncoming(event, { ...base, trustedPubkeys: new Set([event.pubkey]), blockedPubkeys: new Set([event.pubkey]) }).action, 'drop');
});

test('decideIncoming: unknown author capped at 50 pending; update of a pending record still allowed', async () => {
    const signer = createLocalSigner(generateSecretKeyHex());
    const event = await signer.signEvent(buildRecordTemplate(content, 100, 'u'));
    const base = { held: {}, trustedPubkeys: new Set() };
    assert.equal(PENDING_CAP, 50);
    assert.equal(decideIncoming(event, { ...base, pendingCount: 49 }).action, 'review');
    assert.deepEqual(decideIncoming(event, { ...base, pendingCount: 50 }), { action: 'drop', reason: 'queue-full' });
    const newer = await signer.signEvent(buildRecordTemplate(content, 200, 'u'));
    assert.equal(decideIncoming(newer, { ...base, pendingCount: 50, pendingIncoming: { [recordKey(event)]: event } }).action, 'review');
    assert.equal(decideIncoming(event, { ...base, pendingCount: 50, trustedPubkeys: new Set([event.pubkey]) }).action, 'accept');
});

test('edit template keeps d, bumps created_at; newer replaces in either order', async () => {
    const signer = createLocalSigner(generateSecretKeyHex());
    const first = await signer.signEvent(buildRecordTemplate(content, 100, 'u'));
    const editTemplate = buildEditTemplate(first, { ...content, information_chunks: 'b' }, 50);
    assert.equal(editTemplate.created_at, 101);
    assert.deepEqual(editTemplate.tags, first.tags);
    const second = await signer.signEvent(editTemplate);
    assert.equal(recordKey(second), recordKey(first));
    const trusted = new Set([first.pubkey]);
    assert.equal(decideIncoming(second, { held: { [recordKey(first)]: first }, trustedPubkeys: trusted }).action, 'accept');
    assert.equal(decideIncoming(first, { held: { [recordKey(second)]: second }, trustedPubkeys: trusted }).reason, 'duplicate-or-older');
});

test('deletion: author check, removes held, tombstone blocks older re-insert', async () => {
    const author = createLocalSigner(generateSecretKeyHex());
    const other = createLocalSigner(generateSecretKeyHex());
    const record = await author.signEvent(buildRecordTemplate(content, 100, 'u'));
    const key = recordKey(record);
    const deletion = await author.signEvent(buildDeletionTemplate(record, 200));
    assert.equal(deletion.kind, 5);
    assert.deepEqual(deletion.tags, [['a', `30078:${record.pubkey}:tacit-entry-u`], ['subject', 'Pest Control']]);
    const base = { held: { [key]: record }, trustedPubkeys: new Set() };
    assert.deepEqual(decideIncoming(deletion, base), { action: 'delete', key, removeHeld: true });
    assert.equal(decideIncoming(deletion, { ...base, tombstones: { [key]: 200 } }).reason, 'duplicate-or-older');
    const foreign = await other.signEvent(buildDeletionTemplate(record, 200));
    assert.equal(decideIncoming(foreign, base).reason, 'foreign-deletion');
    assert.equal(decideIncoming(record, { held: {}, trustedPubkeys: new Set([record.pubkey]), tombstones: { [key]: 200 } }).reason, 'tombstoned');
    const edited = await author.signEvent(buildEditTemplate(record, content, 300));
    assert.equal(decideIncoming(edited, { held: {}, trustedPubkeys: new Set([record.pubkey]), tombstones: { [key]: 200 } }).action, 'accept');
    const newerHeld = await author.signEvent(buildEditTemplate(record, content, 300));
    assert.equal(decideIncoming(deletion, { ...base, held: { [key]: newerHeld } }).removeHeld, false);
});

test('roomConfig adds password only for private subjects and keeps relays', () => {
    assert.deepEqual(roomConfig([], ''), { appId: 'com.tacit-sync.v1' });
    assert.deepEqual(roomConfig([], undefined), { appId: 'com.tacit-sync.v1' });
    assert.deepEqual(roomConfig(['wss://r'], 'pw'), { appId: 'com.tacit-sync.v1', relayConfig: { urls: ['wss://r'] }, password: 'pw' });
});

test('announcementFor lists subscribed public subjects with shared counts, never private', () => {
    const subjects = [
        { label: 'Pest Control', slug: 'pest-control', subscribed: true },
        { label: 'Secret', slug: 'secret', subscribed: true, password: 'pw' },
        { label: 'Idle', slug: 'idle', subscribed: false },
    ];
    const library = [
        { subjectSlug: 'pest-control', visibility: 'shared' }, { subjectSlug: 'pest-control', visibility: 'shared' },
        { subjectSlug: 'pest-control', visibility: 'local' }, { subjectSlug: 'secret', visibility: 'shared' },
    ];
    assert.deepEqual(announcementFor(subjects, library), [{ label: 'Pest Control', slug: 'pest-control', sharedCount: 2 }]);
});

test('validAnnouncements drops malformed entries and caps at 100', () => {
    const good = { label: 'Pest Control', slug: 'pest-control', sharedCount: 3 };
    const result = validAnnouncements([
        good,
        { label: 'Pest Control', slug: 'wrong', sharedCount: 1 },
        { label: 'x'.repeat(81), slug: 'x'.repeat(81), sharedCount: 1 },
        { label: 5, slug: '5', sharedCount: 1 },
        null,
        { label: 'Roofing', slug: 'roofing', sharedCount: 'many' },
    ]);
    assert.deepEqual(result, [good, { label: 'Roofing', slug: 'roofing', sharedCount: 0 }]);
    assert.equal(validAnnouncements('nope').length, 0);
    const many = Array.from({ length: 150 }, (_, i) => ({ label: `s${i}`, slug: `s${i}`, sharedCount: 0 }));
    assert.equal(validAnnouncements(many).length, 100);
});

test('groupDiscover groups by slug, most common label, peer count, max shared, sorted by peers', () => {
    const entry = (label, sharedCount) => ({ label, slug: slugify(label), sharedCount });
    const rows = groupDiscover({
        p1: [entry('Roofing', 2), entry('Pest Control', 5)],
        p2: [entry('Pest-Control', 9)],
        p3: [entry('Pest Control', 1)],
    });
    assert.deepEqual(rows, [
        { slug: 'pest-control', label: 'Pest Control', peers: 3, sharedCount: 9 },
        { slug: 'roofing', label: 'Roofing', peers: 1, sharedCount: 2 },
    ]);
    assert.deepEqual(groupDiscover({}), []);
});
