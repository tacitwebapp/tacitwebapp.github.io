const token = name => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
    content: ['./index.html', './src/*.js'],
    theme: {
        colors: { transparent: 'transparent', current: 'currentColor', inherit: 'inherit', ...Object.fromEntries(['page', 'surface', 'surface2', 'line', 'ink', 'muted', 'accent', 'accent-ink', 'accent-soft', 'danger', 'danger-soft', 'success', 'success-soft', 'warn', 'warn-soft'].map(name => [name, token(name)])) },
        borderColor: ({ theme }) => ({ ...theme('colors'), DEFAULT: token('line') }),
        extend: {
            screens: { desk: '900px' },
            borderRadius: { card: 'var(--r-card)', ctl: 'var(--r-ctl)' },
            fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] },
        },
    },
};
