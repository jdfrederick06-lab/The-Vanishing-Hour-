/* =====================================================================
   THE VANISHING HOUR — shared engine.
   Live sync, the game clock, cues, and small helpers.
   Every page (doors, player app, host page) loads this file.
   ===================================================================== */

/* ---------- small helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const normCode = s => String(s || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const initials = n => String(n).replace(/^Dr\.\s+/, '').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const wallTime = ts => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const mmss = ms => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const hmm = min => { min = Math.max(0, Math.floor(min)); return Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0'); };
const ROOT = window.ROOT || '';
/** Replace an element's HTML only when it actually changed (keeps typing and scrolling stable). */
function patch(el, html) { if (!el) return false; if (el._html !== html) { el._html = html; el.innerHTML = html; return true; } return false; }
function setPath(obj, path, val) {
  const parts = path.split('/'); let o = obj;
  for (let i = 0; i < parts.length - 1; i++) { if (typeof o[parts[i]] !== 'object' || o[parts[i]] === null) o[parts[i]] = {}; o = o[parts[i]]; }
  const k = parts[parts.length - 1];
  if (val === null || val === undefined) delete o[k]; else o[k] = JSON.parse(JSON.stringify(val));
}

/* ---------- live sync ----------
   One shared "state" object. DB.update({'a/b': value}) changes it everywhere.
   Local mode keeps it in this browser and syncs every open tab, so several
   tabs can act as different phones. A Firebase backend with the same three
   functions replaces this block when the site goes online. */
const DB = (() => {
  const KEY = 'vh:' + CONFIG.GAME_ID + ':state';
  let state = {}; const subs = [];
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel(KEY) : null;
  const load = () => { try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { state = {}; } return state; };
  const emit = () => subs.forEach(f => { try { f(state); } catch (e) { console.error(e); } });
  load();
  if (bc) bc.onmessage = () => { load(); emit(); };
  window.addEventListener('storage', e => { if (e.key === KEY) { load(); emit(); } });
  return {
    get: () => state,
    fresh: load,
    on(f) { subs.push(f); f(state); },
    update(u) {
      load(); for (const p in u) setPath(state, p, u[p]);
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { console.error(e); load(); emit(); return false; }   // storage full: undo and report
      if (bc) bc.postMessage(1); emit(); return true;
    },
    reset() { try { localStorage.removeItem(KEY); } catch (e) { } state = {}; if (bc) bc.postMessage(1); emit(); }
  };
})();

/* ---------- the cast ---------- */
const G = {
  byId: id => STORY.characters.find(c => c.id === id),
  byCode: code => STORY.characters.find(c => normCode(c.code) === normCode(code)),
  hostByCode: code => STORY.hosts.find(h => normCode(h.code) === normCode(code)),
  door: ch => STORY.groups[ch.group].door,
  /** Does a cue or message addressed "to" reach this character? */
  hits(to, ch) { return [].concat(to || []).some(t => t === 'all' || t === ch.id || t === 'g:' + ch.group || t === 'door:' + G.door(ch)); },
  /** Does it touch any of these groups? (used for co-host screens) */
  touches(to, groups) { return !groups || STORY.characters.some(c => groups.includes(c.group) && G.hits(to, c)); },
  toLabel(to) {
    return [].concat(to || []).map(t => {
      if (t === 'all') return 'Everyone';
      if (t.startsWith('g:')) return STORY.groups[t.slice(2)] ? STORY.groups[t.slice(2)].name : t;
      if (t.startsWith('door:')) return STORY.worlds[t.slice(5)] ? STORY.worlds[t.slice(5)].name : t;
      const c = G.byId(t); return c ? c.name.split(' ')[0] : t;
    }).join(', ');
  },
  online(s, id, now = Date.now()) { const p = s.players && s.players[id]; return !!p && now - p.seen < 45000; },
  noshow: (s, id) => !!(s.cast && s.cast[id] && s.cast[id].noshow)
};

/* ---------- who is using this tab ----------
   Kept per tab (sessionStorage), so two tabs can be two different players. */
const Session = {
  player() { const c = sessionStorage.getItem('vh:code'); return c ? G.byCode(c) : null; },
  host() { const c = sessionStorage.getItem('vh:host'); return c ? G.hostByCode(c) : null; },
  /** Try a code word. Returns 'host', 'player' or null. */
  signIn(code) {
    if (G.hostByCode(code)) { sessionStorage.setItem('vh:host', normCode(code)); return 'host'; }
    if (G.byCode(code)) { sessionStorage.setItem('vh:code', normCode(code)); return 'player'; }
    return null;
  },
  signOut() { sessionStorage.removeItem('vh:code'); sessionStorage.removeItem('vh:host'); }
};

/* ---------- the game clock ----------
   state.clock = { i, startedAt, len, paused, pausedAt }
   i = phase number (-1 before the night starts, phases.length when it's over).
   Real milliseconds are stored; "speed" (Setup, for testing) makes game time run faster. */
const Clock = {
  speed: s => (s.setup && s.setup.speed) || 1,
  auto: s => !(s.setup && s.setup.auto === false),
  /** Length of phase i in game minutes (Setup can override the story's default). */
  mins(s, i) { const p = STORY.phases[i]; const o = s.setup && s.setup.len && s.setup.len[p.id]; return o || p.min; },
  /** Game minutes from the start of the night to the start of phase i. */
  startOf(s, i) { let t = 0; for (let k = 0; k < i && k < STORY.phases.length; k++) t += Clock.mins(s, k); return t; },
  read(s, now = Date.now()) {
    const c = s.clock, n = STORY.phases.length;
    if (!c || typeof c.i !== 'number' || c.i < 0) return { state: 'before', i: -1 };
    if (c.i >= n) return { state: 'over', i: n };
    const sp = Clock.speed(s), t = c.paused ? c.pausedAt : now, el = Math.max(0, t - c.startedAt);
    return {
      state: c.paused ? 'paused' : 'live', i: c.i, phase: STORY.phases[c.i],
      elapsedMin: el * sp / 60000, lenMin: c.len * sp / 60000,
      remainGameMs: (c.len - el) * sp, frac: Math.min(1, el / c.len),
      nightMin: Clock.startOf(s, c.i) + el * sp / 60000
    };
  },
  /** Start (or restart) phase i. Cues from that phase onward are cleared so they can fire again. */
  start(i) {
    const s = DB.fresh(), n = STORY.phases.length, u = {};
    if (i >= n) { u.clock = { i: n }; Clock.log(u, 'clock', 'The night is over.'); return DB.update(u); }
    for (let k = i; k < n; k++) STORY.phases[k].cues.forEach((c, j) => { u['feed/' + STORY.phases[k].id + '_' + j] = null; });
    u.clock = { i, startedAt: Date.now(), len: Clock.mins(s, i) * 60000 / Clock.speed(s), paused: false, pausedAt: 0 };
    Clock.log(u, 'clock', 'Phase started: ' + STORY.phases[i].name);
    DB.update(u);
  },
  pause() { const c = DB.fresh().clock; if (!c || c.paused || c.i < 0) return; const u = { 'clock/paused': true, 'clock/pausedAt': Date.now() }; Clock.log(u, 'clock', 'Clock paused.'); DB.update(u); },
  resume() { const c = DB.fresh().clock; if (!c || !c.paused) return; const u = { 'clock/paused': false, 'clock/startedAt': c.startedAt + (Date.now() - c.pausedAt), 'clock/pausedAt': 0 }; Clock.log(u, 'clock', 'Clock resumed.'); DB.update(u); },
  add(min) { const s = DB.fresh(), c = s.clock; if (!c || c.i < 0 || c.i >= STORY.phases.length) return; const u = { 'clock/len': Math.max(1000, c.len + min * 60000 / Clock.speed(s)) }; Clock.log(u, 'clock', (min > 0 ? 'Added ' : 'Removed ') + Math.abs(min) + ' minutes.'); DB.update(u); },
  log(u, tag, text) { u['log/' + uid('l')] = { at: Date.now(), tag, text }; },
  /** Run by host pages a few times a second: sends due cues and moves to the next phase when time is up. */
  tick() {
    const s = DB.get(), r = Clock.read(s);
    if (r.state !== 'live') return;
    const u = {};
    r.phase.cues.forEach((c, j) => {
      const id = r.phase.id + '_' + j;
      if (c.at <= r.elapsedMin && !(s.feed && s.feed[id])) Clock.cue(u, r.phase, j);
    });
    /* NightBank: freed-up money arriving, loans going overdue */
    if (typeof NW !== 'undefined' && NW.tick) NW.tick(s, u);
    if (Object.keys(u).length) DB.update(u);
    if (r.remainGameMs <= 0 && Clock.auto(s)) { const f = DB.fresh().clock; if (f && f.i === r.i && !f.paused) Clock.start(r.i + 1); }
  },
  /** Send one cue to its players' phones. */
  cue(u, phase, j) {
    const c = phase.cues[j], id = phase.id + '_' + j;
    /* the feed entry doubles as the "already sent" marker; a cue with no "to" reaches no phone */
    u['feed/' + id] = { to: c.to || [], title: c.title || 'Planted post', text: c.text || (c.post ? c.post.text : ''), at: Date.now(), kind: c.to ? 'cue' : 'plant' };
    if (c.to) Clock.log(u, 'cue', 'Cue sent to ' + G.toLabel(c.to) + ': ' + (c.title || c.text));
    if (c.post && typeof Bebbit !== 'undefined') Bebbit.post(u, Object.assign({ plant: true }, c.post));
  }
};

/** Send a host message to phones. to = 'all', 'g:<group>' or a character id. */
function sendMessage(to, text, from) {
  const u = {}; u['feed/' + uid('m')] = { to: [].concat(to), title: from || 'From the host', text, at: Date.now(), kind: 'msg' };
  Clock.log(u, 'msg', 'Message to ' + G.toLabel(to) + ': ' + text);
  DB.update(u);
}
