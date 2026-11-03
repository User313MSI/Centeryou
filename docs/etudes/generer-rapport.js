/*
 * Génère rapport-flowplan.html — site autonome (zéro dépendance, offline) à partir de
 * ETUDE-50-POINTS-FLOWPLAN.md : design premium sombre, sommaire sticky, cartes par point,
 * graphiques SVG (donut priorités, barres impact/effort), filtres par section.
 * Usage : node generer-rapport.js
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'ETUDE-50-POINTS-FLOWPLAN.md');
const OUT = path.join(__dirname, 'rapport-flowplan.html');
const md = fs.readFileSync(SRC, 'utf8');

// --- parse des 50 points ---
const points = [];
const re = /^(\d+)\.\s+\*\*(.+?)\*\*(?:\s+—\s+|\s+\()(.+?)[.)]\s*\*Pourquoi :\s*(.+?)\*\s*⭐(.+?)\s*\/\s*([SML])\s*\/\s*(P\d)/gm;
let m;
while ((m = re.exec(md))) {
  points.push({
    n: +m[1], titre: m[2], desc: m[3].replace(/[.)]$/,''), pourquoi: m[4],
    impact: m[5].trim().length, impactRaw: m[5].trim(), effort: m[6], prio: m[7],
  });
}
// section = lettre du titre de section (## A. ...)
const sections = [];
md.split(/^## /m).slice(1).forEach(block => {
  const line = block.split('\n')[0];
  sections.push({ titre: line.replace(/^([A-J])\.\s*/, '$1 — '), anchor: line.slice(0, 1) });
});

// répartitions pour les graphiques
const byPrio = { P1: 0, P2: 0, P3: 0 };
const byImpact = [0, 0, 0, 0, 0, 0]; // index = nb étoiles
const byEffort = { S: 0, M: 0, L: 0 };
points.forEach(p => {
  byPrio[p.prio]++;
  byImpact[p.impact]++;
  byEffort[p.effort]++;
});

// --- donut SVG priorités ---
function donut(data, colors, size) {
  const total = data.reduce((a, b) => a + b.v, 0) || 1;
  const r = size / 2 - 14, c = 2 * Math.PI * r;
  let off = 0, arcs = '';
  data.forEach(d => {
    const frac = d.v / total;
    arcs += `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${d.c}" stroke-width="22"
      stroke-dasharray="${(frac * c).toFixed(1)} ${c.toFixed(1)}" stroke-dashoffset="${(-off * c).toFixed(1)}"
      transform="rotate(-90 ${size/2} ${size/2})" stroke-linecap="butt"/>`;
    off += frac;
  });
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${arcs}
    <text x="50%" y="47%" text-anchor="middle" fill="#eef2f8" font-size="26" font-weight="800">${points.length}</text>
    <text x="50%" y="60%" text-anchor="middle" fill="#97a3b6" font-size="11">POINTS</text></svg>`;
}

// --- barres horizontales ---
function bars(data, color) {
  const max = Math.max(...data.map(d => d.v), 1);
  return data.map(d => `
    <div class="bar-row">
      <span class="bar-label">${d.l}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(d.v / max * 100).toFixed(1)}%;background:${color}"></div></div>
      <span class="bar-val">${d.v}</span>
    </div>`).join('');
}

const donutSvg = donut(
  [{ l: 'P1 maintenant', v: byPrio.P1, c: '#5b8cff' }, { l: 'P2 ensuite', v: byPrio.P2, c: '#8b5cf6' }, { l: 'P3 plus tard', v: byPrio.P3, c: '#34d399' }],
  null, 190
);
const impactBars = bars(
  [1, 2, 3, 4, 5].map(i => ({ l: '⭐'.repeat(i), v: byImpact[i] })), '#fbbf24'
);
const effortBars = bars(
  [{ l: 'S (rapide)', v: byEffort.S }, { l: 'M (moyen)', v: byEffort.M }, { l: 'L (gros)', v: byEffort.L }], '#8b5cf6'
);

// --- cartes des points, groupées par section ---
const sectionOf = n => sections[Math.ceil(n / 5) - 1] || sections[0];
let cards = '';
points.forEach(p => {
  const sec = sectionOf(p.n);
  cards += `
  <article class="point" data-prio="${p.prio}" data-sec="${sec.anchor}">
    <div class="point-num">${String(p.n).padStart(2, '0')}</div>
    <div class="point-body">
      <div class="point-head">
        <h3>${p.titre}</h3>
        <span class="prio ${p.prio}">${p.prio}</span>
      </div>
      <p class="point-desc">${p.desc}.</p>
      <p class="point-why"><strong>Pourquoi :</strong> ${p.pourquoi}</p>
      <div class="point-meta">
        <span class="chip impact">Impact ${'⭐'.repeat(p.impact)}</span>
        <span class="chip effort">Effort ${p.effort}</span>
      </div>
    </div>
  </article>`;
});

// sommaire
const sommaire = sections.map(s => `<a href="#sec-${s.anchor}" class="toc-link">${s.titre}</a>`).join('');

const html = `<!DOCTYPE html>
<html lang="fr" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FlowPlan — Étude 50 points · Rapport d'amélioration</title>
<style>
:root {
  --bg:#0b0e14; --panel:rgba(255,255,255,.045); --panel-solid:#141a24; --text:#eef2f8; --muted:#97a3b6;
  --border:rgba(255,255,255,.09); --accent:#5b8cff; --accent2:#8b5cf6; --ok:#34d399; --warn:#fbbf24;
  --grad:linear-gradient(135deg,#5b8cff,#8b5cf6);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0; color:var(--text); font-family:'Inter','Segoe UI',system-ui,sans-serif; line-height:1.6;
  background:radial-gradient(900px 500px at 15% -10%, rgba(91,140,255,.16), transparent 60%),
             radial-gradient(800px 500px at 90% 0%, rgba(139,92,246,.12), transparent 55%), var(--bg);
  min-height:100vh;
}
header.hero{
  text-align:center; padding:70px 20px 50px;
}
header.hero .kicker{color:var(--accent); font-weight:700; letter-spacing:2px; text-transform:uppercase; font-size:12px}
header.hero h1{
  font-size:52px; margin:10px 0 6px; letter-spacing:-1.5px; font-weight:800;
  background:linear-gradient(120deg,#fff 20%,#5b8cff 60%,#8b5cf6 100%);
  -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
}
header.hero p{color:var(--muted); max-width:640px; margin:0 auto; font-size:17px}
.stats{display:flex; gap:14px; justify-content:center; flex-wrap:wrap; margin-top:30px}
.stat{background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:16px 26px; text-align:center}
.stat b{font-size:28px; display:block; background:var(--grad); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent}
.stat span{color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:1px}

.layout{display:grid; grid-template-columns:250px 1fr; gap:30px; max-width:1240px; margin:0 auto; padding:0 20px 80px}
nav.toc{
  position:sticky; top:20px; align-self:start; background:var(--panel); border:1px solid var(--border);
  border-radius:16px; padding:16px;
}
nav.toc h4{margin:0 0 10px; font-size:12px; text-transform:uppercase; letter-spacing:1.5px; color:var(--muted)}
.toc-link{display:block; color:var(--muted); text-decoration:none; padding:7px 10px; border-radius:9px; font-size:14px; font-weight:600}
.toc-link:hover{background:rgba(255,255,255,.06); color:var(--text)}
.filters{display:flex; gap:8px; margin-top:14px; flex-wrap:wrap}
.filters button{background:rgba(255,255,255,.06); border:1px solid var(--border); color:var(--muted); border-radius:999px; padding:5px 13px; font-size:12px; cursor:pointer; font-weight:700}
.filters button.active{background:var(--grad); color:#fff; border:none}

.charts{display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:26px}
.chart{background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:18px}
.chart h3{margin:0 0 12px; font-size:14px; color:var(--muted); text-transform:uppercase; letter-spacing:1px}
.chart .donut-wrap{display:flex; align-items:center; gap:14px}
.legend{font-size:13px; color:var(--muted)}
.legend div{display:flex; align-items:center; gap:7px; margin:4px 0}
.dot{width:10px; height:10px; border-radius:3px; display:inline-block}
.bar-row{display:flex; align-items:center; gap:10px; margin:7px 0}
.bar-label{width:90px; font-size:12px; color:var(--muted); font-weight:700}
.bar-track{flex:1; height:10px; background:rgba(255,255,255,.06); border-radius:99px; overflow:hidden}
.bar-fill{height:100%; border-radius:99px; transition:width .6s cubic-bezier(.22,1.2,.36,1)}
.bar-val{width:26px; font-size:12px; color:var(--text); font-weight:700; text-align:right}

.point{
  display:flex; gap:18px; background:var(--panel); border:1px solid var(--border); border-radius:18px;
  padding:20px 22px; margin-bottom:14px; transition:border-color .15s, transform .15s;
}
.point:hover{border-color:rgba(91,140,255,.5); transform:translateY(-2px)}
.point-num{
  font-size:30px; font-weight:800; min-width:52px; text-align:center; border-radius:14px; padding:8px 0;
  background:var(--grad); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
  height:fit-content;
}
.point-head{display:flex; align-items:center; gap:10px; flex-wrap:wrap}
.point-head h3{margin:0; font-size:18px; letter-spacing:-.3px}
.prio{font-size:11px; font-weight:800; padding:3px 10px; border-radius:99px}
.prio.P1{background:rgba(91,140,255,.18); color:#8fb4ff; border:1px solid rgba(91,140,255,.5)}
.prio.P2{background:rgba(139,92,246,.18); color:#c4b0fb; border:1px solid rgba(139,92,246,.5)}
.prio.P3{background:rgba(52,211,153,.15); color:#6ee7b7; border:1px solid rgba(52,211,153,.45)}
.point-desc{margin:8px 0 4px; color:var(--text)}
.point-why{margin:0; color:var(--muted); font-size:14px}
.point-why strong{color:var(--accent)}
.point-meta{display:flex; gap:8px; margin-top:10px}
.chip{font-size:11.5px; font-weight:700; padding:3px 10px; border-radius:99px; background:rgba(255,255,255,.06); border:1px solid var(--border); color:var(--muted)}
.chip.impact{color:var(--warn); border-color:rgba(251,191,36,.35)}
.point.hidden{display:none}
footer{text-align:center; color:var(--muted); font-size:13px; padding:30px; border-top:1px solid var(--border)}
@media (max-width:900px){ .layout{grid-template-columns:1fr} nav.toc{position:static} .charts{grid-template-columns:1fr} }
</style>
</head>
<body>
<header class="hero">
  <div class="kicker">Étude produit · 2 novembre 2026</div>
  <h1>FlowPlan — 50 pistes d'amélioration</h1>
  <p>Audit complet de l'application : 50 points distincts, chacun justifié, noté en impact et effort, priorisé. Conçu pour être lu par un entrepreneur comme par un étudiant.</p>
  <div class="stats">
    <div class="stat"><b>${points.length}</b><span>points</span></div>
    <div class="stat"><b>${byPrio.P1}</b><span>à faire maintenant (P1)</span></div>
    <div class="stat"><b>${byEffort.S}</b><span>rapides (S)</span></div>
    <div class="stat"><b>${byImpact[4] + byImpact[5]}</b><span>impact ⭐⭐⭐⭐+</span></div>
  </div>
</header>

<div class="layout">
  <nav class="toc">
    <h4>Sommaire</h4>
    ${sommaire}
    <h4 style="margin-top:14px">Filtrer</h4>
    <div class="filters">
      <button class="active" data-f="all">Tous</button>
      <button data-f="P1">P1</button>
      <button data-f="P2">P2</button>
      <button data-f="P3">P3</button>
    </div>
  </nav>

  <main>
    <div class="charts">
      <div class="chart"><h3>Priorités</h3><div class="donut-wrap">${donutSvg}
        <div class="legend">
          <div><span class="dot" style="background:#5b8cff"></span>P1 — maintenant (${byPrio.P1})</div>
          <div><span class="dot" style="background:#8b5cf6"></span>P2 — ensuite (${byPrio.P2})</div>
          <div><span class="dot" style="background:#34d399"></span>P3 — plus tard (${byPrio.P3})</div>
        </div></div></div>
      <div class="chart"><h3>Impact ressenti</h3>${impactBars}</div>
      <div class="chart"><h3>Effort de développement</h3>${effortBars}</div>
    </div>
    ${cards}
  </main>
</div>

<footer>FlowPlan · Étude 50 points · générée automatiquement depuis ETUDE-50-POINTS-FLOWPLAN.md · 100 % local, aucune donnée envoyée</footer>
<script>
document.querySelectorAll('.filters button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.filters button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    const f = b.dataset.f;
    document.querySelectorAll('.point').forEach(p => {
      p.classList.toggle('hidden', f !== 'all' && p.dataset.prio !== f);
    });
  });
});
</script>
</body>
</html>`;

fs.writeFileSync(OUT, html);
console.log('Rapport généré :', OUT, (fs.statSync(OUT).size / 1024).toFixed(1) + ' Ko,', points.length, 'points parsés');
