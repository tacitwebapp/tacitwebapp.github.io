import { TacitInputTypeLabels, buildTacitPrompt } from './tacit-prompt.js';
import { addSubject, slugify } from './tacit-subject.js';
import { parseText, buildDrafts, existingRecords } from './tacit-import.js';
import { buildRecordTemplate, buildEditTemplate, buildDeletionTemplate, recordKey, cleanAuthorName, latestAuthorNames } from './tacit-events.js';
import { createLocalSigner, createExtensionSigner, pickSource, retireKey, generateSecretKeyHex, parseSecretKey, encodeNsec, encodeNpub } from './tacit-identity.js';
import { decideIncoming, connectRoom, connectDirectory, announcementFor, validAnnouncements, groupDiscover, mergeSubjectCache } from './tacit-sync.js';
import { filterFeed } from './tacit-feed.js';
import { RELATIONS, isInsight, shortIdOf, buildInsightTemplate, buildInsightEdit, shareBlocker, relationsOf, findOwnInsight, cascadeTargets } from './tacit-insight.js';
import { buildBackup, parseBackup, restoreBackup } from './tacit-backup.js';
import { avatarFor, nextTheme, addToast, dismissToast, expireToasts, resolveShortcut, tipPosition } from './tacit-ui.js';
import * as store from './tacit-store.js';

const rooms = {};
let detailOpener = null;
let shortcutOpener = null;
let keyState = { pendingG: null };
let directory;
const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; } };
const parseContent = event => { try { return JSON.parse(event.content); } catch (_) { return null; } };
const shortKey = pubkey => `${encodeNpub(pubkey).slice(0, 12)}…${pubkey.slice(0, 6)}`;

export function registerTacitApp(Alpine) {
    Alpine.data('tacitApp', () => ({
        mainTabs: [{ id: 'feed', label: 'Feed', icon: 'list' }, { id: 'extract', label: 'Extract', icon: 'sparkles' }, { id: 'import', label: 'Import & Review', icon: 'inbox' }, { id: 'subjects', label: 'Subjects', icon: 'folder' }, { id: 'identity', label: 'Identity', icon: 'key' }],
        activeTab: 'feed', inputTypeLabels: TacitInputTypeLabels, selectedInputType: 'txt', selectedSlug: '', specialty: '',
        settings: { relays: [], subjects: [] }, newSubject: '', subjectError: '',
        pubkey: '', previousKeys: [], signer: null, extensionAvailable: false, switchAck: false, secretRevealed: false, exportAck: false, secretHex: '', secretNsec: '',
        importKeyText: '', importAck: false, identityMessage: '', backupSummary: '', theme: localStorage.getItem('tacit.theme') || '', toasts: [],
        pasteText: '', importSummary: null, drafts: [], incoming: [], trust: [], hiddenKeys: [], tombstones: [], library: [], syncLogs: [], authorNames: {}, directoryPeers: {}, subjectCache: {}, ready: false,
        feedFilters: { subject: '', author: '', visibility: '', search: '' }, detailItem: null, linkForm: null, relations: RELATIONS,
        authorOptions: [{ value: '', label: 'All' }, { value: 'mine', label: 'Mine' }, { value: 'trusted', label: 'Trusted' }, { value: 'others', label: 'Others' }],
        get subjectOptions() { return [...this.settings.subjects, ...this.discover.filter(row => !this.hasSubject(row.slug))]; },
        get selectedSubject() { return this.subjectOptions.find(subject => subject.slug === this.selectedSlug); },
        get dynamicPrompt() { return buildTacitPrompt({ inputType: this.selectedInputType, subjectCategory: this.selectedSubject?.label || '', specialty: this.specialty }); },
        get discover() { return groupDiscover(this.directoryPeers, this.subjectCache); },
        get extensionActive() { return this.signer?.source === 'extension'; },
        get signerLabel() { return this.extensionActive ? 'extension' : 'local key'; },
        get npub() { return this.pubkey ? encodeNpub(this.pubkey) : ''; },
        get feedItems() { return filterFeed(this.library, this.feedFilters, { selfKeys: this.selfKeys, trustedKeys: new Set(this.trust.filter(entry => entry.status === 'trusted').map(entry => entry.pubkey)) }); },
        get records() { return this.library.filter(item => !isInsight(item.content)); },
        get feedSubjects() { return [...new Map(this.records.map(item => [item.subjectSlug, item.content.subject])).entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]))); },
        get selfKeys() { return new Set([this.pubkey, ...this.previousKeys]); },
        async initApp() {
            this.settings = { relays: [], subjects: [], ...readJson('tacit.settings', {}) };
            this.previousKeys = readJson('tacit.previousKeys', []);
            this.subjectCache = mergeSubjectCache(readJson('tacit.subjectCache', {}), [], Date.now());
            this.extensionAvailable = !!window.nostr;
            try { await this.activateSigner(pickSource(window.nostr, this.settings.signerPreference)); } catch (error) {
                this.identityMessage = `Extension unavailable, using local key: ${error.message}`;
                await this.activateSigner('local');
            }
            this.selectedSlug = this.settings.subjects[0]?.slug || '';
            await this.reload();
            try { directory = connectDirectory(this); } catch (error) { this.logSync(`Could not join directory: ${error.message}`); }
            this.settings.subjects.filter(subject => subject.subscribed).forEach(subject => this.joinSubject(subject.slug));
            window.addEventListener('keydown', event => this.onKey(event));
            this.initHelpTips();
            setInterval(() => { const live = expireToasts(this.toasts, Date.now()); if (live.length !== this.toasts.length) this.toasts = live; }, 500);
            this.ready = true;
        },
        localSecret() {
            let secret = localStorage.getItem('tacit.secretKey');
            if (!secret) { secret = generateSecretKeyHex(); localStorage.setItem('tacit.secretKey', secret); }
            return secret;
        },
        async activateSigner(source) {
            const stored = localStorage.getItem('tacit.secretKey');
            const oldPubkey = this.pubkey || localStorage.getItem('tacit.activePubkey') || (stored ? await createLocalSigner(stored).getPublicKey() : '');
            const signer = source === 'extension' ? createExtensionSigner(window.nostr) : createLocalSigner(this.localSecret());
            const pubkey = await signer.getPublicKey();
            if (!/^[0-9a-f]{64}$/.test(pubkey)) throw new Error('The extension returned no public key.');
            this.previousKeys = retireKey(this.previousKeys, oldPubkey, pubkey); localStorage.setItem('tacit.previousKeys', JSON.stringify(this.previousKeys));
            localStorage.setItem('tacit.activePubkey', pubkey);
            this.signer = signer; this.pubkey = pubkey;
        },
        async switchSigner(source) {
            try {
                if (!this.switchAck) throw new Error('Confirm that you understand before switching.');
                if (source === 'extension' && !window.nostr) throw new Error('No browser extension found.');
                await this.activateSigner(source);
                this.settings.signerPreference = source; this.saveSettings();
                this.switchAck = false; this.hideSecret();
                this.identityMessage = `Switched to ${this.signerLabel}.`;
            } catch (error) { this.identityMessage = error.message; }
        },
        async reload() {
            const pending = await store.getAll('pending');
            this.drafts = pending.filter(item => item.kind === 'draft').sort((a, b) => a.createdAt - b.createdAt);
            const groups = {};
            pending.filter(item => item.kind === 'incoming').forEach(item => { const content = parseContent(item.event); if (content) (groups[item.pubkey] ??= []).push({ ...item, content }); });
            this.incoming = Object.entries(groups).map(([pubkey, records]) => ({ pubkey, records }));
            this.trust = await store.getAll('trust');
            this.hiddenKeys = (await store.getAll('hidden')).map(item => item.key);
            this.tombstones = await store.getAll('tombstones');
            this.library = (await store.getAll('library')).sort((a, b) => b.event.created_at - a.event.created_at).map(item => ({ ...item, content: parseContent(item.event) })).filter(item => item.content);
            this.authorNames = latestAuthorNames([...this.library, ...pending.filter(item => item.kind === 'incoming')].map(item => item.event));
        },
        saveSettings() { localStorage.setItem('tacit.settings', JSON.stringify(this.settings)); },
        logSync(message) { this.syncLogs.unshift(`[${new Date().toLocaleTimeString()}] ${message}`); if (this.syncLogs.length > 50) this.syncLogs.pop(); },
        formatDate(seconds) { return new Date(seconds * 1000).toLocaleString(); },
        shortKey,
        sharedName(pubkey) { return this.authorNames[pubkey] || this.trust.find(entry => entry.pubkey === pubkey)?.authorName || ''; },
        authorLabel(pubkey) { return pubkey === this.pubkey ? 'you' : this.previousKeys.includes(pubkey) ? 'by previous key' : this.trust.find(entry => entry.pubkey === pubkey)?.nickname || this.sharedName(pubkey) || shortKey(pubkey); },
        setAuthorName(input) {
            this.settings.authorName = cleanAuthorName(input.value) || undefined; this.saveSettings();
            input.value = this.settings.authorName || '';
            this.toast(this.settings.authorName ? 'Name saved' : 'Name cleared');
        },
        get themeIcon() { return { light: 'sun', dark: 'moon' }[this.theme] || 'monitor'; },
        get themeLabel() { return { light: 'Light', dark: 'Dark' }[this.theme] || 'System'; },
        cycleTheme() {
            this.theme = nextTheme(this.theme) || '';
            try { if (this.theme) localStorage.setItem('tacit.theme', this.theme); else localStorage.removeItem('tacit.theme'); } catch (_) {}
            if (this.theme) document.documentElement.dataset.theme = this.theme; else delete document.documentElement.dataset.theme;
        },
        toast(text, failure = false) { this.toasts = addToast(this.toasts, { text, failure }, Date.now()); },
        dismissToast(id) { this.toasts = dismissToast(this.toasts, id); },
        avatarOf(pubkey) { return avatarFor(pubkey, this.authorLabel(pubkey)); },
        avatarStyle(pubkey) { return `--hue: ${this.avatarOf(pubkey).hue}`; },
        focusNewSubject() { document.getElementById(this.activeTab === 'extract' ? 'new-subject' : 'new-subject-tab')?.focus(); },
        initHelpTips() {
            const tip = document.getElementById('help-tip');
            const anchorOf = event => event.target.closest?.('[data-tip]');
            const hide = () => { tip.hidden = true; };
            const show = el => {
                tip.textContent = el.dataset.tip; tip.hidden = false;
                const pos = tipPosition(el.getBoundingClientRect(), { width: tip.offsetWidth, height: tip.offsetHeight }, { width: window.innerWidth, height: window.innerHeight });
                tip.style.left = `${pos.left}px`; tip.style.top = `${pos.top}px`;
                el.setAttribute('aria-describedby', 'help-tip');
            };
            for (const type of ['mouseover', 'focusin']) document.addEventListener(type, event => { const el = anchorOf(event); if (el) show(el); });
            for (const type of ['mouseout', 'focusout']) document.addEventListener(type, event => { if (anchorOf(event)) hide(); });
            document.addEventListener('click', event => { const el = anchorOf(event); if (el) show(el); else hide(); });
            document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
            window.addEventListener('scroll', hide, true);
        },
        openShortcuts(el) { shortcutOpener = el; document.getElementById('shortcut-list').showModal(); },
        shortcutsClosed() { shortcutOpener?.focus(); shortcutOpener = null; },
        onKey(event) {
            const target = event.target;
            const editable = !!target?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
            const result = resolveShortcut(keyState, { key: event.key, ctrl: event.ctrlKey, meta: event.metaKey, alt: event.altKey, editable }, Date.now());
            keyState = result.state;
            if (!result.action || result.action === 'close' || document.querySelector('dialog[open]')) return;
            event.preventDefault();
            if (result.action === 'help') this.openShortcuts(document.getElementById('shortcuts-button'));
            else if (result.action === 'search') { this.activeTab = 'feed'; this.$nextTick(() => document.getElementById('feed-search').focus()); }
            else if (result.action.startsWith('go:')) this.activeTab = result.action.slice(3);
        },
        async copy(text, label) {
            try { await navigator.clipboard.writeText(text); } catch (_) {
                const area = document.createElement('textarea'); area.value = text; document.body.appendChild(area); area.select();
                const copied = document.execCommand('copy'); area.remove();
                if (!copied) { this.toast('Copy failed', true); return; }
            }
            this.toast(`${label} copied`);
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
            const subject = this.settings.subjects.find(item => item.slug === slug);
            if (subject?.needsPassword && !subject.password) { this.logSync(`${slug} is private: enter its password first.`); return; }
            const password = subject?.password;
            try { rooms[slug] = connectRoom(this, slug, password); this.logSync(`Joined ${slug}${password ? ' (private)' : ''}.`); } catch (error) { this.logSync(`Could not join ${slug}: ${error.message}`); }
            this.announce();
        },
        setPassword(subject, password) {
            subject.password = password.trim() || undefined; if (subject.password) delete subject.needsPassword; this.saveSettings();
            this.leaveSubject(subject.slug);
            if (subject.subscribed) this.joinSubject(subject.slug);
        },
        leaveSubject(slug) { rooms[slug]?.room.leave(); delete rooms[slug]; this.logSync(`Left ${slug}.`); this.announce(); },
        announce(peerId) { directory?.action.send(announcementFor(this.settings.subjects, this.library, this.subjectCache), peerId ? { target: peerId } : undefined); },
        refreshSubjects() {
            if (!directory) { this.toast('Not connected to the directory', true); return; }
            directory.request.send(true); this.toast('Asked peers for their subjects');
        },
        refreshData(subject) {
            const room = rooms[subject.slug];
            if (!room) { this.toast(`Not connected to ${subject.label}`, true); return; }
            room.pull.send(true); this.logSync(`Asked peers for ${subject.slug} records.`); this.toast(`Asked peers for ${subject.label} records`);
        },
        receiveAnnouncement(entries, peerId) {
            const valid = validAnnouncements(entries);
            this.directoryPeers = { ...this.directoryPeers, [peerId]: valid };
            const merged = mergeSubjectCache(this.subjectCache, valid, Date.now());
            const learned = Object.keys(merged).some(slug => !(slug in this.subjectCache));
            this.subjectCache = merged;
            try { localStorage.setItem('tacit.subjectCache', JSON.stringify(merged)); } catch (_) { /* storage full or blocked: cache stays in memory */ }
            if (learned) this.announce();
        },
        dropAnnouncements(peerId) { const { [peerId]: _, ...rest } = this.directoryPeers; this.directoryPeers = rest; },
        hasSubject(slug) { return this.settings.subjects.some(subject => subject.slug === slug); },
        subscribeDiscovered(row) {
            this.settings.subjects = addSubject(this.settings.subjects, row.label).subjects;
            this.toggleSubscribe(this.settings.subjects.find(subject => subject.slug === row.slug));
        },

        async importFile(event) {
            const file = event.target.files[0]; if (!file) return;
            await this.runImport(await file.text(), file.name); event.target.value = '';
        },
        async importPasted() { await this.runImport(this.pasteText); this.pasteText = ''; },
        async runImport(text, fileName) {
            const subject = this.selectedSubject; if (!subject) return;
            try {
                if (!this.hasSubject(subject.slug)) { this.settings.subjects = addSubject(this.settings.subjects, subject.label).subjects; this.saveSettings(); }
                const existing = existingRecords([...this.drafts.map(draft => draft.content), ...this.library.filter(item => item.event.pubkey === this.pubkey).map(item => item.content)]);
                const result = buildDrafts(parseText(text, fileName), subject, existing);
                for (const draft of result.drafts) await store.put('pending', { id: crypto.randomUUID(), kind: 'draft', content: draft.content, warnings: draft.warnings, createdAt: Date.now() });
                this.importSummary = { created: result.drafts.length, rejected: result.rejected, skipped: result.skipped, error: '' };
                await this.reload();
            } catch (error) { this.importSummary = { created: 0, rejected: [], skipped: [], error: `Could not import: ${error.message}` }; }
        },
        async discardDraft(id) { await store.remove('pending', id); await this.reload(); },
        async editDraft(draft) {
            const text = prompt('Information chunk', draft.content.information_chunks);
            if (text?.trim()) { draft.content.information_chunks = text.trim(); await store.put('pending', JSON.parse(JSON.stringify(draft))); await this.reload(); this.toast('Draft edited'); }
        },
        async signDraft(draft) {
            const event = await this.signer.signEvent(buildRecordTemplate(draft.content, undefined, undefined, this.settings.authorName));
            return { key: recordKey(event), event, subjectSlug: addSubject([], draft.content.subject).subject.slug, receivedAt: Date.now() };
        },
        async storeDraft(draft) {
            await store.put('library', { ...await this.signDraft(draft), visibility: 'local' });
            await store.remove('pending', draft.id); await this.reload(); this.activeTab = 'feed'; this.toast('Draft stored');
        },
        async shareDraft(draft) {
            const record = await this.signDraft(draft);
            await store.put('library', { ...record, visibility: 'shared' });
            await store.remove('pending', draft.id); await this.reload();
            this.publish(record);
        },
        clearFilters() { this.feedFilters = { subject: '', author: '', visibility: '', search: '' }; },
        async openDetail(item, el) {
            detailOpener = el; this.detailItem = item;
            await this.$nextTick();
            const dialog = document.getElementById('record-detail');
            if (this.detailItem && !dialog.open) dialog.showModal();
        },
        closeDetail() {
            const dialog = document.getElementById('record-detail');
            if (dialog?.open) dialog.close(); else this.detailClosed();
        },
        detailClosed() {
            const opener = detailOpener;
            detailOpener = null; this.detailItem = null; this.linkForm = null;
            if (opener?.isConnected) opener.focus();
        },
        syncDetail() {
            if (!this.detailItem) return;
            const current = this.library.find(entry => entry.key === this.detailItem.key);
            if (!current) this.closeDetail();
            else if (current.event.id !== this.detailItem.event.id || current.visibility !== this.detailItem.visibility) this.detailItem = current;
        },
        shortIdOf,
        get detailRelations() { return this.detailItem ? relationsOf(this.library, this.detailItem.key) : []; },
        get linkCandidates() {
            const needle = this.linkForm.search.trim().toLowerCase();
            return this.records.filter(item => item.subjectSlug === this.detailItem.subjectSlug && item.key !== this.detailItem.key
                && (!needle || shortIdOf(item.key).includes(needle) || String(item.content.information_chunks ?? '').toLowerCase().includes(needle))).slice(0, 20);
        },
        get linkOther() { return this.library.find(item => item.key === this.linkForm.otherKey); },
        openLink() { this.linkForm = { insight: null, relation: 'conflicts', search: '', otherKey: '', direction: 'forward', rationale: '' }; },
        editLink(insight) {
            const { relation, from, to, rationale } = insight.content;
            this.linkForm = { insight, relation, search: '', otherKey: from === this.detailItem.key ? to : from, direction: from === this.detailItem.key ? 'forward' : 'reverse', rationale };
        },
        pickLinkOther(item) {
            const own = findOwnInsight(this.library, this.pubkey, this.detailItem.key, item.key);
            if (own) { this.editLink(own); this.toast('Already linked: editing your insight'); } else this.linkForm.otherKey = item.key;
        },
        directionText(entry) { return !RELATIONS[entry.insight.content.relation].directed ? '' : entry.insight.content.from === this.detailItem.key ? 'this record to the other' : 'the other to this record'; },
        async saveLink(choice) {
            const form = this.linkForm, record = this.detailItem;
            const [from, to] = form.direction === 'forward' ? [record.key, form.otherKey] : [form.otherKey, record.key];
            const fields = { relation: form.relation, from, to, rationale: form.rationale.trim() };
            if (!form.insight && choice === 'shared') { const blocked = shareBlocker(fields, this.library); if (blocked) { this.toast(blocked, true); return; } }
            const event = await this.signer.signEvent(form.insight
                ? buildInsightEdit(form.insight.event, fields, undefined, this.settings.authorName)
                : buildInsightTemplate({ ...fields, subject: record.content.subject }, undefined, this.settings.authorName));
            const { content, ...base } = form.insight ?? { key: recordKey(event), visibility: choice, subjectSlug: record.subjectSlug };
            const saved = { ...base, event, receivedAt: Date.now() };
            await store.put('library', saved); await this.reload();
            this.linkForm = null;
            if (saved.visibility === 'shared') this.publish(saved);
            this.toast(form.insight ? 'Insight edited' : 'Insight stored');
        },
        async shareRecord(item) {
            const blocked = isInsight(item.content) && shareBlocker(item.content, this.library);
            if (blocked) { this.toast(blocked, true); return; }
            const { content, ...record } = item;
            await store.put('library', { ...record, visibility: 'shared' }); await this.reload();
            this.publish(item);
        },
        async editRecord(item) {
            const text = prompt('Information chunk', item.content.information_chunks);
            if (!text?.trim() || text.trim() === item.content.information_chunks) return;
            const event = await this.signer.signEvent(buildEditTemplate(item.event, { ...item.content, information_chunks: text.trim() }, undefined, this.settings.authorName));
            const { content, ...record } = item;
            const edited = { ...record, event, receivedAt: Date.now() };
            await store.put('library', edited); await this.reload();
            if (edited.visibility === 'shared') this.publish(edited);
            this.toast('Record edited');
        },
        async deleteRecord(item) {
            if (!isInsight(item.content)) {
                const { insights, drafts } = cascadeTargets(this.library, await store.getAll('pending'), this.pubkey, item.key);
                if (insights.length && !confirm(`Delete this record? This also deletes ${insights.length} of your insights.`)) return false;
                for (const draft of drafts) await store.remove('pending', draft.id);
                for (const insight of insights) await this.deleteRecord(insight);
            }
            if (item.visibility === 'shared') {
                const event = await this.signer.signEvent(buildDeletionTemplate(item.event));
                await store.put('tombstones', { key: item.key, created_at: event.created_at, event });
                await store.remove('library', item.key); await this.reload();
                this.publish({ subjectSlug: item.subjectSlug, event });
            } else { await store.remove('library', item.key); await this.reload(); }
            this.toast(`${isInsight(item.content) ? 'Insight' : 'Record'} deleted`);
            return true;
        },
        publish(record) {
            const subject = this.settings.subjects.find(item => item.slug === record.subjectSlug);
            if (subject?.needsPassword && !subject.password) { this.logSync(`Not shared: ${record.subjectSlug} is private, enter its password first.`); this.toast(`Not shared: ${record.subjectSlug} is private. Enter its password first.`, true); return; }
            if (subject && !subject.subscribed) { subject.subscribed = true; this.saveSettings(); }
            this.joinSubject(record.subjectSlug);
            rooms[record.subjectSlug]?.action.send([record.event]);
            this.logSync(`Shared record to ${record.subjectSlug}.`);
            this.toast('Shared');
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
                const pendingCount = this.incoming.find(group => group.pubkey === event.pubkey)?.records.length ?? 0;
                const decision = decideIncoming(event, {
                    held, pendingIncoming, pendingCount, hiddenKeys: new Set(this.hiddenKeys), tombstones: Object.fromEntries(this.tombstones.map(item => [item.key, item.created_at])),
                    trustedPubkeys: new Set([...this.selfKeys, ...this.trust.filter(entry => entry.status === 'trusted').map(entry => entry.pubkey)]),
                    blockedPubkeys: new Set(this.trust.filter(entry => entry.status === 'blocked').map(entry => entry.pubkey)),
                });
                if (decision.reason === 'tampered') { console.warn(`Rejected tampered record from peer ${peerId.slice(0, 6)}`); this.logSync(`Rejected tampered record from peer ${peerId.slice(0, 6)}`); }
                if (decision.reason === 'queue-full') this.logSync(`Review queue full for ${shortKey(event.pubkey)}`);
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
            this.publish(record); this.toast('Accepted');
        },
        async discardIncoming(item) { await store.remove('pending', item.id); await this.reload(); },
        async acceptGroup(group) { for (const item of group.records) await this.acceptIncoming(item); },
        async discardGroup(group) { for (const item of group.records) await store.remove('pending', item.id); await this.reload(); },
        async setNickname(entry, nickname) {
            const name = nickname.trim();
            await store.put('trust', { ...entry, nickname: name && name !== this.sharedName(entry.pubkey) ? name : undefined }); await this.reload();
        },
        async setStatus(entry, status) { if (status === 'blocked') await this.blockAuthor(entry.pubkey); else await this.trustAuthor(entry.pubkey); },
        async removeTrust(pubkey) { await store.remove('trust', pubkey); await this.reload(); },
        async trustAuthor(pubkey) {
            await store.put('trust', { ...this.trust.find(entry => entry.pubkey === pubkey), pubkey, status: 'trusted', authorName: this.sharedName(pubkey) || undefined });
            const group = this.incoming.find(entry => entry.pubkey === pubkey);
            await this.reload();
            for (const item of group?.records || []) await this.acceptIncoming(item);
            this.toast('Author trusted');
        },
        async blockAuthor(pubkey) {
            await store.put('trust', { ...this.trust.find(entry => entry.pubkey === pubkey), pubkey, status: 'blocked', authorName: this.sharedName(pubkey) || undefined });
            for (const item of this.library.filter(entry => entry.event.pubkey === pubkey)) await store.remove('library', item.key);
            for (const item of (await store.getAll('pending')).filter(entry => entry.pubkey === pubkey)) await store.remove('pending', item.id);
            await this.reload();
            this.toast('Author blocked');
        },
        async hideRecord(item) {
            await store.put('hidden', { key: item.key, hiddenAt: Date.now() }); await store.remove('library', item.key); await this.reload();
            this.toast(`${isInsight(item.content) ? 'Insight' : 'Record'} hidden`);
        },

        exportBackup() {
            const backup = buildBackup({ library: this.library, tombstones: this.tombstones, trust: this.trust, subjects: this.settings.subjects });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
            link.download = `tacit-backup-${backup.exportedAt.slice(0, 10)}.json`;
            link.click(); URL.revokeObjectURL(link.href);
            this.backupSummary = `Exported ${backup.records.length} records.`;
            this.toast('Backup exported');
        },
        async importBackup(event) {
            const file = event.target.files[0]; if (!file) return;
            try {
                const plan = restoreBackup(parseBackup(await file.text()), { library: this.library, tombstones: this.tombstones, trust: this.trust, hiddenKeys: this.hiddenKeys, subjects: this.settings.subjects, pending: this.incoming.flatMap(group => group.records) });
                for (const key of plan.removeLibrary) { await store.remove('library', key); await store.remove('pending', key); }
                for (const name of ['library', 'tombstones', 'trust']) for (const value of plan.puts[name]) await store.put(name, value);
                const joined = plan.subjects.filter(subject => subject.subscribed && !this.hasSubject(subject.slug));
                this.settings.subjects = plan.subjects; this.saveSettings();
                joined.forEach(subject => this.joinSubject(subject.slug));
                await this.reload();
                const { imported, skipped, rejected } = plan.summary;
                this.backupSummary = `${imported} imported, ${skipped} skipped, ${rejected} rejected.`;
            } catch (error) { this.backupSummary = `Could not import: ${error.message}`; }
            event.target.value = '';
        },
        revealSecret() { if (this.extensionActive) return; this.secretHex = localStorage.getItem('tacit.secretKey'); this.secretNsec = encodeNsec(this.secretHex); this.secretRevealed = true; },
        hideSecret() { this.secretRevealed = false; this.secretHex = this.secretNsec = ''; this.exportAck = false; },
        async importIdentity() {
            try {
                if (this.extensionActive) throw new Error('Key import is disabled while the extension is active.');
                if (!this.importAck) throw new Error('Confirm that you exported your current key first.');
                const secret = parseSecretKey(this.importKeyText);
                const signer = createLocalSigner(secret);
                const newPubkey = await signer.getPublicKey();
                this.previousKeys = retireKey(this.previousKeys, this.pubkey, newPubkey); localStorage.setItem('tacit.previousKeys', JSON.stringify(this.previousKeys));
                localStorage.setItem('tacit.secretKey', secret); localStorage.setItem('tacit.activePubkey', newPubkey);
                this.signer = signer; this.pubkey = newPubkey; this.importKeyText = ''; this.importAck = false; this.hideSecret();
                this.identityMessage = 'Identity imported.';
            } catch (error) { this.identityMessage = error.message; }
        },
    }));
}
