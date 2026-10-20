import { TacitInputTypeLabels, buildTacitPrompt } from './tacit-prompt.js';
import { addSubject } from './tacit-subject.js';
import { parseText, buildDrafts } from './tacit-import.js';
import { buildRecordTemplate, recordKey } from './tacit-events.js';
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
        pasteText: '', importSummary: null, drafts: [], library: [], syncLogs: [], ready: false,
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
            this.drafts = (await store.getAll('pending')).filter(item => item.kind === 'draft').sort((a, b) => a.createdAt - b.createdAt);
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
            try { rooms[slug] = connectRoom(this, slug); this.logSync(`Joined ${slug}.`); } catch (error) { this.logSync(`Could not join ${slug}: ${error.message}`); }
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
        publish(record) {
            const subject = this.settings.subjects.find(item => item.slug === record.subjectSlug);
            if (subject && !subject.subscribed) { subject.subscribed = true; this.saveSettings(); }
            this.joinSubject(record.subjectSlug);
            rooms[record.subjectSlug]?.action.send([record.event]);
            this.logSync(`Shared record to ${record.subjectSlug}.`);
        },
        sendShared(slug, peerId) {
            const events = this.library.filter(item => item.visibility === 'shared' && item.subjectSlug === slug).map(item => item.event);
            if (events.length) rooms[slug]?.action.send(events, { target: peerId });
        },
        async receiveFromPeer(events, slug, peerId) {
            if (!Array.isArray(events)) return;
            for (const event of events) {
                const held = Object.fromEntries(this.library.map(item => [item.key, item.event]));
                const decision = decideIncoming(event, { held, trustedPubkeys: this.selfKeys });
                if (decision.reason === 'tampered') { console.warn(`Rejected tampered record from peer ${peerId.slice(0, 6)}`); this.logSync(`Rejected tampered record from peer ${peerId.slice(0, 6)}`); }
                if (decision.action !== 'accept') continue;
                await store.put('library', { key: recordKey(event), event, visibility: 'shared', subjectSlug: slug, receivedFrom: peerId, receivedAt: Date.now() });
                await this.reload();
            }
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
