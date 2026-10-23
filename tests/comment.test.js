import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorksTemplate, isValidWorks, worksCount, cascadeTargets, fullViewIdOf, resolveFullView, buildCommentTemplate, buildCommentEdit, isValidComment, buildThread, flattenThread, shownCount, isRecord, foldedComments } from '../src/tacit-comment.js';
import { decideIncoming, announcementFor } from '../src/tacit-sync.js';
import { filterFeed } from '../src/tacit-feed.js';
import { buildDrafts, existingRecords } from '../src/tacit-import.js';
import { recordKey, buildDeletionTemplate } from '../src/tacit-events.js';
import { buildBackup, parseBackup, restoreBackup } from '../src/tacit-backup.js';
import { createLocalSigner, generateSecretKeyHex } from '../src/tacit-identity.js';

const A = 'a'.repeat(64), B = 'b'.repeat(64);
const U1 = '3f9a1c2e-1111-4111-8111-111111111111', U2 = '7b20aa91-2222-4222-8222-222222222222';
const rec = (pubkey, uuid, extra = {}) => ({ key: `${pubkey}:tacit-entry-${uuid}`, subjectSlug: 'pest', visibility: 'shared', event: { pubkey, created_at: 100 }, content: { subject: 'Pest', information_chunks: `chunk ${uuid.slice(0, 4)}` }, ...extra });

test('Works template: d is tacit-works- plus the record uuid, content names the record key', () => {
    const target = rec(B, U1).key;
    const template = buildWorksTemplate({ target, subject: 'Pest' }, 500, 'Ann');
    assert.equal(template.kind, 30078);
    assert.equal(template.created_at, 500);
    assert.deepEqual(template.tags, [['d', `tacit-works-${U1}`], ['subject', 'Pest'], ['author_name', 'Ann']]);
    assert.deepEqual(JSON.parse(template.content), { schemaVersion: 1, type: 'works', target });
    assert.deepEqual(buildWorksTemplate({ target, subject: 'Pest' }, 900).tags, [['d', `tacit-works-${U1}`], ['subject', 'Pest']]);
});

test('marking again is signed after the tombstone of the last un-mark', () => {
    const target = rec(B, U1).key;
    assert.equal(buildWorksTemplate({ target, subject: 'Pest', after: 700 }, 700).created_at, 701);
    assert.equal(buildWorksTemplate({ target, subject: 'Pest', after: 600 }, 700).created_at, 700);
});

test('a Works mark is valid only when the uuid in its target matches the uuid in its d', () => {
    const target = rec(B, U1).key, key = `${A}:tacit-works-${U1}`;
    const good = { schemaVersion: 1, type: 'works', target };
    assert.equal(isValidWorks(good, key), true);
    assert.equal(isValidWorks({ ...good, target: rec(B, U2).key }, key), false);
    assert.equal(isValidWorks(good, `${A}:tacit-works-${U2}`), false);
    assert.equal(isValidWorks({ ...good, type: 'insight' }, key), false);
    assert.equal(isValidWorks({ ...good, target: 7 }, key), false);
    assert.equal(isValidWorks({ ...good, target: undefined }, key), false);
    assert.equal(isValidWorks({ ...good, target: `${B}:tacit-link-${U1}` }, key), false);
    assert.equal(isValidWorks({ ...good, target: `tacit-entry-${U1}` }, key), false);
    assert.equal(isValidWorks(null, key), false);
});

const C = 'c'.repeat(64), D = 'd'.repeat(64), E = 'e'.repeat(64);
const mark = (pubkey, target, extra = {}) => ({ key: `${pubkey}:tacit-works-${target.slice(target.indexOf(':') + 13)}`, subjectSlug: 'pest', visibility: 'shared', event: { pubkey, created_at: 200 }, content: { schemaVersion: 1, type: 'works', target }, ...extra });

test('worksCount counts distinct authors with a valid mark and splits out the trusted and self ones', () => {
    const record = rec(D, U1), other = rec(D, U2);
    const library = [record, other, mark(A, record.key), mark(B, record.key), mark(C, record.key), mark(E, other.key)];
    assert.deepEqual(worksCount(record.key, library, { selfKeys: new Set([A]), trustedKeys: new Set([B]) }), { n: 3, t: 2, mine: true });
    assert.deepEqual(worksCount(record.key, library, { selfKeys: new Set([E]), trustedKeys: new Set() }), { n: 3, t: 0, mine: false });
    assert.deepEqual(worksCount(other.key, library, { selfKeys: new Set([A]), trustedKeys: new Set() }), { n: 1, t: 0, mine: false });
    assert.deepEqual(worksCount(rec(D, '9c9c9c9c-4444-4444-8444-444444444444').key, library, { selfKeys: new Set([A]), trustedKeys: new Set() }), { n: 0, t: 0, mine: false });
});

test('worksCount leaves out the record author\'s own mark, which still shows as theirs', () => {
    const record = rec(A, U1);
    const library = [record, mark(A, record.key), mark(B, record.key)];
    assert.deepEqual(worksCount(record.key, library, { selfKeys: new Set([A]), trustedKeys: new Set([B]) }), { n: 1, t: 1, mine: true });
    assert.deepEqual(worksCount(record.key, [record, mark(A, record.key)], { selfKeys: new Set([A]), trustedKeys: new Set() }), { n: 0, t: 0, mine: true });
});

test('worksCount ignores invalid marks', () => {
    const record = rec(D, U1);
    const forged = { ...mark(B, record.key), key: `${B}:tacit-works-${U2}` };
    const wrongType = mark(C, record.key, { content: { type: 'insight', target: record.key } });
    assert.deepEqual(worksCount(record.key, [record, forged, wrongType], { selfKeys: new Set([B]), trustedKeys: new Set([C]) }), { n: 0, t: 0, mine: false });
});

const signer = createLocalSigner(generateSecretKeyHex());
const signMark = (target, now, content) => signer.signEvent({ ...buildWorksTemplate({ target, subject: 'Pest' }, now), ...(content && { content: JSON.stringify(content) }) });

test('decideIncoming accepts an unknown author\'s valid Works mark straight into the library, even with a full review queue', async () => {
    const event = await signMark(rec(B, U1).key, 100);
    const base = { held: {}, trustedPubkeys: new Set() };
    assert.deepEqual(decideIncoming(event, base), { action: 'accept' });
    assert.deepEqual(decideIncoming(event, { ...base, pendingCount: 50 }), { action: 'accept' });
    assert.equal(decideIncoming(event, { ...base, trustedPubkeys: new Set([event.pubkey]) }).action, 'accept');
});

test('decideIncoming drops an unknown author\'s invalid Works mark, but not a trusted author\'s', async () => {
    const mismatched = await signMark(rec(B, U1).key, 100, { schemaVersion: 1, type: 'works', target: rec(B, U2).key });
    const noTarget = await signMark(rec(B, U1).key, 100, { schemaVersion: 1, type: 'works' });
    const base = { held: {}, trustedPubkeys: new Set() };
    assert.deepEqual(decideIncoming(mismatched, base), { action: 'drop', reason: 'bad-works' });
    assert.deepEqual(decideIncoming(noTarget, base), { action: 'drop', reason: 'bad-works' });
    assert.equal(decideIncoming(mismatched, { ...base, trustedPubkeys: new Set([mismatched.pubkey]) }).action, 'accept');
});

test('Works marks still drop when blocked, hidden, tombstoned or older, and a newer mark passes an older tombstone', async () => {
    const event = await signMark(rec(B, U1).key, 100);
    const key = recordKey(event);
    const base = { held: {}, trustedPubkeys: new Set() };
    assert.equal(decideIncoming(event, { ...base, blockedPubkeys: new Set([event.pubkey]) }).reason, 'blocked');
    assert.equal(decideIncoming(event, { ...base, hiddenKeys: new Set([key]) }).reason, 'hidden');
    assert.equal(decideIncoming(event, { ...base, tombstones: { [key]: 100 } }).reason, 'tombstoned');
    assert.equal(decideIncoming(event, { ...base, held: { [key]: event } }).reason, 'duplicate-or-older');
    const again = await signMark(rec(B, U1).key, 101);
    assert.equal(recordKey(again), key);
    assert.equal(decideIncoming(again, { ...base, tombstones: { [key]: 100 } }).action, 'accept');
});

test('cascade targets are only the current key\'s mark on the deleted record', () => {
    const record = rec(A, U1), other = rec(A, U2);
    const mine = mark(A, record.key), theirs = mark(B, record.key), previousKey = mark(C, record.key), elsewhere = mark(A, other.key);
    const library = [record, other, mine, theirs, previousKey, elsewhere];
    assert.deepEqual(cascadeTargets(record.key, library, A).map(item => item.key), [mine.key]);
    assert.deepEqual(cascadeTargets(record.key, [record, theirs], A), []);
});

test('Feed, sharedCount and the record import duplicate check leave Works marks out', () => {
    const one = rec(A, U1), two = rec(A, U2);
    const works = mark(B, one.key);
    const ctx = { selfKeys: new Set([A]), trustedKeys: new Set() };
    assert.deepEqual(filterFeed([one, works, two], {}, ctx).map(item => item.key), [one.key, two.key]);
    assert.deepEqual(filterFeed([one, works, two], { author: 'others' }, ctx), []);
    const subjects = [{ label: 'Pest', slug: 'pest', subscribed: true }];
    assert.equal(announcementFor(subjects, [one, works, two])[0].sharedCount, 2);
    const existing = existingRecords([one.content, { ...works.content, subject: 'Pest', information_chunks: 'undefined' }]);
    assert.deepEqual(existing, [{ slug: 'pest', chunk: 'chunk 3f9a' }]);
    assert.equal(buildDrafts([{ information_chunks: 'undefined' }], { label: 'Pest', slug: 'pest' }, existing).drafts.length, 1);
});

test('Works marks and un-mark tombstones round-trip through backup', async () => {
    const marked = await signMark(rec(B, U1).key, 100), unmarked = await signMark(rec(B, U2).key, 100);
    const deletion = await signer.signEvent(buildDeletionTemplate(unmarked, 200));
    const item = event => ({ key: recordKey(event), event, visibility: 'shared', subjectSlug: 'pest', content: JSON.parse(event.content) });
    const backup = parseBackup(JSON.stringify(buildBackup({ library: [item(marked)], tombstones: [{ key: recordKey(unmarked), created_at: 200, event: deletion }], trust: [], subjects: [] })));
    const plan = restoreBackup(backup, { library: [], tombstones: [], trust: [], hiddenKeys: [], subjects: [] }, 5000);
    assert.deepEqual(plan.puts.library.map(r => [r.key, r.event.id, r.visibility, r.subjectSlug]), [[recordKey(marked), marked.id, 'shared', 'pest']]);
    assert.deepEqual(plan.puts.tombstones.map(entry => entry.key), [recordKey(unmarked)]);
});

const U3 = '3f9a1c2e-3333-4333-8333-333333333333';

test('the full view id of a record is the first 8 hex of its uuid', () => {
    assert.equal(fullViewIdOf(rec(A, U1).key), '3f9a1c2e');
});

test('full view resolves one matching record, local or shared', () => {
    const local = rec(A, U1, { visibility: 'local' }), other = rec(B, U2);
    assert.deepEqual(resolveFullView([other, local], '3f9a1c2e'), { status: 'found', item: local, matches: [local] });
});

test('full view of an id nobody holds is missing', () => {
    assert.deepEqual(resolveFullView([rec(A, U1)], '7b20aa91'), { status: 'missing', matches: [] });
    assert.deepEqual(resolveFullView([], '7b20aa91'), { status: 'missing', matches: [] });
});

test('full view of an id shared by several records lists them to pick from', () => {
    const first = rec(A, U1), second = rec(B, U3), unrelated = rec(A, U2);
    const result = resolveFullView([first, second, unrelated], '3f9a1c2e');
    assert.equal(result.status, 'ambiguous');
    assert.deepEqual(result.matches, [first, second]);
    assert.equal(result.item, undefined);
});

test('full view ignores insights and Works marks', () => {
    const record = rec(A, U1);
    const mark = { key: `${B}:tacit-works-${U1}`, visibility: 'shared', event: { pubkey: B }, content: { type: 'works', target: record.key } };
    const insight = { key: `${B}:tacit-link-${U1}-${U2}`, visibility: 'shared', event: { pubkey: B }, content: { type: 'insight', relation: 'conflicts', from: record.key, to: rec(A, U2).key } };
    assert.deepEqual(resolveFullView([mark, insight, record], '3f9a1c2e').matches, [record]);
    assert.equal(resolveFullView([mark, insight], '3f9a1c2e').status, 'missing');
});

const CU = n => `${String(n).padStart(8, '0')}-5555-4555-8555-555555555555`;
const comment = (pubkey, n, root, parent, extra = {}) => ({
    key: `${pubkey}:tacit-comment-${CU(n)}`, subjectSlug: 'pest', visibility: 'shared', event: { pubkey, created_at: 300 + n },
    content: { schemaVersion: 1, type: 'comment', root, parent, body: `body ${n}`, postedAt: 300 + n }, ...extra,
});
const shape = nodes => nodes.map(node => [node.key, node.depth, shape(node.children)]);

test('comment template: d is tacit-comment- plus a uuid, content carries root, parent, body and postedAt', () => {
    const root = rec(B, U1).key;
    const template = buildCommentTemplate({ root, parent: root, body: 'Only on clay soil', subject: 'Pest' }, 500, 'Ann', U2);
    assert.equal(template.kind, 30078);
    assert.equal(template.created_at, 500);
    assert.deepEqual(template.tags, [['d', `tacit-comment-${U2}`], ['subject', 'Pest'], ['author_name', 'Ann']]);
    assert.deepEqual(JSON.parse(template.content), { schemaVersion: 1, type: 'comment', root, parent: root, body: 'Only on clay soil', postedAt: 500 });
    assert.match(buildCommentTemplate({ root, parent: root, body: 'x', subject: 'Pest' }, 500).tags[0][1], /^tacit-comment-[0-9a-f-]{36}$/);
});

test('a comment edit keeps d, subject and postedAt, changes the body and signs a newer created_at', () => {
    const root = rec(B, U1).key;
    const original = { pubkey: A, ...buildCommentTemplate({ root, parent: root, body: 'Only on clay', subject: 'Pest' }, 500, 'Ann', U2) };
    const edit = buildCommentEdit(original, 'Only on heavy clay', 900, 'Annie');
    assert.deepEqual(edit.tags, [['d', `tacit-comment-${U2}`], ['subject', 'Pest'], ['author_name', 'Annie']]);
    assert.deepEqual(JSON.parse(edit.content), { schemaVersion: 1, type: 'comment', root, parent: root, body: 'Only on heavy clay', postedAt: 500 });
    assert.equal(edit.created_at, 900);
    assert.equal(buildCommentEdit(original, 'again', 400).created_at, 501);
});

test('a comment is valid with its fields present, a root or comment parent and a body of 1 to 2000 characters', () => {
    const root = rec(B, U1).key, key = comment(A, 1, root, root).key, parentKey = comment(B, 2, root, root).key;
    const good = { schemaVersion: 1, type: 'comment', root, parent: root, body: 'ok', postedAt: 300 };
    assert.equal(isValidComment(good, key), true);
    assert.equal(isValidComment({ ...good, parent: parentKey }, key), true);
    assert.equal(isValidComment({ ...good, body: 'x'.repeat(2000) }, key), true);
    assert.equal(isValidComment({ ...good, body: 'x'.repeat(2001) }, key), false);
    assert.equal(isValidComment({ ...good, body: '' }, key), false);
    assert.equal(isValidComment({ ...good, body: 7 }, key), false);
    assert.equal(isValidComment({ ...good, root: 'nonsense' }, key), false);
    assert.equal(isValidComment({ ...good, root: `${B}:tacit-link-${U1}` }, key), false);
    assert.equal(isValidComment({ ...good, parent: 'nonsense' }, key), false);
    assert.equal(isValidComment({ ...good, parent: rec(B, U2).key }, key), false);
    assert.equal(isValidComment({ ...good, parent: undefined }, key), false);
    assert.equal(isValidComment({ ...good, postedAt: 'now' }, key), false);
    assert.equal(isValidComment({ ...good, postedAt: undefined }, key), false);
    assert.equal(isValidComment({ ...good, type: 'works' }, key), false);
    assert.equal(isValidComment(good, rec(A, U2).key), false);
    assert.equal(isValidComment(null, key), false);
});

test('buildThread nests replies at any depth, oldest first, with the depth of each node', () => {
    const root = rec(D, U1);
    const c1 = comment(A, 1, root.key, root.key), c2 = comment(B, 2, root.key, root.key, { content: { ...comment(B, 2, root.key, root.key).content, postedAt: 250 } });
    const r1 = comment(C, 3, root.key, c1.key), r2 = comment(A, 4, root.key, r1.key), r3 = comment(B, 5, root.key, r2.key), r1b = comment(E, 6, root.key, c1.key);
    const library = [root, r3, r1b, c1, r2, c2, r1];
    const thread = buildThread(root.key, { library });
    assert.deepEqual(shape(thread), [
        [c2.key, 0, []],
        [c1.key, 0, [[r1.key, 1, [[r2.key, 2, [[r3.key, 3, []]]]]], [r1b.key, 1, []]]],
    ]);
    assert.equal(thread[1].item, c1);
    assert.deepEqual(thread.map(node => node.stub), [null, null]);
});

test('two peers replying to the same comment both keep their replies', () => {
    const root = rec(D, U1), c1 = comment(A, 1, root.key, root.key);
    const first = comment(B, 2, root.key, c1.key), second = comment(C, 3, root.key, c1.key);
    assert.deepEqual(buildThread(root.key, { library: [root, c1, second, first] })[0].children.map(node => node.key), [first.key, second.key]);
});

test('an edited comment keeps its place and is flagged edited', () => {
    const root = rec(D, U1), c1 = comment(A, 1, root.key, root.key), c2 = comment(B, 2, root.key, root.key);
    const edited = { ...c1, event: { ...c1.event, created_at: 900 } };
    const thread = buildThread(root.key, { library: [root, edited, c2] });
    assert.deepEqual(thread.map(node => [node.key, node.edited]), [[c1.key, true], [c2.key, false]]);
});

test('a reply whose parent has not arrived sits under a not-received stub and moves under the real parent when it arrives', () => {
    const root = rec(D, U1), c1 = comment(A, 1, root.key, root.key);
    const reply = comment(B, 2, root.key, c1.key), deeper = comment(C, 3, root.key, reply.key);
    const early = buildThread(root.key, { library: [root, reply, deeper] });
    assert.equal(early.length, 1);
    assert.deepEqual([early[0].key, early[0].stub, early[0].item, early[0].depth], [c1.key, 'missing', null, 0]);
    assert.deepEqual(shape(early[0].children), [[reply.key, 1, [[deeper.key, 2, []]]]]);
    assert.deepEqual(shape(buildThread(root.key, { library: [root, reply, deeper, c1] })), [[c1.key, 0, [[reply.key, 1, [[deeper.key, 2, []]]]]]]);
});

test('a stub says why its comment is not shown: deleted, hidden or blocked author, otherwise not received', () => {
    const root = rec(D, U1), gone = comment(A, 1, root.key, root.key), hidden = comment(B, 2, root.key, root.key), banned = comment(C, 3, root.key, root.key), unknown = comment(E, 4, root.key, root.key);
    const replies = [gone, hidden, banned, unknown].map((parent, index) => comment(D, 10 + index, root.key, parent.key));
    const thread = buildThread(root.key, { library: [root, ...replies], tombstones: { [gone.key]: 400 }, hiddenKeys: new Set([hidden.key]), blockedKeys: new Set([C]) });
    assert.deepEqual(thread.map(node => [node.key, node.stub]), [[gone.key, 'deleted'], [hidden.key, 'hidden'], [banned.key, 'hidden'], [unknown.key, 'missing']]);
});

test('a deleted, hidden or blocked comment with no shown replies leaves no stub', () => {
    const root = rec(D, U1), gone = comment(A, 1, root.key, root.key), hidden = comment(B, 2, root.key, root.key), banned = comment(C, 3, root.key, root.key);
    const goneReply = comment(D, 4, root.key, gone.key), kept = comment(E, 5, root.key, root.key);
    const options = { tombstones: { [gone.key]: 400, [goneReply.key]: 400 }, hiddenKeys: new Set([hidden.key]), blockedKeys: new Set([C]) };
    assert.deepEqual(buildThread(root.key, { library: [root, gone, hidden, banned, goneReply, kept], ...options }).map(node => [node.key, node.stub]), [[kept.key, null]]);
});

test('a held comment that is deleted, hidden or from a blocked author is not shown, and its replies sit under a stub', () => {
    const root = rec(D, U1), gone = comment(A, 1, root.key, root.key), hidden = comment(B, 2, root.key, root.key), banned = comment(C, 3, root.key, root.key), newer = comment(E, 4, root.key, root.key);
    const replies = [gone, hidden, banned].map((parent, index) => comment(D, 10 + index, root.key, parent.key));
    const options = { library: [root, gone, hidden, banned, newer, ...replies], tombstones: { [gone.key]: gone.event.created_at, [newer.key]: newer.event.created_at - 1 }, hiddenKeys: new Set([hidden.key]), blockedKeys: new Set([C]) };
    assert.deepEqual(buildThread(root.key, options).map(node => [node.key, node.stub]), [[newer.key, null], [gone.key, 'deleted'], [hidden.key, 'hidden'], [banned.key, 'hidden']]);
});

test('comments with a bad root, a bad parent, a parent in another thread, a bad body or a parent cycle are never shown', () => {
    const root = rec(D, U1), other = rec(D, U2), elsewhere = comment(A, 1, other.key, other.key);
    const ok = comment(A, 2, root.key, root.key);
    const badBody = comment(B, 3, root.key, root.key, { content: { ...comment(B, 3, root.key, root.key).content, body: 'x'.repeat(2001) } });
    const badParent = comment(B, 4, root.key, root.key, { content: { ...comment(B, 4, root.key, root.key).content, parent: 'junk' } });
    const crossThread = comment(B, 5, root.key, elsewhere.key);
    const wrongRoot = comment(B, 6, other.key, other.key);
    const loopA = comment(C, 7, root.key, comment(C, 8, root.key, root.key).key), loopB = comment(C, 8, root.key, loopA.key);
    const selfLoop = comment(C, 9, root.key, comment(C, 9, root.key, root.key).key);
    const library = [root, other, elsewhere, ok, badBody, badParent, crossThread, wrongRoot, loopA, loopB, selfLoop];
    assert.deepEqual(shape(buildThread(root.key, { library })), [[ok.key, 0, []]]);
    assert.deepEqual(shape(buildThread(other.key, { library })), [[elsewhere.key, 0, []], [wrongRoot.key, 0, []]]);
});

test('a comment on a record the library does not hold is not shown, and appears once the record arrives', () => {
    const root = rec(D, U1), c1 = comment(A, 1, root.key, root.key);
    assert.deepEqual(buildThread(root.key, { library: [c1] }), []);
    assert.deepEqual(buildThread(root.key, { library: [c1, { ...root, content: { type: 'works' } }] }), []);
    assert.deepEqual(shape(buildThread(root.key, { library: [c1, root] })), [[c1.key, 0, []]]);
});

test('folded comments are placed in the tree flagged folded, with replies under them', () => {
    const root = rec(D, U1), c1 = comment(A, 1, root.key, root.key);
    const spam = comment(B, 2, root.key, root.key), reply = comment(C, 3, root.key, spam.key);
    const thread = buildThread(root.key, { library: [root, c1, reply], folded: [spam] });
    assert.deepEqual(thread.map(node => [node.key, node.folded]), [[c1.key, false], [spam.key, true]]);
    assert.deepEqual(shape(thread[1].children), [[reply.key, 1, []]]);
    assert.equal(thread[1].children[0].folded, false);
});

test('folded comments are read from the pending store as thread items, skipping other kinds and unreadable events', () => {
    const root = rec(D, U1), spam = comment(B, 2, root.key, root.key);
    const pending = [
        { id: spam.key, kind: 'incoming-comment', event: { ...spam.event, content: JSON.stringify(spam.content) }, subjectSlug: 'pest', pubkey: B, receivedFrom: 'peer', receivedAt: 7 },
        { id: `${B}:tacit-entry-${U2}`, kind: 'incoming', event: { pubkey: B, content: '{}' }, pubkey: B },
        { id: `${B}:tacit-comment-bad`, kind: 'incoming-comment', event: { pubkey: B, content: 'not json' }, pubkey: B },
    ];
    const folded = foldedComments(pending);
    assert.deepEqual(folded.map(item => item.key), [spam.key]);
    assert.equal(folded[0].content.body, spam.content.body);
    assert.deepEqual(buildThread(root.key, { library: [root], folded }).map(node => [node.key, node.folded]), [[spam.key, true]]);
});

test('the shown count leaves out stubs and folded comments', () => {
    const root = rec(D, U1), c1 = comment(A, 1, root.key, root.key), spam = comment(B, 2, root.key, root.key);
    const orphan = comment(C, 3, root.key, comment(C, 4, root.key, root.key).key), reply = comment(E, 5, root.key, c1.key);
    assert.equal(shownCount(buildThread(root.key, { library: [root, c1, orphan, reply], folded: [spam] })), 3);
    assert.equal(shownCount([]), 0);
});

test('a comment is not a record: Feed, sharedCount, the import duplicate check and full view leave it out', () => {
    const one = rec(A, U1), two = rec(A, U2), c1 = comment(B, 1, one.key, one.key);
    assert.equal(isRecord(c1.content), false);
    const ctx = { selfKeys: new Set([A]), trustedKeys: new Set() };
    assert.deepEqual(filterFeed([one, c1, two], {}, ctx).map(item => item.key), [one.key, two.key]);
    assert.deepEqual(filterFeed([one, c1, two], { author: 'others' }, ctx), []);
    assert.equal(announcementFor([{ label: 'Pest', slug: 'pest', subscribed: true }], [one, c1, two])[0].sharedCount, 2);
    const existing = existingRecords([one.content, { ...c1.content, subject: 'Pest', information_chunks: 'undefined' }]);
    assert.deepEqual(existing, [{ slug: 'pest', chunk: 'chunk 3f9a' }]);
    assert.equal(resolveFullView([c1], '00000001').status, 'missing');
});

test('cascade targets include the current key\'s comments on the deleted record, but not other keys\', other records\' or others\' comments', () => {
    const record = rec(B, U1), other = rec(B, U2);
    const mineA = comment(A, 1, record.key, record.key), mineB = comment(A, 2, record.key, mineA.key), theirs = comment(C, 3, record.key, record.key);
    const previous = comment(D, 4, record.key, record.key), elsewhere = comment(A, 5, other.key, other.key), myMark = mark(A, record.key);
    const library = [record, other, mineA, mineB, theirs, previous, elsewhere, myMark];
    assert.deepEqual(cascadeTargets(record.key, library, A).map(item => item.key).sort(), [mineA.key, mineB.key, myMark.key].sort());
    assert.deepEqual(cascadeTargets(record.key, [record, theirs, previous], A), []);
});

const signComment = (root, parent, now, body = 'hello') => signer.signEvent(buildCommentTemplate({ root, parent, body, subject: 'Pest' }, now));

test('decideIncoming folds an unknown author\'s comment, but accepts a trusted or own author\'s', async () => {
    const root = rec(B, U1).key, event = await signComment(root, root, 100);
    const base = { held: {}, trustedPubkeys: new Set() };
    assert.deepEqual(decideIncoming(event, base), { action: 'fold' });
    assert.deepEqual(decideIncoming(event, { ...base, pendingCount: 50 }), { action: 'fold' });
    assert.deepEqual(decideIncoming(event, { ...base, trustedPubkeys: new Set([event.pubkey]) }), { action: 'accept' });
});

test('folded comments are capped at 200 per author, separately from the 50 review cap', async () => {
    const root = rec(B, U1).key, event = await signComment(root, root, 100);
    const base = { held: {}, trustedPubkeys: new Set() };
    assert.equal(decideIncoming(event, { ...base, foldedCount: 199 }).action, 'fold');
    assert.deepEqual(decideIncoming(event, { ...base, foldedCount: 200 }), { action: 'drop', reason: 'comment-queue-full' });
    assert.equal(decideIncoming(event, { ...base, pendingCount: 50 }).action, 'fold');
    const review = await signer.signEvent({ kind: 30078, created_at: 100, tags: [['d', `tacit-entry-${U2}`], ['subject', 'Pest']], content: JSON.stringify({ subject: 'Pest', information_chunks: 'x' }) });
    assert.equal(decideIncoming(review, { ...base, foldedCount: 200 }).action, 'review');
    assert.deepEqual(decideIncoming(review, { ...base, pendingCount: 50 }), { action: 'drop', reason: 'queue-full' });
});

test('a newer version of an already folded comment is still folded at the cap', async () => {
    const root = rec(B, U1).key, older = await signComment(root, root, 100), key = recordKey(older);
    const newer = await signer.signEvent({ ...buildCommentTemplate({ root, parent: root, body: 'hello again', subject: 'Pest' }, 101), tags: older.tags });
    assert.equal(recordKey(newer), key);
    assert.deepEqual(decideIncoming(newer, { held: {}, trustedPubkeys: new Set(), pendingIncoming: { [key]: older }, foldedCount: 200 }), { action: 'fold' });
});

test('comments still drop when blocked, hidden, tombstoned or older', async () => {
    const root = rec(B, U1).key, event = await signComment(root, root, 100), key = recordKey(event);
    const base = { held: {}, trustedPubkeys: new Set() };
    assert.equal(decideIncoming(event, { ...base, blockedPubkeys: new Set([event.pubkey]) }).reason, 'blocked');
    assert.equal(decideIncoming(event, { ...base, hiddenKeys: new Set([key]) }).reason, 'hidden');
    assert.equal(decideIncoming(event, { ...base, tombstones: { [key]: 100 } }).reason, 'tombstoned');
    assert.equal(decideIncoming(event, { ...base, held: { [key]: event } }).reason, 'duplicate-or-older');
    assert.equal(decideIncoming(event, { ...base, pendingIncoming: { [key]: event } }).reason, 'duplicate-or-older');
});

test('comments and their deletion tombstones round-trip through backup', async () => {
    const root = rec(B, U1).key, kept = await signComment(root, root, 100), removed = await signComment(root, root, 100, 'bye');
    const deletion = await signer.signEvent(buildDeletionTemplate(removed, 200));
    const item = event => ({ key: recordKey(event), event, visibility: 'shared', subjectSlug: 'pest', content: JSON.parse(event.content) });
    const backup = parseBackup(JSON.stringify(buildBackup({ library: [item(kept)], tombstones: [{ key: recordKey(removed), created_at: 200, event: deletion }], trust: [], subjects: [] })));
    const plan = restoreBackup(backup, { library: [], tombstones: [], trust: [], hiddenKeys: [], subjects: [] }, 5000);
    assert.deepEqual(plan.puts.library.map(r => [r.key, r.event.id, r.visibility, r.subjectSlug]), [[recordKey(kept), kept.id, 'shared', 'pest']]);
    assert.deepEqual(plan.puts.tombstones.map(entry => entry.key), [recordKey(removed)]);
});

const chain = (root, length) => {
    const nodes = [];
    for (let n = 1; n <= length; n++) nodes.push(comment(n % 2 ? A : B, n, root.key, n === 1 ? root.key : nodes[n - 2].key));
    return nodes;
};

test('rows indent one step per level up to the cap; deeper replies stay at the cap and name the parent author', () => {
    const root = rec(D, U1), nodes = chain(root, 7);
    const thread = buildThread(root.key, { library: [root, ...nodes] });
    const narrow = flattenThread(thread, { maxIndent: 4 });
    assert.deepEqual(narrow.map(row => row.indent), [0, 1, 2, 3, 4, 4, 4]);
    assert.deepEqual(narrow.map(row => row.replyingTo), [null, null, null, null, null, nodes[4].event.pubkey, nodes[5].event.pubkey]);
    const wide = flattenThread(thread, { maxIndent: 8 });
    assert.deepEqual(wide.map(row => row.indent), [0, 1, 2, 3, 4, 5, 6]);
    assert.deepEqual(wide.map(row => row.replyingTo), Array(7).fill(null));
    assert.deepEqual(flattenThread(buildThread(root.key, { library: [root, ...chain(root, 10)] }), { maxIndent: 8 }).slice(8).map(row => [row.indent, row.replyingTo !== null]), [[8, false], [8, true]]);
});

test('a reply under a stub has no author to name, so it shows no "replying to"', () => {
    const root = rec(D, U1), lost = comment(A, 1, root.key, root.key);
    const rows = flattenThread(buildThread(root.key, { library: [root, comment(B, 2, root.key, lost.key)] }), { maxIndent: 0 });
    assert.deepEqual(rows.map(row => [row.indent, row.replyingTo]), [[0, null], [0, null]]);
});

test('a collapsed comment hides its whole subtree and reports how many shown comments it hides', () => {
    const root = rec(D, U1), [c1, c2, c3] = chain(root, 3), sibling = comment(E, 4, root.key, c1.key), spam = comment(C, 5, root.key, c2.key), top = comment(E, 6, root.key, root.key);
    const thread = buildThread(root.key, { library: [root, c1, c2, c3, sibling, top], folded: [spam] });
    const open = flattenThread(thread, { maxIndent: 4 });
    assert.deepEqual(open.map(row => [row.key, row.replies, row.collapsed]), [[c1.key, 3, false], [c2.key, 1, false], [c3.key, 0, false], [spam.key, 0, false], [sibling.key, 0, false], [top.key, 0, false]]);
    const closed = flattenThread(thread, { maxIndent: 4, collapsed: { [c1.key]: true } });
    assert.deepEqual(closed.map(row => [row.key, row.replies, row.collapsed]), [[c1.key, 3, true], [top.key, 0, false]]);
    const inner = flattenThread(thread, { maxIndent: 4, collapsed: { [c2.key]: true } });
    assert.deepEqual(inner.map(row => [row.key, row.collapsed]), [[c1.key, false], [c2.key, true], [sibling.key, false], [top.key, false]]);
});

test('a comment whose only replies are folded has no replies to collapse', () => {
    const root = rec(D, U1), c1 = comment(A, 1, root.key, root.key), spam = comment(B, 2, root.key, c1.key);
    assert.equal(flattenThread(buildThread(root.key, { library: [root, c1], folded: [spam] }), { maxIndent: 4 })[0].replies, 0);
});
