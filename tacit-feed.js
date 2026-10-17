window.TacitFeed = {
    storageKey: 'tacit_knowledge_db',
    pendingStorageKey: 'tacit_pending_review',
    makeEntry(data, source) {
        const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        return { id, data, source, receivedAt: new Date().toISOString() };
    },
    isDuplicate(entries, data) {
        const candidate = JSON.stringify(data);
        return entries.some(entry => JSON.stringify(entry.data) === candidate);
    }
};
