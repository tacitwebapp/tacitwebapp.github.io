import { TacitInputTypeLabels, DEFAULT_TACIT_PROMPT, buildTacitPrompt } from './tacit-prompt.js';
import { addSubject, slugify } from './tacit-subject.js';
import { parseText, buildDrafts, existingRecords } from './tacit-import.js';
import { buildRecordTemplate, buildEditTemplate, buildDeletionTemplate, recordKey, cleanAuthorName, latestAuthorNames } from './tacit-events.js';
import { createLocalSigner, createExtensionSigner, pickSource, retireKey, generateSecretKeyHex, parseSecretKey, parsePublicKey, encodeNsec, encodeNpub } from './tacit-identity.js';
import { decideIncoming, connectRoom, connectDirectory, announcementFor, validAnnouncements, groupDiscover, mergeSubjectCache } from './tacit-sync.js';
import { filterFeed, highlightParts } from './tacit-feed.js';
import { RELATIONS, isInsight, shortIdOf, buildInsightTemplate, buildInsightEdit, shareBlocker, relationsOf, findOwnInsight, groupInsights, cascadeTargets, incomingInsightCard, feedBadges, isWellFormedInsight, DEFAULT_PROMPT_LIMIT, validPromptLimit, planInsightPrompts, insightPromptCards, importInsightRows, applyToDraft, updateInsightDraft } from './tacit-insight.js';
import { isRecord, isComment, COMMENT_BODY_MAX, worksD, buildWorksTemplate, buildCommentTemplate, buildCommentEdit, buildThread, flattenThread, shownCount, foldedComments, commentNotifications, worksCount, cascadeTargets as discussionTargets, fullViewIdOf, resolveFullView } from './tacit-comment.js';
import { rankBySimilarity, candidatesFor, LINK_TOP_N } from './tacit-similarity.js';
import { buildBackup, parseBackup, restoreBackup, backupDue, DEFAULT_BACKUP_REMINDER } from './tacit-backup.js';
import { parseRoute, buildRoute } from './tacit-route.js';
import { avatarFor, HUES, hueOf, addToast, dismissToast, expireToasts, resolveShortcut, tipPosition, needsNamePrompt, nameNudgeActive } from './tacit-ui.js';
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
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-hue'] });
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
let fullViewFocused = '';
let focusCommentOnOpen = false;
let shortcutOpener = null;
let keyState = { pendingG: null };
let directory;
const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; } };
const parseContent = event => { try { return JSON.parse(event.content); } catch (_) { return null; } };
const shortKey = pubkey => `${encodeNpub(pubkey).slice(0, 12)}…${pubkey.slice(0, 6)}`;

export function registerTacitApp(Alpine) {
    Alpine.data('tacitApp', () => ({
        mainTabs: [{ id: 'feed', label: 'Feed', icon: 'list' }, { id: 'extract', label: 'Extract', icon: 'sparkles' }, { id: 'import', label: 'Import & Review', short: 'Import', icon: 'inbox' }, { id: 'insights', label: 'Insights', icon: 'link' }, { id: 'map', label: 'Tacit Map', short: 'Map', icon: 'map' }, { id: 'subjects', label: 'Subjects', icon: 'folder' }, { id: 'identity', label: 'Identity', icon: 'key' }],
        activeTab: 'feed', inputTypeLabels: TacitInputTypeLabels, selectedInputType: 'txt', inputLink: '', selectedSlug: '', specialty: '', customPrompt: null, promptEditing: false, promptDraft: '',
        settings: { relays: [], subjects: [] }, rememberedSubject: null, newSubject: '', subjectError: '',
        pubkey: '', previousKeys: [], signer: null, extensionAvailable: false, switchAck: false, secretRevealed: false, exportAck: false, secretHex: '', secretNsec: '',
        bellOpen: false, nameDraft: '', resolveName: null, importKeyText: '', importAck: false, trustForm: { status: '', key: '', error: '' }, identityMessage: '', backupSummary: '', theme: localStorage.getItem('tacit.theme') || '', hue: hueOf(localStorage.getItem('tacit.hue')) || 'blue', subjectHues: Object.fromEntries(Object.entries(readJson('tacit.subjectHues', {})).filter(([, hue]) => hueOf(hue))), toasts: [],
        pasteText: '', importSummary: null, drafts: [], incoming: [], trust: [], hiddenKeys: [], tombstones: [], library: [], syncLogs: [], authorNames: {}, directoryPeers: {}, subjectCache: {}, ready: false,
        feedFilters: { subject: '', author: '', visibility: '', search: '' }, detailItem: null, sheetOpen: false, fullViewId: '', fullViewPick: '', commentDraft: '', replyTo: '', replyDraft: '', threadWide: false, threadCollapsed: {}, commentMax: COMMENT_BODY_MAX, linkForm: blankLink(), relations: RELATIONS,
        folded: [], foldedOpen: {}, threadSeen: { since: 0, seen: {} },
        authorOptions: [{ value: '', label: 'All' }, { value: 'mine', label: 'Mine' }, { value: 'trusted', label: 'Trusted' }, { value: 'others', label: 'Others' }],
        get subjectOptions() {
            const rows = [...this.settings.subjects, ...this.discover.filter(row => !this.hasSubject(row.slug))];
            const remembered = this.rememberedSubject;
            return remembered?.slug === this.selectedSlug && !rows.some(row => row.slug === remembered.slug) ? [...rows, remembered] : rows;
        },
        get selectedSubject() { return this.subjectOptions.find(subject => subject.slug === this.selectedSlug); },
        get dynamicPrompt() { return buildTacitPrompt({ inputType: this.selectedInputType, subjectCategory: this.selectedSubject?.label || '', specialty: this.specialty, inputLink: this.inputLink, template: this.customPrompt ?? DEFAULT_TACIT_PROMPT }); },
        get discover() { return groupDiscover(this.directoryPeers, this.subjectCache); },
        get extensionActive() { return this.signer?.source === 'extension'; },
        get signerLabel() { return this.extensionActive ? 'extension' : 'local key'; },
        get npub() { return this.pubkey ? encodeNpub(this.pubkey) : ''; },
        get feedItems() { return filterFeed(this.library, this.feedFilters, { selfKeys: this.selfKeys, trustedKeys: new Set(this.trust.filter(entry => entry.status === 'trusted').map(entry => entry.pubkey)) }); },
        get records() { return this.library.filter(item => isRecord(item.content)); },
        get feedSubjects() { return [...new Map([...this.records.map(item => [item.subjectSlug, item.content.subject]), ...this.settings.subjects.map(subject => [subject.slug, subject.label])]).entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]))); },
        get selfKeys() { return new Set([this.pubkey, ...this.previousKeys]); },
        insightFilters: { relation: '', author: '' }, expandedInsights: {}, tabLink: { insight: null, a: '', b: '', relation: 'conflicts', rationale: '' },
        tabCombo: { a: { open: false, search: '', active: 0 }, b: { open: false, search: '', active: 0 } },
        subjectCombo: Object.fromEntries(['feed', 'global'].map(key => [key, { open: false, search: '', active: 0 }])),
        get subjectRecords() { return this.records.filter(item => item.subjectSlug === this.selectedSlug); },
        importView: 'import', importViews: [{ id: 'import', label: 'Import', icon: 'download' }, { id: 'review', label: 'Review', icon: 'eye' }],
        get reviewCount() { return this.drafts.length + this.incoming.reduce((total, group) => total + group.records.length, 0); },
        get nameNudge() { return nameNudgeActive(this.settings, this.pubkey); },
        get commentNotes() { return commentNotifications({ library: this.library, folded: this.folded, selfKeys: this.selfKeys, threadSeen: this.threadSeen }); },
        get notificationCount() { const notes = this.commentNotes; return this.reviewCount + notes.review.count + notes.replies.count + notes.newComments.count + (this.nameNudge ? 1 : 0); },
        openNotification(note) { this.bellOpen = false; this.openFullView(note.record); },
        markSeen(recordKey) {
            this.threadSeen = { ...this.threadSeen, seen: { ...this.threadSeen.seen, [recordKey]: Math.floor(Date.now() / 1000) } };
            try { localStorage.setItem('tacit.threadSeen', JSON.stringify(this.threadSeen)); } catch (_) { /* blocked: seen times last for this session */ }
        },
        openReview() { this.bellOpen = false; this.activeTab = 'import'; this.importView = 'review'; },
        openNameSetting() {
            this.bellOpen = false; this.activeTab = 'identity';
            this.$nextTick(() => document.getElementById('author-name')?.focus());
        },
        dismissNameNudge() { this.settings.nameNudgeDismissedKey = this.pubkey; this.saveSettings(); },
        askName() {
            if (!needsNamePrompt(this.settings, this.pubkey)) return Promise.resolve(true);
            this.nameDraft = this.settings.authorName || '';
            return new Promise(resolve => { this.resolveName = resolve; document.getElementById('name-prompt').showModal(); });
        },
        finishNamePrompt(choice) {
            const resolve = this.resolveName; if (!resolve) return;
            this.resolveName = null;
            if (choice) {
                if (choice === 'save') this.settings.authorName = cleanAuthorName(this.nameDraft) || undefined;
                this.settings.namePromptedKey = this.pubkey; this.saveSettings();
            }
            document.getElementById('name-prompt').close();
            resolve(!!choice);
        },
        insightsView: 'prompt', insightsViews: [{ id: 'prompt', label: 'Generate Prompt', icon: 'sparkles' }, { id: 'link', label: 'Link Tacits', icon: 'link' }],
        selectedKeys: {}, expandedKeys: {}, insightRecordFilters: { author: '', visibility: '', search: '' }, copiedPrompts: {}, promptLimitError: '',
        insightPaste: '', insightImport: null, insightDrafts: [],
        get insightRecords() { return filterFeed(this.library, { subject: this.selectedSlug, ...this.insightRecordFilters }, { selfKeys: this.selfKeys, trustedKeys: new Set(this.trust.filter(entry => entry.status === 'trusted').map(entry => entry.pubkey)) }); },
        get selectedRecords() { return this.subjectRecords.filter(item => this.selectedKeys[item.key]); },
        get promptLimit() { return validPromptLimit(this.settings.insightPromptLimit) ? this.settings.insightPromptLimit : DEFAULT_PROMPT_LIMIT; },
        get promptCount() { return planInsightPrompts(this.selectedRecords, this.promptLimit).length; },
        get promptCards() { return insightPromptCards(this.selectedRecords, this.promptLimit, { library: this.library, drafts: this.insightDrafts, pubkey: this.pubkey }); },
        get subjectInsightDrafts() { return this.insightDrafts.filter(draft => this.records.find(item => item.key === draft.content.from)?.subjectSlug === this.selectedSlug); },
        selectAllRecords() { this.selectedKeys = Object.fromEntries(this.insightRecords.map(item => [item.key, true])); },
        recordOf(key) { return this.library.find(item => item.key === key && isRecord(item.content)); },
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
                if (!await this.askName()) return;
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
            if (!await this.askName()) return;
            const outcome = await this.commitInsightDraft(draft, choice);
            await this.reload();
            if (outcome === 'blocked') this.toast(shareBlocker(draft.content, this.library), true);
            else if (outcome === 'linked') this.toast('You already linked this pair', true);
            else if (outcome === 'missing') this.toast('A record of this draft is not in your library', true);
            else this.toast(choice === 'shared' ? 'Insight shared' : 'Insight stored');
        },
        async saveAllInsightDrafts(choice) {
            if (!await this.askName()) return;
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
        subjectComboSource(key) { return key === 'feed' ? [{ slug: '', label: 'All subjects' }, ...this.feedSubjects.map(([slug, label]) => ({ slug, label }))] : this.subjectOptions; },
        subjectComboLabel(key) { const value = key === 'feed' ? this.feedFilters.subject : this.selectedSlug; return this.subjectComboSource(key).find(subject => subject.slug === value)?.label ?? ''; },
        subjectComboOptions(key) {
            const needle = this.subjectCombo[key].search.trim().toLowerCase();
            const rows = this.subjectComboSource(key);
            return needle ? rows.filter(({ slug, label }) => `${label} ${slug}`.toLowerCase().includes(needle)) : rows;
        },
        subjectComboOpen(key) { Object.assign(this.subjectCombo[key], { open: true, search: '', active: 0 }); },
        subjectComboClose(key) { this.subjectCombo[key].open = false; },
        subjectComboInput(key, value) { Object.assign(this.subjectCombo[key], { open: true, search: value, active: 0 }); },
        subjectComboKey(key, event) {
            const combo = this.subjectCombo[key];
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                if (!combo.open) { this.subjectComboOpen(key); return; }
                const last = this.subjectComboOptions(key).length - 1;
                combo.active = Math.max(0, Math.min(last, combo.active + (event.key === 'ArrowDown' ? 1 : -1)));
                this.$nextTick(() => document.getElementById(`subject-${key}-opt-${combo.active}`)?.scrollIntoView({ block: 'nearest' }));
            } else if (event.key === 'Enter' && combo.open) {
                event.preventDefault();
                const subject = this.subjectComboOptions(key)[combo.active];
                if (subject) this.subjectComboPick(key, subject);
            } else if (event.key === 'Escape' && combo.open) { event.preventDefault(); event.stopPropagation(); this.subjectComboClose(key); }
            else if (event.key === 'Tab') this.subjectComboClose(key);
        },
        subjectComboPick(key, subject) {
            if (key === 'feed') this.feedFilters.subject = subject.slug; else { this.selectedSlug = subject.slug; this.resetTabLink(); }
            this.subjectComboClose(key);
        },
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
            if (!await this.askName()) return;
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
            try { this.customPrompt = localStorage.getItem('tacit.extractPrompt'); } catch (_) { /* blocked: default prompt */ }
            this.subjectCache = mergeSubjectCache(readJson('tacit.subjectCache', {}), [], Date.now());
            this.extensionAvailable = !!window.nostr;
            const wide = matchMedia('(min-width: 900px)');
            this.threadWide = wide.matches;
            wide.addEventListener('change', event => { this.threadWide = event.matches; });
            try { await this.activateSigner(pickSource(window.nostr, this.settings.signerPreference)); } catch (error) {
                this.identityMessage = `Extension unavailable, using local key: ${error.message}`;
                await this.activateSigner('local');
            }
            if (this.settings.authorName && !this.settings.namePromptedKey) { this.settings.namePromptedKey = this.pubkey; this.saveSettings(); }
            const seen = readJson('tacit.threadSeen', null);
            if (Number.isFinite(seen?.since) && seen.seen && typeof seen.seen === 'object') this.threadSeen = seen;
            else {
                this.threadSeen = { since: Math.floor(Date.now() / 1000), seen: {} };
                try { localStorage.setItem('tacit.threadSeen', JSON.stringify(this.threadSeen)); } catch (_) { /* blocked: first-run time lasts for this session */ }
            }
            const saved = readJson('tacit.selectedSubject', null);
            if (saved?.slug) { this.rememberedSubject = saved; this.selectedSlug = saved.slug; }
            else this.selectedSlug = this.settings.subjects[0]?.slug || '';
            this.$watch('selectedSlug', slug => {
                this.mapLinkedOnlyChoice = null; this.selectedKeys = {}; this.insightImport = null;
                if (!slug || !this.selectedSubject) return;
                this.rememberedSubject = { slug, label: this.selectedSubject.label };
                try { localStorage.setItem('tacit.selectedSubject', JSON.stringify(this.rememberedSubject)); } catch (_) { /* blocked: selection not remembered */ }
            });
            this.$watch('activeTab', tab => { if (tab !== 'insights') this.insightImport = null; if (tab !== 'feed') this.setFullView(''); });
            const applyRoute = route => {
                this.setFullView(route.tab === 'tacit' ? route.id : '');
                this.activeTab = route.tab === 'tacit' ? 'feed' : route.tab;
                if (route.tab === 'import') this.importView = route.view;
                if (route.tab === 'insights') this.insightsView = route.view;
            };
            const route = parseRoute(location.hash);
            if (route) { applyRoute(route); if (location.hash !== this.routeHash) history.replaceState(history.state, '', this.routeHash); }
            this.$watch(() => this.routeHash, hash => {
                if (location.hash === hash) return;
                location.hash = hash;
                if (this.fullViewId) history.replaceState({ ...history.state, fromApp: true }, '');
            });
            window.addEventListener('hashchange', () => {
                const next = parseRoute(location.hash);
                if (next) applyRoute(next);
                else if (this.fullViewId) applyRoute({ tab: 'feed' });
            });
            await this.reload();
            const savedFeedSubject = readJson('tacit.feedSubject', '');
            if (this.feedSubjects.some(([slug]) => slug === savedFeedSubject)) this.feedFilters.subject = savedFeedSubject;
            this.$watch('feedFilters.subject', slug => {
                try { if (slug) localStorage.setItem('tacit.feedSubject', JSON.stringify(slug)); else localStorage.removeItem('tacit.feedSubject'); } catch (_) { /* blocked: selection not remembered */ }
            });
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
            this.refreshFullView();
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
            this.folded = foldedComments(pending);
            this.trust = await store.getAll('trust');
            this.hiddenKeys = (await store.getAll('hidden')).map(item => item.key);
            this.tombstones = await store.getAll('tombstones');
            this.library = (await store.getAll('library')).sort((a, b) => b.event.created_at - a.event.created_at).map(item => ({ ...item, content: parseContent(item.event) })).filter(item => item.content);
            this.authorNames = latestAuthorNames([...this.library, ...pending.filter(item => item.kind === 'incoming' || item.kind === 'incoming-comment')].map(item => item.event));
            this.refreshFullView();
        },
        editPrompt() { this.promptDraft = this.customPrompt ?? DEFAULT_TACIT_PROMPT; this.promptEditing = true; },
        savePrompt() {
            const text = this.promptDraft.trim();
            this.storePrompt(text && text !== DEFAULT_TACIT_PROMPT ? text : null);
            this.promptEditing = false; this.toast(this.customPrompt ? 'Prompt saved on this device' : 'Default prompt restored');
        },
        resetPrompt() { this.promptDraft = DEFAULT_TACIT_PROMPT; },
        storePrompt(text) {
            this.customPrompt = text;
            try { if (text) localStorage.setItem('tacit.extractPrompt', text); else localStorage.removeItem('tacit.extractPrompt'); } catch (_) { this.toast('Could not store prompt; it will be lost on reload', true); }
        },
        saveSettings() { localStorage.setItem('tacit.settings', JSON.stringify(this.settings)); },
        logSync(message) { this.syncLogs.unshift(`[${new Date().toLocaleTimeString()}] ${message}`); if (this.syncLogs.length > 50) this.syncLogs.pop(); },
        formatDate(seconds) { return new Date(seconds * 1000).toLocaleString(); },
        shortKey,
        sharedName(pubkey) { return this.authorNames[pubkey] || this.trust.find(entry => entry.pubkey === pubkey)?.authorName || ''; },
        authorLabel(pubkey) { return pubkey === this.pubkey ? 'you' : this.previousKeys.includes(pubkey) ? 'by previous key' : this.trust.find(entry => entry.pubkey === pubkey)?.nickname || this.sharedName(pubkey) || shortKey(pubkey); },
        setAuthorName(input) {
            this.settings.authorName = cleanAuthorName(input.value) || undefined;
            if (this.settings.authorName) this.settings.namePromptedKey = this.pubkey;
            this.saveSettings();
            input.value = this.settings.authorName || '';
            this.toast(this.settings.authorName ? 'Name saved' : 'Name cleared');
        },
        hues: HUES,
        setScheme(scheme) {
            this.theme = scheme;
            try { if (scheme) localStorage.setItem('tacit.theme', scheme); else localStorage.removeItem('tacit.theme'); } catch (_) {}
            if (scheme) document.documentElement.dataset.theme = scheme; else delete document.documentElement.dataset.theme;
        },
        setHue(hue) {
            this.hue = hue;
            try { localStorage.setItem('tacit.hue', hue); } catch (_) {}
            document.documentElement.dataset.hue = hue;
        },
        subjectHue(slug) { return this.subjectHues[slug] || null; },
        setSubjectHue(slug, hue) {
            const next = { ...this.subjectHues };
            if (hueOf(hue)) next[slug] = hue; else delete next[slug];
            this.subjectHues = next;
            try { localStorage.setItem('tacit.subjectHues', JSON.stringify(next)); } catch (_) {}
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
            else if (result.action === 'search') { this.showTab('feed'); this.$nextTick(() => document.getElementById('feed-search').focus()); }
            else if (result.action.startsWith('go:')) this.showTab(result.action.slice(3));
        },
        copyKey(pubkey) { return this.copy(encodeNpub(pubkey), 'Public key'); },
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
                if (result.drafts.length) this.openReview();
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
            if (!await this.askName()) return;
            await store.put('library', { ...await this.signDraft(draft), visibility: 'local' });
            await store.remove('pending', draft.id); await this.reload(); this.activeTab = 'feed'; this.toast('Draft stored');
        },
        async shareDraft(draft) {
            if (!await this.askName()) return;
            const record = await this.signDraft(draft);
            await store.put('library', { ...record, visibility: 'shared' });
            await store.remove('pending', draft.id); await this.reload();
            this.publish(record);
        },
        clearFilters() { this.feedFilters = { subject: '', author: '', visibility: '', search: '' }; },
        get routeHash() { return buildRoute(this.fullViewId ? 'tacit' : this.activeTab, { import: this.importView, insights: this.insightsView }, this.fullViewId); },
        get fullView() {
            const result = resolveFullView(this.library, this.fullViewId);
            const picked = result.status === 'ambiguous' && result.matches.find(item => item.key === this.fullViewPick);
            return picked ? { ...result, status: 'found', item: picked } : result;
        },
        setFullView(id) {
            if (id === this.fullViewId) return;
            this.fullViewPick = ''; this.closeLink(); fullViewFocused = '';
            this.fullViewId = id;
            this.refreshFullView();
        },
        pickFullView(key) { this.fullViewPick = key; this.refreshFullView(); },
        get fullViewReady() { return !!this.fullViewId && !!this.fullView.item && this.detailItem?.key === this.fullView.item.key; },
        showTab(tab) { this.activeTab = tab; this.setFullView(''); },
        async openFullView(item) {
            detailOpener = null; this.closeDetail(); this.setFullView(fullViewIdOf(item.key));
            this.activeTab = 'feed';
        },
        leaveFullView() { if (history.state?.fromApp) history.back(); else this.showTab('feed'); },
        refreshFullView() {
            if (!this.fullViewId || !this.ready) return;
            const item = this.fullView.item;
            if (item) this.markSeen(item.key);
            if (item && item.key !== this.detailItem?.key) { this.commentDraft = ''; this.replyTo = ''; this.replyDraft = ''; }
            if (item && (item.key !== this.detailItem?.key || item.event.id !== this.detailItem.event.id || item.visibility !== this.detailItem.visibility)) this.detailItem = item;
            if (fullViewFocused === this.fullViewId) return;
            fullViewFocused = this.fullViewId;
            const comment = focusCommentOnOpen;
            focusCommentOnOpen = false;
            this.$nextTick(() => (comment && document.querySelector('#full-view .comment-field') || document.getElementById('full-view-heading'))?.focus());
        },
        commentOnRecord(item) { focusCommentOnOpen = true; this.openFullView(item); },
        async openDetail(item, el) {
            detailOpener = el; this.detailItem = item; this.sheetOpen = true;
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
            detailOpener = null; this.sheetOpen = false; if (!this.fullViewId) this.detailItem = null; this.closeLink();
            if (opener?.isConnected) opener.focus();
        },
        syncDetail() {
            if (!this.detailItem || !this.sheetOpen) return;
            const current = this.library.find(entry => entry.key === this.detailItem.key);
            if (!current) this.closeDetail();
            else if (current.event.id !== this.detailItem.event.id || current.visibility !== this.detailItem.visibility) this.detailItem = current;
        },
        shortIdOf,
        isInsight,
        highlightParts(text, search = this.feedFilters.search) { return highlightParts(text, search); },
        insightCard(item) { return incomingInsightCard(item.content, this.library, this.incoming.flatMap(group => group.records)); },
        get detailRelations() { return this.detailItem ? relationsOf(this.library, this.detailItem.key) : []; },
        get feedBadgeMap() { return feedBadges(this.library); },
        badgesOf(item) { return this.feedBadgeMap.get(item.key) ?? { superseded: false, conflicts: 0 }; },
        worksOf(item) { return worksCount(item.key, this.library, { selfKeys: this.selfKeys, trustedKeys: new Set(this.trust.filter(entry => entry.status === 'trusted').map(entry => entry.pubkey)) }); },
        worksTip(item) { const { n, t } = this.worksOf(item); return `${n} people say this worked for them; ${t} of them you trust`; },
        async toggleWorks(item) {
            const key = `${this.pubkey}:${worksD(item.key)}`;
            const own = this.library.find(entry => entry.key === key);
            if (own) { await this.removeItem(own); await this.reload(); return; }
            if (item.visibility !== 'shared' || !await this.askName()) return;
            const after = this.tombstones.find(entry => entry.key === key)?.created_at;
            const event = await this.signer.signEvent(buildWorksTemplate({ target: item.key, subject: item.content.subject, after }, undefined, this.settings.authorName));
            const saved = { key: recordKey(event), event, visibility: 'shared', subjectSlug: item.subjectSlug, receivedAt: Date.now() };
            await store.put('library', saved); await this.reload();
            this.publish(saved);
        },
        commentsOf(item) { return shownCount(buildThread(item.key, { library: this.library })); },
        get threadRows() {
            if (!this.detailItem) return [];
            const thread = buildThread(this.detailItem.key, {
                library: this.library, folded: this.folded, tombstones: Object.fromEntries(this.tombstones.map(entry => [entry.key, entry.created_at])),
                hiddenKeys: new Set(this.hiddenKeys), blockedKeys: new Set(this.trust.filter(entry => entry.status === 'blocked').map(entry => entry.pubkey)),
            });
            return flattenThread(thread, { maxIndent: this.threadWide ? 8 : 4, collapsed: this.threadCollapsed });
        },
        toggleThread(row) { this.threadCollapsed = { ...this.threadCollapsed, [row.key]: !row.collapsed }; },
        repliesText(row) { return `${row.replies} ${row.replies === 1 ? 'reply' : 'replies'}`; },
        stubText(row) { return { deleted: 'Comment deleted', hidden: 'Comment hidden', missing: 'Earlier comment not received yet' }[row.stub]; },
        async openReply(row) {
            if (row.folded) await this.acceptIncoming(row.item);
            this.replyTo = row.key; this.replyDraft = '';
            this.$nextTick(() => [...document.querySelectorAll('.reply-field')].find(field => field.offsetParent)?.focus());
        },
        async postComment(parentKey, body) {
            const text = body.trim(), root = this.detailItem;
            if (!text || text.length > COMMENT_BODY_MAX || root?.visibility !== 'shared' || !await this.askName()) return false;
            const event = await this.signer.signEvent(buildCommentTemplate({ root: root.key, parent: parentKey, body: text, subject: root.content.subject }, undefined, this.settings.authorName));
            const saved = { key: recordKey(event), event, visibility: 'shared', subjectSlug: root.subjectSlug, receivedAt: Date.now() };
            await store.put('library', saved); await this.reload();
            this.publish(saved);
            return true;
        },
        async submitComment() { if (await this.postComment(this.detailItem.key, this.commentDraft)) this.commentDraft = ''; },
        async submitReply(row) { if (await this.postComment(row.key, this.replyDraft)) { this.replyTo = ''; this.replyDraft = ''; } },
        async editComment(row) {
            const body = prompt('Edit comment', row.item.content.body)?.trim();
            if (!body || body === row.item.content.body || body.length > COMMENT_BODY_MAX || !await this.askName()) return;
            const event = await this.signer.signEvent(buildCommentEdit(row.item.event, body, undefined, this.settings.authorName));
            const { content, ...record } = row.item;
            const edited = { ...record, event, receivedAt: Date.now() };
            await store.put('library', edited); await this.reload();
            this.publish(edited);
            this.toast('Comment edited');
        },
        async deleteComment(row) {
            await this.removeItem(row.item); await this.reload();
            this.toast('Comment deleted');
        },
        async hideComment(row) {
            await store.put('hidden', { key: row.key, hiddenAt: Date.now() }); await store.remove('library', row.key); await this.reload();
            this.toast('Comment hidden');
        },
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
            if (!await this.askName()) return;
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
            if (!await this.askName()) return;
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
            const discussion = isInsight(item.content) ? [] : discussionTargets(item.key, this.library, this.pubkey);
            const comments = discussion.filter(entry => isComment(entry.content)).length;
            const also = [targets.insights.length && `${targets.insights.length} of your insights`, comments && `${comments} of your comments`].filter(Boolean).join(' and ');
            if (also && !confirm(`Delete this record? This also deletes ${also}.`)) return false;
            try {
                await this.removeItem(item);
                for (const draft of targets.drafts) await store.remove('pending', draft.id);
                for (const insight of targets.insights) await this.removeItem(insight);
                for (const entry of discussion) await this.removeItem(entry);
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
            const foldedCounts = {};
            for (const item of (await store.getAll('pending')).filter(entry => entry.kind === 'incoming-comment')) {
                pendingIncoming[item.id] = item.event;
                foldedCounts[item.pubkey] = (foldedCounts[item.pubkey] ?? 0) + 1;
            }
            const tombstones = Object.fromEntries(this.tombstones.map(item => [item.key, item.created_at]));
            const hiddenKeys = new Set(this.hiddenKeys);
            const trustedPubkeys = new Set([...this.selfKeys, ...this.trust.filter(entry => entry.status === 'trusted').map(entry => entry.pubkey)]);
            const blockedPubkeys = new Set(this.trust.filter(entry => entry.status === 'blocked').map(entry => entry.pubkey));
            let changed = false;
            for (const event of events) {
                const decision = decideIncoming(event, { held, pendingIncoming, pendingCount: pendingCounts[event.pubkey] ?? 0, foldedCount: foldedCounts[event.pubkey] ?? 0, hiddenKeys, tombstones, trustedPubkeys, blockedPubkeys });
                if (decision.reason === 'tampered') { console.warn(`Rejected tampered record from peer ${peerId.slice(0, 6)}`); this.logSync(`Rejected tampered record from peer ${peerId.slice(0, 6)}`); }
                if (decision.reason === 'queue-full') this.logSync(`Review queue full for ${shortKey(event.pubkey)}`);
                if (decision.reason === 'comment-queue-full') this.logSync(`Comment queue full for ${shortKey(event.pubkey)}`);
                if (decision.action === 'delete') {
                    await store.put('tombstones', { key: decision.key, created_at: event.created_at, event });
                    tombstones[decision.key] = event.created_at;
                    if (decision.removeHeld) {
                        await store.remove('library', decision.key); await store.remove('pending', decision.key);
                        delete held[decision.key];
                        if (pendingIncoming[decision.key]) { delete pendingIncoming[decision.key]; (decision.key.startsWith(`${event.pubkey}:tacit-comment-`) ? foldedCounts : pendingCounts)[event.pubkey]--; }
                    }
                } else if (decision.action === 'accept') {
                    await store.put('library', { key: recordKey(event), event, visibility: 'shared', subjectSlug: slug, receivedFrom: peerId, receivedAt: Date.now() });
                    held[recordKey(event)] = event;
                } else if (decision.action === 'review') {
                    const key = recordKey(event);
                    await store.put('pending', { id: key, kind: 'incoming', event, subjectSlug: slug, pubkey: event.pubkey, receivedFrom: peerId, receivedAt: Date.now() });
                    if (!pendingIncoming[key]) pendingCounts[event.pubkey] = (pendingCounts[event.pubkey] ?? 0) + 1;
                    pendingIncoming[key] = event;
                } else if (decision.action === 'fold') {
                    const key = recordKey(event);
                    await store.put('pending', { id: key, kind: 'incoming-comment', event, subjectSlug: slug, pubkey: event.pubkey, receivedFrom: peerId, receivedAt: Date.now() });
                    if (!pendingIncoming[key]) foldedCounts[event.pubkey] = (foldedCounts[event.pubkey] ?? 0) + 1;
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
        toggleFolded(row) { this.foldedOpen[row.key] = !this.foldedOpen[row.key]; },
        async hideFolded(row) {
            await store.put('hidden', { key: row.key, hiddenAt: Date.now() }); await store.remove('pending', row.key); await this.reload();
            this.toast('Comment hidden');
        },
        async discardIncoming(item) { await store.remove('pending', item.id); await this.reload(); },
        async acceptGroup(group) { for (const item of group.records) await this.acceptIncoming(item); },
        async discardGroup(group) { for (const item of group.records) await store.remove('pending', item.id); await this.reload(); },
        async setNickname(entry, nickname) {
            const name = nickname.trim();
            await store.put('trust', { ...entry, nickname: name && name !== this.sharedName(entry.pubkey) ? name : undefined }); await this.reload();
        },
        async setStatus(entry, status) { if (status === 'blocked') await this.blockAuthor(entry.pubkey); else await this.trustAuthor(entry.pubkey); },
        openTrustForm(status) { this.trustForm = { status, key: '', error: '' }; this.$nextTick(() => document.getElementById('trust-add-key')?.focus()); },
        async submitTrustForm() {
            try {
                const pubkey = parsePublicKey(this.trustForm.key);
                if (this.selfKeys.has(pubkey)) throw new Error('That is your own key.');
                if (this.trustForm.status === 'blocked') await this.blockAuthor(pubkey); else await this.trustAuthor(pubkey);
                this.trustForm = { status: '', key: '', error: '' };
            } catch (error) { this.trustForm.error = error.message; }
        },
        async removeTrust(pubkey) { await store.remove('trust', pubkey); await this.reload(); },
        async trustAuthor(pubkey) {
            await store.put('trust', { ...this.trust.find(entry => entry.pubkey === pubkey), pubkey, status: 'trusted', authorName: this.sharedName(pubkey) || undefined });
            const group = this.incoming.find(entry => entry.pubkey === pubkey);
            await this.reload();
            for (const item of group?.records || []) await this.acceptIncoming(item);
            for (const item of this.folded.filter(entry => entry.event.pubkey === pubkey)) await this.acceptIncoming(item);
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
