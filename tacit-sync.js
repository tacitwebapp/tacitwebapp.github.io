import { joinRoom } from './vendor/trystero-nostr.js';
import { slugify } from './tacit-subject.js';
import { isValidSignature, recordKey, deletionKey, RECORD_KIND, DELETION_KIND } from './tacit-events.js';

export const APP_ID = 'com.tacit-sync.v1';
export const roomId = slug => `subject:${slug}`;
export const DIRECTORY_ROOM = 'directory';
export const PENDING_CAP = 50;

const isJsonObject = text => { try { const value = JSON.parse(text); return value !== null && typeof value === 'object' && !Array.isArray(value); } catch (_) { return false; } };

export function decideIncoming(event, { held, pendingIncoming = {}, pendingCount = 0, trustedPubkeys, blockedPubkeys = new Set(), hiddenKeys = new Set(), tombstones = {} }) {
    if (!isValidSignature(event)) return { action: 'drop', reason: 'tampered' };
    if (blockedPubkeys.has(event.pubkey)) return { action: 'drop', reason: 'blocked' };
    if (event.kind === DELETION_KIND) {
        const target = deletionKey(event);
        if (!target) return { action: 'drop', reason: 'bad-deletion' };
        if (target.pubkey !== event.pubkey) return { action: 'drop', reason: 'foreign-deletion' };
        if (tombstones[target.key] >= event.created_at) return { action: 'drop', reason: 'duplicate-or-older' };
        return { action: 'delete', key: target.key, removeHeld: (held[target.key] ?? pendingIncoming[target.key])?.created_at <= event.created_at };
    }
    if (event.kind !== RECORD_KIND) return { action: 'drop', reason: 'kind' };
    if (!isJsonObject(event.content)) return { action: 'drop', reason: 'bad-content' };
    const key = recordKey(event);
    if (hiddenKeys.has(key)) return { action: 'drop', reason: 'hidden' };
    if (tombstones[key] >= event.created_at) return { action: 'drop', reason: 'tombstoned' };
    const current = held[key] ?? pendingIncoming[key];
    if (current && current.created_at >= event.created_at) return { action: 'drop', reason: 'duplicate-or-older' };
    if (trustedPubkeys.has(event.pubkey)) return { action: 'accept' };
    if (!pendingIncoming[key] && pendingCount >= PENDING_CAP) return { action: 'drop', reason: 'queue-full' };
    return { action: 'review' };
}

export const announcementFor = (subjects, library) => subjects.filter(subject => subject.subscribed && !subject.password && !subject.needsPassword).map(subject => ({
    label: subject.label, slug: subject.slug,
    sharedCount: library.filter(item => item.visibility === 'shared' && item.subjectSlug === subject.slug).length,
}));

export const validAnnouncements = entries => (Array.isArray(entries) ? entries : [])
    .filter(entry => typeof entry?.label === 'string' && entry.label.length <= 80 && entry.slug === slugify(entry.label))
    .slice(0, 100)
    .map(({ label, slug, sharedCount }) => ({ label, slug, sharedCount: Number.isInteger(sharedCount) && sharedCount >= 0 ? sharedCount : 0 }));

export function groupDiscover(byPeer) {
    const groups = new Map();
    for (const entries of Object.values(byPeer)) for (const entry of entries) {
        const group = groups.get(entry.slug) ?? { slug: entry.slug, labels: new Map(), peers: 0, sharedCount: 0 };
        groups.set(entry.slug, group);
        group.labels.set(entry.label, (group.labels.get(entry.label) ?? 0) + 1);
        group.peers++; group.sharedCount = Math.max(group.sharedCount, entry.sharedCount);
    }
    return [...groups.values()]
        .map(({ labels, ...group }) => ({ ...group, label: [...labels].reduce((best, current) => current[1] > best[1] ? current : best)[0] }))
        .sort((a, b) => b.peers - a.peers);
}

export function roomConfig(relays, password) {
    const config = { appId: APP_ID };
    if (relays.length) config.relayConfig = { urls: relays };
    if (password) config.password = password;
    return config;
}

export function connectRoom(app, slug, password) {
    const room = joinRoom(roomConfig(app.settings.relays, password), roomId(slug));
    const action = room.makeAction('syncTacit');
    action.onMessage = (events, { peerId }) => app.receiveFromPeer(events, slug, peerId);
    room.onPeerJoin = peerId => {
        app.logSync(`Peer ${peerId.slice(0, 6)} joined ${slug}.`);
        app.sendShared(slug, peerId);
    };
    room.onPeerLeave = peerId => app.logSync(`Peer ${peerId.slice(0, 6)} left ${slug}.`);
    return { room, action };
}

export function connectDirectory(app) {
    const room = joinRoom(roomConfig(app.settings.relays), DIRECTORY_ROOM);
    const action = room.makeAction('announce');
    action.onMessage = (entries, { peerId }) => app.receiveAnnouncement(entries, peerId);
    room.onPeerJoin = peerId => app.announce(peerId);
    room.onPeerLeave = peerId => app.dropAnnouncements(peerId);
    return { room, action };
}
