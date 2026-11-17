/** Alerta utilizado na ativação do áudio e no encerramento natural de uma fase. */
export class PhaseAlert {
    private context: AudioContext | null = null;

    constructor(private onStateChange: (ready: boolean) => void) {}

    async unlock(): Promise<AudioContext> {
        if (!this.context || this.context.state === 'closed') {
            this.context = new AudioContext();
            this.context.onstatechange = () => {
                this.onStateChange(this.context?.state === 'running');
            };
        }
        const context = this.context;
        if (context.state !== 'running') await context.resume();
        if (context.state !== 'running') {
            this.onStateChange(false);
            throw new Error('O navegador ainda não liberou o áudio.');
        }
        this.onStateChange(true);
        return context;
    }

    async play(): Promise<void> {
        const context = await this.unlock();
        for (let i = 0; i < 3; i++) {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.frequency.value = 740;
            const time = context.currentTime + i * 0.4;
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
            oscillator.onended = () => {
                oscillator.disconnect();
                gain.disconnect();
            };
            oscillator.start(time);
            oscillator.stop(time + 0.32);
        }
    }

    dispose() {
        if (this.context) {
            this.context.onstatechange = null;
            void this.context.close().catch(() => {});
            this.context = null;
        }
    }
}
