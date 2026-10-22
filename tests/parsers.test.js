import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TacitJsonParser } from '../src/tacit-json-parser.js';
import { TacitCsvParser } from '../src/tacit-csv-parser.js';
import { buildTacitPrompt } from '../src/tacit-prompt.js';

test('json parser accepts array, knowledge wrapper and single object', () => {
    assert.equal(TacitJsonParser.parse('[{"a":1},{"a":2}]').length, 2);
    assert.equal(TacitJsonParser.parse('{"knowledge":[{"a":1}]}').length, 1);
    assert.deepEqual(TacitJsonParser.parse('{"a":1}'), [{ a: 1 }]);
    assert.throws(() => TacitJsonParser.parse('[1]'));
});

test('csv parser maps headers and handles quotes', () => {
    const rows = TacitCsvParser.parse('subject,information_chunks\nPests,"a, ""b"""\n');
    assert.deepEqual(rows, [{ subject: 'Pests', information_chunks: 'a, "b"' }]);
    assert.throws(() => TacitCsvParser.parse('only,header'));
});

test('prompt builder embeds input type and subject', () => {
    const prompt = buildTacitPrompt({ inputType: 'txt', subjectCategory: 'Pest Control' });
    assert.match(prompt, /Text file \(\.txt\)/);
    assert.match(prompt, /`Pest Control`/);
});

test('prompt builder supports pdf input type', () => {
    const prompt = buildTacitPrompt({ inputType: 'pdf', subjectCategory: 'Gardening' });
    assert.match(prompt, /\*\*Input Type:\*\* PDF file \(\.pdf\)/);
    assert.match(prompt, /perform OCR on it/);
});

test('prompt builder adds optional specialty', () => {
    const plain = buildTacitPrompt({ inputType: 'txt', subjectCategory: 'Gardening' });
    assert.doesNotMatch(plain, /specialty/i);
    const prompt = buildTacitPrompt({ inputType: 'txt', subjectCategory: 'Gardening', specialty: ' Kitchen Garden ' });
    assert.match(prompt, /\*\*Specialty:\*\* Kitchen Garden/);
    assert.match(prompt, /"specialty": "String \(Set to `Kitchen Garden`\)"/);
    assert.match(prompt, /Set the `specialty` of every extracted record to `Kitchen Garden`/);
});

test('prompt builder keeps replacement patterns in specialty literal', () => {
    const prompt = buildTacitPrompt({ inputType: 'txt', subjectCategory: 'Gardening', specialty: 'A "b" $& $\' x' });
    assert.match(prompt, /\*\*Specialty:\*\* A "b" \$& \$' x\n\n### \*\*Role & Objective\*\*/);
    assert.match(prompt, /"specialty": "String \(Set to `A \\"b\\" \$& \$' x`\)",/);
});
