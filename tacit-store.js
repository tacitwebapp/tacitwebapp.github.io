const STORES = {
    library: { keyPath: 'key', indexes: ['subjectSlug', 'pubkey', 'visibility'] },
    pending: { keyPath: 'id', indexes: ['pubkey', 'kind'] },
    tombstones: { keyPath: 'key', indexes: [] },
    trust: { keyPath: 'pubkey', indexes: ['status'] },
    hidden: { keyPath: 'key', indexes: [] },
};

let dbPromise;

const open = () => dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('tacit', 1);
    request.onupgradeneeded = () => {
        for (const [name, { keyPath, indexes }] of Object.entries(STORES)) {
            const store = request.result.createObjectStore(name, { keyPath });
            indexes.forEach(index => store.createIndex(index, index));
        }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const run = async (name, mode, action) => {
    const db = await open();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(name, mode);
        const request = action(transaction.objectStore(name));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = transaction.onabort = () => reject(transaction.error);
    });
};

export const getAll = name => run(name, 'readonly', store => store.getAll());
export const get = (name, key) => run(name, 'readonly', store => store.get(key));
export const put = (name, value) => run(name, 'readwrite', store => store.put(value));
export const remove = (name, key) => run(name, 'readwrite', store => store.delete(key));
