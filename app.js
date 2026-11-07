// ===== Treenisovellus =====
// Kaikki tiedot tallennetaan puhelimen selaimen localStorageen (ei palvelinta).

const KEY = 'treeni-data-v1';

// ---------- Tietojen lataus ja tallennus ----------
// data sisältää: templates (treenipohjat), workouts (valmiit treenit), active (käynnissä oleva treeni)
let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return Object.assign(emptyData(), JSON.parse(raw));
  } catch (e) { console.error('Latausvirhe', e); }
  return emptyData();
}
// targets = liikekohtaiset tavoitetoistoalueet, esim. { "Jalkaprässi": { min: 12, max: 15 } }
// muscles = käyttäjän omat lihasryhmävalinnat liikkeille, esim. { "Oma liike": "Rinta" }
// secondary = käyttäjän omat toissijaiset lihasryhmät liikkeille, esim. { "Oma liike": ["Olkapäät"] }
// prefs = käyttäjän asetukset, esim. { showSecondary: true } (näytetäänkö toissijaiset sarjat tilastoissa)
function emptyData() { return { templates: [], workouts: [], active: null, targets: {}, muscles: {}, secondary: {}, prefs: { showSecondary: true } }; }
const showSecondary = () => !data.prefs || data.prefs.showSecondary !== false;
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

const fmtSet = s => `${s.warm ? 'L ' : ''}${s.weight ?? '?'} kg × ${s.reps ?? '?'}${s.rpe != null ? ' @' + s.rpe : ''}`;
// Arvioitu yhden toiston maksimi (Epleyn kaava)
const e1rm = s => (s.weight && s.reps) ? s.weight * (1 + s.reps / 30) : 0;

// ---------- Lihasryhmät ----------
const MAIN_MUSCLES = ['Rinta', 'Selkä', 'Olkapäät', 'Hauis', 'Ojentajat', 'Etureidet', 'Takareidet', 'Pakarat', 'Pohkeet'];
const ALL_MUSCLES = [...MAIN_MUSCLES, 'Vatsa', 'Muut'];

// Arvaa lihasryhmän liikkeen nimestä. Säännöt käydään läpi järjestyksessä, ensimmäinen osuma voittaa.
const MUSCLE_RULES = [
  [/jalkakoukistus|leg curl|romanian|suorin jaloin|maastaveto|hyvää huomenta/, 'Takareidet'],
  [/lonkannosto|hip thrust|pakara|glute/, 'Pakarat'],
  [/pohje|pohkee|calf/, 'Pohkeet'],
  [/kyykky|jalkaprässi|jalan ojennus|askel|leg press|lunge|hack|jalkaojennus/, 'Etureidet'],
  [/pysty|olka|sivunost|takaolka|face pull|arnold|lateral/, 'Olkapäät'],
  [/penkki|rinta|dippi|pec|fly|rist/, 'Rinta'],
  [/ojentaja|ranskalainen|tricep|pushdown/, 'Ojentajat'],
  [/hauis|kääntö|curl/, 'Hauis'],
  [/vatsa|crunch|plank|lankku/, 'Vatsa'],
  [/veto|soutu|leuka|talja|lat |rowing|pull/, 'Selkä']
];
// Käyttäjän oma valinta (data.muscles) menee arvauksen edelle
function muscleOf(name) {
  if (data.muscles && data.muscles[name]) return data.muscles[name];
  const lib = LIBRARY.find(x => x[0] === name); // kirjaston liikkeillä lihasryhmä on tiedossa
  if (lib) return lib[1];
  const n = name.toLowerCase();
  const hit = MUSCLE_RULES.find(([re]) => re.test(n));
  return hit ? hit[1] : 'Muut';
}

// Toissijaiset lihasryhmät: käyttäjän oma valinta menee kirjaston oletuksen edelle.
// Pääasiallinen lihasryhmä suodatetaan pois, ettei sama ryhmä lasketa kahdesti.
function secondaryOf(name) {
  const own = data.secondary && data.secondary[name];
  const list = Array.isArray(own) ? own : (SECONDARY[name] || []);
  const primary = muscleOf(name);
  return list.filter(m => m !== primary);
}

// ---------- Liikehaku ----------
// Poistaa isot kirjaimet ja ääkköset (ä -> a, ö -> o), jotta "ylatalja" löytää "Ylätalja"
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-‐]/g, ' ').trim();

// Hakuehdokkaat: kirjasto + omat liikkeet (historiasta ja pohjista), ilman päällekkäisyyksiä
function candidates() {
  const seen = new Set(LIBRARY.map(x => norm(x[0])));
  const own = knownExercises().filter(n => !seen.has(norm(n))).map(n => [n, muscleOf(n), '']);
  return [...LIBRARY, ...own];
}

// Palauttaa osumat paremmuusjärjestyksessä: nimen alku ensin, sitten sanan alku, sitten muu osuma
function searchExercises(query, limit = 8) {
  const q = norm(query);
  if (!q) return [];
  const tokens = q.split(/\s+/);
  const res = [];
  candidates().forEach(([name, muscle, alias], idx) => {
    const n = norm(name), a = norm(alias), hay = n + ' ' + a;
    if (!tokens.every(t => hay.includes(t))) return;
    let score = 3;                                            // osuma vain jossain päin hakusanoja
    if (n.startsWith(q)) score = 0;                           // nimi alkaa haulla
    else if ((n + ' ' + a).split(' ').some(w => w.startsWith(tokens[0]))) score = 1; // jokin sana alkaa haulla
    else if (tokens.every(t => n.includes(t))) score = 2;
    res.push({ name, muscle, score, idx });
  });
  // Samalla pistemäärällä kirjaston oma järjestys (yleisimmät liikkeet ensin)
  return res.sort((a, b) => a.score - b.score || a.idx - b.idx).slice(0, limit);
}

// Jos kirjoitettu nimi täsmää kirjaston tai omiin liikkeisiin, käytetään sen virallista kirjoitusasua
// (näin "penkkipunnerrus" ja "Penkkipunnerrus" eivät jakaudu kahdeksi liikkeeksi historiassa)
function resolveName(typed) {
  const t = typed.trim();
  const hit = candidates().find(c => norm(c[0]) === norm(t));
  return hit ? hit[0] : t;
}

// Piirtää ehdotuslistan syöttökentän alle. ctx = 'workout' tai 'template'
function showSuggest(input) {
  const ctx = input.dataset.suggest;
  const box = document.getElementById('sugg-' + ctx);
  if (!box) return;
  const typed = input.value.trim();
  const items = searchExercises(typed);
  const exact = typed && norm(resolveName(typed)) === norm(typed) && candidates().some(c => norm(c[0]) === norm(typed));
  box.innerHTML = items.map(i => `<button class="sg" data-act="pick-ex" data-ctx="${ctx}" data-name="${esc(i.name)}">
      <span>${esc(i.name)}</span><span class="muted">${esc(i.muscle)}</span></button>`).join('')
    + (typed && !exact ? `<button class="sg new" data-act="pick-ex" data-ctx="${ctx}" data-name="${esc(typed)}">+ Lisää "${esc(typed)}" omana liikkeenä</button>` : '');
}

function addToWorkout(name) {
  if (!name) return;
  data.active.entries.push({ exercise: name, note: '', sets: [{ weight: null, reps: null, rpe: null }] });
  save(); render();
}
function addToTemplate(name) {
  if (!name) return;
  editingTemplate.name = document.getElementById('tplName').value;
  editingTemplate.exercises.push(name);
  render();
}

// ---------- Ennätykset ----------
// Vertaa liikkeen sarjoja aiempiin kertoihin (prevSessions). Palauttaa listan ennätysteksteistä.
// Ensimmäinen kerta liikkeellä ei ole ennätys, koska vertailukohtaa ei ole.
function prsFor(exercise, sets, prevSessions) {
  if (!prevSessions.length) return [];
  const ok = s => !s.warm && !s.pre && s.weight > 0 && s.reps > 0;
  const cur = sets.filter(ok);
  if (!cur.length) return [];
  const prev = prevSessions.flatMap(x => x.sets).filter(ok);
  if (!prev.length) return [];

  const prevMaxW = Math.max(...prev.map(s => s.weight));
  const curMaxW = Math.max(...cur.map(s => s.weight));
  if (curMaxW > prevMaxW) return [`Painoennätys ${fmtN(curMaxW)} kg (aiempi ${fmtN(prevMaxW)} kg)`];

  // Arvioitu 1RM on luotettava vain melko pienillä toistoilla
  const best = arr => Math.max(0, ...arr.filter(s => s.reps <= 12).map(e1rm));
  const prevE = best(prev), curE = best(cur);
  if (curE > prevE + 0.01) return [`1RM-ennätys (arvio ${fmtN(Math.round(curE * 10) / 10)} kg, aiempi ${fmtN(Math.round(prevE * 10) / 10)} kg)`];

  // Toistoennätys: enemmän toistoja kuin koskaan samalla tai raskaammalla painolla
  let repPr = null;
  for (const s of cur) {
    const prevReps = Math.max(0, ...prev.filter(p => p.weight >= s.weight).map(p => p.reps));
    if (s.reps > prevReps && (!repPr || s.weight > repPr.weight)) repPr = s;
  }
  return repPr ? [`Toistoennätys ${repPr.reps} × ${fmtN(repPr.weight)} kg`] : [];
}

// Kaikki ennätykset historiasta, uusin ensin (tilastosivua varten)
function allPRs() {
  const sorted = [...data.workouts].sort((a, b) => a.date.localeCompare(b.date));
  const out = [];
  sorted.forEach(w => w.entries.forEach(e => {
    const before = sorted.filter(x => x.date < w.date)
      .map(x => x.entries.find(y => y.exercise === e.exercise)).filter(Boolean);
    prsFor(e.exercise, e.sets, before).forEach(text => out.push({ date: w.date, exercise: e.exercise, text }));
  }));
  return out.reverse();
}

// Kesken treenin näkyvä ilmoitus: ennätys ja/tai tavoitteen täyttyminen
function liveNote(entry) {
  const parts = [];
  const pr = prsFor(entry.exercise, entry.sets, history(entry.exercise, data.active ? data.active.id : null));
  if (pr.length) parts.push('🏆 ' + pr[0] + '!');
  const t = targetNote(entry);
  if (t) parts.push(t);
  return parts.join(' ');
}

// ---------- Viikkovolyymi ----------
let statsWeek = 0; // 0 = tämä viikko, -1 = edellinen jne.
function weekRange(offset) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7); // maanantai
  const end = new Date(d); end.setDate(end.getDate() + 7);
  return [d, end];
}
// Työsarjat lihasryhmittäin valitulla viikolla (lämmittelysarjat eivät lasketa).
// Palauttaa { lihasryhmä: { p: pääasialliset sarjat, s: toissijaiset (0,5 / sarja) } }
const SECONDARY_WEIGHT = 0.5;
function weeklyVolume(offset) {
  const [start, end] = weekRange(offset);
  const vol = {};
  const add = (m, key, n) => { (vol[m] = vol[m] || { p: 0, s: 0 })[key] += n; };
  data.workouts.filter(w => new Date(w.date) >= start && new Date(w.date) < end).forEach(w =>
    w.entries.forEach(e => {
      const n = e.sets.filter(s => !s.warm && (s.weight != null || s.reps != null)).length;
      if (!n) return;
      add(muscleOf(e.exercise), 'p', n);
      // Toissijaiset lasketaan vain, jos käyttäjä ei ole piilottanut niitä tilastosivun valinnalla
      if (showSecondary()) secondaryOf(e.exercise).forEach(m => add(m, 's', n * SECONDARY_WEIGHT));
    }));
  return vol;
}

// ---------- Virtuaali-PT ----------
const WEIGHT_STEP = 2.5; // kuinka paljon painoa ehdotetaan lisättäväksi kerralla (kg)
const fmtN = n => String(Math.round(n * 100) / 100).replace('.', ',');

// Neuvoo edellisen kerran perusteella, mitä seuraavalla kerralla kannattaa tehdä.
// Palauttaa { type, text } tai null, jos neuvottavaa ei ole.
function coach(exercise, excludeId) {
  const h = history(exercise, excludeId)[0];
  if (!h) return null;
  const t = data.targets[exercise];
  if (!t || !t.min || !t.max) return { type: 'info', text: 'Aseta liikkeelle tavoitetoistoalue, niin virtuaali-PT osaa neuvoa.' };

  const sets = h.sets.filter(s => !s.warm && s.weight != null && s.reps != null); // lämmittelysarjat eivät vaikuta neuvoon
  if (!sets.length) return null;
  // Katsotaan vain suurimmalla painolla tehtyjä sarjoja (kevyemmät ovat yleensä lämmittelyä)
  const top = Math.max(...sets.map(s => s.weight));
  const topSets = sets.filter(s => s.weight === top);
  const worst = Math.min(...topSets.map(s => s.reps));       // heikoin sarja
  const rpes = topSets.map(s => s.rpe).filter(r => r != null);
  const maxRpe = rpes.length ? Math.max(...rpes) : null;
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;
  // RPE 10 = uupumus, 9 = 1 toisto jäljellä, 8 = 2 toistoa jäljellä, 7 = 3 toistoa jäljellä
  const easy = avgRpe != null && avgRpe <= 7;        // sarjat tuntuivat kevyiltä
  const nearFailure = maxRpe != null && maxRpe >= 9.5; // sarjat veivät lähes uupumukseen

  if (worst >= t.max) {
    if (nearFailure) {
      return { type: 'hold', text: `Tavoite täyttyi (${t.max} toistoa), mutta RPE oli ${fmtN(maxRpe)}, eli sarjat veivät lähes uupumukseen. Pysy vielä painossa ${fmtN(top)} kg ja toista sama tulos vähän kevyemmin (RPE 8–9), ennen kuin nostat.` };
    }
    // Jos sarjat olivat selvästi kevyitä, painoa voi nostaa reilummin
    const step = easy ? WEIGHT_STEP * 2 : WEIGHT_STEP;
    return { type: 'up', text: `Tavoite täyttyi! Kaikki sarjat ${t.max}+ toistoa painolla ${fmtN(top)} kg${easy ? ` ja RPE oli matala (${fmtN(avgRpe)})` : ''}. Nosta painoa: kokeile ${fmtN(top + step)} kg ja tähtää ainakin ${t.min} toistoon.` };
  }
  if (worst < t.min) {
    return { type: 'down', text: `Heikoin sarja jäi alle tavoitealueen (${worst} toistoa, tavoite ${t.min}–${t.max}). Pysy painossa ${fmtN(top)} kg ja yritä päästä vähintään ${t.min} toistoon. Jos ei onnistu kahdella kerralla, vähennä painoa.` };
  }
  // Toistot ovat tavoitealueella: RPE ratkaisee, onko varaa painaa kovemmin
  if (easy) {
    return { type: 'up', text: `RPE oli matala (${fmtN(avgRpe)}), eli jäi vielä reilusti toistoja tankkiin. Voit nostaa painoa (${fmtN(top + WEIGHT_STEP)} kg) tai pysyä painossa ${fmtN(top)} kg ja puskea lähemmäs uupumusta, kunnes RPE on 8–9.` };
  }
  if (nearFailure) {
    return { type: 'hold', text: `Sarjat menivät lähelle uupumusta (RPE ${fmtN(maxRpe)}). Pysy painossa ${fmtN(top)} kg ja yritä saada sama toistomäärä tai yksi lisätoisto (tavoite ${t.max}). Älä nosta painoa vielä.` };
  }
  return { type: 'hold', text: `Olet tavoitealueella${maxRpe != null ? ` ja RPE on sopiva (${fmtN(avgRpe)})` : ''}. Pysy painossa ${fmtN(top)} kg ja yritä lisätä toistoja: tähtää ${Math.min(worst + 1, t.max)} toistoon jokaisessa sarjassa (tavoite ${t.max}).${maxRpe == null ? ' Kirjaa myös RPE, niin neuvot tarkentuvat.' : ''}` };
}

// Reaaliaikainen kehu kesken treenin, kun kaikki sarjat suurimmalla painolla yltävät tavoitteen ylärajaan
function targetNote(entry) {
  const t = data.targets[entry.exercise];
  if (!t || !t.max) return '';
  const sets = entry.sets.filter(s => !s.warm && s.weight != null && s.reps != null);
  if (!sets.length) return '';
  const top = Math.max(...sets.map(s => s.weight));
  const topSets = sets.filter(s => s.weight === top);
  if (topSets.length >= 2 && topSets.every(s => s.reps >= t.max)) {
    return `🎉 Tavoite täyttyi tänään painolla ${fmtN(top)} kg! Virtuaali-PT kertoo treenin lopussa, mitä seuraavaksi.`;
  }
  return '';
}

// Linkki liikeohjeeseen (ExRx.net). Avautuu uuteen välilehteen, joten treeni ei katoa.
function exrxHTML(name) {
  const l = exrxLink(name, muscleOf(name));
  if (!l) return '';
  return `<a class="exlink" href="${l.url}" target="_blank" rel="noopener noreferrer">${l.direct ? 'Näytä liikeohje' : 'Selaa liikeohjeita'} (ExRx.net) ↗</a>`;
}

const coachHTML = c => c ? `<div class="coach ${c.type}">🤖 ${esc(c.text)}</div>` : '';

// ---------- Näkymän tila ----------
let view = 'home';       // home | workout | templates | templateEdit | settings
let editingTemplate = null;
let chartMetric = 'weight';

const app = document.getElementById('app');
const modal = document.getElementById('modal');

function go(v) { view = v; render(); window.scrollTo(0, 0); }

// ---------- Lepoajastin ----------
// Ajastin perustuu loppuaikaan (ei sekunnin laskemiseen), joten se pysyy oikeassa, vaikka puhelin
// välillä nukuttaisi sivua.
let rest = null;          // { end: aikaleima millisekunteina } tai null
let restTimer = null;

// Oletuslepo tavoitetoistoalueen mukaan: raskaat perusliikkeet vaativat pidemmän levon
function restSeconds(exercise, warm) {
  if (warm) return 60;
  const t = data.targets[exercise];
  if (!t || !t.max) return 120;
  if (t.max <= 10) return 180;
  if (t.max <= 15) return 120;
  return 90;
}
function startRest(sec) {
  rest = { end: Date.now() + sec * 1000 };
  clearInterval(restTimer);
  restTimer = setInterval(tickRest, 250);
  tickRest();
}
function stopRest() {
  rest = null; clearInterval(restTimer); restTimer = null;
  const el = document.getElementById('rest'); if (el) el.classList.add('hidden');
}
function tickRest() {
  const el = document.getElementById('rest');
  if (!rest) return;
  const left = Math.ceil((rest.end - Date.now()) / 1000);
  if (left <= 0) {
    if (navigator.vibrate) navigator.vibrate([300, 120, 300]);
    stopRest();
    // Näytetään hetken ajan, että lepo on ohi
    const e2 = document.getElementById('rest');
    if (e2) { e2.classList.remove('hidden'); e2.innerHTML = '<b>✅ Lepo ohi, seuraava sarja!</b>'; setTimeout(() => { if (!rest) e2.classList.add('hidden'); }, 3000); }
    return;
  }
  if (!el) return;
  el.classList.remove('hidden');
  const m = Math.floor(left / 60), s = String(left % 60).padStart(2, '0');
  el.innerHTML = `<b>⏱ Lepo ${m}:${s}</b>
    <button class="small" data-act="rest-add" data-s="-15">−15 s</button>
    <button class="small" data-act="rest-add" data-s="15">+15 s</button>
    <button class="small" data-act="rest-stop">Ohita</button>`;
}

// ---------- Näyttö pysyy päällä treenin aikana ----------
let wakeLock = null;
async function updateWake() {
  const want = view === 'workout' && !!data.active;
  try {
    if (want && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!want && wakeLock) {
      await wakeLock.release(); wakeLock = null;
    }
  } catch (e) { /* ei tuettu tai estetty, ei haittaa */ }
}
// Selain vapauttaa lukon, kun sivu menee taustalle: haetaan se takaisin paluun yhteydessä
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updateWake(); });

// ---------- Pysyvä tallennus ----------
// Pyydetään selainta merkitsemään tiedot pysyviksi, ettei Android siivoa niitä pois tilan loppuessa
let persisted = null;
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(ok => { persisted = ok; }).catch(() => {});
}

function render() {
  const y = window.scrollY; // pidetään vierityskohta, kun sivu piirretään uudelleen
  if (view === 'home') app.innerHTML = homeHTML();
  else if (view === 'workout') app.innerHTML = workoutHTML();
  else if (view === 'templates') app.innerHTML = templatesHTML();
  else if (view === 'templateEdit') app.innerHTML = templateEditHTML();
  else if (view === 'settings') app.innerHTML = settingsHTML();
  else if (view === 'stats') app.innerHTML = statsHTML();
  window.scrollTo(0, y);
  updateWake();
  if (rest) tickRest(); // piirretään ajastin uudelleen, jos se on käynnissä
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
        <div class="row" style="margin-top:8px">
          <button class="grow" data-act="finish">✔ Lopeta ja tallenna</button>
          <button class="danger" data-act="cancel-workout">Hylkää</button>
        </div>
      </div>` : ''}
    <button class="primary full" data-act="start-empty">+ Aloita tyhjä treeni</button>

    <h2>Ohjelmarungot</h2>
    ${PROGRAMS.map(p => `
      <details class="card folder">
        <summary>📁 ${esc(p.name)}</summary>
        <p class="muted">${esc(p.info)}</p>
        ${p.days.map((d, i) => `
          <div class="row between day">
            <div class="grow"><b>${esc(d.name)}</b>
              <div class="muted">${d.exercises.length} liikettä, ${d.exercises.reduce((n, x) => n + x[1], 0)} sarjaa</div></div>
            <button class="small" data-act="preview-program" data-p="${p.id}" data-d="${i}">Katso</button>
            <button class="primary small" data-act="start-program" data-p="${p.id}" data-d="${i}">Aloita</button>
          </div>`).join('')}
      </details>`).join('')}
    <details class="card folder"><summary>ℹ️ Ohjeita ohjelmien käyttöön</summary><p class="muted">${esc(PROGRAM_NOTES)}</p></details>

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

    <button class="full" data-act="stats" style="margin-top:12px">📊 Tilastot ja ennätykset</button>
    <button class="full" data-act="settings" style="margin-top:8px">⚙️ Varmuuskopio</button>`;
}

function statsHTML() {
  const vol = weeklyVolume(statsWeek);
  const [start, end] = weekRange(statsWeek);
  const last = new Date(end); last.setDate(last.getDate() - 1);
  const d = x => `${x.getDate()}.${x.getMonth() + 1}.`;
  const groups = ALL_MUSCLES.filter(m => MAIN_MUSCLES.includes(m) || (vol[m] && vol[m].p + vol[m].s));
  const MAX = 25; // palkin täysi leveys sarjoina
  const prs = allPRs().slice(0, 12);
  return `
    <div class="row between"><h1>Tilastot</h1><button class="small" data-act="home">⬅ Takaisin</button></div>
    <h2>Sarjat lihasryhmittäin</h2>
    <div class="row between">
      <button class="small" data-act="week" data-d="-1">◀</button>
      <b>${statsWeek === 0 ? 'Tämä viikko' : 'Viikko'} ${d(start)}–${d(last)}</b>
      <button class="small" data-act="week" data-d="1" ${statsWeek >= 0 ? 'disabled' : ''}>▶</button>
    </div>
    <label class="chip" style="margin-top:10px">
      <input type="checkbox" data-pref="showSecondary" ${showSecondary() ? 'checked' : ''}> Laske toissijaiset lihasryhmät mukaan (0,5 sarjaa)
    </label>
    <div class="card" style="margin-top:8px">
      ${groups.map(m => {
        const p = vol[m] ? vol[m].p : 0, s = vol[m] ? vol[m].s : 0, n = p + s;
        const cls = n >= 10 && n <= 20 ? 'ok' : n > 20 ? 'high' : 'low';
        const w = x => Math.min(100, x / MAX * 100);
        // Palkin tumma osa = pääasialliset sarjat, vaalea osa = toissijaiset (0,5 / sarja)
        return `<div class="vrow"><span class="vname">${m}</span>
          <div class="vbar"><div class="vfill ${cls}" style="width:${w(p)}%"></div>
            <div class="vfill sec ${cls}" style="left:${w(p)}%;width:${Math.max(0, w(n) - w(p))}%"></div>
            <i style="left:${10 / MAX * 100}%"></i><i style="left:${20 / MAX * 100}%"></i></div>
          <span class="vnum" title="${fmtN(p)} pääasiallista + ${fmtN(s)} toissijaista">${fmtN(n)}</span></div>`;
      }).join('')}
      <p class="muted" style="margin-bottom:0">Viivat kohdissa 10 ja 20 sarjaa. Tutkimusten mukaan noin 10–20 kovaa sarjaa lihasryhmää kohden viikossa riittää useimmille lihaskasvuun. Lämmittelysarjoja ei lasketa. ${showSecondary()
        ? 'Jokainen sarja lasketaan kokonaan liikkeen pääasialliselle lihasryhmälle ja puolikkaana toissijaisille (esim. penkkipunnerruksen sarja: 1 rinta, 0,5 olkapäät, 0,5 ojentajat). Palkin vaalea osa on toissijaisten osuus. Tutkimusten suositus 10–20 sarjaa koskee yleensä suoria sarjoja, joten toissijaiset nostavat lukuja.'
        : 'Vain liikkeen pääasiallinen lihasryhmä lasketaan, joten luvut vastaavat tutkimusten suoria sarjoja.'} Voit muokata liikkeen lihasryhmiä liikkeen nimestä avautuvassa ikkunassa.</p>
    </div>
    <h2>Viimeisimmät ennätykset</h2>
    ${prs.map(p => `<div class="card"><b>🏆 ${esc(p.exercise)}</b>
      <div>${esc(p.text)}</div><div class="muted">${fmtDate(p.date)}</div></div>`).join('')
      || '<div class="muted">Ennätyksiä ilmestyy, kun olet tehnyt saman liikkeen vähintään kahdesti.</div>'}`;
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
      <input id="newExercise" data-suggest="workout" autocomplete="off" placeholder="Hae liikettä (esim. penkki, kyykky)">
      <div class="sugg" id="sugg-workout"></div>
      <button class="full" data-act="add-exercise" style="margin-top:8px">+ Lisää liike</button>
    </div>
    <div class="row">
      <button class="grow" data-act="save-as-template">Tallenna pohjaksi</button>
      <button class="danger" data-act="cancel-workout">Hylkää treeni</button>
    </div>
    <div id="rest" class="rest hidden"></div>
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
      <div class="mu2">${esc(muscleOf(e.exercise))}${secondaryOf(e.exercise).length ? ' · toissijaiset: ' + secondaryOf(e.exercise).map(esc).join(', ') : ''}</div>
      ${exrxHTML(e.exercise)}
      <div class="prev">${prev
        ? `Edellinen (${fmtDate(prev.date)}): ${prev.sets.map(fmtSet).join(', ')}${prev.note ? '<br>📝 ' + esc(prev.note) : ''}`
        : 'Ei aiempaa kertaa'}</div>
      <div class="target row">
        <span class="muted">Tavoitetoistot</span>
        <input type="number" inputmode="numeric" min="1" placeholder="min" value="${data.targets[e.exercise]?.min ?? ''}" data-f="tmin" data-i="${i}">
        <span class="muted">–</span>
        <input type="number" inputmode="numeric" min="1" placeholder="max" value="${data.targets[e.exercise]?.max ?? ''}" data-f="tmax" data-i="${i}">
      </div>
      <div id="coach-${i}">${coachHTML(coach(e.exercise, w.id))}</div>
      <div class="set set-head"><span>#</span><span>Paino kg</span><span>Toistot</span><span>RPE</span><span>✓</span><span></span></div>
      ${(() => {
        // Lasketaan erikseen lämmittely- ja työsarjojen järjestysnumerot,
        // ja haetaan edellisen kerran vastaava sarja haamutekstiksi
        let w = 0, k = 0;
        const prevWarm = prev ? prev.sets.filter(x => x.warm) : [];
        const prevWork = prev ? prev.sets.filter(x => !x.warm) : [];
        return e.sets.map((s, j) => {
          const p = s.warm ? prevWarm[w] : prevWork[k];
          s.warm ? w++ : k++;
          return `<div class="set ${s.pre ? 'pre' : ''}">
          <button class="n-btn ${s.warm ? 'warm' : ''}" data-act="toggle-warm" data-i="${i}" data-j="${j}" title="Vaihda lämmittelysarjaksi">${s.warm ? 'L' : k}</button>
          <input type="number" inputmode="decimal" step="any" placeholder="${p?.weight ?? ''}" value="${s.weight ?? ''}" data-f="weight" data-i="${i}" data-j="${j}">
          <input type="number" inputmode="numeric" step="1" placeholder="${p?.reps ?? ''}" value="${s.reps ?? ''}" data-f="reps" data-i="${i}" data-j="${j}">
          <input type="number" inputmode="decimal" step="0.5" min="1" max="10" placeholder="${p?.rpe ?? ''}" value="${s.rpe ?? ''}" data-f="rpe" data-i="${i}" data-j="${j}">
          <button class="check ${s.done ? 'on' : ''}" data-act="done-set" data-i="${i}" data-j="${j}">✓</button>
          <button class="danger small" data-act="remove-set" data-i="${i}" data-j="${j}">✕</button>
        </div>`;
        }).join('');
      })()}
      <div id="live-${i}" class="live">${esc(liveNote(e))}</div>
      <div class="row" style="flex-wrap:wrap">
        <button class="small" data-act="add-set" data-i="${i}">+ Sarja</button>
        <button class="small" data-act="add-warm" data-i="${i}">+ Lämmittely</button>
        ${prev ? `<button class="small" data-act="fill-prev" data-i="${i}">Täytä edellisestä</button>` : ''}
      </div>
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
      <input id="tplNewEx" data-suggest="template" autocomplete="off" placeholder="Hae liikettä (esim. penkki, kyykky)">
      <div class="sugg" id="sugg-template"></div>
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
      <p class="muted">Pysyvä tallennus: ${persisted === true ? 'käytössä ✅' : 'ei varmistettu (selain voi tyhjentää tiedot, jos tila loppuu), joten lataa varmuuskopio säännöllisesti'}.</p>
      <p class="muted">Liikeohjeiden linkit vievät ulkopuoliselle ExRx.net-sivustolle. Sivusto on erillinen palvelu, ja osa sen sisällöstä voi vaatia maksullisen tilauksen.</p>
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
    ${exrxHTML(exercise)}
    ${data.targets[exercise] ? `<div class="muted">Tavoite: ${data.targets[exercise].min}–${data.targets[exercise].max} toistoa</div>` : ''}
    ${coachHTML(coach(exercise, null))}
    <div class="row" style="margin:8px 0">
      <span class="muted">Lihasryhmä (tilastoihin)</span>
      <select data-muscle-for="${esc(exercise)}">
        ${ALL_MUSCLES.map(m => `<option ${m === muscleOf(exercise) ? 'selected' : ''}>${m}</option>`).join('')}
      </select>
    </div>
    <div class="muted">Toissijaiset lihasryhmät (lasketaan 0,5 sarjana)</div>
    <div class="chips">
      ${[...MAIN_MUSCLES, 'Vatsa'].filter(m => m !== muscleOf(exercise)).map(m => `
        <label class="chip"><input type="checkbox" data-sec-for="${esc(exercise)}" value="${m}" ${secondaryOf(exercise).includes(m) ? 'checked' : ''}> ${m}</label>`).join('')}
    </div>
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
  const pts = [...h].reverse().map(x => {
    const work = x.sets.filter(s => !s.warm); // lämmittelysarjat pois kaaviosta
    return {
      date: x.date,
      v: chartMetric === 'weight'
        ? Math.max(0, ...work.map(s => s.weight || 0))
        : Math.max(0, ...work.map(e1rm))
    };
  });
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
  'start-program': el => {
    if (data.active && !confirm('Käynnissä oleva treeni hylätään. Jatketaanko?')) return;
    const p = PROGRAMS.find(x => x.id === el.dataset.p);
    const d = p.days[+el.dataset.d];
    data.active = {
      id: uid(), name: d.name, date: new Date().toISOString(),
      // Jokaiselle liikkeelle luodaan ohjelman mukainen määrä tyhjiä sarjoja
      entries: d.exercises.map(([name, sets]) => ({
        exercise: name, note: '',
        sets: Array.from({ length: sets }, () => ({ weight: null, reps: null, rpe: null }))
      }))
    };
    // Asetetaan tavoitetoistoalueet, mutta ei ylikirjoiteta käyttäjän omia
    d.exercises.forEach(([name, , min, max]) => { if (!data.targets[name]) data.targets[name] = { min, max }; });
    save(); go('workout');
  },
  'preview-program': el => {
    const p = PROGRAMS.find(x => x.id === el.dataset.p);
    const d = p.days[+el.dataset.d];
    modal.innerHTML = `<div class="sheet">
      <div class="row between"><h1>${esc(d.name)}</h1><button class="small" data-act="close-modal">Sulje</button></div>
      <div class="muted">${esc(p.name)}</div>
      ${d.exercises.map(([n, s, a, b]) => `<div class="card row between"><b>${esc(n)}</b><span>${s} × ${a}–${b}</span></div>`).join('')}
    </div>`;
    modal.classList.remove('hidden');
  },
  'delete-workout': el => {
    if (!confirm('Poistetaanko treeni pysyvästi?')) return;
    data.workouts = data.workouts.filter(w => w.id !== el.dataset.id);
    save(); render();
  },
  'add-exercise': () => addToWorkout(resolveName(document.getElementById('newExercise').value)),
  'pick-ex': el => (el.dataset.ctx === 'template' ? addToTemplate : addToWorkout)(el.dataset.name),
  'remove-exercise': el => {
    if (!confirm('Poistetaanko liike tästä treenistä?')) return;
    data.active.entries.splice(+el.dataset.i, 1);
    save(); render();
  },
  'add-set': el => {
    const e = data.active.entries[+el.dataset.i];
    const last = e.sets[e.sets.length - 1];
    // Uusi sarja kopioi edellisen sarjan arvot, jotta ei tarvitse kirjoittaa samoja uudelleen
    // Merkinnät (lämmittely, valmis, esitäytetty) eivät kopioidu
    e.sets.push(last ? { weight: last.weight, reps: last.reps, rpe: last.rpe } : { weight: null, reps: null, rpe: null });
    save(); render();
  },
  'add-warm': el => {
    const e = data.active.entries[+el.dataset.i];
    // Lämmittelysarja lisätään työsarjojen eteen, muiden lämmittelysarjojen jatkeeksi
    let idx = 0;
    while (idx < e.sets.length && e.sets[idx].warm) idx++;
    e.sets.splice(idx, 0, { weight: null, reps: null, rpe: null, warm: true });
    save(); render();
  },
  'toggle-warm': el => {
    const s = data.active.entries[+el.dataset.i].sets[+el.dataset.j];
    s.warm = !s.warm;
    save(); render();
  },
  'fill-prev': el => {
    const e = data.active.entries[+el.dataset.i];
    const prev = history(e.exercise, data.active.id)[0];
    if (!prev) return;
    const hasData = e.sets.some(s => s.weight != null || s.reps != null);
    if (hasData && !confirm('Nykyiset sarjat korvataan edellisen kerran arvoilla. Jatketaanko?')) return;
    // pre = esitäytetty: jos sarjaa ei muokata tai kuitata, se poistetaan treeniä tallennettaessa
    e.sets = prev.sets.map(s => ({ weight: s.weight, reps: s.reps, rpe: null, warm: !!s.warm, pre: true }));
    save(); render();
  },
  'done-set': el => {
    const e = data.active.entries[+el.dataset.i];
    const s = e.sets[+el.dataset.j];
    s.done = !s.done;
    delete s.pre;
    el.classList.toggle('on', s.done);
    el.closest('.set').classList.remove('pre');
    save();
    if (s.done) startRest(restSeconds(e.exercise, s.warm));
    else stopRest();
  },
  'remove-set': el => {
    const e = data.active.entries[+el.dataset.i];
    e.sets.splice(+el.dataset.j, 1);
    save(); render();
  },
  'finish': () => {
    // Siivotaan tyhjät sarjat ja liikkeet, joissa ei ole yhtään sarjaa
    // (myös esitäytetyt sarjat, joita ei ole muokattu tai kuitattu).
    // Työskennellään kopiolla, jotta käynnissä oleva treeni ei muutu, jos tallennus keskeytyy.
    const w = { ...data.active, entries: data.active.entries
      .map(e => ({ ...e, sets: e.sets.filter(s => !s.pre && (s.weight != null || s.reps != null)) }))
      .filter(e => e.sets.length) };
    if (!w.entries.length) { alert('Treenissä ei ole yhtään täytettyä sarjaa.'); return; }
    stopRest();
    data.workouts.push(w);
    data.active = null;
    save(); go('home');
    showSummary(w);
  },
  'cancel-workout': () => {
    if (!confirm('Hylätäänkö koko treeni? Tietoja ei tallenneta.')) return;
    data.active = null; stopRest(); save(); go('home');
  },
  'rest-add': el => { if (rest) { rest.end += +el.dataset.s * 1000; tickRest(); } },
  'rest-stop': () => stopRest(),
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
  'tpl-add': () => addToTemplate(resolveName(document.getElementById('tplNewEx').value)),
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
  'stats': () => { statsWeek = 0; go('stats'); },
  'week': el => { statsWeek = Math.min(0, statsWeek + +el.dataset.d); render(); },
  'export': () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `treenit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }
};

// Treenin päätteeksi virtuaali-PT kertoo, mitä ensi kerralla kannattaa tehdä
function showSummary(w) {
  modal.innerHTML = `<div class="sheet">
    <h1>Hyvä treeni! 💪</h1>
    <h2>Virtuaali-PT: ensi kerralla</h2>
    ${w.entries.map(e => {
      const pr = prsFor(e.exercise, e.sets, history(e.exercise, w.id));
      return `<div class="card"><b>${esc(e.exercise)}</b>
        ${pr.map(t => `<div class="pr">🏆 ${esc(t)}</div>`).join('')}
        ${coachHTML(coach(e.exercise, null)) || '<div class="muted">Ei neuvoa.</div>'}</div>`;
    }).join('')}
    <button class="primary full" data-act="close-modal">Sulje</button>
  </div>`;
  modal.classList.remove('hidden');
}

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
// Enter valitsee listan ensimmäisen ehdotuksen (tai lisää kirjoitetun nimen, jos ehdotuksia ei ole)
document.addEventListener('keydown', ev => {
  const ctx = ev.target.dataset && ev.target.dataset.suggest;
  if (ev.key !== 'Enter' || !ctx) return;
  ev.preventDefault();
  const first = document.querySelector('#sugg-' + ctx + ' .sg');
  if (first) first.click();
  else actions[ctx === 'template' ? 'tpl-add' : 'add-exercise']();
});

document.addEventListener('input', ev => {
  const el = ev.target;
  if (el.dataset.suggest) { showSuggest(el); return; }
  if (!el.dataset.f || !data.active) return;
  const i = +el.dataset.i;
  const e = data.active.entries[i];
  if (el.dataset.f === 'note') e.note = el.value;
  else if (el.dataset.f === 'tmin' || el.dataset.f === 'tmax') {
    // Tavoitetoistoalue tallennetaan liikkeen nimen alle, joten se pätee kaikkiin treeneihin
    const t = data.targets[e.exercise] || (data.targets[e.exercise] = { min: null, max: null });
    t[el.dataset.f === 'tmin' ? 'min' : 'max'] = num(el.value);
    if (!t.min && !t.max) delete data.targets[e.exercise];
    document.getElementById('coach-' + i).innerHTML = coachHTML(coach(e.exercise, data.active.id));
  } else {
    const s = e.sets[+el.dataset.j];
    s[el.dataset.f] = num(el.value);
    delete s.pre; // muokattu sarja ei ole enää pelkkä esitäyttö
    el.closest('.set').classList.remove('pre');
  }
  document.getElementById('live-' + i).textContent = liveNote(e);
  save();
});

// Varmuuskopion palautus
document.addEventListener('change', ev => {
  // Lihasryhmän valinta liikkeen historiaikkunassa
  if (ev.target.dataset.muscleFor) {
    const ex = ev.target.dataset.muscleFor;
    data.muscles[ex] = ev.target.value;
    save();
    openHistory(ex); // piirretään uudelleen, jotta toissijaisten valinnoista poistuu uusi pääryhmä
    return;
  }
  // Tilastosivun asetus: toissijaisten näyttäminen
  if (ev.target.dataset.pref === 'showSecondary') {
    data.prefs = data.prefs || {};
    data.prefs.showSecondary = ev.target.checked;
    save(); render();
    return;
  }
  // Toissijaisten lihasryhmien valinta: tallennetaan koko valintalista liikkeelle
  if (ev.target.dataset.secFor) {
    const ex = ev.target.dataset.secFor;
    data.secondary[ex] = [...document.querySelectorAll('[data-sec-for]')]
      .filter(c => c.dataset.secFor === ex && c.checked).map(c => c.value);
    save();
    return;
  }
  if (ev.target.id !== 'importFile') return;
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result);
      if (!Array.isArray(d.workouts) || !Array.isArray(d.templates)) throw new Error('Väärä tiedosto');
      if (!confirm('Nykyiset tiedot korvataan varmuuskopiolla. Jatketaanko?')) return;
      data = Object.assign(emptyData(), d);
      save(); go('home');
    } catch (e) { alert('Tiedoston lukeminen epäonnistui.'); }
  };
  reader.readAsText(file);
});

// Palvelutyöntekijä tekee sovelluksesta offline-toimivan ja asennettavan
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

render();
