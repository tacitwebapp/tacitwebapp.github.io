export function filterFeed(library, { subject = '', author = '', visibility = '', search = '' }, { selfKeys, trustedKeys }) {
    const needle = search.trim().toLowerCase();
    const authorGroup = pubkey => selfKeys.has(pubkey) ? 'mine' : trustedKeys.has(pubkey) ? 'trusted' : 'others';
    return library.filter(item =>
        (!subject || item.subjectSlug === subject)
        && (!author || authorGroup(item.event.pubkey) === author)
        && (!visibility || item.visibility === visibility)
        && (!needle || [item.content.information_chunks, item.content.actionable_workflows].some(text => String(text ?? '').toLowerCase().includes(needle))));
}
