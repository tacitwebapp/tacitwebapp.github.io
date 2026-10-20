import { finalizeEvent, verifyEvent, getPublicKey, generateSecretKey, nip19, hexToBytes, bytesToHex } from './vendor/nostr-tools.js';

export function parseSecretKey(input) {
    const value = String(input).trim();
    if (/^[0-9a-f]{64}$/i.test(value)) return value.toLowerCase();
    if (value.startsWith('nsec1')) {
        try {
            const decoded = nip19.decode(value);
            if (decoded.type === 'nsec') return bytesToHex(decoded.data);
        } catch (_) { /* fall through */ }
    }
    throw new Error('Enter a 64-character hex key or an nsec1... key.');
}

export const encodeNsec = hex => nip19.nsecEncode(hexToBytes(hex));
export const encodeNpub = pubkey => nip19.npubEncode(pubkey);

export const generateSecretKeyHex = () => bytesToHex(generateSecretKey());

export function createLocalSigner(secretHex) {
    const secret = hexToBytes(secretHex);
    const pubkey = getPublicKey(secret);
    return { source: 'local', getPublicKey: async () => pubkey, signEvent: async template => finalizeEvent(template, secret) };
}

export function createExtensionSigner(nostr) {
    return {
        source: 'extension',
        getPublicKey: () => nostr.getPublicKey(),
        async signEvent(template) {
            const event = await nostr.signEvent({ ...template });
            const same = event.kind === template.kind && event.content === template.content && event.created_at === template.created_at && JSON.stringify(event.tags) === JSON.stringify(template.tags);
            if (!same || !verifyEvent(JSON.parse(JSON.stringify(event)))) throw new Error('The extension returned an invalid signature.');
            return event;
        },
    };
}

export const pickSource = (nostr, preference) => nostr && preference !== 'local' ? 'extension' : 'local';

export const retireKey = (previousKeys, oldPubkey, newPubkey) => [...new Set([...previousKeys, oldPubkey].filter(key => key && key !== newPubkey))];
