import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterFeed } from '../tacit-feed.js';

const rec = (key, pubkey, subjectSlug, visibility, info, action = '') => ({ key, subjectSlug, visibility, event: { pubkey }, content: { information_chunks: info, actionable_workflows: action } });
const library = [
    rec('1', 'me', 'pest', 'local', 'Ants hate vinegar', 'Spray along the trail'),
    rec('2', 'me', 'plumbing', 'shared', 'Teflon tape direction'),
    rec('3', 'friend', 'pest', 'shared', 'Termites need soil contact', 'Inspect SLAB edges'),
    rec('4', 'stranger', 'plumbing', 'shared', 'Flush heaters yearly', 'Drain the tank'),
];
const ctx = { selfKeys: new Set(['me']), trustedKeys: new Set(['friend']) };
const keys = filters => filterFeed(library, filters, ctx).map(item => item.key);

test('no filters returns everything', () => {
    assert.deepEqual(keys({}), ['1', '2', '3', '4']);
    assert.deepEqual(keys({ subject: '', author: '', visibility: '', search: '  ' }), ['1', '2', '3', '4']);
});

test('each filter alone', () => {
    assert.deepEqual(keys({ subject: 'pest' }), ['1', '3']);
    assert.deepEqual(keys({ author: 'mine' }), ['1', '2']);
    assert.deepEqual(keys({ author: 'trusted' }), ['3']);
    assert.deepEqual(keys({ author: 'others' }), ['4']);
    assert.deepEqual(keys({ visibility: 'local' }), ['1']);
    assert.deepEqual(keys({ visibility: 'shared' }), ['2', '3', '4']);
});

test('filters combine with AND', () => {
    assert.deepEqual(keys({ subject: 'plumbing', visibility: 'shared' }), ['2', '4']);
    assert.deepEqual(keys({ subject: 'plumbing', author: 'others', visibility: 'shared' }), ['4']);
    assert.deepEqual(keys({ subject: 'pest', author: 'others' }), []);
    assert.deepEqual(keys({ subject: 'pest', search: 'termites' }), ['3']);
});

test('search matches either field, ignoring case and surrounding space', () => {
    assert.deepEqual(keys({ search: 'ANTS' }), ['1']);
    assert.deepEqual(keys({ search: ' slab ' }), ['3']);
    assert.deepEqual(keys({ search: 'the' }), ['1', '4']);
    assert.deepEqual(keys({ search: 'zzz' }), []);
});

test('a record with a missing workflow field does not break search', () => {
    assert.deepEqual(keys({ search: 'teflon' }), ['2']);
});
