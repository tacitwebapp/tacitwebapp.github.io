export const TAB_VIEWS = { import: ['import', 'review'], insights: ['prompt', 'link'] };
const TABS = ['feed', 'extract', 'import', 'insights', 'map', 'subjects', 'identity'];
const FULL_VIEW_ID = /^[0-9a-f]{8}$/;

export function parseRoute(hash) {
    const parts = String(hash ?? '').replace(/^#\/?/, '').split('/');
    const [tab, view] = parts;
    if (tab === 'tacit') return parts.length === 2 && FULL_VIEW_ID.test(view) ? { tab, id: view } : null;
    if (!TABS.includes(tab)) return null;
    const views = TAB_VIEWS[tab];
    return { tab, view: views?.includes(view) ? view : views?.[0] };
}

export function buildRoute(tab, views, id) {
    if (tab === 'tacit') return `#/tacit/${id}`;
    return TAB_VIEWS[tab] ? `#/${tab}/${views[tab]}` : `#/${tab}`;
}
