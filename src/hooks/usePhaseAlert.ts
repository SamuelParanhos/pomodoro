import { useEffect, useRef, useState } from 'react';
import { PhaseAlert } from '../audio';

export function usePhaseAlert(onError: (message: string) => void) {
    const [sound, setSound] = useState(true);
    const [ready, setReady] = useState(false);
    const alert = useRef<PhaseAlert | null>(null);
    if (!alert.current) alert.current = new PhaseAlert(setReady);

    useEffect(() => () => alert.current?.dispose(), []);

    async function activate(playPreview = false) {
        try {
            if (playPreview) await alert.current!.play();
            else await alert.current!.unlock();
            return true;
        } catch {
            setReady(false);
            onError(
                'O alerta sonoro não pôde ser reproduzido. Clique em “Ativar som” e confira o volume e se a aba está silenciada.',
            );
            return false;
        }
    }

    async function unlock() {
        if (sound) await activate();
    }

    async function beep() {
        if (sound) await activate(true);
    }

    async function toggleSound() {
        if (sound && ready) setSound(false);
        else if (await activate(true)) setSound(true);
    }

    return { sound, ready, unlock, beep, toggleSound };
}
