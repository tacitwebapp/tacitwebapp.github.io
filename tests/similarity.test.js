import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankBySimilarity, matchesQuery, candidatesFor } from '../src/tacit-similarity.js';

const rec = (key, information_chunks, extra = {}) => ({ key, content: { information_chunks, ...extra } });
const keys = ranked => ranked.map(row => row.item.key);

const target = rec('t', 'Call the payer on day 14 to confirm the claim status', { actionable_workflows: 'Phone the payer', specialty: 'Billing' });
const close = rec('close', 'Confirm claim status with the payer by phone after 14 days', { actionable_workflows: 'Call the payer', specialty: 'Billing' });
const far = rec('far', 'Water the tomato seedlings every morning', { actionable_workflows: 'Use the watering can', specialty: 'Garden' });
const corpus = [target, close, far];

test('ranks the topically closest candidate first', () => {
    const ranked = rankBySimilarity(target, [far, close], corpus);
    assert.deepEqual(keys(ranked), ['close', 'far']);
    assert.ok(ranked[0].score > 0 && ranked[0].score <= 1);
});

test('a shared rare word outweighs a shared common word', () => {
    const t = rec('t', 'alpha zeta');
    const withCommon = rec('common', 'alpha');
    const withRare = rec('rare', 'zeta');
    const filler = ['alpha one', 'alpha two', 'alpha three', 'alpha four'].map((text, i) => rec(`f${i}`, text));
    const ranked = rankBySimilarity(t, [withCommon, withRare], [t, withCommon, withRare, ...filler]);
    assert.deepEqual(keys(ranked), ['rare', 'common']);
    assert.ok(ranked[0].score > ranked[1].score);
});

test('zero-score candidates follow scored ones in their original order', () => {
    const t = rec('t', 'invoice reconciliation');
    const z1 = rec('z1', 'tomato seedlings'), z2 = rec('z2', 'garden hose'), hit = rec('hit', 'invoice');
    const ranked = rankBySimilarity(t, [z1, z2, hit], [t, z1, z2, hit]);
    assert.deepEqual(keys(ranked), ['hit', 'z1', 'z2']);
    assert.deepEqual(ranked.map(row => row.score), [ranked[0].score, 0, 0]);
});

test('equal scores keep their original order', () => {
    const t = rec('t', 'invoice');
    const a = rec('a', 'invoice'), b = rec('b', 'invoice');
    assert.deepEqual(keys(rankBySimilarity(t, [b, a], [t, a, b])), ['b', 'a']);
});

test('excludes the target from the results', () => {
    assert.deepEqual(keys(rankBySimilarity(target, [target, close, far], corpus)), ['close', 'far']);
});

test('is deterministic and does not mutate its inputs', () => {
    const candidates = [far, close];
    const first = rankBySimilarity(target, candidates, corpus);
    assert.deepEqual(rankBySimilarity(target, candidates, corpus), first);
    assert.deepEqual(candidates, [far, close]);
});

test('ignores case, punctuation, one-letter tokens and stopwords', () => {
    const t = rec('t', 'The Payer, a B2B contact!');
    const stopOnly = rec('stop', 'the and of to a');
    const real = rec('real', 'PAYER contact');
    assert.deepEqual(keys(rankBySimilarity(t, [stopOnly, real], [t, stopOnly, real])), ['real', 'stop']);
    assert.equal(rankBySimilarity(t, [stopOnly], [t, stopOnly])[0].score, 0);
});

test('handles unicode letters and records with missing fields', () => {
    const t = rec('t', 'Überweisung prüfen');
    const hit = rec('hit', 'überweisung');
    const empty = { key: 'e', content: {} };
    assert.deepEqual(keys(rankBySimilarity(t, [empty, hit], [t, empty, hit])), ['hit', 'e']);
});

const ranked = [rec('r1', 'payer call'), rec('r2', 'claim status'), rec('r3', 'tomato seedlings'), rec('r4', 'rose bushes')].map((item, i) => ({ item, score: 1 - i / 10 }));
const idOf = item => `t:${item.key}`;

test('matchesQuery is a case-insensitive substring match on short ID and record text', () => {
    const item = rec('abc123', 'Call the Payer', { actionable_workflows: 'Log the reference' });
    assert.ok(matchesQuery(item, 'payer', idOf));
    assert.ok(matchesQuery(item, 't:abc', idOf));
    assert.ok(matchesQuery(item, 'reference', idOf));
    assert.ok(!matchesQuery(item, 'tomato', idOf));
});

test('candidatesFor shows only the top N when the query is empty', () => {
    assert.deepEqual(keys(candidatesFor(ranked, '  ', 2, idOf)), ['r1', 'r2']);
});

test('candidatesFor searches all rows when typing, keeping similarity order', () => {
    assert.deepEqual(keys(candidatesFor(ranked, 'se', 2, idOf)), ['r3', 'r4']);
    assert.deepEqual(keys(candidatesFor(ranked, 's', 1, idOf)), ['r2', 'r3', 'r4']);
});
