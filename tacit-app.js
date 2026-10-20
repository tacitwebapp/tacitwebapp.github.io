import { TacitInputTypeLabels, buildTacitPrompt } from './tacit-prompt.js';
import { addSubject, slugify } from './tacit-subject.js';
import { parseText, buildDrafts } from './tacit-import.js';
import { buildRecordTemplate, buildEditTemplate, buildDeletionTemplate, recordKey } from './tacit-events.js';
import { createLocalSigner, generateSecretKeyHex, parseSecretKey, encodeNsec, encodeNpub } from './tacit-identity.js';
import { decideIncoming, connectRoom } from './tacit-sync.js';
import * as store from './tacit-store.js';

const rooms = {};
const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; } };
const shortKey = pubkey => `${encodeNpub(pubkey).slice(0, 12)}…${pubkey.slice(0, 6)}`;

export function registerTacitApp(Alpine) {
    Alpine.data('tacitApp', () => ({
        mainTabs: [{ id: 'feed', label: 'Feed' }, { id: 'extract', label: 'Extract' }, { id: 'import', label: 'Import & Review' }, { id: 'subjects', label: 'Subjects' }, { id: 'identity', label: 'Identity' }],
        activeTab: 'feed', inputTypeLabels: TacitInputTypeLabels, selectedInputType: 'txt', selectedSlug: '',
        settings: { relays: [], subjects: [] }, newSubject: '', subjectError: '',
        pubkey: '', previousKeys: [], signer: null, secretRevealed: false, exportAck: false, secretHex: '', secretNsec: '',
        importKeyText: '', importAck: false, identityMessage: '', copied: '',
        pasteText: '', importSummary: null, drafts: [], incoming: [], trust: [], hiddenKeys: [], tombstones: [], library: [], syncLogs: [], ready: false,
        get selectedSubject() { return this.settings.subjects.find(subject => subject.slug === this.selectedSlug); },
        get dynamicPrompt() { return buildTacitPrompt({ inputType: this.selectedInputType, subjectCategory: this.selectedSubject?.label || '' }); },
        get npub() { return this.pubkey ? encodeNpub(this.pubkey) : ''; },
        get selfKeys() { return new Set([this.pubkey, ...this.previousKeys]); },
        async initApp() {
            this.settings = { relays: [], subjects: [], ...readJson('tacit.settings', {}) };
            this.previousKeys = readJson('tacit.previousKeys', []);
            let secret = localStorage.getItem('tacit.secretKey');
            if (!secret) { secret = generateSecretKeyHex(); localStorage.setItem('tacit.secretKey', secret); }
            this.signer = createLocalSigner(secret);
            this.pubkey = await this.signer.getPublicKey();
            this.selectedSlug = this.settings.subjects[0]?.slug || '';
            await this.reload();
            this.settings.subjects.filter(subject => subject.subscribed).forEach(subject => this.joinSubject(subject.slug));
            this.ready = true;
        },
        async reload() {
            const pending = await store.getAll('pending');
            this.drafts = pending.filter(item => item.kind === 'draft').sort((a, b) => a.createdAt - b.createdAt);
            const groups = {};
            pending.filter(item => item.kind === 'incoming').forEach(item => (groups[item.pubkey] ??= []).push({ ...item, content: JSON.parse(item.event.content) }));
            this.incoming = Object.entries(groups).map(([pubkey, records]) => ({ pubkey, records }));
            this.trust = await store.getAll('trust');
            this.hiddenKeys = (await store.getAll('hidden')).map(item => item.key);
            this.tombstones = await store.getAll('tombstones');
            this.library = (await store.getAll('library')).sort((a, b) => b.event.created_at - a.event.created_at).map(item => ({ ...item, content: JSON.parse(item.event.content) }));
        },
        saveSettings() { localStorage.setItem('tacit.settings', JSON.stringify(this.settings)); },
        logSync(message) { this.syncLogs.unshift(`[${new Date().toLocaleTimeString()}] ${message}`); if (this.syncLogs.length > 50) this.syncLogs.pop(); },
        formatDate(seconds) { return new Date(seconds * 1000).toLocaleString(); },
        authorLabel(pubkey) { return pubkey === this.pubkey ? 'you' : this.previousKeys.includes(pubkey) ? 'by previous key' : shortKey(pubkey); },
        async copy(text, label) {
            try { await navigator.clipboard.writeText(text); } catch (_) {
                const area = document.createElement('textarea'); area.value = text; document.body.appendChild(area); area.select();
                const copied = document.execCommand('copy'); area.remove();
                if (!copied) { this.copied = 'copy failed'; return; }
            }
            this.copied = label; setTimeout(() => { this.copied = ''; }, 1500);
        },

        createSubject() {
            try {
                const { subjects, subject } = addSubject(this.settings.subjects, this.newSubject);
                this.settings.subjects = subjects; this.selectedSlug = subject.slug; this.newSubject = ''; this.subjectError = ''; this.saveSettings();
            } catch (error) { this.subjectError = error.message; }
        },
        toggleSubscribe(subject) {
            subject.subscribed = !subject.subscribed; this.saveSettings();
            if (subject.subscribed) this.joinSubject(subject.slug); else this.leaveSubject(subject.slug);
        },
        joinSubject(slug) {
            if (rooms[slug]) return;
            const password = this.settings.subjects.find(subject => subject.slug === slug)?.password;
            try { rooms[slug] = connectRoom(this, slug, password); this.logSync(`Joined ${slug}${password ? ' (private)' : ''}.`); } catch (error) { this.logSync(`Could not join ${slug}: ${error.message}`); }
        },
        setPassword(subject, password) {
            subject.password = password.trim() || undefined; this.saveSettings();
            this.leaveSubject(subject.slug);
            if (subject.subscribed) this.joinSubject(subject.slug);
        },
        leaveSubject(slug) { rooms[slug]?.room.leave(); delete rooms[slug]; this.logSync(`Left ${slug}.`); },

        async importFile(event) {
            const file = event.target.files[0]; if (!file) return;
            await this.runImport(await file.text(), file.name); event.target.value = '';
        },
        async importPasted() { await this.runImport(this.pasteText); this.pasteText = ''; },
        async runImport(text, fileName) {
            const subject = this.selectedSubject; if (!subject) return;
            try {
                const existing = [...this.drafts.map(draft => draft.content), ...this.library.filter(item => item.event.pubkey === this.pubkey).map(item => item.content)]
                    .map(content => ({ slug: addSubject([], content.subject || '').subject.slug, chunk: String(content.information_chunks).trim() }));
                const result = buildDrafts(parseText(text, fileName), subject, existing);
                for (const draft of result.drafts) await store.put('pending', { id: crypto.randomUUID(), kind: 'draft', content: draft.content, warnings: draft.warnings, createdAt: Date.now() });
                this.importSummary = { created: result.drafts.length, rejected: result.rejected, skipped: result.skipped, error: '' };
                await this.reload();
            } catch (error) { this.importSummary = { created: 0, rejected: [], skipped: [], error: `Could not import: ${error.message}` }; }
        },
        async discardDraft(id) { await store.remove('pending', id); await this.reload(); },
        async editDraft(draft) {
            const text = prompt('Information chunk', draft.content.information_chunks);
            if (text?.trim()) { draft.content.information_chunks = text.trim(); await store.put('pending', JSON.parse(JSON.stringify(draft))); await this.reload(); }
        },
        async signDraft(draft) {
            const event = await this.signer.signEvent(buildRecordTemplate(draft.content));
            return { key: recordKey(event), event, subjectSlug: addSubject([], draft.content.subject).subject.slug, receivedAt: Date.now() };
        },
        async storeDraft(draft) {
            await store.put('library', { ...await this.signDraft(draft), visibility: 'local' });
            await store.remove('pending', draft.id); await this.reload(); this.activeTab = 'feed';
        },
        async shareDraft(draft) {
            const record = await this.signDraft(draft);
            await store.put('library', { ...record, visibility: 'shared' });
            await store.remove('pending', draft.id); await this.reload();
            this.publish(record);
        },
        async shareRecord(item) {
            const { content, ...record } = item;
            await store.put('library', { ...record, visibility: 'shared' }); await this.reload();
            this.publish(item);
        },
        async editRecord(item) {
            const text = prompt('Information chunk', item.content.information_chunks);
            if (!text?.trim() || text.trim() === item.content.information_chunks) return;
            const event = await this.signer.signEvent(buildEditTemplate(item.event, { ...item.content, information_chunks: text.trim() }));
            const { content, ...record } = item;
            const edited = { ...record, event, receivedAt: Date.now() };
            await store.put('library', edited); await this.reload();
            if (edited.visibility === 'shared') this.publish(edited);
        },
        async deleteRecord(item) {
            const event = await this.signer.signEvent(buildDeletionTemplate(item.event));
            await store.put('tombstones', { key: item.key, created_at: event.created_at, event });
            await store.remove('library', item.key); await this.reload();
            if (item.visibility === 'shared') this.publish({ subjectSlug: item.subjectSlug, event });
        },
        publish(record) {
            const subject = this.settings.subjects.find(item => item.slug === record.subjectSlug);
            if (subject && !subject.subscribed) { subject.subscribed = true; this.saveSettings(); }
            this.joinSubject(record.subjectSlug);
            rooms[record.subjectSlug]?.action.send([record.event]);
            this.logSync(`Shared record to ${record.subjectSlug}.`);
        },
        sendShared(slug, peerId) {
            const events = [
                ...this.library.filter(item => item.visibility === 'shared' && item.subjectSlug === slug).map(item => item.event),
                ...this.tombstones.filter(item => slugify(item.event.tags.find(tag => tag[0] === 'subject')?.[1] ?? '') === slug).map(item => item.event),
            ];
            if (events.length) rooms[slug]?.action.send(events, { target: peerId });
        },
        statusOf(pubkey) { return this.trust.find(entry => entry.pubkey === pubkey)?.status; },
        async receiveFromPeer(events, slug, peerId) {
            if (!Array.isArray(events)) return;
            for (const event of events) {
                const held = Object.fromEntries(this.library.map(item => [item.key, item.event]));
                const pendingIncoming = Object.fromEntries(this.incoming.flatMap(group => group.records).map(item => [item.id, item.event]));
                const decision = decideIncoming(event, {
                    held, pendingIncoming, hiddenKeys: new Set(this.hiddenKeys), tombstones: Object.fromEntries(this.tombstones.map(item => [item.key, item.created_at])),
                    trustedPubkeys: new Set([...this.selfKeys, ...this.trust.filter(entry => entry.status === 'trusted').map(entry => entry.pubkey)]),
                    blockedPubkeys: new Set(this.trust.filter(entry => entry.status === 'blocked').map(entry => entry.pubkey)),
                });
                if (decision.reason === 'tampered') { console.warn(`Rejected tampered record from peer ${peerId.slice(0, 6)}`); this.logSync(`Rejected tampered record from peer ${peerId.slice(0, 6)}`); }
                if (decision.action === 'delete') {
                    await store.put('tombstones', { key: decision.key, created_at: event.created_at, event });
                    if (decision.removeHeld) { await store.remove('library', decision.key); await store.remove('pending', decision.key); }
                } else if (decision.action === 'accept') await store.put('library', { key: recordKey(event), event, visibility: 'shared', subjectSlug: slug, receivedFrom: peerId, receivedAt: Date.now() });
                else if (decision.action === 'review') await store.put('pending', { id: recordKey(event), kind: 'incoming', event, subjectSlug: slug, pubkey: event.pubkey, receivedFrom: peerId, receivedAt: Date.now() });
                else continue;
                await this.reload();
            }
        },
        async acceptIncoming(item) {
            const record = { key: item.id, event: item.event, visibility: 'shared', subjectSlug: item.subjectSlug, receivedFrom: item.receivedFrom, receivedAt: item.receivedAt };
            await store.put('library', record); await store.remove('pending', item.id); await this.reload();
            this.publish(record);
        },
        async discardIncoming(item) { await store.remove('pending', item.id); await this.reload(); },
        async trustAuthor(pubkey) {
            await store.put('trust', { pubkey, status: 'trusted' });
            const group = this.incoming.find(entry => entry.pubkey === pubkey);
            await this.reload();
            for (const item of group?.records || []) await this.acceptIncoming(item);
        },
        async blockAuthor(pubkey) {
            await store.put('trust', { pubkey, status: 'blocked' });
            for (const item of this.library.filter(entry => entry.event.pubkey === pubkey)) await store.remove('library', item.key);
            for (const item of (await store.getAll('pending')).filter(entry => entry.pubkey === pubkey)) await store.remove('pending', item.id);
            await this.reload();
        },
        async hideRecord(item) {
            await store.put('hidden', { key: item.key, hiddenAt: Date.now() }); await store.remove('library', item.key); await this.reload();
        },

        revealSecret() { this.secretHex = localStorage.getItem('tacit.secretKey'); this.secretNsec = encodeNsec(this.secretHex); this.secretRevealed = true; },
        hideSecret() { this.secretRevealed = false; this.secretHex = this.secretNsec = ''; this.exportAck = false; },
        async importIdentity() {
            try {
                if (!this.importAck) throw new Error('Confirm that you exported your current key first.');
                const secret = parseSecretKey(this.importKeyText);
                const signer = createLocalSigner(secret);
                const newPubkey = await signer.getPublicKey();
                if (newPubkey !== this.pubkey) {
                    this.previousKeys = [...new Set([...this.previousKeys, this.pubkey])]; localStorage.setItem('tacit.previousKeys', JSON.stringify(this.previousKeys));
                }
                localStorage.setItem('tacit.secretKey', secret);
                this.signer = signer; this.pubkey = newPubkey; this.importKeyText = ''; this.importAck = false; this.hideSecret();
                this.identityMessage = 'Identity imported.';
            } catch (error) { this.identityMessage = error.message; }
        },
    }));
}
