import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';

// ICAO 9303 specimen documents (fictional state "Utopia"): never real passports in fixtures.
const mrz = load('src/lib/mrz.ts');
const today = new Date('2026-10-23T12:00:00Z');
const plain = value => JSON.parse(JSON.stringify(value));
const passport = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10';
const idCard = 'I<UTOD231458907<<<<<<<<<<<<<<<\n7408122F1204159UTO<<<<<<<<<<<6\nERIKSSON<<ANNA<MARIA<<<<<<<<<<';

test('a passport MRZ (TD3) gives every field, with all check digits verified', () => {
  assert.deepEqual(plain(mrz.parseMrz(passport, today)), {
    format: 'TD3', documentType: 'pasaporte', issuingCountry: 'UTO', lastName: 'ERIKSSON', firstName: 'ANNA', middleName: 'MARIA',
    documentNumber: 'L898902C3', nationality: 'UTO', birthDate: '1974-08-12', sex: 'F', expiryDate: '2012-04-15',
    checks: { documentNumber: true, birthDate: true, expiryDate: true, composite: true }, valid: true,
  });
});

test('an ID card MRZ (TD1) is read too', () => {
  const result = plain(mrz.parseMrz(idCard, today));
  assert.equal(result.format, 'TD1');
  assert.equal(result.documentType, 'identidad');
  assert.equal(result.documentNumber, 'D23145890');
  assert.deepEqual([result.lastName, result.firstName, result.middleName, result.birthDate, result.expiryDate, result.valid], ['ERIKSSON', 'ANNA', 'MARIA', '1974-08-12', '2012-04-15', true]);
});

test('pasted text with spaces, lower case and surrounding lines still reads', () => {
  const messy = `REPUBLIC OF UTOPIA\n${passport.split('\n')[0].toLowerCase()}\n  L898902C3 6UTO7408122F1204159ZE184226B<<<<<10  \n`;
  assert.equal(mrz.parseMrz(messy, today).valid, true);
});

test('OCR letter-for-digit confusions are only undone in numeric fields', () => {
  const ocr = passport.replace('7408122F12O4159', '74O8122F12O4159');
  const result = mrz.parseMrz(ocr, today);
  assert.equal(result.birthDate, '1974-08-12');
  assert.equal(result.valid, true);
});

test('a wrong character is reported by its check digit, never guessed', () => {
  const result = plain(mrz.parseMrz(passport.replace('L898902C3', 'L898902C8'), today));
  assert.equal(result.valid, false);
  assert.deepEqual(result.checks, { documentNumber: false, birthDate: true, expiryDate: true, composite: false });
  assert.equal(result.documentNumber, 'L898902C8');
});

test('text that is not an MRZ gives nothing', () => {
  assert.equal(mrz.parseMrz('Pasaporte de Ana', today), null);
  assert.equal(mrz.parseMrz('', today), null);
});

test('check digits and dates follow ICAO 9303', () => {
  assert.equal(mrz.checkDigit('L898902C3'), '6');
  assert.equal(mrz.checkDigit('740812'), '2');
  assert.equal(mrz.countryName('HND'), 'Honduras');
  assert.equal(mrz.countryName('UTO'), 'UTO');
});

test('fillers read as K, L or C at the end of the name line are filler again', () => {
  const ocr = 'P<UTOERIKSSON<<ANNA<MARIA<KLLLLLLLLLLLLLLLLLL\nL898902C36UTO7408122F1204159ZE184226B<<<<<10';
  const result = mrz.parseMrz(ocr, today);
  assert.deepEqual([result.lastName, result.firstName, result.middleName, result.valid], ['ERIKSSON', 'ANNA', 'MARIA', true]);
  assert.equal(mrz.nameFillers('P<UTOSMITH<<KELLY<<<<<<'), 'P<UTOSMITH<<KELLY<<<<<<', 'a real name ending in L or K stays');
});

// Exact text the on-device engine produced from a synthetic image of the specimen (browser, 2026-10-23).
const engineRaw = 'P<UTOERTKSSON<K<ANNA<KMARTIA<LLLLLLLLLLLLLLLLLLL\n1898902C36UTO7408122F1204159Z2E184226B<<<<<10\n';
const enginePrepared = 'P<UTOERIKSSON<K<ANNA<KMARTIALKLLLLLLLLLLLLLLLLKLKLL\n1898902C36UTO7408122F1204159ZE184226B<<<<<10\n';

test('a real engine reading: L read as 1 passes the check digit (same value), so the number is kept as read', () => {
  const result = mrz.parseMrz(enginePrepared, today);
  assert.equal(result.documentNumber, '1898902C3', 'the advisor must compare the number with the passport');
  assert.equal(mrz.checkDigit('1898902C3'), mrz.checkDigit('L898902C3'));
  assert.equal(result.valid, true);
  assert.deepEqual([result.lastName, result.birthDate, result.expiryDate, result.sex], ['ERIKSSON', '1974-08-12', '2012-04-15', 'F']);
});

test('a data line with an extra character is not accepted (cutting it could pass a check digit by chance)', () => {
  assert.equal(mrz.parseMrz(engineRaw, today), null);
});

test('a wrong character is never "repaired"', () => {
  const result = mrz.parseMrz(passport.replace('L898902C3', 'L898903C3'), today);
  assert.equal(result.documentNumber, 'L898903C3');
  assert.equal(result.checks.documentNumber, false);
});
