import { joinRoom } from './vendor/trystero-nostr.js';
import { isValidSignature, recordKey, deletionKey, RECORD_KIND, DELETION_KIND } from './tacit-events.js';

export const APP_ID = 'com.tacit-sync.v1';
export const roomId = slug => `subject:${slug}`;

export function decideIncoming(event, { held, pendingIncoming = {}, trustedPubkeys, blockedPubkeys = new Set(), hiddenKeys = new Set(), tombstones = {} }) {
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
    const key = recordKey(event);
    if (hiddenKeys.has(key)) return { action: 'drop', reason: 'hidden' };
    if (tombstones[key] >= event.created_at) return { action: 'drop', reason: 'tombstoned' };
    const current = held[key] ?? pendingIncoming[key];
    if (current && current.created_at >= event.created_at) return { action: 'drop', reason: 'duplicate-or-older' };
    return { action: trustedPubkeys.has(event.pubkey) ? 'accept' : 'review' };
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
