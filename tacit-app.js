document.addEventListener('alpine:init', () => {
    Alpine.data('tacitApp', () => ({
        mainTabs: [{ id: 'feed', label: 'Tacit Feed' }, { id: 'upload', label: 'Tacit Upload' }, { id: 'settings', label: 'Settings' }],
        uploadTabs: [{ id: 'prompt', label: 'Prompt' }, { id: 'upload', label: 'Upload' }, { id: 'share', label: 'Share' }],
        activeTab: 'feed', activeUploadTab: 'prompt', inputTypeLabels: window.TacitInputTypeLabels, selectedInputType: 'txt', selectedSubjectCategory: '', newSubjectCategory: '', subjectCategories: [],
        appId: 'com.tacit-knowledge.p2p-sync-v2', settings: { relays: '', channels: [] }, newChannel: '', tacitData: [], pendingData: [], syncLogs: [], connections: {}, isConnecting: false,
        get isConnected() { return Object.keys(this.connections).length > 0; },
        get connectionStatus() { return this.isConnected ? `Connected to ${Object.keys(this.connections).length} subscribed channel(s).` : 'Connect a subscribed channel in Settings before sharing to the network.'; },
        get dynamicPrompt() { return window.buildTacitPrompt({ inputType: this.selectedInputType, subjectCategory: this.selectedSubjectCategory }); },
        initApp() {
            this.tacitData = this.readStorage(window.TacitFeed.storageKey).map(entry => entry.data ? entry : window.TacitFeed.makeEntry(entry, 'Previously saved'));
            this.pendingData = this.readStorage(window.TacitFeed.pendingStorageKey);
            const savedSettings = localStorage.getItem('tacit_settings');
            if (savedSettings) { try { this.settings = { ...this.settings, ...JSON.parse(savedSettings) }; } catch (_) { /* defaults */ } }
            this.subjectCategories = this.readStorage('tacit_subject_categories');
        },
        readStorage(key) { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch (_) { return []; } },
        saveFeed() { localStorage.setItem(window.TacitFeed.storageKey, JSON.stringify(this.tacitData)); },
        savePending() { localStorage.setItem(window.TacitFeed.pendingStorageKey, JSON.stringify(this.pendingData)); },
        saveSettings() { localStorage.setItem('tacit_settings', JSON.stringify(this.settings)); },
        saveSubjectCategories() { localStorage.setItem('tacit_subject_categories', JSON.stringify(this.subjectCategories)); },
        addSubjectCategory() {
            const category = this.newSubjectCategory.trim();
            if (!category) return;
            if (!this.subjectCategories.includes(category)) this.subjectCategories.push(category);
            this.selectedSubjectCategory = category;
            this.newSubjectCategory = '';
            this.saveSubjectCategories();
        },
        logSync(message) { this.syncLogs.unshift(`[${new Date().toLocaleTimeString()}] ${message}`); if (this.syncLogs.length > 50) this.syncLogs.pop(); },
        stringify(value) { return JSON.stringify(value); },
        formatDate(value) { return new Date(value).toLocaleString(); },
        knowledgeSummary(data) { return data.chunk || data.information_chunks || data.title || JSON.stringify(data); },
        handleFileUpload(event) {
            const file = event.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = loadEvent => {
                try {
                    const records = file.name.toLowerCase().endsWith('.json') ? window.TacitJsonParser.parse(loadEvent.target.result) : window.TacitCsvParser.parse(loadEvent.target.result);
                    this.queueForReview(records, 'Local upload'); this.activeUploadTab = 'share'; event.target.value = '';
                } catch (error) { alert(`Could not import ${file.name}: ${error.message}`); }
            };
            reader.readAsText(file);
        },
        queueForReview(records, source) {
            let queued = 0;
            records.forEach(data => { if (!window.TacitFeed.isDuplicate(this.tacitData, data) && !window.TacitFeed.isDuplicate(this.pendingData, data)) { this.pendingData.push(window.TacitFeed.makeEntry(data, source)); queued += 1; } });
            this.savePending(); this.logSync(queued ? `${queued} record(s) queued for review from ${source}.` : `No new records from ${source}.`);
        },
        storePending(id) {
            const index = this.pendingData.findIndex(entry => entry.id === id); if (index < 0) return;
            const [entry] = this.pendingData.splice(index, 1);
            if (!window.TacitFeed.isDuplicate(this.tacitData, entry.data)) this.tacitData.push(entry);
            this.saveFeed(); this.savePending(); this.logSync('Record stored locally.');
        },
        sharePending(id) {
            const entry = this.pendingData.find(entry => entry.id === id); if (!entry || !this.isConnected) return;
            window.TacitSync.broadcast(this, [entry.data]); this.discardPending(id); this.logSync('Record shared to subscribed channels.');
        },
        discardPending(id) { this.pendingData = this.pendingData.filter(entry => entry.id !== id); this.savePending(); this.logSync('Record discarded.'); },
        receiveFromPeer(data, channel, peerId) { if (Array.isArray(data)) this.queueForReview(data, `Channel ${channel} · peer ${peerId.substring(0, 6)}`); },
        broadcastSavedData() { if (!this.isConnected || !this.tacitData.length) return; window.TacitSync.broadcast(this, this.tacitData.map(entry => entry.data)); this.logSync('Saved records shared to all subscribed channels.'); },
        addSubscription() { const channel = this.newChannel.trim(); if (!channel) return; if (!this.settings.channels.includes(channel)) this.settings.channels.push(channel); this.newChannel = ''; this.saveSettings(); },
        removeSubscription(channel) { this.settings.channels = this.settings.channels.filter(item => item !== channel); this.saveSettings(); },
        connectSubscribedChannels() {
            if (!window.TacitSync) return alert('Network module is still loading. Please try again.');
            this.isConnecting = true;
            try { this.settings.channels.forEach(channel => window.TacitSync.connect(this, channel)); } catch (error) { console.error(error); alert('Failed to connect. Check the relay settings and browser console.'); } finally { this.isConnecting = false; }
        }
    }));
});
