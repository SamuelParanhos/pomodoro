import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    advance,
    reconcile,
    start,
    phase,
    sortTasks,
    estados,
    prioridades,
    nomesEstado,
    nomesPrioridade,
    type Preset,
    type Task,
    type Session,
} from './domain';
import { initialPresets, initialTasks, initialSession, persist, storageErrors } from './storage';
import { applyTheme, initialTheme, type Theme } from './theme';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DeleteDialog } from './components/DeleteDialog';
import { usePhaseAlert } from './hooks/usePhaseAlert';
import { AmbientPlayer } from './components/AmbientPlayer';
import './style.css';
type Editor = { kind: 'preset'; value?: Preset } | { kind: 'task'; value?: Task };
type Deletion = { kind: 'preset'; value: Preset } | { kind: 'task'; value: Task };

type SessionAction = 'discard' | 'restart' | 'end' | 'invalid';
const actionContent = {
    discard: {
        title: 'Descartar sessão?',
        description:
            'A sessão restaurada será encerrada. Seus temporizadores e tarefas serão mantidos.',
        confirmLabel: 'Descartar sessão',
    },
    restart: {
        title: 'Reiniciar ciclos?',
        description:
            'A sessão voltará ao primeiro ciclo de foco, com o tempo completo do temporizador.',
        confirmLabel: 'Reiniciar ciclos',
    },
    end: {
        title: 'Encerrar sessão?',
        description:
            'A sessão atual será encerrada. Você poderá iniciar uma nova sessão quando quiser.',
        confirmLabel: 'Encerrar sessão',
    },
    invalid: {
        title: 'Descartar dados inválidos?',
        description:
            'Somente os dados que não puderam ser carregados serão removidos. Essa ação não pode ser desfeita.',
        confirmLabel: 'Descartar dados',
    },
};

function App() {
    const [sessionAction, setSessionAction] = useState<SessionAction | null>(null);
    const [deletion, setDeletion] = useState<Deletion | null>(null);
    const [presets, setPresets] = useState(initialPresets),
        [tasks, setTasks] = useState(initialTasks);
    const [session, setSession] = useState<Session | null>(() =>
        initialSession ? reconcile(initialSession) : null,
    );
    const [selected, setSelected] = useState(
        initialSession?.presetId ?? initialPresets[0]?.id ?? '',
    );
    const [now, setNow] = useState(Date.now()),
        [editor, setEditor] = useState<Editor | null>(null);
    const [restored, setRestored] = useState(!!initialSession),
        [error, setError] = useState(storageErrors.join(' '));
    const [theme, setTheme] = useState<Theme>(initialTheme);
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    function toggleTheme() {
        const next = theme === 'dark' ? 'light' : 'dark';
        save('pomodoro.tema', next, () => setTheme(next));
    }

    const { sound, ready, unlock, beep, toggleSound } = usePhaseAlert(setError);
    function save(key: string, value: unknown, apply: () => void) {
        try {
            persist(key, value);
            apply();
            return true;
        } catch {
            setError(
                'Não foi possível salvar no navegador. Verifique as permissões e o espaço do armazenamento e tente novamente.',
            );
            return false;
        }
    }
    function updateSession(s: Session | null) {
        save('pomodoro.sessaoAtiva', s, () => setSession(s));
    }
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        if (!session || session.status !== 'emAndamento') return;
        const next = reconcile(session, now);
        if (next !== session) {
            void beep();
            updateSession(next);
        }
    }, [now, session]);
    useEffect(() => {
        if (initialSession) {
            try {
                persist('pomodoro.sessaoAtiva', reconcile(initialSession));
            } catch {
                setError('Falha ao salvar a sessão restaurada.');
            }
        }
    }, []);
    const preset = presets.find((p) => p.id === selected) ?? presets[0];
    const active = session && session.status !== 'concluida';
    const remaining = session
        ? session.status === 'pausada'
            ? session.restante
            : session.status === 'concluida'
              ? 0
              : Math.max(0, session.fim - now)
        : (preset?.foco ?? 25) * 60000;
    const seconds = Math.ceil(remaining / 1000),
        clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    const currentPhase = session ? phase(session) : 'foco';
    useEffect(() => {
        document.title = `${active ? clock + ' · ' : ''}Pomodoro — seu espaço de foco`;
    }, [clock, active]);
    function select(p: Preset) {
        setSelected(p.id);
        if (active && session.presetId !== p.id) {
            void unlock();
            updateSession(start(p));
            setRestored(false);
        }
    }
    function toggle() {
        void unlock();
        if (!active) {
            if (preset) updateSession(start(preset));
            setRestored(false);
        } else {
            const s = reconcile(session);
            if (s.status === 'concluida') {
                updateSession(s);
                return;
            }
            updateSession(
                s.status === 'pausada'
                    ? {
                          ...s,
                          status: 'emAndamento',
                          inicio: Date.now(),
                          fim: Date.now() + s.restante,
                          pausadaEm: null,
                      }
                    : {
                          ...s,
                          status: 'pausada',
                          restante: Math.max(0, s.fim - Date.now()),
                          pausadaEm: Date.now(),
                      },
            );
        }
    }
    function removePreset(p: Preset) {
        if (active && session.presetId === p.id) return;
        setDeletion({ kind: 'preset', value: p });
    }

    function confirmDeletion(): boolean {
        if (!deletion) return false;
        if (deletion.kind === 'preset') {
            if (active && session.presetId === deletion.value.id) return false;
            const next = presets.filter((p) => p.id !== deletion.value.id);
            return save('pomodoro.presets', next, () => {
                setPresets(next);
                if (selected === deletion.value.id) setSelected(next[0]?.id ?? '');
                setDeletion(null);
            });
        }
        const next = tasks.filter((t) => t.id !== deletion.value.id);
        return save('pomodoro.tarefas', next, () => {
            setTasks(next);
            setDeletion(null);
        });
    }

    function confirmSessionAction(): boolean {
        if (!sessionAction) return false;
        if (sessionAction === 'invalid') {
            try {
                for (const key of [
                    'pomodoro.presets',
                    'pomodoro.tarefas',
                    'pomodoro.sessaoAtiva',
                    'pomodoro.tema',
                    'pomodoro.ambiente',
                ]) {
                    if (storageErrors.some((message) => message.includes(key)))
                        localStorage.removeItem(key);
                }
                location.reload();
                return true;
            } catch {
                setError('Não foi possível descartar os dados.');
                return false;
            }
        }
        if (sessionAction === 'restart') {
            if (!session || session.status === 'concluida') {
                setSessionAction(null);
                return true;
            }
            const next = start(session.snapshot);
            if (session.status === 'pausada') next.status = 'pausada';
            return save('pomodoro.sessaoAtiva', next, () => {
                setSession(next);
                setSessionAction(null);
            });
        }
        return save('pomodoro.sessaoAtiva', null, () => {
            setSession(null);
            setRestored(false);
            setSessionAction(null);
        });
    }

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editor) return;
        const data = new FormData(e.currentTarget),
            name = String(data.get('nome') ?? '').trim();
        if (!name) {
            setError('Preencha o nome ou título sem usar apenas espaços.');
            return;
        }
        const time = Date.now();
        if (editor.kind === 'preset') {
            if (active && editor.value?.id === session.presetId) return;
            const p: Preset = {
                id: editor.value?.id ?? crypto.randomUUID(),
                nome: name,
                foco: Number(data.get('foco')),
                curta: Number(data.get('curta')),
                longa: Number(data.get('longa')),
                ciclos: Number(data.get('ciclos')),
                criadoEm: editor.value?.criadoEm ?? time,
                atualizadoEm: time,
            };
            const next = editor.value
                ? presets.map((x) => (x.id === p.id ? p : x))
                : [...presets, p];
            save('pomodoro.presets', next, () => {
                setPresets(next);
                if (!preset) setSelected(p.id);
                setEditor(null);
            });
        } else {
            const t: Task = {
                id: editor.value?.id ?? crypto.randomUUID(),
                titulo: name,
                estado: data.get('estado') as Task['estado'],
                prioridade: data.get('prioridade') as Task['prioridade'],
                criadaEm: editor.value?.criadaEm ?? time,
                atualizadaEm: time,
            };
            const next = editor.value ? tasks.map((x) => (x.id === t.id ? t : x)) : [...tasks, t];
            save('pomodoro.tarefas', next, () => {
                setTasks(next);
                setEditor(null);
            });
        }
    }
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        if (editor) dialog.current?.showModal();
        else dialog.current?.close();
    }, [editor]);
    return (
        <>
            <header>
                <a className="brand" href="./">
                    <span className="logo">◷</span> Pomodoro
                </a>
                <span className="header-note">MENOS DISTRAÇÃO. MAIS PRESENÇA.</span>
                <div className="header-actions">
                    <span className="local">
                        <i /> Salvo neste navegador
                    </span>
                    <button
                        className="theme-toggle"
                        type="button"
                        onClick={toggleTheme}
                        aria-label="Modo escuro"
                        aria-pressed={theme === 'dark'}
                        title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                    >
                        <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
                        {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                    </button>
                </div>
            </header>
            <main>
                <div className="intro">
                    <div className="eyebrow">SEU ESPAÇO DE FOCO</div>
                    <h1>Uma coisa de cada vez.</h1>
                    <p>Escolha seu ritmo, respire fundo e comece.</p>
                </div>
                {error && (
                    <div role="alert" className="notice">
                        {error}{' '}
                        {storageErrors.length > 0 && (
                            <button onClick={() => setSessionAction('invalid')}>
                                Descartar dados inválidos
                            </button>
                        )}
                        <button onClick={() => setError('')}>Fechar aviso</button>
                    </div>
                )}
                {restored && (
                    <div className="notice" role="status">
                        {session?.status === 'concluida'
                            ? 'Sua sessão foi concluída enquanto você esteve fora.'
                            : 'Sua sessão foi restaurada. Continue de onde parou.'}
                        <button onClick={() => setSessionAction('discard')}>
                            Descartar sessão
                        </button>
                        <button
                            onClick={() => {
                                void unlock();
                                setRestored(false);
                            }}
                        >
                            Entendi · ativar áudio
                        </button>
                    </div>
                )}
                <div className="workspace">
                    <section className="focus-area">
                        <div className="timer card">
                            <div className="timer-top">
                                <span className="tag">
                                    ◉{' '}
                                    {active
                                        ? session.status === 'pausada'
                                            ? 'SESSÃO PAUSADA'
                                            : 'SESSÃO EM ANDAMENTO'
                                        : session?.status === 'concluida'
                                          ? 'SESSÃO CONCLUÍDA'
                                          : 'PRONTO PARA COMEÇAR'}
                                </span>
                                <div className="sound-controls">
                                    <button
                                        className="sound"
                                        onClick={() => void toggleSound()}
                                        aria-pressed={sound && ready}
                                    >
                                        {sound && ready
                                            ? 'Som ativado ♪'
                                            : !sound
                                              ? 'Som desativado'
                                              : 'Ativar som'}
                                    </button>
                                </div>
                            </div>
                            <div className="phases">
                                {(['foco', 'curta', 'longa'] as const).map((p, i) => (
                                    <span key={p} className={currentPhase === p ? 'current' : ''}>
                                        {['Foco', 'Pausa curta', 'Pausa longa'][i]}
                                    </span>
                                ))}
                            </div>
                            <div className="clock" role="timer" aria-label={`${clock} restantes`}>
                                {clock}
                            </div>
                            <p className="timer-caption">
                                {session?.status === 'concluida'
                                    ? 'Bom trabalho. Hora de respirar.'
                                    : currentPhase === 'foco'
                                      ? 'Este momento é seu. Concentre-se no que importa.'
                                      : 'Dê um respiro. Sua mente também precisa descansar.'}
                            </p>
                            <div className="cycle-dots">
                                {Array.from(
                                    { length: session?.snapshot.ciclos ?? preset?.ciclos ?? 4 },
                                    (_, i) => (
                                        <span
                                            key={i}
                                            className={
                                                session && i < session.completos
                                                    ? 'filled'
                                                    : session && i === Math.floor(session.etapa / 2)
                                                      ? 'outlined'
                                                      : ''
                                            }
                                        />
                                    ),
                                )}
                            </div>
                            <p className="cycle-label">
                                Ciclo {session ? Math.floor(session.etapa / 2) + 1 : 1} de{' '}
                                {session?.snapshot.ciclos ?? preset?.ciclos ?? 4} ·{' '}
                                {session?.completos ?? 0} focos concluídos
                            </p>
                            <div className="primary-controls">
                                <button
                                    className="primary"
                                    disabled={!preset && !active}
                                    onClick={toggle}
                                >
                                    {active
                                        ? session.status === 'pausada'
                                            ? '▶ Retomar foco'
                                            : 'Ⅱ Pausar sessão'
                                        : '▶ Iniciar sessão'}
                                </button>
                                <button
                                    disabled={!active}
                                    onClick={() => {
                                        if (session)
                                            updateSession(
                                                advance(reconcile(session), Date.now(), true),
                                            );
                                    }}
                                    aria-label="Pular fase"
                                    title="Pular fase"
                                >
                                    Pular fase ⏭
                                </button>
                            </div>
                            <div className="minor-controls">
                                <button
                                    disabled={!active}
                                    onClick={() => setSessionAction('restart')}
                                >
                                    ↺ Reiniciar ciclos
                                </button>
                                <span>·</span>
                                <button disabled={!session} onClick={() => setSessionAction('end')}>
                                    Encerrar sessão
                                </button>
                            </div>
                        </div>
                        <AmbientPlayer />
                        <section className="presets">
                            <div className="section-heading">
                                <div>
                                    <h2>Seu ritmo</h2>
                                    <p>Temporizadores para cada momento.</p>
                                </div>
                                <button
                                    className="text-button"
                                    onClick={() => setEditor({ kind: 'preset' })}
                                >
                                    + Novo temporizador
                                </button>
                            </div>
                            <div className="preset-list">
                                {presets.map((p) => {
                                    const locked = !!active && session.presetId === p.id;
                                    return (
                                        <article
                                            key={p.id}
                                            className={`preset card ${preset?.id === p.id ? 'selected' : ''}`}
                                        >
                                            <button
                                                className="preset-select"
                                                onClick={() => select(p)}
                                            >
                                                <span className="preset-icon">◷</span>
                                                <span>
                                                    <strong>{p.nome}</strong>
                                                    <small>
                                                        {p.foco} min foco · {p.curta} min pausa
                                                    </small>
                                                    <small>
                                                        {p.ciclos} ciclos · {p.longa} min pausa
                                                        longa
                                                    </small>
                                                </span>
                                                <span className="radio">
                                                    {preset?.id === p.id ? '●' : '○'}
                                                </span>
                                            </button>
                                            <div
                                                className="preset-actions"
                                                title={
                                                    locked
                                                        ? 'Encerre a sessão para editar ou excluir.'
                                                        : undefined
                                                }
                                            >
                                                {locked && (
                                                    <small>Em uso · encerre para alterar</small>
                                                )}
                                                <button
                                                    disabled={locked}
                                                    onClick={() =>
                                                        setEditor({ kind: 'preset', value: p })
                                                    }
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    disabled={locked}
                                                    onClick={() => removePreset(p)}
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                                {!presets.length && (
                                    <p className="empty">
                                        Crie seu primeiro temporizador para começar.
                                    </p>
                                )}
                            </div>
                        </section>
                        <div className="tip">
                            <span>✧</span>
                            <p>
                                <strong>Pequenos intervalos, grandes ideias.</strong>
                                <br />
                                Nas pausas, levante, beba água e descanse os olhos.
                            </p>
                        </div>
                    </section>
                    <aside className="tasks card">
                        <div className="section-heading">
                            <div>
                                <span className="eyebrow">UM PASSO POR VEZ</span>
                                <h2>
                                    Minhas tarefas <span className="count">{tasks.length}</span>
                                </h2>
                            </div>
                            <button
                                className="add-task"
                                aria-label="Nova tarefa"
                                onClick={() => setEditor({ kind: 'task' })}
                            >
                                +
                            </button>
                        </div>
                        <p className="task-explainer">Tire da cabeça. Coloque no papel.</p>
                        <div className="task-divider">
                            PRIORIDADE <span>Alta → baixa</span>
                        </div>
                        <div className="task-list">
                            {sortTasks(tasks).map((t) => (
                                <article
                                    className={`task ${t.estado === 'concluida' || t.estado === 'cancelada' ? 'done' : ''}`}
                                    key={t.id}
                                >
                                    <div className="task-title">
                                        <span className={`status-icon ${t.estado}`}>
                                            {t.estado === 'concluida'
                                                ? '✓'
                                                : t.estado === 'cancelada'
                                                  ? '×'
                                                  : t.estado === 'emExecucao'
                                                    ? '◔'
                                                    : '○'}
                                        </span>
                                        <h3>{t.titulo}</h3>
                                    </div>
                                    <div className="task-meta">
                                        <span className={`priority ${t.prioridade}`}>
                                            ● {nomesPrioridade[t.prioridade]}
                                        </span>
                                        <span>{nomesEstado[t.estado]}</span>
                                    </div>
                                    <div className="task-actions">
                                        <button
                                            onClick={() => setEditor({ kind: 'task', value: t })}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => setDeletion({ kind: 'task', value: t })}
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </article>
                            ))}
                            {!tasks.length && (
                                <div className="empty">
                                    <div className="empty-icon">☷</div>
                                    <h3>Abra espaço para o foco.</h3>
                                    <p>
                                        Adicione suas tarefas de estudo
                                        <br />e avance uma de cada vez.
                                    </p>
                                    <button
                                        className="text-button"
                                        onClick={() => setEditor({ kind: 'task' })}
                                    >
                                        + Criar primeira tarefa
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="task-footer">
                            {tasks.filter((t) => t.estado === 'concluida').length} de {tasks.length}{' '}
                            tarefas concluídas
                            <div className="progress">
                                <span
                                    style={{
                                        width: `${tasks.length ? (tasks.filter((t) => t.estado === 'concluida').length / tasks.length) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </aside>
                </div>
                <footer>
                    <span>Feito para um dia com mais intenção.</span>
                    <span>Seus dados ficam apenas neste navegador.</span>
                </footer>
            </main>
            {sessionAction && (
                <ConfirmDialog
                    {...actionContent[sessionAction]}
                    onCancel={() => setSessionAction(null)}
                    onConfirm={confirmSessionAction}
                />
            )}
            {deletion && (
                <DeleteDialog
                    kind={deletion.kind === 'task' ? 'tarefa' : 'temporizador'}
                    name={deletion.kind === 'task' ? deletion.value.titulo : deletion.value.nome}
                    onCancel={() => setDeletion(null)}
                    onConfirm={confirmDeletion}
                />
            )}
            <dialog ref={dialog} onCancel={() => setEditor(null)} onClose={() => setEditor(null)}>
                {editor && (
                    <form onSubmit={submit}>
                        <div className="section-heading">
                            <h2>
                                {editor.value ? 'Editar' : 'Novo'}{' '}
                                {editor.kind === 'preset' ? 'temporizador' : 'tarefa'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setEditor(null)}
                                aria-label="Fechar formulário"
                            >
                                ×
                            </button>
                        </div>
                        <label>
                            {editor.kind === 'preset' ? 'Nome' : 'Título'}
                            <input
                                name="nome"
                                autoFocus
                                required
                                onInput={(e) =>
                                    e.currentTarget.setCustomValidity(
                                        e.currentTarget.value.trim()
                                            ? ''
                                            : 'Preencha este campo sem usar apenas espaços.',
                                    )
                                }
                                maxLength={editor.kind === 'preset' ? 40 : 100}
                                defaultValue={
                                    editor.kind === 'preset'
                                        ? editor.value?.nome
                                        : editor.value?.titulo
                                }
                                placeholder={
                                    editor.kind === 'preset'
                                        ? 'Ex.: Estudo profundo'
                                        : 'O que você quer fazer?'
                                }
                            />
                        </label>
                        {editor.kind === 'preset' ? (
                            <div className="form-grid">
                                {(['foco', 'curta', 'ciclos', 'longa'] as const).map((k, i) => (
                                    <label key={k}>
                                        {
                                            [
                                                'Foco (minutos)',
                                                'Pausa curta (minutos)',
                                                'Quantidade de ciclos',
                                                'Pausa longa (minutos)',
                                            ][i]
                                        }
                                        <input
                                            type="number"
                                            name={k}
                                            required
                                            min="1"
                                            max={k === 'foco' ? 120 : k === 'ciclos' ? 12 : 60}
                                            step="1"
                                            defaultValue={
                                                editor.value?.[k] ??
                                                { foco: 25, curta: 5, ciclos: 4, longa: 15 }[k]
                                            }
                                        />
                                        <small>
                                            Entre 1 e{' '}
                                            {k === 'foco' ? 120 : k === 'ciclos' ? 12 : 60}.
                                        </small>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <>
                                <label>
                                    Estado
                                    <select
                                        name="estado"
                                        defaultValue={editor.value?.estado ?? 'backlog'}
                                    >
                                        {['backlog', ...estados.filter((s) => s !== 'backlog')].map(
                                            (s) => (
                                                <option key={s} value={s}>
                                                    {nomesEstado[s as Task['estado']]}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </label>
                                <label>
                                    Prioridade
                                    <select
                                        name="prioridade"
                                        defaultValue={editor.value?.prioridade ?? 'media'}
                                    >
                                        {prioridades.map((p) => (
                                            <option key={p} value={p}>
                                                {nomesPrioridade[p]}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </>
                        )}
                        <div className="form-actions">
                            <button type="button" onClick={() => setEditor(null)}>
                                Cancelar
                            </button>
                            <button className="primary" type="submit">
                                Salvar {editor.kind === 'preset' ? 'temporizador' : 'tarefa'}
                            </button>
                        </div>
                    </form>
                )}
            </dialog>
        </>
    );
}
createRoot(document.getElementById('root')!).render(<App />);
