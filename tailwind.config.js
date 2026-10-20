const token = name => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
    content: ['./index.html', './tacit-*.js'],
    theme: {
        extend: {
            screens: { desk: '900px' },
            colors: Object.fromEntries(['page', 'surface', 'surface2', 'line', 'ink', 'muted', 'accent', 'accent-ink', 'accent-soft', 'danger', 'danger-soft', 'success', 'success-soft', 'warn', 'warn-soft'].map(name => [name, token(name)])),
            borderRadius: { card: 'var(--r-card)', ctl: 'var(--r-ctl)' },
            fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] },
        },
    },
};
