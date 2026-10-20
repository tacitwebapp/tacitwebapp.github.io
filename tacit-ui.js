const HEX_KEY = /^[0-9a-f]{64}$/i;

export function avatarFor(pubkey, label) {
    const text = typeof label === 'string' ? label.trim() : '';
    let initial = '?';
    if (text.startsWith('npub1')) {
        const rest = [...text.slice(5)].slice(0, 2);
        if (rest.length) initial = rest[0].toUpperCase() + rest.slice(1).join('');
    } else if (text) {
        initial = [...text][0].toUpperCase();
    }
    if (typeof pubkey !== 'string' || !HEX_KEY.test(pubkey)) return { hue: 0, initial, neutral: true };
    let h = 0x811c9dc5;
    for (const ch of pubkey.toLowerCase()) {
        h ^= ch.charCodeAt(0);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return { hue: h % 360, initial, neutral: false };
}

export function resolveTheme(stored, systemDark) {
    if (stored === 'light' || stored === 'dark') return stored;
    return systemDark ? 'dark' : 'light';
}

export function nextTheme(stored) {
    if (stored === 'light') return 'dark';
    if (stored === 'dark') return null;
    return 'light';
}

const MAX_TOASTS = 3;
const TOAST_MS = 4000;
const TOAST_FAILURE_MS = 8000;

export function addToast(queue, { text, failure = false }, now) {
    const expiresAt = now + (failure ? TOAST_FAILURE_MS : TOAST_MS);
    if (queue.some(toast => toast.text === text)) {
        return queue.map(toast => (toast.text === text ? { ...toast, failure, expiresAt } : toast));
    }
    const id = queue.reduce((max, toast) => Math.max(max, toast.id), 0) + 1;
    return [...queue, { id, text, failure, expiresAt }].slice(-MAX_TOASTS);
}

export function dismissToast(queue, id) {
    return queue.filter(toast => toast.id !== id);
}

export function expireToasts(queue, now) {
    return queue.filter(toast => toast.expiresAt > now);
}

const SEQUENCE_MS = 1500;
const GO_TARGETS = { f: 'feed', e: 'extract', r: 'import', s: 'subjects', i: 'identity' };

export function resolveShortcut(state, key, now) {
    if (key.editable || key.ctrl || key.meta || key.alt) return { action: null, state: { pendingG: null } };
    if (state && state.pendingG != null) {
        const target = now - state.pendingG <= SEQUENCE_MS && GO_TARGETS[key.key];
        return { action: target ? `go:${target}` : null, state: { pendingG: null } };
    }
    switch (key.key) {
        case 'g': return { action: null, state: { pendingG: now } };
        case '/': return { action: 'search', state: { pendingG: null } };
        case '?': return { action: 'help', state: { pendingG: null } };
        case 'Escape': return { action: 'close', state: { pendingG: null } };
        default: return { action: null, state: { pendingG: null } };
    }
}
