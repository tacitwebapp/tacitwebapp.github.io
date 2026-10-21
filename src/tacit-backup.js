import { slugify } from './tacit-subject.js';
import { decideIncoming } from './tacit-sync.js';
import { recordKey, RECORD_KIND, DELETION_KIND } from './tacit-events.js';

const FORMAT = 'tacit-backup';
const VERSION = 1;
const INVALID = ['tampered', 'bad-deletion', 'foreign-deletion', 'kind', 'bad-content'];

export const buildBackup = ({ library, tombstones, trust, subjects }, now = new Date()) => ({
    format: FORMAT, version: VERSION, exportedAt: now.toISOString(),
    records: library.map(({ event, visibility }) => ({ event, visibility })),
    tombstones: tombstones.map(({ key, created_at, event }) => ({ key, created_at, event })),
    trust: trust.map(({ pubkey, status, nickname }) => ({ pubkey, status, ...(nickname && { nickname }) })),
    subjects: subjects.map(({ label, slug, subscribed, password, needsPassword }) => ({ label, slug, subscribed: !!subscribed, private: !!(password || needsPassword) })),
});

export const DEFAULT_BACKUP_REMINDER = 'weekly';
export const BACKUP_REMINDER_DAYS = { none: 0, daily: 1, weekly: 7, monthly: 30, yearly: 365 };

export function backupDue({ backupReminder = DEFAULT_BACKUP_REMINDER, lastBackupAt = 0, backupRemindedAt = 0 }, hasData, now) {
    const days = BACKUP_REMINDER_DAYS[backupReminder];
    return !!days && hasData && now - Math.max(lastBackupAt, backupRemindedAt) >= days * 86400000;
}

export function parseBackup(text) {
    let backup;
    try { backup = JSON.parse(text); } catch (_) { throw new Error('This file is not a Tacit backup.'); }
    if (backup?.format !== FORMAT || ['records', 'tombstones', 'trust', 'subjects'].some(name => !Array.isArray(backup[name]))) throw new Error('This file is not a Tacit backup.');
    if (backup.version !== VERSION) throw new Error(`Unsupported backup version ${backup.version}.`);
    return backup;
}

export function restoreBackup(backup, { library, tombstones, trust, hiddenKeys, subjects, pending = [] }, now = Date.now()) {
    const summary = { imported: 0, skipped: 0, rejected: 0 };
    const count = outcome => { summary[outcome]++; };
    const held = Object.fromEntries(library.map(item => [item.key, item.event]));
    const known = Object.fromEntries(tombstones.map(item => [item.key, item.created_at]));
    const trustByKey = Object.fromEntries(trust.map(entry => [entry.pubkey, entry]));
    const puts = { library: new Map(), tombstones: [], trust: [] };
    const removeLibrary = new Set();
    const pendingIncoming = Object.fromEntries(pending.map(item => [item.id, item.event]));

    for (const entry of backup.trust) {
        if (!/^[0-9a-f]{64}$/.test(entry?.pubkey) || !['trusted', 'blocked'].includes(entry.status)) { count('rejected'); continue; }
        if (trustByKey[entry.pubkey]) { count('skipped'); continue; }
        const { pubkey, status, nickname } = entry;
        trustByKey[pubkey] = { pubkey, status, ...(typeof nickname === 'string' && nickname && { nickname }) };
        puts.trust.push(trustByKey[pubkey]); count('imported');
        if (status !== 'blocked') continue;
        for (const [key, event] of Object.entries(held)) if (event.pubkey === pubkey) { delete held[key]; puts.library.delete(key); removeLibrary.add(key); }
        for (const [key, event] of Object.entries(pendingIncoming)) if (event.pubkey === pubkey) { delete pendingIncoming[key]; removeLibrary.add(key); }
    }

    // Backup records come from the user's own library, so an unblocked author is never sent to review.
    const context = () => ({
        held, pendingIncoming, hiddenKeys: new Set(hiddenKeys), tombstones: known,
        trustedPubkeys: { has: () => true },
        blockedPubkeys: new Set(Object.values(trustByKey).filter(entry => entry.status === 'blocked').map(entry => entry.pubkey)),
    });
    const classify = decision => INVALID.includes(decision.reason) ? 'rejected' : 'skipped';

    for (const item of backup.tombstones) {
        if (item?.event?.kind !== DELETION_KIND) { count('rejected'); continue; }
        const decision = decideIncoming(item.event, context());
        if (decision.action !== 'delete') { count(classify(decision)); continue; }
        known[decision.key] = item.event.created_at;
        puts.tombstones.push({ key: decision.key, created_at: item.event.created_at, event: item.event });
        if (decision.removeHeld) { delete held[decision.key]; delete pendingIncoming[decision.key]; puts.library.delete(decision.key); removeLibrary.add(decision.key); }
        count('imported');
    }

    for (const item of backup.records) {
        const subjectSlug = slugify(item?.event?.tags?.find?.(tag => tag[0] === 'subject')?.[1] ?? '');
        if (item?.event?.kind !== RECORD_KIND || !['local', 'shared'].includes(item.visibility) || !subjectSlug) { count('rejected'); continue; }
        const decision = decideIncoming(item.event, context());
        if (decision.action !== 'accept') { count(classify(decision)); continue; }
        const key = recordKey(item.event);
        held[key] = item.event;
        puts.library.set(key, { key, event: item.event, visibility: item.visibility, subjectSlug, receivedAt: now });
        count('imported');
    }

    const merged = [...subjects];
    for (const entry of backup.subjects) {
        if (typeof entry?.label !== 'string' || !entry.slug || entry.slug !== slugify(entry.label)) { count('rejected'); continue; }
        if (merged.some(subject => subject.slug === entry.slug)) { count('skipped'); continue; }
        merged.push(entry.private === true ? { label: entry.label, slug: entry.slug, subscribed: false, needsPassword: true } : { label: entry.label, slug: entry.slug, subscribed: entry.subscribed === true }); count('imported');
    }

    return { puts: { ...puts, library: [...puts.library.values()] }, removeLibrary: [...removeLibrary], subjects: merged, summary };
}
