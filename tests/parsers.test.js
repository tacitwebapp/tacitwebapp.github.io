import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TacitJsonParser } from '../tacit-json-parser.js';
import { TacitCsvParser } from '../tacit-csv-parser.js';
import { buildTacitPrompt } from '../tacit-prompt.js';

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
