// Builds data.json for the Soul Link Team Planner from @pkmn/dex@0.11.0.
// Usage: node extract.js  (writes data.json next to this file)
'use strict';
const fs = require('fs');
const path = require('path');
const { Dex } = require('@pkmn/dex');

const TYPES = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground',
  'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];
const TI = Object.fromEntries(TYPES.map((t, i) => [t, i]));
const DMG = { 0: 1, 1: 2, 2: 0.5, 3: 0 };

// ---------- Type charts ----------
function chartFor(g) {
  const types = Dex.forGen(g).types;
  const exists = (name) => {
    if (name === 'Fairy' && g < 6) return false;
    if ((name === 'Dark' || name === 'Steel') && g < 2) return false;
    const t = types.get(name);
    return !!(t && t.exists);
  };
  return TYPES.map((atk) => TYPES.map((def) => {
    if (!exists(atk) || !exists(def)) return null;
    const code = types.get(def).damageTaken[atk];
    return DMG[code === undefined ? 0 : code];
  }));
}
const charts = { 1: chartFor(1), 2: chartFor(2), 6: chartFor(6) };

// ---------- Species ----------
const dex9 = Dex.forGen(9);
const EXCLUDE_FORMS_OF = new Set(['Pikachu', 'Arceus', 'Silvally', 'Genesect', 'Vivillon', 'Shellos',
  'Gastrodon', 'Deerling', 'Sawsbuck', 'Alcremie']);
const KEEP_FORMS_OF = new Set(['Rotom', 'Oricorio', 'Wormadam', 'Lycanroc']);
const REGIONAL = new Set(['Alola', 'Galar', 'Hisui', 'Paldea']);
const BAD_NONSTANDARD = new Set(['CAP', 'Custom', 'LGPE']);

const all = dex9.species.all();

function isRegular(s) {
  if (s.num <= 0) return false;
  if (BAD_NONSTANDARD.has(s.isNonstandard)) return false;
  if (s.battleOnly || s.isMega || s.isPrimal) return false;
  if (/Gmax|Totem/.test(s.forme)) return false;
  if (s.isCosmeticForme) return false;
  if (!s.forme) return true;
  if (EXCLUDE_FORMS_OF.has(s.baseSpecies)) return false;
  // Alternate forms: keep only regional forms, Rotom appliances, Oricorio styles,
  // Wormadam cloaks and Lycanroc forms. Everything else is a cosmetic or battle forme.
  if (REGIONAL.has(s.forme)) return true;
  return KEEP_FORMS_OF.has(s.baseSpecies);
}

const regular = all.filter(isRegular)
  .map((s, i) => ({ s, i }))
  .sort((a, b) => (a.s.num - b.s.num) || ((a.s.forme ? 1 : 0) - (b.s.forme ? 1 : 0)) || (a.i - b.i))
  .map((x) => x.s);

const index = new Map(regular.map((s, i) => [s.name, i]));

function descendants(s, seen = new Set()) {
  for (const evo of s.evos || []) {
    const e = dex9.species.get(evo);
    if (!e || !e.exists || !index.has(e.name) || seen.has(e.name)) continue;
    seen.add(e.name);
    descendants(e, seen);
  }
  return seen;
}

const sameArr = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

const sp = regular.map((s) => {
  const entry = {
    n: s.name,
    g: s.gen,
    t: s.types.map((t) => TI[t]),
    b: s.bst,
  };
  const e = [...descendants(s)].map((n) => index.get(n)).sort((a, b) => a - b);
  if (e.length) entry.e = e;
  const to = {};
  const bo = {};
  for (let g = Math.max(1, s.gen); g <= 8; g++) {
    const gs = Dex.forGen(g).species.get(s.name);
    if (!gs || !gs.exists) continue;
    const types = gs.types.map((t) => TI[t]);
    if (!sameArr(types, entry.t)) to[g] = types;
    if (g >= 2 && gs.bst !== entry.b) bo[g] = gs.bst;
  }
  if (Object.keys(to).length) entry.to = to;
  if (Object.keys(bo).length) entry.bo = bo;
  return entry;
});

// ---------- Mega Evolutions ----------
function megaName(s) {
  // "Charizard-Mega-X" -> "Mega Charizard X", "Sceptile-Mega" -> "Mega Sceptile"
  const suffix = s.forme.replace(/^Mega-?/, '');
  return 'Mega ' + s.baseSpecies + (suffix ? ' ' + suffix : '');
}

const megas = all.filter((s) => s.isMega && s.isNonstandard !== 'CAP')
  .map((s, i) => ({ s, i }))
  .sort((a, b) => (a.s.num - b.s.num) || (a.i - b.i))
  .map((x) => x.s);

for (const m of megas) {
  const baseIdx = index.get(m.baseSpecies);
  if (baseIdx === undefined) throw new Error('No base species for ' + m.name);
  const idx = sp.length;
  sp.push({ n: megaName(m), g: m.gen, t: m.types.map((t) => TI[t]), b: m.bst, m: 1, base: baseIdx });
  (sp[baseIdx].mg = sp[baseIdx].mg || []).push(idx);
}

const out = { types: TYPES, charts, sp };
fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(out));
console.log('Regular species:', regular.length);
console.log('Megas:', megas.length);
