import { read } from './storage';

export type Theme = 'light' | 'dark';

const systemTheme: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

export const initialTheme = read<Theme>(
    'pomodoro.tema',
    systemTheme,
    (value) => value === 'light' || value === 'dark',
);

export function applyTheme(theme: Theme) {
    document.documentElement.dataset.theme = theme;
    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#151d19' : '#f6f5ef');
}

applyTheme(initialTheme);
