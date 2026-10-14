import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';

test('every quotation PDF carries the approved Importante notes with its validity date', () => {
  const { quotationNotices } = load('src/lib/quotation-types.ts');
  const notes = quotationNotices('15 de octubre de 2026');
  assert.equal(notes.length, 4);
  assert.match(notes[0], /^Tarifa válida hasta el 15 de octubre de 2026, sujeta a disponibilidad\./);
  assert.ok(notes.some(line => line === 'Impuestos o cargos que se pagan en el destino no están incluidos, salvo que se indique.'));
  assert.ok(notes.some(line => /cambio, cancelación y reembolso dependen de cada proveedor/.test(line)));
});
