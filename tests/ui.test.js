import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avatarFor, resolveTheme, nextTheme, addToast, dismissToast, expireToasts, resolveShortcut, tipPosition } from '../tacit-ui.js';

const keyOf = n => n.toString(16).padStart(2, '0').repeat(32);
const sampleKeys = ['3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d', '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798', 'fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52', 'e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35', '0000000000000000000000000000000000000000000000000000000000000001'];

test('avatar is deterministic with hue in 0..359', () => {
    for (const k of sampleKeys) {
        const a = avatarFor(k, 'Alice');
        assert.deepEqual(a, avatarFor(k, 'Alice'));
        assert.deepEqual(a, avatarFor(k.toUpperCase(), 'Alice'));
        assert.ok(Number.isInteger(a.hue) && a.hue >= 0 && a.hue <= 359);
        assert.equal(a.neutral, false);
    }
    for (let n = 0; n < 256; n++) {
        const { hue } = avatarFor(keyOf(n), 'x');
        assert.ok(hue >= 0 && hue <= 359);
    }
});

test('avatar hue differs across a sample of keys', () => {
    const hues = sampleKeys.map(k => avatarFor(k, 'a').hue);
    assert.equal(new Set(hues).size, sampleKeys.length);
});

test('avatar initial comes from the label', () => {
    const k = sampleKeys[0];
    assert.equal(avatarFor(k, 'alice').initial, 'A');
    assert.equal(avatarFor(k, 'You').initial, 'Y');
    assert.equal(avatarFor(k, 'by previous key').initial, 'B');
    assert.equal(avatarFor(k, '  bob ').initial, 'B');
    assert.equal(avatarFor(k, 'npub1q7xk4m...abcd').initial, 'Q7');
    assert.equal(avatarFor(k, 'npub1qzxk').initial, 'Qz');
    assert.equal(avatarFor(k, '').initial, '?');
    assert.equal(avatarFor(k, undefined).initial, '?');
});

test('missing or malformed key gives a neutral avatar', () => {
    for (const bad of [undefined, null, '', 'abc', keyOf(1).slice(1), keyOf(1) + '0', 'z'.repeat(64), 42]) {
        assert.deepEqual(avatarFor(bad, 'Carol'), { hue: 0, initial: 'C', neutral: true });
    }
    assert.deepEqual(avatarFor(undefined), { hue: 0, initial: '?', neutral: true });
});

test('stored theme beats the system setting', () => {
    assert.equal(resolveTheme('light', true), 'light');
    assert.equal(resolveTheme('dark', false), 'dark');
});

test('absent or unknown stored theme follows the system', () => {
    for (const stored of [undefined, null, '', 'sepia']) {
        assert.equal(resolveTheme(stored, true), 'dark');
        assert.equal(resolveTheme(stored, false), 'light');
    }
});

test('theme cycles System, Light, Dark, System', () => {
    assert.equal(nextTheme(undefined), 'light');
    assert.equal(nextTheme(null), 'light');
    assert.equal(nextTheme(''), 'light');
    assert.equal(nextTheme('light'), 'dark');
    assert.equal(nextTheme('dark'), null);
});

test('addToast creates a toast with a 4s lifetime and incrementing ids', () => {
    const one = addToast([], { text: 'Stored' }, 1000);
    assert.deepEqual(one, [{ id: 1, text: 'Stored', failure: false, expiresAt: 5000 }]);
    const two = addToast(one, { text: 'Shared' }, 1500);
    assert.deepEqual(two.map(t => t.id), [1, 2]);
    assert.equal(two[1].expiresAt, 5500);
});

test('failure toasts are flagged and last 8s', () => {
    const q = addToast([], { text: 'Share failed', failure: true }, 1000);
    assert.equal(q[0].failure, true);
    assert.equal(q[0].expiresAt, 9000);
});

test('same text resets the existing toast without stacking', () => {
    let q = addToast([], { text: 'A' }, 0);
    q = addToast(q, { text: 'B' }, 100);
    const again = addToast(q, { text: 'A' }, 3000);
    assert.equal(again.length, 2);
    assert.deepEqual(again.map(t => t.id), [1, 2]);
    assert.equal(again[0].expiresAt, 7000);
    assert.equal(again[1].expiresAt, 4100);
});

test('at most three toasts are kept, dropping the oldest', () => {
    let q = [];
    for (const [i, text] of ['A', 'B', 'C', 'D'].entries()) q = addToast(q, { text }, i);
    assert.deepEqual(q.map(t => t.text), ['B', 'C', 'D']);
    assert.deepEqual(q.map(t => t.id), [2, 3, 4]);
});

test('toast functions do not mutate the input queue', () => {
    const q = Object.freeze([Object.freeze({ id: 1, text: 'A', failure: false, expiresAt: 10 })]);
    addToast(q, { text: 'B' }, 0);
    addToast(q, { text: 'A' }, 0);
    dismissToast(q, 1);
    expireToasts(q, 99);
    assert.equal(q.length, 1);
    assert.equal(q[0].expiresAt, 10);
});

test('dismissToast removes only that toast', () => {
    const q = addToast(addToast([], { text: 'A' }, 0), { text: 'B' }, 0);
    assert.deepEqual(dismissToast(q, 1).map(t => t.text), ['B']);
    assert.deepEqual(dismissToast(q, 99), q);
});

test('expireToasts removes toasts at or past their expiry', () => {
    let q = addToast([], { text: 'ok' }, 0);
    q = addToast(q, { text: 'bad', failure: true }, 0);
    assert.equal(expireToasts(q, 3999).length, 2);
    assert.deepEqual(expireToasts(q, 4000).map(t => t.text), ['bad']);
    assert.deepEqual(expireToasts(q, 7999).map(t => t.text), ['bad']);
    assert.deepEqual(expireToasts(q, 8000), []);
});

const press = (key, extra = {}) => ({ key, ctrl: false, meta: false, alt: false, editable: false, ...extra });
const idle = { pendingG: null };

test('single-key shortcuts', () => {
    assert.deepEqual(resolveShortcut(idle, press('/'), 0), { action: 'search', state: idle });
    assert.deepEqual(resolveShortcut(idle, press('?'), 0), { action: 'help', state: idle });
    assert.deepEqual(resolveShortcut(idle, press('Escape'), 0), { action: 'close', state: idle });
});

test('unbound keys do nothing', () => {
    assert.deepEqual(resolveShortcut(idle, press('x'), 0), { action: null, state: idle });
    assert.deepEqual(resolveShortcut(idle, press('f'), 0), { action: null, state: idle });
});

test('g starts a sequence and each second key navigates', () => {
    const started = resolveShortcut(idle, press('g'), 1000);
    assert.deepEqual(started, { action: null, state: { pendingG: 1000 } });
    const targets = { f: 'feed', e: 'extract', r: 'import', n: 'insights', m: 'map', s: 'subjects', i: 'identity' };
    for (const [k, t] of Object.entries(targets)) {
        assert.deepEqual(resolveShortcut(started.state, press(k), 1500), { action: `go:${t}`, state: idle });
    }
});

test('g sequence is valid up to 1.5s and times out after', () => {
    const state = { pendingG: 1000 };
    assert.equal(resolveShortcut(state, press('f'), 2500).action, 'go:feed');
    assert.deepEqual(resolveShortcut(state, press('f'), 2501), { action: null, state: idle });
    assert.deepEqual(resolveShortcut(state, press('/'), 2501), { action: null, state: idle });
});

test('another key cancels a pending g and is not a shortcut', () => {
    const state = { pendingG: 1000 };
    for (const k of ['x', '/', '?', 'Escape', 'g']) {
        assert.deepEqual(resolveShortcut(state, press(k), 1100), { action: null, state: idle });
    }
});

test('editable targets are ignored and clear a pending g', () => {
    assert.deepEqual(resolveShortcut(idle, press('/', { editable: true }), 0), { action: null, state: idle });
    assert.deepEqual(resolveShortcut(idle, press('Escape', { editable: true }), 0), { action: null, state: idle });
    assert.deepEqual(resolveShortcut({ pendingG: 1000 }, press('f', { editable: true }), 1100), { action: null, state: idle });
    assert.deepEqual(resolveShortcut(idle, press('g', { editable: true }), 0), { action: null, state: idle });
});

test('ctrl, meta and alt combinations are ignored', () => {
    for (const mod of ['ctrl', 'meta', 'alt']) {
        assert.deepEqual(resolveShortcut(idle, press('/', { [mod]: true }), 0), { action: null, state: idle });
        assert.deepEqual(resolveShortcut(idle, press('g', { [mod]: true }), 0), { action: null, state: idle });
        assert.deepEqual(resolveShortcut({ pendingG: 1000 }, press('f', { [mod]: true }), 1100), { action: null, state: idle });
    }
});

test('resolveShortcut does not mutate the input state', () => {
    const state = Object.freeze({ pendingG: 1000 });
    resolveShortcut(state, press('f'), 1100);
    assert.equal(state.pendingG, 1000);
});

const viewport = { width: 400, height: 800 };
const tipSize = { width: 200, height: 60 };

test('tip is centred under the anchor', () => {
    const anchor = { left: 190, top: 100, width: 20, height: 20 };
    assert.deepEqual(tipPosition(anchor, tipSize, viewport), { left: 100, top: 126 });
});

test('tip is kept inside the viewport horizontally', () => {
    assert.equal(tipPosition({ left: 0, top: 100, width: 20, height: 20 }, tipSize, viewport).left, 8);
    assert.equal(tipPosition({ left: 380, top: 100, width: 20, height: 20 }, tipSize, viewport).left, 192);
});

test('tip flips above the anchor when there is no room below', () => {
    const anchor = { left: 190, top: 760, width: 20, height: 20 };
    assert.equal(tipPosition(anchor, tipSize, viewport).top, 694);
});
