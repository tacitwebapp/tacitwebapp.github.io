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

test('parses the full view route to the tacit tab with an id', () => {
    assert.deepEqual(parseRoute('#/tacit/3fa85f64'), { tab: 'tacit', id: '3fa85f64' });
    assert.deepEqual(parseRoute('#tacit/00000000'), { tab: 'tacit', id: '00000000' });
});

test('a malformed full view id is not a route', () => {
    for (const hash of ['#/tacit', '#/tacit/', '#/tacit/3fa85f6', '#/tacit/3fa85f645', '#/tacit/3FA85F64', '#/tacit/zzzzzzzz', '#/tacit/3fa85f64/x']) assert.equal(parseRoute(hash), null, hash);
});

test('builds the full view route and round-trips it', () => {
    const hash = buildRoute('tacit', {}, '3fa85f64');
    assert.equal(hash, '#/tacit/3fa85f64');
    assert.deepEqual(parseRoute(hash), { tab: 'tacit', id: '3fa85f64' });
});

test('builds routes from state', () => {
    const views = { import: 'review', insights: 'prompt' };
    assert.equal(buildRoute('import', views), '#/import/review');
    assert.equal(buildRoute('feed', views), '#/feed');
});
