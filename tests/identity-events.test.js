import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSecretKey, encodeNsec, createLocalSigner, createExtensionSigner, pickSource, retireKey, generateSecretKeyHex } from '../tacit-identity.js';
import { buildRecordTemplate, buildEditTemplate, buildDeletionTemplate, isValidRecord, recordKey, authorNameOf, latestAuthorNames } from '../tacit-events.js';
import { decideIncoming, PENDING_CAP, roomConfig, announcementFor, validAnnouncements, groupDiscover, mergeSubjectCache, SUBJECT_CACHE_TTL } from '../tacit-sync.js';
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

const fakeExtension = secretHex => {
    const local = createLocalSigner(secretHex);
    const calls = [];
    return { calls, getPublicKey: async () => local.getPublicKey(), signEvent: async template => { calls.push(template); return local.signEvent(template); } };
};

test('extension signer signs through window.nostr and reports source extension', async () => {
    const secret = generateSecretKeyHex();
    const nostr = fakeExtension(secret);
    const signer = createExtensionSigner(nostr);
    assert.equal(signer.source, 'extension');
    assert.equal(await signer.getPublicKey(), await createLocalSigner(secret).getPublicKey());
    const event = await signer.signEvent(buildRecordTemplate(content, 100, 'u'));
    assert.equal(event.pubkey, await signer.getPublicKey());
    assert.equal(isValidRecord(event), true);
    assert.equal(nostr.calls.length, 1);
});

test('extension signer rejects an event that does not verify or changes the template', async () => {
    const secret = generateSecretKeyHex();
    const template = buildRecordTemplate(content, 100, 'u');
    const forged = { ...fakeExtension(secret), signEvent: async t => ({ ...(await createLocalSigner(secret).signEvent(t)), content: '{}' }) };
    await assert.rejects(createExtensionSigner(forged).signEvent(template));
    const swapped = { ...fakeExtension(secret), signEvent: async () => createLocalSigner(secret).signEvent(buildRecordTemplate(content, 100, 'other')) };
    await assert.rejects(createExtensionSigner(swapped).signEvent(template));
});

test('pickSource uses the extension when present unless the preference is local', () => {
    const nostr = {};
    assert.equal(pickSource(nostr, undefined), 'extension');
    assert.equal(pickSource(nostr, 'extension'), 'extension');
    assert.equal(pickSource(nostr, 'local'), 'local');
    assert.equal(pickSource(undefined, undefined), 'local');
    assert.equal(pickSource(undefined, 'extension'), 'local');
});

test('retireKey adds the old key to previous keys and drops the new current key from them', () => {
    assert.deepEqual(retireKey(['a'], 'b', 'c'), ['a', 'b']);
    assert.deepEqual(retireKey(['a', 'b'], 'b', 'c'), ['a', 'b']);
    assert.deepEqual(retireKey(['a', 'c'], 'b', 'c'), ['a', 'b']);
    assert.deepEqual(retireKey(['a'], 'c', 'c'), ['a']);
    assert.deepEqual(retireKey(['a'], undefined, 'c'), ['a']);
});

test('groupDiscover survives a __proto__ label', () => {
    const entries = validAnnouncements([{ label: '__proto__', slug: 'proto', sharedCount: 2 }, { label: 'constructor', slug: 'constructor', sharedCount: 1 }]);
    assert.equal(entries.length, 2);
    const rows = groupDiscover({ a: entries, b: entries });
    assert.deepEqual(rows.map(row => [row.slug, row.label, row.peers, row.sharedCount]), [['proto', '__proto__', 2, 2], ['constructor', 'constructor', 2, 1]]);
});

test('buildDeletionTemplate is later than the record it deletes even within the same second', async () => {
    const signer = createLocalSigner(generateSecretKeyHex());
    const record = await signer.signEvent(buildRecordTemplate(content, 500, 'u'));
    assert.equal(buildDeletionTemplate(record, 500).created_at, 501);
    assert.equal(buildDeletionTemplate(record, 900).created_at, 900);
    const deletion = await signer.signEvent(buildDeletionTemplate(record, 500));
    assert.equal(decideIncoming(deletion, { held: { [recordKey(record)]: record }, trustedPubkeys: new Set() }).action, 'delete');
    assert.equal(decideIncoming(deletion, { held: { [recordKey(record)]: record }, trustedPubkeys: new Set() }).removeHeld, true);
});

test('decideIncoming drops records whose content is not a JSON object', async () => {
    const signer = createLocalSigner(generateSecretKeyHex());
    for (const bad of ['not json', 'null', '[]', '"x"', '5', '']) {
        const event = await signer.signEvent({ ...buildRecordTemplate(content, 100, 'u'), content: bad });
        const decision = decideIncoming(event, { held: {}, trustedPubkeys: new Set([event.pubkey]) });
        assert.deepEqual(decision, { action: 'drop', reason: 'bad-content' }, bad);
    }
});

test('announcementFor never announces a private subject awaiting its password', () => {
    const subjects = [{ label: 'Waiting', slug: 'waiting', subscribed: true, needsPassword: true }, { label: 'Open', slug: 'open', subscribed: true }];
    assert.deepEqual(announcementFor(subjects, []).map(entry => entry.slug), ['open']);
});

test('mergeSubjectCache saves new subjects, keeps the original seenAt, and expires old ones', () => {
    const now = 10 * SUBJECT_CACHE_TTL;
    const entry = (slug, seenAt) => ({ label: slug, slug, sharedCount: 1, ...(seenAt === undefined ? {} : { seenAt }) });
    let cache = mergeSubjectCache({}, [entry('roofing'), entry('old', now - SUBJECT_CACHE_TTL), entry('future', now + 99)], now);
    assert.deepEqual(Object.entries(cache).map(([slug, { seenAt }]) => [slug, seenAt]), [['roofing', now], ['future', now]]);
    cache = mergeSubjectCache(cache, [entry('roofing', now - 5)], now + 1000);
    assert.equal(cache.roofing.seenAt, now);
    assert.deepEqual(Object.keys(mergeSubjectCache(cache, [], now + SUBJECT_CACHE_TTL)), []);
    const many = Array.from({ length: 250 }, (_, i) => entry(`s${i}`, now - i));
    assert.equal(Object.keys(mergeSubjectCache({}, many, now)).length, 200);
});

test('announcementFor relays cached subjects with their original seenAt, never duplicating own', () => {
    const subjects = [{ label: 'Open', slug: 'open', subscribed: true }];
    const cache = { open: { label: 'Open', sharedCount: 9, seenAt: 1 }, roofing: { label: 'Roofing', sharedCount: 4, seenAt: 7 } };
    assert.deepEqual(announcementFor(subjects, [], cache), [{ label: 'Open', slug: 'open', sharedCount: 0 }, { label: 'Roofing', slug: 'roofing', sharedCount: 4, seenAt: 7 }]);
});

test('groupDiscover lists cached subjects with no live peer as saved rows', () => {
    const cache = { roofing: { label: 'Roofing', sharedCount: 4, seenAt: 7 }, 'pest-control': { label: 'Pest Control', sharedCount: 1, seenAt: 9 } };
    const rows = groupDiscover({ p1: [{ label: 'Pest Control', slug: 'pest-control', sharedCount: 2 }] }, cache);
    assert.deepEqual(rows, [{ slug: 'pest-control', label: 'Pest Control', peers: 1, sharedCount: 2 }, { slug: 'roofing', label: 'Roofing', peers: 0, sharedCount: 4 }]);
});

test('author name rides as a signed tag only when set, and is cleaned', async () => {
    assert.deepEqual(buildRecordTemplate(content, 100, 'u1').tags, [['d', 'tacit-entry-u1'], ['subject', 'Pest Control']]);
    assert.deepEqual(buildRecordTemplate(content, 100, 'u1', '   ').tags, [['d', 'tacit-entry-u1'], ['subject', 'Pest Control']]);
    const named = buildRecordTemplate(content, 100, 'u1', ' Ada\nLovelace '.padEnd(80, 'x'));
    assert.equal(named.tags[2][0], 'author_name');
    assert.equal(named.tags[2][1].length, 40);
    assert.ok(!/[\n]/.test(named.tags[2][1]));
    const signer = createLocalSigner(generateSecretKeyHex());
    const event = await signer.signEvent(buildRecordTemplate(content, 100, 'u1', 'Ada'));
    assert.equal(isValidRecord(event), true);
    assert.equal(authorNameOf(event), 'Ada');
    assert.equal(recordKey(event), `${event.pubkey}:tacit-entry-u1`);
});

test('edit template replaces the author name tag, or drops it when none is set', () => {
    const event = { created_at: 100, tags: [['d', 'tacit-entry-u1'], ['subject', 'Pest Control'], ['author_name', 'Old']] };
    assert.deepEqual(buildEditTemplate(event, content, 200, 'New').tags, [['d', 'tacit-entry-u1'], ['subject', 'Pest Control'], ['author_name', 'New']]);
    assert.deepEqual(buildEditTemplate(event, content, 200).tags, [['d', 'tacit-entry-u1'], ['subject', 'Pest Control']]);
});

test('latestAuthorNames takes the newest event per author; an unnamed newer event clears the name', () => {
    const at = (pubkey, created_at, name) => ({ pubkey, created_at, tags: name ? [['author_name', name]] : [] });
    assert.deepEqual(latestAuthorNames([at('a', 1, 'Old'), at('a', 2, 'New'), at('b', 1, 'Bee'), at('b', 2), at('c', 1)]), { a: 'New' });
});
