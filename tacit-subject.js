export const slugify = label => String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function addSubject(subjects, label) {
    const trimmed = String(label).trim();
    const slug = slugify(trimmed);
    if (!slug) throw new Error('Subject needs at least one letter or digit.');
    const existing = subjects.find(subject => subject.slug === slug);
    if (existing) return { subjects, subject: existing, created: false };
    const subject = { label: trimmed, slug, subscribed: false };
    return { subjects: [...subjects, subject], subject, created: true };
}
