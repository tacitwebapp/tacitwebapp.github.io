import { TacitInputTypeLabels, buildTacitPrompt } from './tacit-prompt.js';
import { addSubject, slugify } from './tacit-subject.js';
import { parseText, buildDrafts, existingRecords } from './tacit-import.js';
import { buildRecordTemplate, buildEditTemplate, buildDeletionTemplate, recordKey, cleanAuthorName, latestAuthorNames } from './tacit-events.js';
import { createLocalSigner, createExtensionSigner, pickSource, retireKey, generateSecretKeyHex, parseSecretKey, encodeNsec, encodeNpub } from './tacit-identity.js';
import { decideIncoming, connectRoom, connectDirectory, announcementFor, validAnnouncements, groupDiscover, mergeSubjectCache } from './tacit-sync.js';
import { filterFeed } from './tacit-feed.js';
import { RELATIONS, isInsight, shortIdOf, buildInsightTemplate, buildInsightEdit, shareBlocker, relationsOf, findOwnInsight, groupInsights, cascadeTargets, incomingInsightCard, feedBadges, isWellFormedInsight, DEFAULT_PROMPT_LIMIT, validPromptLimit, planInsightPrompts, insightPromptCards, importInsightRows, applyToDraft, updateInsightDraft } from './tacit-insight.js';
import { rankBySimilarity, candidatesFor, LINK_TOP_N } from './tacit-similarity.js';
import { buildBackup, parseBackup, restoreBackup, backupDue, DEFAULT_BACKUP_REMINDER } from './tacit-backup.js';
import { avatarFor, nextTheme, addToast, dismissToast, expireToasts, resolveShortcut, tipPosition } from './tacit-ui.js';
import { buildMap, buildStyle, linkedOnlyByDefault, RELATION_STYLE } from './tacit-map.js';
import cytoscape from '../vendor/cytoscape.esm.js';
import * as store from './tacit-store.js';

const rooms = {};
let receiving = Promise.resolve();
let rankCache = null;
let cy = null;
let mapNodeIds = '';
let mapUnwatch = null;
let edgeOpener = null;
const MAP_TOKENS = { ink: 'ink', muted: 'muted', surface: 'surface', line: 'line', accent: 'accent', accentInk: 'accent-ink', accentSoft: 'accent-soft', danger: 'danger', success: 'success', warn: 'warn' };
const tokenColor = token => `rgb(${getComputedStyle(document.documentElement).getPropertyValue(`--c-${token}`).trim().split(/\s+/).join(', ')})`;
const mapColors = () => Object.fromEntries(Object.entries(MAP_TOKENS).map(([name, token]) => [name, tokenColor(token)]));

function destroyMap() {
    mapUnwatch?.(); mapUnwatch = null;
    cy?.destroy(); cy = null; mapNodeIds = '';
}

function drawMap(app, elements) {
    const container = document.getElementById('map-canvas');
    if (!container || app.activeTab !== 'map') return;
    const nodeIds = elements.filter(el => el.group === 'nodes').map(el => el.data.id).join('|');
    if (!cy) {
        cy = cytoscape({ container, elements, style: buildStyle(mapColors()), layout: { name: 'preset' }, autoungrabify: true, boxSelectionEnabled: false, minZoom: 0.05, maxZoom: 3 });
        cy.on('tap', 'node.record', event => app.openMapRecord(event.target.id(), container));
        cy.on('tap', 'edge', event => app.openEdgeSheet(event.target.data('keys'), container));
        const restyle = () => cy?.style(buildStyle(mapColors()));
        const media = matchMedia('(prefers-color-scheme: dark)'), observer = new MutationObserver(restyle);
        media.addEventListener('change', restyle);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        mapUnwatch = () => { media.removeEventListener('change', restyle); observer.disconnect(); };
        cy.fit(undefined, 30);
    } else {
        cy.batch(() => { cy.elements().remove(); cy.add(elements); });
        if (nodeIds !== mapNodeIds) cy.fit(undefined, 30);
    }
    mapNodeIds = nodeIds;
}
const shortIdOfItem = item => shortIdOf(item.key);
const blankLink = () => ({ open: false, insight: null, relation: 'conflicts', search: '', otherKey: '', direction: 'forward', rationale: '' });
let detailOpener = null;
let shortcutOpener = null;
let keyState = { pendingG: null };
let directory;
const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; } };
const parseContent = event => { try { return JSON.parse(event.content); } catch (_) { return null; } };
const shortKey = pubkey => `${encodeNpub(pubkey).slice(0, 12)}…${pubkey.slice(0, 6)}`;

export function registerTacitApp(Alpine) {
    Alpine.data('tacitApp', () => ({
        mainTabs: [{ id: 'feed', label: 'Feed', icon: 'list' }, { id: 'extract', label: 'Extract', icon: 'sparkles' }, { id: 'import', label: 'Import & Review', icon: 'inbox' }, { id: 'insights', label: 'Insights', icon: 'link' }, { id: 'map', label: 'Tacit Map', icon: 'map' }, { id: 'subjects', label: 'Subjects', icon: 'folder' }, { id: 'identity', label: 'Identity', icon: 'key' }],
        activeTab: 'feed', inputTypeLabels: TacitInputTypeLabels, selectedInputType: 'txt', selectedSlug: '', specialty: '',
        settings: { relays: [], subjects: [] }, newSubject: '', subjectError: '',
        pubkey: '', previousKeys: [], signer: null, extensionAvailable: false, switchAck: false, secretRevealed: false, exportAck: false, secretHex: '', secretNsec: '',
        importKeyText: '', importAck: false, identityMessage: '', backupSummary: '', theme: localStorage.getItem('tacit.theme') || '', toasts: [],
        pasteText: '', importSummary: null, drafts: [], incoming: [], trust: [], hiddenKeys: [], tombstones: [], library: [], syncLogs: [], authorNames: {}, directoryPeers: {}, subjectCache: {}, ready: false,
        feedFilters: { subject: '', author: '', visibility: '', search: '' }, detailItem: null, linkForm: blankLink(), relations: RELATIONS,
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
        insightFilters: { relation: '', author: '' }, expandedInsights: {}, tabLink: { insight: null, a: '', b: '', relation: 'conflicts', rationale: '' },
        tabCombo: { a: { open: false, search: '', active: 0 }, b: { open: false, search: '', active: 0 } },
        get subjectRecords() { return this.records.filter(item => item.subjectSlug === this.selectedSlug); },
        insightsView: 'prompt', insightsViews: [{ id: 'prompt', label: 'Generate Prompt' }, { id: 'link', label: 'Link Tacits' }],
        selectedKeys: {}, insightRecordFilters: { author: '', visibility: '', search: '' }, copiedPrompts: {}, promptLimitError: '',
        insightPaste: '', insightImport: null, insightDrafts: [],
        get insightRecords() { return filterFeed(this.library, { subject: this.selectedSlug, ...this.insightRecordFilters }, { selfKeys: this.selfKeys, trustedKeys: new Set(this.trust.filter(entry => entry.status === 'trusted').map(entry => entry.pubkey)) }); },
        get selectedRecords() { return this.subjectRecords.filter(item => this.selectedKeys[item.key]); },
        get promptLimit() { return validPromptLimit(this.settings.insightPromptLimit) ? this.settings.insightPromptLimit : DEFAULT_PROMPT_LIMIT; },
        get promptCount() { return planInsightPrompts(this.selectedRecords, this.promptLimit).length; },
        get promptCards() { return insightPromptCards(this.selectedRecords, this.promptLimit, { library: this.library, drafts: this.insightDrafts, pubkey: this.pubkey }); },
        get subjectInsightDrafts() { return this.insightDrafts.filter(draft => this.records.find(item => item.key === draft.content.from)?.subjectSlug === this.selectedSlug); },
        selectAllRecords() { this.selectedKeys = Object.fromEntries(this.insightRecords.map(item => [item.key, true])); },
        recordOf(key) { return this.library.find(item => item.key === key && !isInsight(item.content)); },
        setPromptLimit(text) {
            const value = Number(text);
            if (!text.trim() || !validPromptLimit(value)) { this.promptLimitError = 'Use an even number from 4 to 200'; return; }
            this.promptLimitError = ''; this.settings.insightPromptLimit = value; this.saveSettings();
        },
        async copyPrompt(card) { if (await this.copy(card.text, 'Prompt')) this.copiedPrompts[card.text] = true; },
        async runInsightImport(text) {
            try {
                const result = importInsightRows(text, { library: this.library, drafts: this.insightDrafts, pubkey: this.pubkey });
                for (const draft of result.drafts) await store.put('pending', draft);
                this.insightImport = { ...result, error: '' };
                await this.reload();
            } catch (error) { this.insightImport = { drafts: [], disagreements: [], rejected: [], duplicates: 0, error: `Could not import: ${error.message}` }; }
        },
        async importInsightFile(event) {
            const file = event.target.files[0]; if (!file) return;
            await this.runInsightImport(await file.text()); event.target.value = '';
        },
        async importInsightPasted() { await this.runInsightImport(this.insightPaste); this.insightPaste = ''; },
        async acceptDisagreement(entry) {
            if (entry.type === 'draft') {
                const draft = this.insightDrafts.find(item => item.id === entry.item.id);
                if (draft) await store.put('pending', applyToDraft(draft, entry.proposed));
            } else {
                const item = this.library.find(candidate => candidate.key === entry.item.key); if (!item) return;
                const event = await this.signer.signEvent(buildInsightEdit(item.event, entry.proposed, undefined, this.settings.authorName));
                const { content, ...base } = item;
                const saved = { ...base, event, receivedAt: Date.now() };
                await store.put('library', saved);
                if (saved.visibility === 'shared') this.publish(saved);
            }
            this.insightImport.disagreements = this.insightImport.disagreements.filter(candidate => candidate.id !== entry.id);
            await this.reload(); this.toast('Insight updated');
        },
        async editInsightDraft(draft, changes) { await store.put('pending', updateInsightDraft(draft, changes)); await this.reload(); },
        async discardInsightDraft(draft) { await store.remove('pending', draft.id); await this.reload(); },
        async commitInsightDraft(draft, choice) {
            const record = this.recordOf(draft.content.from);
            if (!record) return 'missing';
            if (findOwnInsight(this.library, this.pubkey, draft.content.from, draft.content.to)) return 'linked';
            if (choice === 'shared' && shareBlocker(draft.content, this.library)) return 'blocked';
            const event = await this.signer.signEvent(buildInsightTemplate({ ...draft.content, subject: record.content.subject }, undefined, this.settings.authorName));
            const saved = { key: recordKey(event), event, visibility: choice, subjectSlug: record.subjectSlug, receivedAt: Date.now() };
            await store.put('library', saved); await store.remove('pending', draft.id);
            if (choice === 'shared') this.publish(saved);
            return 'done';
        },
        async saveInsightDraft(draft, choice) {
            const outcome = await this.commitInsightDraft(draft, choice);
            await this.reload();
            if (outcome === 'blocked') this.toast(shareBlocker(draft.content, this.library), true);
            else if (outcome === 'linked') this.toast('You already linked this pair', true);
            else if (outcome === 'missing') this.toast('A record of this draft is not in your library', true);
            else this.toast(choice === 'shared' ? 'Insight shared' : 'Insight stored');
        },
        async saveAllInsightDrafts(choice) {
            const counts = { done: 0, blocked: 0, linked: 0, missing: 0 };
            for (const draft of [...this.subjectInsightDrafts]) { counts[await this.commitInsightDraft(draft, choice)]++; await this.reload(); }
            const skipped = counts.blocked + counts.linked + counts.missing;
            this.toast(`${choice === 'shared' ? 'Shared' : 'Stored'} ${counts.done}${skipped ? `, skipped ${skipped}${counts.blocked ? ` (${counts.blocked} with a local record)` : ''}` : ''}`, !!skipped);
        },
        async discardAllInsightDrafts() { for (const draft of this.subjectInsightDrafts) await store.remove('pending', draft.id); await this.reload(); },
        get subjectInsightCount() { return groupInsights(this.library, { subject: this.selectedSlug }).length; },
        get insightGroups() {
            const trustedKeys = new Set(this.trust.filter(entry => entry.status === 'trusted').map(entry => entry.pubkey));
            return groupInsights(this.library, { subject: this.selectedSlug, ...this.insightFilters }, { selfKeys: this.selfKeys, trustedKeys });
        },
        mapRelations: Object.keys(RELATIONS), mapLinkedOnlyChoice: null, edgeSheet: null, relationStyle: RELATION_STYLE,
        get mapLinkedOnly() { return this.mapLinkedOnlyChoice ?? linkedOnlyByDefault(this.subjectRecords.length); },
        get mapElements() {
            const groups = groupInsights(this.library, { subject: this.selectedSlug });
            return buildMap(this.subjectRecords, groups, { subjectLabel: this.selectedSubject?.label ?? '', relations: this.mapRelations, linkedOnly: this.mapLinkedOnly }).elements;
        },
        mapFullscreen: false, fullscreenSupported: !!document.fullscreenEnabled,
        toggleMapFullscreen() {
            if (document.fullscreenElement) document.exitFullscreen();
            else document.getElementById('map-panel')?.requestFullscreen().catch(() => this.toast('Full screen is not available', true));
        },
        toggleMapRelation(name) { this.mapRelations = this.mapRelations.includes(name) ? this.mapRelations.filter(entry => entry !== name) : [...this.mapRelations, name]; },
        syncMap() {
            const elements = this.activeTab === 'map' && this.subjectRecords.length ? this.mapElements : null;
            if (!elements) destroyMap(); else this.$nextTick(() => drawMap(this, elements));
        },
        mapZoom(factor) { cy?.zoom({ level: cy.zoom() * factor, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }); },
        mapFit() { cy?.fit(undefined, 30); },
        mapKey(event) {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            const action = { '+': () => this.mapZoom(1.25), '=': () => this.mapZoom(1.25), '-': () => this.mapZoom(0.8), '0': () => this.mapFit() }[event.key];
            if (action) { event.preventDefault(); action(); }
        },
        openMapRecord(key, el) { const item = this.library.find(entry => entry.key === key); if (item) this.openDetail(item, el); },
        get edgeItems() { return this.edgeSheet ? this.library.filter(item => this.edgeSheet.includes(item.key)) : []; },
        get edgeCard() { return this.edgeItems.length ? incomingInsightCard(this.edgeItems[0].content, this.library, []) : null; },
        async openEdgeSheet(keys, el) {
            edgeOpener = el; this.edgeSheet = keys;
            await this.$nextTick();
            const dialog = document.getElementById('map-edge-sheet');
            if (this.edgeItems.length && !dialog.open) dialog.showModal();
        },
        closeEdgeSheet() {
            const dialog = document.getElementById('map-edge-sheet');
            if (dialog?.open) dialog.close(); else this.edgeSheetClosed();
        },
        edgeSheetClosed() {
            const opener = edgeOpener;
            edgeOpener = null; this.edgeSheet = null;
            if (opener?.isConnected) opener.focus();
        },
        syncEdgeSheet() { if (this.edgeSheet && !this.edgeItems.length) this.closeEdgeSheet(); },
        editEdgeInsight(insight) { this.closeEdgeSheet(); this.activeTab = 'insights'; this.editTabLink(insight); },
        tabRecord(side) { return this.subjectRecords.find(item => item.key === this.tabLink[side]); },
        comboLabel(side) { const record = this.tabRecord(side); return record ? `${shortIdOf(record.key)} ${record.content.information_chunks ?? ''}` : ''; },
        similarRows(target) {
            if (!target) return [];
            if (!(rankCache?.library === this.library && rankCache.key === target.key)) {
                const pool = this.records.filter(item => item.subjectSlug === target.subjectSlug);
                rankCache = { library: this.library, key: target.key, rows: rankBySimilarity(target, pool, pool) };
            }
            return rankCache.rows;
        },
        comboOptions(side) {
            const other = this.tabLink[side === 'a' ? 'b' : 'a'], target = side === 'b' && this.tabRecord('a');
            const rows = target ? this.similarRows(target).filter(({ item }) => item.key !== other)
                : this.subjectRecords.filter(item => item.key !== other).map(item => ({ item, score: null }));
            const needle = this.tabCombo[side].search.trim();
            return needle ? candidatesFor(rows, needle, rows.length, shortIdOfItem) : rows;
        },
        comboOpen(side) { Object.assign(this.tabCombo[side], { open: true, search: '', active: 0 }); },
        comboClose(side) { this.tabCombo[side].open = false; },
        comboInput(side, value) { Object.assign(this.tabCombo[side], { open: true, search: value, active: 0 }); },
        comboKey(side, event) {
            const combo = this.tabCombo[side];
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                if (!combo.open) { this.comboOpen(side); return; }
                const last = this.comboOptions(side).length - 1;
                combo.active = Math.max(0, Math.min(last, combo.active + (event.key === 'ArrowDown' ? 1 : -1)));
                this.$nextTick(() => document.getElementById(`tab-link-${side}-opt-${combo.active}`)?.scrollIntoView({ block: 'nearest' }));
            } else if (event.key === 'Enter' && combo.open) {
                event.preventDefault();
                const row = this.comboOptions(side)[combo.active];
                if (row) this.comboPick(side, row.item);
            } else if (event.key === 'Escape' && combo.open) { event.preventDefault(); event.stopPropagation(); this.comboClose(side); }
            else if (event.key === 'Tab') this.comboClose(side);
        },
        comboPick(side, item) { this.tabLink[side] = item.key; this.comboClose(side); this.tabLinkPicked(); },
        comboClear(side) { this.tabLink[side] = ''; this.comboClose(side); },
        resetTabLink() { this.tabLink = { insight: null, a: '', b: '', relation: 'conflicts', rationale: '' }; },
        swapTabLink() { [this.tabLink.a, this.tabLink.b] = [this.tabLink.b, this.tabLink.a]; },
        tabLinkPicked() {
            const form = this.tabLink;
            const own = !form.insight && form.a && form.b && findOwnInsight(this.library, this.pubkey, form.a, form.b);
            if (own) { this.editTabLink(own); this.toast('Already linked: editing your insight'); }
        },
        editTabLink(insight) {
            const { relation, from, to, rationale } = insight.content;
            this.insightsView = 'link'; this.tabLink = { insight, a: from, b: to, relation, rationale };
            this.$nextTick(() => document.getElementById('tab-link-form').scrollIntoView({ block: 'nearest' }));
        },
        async saveTabLink(choice) {
            const form = this.tabLink, record = this.library.find(item => item.key === form.a);
            const fields = { relation: form.relation, from: form.a, to: form.b, rationale: form.rationale.trim() };
            if (!form.insight && choice === 'shared') { const blocked = shareBlocker(fields, this.library); if (blocked) { this.toast(blocked, true); return; } }
            const event = await this.signer.signEvent(form.insight
                ? buildInsightEdit(form.insight.event, fields, undefined, this.settings.authorName)
                : buildInsightTemplate({ ...fields, subject: record.content.subject }, undefined, this.settings.authorName));
            const { content, ...base } = form.insight ?? { key: recordKey(event), visibility: choice, subjectSlug: record.subjectSlug };
            const saved = { ...base, event, receivedAt: Date.now() };
            await store.put('library', saved); await this.reload();
            this.resetTabLink();
            if (saved.visibility === 'shared') this.publish(saved);
            this.toast(form.insight ? 'Insight edited' : 'Insight stored');
        },
        async initApp() {
            this.settings = { relays: [], subjects: [], backupReminder: DEFAULT_BACKUP_REMINDER, ...readJson('tacit.settings', {}) };
            this.previousKeys = readJson('tacit.previousKeys', []);
            this.subjectCache = mergeSubjectCache(readJson('tacit.subjectCache', {}), [], Date.now());
            this.extensionAvailable = !!window.nostr;
            try { await this.activateSigner(pickSource(window.nostr, this.settings.signerPreference)); } catch (error) {
                this.identityMessage = `Extension unavailable, using local key: ${error.message}`;
                await this.activateSigner('local');
            }
            this.selectedSlug = this.settings.subjects[0]?.slug || '';
            this.$watch('selectedSlug', () => { this.mapLinkedOnlyChoice = null; this.selectedKeys = {}; this.insightImport = null; });
            this.$watch('activeTab', tab => { if (tab !== 'insights') this.insightImport = null; });
            await this.reload();
            try { directory = connectDirectory(this); } catch (error) { this.logSync(`Could not join directory: ${error.message}`); }
            this.settings.subjects.filter(subject => subject.subscribed).forEach(subject => this.joinSubject(subject.slug));
            window.addEventListener('keydown', event => this.onKey(event));
            document.addEventListener('fullscreenchange', () => {
                this.mapFullscreen = document.fullscreenElement?.id === 'map-panel';
                this.$nextTick(() => { cy?.resize(); cy?.fit(undefined, 30); });
            });
            this.initHelpTips();
            setInterval(() => { const live = expireToasts(this.toasts, Date.now()); if (live.length !== this.toasts.length) this.toasts = live; }, 500);
            this.ready = true;
            if (backupDue(this.settings, this.library.length > 0, Date.now())) document.getElementById('backup-reminder').showModal();
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
            this.insightDrafts = pending.filter(item => item.kind === 'insight-draft').sort((a, b) => a.createdAt - b.createdAt);
            const groups = {};
            pending.filter(item => item.kind === 'incoming').forEach(item => { const content = parseContent(item.event); if (content && (!isInsight(content) || isWellFormedInsight(content, item.id))) (groups[item.pubkey] ??= []).push({ ...item, content }); });
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
                if (!copied) { this.toast('Copy failed', true); return false; }
            }
            this.toast(`${label} copied`);
            return true;
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
            detailOpener = null; this.detailItem = null; this.closeLink();
            if (opener?.isConnected) opener.focus();
        },
        syncDetail() {
            if (!this.detailItem) return;
            const current = this.library.find(entry => entry.key === this.detailItem.key);
            if (!current) this.closeDetail();
            else if (current.event.id !== this.detailItem.event.id || current.visibility !== this.detailItem.visibility) this.detailItem = current;
        },
        shortIdOf,
        isInsight,
        insightCard(item) { return incomingInsightCard(item.content, this.library, this.incoming.flatMap(group => group.records)); },
        get detailRelations() { return this.detailItem ? relationsOf(this.library, this.detailItem.key) : []; },
        get feedBadgeMap() { return feedBadges(this.library); },
        badgesOf(item) { return this.feedBadgeMap.get(item.key) ?? { superseded: false, conflicts: 0 }; },
        async openRelations(item, el) {
            await this.openDetail(item, el);
            document.querySelector('#record-detail .relations')?.scrollIntoView({ block: 'start' });
        },
        linkTopN: LINK_TOP_N,
        get linkCandidates() { return candidatesFor(this.similarRows(this.detailItem), this.linkForm.search, LINK_TOP_N, shortIdOfItem); },
        get linkOther() { return this.library.find(item => item.key === this.linkForm.otherKey); },
        openLink() { this.linkForm = { ...blankLink(), open: true }; },
        closeLink() { this.linkForm = blankLink(); },
        editLink(insight) {
            const { relation, from, to, rationale } = insight.content;
            this.linkForm = { open: true, insight, relation, search: '', otherKey: from === this.detailItem.key ? to : from, direction: from === this.detailItem.key ? 'forward' : 'reverse', rationale };
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
            this.closeLink();
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
        async removeItem(item) {
            if (item.visibility === 'shared') {
                const event = await this.signer.signEvent(buildDeletionTemplate(item.event));
                await store.put('tombstones', { key: item.key, created_at: event.created_at, event });
                await store.remove('library', item.key);
                this.publish({ subjectSlug: item.subjectSlug, event });
            } else await store.remove('library', item.key);
        },
        async deleteRecord(item) {
            const targets = isInsight(item.content) ? { insights: [], drafts: [] } : cascadeTargets(this.library, await store.getAll('pending'), this.pubkey, item.key);
            if (targets.insights.length && !confirm(`Delete this record? This also deletes ${targets.insights.length} of your insights.`)) return false;
            try {
                await this.removeItem(item);
                for (const draft of targets.drafts) await store.remove('pending', draft.id);
                for (const insight of targets.insights) await this.removeItem(insight);
            } finally { await this.reload(); }
            this.toast(targets.insights.length ? `Record deleted with ${targets.insights.length} of your insights` : `${isInsight(item.content) ? 'Insight' : 'Record'} deleted`);
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
        receiveFromPeer(events, slug, peerId) {
            return receiving = receiving.then(() => this.applyFromPeer(events, slug, peerId)).catch(error => console.warn('Could not apply peer events', error));
        },
        async applyFromPeer(events, slug, peerId) {
            if (!Array.isArray(events)) return;
            const held = Object.fromEntries(this.library.map(item => [item.key, item.event]));
            const pendingIncoming = Object.fromEntries(this.incoming.flatMap(group => group.records).map(item => [item.id, item.event]));
            const pendingCounts = Object.fromEntries(this.incoming.map(group => [group.pubkey, group.records.length]));
            const tombstones = Object.fromEntries(this.tombstones.map(item => [item.key, item.created_at]));
            const hiddenKeys = new Set(this.hiddenKeys);
            const trustedPubkeys = new Set([...this.selfKeys, ...this.trust.filter(entry => entry.status === 'trusted').map(entry => entry.pubkey)]);
            const blockedPubkeys = new Set(this.trust.filter(entry => entry.status === 'blocked').map(entry => entry.pubkey));
            let changed = false;
            for (const event of events) {
                const decision = decideIncoming(event, { held, pendingIncoming, pendingCount: pendingCounts[event.pubkey] ?? 0, hiddenKeys, tombstones, trustedPubkeys, blockedPubkeys });
                if (decision.reason === 'tampered') { console.warn(`Rejected tampered record from peer ${peerId.slice(0, 6)}`); this.logSync(`Rejected tampered record from peer ${peerId.slice(0, 6)}`); }
                if (decision.reason === 'queue-full') this.logSync(`Review queue full for ${shortKey(event.pubkey)}`);
                if (decision.action === 'delete') {
                    await store.put('tombstones', { key: decision.key, created_at: event.created_at, event });
                    tombstones[decision.key] = event.created_at;
                    if (decision.removeHeld) {
                        await store.remove('library', decision.key); await store.remove('pending', decision.key);
                        delete held[decision.key];
                        if (pendingIncoming[decision.key]) { delete pendingIncoming[decision.key]; pendingCounts[event.pubkey]--; }
                    }
                } else if (decision.action === 'accept') {
                    await store.put('library', { key: recordKey(event), event, visibility: 'shared', subjectSlug: slug, receivedFrom: peerId, receivedAt: Date.now() });
                    held[recordKey(event)] = event;
                } else if (decision.action === 'review') {
                    const key = recordKey(event);
                    await store.put('pending', { id: key, kind: 'incoming', event, subjectSlug: slug, pubkey: event.pubkey, receivedFrom: peerId, receivedAt: Date.now() });
                    if (!pendingIncoming[key]) pendingCounts[event.pubkey] = (pendingCounts[event.pubkey] ?? 0) + 1;
                    pendingIncoming[key] = event;
                } else continue;
                changed = true;
            }
            if (changed) await this.reload();
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
            this.settings.lastBackupAt = Date.now(); this.saveSettings();
            this.backupSummary = `Exported ${backup.records.length} records.`;
            this.toast('Backup exported');
        },
        backupReminderClosed() { this.settings.backupRemindedAt = Date.now(); this.saveSettings(); },
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
