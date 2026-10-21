import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, buildRoute } from '../src/tacit-route.js';

test('parses tab and sub-view slugs', () => {
    assert.deepEqual(parseRoute('#/import/review'), { tab: 'import', view: 'review' });
    assert.deepEqual(parseRoute('#/insights/link'), { tab: 'insights', view: 'link' });
    assert.deepEqual(parseRoute('#/map'), { tab: 'map', view: undefined });
});

test('unknown sub-view falls back to the first; unknown tab is null', () => {
    assert.deepEqual(parseRoute('#/import'), { tab: 'import', view: 'import' });
    assert.deepEqual(parseRoute('#/insights/nope'), { tab: 'insights', view: 'prompt' });
    assert.equal(parseRoute(''), null);
    assert.equal(parseRoute('#/nope/x'), null);
});

test('builds routes from state', () => {
    const views = { import: 'review', insights: 'prompt' };
    assert.equal(buildRoute('import', views), '#/import/review');
    assert.equal(buildRoute('feed', views), '#/feed');
});
