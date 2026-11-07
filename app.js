// ===== Treenisovellus =====
// Kaikki tiedot tallennetaan puhelimen selaimen localStorageen (ei palvelinta).

const KEY = 'treeni-data-v1';

// ---------- Tietojen lataus ja tallennus ----------
// data sisältää: templates (treenipohjat), workouts (valmiit treenit), active (käynnissä oleva treeni)
let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return Object.assign({ templates: [], workouts: [], active: null }, JSON.parse(raw));
  } catch (e) { console.error('Latausvirhe', e); }
  return { templates: [], workouts: [], active: null };
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
}

// ---------- Apufunktiot ----------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
// Muuttaa tekstin turvalliseksi HTML:ään (estää esim. < ja > merkkien sotkemisen)
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = iso => new Date(iso).toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' });
const num = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);

// Kaikki tunnetut liikkeet (pohjista ja tehdyistä treeneistä) ehdotuslistaa varten
function knownExercises() {
  const set = new Set();
  data.templates.forEach(t => t.exercises.forEach(e => set.add(e)));
  data.workouts.forEach(w => w.entries.forEach(e => set.add(e.exercise)));
  if (data.active) data.active.entries.forEach(e => set.add(e.exercise));
  return [...set].sort((a, b) => a.localeCompare(b, 'fi'));
}

// Liikkeen aiemmat kerrat uusin ensin
function history(exercise, excludeId) {
  return data.workouts
    .filter(w => w.id !== excludeId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(w => {
      const e = w.entries.find(x => x.exercise === exercise);
      return e ? { date: w.date, sets: e.sets, note: e.note } : null;
    })
    .filter(Boolean);
}

const fmtSet = s => `${s.weight ?? '?'} kg × ${s.reps ?? '?'}${s.rpe != null ? ' @' + s.rpe : ''}`;
// Arvioitu yhden toiston maksimi (Epleyn kaava)
const e1rm = s => (s.weight && s.reps) ? s.weight * (1 + s.reps / 30) : 0;

// ---------- Näkymän tila ----------
let view = 'home';       // home | workout | templates | templateEdit | settings
let editingTemplate = null;
let chartMetric = 'weight';

const app = document.getElementById('app');
const modal = document.getElementById('modal');

function go(v) { view = v; render(); window.scrollTo(0, 0); }

function render() {
  if (view === 'home') app.innerHTML = homeHTML();
  else if (view === 'workout') app.innerHTML = workoutHTML();
  else if (view === 'templates') app.innerHTML = templatesHTML();
  else if (view === 'templateEdit') app.innerHTML = templateEditHTML();
  else if (view === 'settings') app.innerHTML = settingsHTML();
}

// ---------- Näkymät ----------
function homeHTML() {
  const a = data.active;
  const done = [...data.workouts].sort((x, y) => y.date.localeCompare(x.date));
  return `
    <h1>🏋️ Treenit</h1>
    ${a ? `<div class="card">
        <div class="muted">Käynnissä oleva treeni</div>
        <div><b>${esc(a.name)}</b></div>
        <button class="primary full" data-act="open-active" style="margin-top:8px">Jatka treeniä</button>
      </div>` : ''}
    <button class="primary full" data-act="start-empty">+ Aloita tyhjä treeni</button>

    <h2>Omat treenipohjat</h2>
    ${data.templates.map(t => `
      <div class="card row between">
        <div class="grow"><b>${esc(t.name)}</b><div class="muted">${t.exercises.length} liikettä</div></div>
        <button class="primary small" data-act="start-template" data-id="${t.id}">Aloita</button>
      </div>`).join('') || '<div class="muted">Ei vielä pohjia.</div>'}
    <button class="full" data-act="templates" style="margin-top:6px">Muokkaa treenipohjia</button>

    <h2>Tehdyt treenit</h2>
    ${done.map(w => `
      <div class="card">
        <div class="row between">
          <div><b>${esc(w.name)}</b><div class="muted">${fmtDate(w.date)}</div></div>
          <button class="danger small" data-act="delete-workout" data-id="${w.id}">Poista</button>
        </div>
        ${w.entries.map(e => `<div class="muted">${esc(e.exercise)}: ${e.sets.map(fmtSet).join(', ')}</div>`).join('')}
      </div>`).join('') || '<div class="muted">Ei vielä tehtyjä treenejä.</div>'}

    <button class="full" data-act="settings" style="margin-top:12px">⚙️ Varmuuskopio</button>`;
}

function workoutHTML() {
  const w = data.active;
  if (!w) { view = 'home'; return homeHTML(); }
  return `
    <div class="row between">
      <h1>${esc(w.name)}</h1>
      <button class="small" data-act="home">⬅ Takaisin</button>
    </div>
    <div class="muted" style="margin-bottom:10px">${fmtDate(w.date)}</div>

    ${w.entries.map((e, i) => entryHTML(e, i, w)).join('')}

    <div class="card">
      <input id="newExercise" list="exlist" placeholder="Lisää liike (kirjoita nimi)">
      <datalist id="exlist">${knownExercises().map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <button class="full" data-act="add-exercise" style="margin-top:8px">+ Lisää liike</button>
    </div>
    <div class="row">
      <button class="grow" data-act="save-as-template">Tallenna pohjaksi</button>
      <button class="danger" data-act="cancel-workout">Hylkää treeni</button>
    </div>
    <div class="bottom-bar"><div class="inner">
      <button class="primary grow" data-act="finish">✔ Valmis, tallenna treeni</button>
    </div></div>`;
}

function entryHTML(e, i, w) {
  const prev = history(e.exercise, w.id)[0];
  return `
    <div class="card">
      <div class="row between">
        <button class="link" data-act="history" data-ex="${esc(e.exercise)}">${esc(e.exercise)}</button>
        <button class="danger small" data-act="remove-exercise" data-i="${i}">Poista</button>
      </div>
      <div class="prev">${prev
        ? `Edellinen (${fmtDate(prev.date)}): ${prev.sets.map(fmtSet).join(', ')}${prev.note ? '<br>📝 ' + esc(prev.note) : ''}`
        : 'Ei aiempaa kertaa'}</div>
      <div class="set set-head"><span>#</span><span>Paino kg</span><span>Toistot</span><span>RPE</span><span></span></div>
      ${e.sets.map((s, j) => {
        const p = prev && prev.sets[j];
        return `<div class="set">
          <span class="n">${j + 1}</span>
          <input type="number" inputmode="decimal" step="any" placeholder="${p?.weight ?? ''}" value="${s.weight ?? ''}" data-f="weight" data-i="${i}" data-j="${j}">
          <input type="number" inputmode="numeric" step="1" placeholder="${p?.reps ?? ''}" value="${s.reps ?? ''}" data-f="reps" data-i="${i}" data-j="${j}">
          <input type="number" inputmode="decimal" step="0.5" min="1" max="10" placeholder="${p?.rpe ?? ''}" value="${s.rpe ?? ''}" data-f="rpe" data-i="${i}" data-j="${j}">
          <button class="danger small" data-act="remove-set" data-i="${i}" data-j="${j}">✕</button>
        </div>`;
      }).join('')}
      <button class="small" data-act="add-set" data-i="${i}">+ Sarja</button>
      <textarea placeholder="Muistiinpano" data-f="note" data-i="${i}" style="margin-top:8px">${esc(e.note || '')}</textarea>
    </div>`;
}

function templatesHTML() {
  return `
    <div class="row between"><h1>Treenipohjat</h1><button class="small" data-act="home">⬅ Takaisin</button></div>
    ${data.templates.map(t => `
      <div class="card row between">
        <div class="grow"><b>${esc(t.name)}</b><div class="muted">${t.exercises.map(esc).join(', ')}</div></div>
        <button class="small" data-act="edit-template" data-id="${t.id}">Muokkaa</button>
      </div>`).join('') || '<div class="muted">Ei vielä pohjia.</div>'}
    <button class="primary full" data-act="new-template">+ Uusi pohja</button>`;
}

function templateEditHTML() {
  const t = editingTemplate;
  return `
    <div class="row between"><h1>Muokkaa pohjaa</h1><button class="small" data-act="templates">⬅ Takaisin</button></div>
    <div class="card">
      <input id="tplName" placeholder="Pohjan nimi (esim. Ylävartalo A)" value="${esc(t.name)}">
    </div>
    ${t.exercises.map((n, i) => `
      <div class="card row">
        <div class="grow"><b>${esc(n)}</b></div>
        <button class="small" data-act="tpl-up" data-i="${i}">↑</button>
        <button class="small" data-act="tpl-down" data-i="${i}">↓</button>
        <button class="danger small" data-act="tpl-remove" data-i="${i}">✕</button>
      </div>`).join('')}
    <div class="card">
      <input id="tplNewEx" list="exlist" placeholder="Lisää liike">
      <datalist id="exlist">${knownExercises().map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <button class="full" data-act="tpl-add" style="margin-top:8px">+ Lisää liike pohjaan</button>
    </div>
    <div class="row">
      <button class="primary grow" data-act="tpl-save">Tallenna pohja</button>
      ${data.templates.some(x => x.id === t.id) ? '<button class="danger" data-act="tpl-delete">Poista pohja</button>' : ''}
    </div>`;
}

function settingsHTML() {
  return `
    <div class="row between"><h1>Varmuuskopio</h1><button class="small" data-act="home">⬅ Takaisin</button></div>
    <div class="card">
      <p class="muted">Tiedot ovat vain tämän puhelimen selaimessa. Lataa varmuuskopio silloin tällöin, niin et menetä historiaa, jos puhelin vaihtuu tai selaimen tiedot tyhjennetään.</p>
      <button class="primary full" data-act="export">Lataa varmuuskopio (tiedosto)</button>
      <p></p>
      <label class="muted">Palauta varmuuskopiosta (korvaa nykyiset tiedot):</label>
      <input type="file" id="importFile" accept=".json,application/json">
    </div>`;
}

// ---------- Liikkeen historia (ikkuna) ----------
function openHistory(exercise) {
  const h = history(exercise, null);
  modal.innerHTML = `<div class="sheet">
    <div class="row between"><h1>${esc(exercise)}</h1><button class="small" data-act="close-modal">Sulje</button></div>
    ${h.length > 1 ? `
      <div class="tabs">
        <button class="small ${chartMetric === 'weight' ? 'active' : ''}" data-act="metric" data-m="weight" data-ex="${esc(exercise)}">Suurin paino</button>
        <button class="small ${chartMetric === 'e1rm' ? 'active' : ''}" data-act="metric" data-m="e1rm" data-ex="${esc(exercise)}">Arvioitu 1RM</button>
      </div>
      ${chartSVG(h)}` : '<div class="muted">Kaavioon tarvitaan vähintään kaksi kertaa.</div>'}
    <h2>Kaikki kerrat</h2>
    ${h.map(x => `<div class="card"><b>${fmtDate(x.date)}</b>
      <div>${x.sets.map(fmtSet).join('<br>')}</div>
      ${x.note ? `<div class="muted">📝 ${esc(x.note)}</div>` : ''}</div>`).join('') || '<div class="muted">Ei vielä tehtyjä kertoja.</div>'}
  </div>`;
  modal.classList.remove('hidden');
}

// Piirtää viivakaavion SVG:nä (ei ulkoisia kirjastoja)
function chartSVG(h) {
  const pts = [...h].reverse().map(x => ({
    date: x.date,
    v: chartMetric === 'weight'
      ? Math.max(0, ...x.sets.map(s => s.weight || 0))
      : Math.max(0, ...x.sets.map(e1rm))
  }));
  const W = 340, H = 180, L = 40, R = 12, T = 14, B = 26;
  const min = Math.min(...pts.map(p => p.v)), max = Math.max(...pts.map(p => p.v));
  const lo = min === max ? min - 1 : min, hi = min === max ? max + 1 : max;
  const x = i => L + (pts.length === 1 ? 0 : i * (W - L - R) / (pts.length - 1));
  const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const d = iso => { const t = new Date(iso); return `${t.getDate()}.${t.getMonth() + 1}.`; };
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    <line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="#4b5563"/>
    <line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="#4b5563"/>
    <text x="${L - 4}" y="${T + 4}" fill="#9ca3af" font-size="10" text-anchor="end">${Math.round(hi * 10) / 10}</text>
    <text x="${L - 4}" y="${H - B}" fill="#9ca3af" font-size="10" text-anchor="end">${Math.round(lo * 10) / 10}</text>
    <text x="${L}" y="${H - 8}" fill="#9ca3af" font-size="10">${d(pts[0].date)}</text>
    <text x="${W - R}" y="${H - 8}" fill="#9ca3af" font-size="10" text-anchor="end">${d(pts[pts.length - 1].date)}</text>
    <polyline points="${line}" fill="none" stroke="#22c55e" stroke-width="2"/>
    ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="3.5" fill="#22c55e"/>`).join('')}
  </svg>`;
}

// ---------- Toiminnot ----------
function newWorkout(name, exercises) {
  data.active = {
    id: uid(), name, date: new Date().toISOString(),
    entries: exercises.map(n => ({ exercise: n, note: '', sets: [{ weight: null, reps: null, rpe: null }] }))
  };
  save(); go('workout');
}

const actions = {
  'home': () => go('home'),
  'open-active': () => go('workout'),
  'start-empty': () => {
    if (data.active && !confirm('Käynnissä oleva treeni hylätään. Jatketaanko?')) return;
    newWorkout('Treeni', []);
  },
  'start-template': el => {
    if (data.active && !confirm('Käynnissä oleva treeni hylätään. Jatketaanko?')) return;
    const t = data.templates.find(x => x.id === el.dataset.id);
    newWorkout(t.name, t.exercises);
  },
  'delete-workout': el => {
    if (!confirm('Poistetaanko treeni pysyvästi?')) return;
    data.workouts = data.workouts.filter(w => w.id !== el.dataset.id);
    save(); render();
  },
  'add-exercise': () => {
    const input = document.getElementById('newExercise');
    const name = input.value.trim();
    if (!name) return;
    data.active.entries.push({ exercise: name, note: '', sets: [{ weight: null, reps: null, rpe: null }] });
    save(); render();
  },
  'remove-exercise': el => {
    if (!confirm('Poistetaanko liike tästä treenistä?')) return;
    data.active.entries.splice(+el.dataset.i, 1);
    save(); render();
  },
  'add-set': el => {
    const e = data.active.entries[+el.dataset.i];
    const last = e.sets[e.sets.length - 1];
    // Uusi sarja kopioi edellisen sarjan arvot, jotta ei tarvitse kirjoittaa samoja uudelleen
    e.sets.push(last ? { ...last } : { weight: null, reps: null, rpe: null });
    save(); render();
  },
  'remove-set': el => {
    const e = data.active.entries[+el.dataset.i];
    e.sets.splice(+el.dataset.j, 1);
    save(); render();
  },
  'finish': () => {
    const w = data.active;
    // Poistetaan tyhjät sarjat ja liikkeet, joissa ei ole yhtään sarjaa
    w.entries.forEach(e => e.sets = e.sets.filter(s => s.weight != null || s.reps != null));
    w.entries = w.entries.filter(e => e.sets.length);
    if (!w.entries.length) { alert('Treenissä ei ole yhtään täytettyä sarjaa.'); return; }
    data.workouts.push(w);
    data.active = null;
    save(); go('home');
  },
  'cancel-workout': () => {
    if (!confirm('Hylätäänkö koko treeni? Tietoja ei tallenneta.')) return;
    data.active = null; save(); go('home');
  },
  'save-as-template': () => {
    const name = prompt('Pohjan nimi:', data.active.name);
    if (!name) return;
    data.templates.push({ id: uid(), name, exercises: data.active.entries.map(e => e.exercise) });
    save(); alert('Pohja tallennettu.');
  },
  'history': el => openHistory(el.dataset.ex),
  'metric': el => { chartMetric = el.dataset.m; openHistory(el.dataset.ex); },
  'close-modal': () => modal.classList.add('hidden'),

  // Pohjat
  'templates': () => go('templates'),
  'new-template': () => { editingTemplate = { id: uid(), name: '', exercises: [] }; go('templateEdit'); },
  'edit-template': el => {
    editingTemplate = JSON.parse(JSON.stringify(data.templates.find(t => t.id === el.dataset.id)));
    go('templateEdit');
  },
  'tpl-add': () => {
    editingTemplate.name = document.getElementById('tplName').value;
    const n = document.getElementById('tplNewEx').value.trim();
    if (n) editingTemplate.exercises.push(n);
    render();
  },
  'tpl-remove': el => { editingTemplate.name = document.getElementById('tplName').value; editingTemplate.exercises.splice(+el.dataset.i, 1); render(); },
  'tpl-up': el => moveTpl(+el.dataset.i, -1),
  'tpl-down': el => moveTpl(+el.dataset.i, 1),
  'tpl-save': () => {
    editingTemplate.name = document.getElementById('tplName').value.trim();
    if (!editingTemplate.name) { alert('Anna pohjalle nimi.'); return; }
    const idx = data.templates.findIndex(t => t.id === editingTemplate.id);
    if (idx >= 0) data.templates[idx] = editingTemplate; else data.templates.push(editingTemplate);
    save(); go('templates');
  },
  'tpl-delete': () => {
    if (!confirm('Poistetaanko pohja?')) return;
    data.templates = data.templates.filter(t => t.id !== editingTemplate.id);
    save(); go('templates');
  },

  // Varmuuskopio
  'settings': () => go('settings'),
  'export': () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `treenit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }
};

function moveTpl(i, dir) {
  editingTemplate.name = document.getElementById('tplName').value;
  const j = i + dir, arr = editingTemplate.exercises;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  render();
}

// Yksi kuuntelija hoitaa kaikki napit (data-act -attribuutin perusteella)
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (el && actions[el.dataset.act]) actions[el.dataset.act](el);
});

// Kenttiin kirjoitettu arvo tallennetaan heti (ilman koko sivun uudelleenpiirtoa)
document.addEventListener('input', ev => {
  const el = ev.target;
  if (!el.dataset.f || !data.active) return;
  const e = data.active.entries[+el.dataset.i];
  if (el.dataset.f === 'note') e.note = el.value;
  else e.sets[+el.dataset.j][el.dataset.f] = num(el.value);
  save();
});

// Varmuuskopion palautus
document.addEventListener('change', ev => {
  if (ev.target.id !== 'importFile') return;
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result);
      if (!Array.isArray(d.workouts) || !Array.isArray(d.templates)) throw new Error('Väärä tiedosto');
      if (!confirm('Nykyiset tiedot korvataan varmuuskopiolla. Jatketaanko?')) return;
      data = Object.assign({ templates: [], workouts: [], active: null }, d);
      save(); go('home');
    } catch (e) { alert('Tiedoston lukeminen epäonnistui.'); }
  };
  reader.readAsText(file);
});

// Palvelutyöntekijä tekee sovelluksesta offline-toimivan ja asennettavan
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

render();
