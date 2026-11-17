import {
    validPreset,
    validTask,
    validSession,
    type Preset,
    type Task,
    type Session,
} from './domain';
export const storageErrors: string[] = [];
export function read<T>(key: string, fallback: T, validate: (v: T) => boolean): T {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        const value = JSON.parse(raw) as T;
        if (!validate(value)) throw Error();
        return value;
    } catch {
        storageErrors.push(
            `Não foi possível carregar ${key}. Os dados salvos foram preservados. Você pode descartá-los abaixo.`,
        );
        return fallback;
    }
}
export const initialPresets = read<Preset[]>(
    'pomodoro.presets',
    [
        {
            id: 'classico',
            nome: 'Pomodoro clássico',
            foco: 25,
            curta: 5,
            longa: 15,
            ciclos: 4,
            criadoEm: Date.now(),
            atualizadoEm: Date.now(),
        },
    ],
    (a) => Array.isArray(a) && a.every(validPreset),
);
export const initialTasks = read<Task[]>(
    'pomodoro.tarefas',
    [],
    (a) => Array.isArray(a) && a.every(validTask),
);
export const initialSession = read<Session | null>(
    'pomodoro.sessaoAtiva',
    null,
    (s) => s === null || validSession(s),
);
export function persist(key: string, value: unknown) {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
}
