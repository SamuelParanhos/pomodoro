export const ambientNames = {
    rain: 'Chuva',
    ocean: 'Ondas do mar',
    brown: 'Ruído marrom',
};
export type AmbientKind = keyof typeof ambientNames;
export type AmbientSettings = { kind: AmbientKind; volume: number };
export function validAmbientSettings(value: AmbientSettings): boolean {
    return (
        !!value &&
        Object.hasOwn(ambientNames, value.kind) &&
        Number.isInteger(value.volume) &&
        value.volume >= 0 &&
        value.volume <= 100
    );
}

/** Ambientes sintetizados localmente, sem arquivos externos ou streaming. */
export class AmbientAudio {
    private context: AudioContext | null = null;
    private gain: GainNode | null = null;
    private sources: (AudioBufferSourceNode | OscillatorNode)[] = [];
    private nodes: AudioNode[] = [];
    private disposed = false;

    constructor(private onPlayingChange: (playing: boolean) => void) {}

    async play(kind: AmbientKind, volume: number) {
        if (this.disposed) return;
        if (!this.context || this.context.state === 'closed') {
            this.context = new AudioContext();
            this.context.onstatechange = () => {
                this.onPlayingChange(this.context?.state === 'running' && this.sources.length > 0);
            };
        }
        const context = this.context;
        if (context.state !== 'running') await context.resume();
        if (this.disposed) return;
        if (context.state !== 'running') throw new Error('Áudio bloqueado pelo navegador.');
        this.clearSources();

        const source = context.createBufferSource();
        const buffer = context.createBuffer(2, context.sampleRate * 8, context.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const samples = buffer.getChannelData(channel);
            let brown = 0;
            for (let i = 0; i < samples.length; i++) {
                const white = Math.random() * 2 - 1;
                brown = (brown + white * 0.02) / 1.02;
                samples[i] = kind === 'brown' ? brown * 3.5 : white * 0.55;
            }
            // Suaviza a junção do buffer repetido para evitar estalos no loop.
            const blend = Math.floor(context.sampleRate * 0.05);
            for (let i = 0; i < blend; i++) {
                const mix = i / blend;
                samples[samples.length - blend + i] =
                    samples[samples.length - blend + i] * (1 - mix) + samples[i] * mix;
            }
        }
        source.buffer = buffer;
        source.loop = true;
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = kind === 'rain' ? 6500 : kind === 'ocean' ? 1100 : 800;
        filter.Q.value = 0.5;
        const texture = context.createGain();
        texture.gain.value = kind === 'ocean' ? 0.55 : 1;
        this.gain = context.createGain();
        this.gain.gain.value = 0;
        this.gain.gain.setTargetAtTime((volume / 100) * 0.65, context.currentTime, 0.12);
        source.connect(filter).connect(texture).connect(this.gain).connect(context.destination);
        this.sources.push(source);
        this.nodes.push(source, filter, texture, this.gain);

        if (kind === 'ocean') {
            const wave = context.createOscillator();
            const depth = context.createGain();
            wave.frequency.value = 0.12;
            depth.gain.value = 0.35;
            wave.connect(depth).connect(texture.gain);
            this.sources.push(wave);
            this.nodes.push(wave, depth);
            wave.start();
        }
        source.start();
        this.onPlayingChange(true);
    }

    setVolume(volume: number) {
        if (this.gain && this.context) {
            this.gain.gain.setTargetAtTime((volume / 100) * 0.65, this.context.currentTime, 0.05);
        }
    }

    async pause() {
        this.clearSources();
        this.onPlayingChange(false);
    }

    private clearSources() {
        for (const source of this.sources) source.stop();
        for (const node of this.nodes) node.disconnect();
        this.sources = [];
        this.nodes = [];
        this.gain = null;
    }

    dispose() {
        this.disposed = true;
        this.clearSources();
        if (this.context) {
            this.context.onstatechange = null;
            void this.context.close().catch(() => {});
        }
    }
}
