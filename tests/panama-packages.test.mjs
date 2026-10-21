import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { load, validation } from './security-support.mjs';

const { readPackageSheet } = load('src/lib/package-sheet.ts');
const { composeQuote } = load('src/lib/quote.ts', { '@/lib/analytics': {}, '@/lib/attribution': {}, '@/lib/site-config': { siteConfig: { whatsappNumber: '50488668704' } } });
const packages = JSON.parse(fs.readFileSync('data/packages.json', 'utf8'));
const slugs = ['panama-ciudad-canal-casco-historico', 'panama-ciudad-playa-blanca-todo-incluido', 'escapada-fin-de-semana-panama'];
const panama = slugs.map(slug => packages.find(item => item.slug === slug));
const copy = item => JSON.stringify(item);
const photoRefs = ficha => [
  ...(ficha.opciones ?? []).map(option => option.foto),
  ...ficha.estancias.flatMap(stay => [stay.portada, ...stay.hoteles.flatMap(hotel => hotel.fotos)]),
  ...ficha.experiencias.map(experience => experience.foto),
].filter(Boolean);

test('the three Panama packages exist once each, unpublished until approved, with real photos', () => {
  for (const slug of slugs) assert.equal(packages.filter(item => item.slug === slug).length, 1, slug);
  for (const item of panama) {
    assert.equal(item.publicado, false, item.slug);
    assert.equal(item.destacado, false, item.slug);
    const files = fs.readdirSync(`public/paquetes/${item.slug}`).filter(file => file.endsWith('.jpg'));
    assert.ok(files.length >= 7, item.slug);
    assert.equal(item.imagen_url, `/paquetes/${item.slug}/1.jpg`);
    // Every photo shown (gallery, hotels, experiences, options) has a credit with a commercial-use license and exists.
    const credited = new Set(item.ficha.creditos.map(credit => credit.archivo));
    for (const file of files) assert.ok(credited.has(`/paquetes/${item.slug}/${file}`), file);
    for (const ref of photoRefs(item.ficha)) { assert.ok(credited.has(ref.archivo), ref.archivo); assert.ok(ref.alt.length > 10, ref.archivo); }
    for (const credit of item.ficha.creditos) {
      assert.ok(fs.existsSync(`public${credit.archivo}`), credit.archivo);
      // Wikimedia Commons photos carry a commercial-use license; supplier photos must say who authorized them.
      if (credit.fuente.startsWith('https://commons.wikimedia.org/')) assert.match(credit.licencia, /^(CC BY(-SA)? \d\.\d|CC0|Public domain)$/, credit.archivo);
      else assert.match(credit.licencia, /^Uso autorizado por /, credit.archivo);
    }
  }
});

test('the parser keeps every part of the Panama content (nothing exceeds its limits)', () => {
  for (const item of panama) {
    const sheet = readPackageSheet(item.ficha);
    const source = item.ficha;
    assert.equal(sheet.subtitulo, source.subtitulo);
    assert.equal(sheet.destacados.length, source.destacados.length);
    assert.equal(sheet.secciones.length, source.secciones.length);
    sheet.secciones.forEach((section, index) => assert.equal(section.items.length + section.parrafos.length, source.secciones[index].items.length + source.secciones[index].parrafos.length));
    assert.equal(sheet.estancias.length, source.estancias.length);
    sheet.estancias.forEach((stay, index) => {
      const original = source.estancias[index];
      assert.equal(stay.hoteles.length, original.hoteles.length, stay.id);
      stay.hoteles.forEach((hotel, h) => {
        assert.equal(hotel.amenidades.length, original.hoteles[h].amenidades.length, hotel.id);
        assert.equal(hotel.condiciones.length, original.hoteles[h].condiciones.length, hotel.id);
        assert.equal(hotel.fotos.length, original.hoteles[h].fotos.length, hotel.id);
      });
    });
    assert.equal(sheet.dias.length, source.dias.length);
    assert.equal(sheet.experiencias.length, source.experiencias.length);
    assert.ok(sheet.experiencias.every(experience => experience.foto), item.slug);
    assert.equal(sheet.adicionales.length, source.adicionales.length);
    assert.equal(sheet.creditos.length, source.creditos.length);
    assert.equal(sheet.opciones.length, (source.opciones ?? []).length);
    assert.equal(sheet.seo.titulo, source.seo.titulo);
    assert.equal(sheet.seo.descripcion, source.seo.descripcion);
    assert.ok(source.seo.titulo.length <= 60 && source.seo.descripcion.length <= 160, item.slug);
    // The plain-text itinerary column mirrors the structured days.
    assert.equal(item.itinerario.split('\n').length, source.dias.length);
  }
});

test('the parser drops malformed content instead of failing', () => {
  assert.equal(readPackageSheet(null), null);
  assert.equal(readPackageSheet('texto'), null);
  const sheet = readPackageSheet({
    destacados: ['Uno', 3, ''],
    opciones: [{ id: 'a', titulo: 'Sola' }],
    secciones: [{ titulo: 'Vacía' }],
    creditos: [{ archivo: '/x.jpg', alt: 'x', autor: 'y', licencia: 'CC0', fuente: 'javascript:alert(1)' }],
    estancias: [
      { id: 'ciudad', campo: 'hotel', titulo: 'Ciudad', noches: '2 noches', plan: 'Desayuno', hoteles: [{ id: 'uno', nombre: 'Uno', categoria: 'Confort', zona: 'Centro', descripcion: 'Hotel', habitacion: 'Doble', plan: 'Desayuno', fotos: [{ archivo: 'https://example.com/x.jpg', alt: 'remota' }, { archivo: '/hoteles/uno/../../x.jpg', alt: 'salto' }, { archivo: '/hoteles/uno/1.jpg', alt: 'local' }] }, { id: 'uno', nombre: 'Duplicado', categoria: 'x', zona: 'x', descripcion: 'x', habitacion: 'x', plan: 'x' }] },
      { id: 'otra', campo: 'hotel', titulo: 'Segunda con el mismo campo', noches: '1', plan: 'x', hoteles: [{ id: 'dos', nombre: 'Dos', categoria: 'x', zona: 'x', descripcion: 'x', habitacion: 'x', plan: 'x' }] },
      { id: 'playa', campo: 'resort', opcion: 'z', titulo: 'Opción inexistente', noches: '1', plan: 'x', hoteles: [{ id: 'tres', nombre: 'Tres', categoria: 'x', zona: 'x', descripcion: 'x', habitacion: 'x', plan: 'x' }] },
    ],
    experiencias: [{ id: 'x', titulo: 'Sin modalidad', descripcion: 'x' }],
    seo: { titulo: 'x'.repeat(200) },
  });
  assert.deepEqual([...sheet.destacados], ['Uno']);
  assert.equal(sheet.opciones.length, 0);
  assert.equal(sheet.secciones.length, 0);
  assert.equal(sheet.creditos.length, 0);
  assert.equal(sheet.estancias.length, 1);
  assert.equal(sheet.estancias[0].hoteles.length, 1);
  // Only local photos, never a remote URL or a path that leaves public/.
  assert.deepEqual(sheet.estancias[0].hoteles[0].fotos.map(photo => photo.archivo), ['/hoteles/uno/1.jpg']);
  assert.equal(sheet.experiencias.length, 0);
  assert.equal(sheet.seo.titulo, null);
});

test('Panama copy follows the house rules: usted, no exclamations, no emojis, no prices, no response times', () => {
  for (const item of panama) {
    const text = copy(item);
    assert.equal(/[¡!]/.test(text), false, item.slug);
    assert.equal(/\p{Extended_Pictographic}/u.test(text), false, item.slug);
    assert.equal(/\b(tu|tus|quieres|disfruta|personaliza|agrégala)\b/i.test(text), false, item.slug);
    assert.equal(/(US\$|\$\s?\d|\d+\s?(USD|HNL|dólares|lempiras))/i.test(text), false, item.slug);
    assert.equal(/(respondemos|respuesta en|en minutos|en menos de \d|en 24 horas)/i.test(text), false, item.slug);
    assert.equal(item.precio_desde ?? null, null);
  }
});

test('"todo incluido" never describes the city stay or the base weekend getaway', () => {
  const [city, beach, weekend] = panama;
  assert.equal(/todo incluido/i.test(copy(city)), false);
  assert.ok(beach.ficha.secciones.some(section => /solo el desayuno/.test(section.parrafos.join(' '))));
  assert.ok(weekend.no_incluye.some(value => /todo incluido.*costo adicional/i.test(value)));
  assert.equal(weekend.incluye.some(value => /todo incluido/i.test(value)), false);
  const [base, upgrade] = weekend.ficha.opciones;
  assert.equal(base.costo_adicional, false);
  assert.equal(upgrade.costo_adicional, true);
  assert.equal(upgrade.cotizacion, 'Opción B: Escapada Panamá + Experiencia Todo Incluido (Costo Adicional)');
  // City hotels never carry an all-inclusive plan; the weekend resort night exists only in option B.
  for (const item of panama) for (const stay of item.ficha.estancias.filter(value => value.campo === 'hotel')) for (const hotel of stay.hoteles) assert.equal(/todo incluido/i.test(hotel.plan), false, hotel.id);
  assert.deepEqual(beach.ficha.estancias.map(stay => stay.campo), ['resort', 'hotel']);
  assert.equal(weekend.ficha.estancias.find(stay => stay.campo === 'resort').opcion, 'b');
});

test('hotel photos show only that hotel, and properties without authorized photos show none', () => {
  for (const item of panama) for (const stay of item.ficha.estancias) for (const hotel of stay.hoteles) {
    for (const photo of hotel.fotos) assert.ok(photo.archivo.startsWith(`/hoteles/${hotel.id}/`), `${hotel.id}: ${photo.archivo}`);
  }
  const resorts = panama.flatMap(item => item.ficha.estancias.filter(stay => stay.campo === 'resort').flatMap(stay => stay.hoteles));
  assert.ok(resorts.length > 0);
  for (const resort of resorts) assert.equal(resort.fotos.length, 0, resort.id);
  // The beach appears as the coast, never labeled as a named resort.
  const beachCover = panama[1].ficha.estancias[0].portada;
  assert.match(beachCover.alt, /costa de Playa Blanca/);
  assert.equal(/decameron|riu|resort/i.test(beachCover.alt), false);
});

test('hotel, resort and room preferences reach the lead and the WhatsApp message', () => {
  const formData = { slug: 'panama-ciudad-playa-blanca-todo-incluido', nombre: 'Panamá Doble Paraíso', destino: 'Ciudad de Panamá y Playa Blanca', origin: 'San Pedro Sula', dates: 'Abril', adults: '2', children: '2', notes: '', phone: '+504 3333 4444', resort: 'Grand Decameron Panamá', hotel: 'Hilton Panamá', room: 'Dos camas' };
  const lead = validation.validateLead({ servicio: 'Paquete', currency: 'USD', fields: {}, formData });
  assert.equal(lead.fields.Resort, 'Grand Decameron Panamá');
  assert.equal(lead.fields.Hotel, 'Hilton Panamá');
  assert.equal(lead.fields.Habitación, 'Dos camas');
  const message = composeQuote({ service: 'Paquete', servicio: 'Paquete', fields: { Paquete: formData.nombre, Resort: formData.resort, Hotel: formData.hotel, Habitación: formData.room } }, 'VT-2');
  assert.match(message, /Resort: Grand Decameron Panamá\nHotel: Hilton Panamá\nHabitación: Dos camas/);
  const english = composeQuote({ service: 'Paquete', servicio: 'Paquete', locale: 'en', fields: { Paquete: formData.nombre, Hotel: formData.hotel, Habitación: 'Two beds' } });
  assert.match(english, /Hotel: Hilton Panamá\nRoom: Two beds/);
  assert.throws(() => validation.validateLead({ servicio: 'Paquete', currency: 'USD', fields: {}, formData: { ...formData, hotel: 'x'.repeat(161) } }));
});

test('a package quote carries the chosen option and extras into the lead and the WhatsApp message', () => {
  const formData = { slug: 'escapada-fin-de-semana-panama', nombre: 'Escapada de Fin de Semana en Panamá', destino: 'Ciudad de Panamá', origin: 'Tegucigalpa', dates: 'Marzo', adults: '2', children: '1', notes: '', phone: '+504 3333 4444', option: 'Opción B: Escapada Panamá + Experiencia Todo Incluido (Costo Adicional)', extras: 'Noche adicional; Traslados privados' };
  const lead = validation.validateLead({ servicio: 'Paquete', currency: 'USD', fields: {}, formData });
  assert.equal(lead.fields.Opción, formData.option);
  assert.equal(lead.fields.Adicionales, formData.extras);
  assert.equal(lead.fields.Paquete, formData.nombre);
  assert.equal(lead.formData.slug, 'escapada-fin-de-semana-panama');
  const message = composeQuote({ service: 'Paquete', servicio: 'Paquete', fields: { Paquete: formData.nombre, Opción: formData.option, Adultos: '2', Niños: '1', Adicionales: formData.extras } }, 'VT-1');
  assert.match(message, /Opción: Opción B: Escapada Panamá \+ Experiencia Todo Incluido \(Costo Adicional\)/);
  assert.match(message, /Adicionales: Noche adicional; Traslados privados/);
  // Packages without options send none of these fields, and the lead keeps no empty keys for them.
  const rest = Object.fromEntries(Object.entries(formData).filter(([key]) => !['option', 'extras'].includes(key)));
  const plain = validation.validateLead(JSON.parse(JSON.stringify({ servicio: 'Paquete', currency: 'USD', fields: {}, formData: rest })));
  assert.equal('Opción' in plain.fields, false);
  assert.equal('option' in plain.formData, false);
  assert.equal('hotel' in plain.formData, false);
  assert.throws(() => validation.validateLead({ servicio: 'Paquete', currency: 'USD', fields: {}, formData: { ...formData, option: 'x'.repeat(161) } }));
});
