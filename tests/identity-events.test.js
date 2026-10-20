import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSecretKey, encodeNsec, createLocalSigner, generateSecretKeyHex } from '../tacit-identity.js';
import { buildRecordTemplate, isValidRecord, recordKey } from '../tacit-events.js';
import { decideIncoming } from '../tacit-sync.js';

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
    assert.equal(decideIncoming(event, { held: {}, trustedPubkeys: new Set() }).action, 'drop');
});
