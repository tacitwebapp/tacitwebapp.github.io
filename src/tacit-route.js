export const TAB_VIEWS = { import: ['import', 'review'], insights: ['prompt', 'link'] };
const TABS = ['feed', 'extract', 'import', 'insights', 'map', 'subjects', 'identity'];

export function parseRoute(hash) {
    const [tab, view] = String(hash ?? '').replace(/^#\/?/, '').split('/');
    if (!TABS.includes(tab)) return null;
    const views = TAB_VIEWS[tab];
    return { tab, view: views?.includes(view) ? view : views?.[0] };
}

export function buildRoute(tab, views) {
    return TAB_VIEWS[tab] ? `#/${tab}/${views[tab]}` : `#/${tab}`;
}
