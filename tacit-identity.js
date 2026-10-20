import { finalizeEvent, getPublicKey, generateSecretKey, nip19, hexToBytes, bytesToHex } from './vendor/nostr-tools.js';

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
