const STOPWORDS = new Set('the and for are but not you all any can had her was one our out has have this that with from they will would there their what about which when your said each she how into than then them these some were been being its also may must should could does did any per via'.split(' '));

const textOf = ({ content = {} }) => [content.information_chunks, content.actionable_workflows, content.specialty].filter(Boolean).join(' ');
const tokensOf = item => (textOf(item).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(token => token.length > 1 && !STOPWORDS.has(token));

function vectorOf(tokens, idf) {
    const counts = new Map();
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    const vector = new Map();
    let norm = 0;
    for (const [token, count] of counts) {
        const weight = (1 + Math.log(count)) * idf(token);
        vector.set(token, weight);
        norm += weight * weight;
    }
    return { vector, norm: Math.sqrt(norm) };
}

export function rankBySimilarity(target, candidates, corpus = []) {
    const docFrequency = new Map();
    for (const item of corpus) for (const token of new Set(tokensOf(item))) docFrequency.set(token, (docFrequency.get(token) ?? 0) + 1);
    const idf = token => Math.log((1 + corpus.length) / (1 + (docFrequency.get(token) ?? 0))) + 1;
    const goal = vectorOf(tokensOf(target), idf);
    const rows = candidates.filter(item => item.key !== target.key).map((item, order) => {
        const other = vectorOf(tokensOf(item), idf);
        let dot = 0;
        for (const [token, weight] of goal.vector) dot += weight * (other.vector.get(token) ?? 0);
        return { item, order, score: goal.norm && other.norm ? dot / (goal.norm * other.norm) : 0 };
    });
    return rows.sort((a, b) => b.score - a.score || a.order - b.order).map(({ item, score }) => ({ item, score }));
}

export const LINK_TOP_N = 8;

export const matchesQuery = (item, needle, idOf) => idOf(item).includes(needle)
    || [item.content.information_chunks, item.content.actionable_workflows, item.content.specialty].some(text => String(text ?? '').toLowerCase().includes(needle));

export function candidatesFor(rows, query, limit, idOf) {
    const needle = query.trim().toLowerCase();
    return needle ? rows.filter(({ item }) => matchesQuery(item, needle, idOf)) : rows.slice(0, limit);
}
