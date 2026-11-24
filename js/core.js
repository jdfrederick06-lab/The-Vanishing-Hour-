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

const clone = v => v == null ? null : JSON.parse(JSON.stringify(v));
function getPath(obj, path) { let o = obj; for (const k of String(path).split('/')) { if (o == null || typeof o !== 'object') return undefined; o = o[k]; } return o; }

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
      if (t.startsWith('door:')) return STORY.worlds[t.slice(5)] ? Names.world(t.slice(5)) : t;
      const c = G.byId(t); return c ? c.name.split(' ')[0] : t;
    }).join(', ');
  },
  online(s, id, now = Date.now()) { const p = s.players && s.players[id]; return !!p && now - p.seen < 45000; },
  noshow: (s, id) => !!(s.cast && s.cast[id] && s.cast[id].noshow)
};

/* ---------- who this tab is ----------
   A host code first, then a player code; a scan (a new tab) falls back to the phone's last code.
   { host: true, role } for a host, { id, group } for a player, null for nobody (the invitation). */
const Who = {
  code() {
    return sessionStorage.getItem('vh:host') || sessionStorage.getItem('vh:code') ||
      (() => { try { return localStorage.getItem('vh:lasthost') || localStorage.getItem('vh:last'); } catch (e) { return null; } })();
  },
  now() {
    if (typeof STORY === 'undefined') return null;
    const code = Who.code(), h = code && G.hostByCode(code), c = code && !h && G.byCode(code);
    return h ? { host: true, role: h.role } : c ? { id: c.id, group: c.group } : null;
  }
};

/* ---------- who may see what (Nov 23) ----------
   The night is stored in four places, so each phone only downloads what it's allowed to see:
     state/pub/...        everyone signed in (the clock, Bebbit, the evidence room, announcements)
     state/g/{group}/...  one group (the FBI's files, the crew's burner chat and sale)
     state/p/{id}/...     one person (their messages, their money, their ballot)
     state/h/...          the hosts (the log, the to-do list)
   The game itself still reads and writes ONE state object with the same paths as before:
   Route.split turns a write into the right places, Route.merge puts a phone's places back together.
   Hosts read everything. The database rules enforce the reading side. */
const Route = (() => {
  const uniq = a => [...new Set(a)];
  const NWC = () => (typeof STORY !== 'undefined' && STORY.nightwire) || {};
  /** where a NightBank account's money is kept: g/<group> for a shared group account, p/<id> for a person */
  function wallet(w) {
    const sw = (NWC().wallets || {})[w];
    if (sw) return [].concat(sw.members || []).map(m => m.startsWith('g:') ? 'g/' + m.slice(2) : 'p/' + m);
    return (typeof STORY !== 'undefined' && w && G.byId(w)) ? ['p/' + w] : [];
  }
  /** where a message addressed to `to` goes ('all', 'g:<group>', 'door:<world>', or a character id) */
  function to(t) {
    const out = [];
    [].concat(t || []).forEach(x => {
      if (x === 'all') out.push('pub');
      else if (x.startsWith('g:')) out.push('g/' + x.slice(2));
      else if (x.startsWith('door:')) Object.keys(STORY.groups).filter(g => STORY.groups[g].door === x.slice(5)).forEach(g => out.push('g/' + g));
      else out.push('p/' + x);
    });
    return out.includes('pub') ? ['pub'] : uniq(out);
  }
  const orHost = a => (a = uniq(a)).length ? a : ['h'];
  const tracers = () => Object.entries(((typeof STORY !== 'undefined' && STORY.bebbit) || {}).powers || {}).filter(([, p]) => p.trace).map(([id]) => 'p/' + id);
  /* collections whose items go where their contents say (self = the path is the item itself) */
  const ITEMS = [
    { at: 'feed', fn: it => orHost(to(it.to)) },
    { at: 'nw/tx', fn: it => orHost(wallet(it.from).concat(wallet(it.to))) },
    { at: 'nw/loans', fn: it => orHost(wallet(it.lender).concat(wallet(it.to), it.borrower ? ['p/' + it.borrower] : [])) },
    { at: 'nw/bids', fn: it => uniq(['g/crew'].concat(wallet(it.from))) },
    { at: 'nw/sale', self: true, fn: it => uniq(['g/crew'].concat(...[].concat(it.pitched || []).map(wallet))) },
    { at: 'nw/freeup', fn: (it, key) => orHost(wallet(key)) },
    { at: 'fbi/statements', fn: it => it.public && !it.withdrawn ? ['g/fbi', 'pub'] : ['g/fbi'] },
    { at: 'vote/ballots', fn: (it, key) => ['p/' + key] },
    /* a Bebbit post is public, but who REALLY posted it is only for that person and anyone who can trace posts */
    { at: 'beb/posts', fn: () => ['pub'], fields: { real: it => it.real && G.byId(it.real) ? uniq(['p/' + it.real].concat(tracers())) : [] } }
  ];
  /* whole branches with one home (longest match wins); everything else is public */
  const STATIC = [['nw/chat', 'g/crew'], ['fbi/detained', 'pub'], ['fbi', 'g/fbi'], ['log', 'h'], ['todo', 'h']];
  const under = (p, at) => p === at || p.startsWith(at + '/');
  function ruleFor(p) {
    const it = ITEMS.find(e => e.self ? under(p, e.at) : p.startsWith(e.at + '/'));
    if (it) return { item: it };
    const st = STATIC.filter(([at]) => under(p, at)).sort((a, b) => b[0].length - a[0].length)[0];
    return { bucket: st ? st[1] : 'pub' };
  }
  /* a write at or above a collection (e.g. 'nw/bids': null, or 'fbi': {...}) touches several places */
  const broad = p => ITEMS.some(e => (!e.self && e.at === p) || e.at.startsWith(p + '/')) || STATIC.some(([at]) => at.startsWith(p + '/'));

  /** the places in a stored tree: [['pub', obj], ['g/fbi', obj], ...] */
  function places(st) {
    if (!st) return [];
    const out = [];
    if (st.pub) out.push(['pub', st.pub]);
    Object.entries(st.g || {}).forEach(([k, v]) => out.push(['g/' + k, v]));
    Object.entries(st.p || {}).forEach(([k, v]) => out.push(['p/' + k, v]));
    if (st.h) out.push(['h', st.h]);
    return out;
  }
  const mine = who => !who ? ['pub'] : who.host ? null : ['pub', 'g/' + who.group, 'p/' + who.id];
  function deep(a, b) {
    for (const k in b) {
      const v = b[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) a[k] = deep(a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) ? a[k] : {}, v);
      else a[k] = v;
    }
    return a;
  }
  /** one phone's view: its places merged into the single state object the game reads (hosts get all of them) */
  function merge(st, who) {
    const can = mine(who), out = {};
    places(st).filter(([b]) => !can || can.includes(b)).forEach(([, v]) => deep(out, v));
    return out;
  }

  /** turn a game write { 'a/b': value } into writes to the right places (paths from the database root) */
  function split(u, view, st, who) {
    const out = {}, items = new Map(), host = !!(who && who.host);
    const put = (b, p, v) => { out['state/' + b + '/' + p] = v === undefined ? null : v; };
    const fieldsOf = e => e.fields || {};
    const holders = p => places(st).filter(([, v]) => getPath(v, p) !== undefined).map(([b]) => b);
    function wipe(p) {
      let bs = host ? places(st).map(([b]) => b) : (mine(who) || []).slice();
      ITEMS.filter(e => under(e.at, p)).forEach(e => {
        const coll = getPath(view, e.at); if (!coll || typeof coll !== 'object') return;
        const list = e.self ? [[e.at.split('/').pop(), coll]] : Object.entries(coll);
        list.forEach(([k, it]) => { if (it && typeof it === 'object') { bs = bs.concat(e.fn(it, k)); Object.values(fieldsOf(e)).forEach(f => { bs = bs.concat(f(it)); }); } });
      });
      STATIC.filter(([at]) => under(at, p)).forEach(([, b]) => bs.push(b));
      uniq(bs.concat(['pub'])).forEach(b => put(b, p, null));
    }
    function one(p, v) {
      if (p === 'rsvp' || p.startsWith('rsvp/')) { out[p] = v === undefined ? null : v; return; }
      if (broad(p)) { wipe(p); if (v && typeof v === 'object') Object.keys(v).forEach(k => one(p + '/' + k, v[k])); return; }
      const r = ruleFor(p);
      if (r.bucket) { put(r.bucket, p, v); return; }
      const e = r.item, n = e.at.split('/').length;
      const ip = e.self ? e.at : p.split('/').slice(0, n + 1).join('/'), sub = p.slice(ip.length + 1);
      let rec = items.get(ip);
      if (!rec) { const old = clone(getPath(view, ip)); rec = { e, key: ip.split('/').pop(), old, now: clone(old), whole: false, patches: [] }; items.set(ip, rec); }
      if (!sub) { rec.now = clone(v); rec.whole = true; rec.patches = []; }
      else { if (rec.now == null || typeof rec.now !== 'object') rec.now = {}; setPath(rec.now, sub, v); rec.patches.push([sub, v]); }
    }
    Object.keys(u).sort((a, b) => a.split('/').length - b.split('/').length).forEach(k => one(k, u[k]));
    items.forEach((rec, ip) => {
      const { e, key, old, now } = rec, F = fieldsOf(e);
      const at = it => it && typeof it === 'object' ? e.fn(it, key) : [];
      const oldB = at(old), newB = at(now);
      if (now == null) {
        uniq(oldB.concat(host ? holders(ip) : [])).forEach(b => put(b, ip, null));
        Object.entries(F).forEach(([name, f]) => (old ? f(old) : []).forEach(b => put(b, ip + '/' + name, null)));
        return;
      }
      const strip = it => { const o = Object.assign({}, it); Object.keys(F).forEach(f => delete o[f]); return o; };
      newB.forEach(b => {
        if (rec.whole || !oldB.includes(b)) put(b, ip, strip(now));
        else rec.patches.filter(([s]) => !(s.split('/')[0] in F)).forEach(([s, v]) => put(b, ip + '/' + s, v));
      });
      oldB.filter(b => !newB.includes(b)).forEach(b => put(b, ip, null));
      Object.entries(F).forEach(([name, f]) => {
        const ob = old ? f(old) : [], nb = f(now);
        if (now[name] !== undefined) nb.forEach(b => put(b, ip + '/' + name, now[name]));
        ob.filter(b => !nb.includes(b)).forEach(b => put(b, ip + '/' + name, null));
      });
    });
    return out;
  }
  /** apply split writes to a stored tree (parents before children) */
  function apply(tree, out) { Object.keys(out).sort((a, b) => a.split('/').length - b.split('/').length).forEach(p => setPath(tree, p, out[p])); return tree; }
  return { split, merge, apply, places, wallet, to, mine };
})();

/* ---------- live sync ----------
   One shared "state" object. DB.update({'a/b': value}) changes it everywhere.
   Local mode keeps it in this browser and syncs every open tab, so several
   tabs can act as different phones. It stores the night in the same four places
   as the online database, so a test here shows exactly what each phone can see. */
const DB = (() => {
  if (CONFIG.BACKEND === 'firebase') return FireDB();
  const KEY = 'vh:' + CONFIG.GAME_ID + ':phys';
  let tree = {}, view = {}; const subs = [];
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel(KEY) : null;
  const who = () => Who.now();
  const load = () => {
    try { tree = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { tree = {}; }
    const w = who(); view = Route.merge(tree.state, w);
    if (w && w.host && tree.rsvp) view.rsvp = tree.rsvp;
    return view;
  };
  const emit = () => subs.forEach(f => { try { f(view); } catch (e) { console.error(e); } });
  load();
  if (bc) bc.onmessage = () => { load(); emit(); };
  window.addEventListener('storage', e => { if (e.key === KEY) { load(); emit(); } });
  function update(u) {
    load(); Route.apply(tree, Route.split(u, view, tree.state, who()));
    try { localStorage.setItem(KEY, JSON.stringify(tree)); }
    catch (e) { console.error(e); load(); emit(); return false; }   // storage full: undo and report
    load(); if (bc) bc.postMessage(1); emit(); return true;
  }
  return {
    get: () => view,
    fresh: load,
    on(f) { subs.push(f); f(view); },
    update,
    /** run fn(state) while holding a lock on `key`; fn returns the writes, or null to cancel. Resolves true if saved. */
    guard(key, fn) { const u = fn(load()); return Promise.resolve(u ? update(u) : false); },
    /** clears the night; the replies (rsvp) are never touched */
    reset() { load(); delete tree.state; try { localStorage.setItem(KEY, JSON.stringify(tree)); } catch (e) { } load(); if (bc) bc.postMessage(1); emit(); },
    reclaim() { load(); emit(); return Promise.resolve(); },
    who,
    net: () => ({ online: true, drops: 0, since: 0 }),
    loaded: () => Promise.resolve(),
    ready: Promise.resolve(), backend: 'local'
  };
})();

/* ---------- the online database (CONFIG.BACKEND = 'firebase') ----------
   Same calls as local mode, so no page has to change. Layout in Firebase:
     /state/pub|g|p|h/... the night, split by who may see it (see Route above)
     /rsvp/{id}       invitation replies: anyone can send one, only hosts can read them, none can be deleted
     /sessions/{uid}  which character (or host) this phone signed in as, proved with a hashed code word
     /codes/{hash}    the hashed code words (imported once in the Firebase console; nobody can read them)
     /locks/{key}     short locks so two phones can't spend the same money at once
   Every tab signs in anonymously (each tab its own sign-in, so one computer can test several phones).
   Writes wait until the sign-in is done, then go out as one multi-path update. */
function FireDB() {
  const subs = [];
  let tree = { state: {} }, rsvp = null, uidNow = null, me = null, listening = [], skew = 0;
  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(CONFIG.FIREBASE);
  const auth = firebase.auth(app), db = firebase.database(app);
  let cache = {};
  const emit = () => { cache = Route.merge(tree.state, me); if (rsvp && me && me.host) cache.rsvp = rsvp; subs.forEach(f => { try { f(cache); } catch (e) { console.error(e); } }); };
  const status = (on, msg) => { document.documentElement.classList.toggle('db-offline', !on); if (msg) console.warn('[db]', msg); };
  db.ref('.info/serverTimeOffset').on('value', s => { skew = s.val() || 0; });
  const now = () => Date.now() + skew;

  /* sign in (anonymous, one per tab) */
  const user = auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(() => {}).then(() => new Promise(res => {
    const off = auth.onAuthStateChanged(u => { if (u) { off(); uidNow = u.uid; res(u); } });
    if (!auth.currentUser) auth.signInAnonymously().catch(e => { status(false, 'sign-in failed: ' + e.code); });
  }));
  const hash = async code => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vanishing-hour:' + normCode(code)));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  };
  function stopListening() { listening.forEach(r => r.off()); listening = []; }
  /* a host downloads the whole night; a phone only its places (everyone's, its group's, its own) */
  /* "loaded": resolves once this tab has its first copy of everything it watches (or has nothing to watch) */
  let gotIt, loaded = new Promise(r => { gotIt = r; });
  function listen() {
    stopListening(); tree = { state: {} }; rsvp = null;
    let waiting = 0;
    const watch = (path, set) => { const r = db.ref(path); listening.push(r); waiting++; let first = true; const done = () => { if (first) { first = false; if (--waiting === 0) gotIt(); } }; r.on('value', snap => { set(snap.val()); emit(); done(); }, e => { status(false, path + ': ' + e.code); done(); }); };
    if (me.host) {
      watch('state', v => { tree.state = v || {}; });
      watch('rsvp', v => { rsvp = v || {}; });
    } else {
      watch('state/pub', v => { tree.state.pub = v || undefined; });
      watch('state/g/' + me.group, v => { tree.state.g = { [me.group]: v || {} }; });
      watch('state/p/' + me.id, v => { tree.state.p = { [me.id]: v || {} }; });
    }
  }
  /* prove the code word: write /sessions/{uid}; the rules check the hash against /codes */
  async function claim() {
    await user;
    if (typeof STORY === 'undefined') return null;   /* the invitation page: anonymous is enough to send an RSVP */
    const code = Who.code(), h = code && G.hostByCode(code), c = code && !h && G.byCode(code);
    if (!h && !c) { me = null; stopListening(); tree = { state: {} }; rsvp = null; emit(); return null; }
    const rec = h ? { h: await hash(code), role: 'host', host: h.role, at: Date.now() } : { h: await hash(code), role: 'player', id: c.id, group: c.group, at: Date.now() };
    try { await db.ref('sessions/' + uidNow).set(rec); } catch (e) { status(false, 'that code word was refused by the database (' + e.code + ')'); return null; }
    me = h ? { host: true, role: h.role } : { id: c.id, group: c.group };
    listen(); status(true); return rec;
  }
  const safe = () => claim().then(rec => { if (!rec) gotIt(); return rec; }, e => { console.warn('[db] sign-in problem', e); gotIt(); return null; });
  let ready = safe();

  /* Firebase can't take two paths where one contains the other in one update: fold children into parents */
  function fold(u) {
    const keys = Object.keys(u).sort((a, b) => a.split('/').length - b.split('/').length || (a < b ? -1 : 1)), out = {};
    keys.forEach(k => {
      const parent = Object.keys(out).find(p => k.startsWith(p + '/'));
      const v = u[k] == null ? null : clone(u[k]);
      if (parent) { if (out[parent] === null || typeof out[parent] !== 'object') out[parent] = {}; setPath(out[parent], k.slice(parent.length + 1), v); }
      else out[k] = v;
    });
    return out;
  }
  /* connection health: how many times this tab has dropped off (shown on the host's Health tab) */
  const net = { online: false, drops: 0, since: Date.now() }; let wasOn = false;
  db.ref('.info/connected').on('value', s => {
    const on = !!s.val(); status(on);
    if (wasOn && !on) net.drops++;
    if (on !== net.online) net.since = Date.now();
    net.online = on; if (on) wasOn = true;
  });
  const send = u => db.ref().update(fold(Route.split(u, cache, tree.state, me)));

  return {
    get: () => cache,
    fresh: () => cache,
    on(f) { subs.push(f); f(cache); },
    /** returns a promise of true (saved) or false (refused); callers that don't care can ignore it */
    update(u) {
      return ready.then(() => send(u)).then(() => true, e => {
        console.warn('[db] write refused', e && e.code, Object.keys(u));
        if (typeof Report !== 'undefined' && !Object.keys(u).every(k => k.startsWith('log/'))) Report.err('a save was refused (' + Object.keys(u).slice(0, 3).join(', ') + ')');
        return false;
      });
    },
    /** Spend safely: take a short lock on `key` (a NightBank account), then run fn(state) on the newest
        state and save what it returns (null = cancel). Two phones can't both pass the check at once. */
    guard(key, fn) {
      return ready.then(async () => {
        const ref = db.ref('locks/' + String(key).replace(/[.#$\[\]\/]/g, '_'));
        let got = false;
        for (let i = 0; i < 25 && !got; i++) {
          const r = await ref.transaction(cur => (cur && cur.by !== uidNow && now() - cur.at < 8000) ? undefined : { by: uidNow, at: now() }, null, false).catch(() => null);
          got = !!(r && r.committed);
          if (!got) await new Promise(res => setTimeout(res, 120 + Math.random() * 200));
        }
        if (!got) { console.warn('[db] busy:', key); if (typeof Report !== 'undefined') Report.err('an account stayed locked too long (' + key + ')'); return false; }
        try {
          await new Promise(res => setTimeout(res, 60));   /* let the last holder's writes arrive */
          const u = fn(cache); if (!u) return false;
          await send(u); return true;
        } catch (e) { console.warn('[db] guarded write refused', e && e.code); return false; }
        finally { ref.remove().catch(() => {}); }
      });
    },
    reset() { return ready.then(() => db.ref('state').remove()).catch(e => console.warn('[db] reset refused', e.code)); },
    /** call after signing in or out, so the database knows who this tab is now */
    reclaim() { ready = safe(); return ready; },
    who: () => me,
    net: () => net,
    /** resolves when the first data has arrived (use before reading DB.get() on page load) */
    loaded: () => ready.then(() => Promise.race([loaded, new Promise(r => setTimeout(r, 6000))])),
    get ready() { return ready; },
    backend: 'firebase'
  };
}

/* ---------- who is using this tab ----------
   Kept per tab (sessionStorage), so two tabs can be two different players. */
const Session = {
  player() { const c = sessionStorage.getItem('vh:code'); return c ? G.byCode(c) : null; },
  host() { const c = sessionStorage.getItem('vh:host'); return c ? G.hostByCode(c) : null; },
  /** Try a code word. Returns 'host', 'player' or null. */
  signIn(code) {
    /* the phone also remembers the last code word, so a scanned QR (which opens a new tab) knows who's scanning */
    const keep = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
    if (G.hostByCode(code)) { sessionStorage.setItem('vh:host', normCode(code)); keep('vh:lasthost', normCode(code)); if (DB.reclaim) DB.reclaim(); return 'host'; }
    if (G.byCode(code)) { sessionStorage.setItem('vh:code', normCode(code)); keep('vh:last', normCode(code)); if (DB.reclaim) DB.reclaim(); return 'player'; }
    return null;
  },
  /** Who scanned this (a new tab): this tab's sign-in, or the last one on this phone. */
  lastPlayer() { let c = sessionStorage.getItem('vh:code'); if (!c) try { c = localStorage.getItem('vh:last'); } catch (e) { } return c ? G.byCode(c) : null; },
  lastHost() { let c = sessionStorage.getItem('vh:host'); if (!c) try { c = localStorage.getItem('vh:lasthost'); } catch (e) { } return c ? G.hostByCode(c) : null; },
  signOut() { sessionStorage.removeItem('vh:code'); sessionStorage.removeItem('vh:host'); try { localStorage.removeItem('vh:last'); localStorage.removeItem('vh:lasthost'); } catch (e) { } if (DB.reclaim) DB.reclaim(); }
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
    const from = Clock.startOf(s, i); ((STORY.bebbit && STORY.bebbit.chatter) || []).forEach((c, j) => { if (c.at >= from) u['chatter/' + j] = null; });
    u.clock = { i, startedAt: Date.now(), len: Clock.mins(s, i) * 60000 / Clock.speed(s), paused: false, pausedAt: 0 };
    Clock.log(u, 'clock', 'Phase started: ' + STORY.phases[i].name);
    DB.update(u);
  },
  pause() { const c = DB.fresh().clock; if (!c || c.paused || c.i < 0) return; const u = { 'clock/paused': true, 'clock/pausedAt': Date.now() }; Clock.log(u, 'clock', 'Clock paused.'); DB.update(u); },
  resume() { const c = DB.fresh().clock; if (!c || !c.paused) return; const u = { 'clock/paused': false, 'clock/startedAt': c.startedAt + (Date.now() - c.pausedAt), 'clock/pausedAt': 0 }; Clock.log(u, 'clock', 'Clock resumed.'); DB.update(u); },
  add(min) { const s = DB.fresh(), c = s.clock; if (!c || c.i < 0 || c.i >= STORY.phases.length) return; const u = { 'clock/len': Math.max(1000, c.len + min * 60000 / Clock.speed(s)) }; Clock.log(u, 'clock', (min > 0 ? 'Added ' : 'Removed ') + Math.abs(min) + ' minutes.'); DB.update(u); },
  /** a line in the host log; `by` says who did it ('host:main', 'host:fbi', 'host:crew' or a character id) */
  log(u, tag, text) { const w = DB.who ? DB.who() : null; u['log/' + uid('l')] = { at: Date.now(), tag, text, by: w ? (w.host ? 'host:' + w.role : w.id) : null }; },
  /** Run by host pages a few times a second: sends due cues and moves to the next phase when time is up. */
  tick() {
    const s = DB.get(), r = Clock.read(s);
    if (r.state !== 'live') return;
    const u = {};
    r.phase.cues.forEach((c, j) => {
      const id = r.phase.id + '_' + j;
      if (c.at <= r.elapsedMin && !(s.feed && s.feed[id])) Clock.cue(u, r.phase, j);
    });
    /* background chatter on Bebbit (non-characters), so the real posts are harder to spot */
    const ch = (STORY.bebbit && STORY.bebbit.chatter) || [];
    if (typeof Bebbit !== 'undefined') ch.forEach((c, j) => { if (c.at <= r.nightMin && !(s.chatter && s.chatter[j])) { u['chatter/' + j] = Date.now(); Bebbit.post(u, { by: c.by, text: c.text, plant: true }); } });
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

/* ---------- error reports (Nov 23) ----------
   When something goes wrong on a phone (a script error, a refused save, a stuck money lock),
   it writes one line to the host log (tag 'error'), shown on the host's Health tab.
   At most 8 different errors per page load, each only once; nothing is sent before sign-in. */
const Report = (() => {
  let n = 0; const seen = new Set();
  function err(msg) {
    try {
      const w = DB.who ? DB.who() : null; if (!w || n >= 8) return;
      const key = String(msg || 'unknown error').slice(0, 160); if (seen.has(key)) return;
      seen.add(key); n++;
      const page = location.pathname.split('/').filter(Boolean).pop() || 'index.html';
      const u = {}; Clock.log(u, 'error', page + ': ' + key); DB.update(u);
    } catch (e) { }
  }
  window.addEventListener('error', e => err(e.message || 'script error'));
  window.addEventListener('unhandledrejection', e => err('unhandled: ' + ((e.reason && e.reason.message) || e.reason)));
  return { err };
})();

/* ---------- the names players see (Nov 24) ----------
   The bank goes by a different name in each world: Bebbit Banking (guests and staff), the Federal
   Credit Union (FBI) and Omnizon Wallet (NIGHTWIRE). They all work the same; it's one system.
   NIGHTWIRE itself goes by Omnizon. The story files still say "NightBank" and "NIGHTWIRE";
   Names.say(text, reader) swaps them for whoever is reading, as the text is shown.
   The host terminal keeps the real names. */
const Names = {
  world: d => d === 'nightwire' ? 'Omnizon' : ((typeof STORY !== 'undefined' && STORY.worlds && STORY.worlds[d]) || {}).name || d,
  bank(ch) {
    let d = null; try { d = ch && !ch.host && ch.group ? G.door(ch) : null; } catch (e) { }
    return d === 'bebbit' ? 'Bebbit Banking' : d === 'fbi' ? 'Federal Credit Union' : d === 'nightwire' ? 'Omnizon Wallet' : 'NightBank';
  },
  say(text, ch) {
    if (text == null) return text;
    const t = String(text).replace(/NIGHTWIRE/g, 'Omnizon'), b = Names.bank(ch);
    if (b === 'NightBank') return t;
    return t.replace(/NightBank receipt/g, 'bank receipt')
      .replace(/\b(person's|their|someone's|a|any) NightBank account/g, '$1 bank account')
      .replace(/NightBank (?:wallet|account)/g, b === 'Omnizon Wallet' ? b : b + ' account')
      .replace(/NightBank/g, b);
  }
};

/* ---------- in-page confirmations (instead of the browser's "Are you sure?" popups) ----------
   Ask.sure(text, again, opts) is used inside ordinary click/submit handlers:
     if (!Ask.sure('Send $500?', () => onClick(e, ctx))) return true;
   The first time it opens the site's own dialog and returns false. If the person says yes, it
   runs `again` (the same handler once more), and this time Ask.sure returns true, so the action
   goes ahead exactly as before. Works the same with a mouse, a finger or the keyboard.
   opts: { ok: 'Send', cancel: 'Cancel', danger: true, title: 'NightBank' }
   Ask.input(text, value, cb, opts) asks for a value (the host's "± money"). */
const Ask = (() => {
  let pass = null, open = null;
  function close(v) {
    if (!open) return; const o = open; open = null;
    o.el.classList.add('out'); setTimeout(() => o.el.remove(), 180);
    if (o.prev && o.prev.focus) try { o.prev.focus({ preventScroll: true }); } catch (e) { }
    o.done(v);
  }
  function show(text, opts, field, done) {
    if (open) close(null);
    const el = document.createElement('div'); el.className = 'ask'; el.setAttribute('role', 'presentation');
    const id = uid('ask');
    el.innerHTML = `<div class="ask-card${opts.danger ? ' danger' : ''}" role="alertdialog" aria-modal="true" aria-labelledby="${id}">
      ${opts.title ? `<small class="ask-title">${esc(opts.title)}</small>` : ''}
      <p class="ask-text" id="${id}">${esc(text)}</p>
      ${field ? `<input class="field ask-in" value="${esc(field.value || '')}" inputmode="${field.mode || 'text'}" aria-label="${esc(text)}" autocomplete="off">` : ''}
      <div class="ask-btns"><button type="button" class="btn ghost ask-no">${esc(opts.cancel || 'Cancel')}</button><button type="button" class="btn primary ask-yes${opts.danger ? ' danger' : ''}">${esc(opts.ok || 'Yes')}</button></div></div>`;
    document.body.appendChild(el);
    open = { el, done, prev: document.activeElement };
    const inp = el.querySelector('.ask-in'), yes = el.querySelector('.ask-yes');
    const val = () => field ? inp.value : true;
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('.ask-no')) close(null); else if (e.target.closest('.ask-yes')) close(val()); });
    el.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(null); }
      else if (e.key === 'Enter') { e.preventDefault(); close(val()); }
      else if (e.key === 'Tab') { const f = [...el.querySelectorAll('button, input')]; const i = f.indexOf(document.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus(); }
      e.stopPropagation();
    });
    setTimeout(() => { if (inp) { inp.focus(); inp.select(); } else yes.focus(); }, 30);
  }
  return {
    sure(text, again, opts) {
      if (pass === text) { pass = null; return true; }
      show(text, opts || {}, null, v => { if (!v) return; pass = text; try { if (again) again(); } finally { pass = null; } });
      return false;
    },
    input(text, value, cb, opts) { show(text, opts || {}, { value, mode: (opts && opts.mode) || 'text' }, v => { if (v != null) cb(v); }); },
    isOpen: () => !!open
  };
})();

/** Send a host message to phones. to = 'all', 'g:<group>' or a character id. */
function sendMessage(to, text, from) {
  const u = {}; u['feed/' + uid('m')] = { to: [].concat(to), title: from || 'From the host', text, at: Date.now(), kind: 'msg' };
  Clock.log(u, 'msg', 'Message to ' + G.toLabel(to) + ': ' + text);
  DB.update(u);
}
