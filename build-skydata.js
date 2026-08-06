#!/usr/bin/env node
/* Build the compact star + constellation payload embedded in index.html.
   Inputs (downloaded, not committed — see README):
     hyg.csv        HYG v3.8, astronexus/HYG-Database, CC BY-SA 4.0
     conlines.json  d3-celestial constellation lines, Olaf Frohn, BSD-3
   Output: skydata.js — a single line ready to paste into the page.        */
const fs = require('fs');
const IN = process.argv[2] || '.';
const MAG_LIMIT = 5.0;
const NAME_LIMIT = 3.2;

const b36 = (n, w) => Math.round(n).toString(36).padStart(w, '0');

/* ---------- stars ---------- */
const csv = fs.readFileSync(IN + '/hyg.csv', 'utf8').split('\n');
const hdr = csv[0].split(',').map(s => s.replace(/"/g, ''));
const I = n => hdr.indexOf(n);
const [iRa, iDec, iMag, iProp, iCi] = [I('ra'), I('dec'), I('mag'), I('proper'), I('ci')];

const stars = [];
for (let i = 1; i < csv.length; i++) {
  const p = csv[i].split(',');
  if (p.length < 20) continue;
  const mag = parseFloat(p[iMag]);
  if (!isFinite(mag) || mag > MAG_LIMIT) continue;
  const ra = parseFloat(p[iRa]), dec = parseFloat(p[iDec]);   // ra in hours, dec in deg
  if (!isFinite(ra) || !isFinite(dec)) continue;
  if (ra === 0 && dec === 0) continue;                        // the Sol row
  const ci = parseFloat(p[iCi]);
  stars.push({
    ra: ra * 15, dec, mag,
    ci: isFinite(ci) ? Math.max(-0.3, Math.min(2.7, ci)) : 0.6,
    name: (p[iProp] || '').replace(/"/g, '').trim()
  });
}
stars.sort((a, b) => a.mag - b.mag);

let sBlob = '';
const names = [];
stars.forEach((s, i) => {
  sBlob += b36(s.ra * 100, 3) + b36(s.dec * 100 + 9000, 3)
         + b36(s.mag * 10 + 20, 2) + b36((s.ci + 0.3) * 10, 1);
  if (s.name && s.mag <= NAME_LIMIT) names.push(i + ':' + s.name);
});

/* ---------- constellation lines ---------- */
const geo = JSON.parse(fs.readFileSync(IN + '/conlines.json', 'utf8'));
const cons = geo.features.map(f => {
  const segs = f.geometry.coordinates.map(seg => seg.map(([ra, dec]) => {
    const r = ((ra % 360) + 360) % 360;
    return b36(r * 10, 3) + b36(dec * 10 + 900, 3);
  }).join('')).join('|');
  return f.id + '~' + segs;
}).join(';');

const out =
`/* Stars: HYG v3.8 (astronexus/HYG-Database, CC BY-SA 4.0), ${stars.length} stars to mag ${MAG_LIMIT}.
   Constellation lines: d3-celestial (Olaf Frohn, BSD-3-Clause).
   Packed base36: star = ra*100(3) dec*100+9000(3) mag*10+20(2) ci+0.3*10(1). */
const STAR_BLOB=${JSON.stringify(sBlob)};
const STAR_NAMES=${JSON.stringify(names.join(';'))};
const CON_BLOB=${JSON.stringify(cons)};`;

fs.writeFileSync(IN + '/skydata.js', out);
console.log(`stars ${stars.length}  named ${names.length}  constellations ${geo.features.length}`);
console.log(`star blob ${(sBlob.length / 1024).toFixed(1)}kB  names ${(names.join(';').length / 1024).toFixed(1)}kB  lines ${(cons.length / 1024).toFixed(1)}kB`);
