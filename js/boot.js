/* =====================================================================
   THE VANISHING HOUR — the locked story (Nov 23).
   Every page loads this instead of the story files:
     <script src="js/boot.js" data-need="story,evidence,reveal,dossiers" data-run="js/core.js,js/app.js,…"></script>
   Online, the story is only in locked files (settings/locked/*.js), encrypted with the code words:
     keys.js       one small entry per code word (only that code word opens it): who you are,
                   and the key to your group's copy of the story (hosts get the key to everything)
     host.js       the whole story (hosts)            g-<group>.js  one group's copy (players)
     d-<id>.js     each dossier, locked with its own character's key (d-host.js: all of them, for hosts)
   A group's copy leaves out what its phones never use: the killer and the reveal, everyone's
   code words, the host's cue script and notes, other people's dossiers, and (outside the FBI)
   the case records and clue list. Without a code word, a page only gets settings/public.js.
   On this computer (localhost) the plain files in Vanishing Hour\private\settings are used
   directly, so the story can be edited and tested; add ?locked=1 to test the locked path.
   After the story or the code words change, rebuild: http://localhost:8770/dev/build.html
   Then: data-run scripts load in order and the page starts as before.
   ===================================================================== */
(function () {
  const me = document.currentScript, base = me.src.replace(/js\/boot\.js.*$/, '');
  /* Nov 25: publish.ps1 stamps every page with ?v=<publish time>; the scripts boot loads carry it too, so a
     browser never mixes old cached code with a new update (that broke sign-in after a rebuild) */
  const V = (me.src.match(/[?&]v=([0-9]+)/) || [])[1] || '', ver = src => V && src.indexOf(base) === 0 ? src + (src.includes('?') ? '&' : '?') + 'v=' + V : src;
  const need = (me.dataset.need || '').split(',').map(s => s.trim()).filter(Boolean);
  const run = (me.dataset.run || '').split(',').map(s => s.trim()).filter(Boolean);
  const plain = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]locked=1/.test(location.search);
  const norm = s => String(s || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('could not load ' + src)); document.head.appendChild(s); });
  const inject = code => { const s = document.createElement('script'); s.textContent = code; document.head.appendChild(s); };
  const ub64 = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
  const hex = a => [...a].map(x => x.toString(16).padStart(2, '0')).join('');
  const te = new TextEncoder(), td = new TextDecoder();
  const L = () => window.VH_LOCKED || {};
  let keysLoaded = null;
  const keys = () => keysLoaded || (keysLoaded = load(base + 'settings/locked/keys.js?t=' + Date.now()));
  /* Nov 25: every lock build has a new salt, so the salt names the build. Locked files are fetched with
     it (a new build never mixes with old cached files), and a remembered code is only reused if it
     came from the same build. This is what broke sign-in right after a rebuild. */
  const build = () => ((L().keys || {}).salt || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 10);
  const lockedUrl = f => base + 'settings/locked/' + f + '.js?b=' + build();

  async function derive(code) {
    const K = L().keys, raw = await crypto.subtle.importKey('raw', te.encode(norm(code)), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: ub64(K.salt), iterations: K.iter, hash: 'SHA-256' }, raw, 384));
    return { key: await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['decrypt']), id: hex(bits.slice(32)) };
  }
  async function open(key, box) { return td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64(box.iv) }, key, ub64(box.ct))); }
  const aes = b64 => crypto.subtle.importKey('raw', ub64(b64), 'AES-GCM', false, ['decrypt']);

  /** Try a code word. Resolves { kind: 'host'|'player', who: { id?, name, group?, role? } } or null.
      A good code is remembered for this tab, so the next page load doesn't redo the slow part. */
  async function entry(code) {
    const c = norm(code); if (!c) return null;
    await keys(); const K = L().keys; if (!K) return null;
    try { const cached = JSON.parse(sessionStorage.getItem('vh:k:' + c) || 'null'); if (cached && cached._b === build()) return cached; } catch (e) { }
    const { key, id } = await derive(c), box = K.entries[id]; if (!box) return null;
    const e = JSON.parse(await open(key, box));
    e._b = build();
    try { sessionStorage.setItem('vh:k:' + c, JSON.stringify(e)); } catch (x) { }
    return e;
  }
  async function tryCode(code) {
    if (plain) {
      const h = STORY.hosts.find(x => norm(x.code) === norm(code)), c = !h && STORY.characters.find(x => norm(x.code) === norm(code));
      return h ? { kind: 'host', who: h } : c ? { kind: 'player', who: c } : null;
    }
    const e = await entry(code).catch(() => null);
    return e ? { kind: e.kind, who: e.kind === 'host' ? { name: e.name, label: e.label, role: e.role } : { id: e.id, name: e.name, group: e.group } } : null;
  }
  /** remember a good code for this tab (and this phone, for scanned QR codes), the same way Session.signIn does */
  function remember(kind, code) {
    const c = norm(code), keep = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
    if (kind === 'host') { sessionStorage.setItem('vh:host', c); keep('vh:lasthost', c); }
    else { sessionStorage.setItem('vh:code', c); keep('vh:last', c); }
  }
  const current = () => sessionStorage.getItem('vh:host') || sessionStorage.getItem('vh:code') ||
    (() => { try { return localStorage.getItem('vh:lasthost') || localStorage.getItem('vh:last'); } catch (e) { return null; } })();

  async function story() {
    if (plain) {
      for (const f of ['story', 'evidence', 'reveal', 'dossiers'].filter(f => f === 'story' || need.includes(f))) await load(base + 'dev/settings/' + f + '.js');
      return;
    }
    if (!window.crypto || !crypto.subtle) { await load(ver(base + 'settings/public.js')); return; }
    /* host "Open as" and scanned links can carry a code word: app.html?as=CODE */
    const as = new URLSearchParams(location.search).get('as');
    if (as) { const r = await entry(as).catch(() => null); if (r) remember(r.kind, as); }
    let e = current() ? await entry(current()).catch(() => null) : null;
    if (!e) { await load(ver(base + 'settings/public.js')); return; }
    await load(lockedUrl(e.bundle));
    let text;
    try { text = await open(await aes(e.key), L()[e.bundle]); }
    catch (x) {
      /* a stale remembered code: forget it, unlock again from the newest keys */
      try { Object.keys(sessionStorage).filter(k => k.startsWith('vh:k:')).forEach(k => sessionStorage.removeItem(k)); } catch (y) { }
      const fresh = await entry(current()); if (!fresh) throw x;
      e = fresh; await load(lockedUrl(e.bundle) + '&r=1'); text = await open(await aes(e.key), L()[e.bundle]);
    }
    inject(text);
    /* what only this person gets: their own code word, their NFC line */
    if (e.kind === 'player') {
      const c = STORY.characters.find(x => x.id === e.id); if (c) c.code = e.code;
      Object.entries(e.nfc || {}).forEach(([t, line]) => { const tag = (STORY.nfc || {})[t]; if (tag) (tag.people = tag.people || {})[e.id] = line; });
    }
    if (need.includes('dossiers') && e.dk) {
      const f = e.kind === 'host' ? 'd-host' : 'd-' + e.id, k = await aes(e.dk);
      STORY.dossiers = STORY.dossiers || {};
      try {
        await load(lockedUrl(f));
        if (e.kind === 'host') Object.assign(STORY.dossiers, JSON.parse(await open(k, L()[f])));
        else STORY.dossiers[e.id] = await open(k, L()[f]);
      } catch (x) { console.warn('[boot] no dossier', f); }
    }
  }

  window.Boot = { locked: !plain, tryCode, remember };
  window.Boot.ready = story()
    .catch(err => { console.error('[boot]', err); return load(base + 'settings/public.js').catch(() => { }); })
    .then(async () => { for (const src of run) await load(/^https?:/.test(src) ? src : ver(base + src)); });
})();
