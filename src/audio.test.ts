import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PhaseAlert } from './audio';

function mockAudio() {
    let resumes = 0;
    let tones = 0;
    let blocked = false;
    const contexts: FakeContext[] = [];
    class FakeContext {
        state = 'suspended';
        currentTime = 0;
        destination = {};
        onstatechange: (() => void) | null = null;
        constructor() {
            contexts.push(this);
        }
        async resume() {
            resumes++;
            if (blocked) throw new Error('blocked');
            this.state = 'running';
            this.onstatechange?.();
        }
        async close() {
            this.state = 'closed';
        }
        createOscillator() {
            return {
                connect() {},
                disconnect() {},
                frequency: { value: 0 },
                start() {
                    tones++;
                },
                stop() {},
                onended: null,
            };
        }
        createGain() {
            return {
                connect() {},
                disconnect() {},
                gain: {
                    setValueAtTime() {},
                    linearRampToValueAtTime() {},
                    exponentialRampToValueAtTime() {},
                },
            };
        }
    }
    const original = globalThis.AudioContext;
    globalThis.AudioContext = FakeContext as unknown as typeof AudioContext;
    return {
        contexts,
        get resumes() {
            return resumes;
        },
        get tones() {
            return tones;
        },
        block() {
            blocked = true;
        },
        restore() {
            globalThis.AudioContext = original;
        },
    };
}

test('alerta reativa contexto suspenso antes de emitir os três bipes', async () => {
    const audio = mockAudio();
    try {
        let ready = false;
        const alert = new PhaseAlert((value) => {
            ready = value;
        });
        await alert.unlock();
        assert.equal(ready, true);
        audio.contexts[0].state = 'suspended';
        audio.contexts[0].onstatechange?.();
        assert.equal(ready, false);
        await alert.play();
        assert.equal(audio.resumes, 2);
        assert.equal(audio.tones, 3);
        assert.equal(ready, true);
        alert.dispose();
    } finally {
        audio.restore();
    }
});

test('falha de reprodução é reportada em vez de ignorada silenciosamente', async () => {
    const audio = mockAudio();
    try {
        audio.block();
        const alert = new PhaseAlert(() => {});
        await assert.rejects(alert.play());
        assert.equal(audio.tones, 0);
        alert.dispose();
    } finally {
        audio.restore();
    }
});
