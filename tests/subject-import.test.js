import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, addSubject } from '../src/tacit-subject.js';
import { detectFormat, parseText, buildDrafts } from '../src/tacit-import.js';

test('slugify collapses case, spacing and symbols', () => {
    for (const label of ['Pest Control', 'pest control', ' Pest  Control ']) assert.equal(slugify(label), 'pest-control');
    assert.equal(slugify('!!!'), '');
});

test('addSubject reuses existing slug and rejects empty slug', () => {
    let { subjects } = addSubject([], 'Pest Control');
    const again = addSubject(subjects, ' pest  control');
    assert.equal(again.created, false);
    assert.equal(again.subjects.length, 1);
    assert.equal(again.subject.label, 'Pest Control');
    assert.throws(() => addSubject(subjects, '***'));
});

test('format detection', () => {
    assert.equal(detectFormat('  [{}]'), 'json');
    assert.equal(detectFormat('{"a":1}'), 'json');
    assert.equal(detectFormat('a,b\n1,2'), 'csv');
    assert.equal(detectFormat('a,b', 'x.JSON'), 'json');
    assert.equal(detectFormat('[', 'x.csv'), 'csv');
});

const subject = { label: 'Pest Control', slug: 'pest-control' };

test('buildDrafts validates, warns and overwrites subject', () => {
    const raw = [
        { subject: 'Other', information_chunks: ' a ', actionable_workflows: 'do' },
        { information_chunks: 'b' },
        { information_chunks: '  ' },
        { subject: 'pest control', information_chunks: 'c', actionable_workflows: 'x', extra: 1 },
    ];
    const { drafts, rejected } = buildDrafts(raw, subject);
    assert.equal(drafts.length, 3);
    assert.equal(rejected.length, 1);
    assert.deepEqual(drafts[0].warnings, ['subject overwritten (was "Other")']);
    assert.deepEqual(drafts[1].warnings, ['no actionable workflow']);
    assert.deepEqual(drafts[2].warnings, []);
    assert.equal(drafts[2].content.extra, 1);
    assert.equal(drafts[0].content.schemaVersion, 1);
    assert.equal(drafts[0].content.subject, 'Pest Control');
});

test('duplicates skipped against existing and within batch', () => {
    const existing = [{ slug: 'pest-control', chunk: 'a' }];
    const { drafts, skipped } = buildDrafts([{ information_chunks: 'a ' }, { information_chunks: 'b' }, { information_chunks: 'b' }], subject, existing);
    assert.equal(drafts.length, 1);
    assert.equal(skipped.length, 2);
});

test('file and paste give same drafts', () => {
    const json = '[{"information_chunks":"x","actionable_workflows":"y"}]';
    assert.deepEqual(buildDrafts(parseText(json, 'a.json'), subject), buildDrafts(parseText(json), subject));
});

test('buildDrafts keeps an imported specialty', () => {
    const { drafts } = buildDrafts([{ information_chunks: 'a', specialty: 'Kitchen Garden' }], subject);
    assert.equal(drafts[0].content.specialty, 'Kitchen Garden');
});
