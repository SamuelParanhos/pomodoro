import { useEffect, useRef, useState } from 'react';
import {
    AmbientAudio,
    ambientNames,
    validAmbientSettings,
    type AmbientKind,
    type AmbientSettings,
} from '../ambient';
import { persist, read } from '../storage';

const initialSettings = read<AmbientSettings>(
    'pomodoro.ambiente',
    { kind: 'rain', volume: 35 },
    validAmbientSettings,
);

export function AmbientPlayer() {
    const [expanded, setExpanded] = useState(false);
    const [settings, setSettings] = useState(initialSettings);
    const [playing, setPlaying] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const engine = useRef<AmbientAudio | null>(null);
    if (!engine.current) engine.current = new AmbientAudio(setPlaying);
    useEffect(() => () => engine.current?.dispose(), []);

    function save(next: AmbientSettings) {
        try {
            persist('pomodoro.ambiente', next);
            setSettings(next);
            setError('');
            return true;
        } catch {
            setError('Não foi possível salvar as preferências do som ambiente.');
            return false;
        }
    }

    async function play(kind = settings.kind) {
        setBusy(true);
        try {
            await engine.current!.play(kind, settings.volume);
            setError('');
        } catch {
            setError(
                'Não foi possível reproduzir o ambiente. Tente tocar novamente e confira o volume do dispositivo.',
            );
        } finally {
            setBusy(false);
        }
    }

    async function toggle() {
        if (!playing) return play();
        setBusy(true);
        try {
            await engine.current!.pause();
        } catch {
            setError('Não foi possível pausar o som ambiente. Tente novamente.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="ambient card" aria-labelledby="ambient-title">
            <div className="ambient-toolbar">
                <button
                    type="button"
                    className="ambient-expand"
                    aria-expanded={expanded}
                    aria-controls="ambient-options"
                    onClick={() => setExpanded(!expanded)}
                >
                    <span className="ambient-heading">
                        <span id="ambient-title">Som ambiente</span>
                        <span className="ambient-summary">
                            {ambientNames[settings.kind]} · {settings.volume}%
                        </span>
                    </span>
                    <span className="ambient-chevron" aria-hidden="true">
                        {expanded ? '⌃' : '⌄'}
                    </span>
                </button>
                <button
                    type="button"
                    className="ambient-play"
                    disabled={busy}
                    aria-pressed={playing}
                    onClick={() => void toggle()}
                >
                    {busy ? 'Aguarde…' : playing ? 'Ⅱ Pausar ambiente' : '▶ Tocar ambiente'}
                </button>
            </div>
            <div id="ambient-options" hidden={!expanded}>
                <div className="ambient-controls">
                    <label>
                        Ambiente
                        <select
                            value={settings.kind}
                            disabled={busy}
                            onChange={(event) => {
                                const kind = event.target.value as AmbientKind;
                                if (save({ ...settings, kind }) && playing) void play(kind);
                            }}
                        >
                            {Object.entries(ambientNames).map(([kind, name]) => (
                                <option key={kind} value={kind}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="ambient-volume">
                        <span>
                            Volume <output>{settings.volume}%</output>
                        </span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={settings.volume}
                            aria-label="Volume do som ambiente"
                            aria-valuetext={`${settings.volume}%`}
                            onChange={(event) => {
                                const volume = Number(event.target.value);
                                if (save({ ...settings, volume }))
                                    engine.current!.setVolume(volume);
                            }}
                        />
                    </label>
                </div>
                <p className="ambient-note">
                    Independente do temporizador e do alerta de fim de fase.
                </p>
            </div>
            {error && (
                <p className="ambient-error" role="alert">
                    {error}
                </p>
            )}
        </section>
    );
}
