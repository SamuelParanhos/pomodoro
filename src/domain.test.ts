import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    start,
    advance,
    reconcile,
    phase,
    sortTasks,
    validPreset,
    validSession,
    type Preset,
    type Task,
} from './domain';
const preset: Preset = {
    id: 'p',
    nome: 'Teste',
    foco: 1,
    curta: 1,
    longa: 2,
    ciclos: 2,
    criadoEm: 0,
    atualizadoEm: 0,
};
test('snapshot não depende das alterações do preset', () => {
    const p = { ...preset };
    const s = start(p, 0);
    p.foco = 100;
    assert.equal(s.snapshot.foco, 1);
});
test('timestamps avançam por foco e pausa até a fase vigente', () => {
    const s = reconcile(start(preset, 0), 150000);
    assert.equal(s.etapa, 2);
    assert.equal(s.fim, 180000);
    assert.equal(s.completos, 1);
});
test('sessão termina após o último foco e pausa longa', () => {
    const s = reconcile(start(preset, 0), 300000);
    assert.equal(s.status, 'concluida');
    assert.equal(s.completos, 2);
});
test('sessão pausada não avança com o tempo', () => {
    const s = { ...start(preset, 0), status: 'pausada' as const, restante: 30000 };
    assert.deepEqual(reconcile(s, 900000), s);
});
test('pular fases não contabiliza focos', () => {
    const s = advance(start(preset, 0), 1000, true);
    assert.equal(phase(s), 'curta');
    assert.equal(s.completos, 0);
    const next = advance(s, 2000, true);
    assert.equal(next.completos, 0);
    assert.equal(phase(next), 'foco');
});
test('última fase pulada conclui sessão', () => {
    let s = start(preset, 0);
    for (let i = 0; i < 4; i++) s = advance(s, 0, true);
    assert.equal(s.status, 'concluida');
    assert.equal(s.completos, 0);
});
test('prioridade precede estado e backlog é o último estado conforme RN-10', () => {
    const task = (id: string, prioridade: Task['prioridade'], estado: Task['estado']): Task => ({
        id,
        prioridade,
        estado,
        titulo: id,
        criadaEm: 0,
        atualizadaEm: 0,
    });
    assert.deepEqual(
        sortTasks([
            task('b', 'alta', 'backlog'),
            task('a', 'alta', 'aFazer'),
            task('c', 'baixa', 'aFazer'),
        ]).map((t) => t.id),
        ['a', 'b', 'c'],
    );
});
test('dados inválidos não são restaurados', () => {
    assert.equal(validPreset({ ...preset, foco: 0 }), false);
    assert.equal(validPreset({ ...preset, ciclos: 1.5 }), false);
    assert.equal(validSession({ ...start(preset, 0), etapa: 99 }), false);
});
