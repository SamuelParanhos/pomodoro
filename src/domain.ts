export type Preset = {
    id: string;
    nome: string;
    foco: number;
    curta: number;
    longa: number;
    ciclos: number;
    criadoEm: number;
    atualizadoEm: number;
};
export const estados = ['aFazer', 'emExecucao', 'concluida', 'cancelada', 'backlog'] as const;
export const prioridades = ['alta', 'media', 'baixa'] as const;
export const nomesEstado = {
    backlog: 'Backlog',
    aFazer: 'A fazer',
    emExecucao: 'Em execução',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
};
export const nomesPrioridade = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
export type Task = {
    id: string;
    titulo: string;
    estado: (typeof estados)[number];
    prioridade: (typeof prioridades)[number];
    criadaEm: number;
    atualizadaEm: number;
};
export type Session = {
    id: string;
    presetId: string;
    snapshot: Preset;
    etapa: number;
    completos: number;
    status: 'emAndamento' | 'pausada' | 'concluida';
    inicio: number;
    fim: number;
    restante: number;
    pausadaEm: number | null;
};
export function phase(s: Session) {
    return s.etapa % 2 === 0 ? 'foco' : s.etapa === s.snapshot.ciclos * 2 - 1 ? 'longa' : 'curta';
}
export function duration(s: Session) {
    return s.snapshot[phase(s)] * 60000;
}
export function start(p: Preset, now = Date.now()): Session {
    return {
        id: crypto.randomUUID(),
        presetId: p.id,
        snapshot: { ...p },
        etapa: 0,
        completos: 0,
        status: 'emAndamento',
        inicio: now,
        fim: now + p.foco * 60000,
        restante: p.foco * 60000,
        pausadaEm: null,
    };
}
export function advance(s: Session, at: number, skipped = false): Session {
    if (s.status === 'concluida') return s;
    const next = { ...s, completos: s.completos + (!skipped && phase(s) === 'foco' ? 1 : 0) };
    if (s.etapa + 1 >= s.snapshot.ciclos * 2)
        return { ...next, status: 'concluida', restante: 0, fim: at };
    next.etapa++;
    next.inicio = at;
    next.restante = duration(next);
    next.fim = at + next.restante;
    return next;
}
export function reconcile(s: Session, now = Date.now()): Session {
    let next = s;
    while (next.status === 'emAndamento' && next.fim <= now) next = advance(next, next.fim);
    return next;
}
export function sortTasks(tasks: Task[]) {
    return [...tasks].sort(
        (a, b) =>
            prioridades.indexOf(a.prioridade) - prioridades.indexOf(b.prioridade) ||
            estados.indexOf(a.estado) - estados.indexOf(b.estado) ||
            a.criadaEm - b.criadaEm,
    );
}
export function validPreset(p: Preset): boolean {
    return (
        !!p &&
        typeof p.id === 'string' &&
        typeof p.nome === 'string' &&
        p.nome.trim().length > 0 &&
        p.nome.length <= 40 &&
        (['foco', 'curta', 'longa', 'ciclos'] as const).every(
            (k) =>
                Number.isInteger(p[k]) &&
                p[k] >= 1 &&
                p[k] <= (k === 'foco' ? 120 : k === 'ciclos' ? 12 : 60),
        )
    );
}
export function validTask(t: Task): boolean {
    return (
        !!t &&
        typeof t.id === 'string' &&
        typeof t.titulo === 'string' &&
        t.titulo.trim().length > 0 &&
        t.titulo.length <= 100 &&
        estados.includes(t.estado) &&
        prioridades.includes(t.prioridade)
    );
}
export function validSession(s: Session): boolean {
    return (
        !!s &&
        validPreset(s.snapshot) &&
        s.presetId === s.snapshot.id &&
        ['emAndamento', 'pausada', 'concluida'].includes(s.status) &&
        Number.isInteger(s.etapa) &&
        s.etapa >= 0 &&
        s.etapa < s.snapshot.ciclos * 2 &&
        [s.inicio, s.fim, s.restante, s.completos].every(Number.isFinite) &&
        s.restante >= 0 &&
        s.completos >= 0
    );
}
