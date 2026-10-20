import { joinRoom } from './vendor/trystero-nostr.js';
import { isValidRecord, recordKey, RECORD_KIND } from './tacit-events.js';

export const APP_ID = 'com.tacit-sync.v1';
export const roomId = slug => `subject:${slug}`;

export function decideIncoming(event, { held, pendingIncoming = {}, trustedPubkeys, blockedPubkeys = new Set(), hiddenKeys = new Set() }) {
    if (!isValidRecord(event)) return { action: 'drop', reason: 'tampered' };
    if (blockedPubkeys.has(event.pubkey)) return { action: 'drop', reason: 'blocked' };
    if (event.kind !== RECORD_KIND) return { action: 'drop', reason: 'kind' };
    const key = recordKey(event);
    if (hiddenKeys.has(key)) return { action: 'drop', reason: 'hidden' };
    const current = held[key] ?? pendingIncoming[key];
    if (current && current.created_at >= event.created_at) return { action: 'drop', reason: 'duplicate-or-older' };
    return { action: trustedPubkeys.has(event.pubkey) ? 'accept' : 'review' };
}

export function connectRoom(app, slug) {
    const config = { appId: APP_ID };
    if (app.settings.relays.length) config.relayConfig = { urls: app.settings.relays };
    const room = joinRoom(config, roomId(slug));
    const action = room.makeAction('syncTacit');
    action.onMessage = (events, { peerId }) => app.receiveFromPeer(events, slug, peerId);
    room.onPeerJoin = peerId => {
        app.logSync(`Peer ${peerId.slice(0, 6)} joined ${slug}.`);
        app.sendShared(slug, peerId);
    };
    room.onPeerLeave = peerId => app.logSync(`Peer ${peerId.slice(0, 6)} left ${slug}.`);
    return { room, action };
}
