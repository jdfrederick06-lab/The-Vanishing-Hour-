/* =====================================================================
   THE VANISHING HOUR — the eight mini-games (the "Tasks" tab in the player app).
   Settings (who, when, which clue) are in settings/evidence.js under STORY.games.

   Each game is a live piece of the page that's built once and kept between redraws
   (the app re-attaches it with Games.mount(), like the casino wheel), so a drag or a
   timer never restarts. Shared progress lives in state.mg/{game}:
     mode       'open' | 'closed' | null (null = opens by itself on the clock)
     solved     { by, at }          failed (camera only) { at }
     ...        each game's own fields, described where it's built
   Solving a game marks its clue found on the host board and logs it.
   ===================================================================== */
const Games = (() => {
  const DEFS = () => STORY.games || [];
  const def = id => DEFS().find(d => d.id === id);
  const M = (s, id) => ((s.mg || {})[id]) || {};
  const PH = id => STORY.phases.findIndex(p => p.id === id);
  const startMin = d => d.opens.min != null ? d.opens.min : Clock.startOf({}, Math.max(0, PH(d.opens.phase)));
  /* clock time on the night (doors at 7:00 PM) */
  const wall = min => { const t = 19 * 60 + Math.round(min); return `${((Math.floor(t / 60) + 11) % 12) + 1}:${String(t % 60).padStart(2, '0')} PM`; };
  const now = () => Date.now();
  const vib = p => { try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(p); } catch (e) { } };
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  /** Is this game for this player? (falls back to "backup" if everyone named is a no-show) */
  function isFor(s, d, me) {
    if (G.hits(d.who, me)) return true;
    if (d.backup && G.hits(d.backup, me)) return d.who.filter(t => !t.startsWith('g:')).every(id => G.noshow(s, id));
    return false;
  }
  /** 'solved' | 'failed' | 'open' | 'closed' | 'locked' */
  function status(s, d) {
    const m = M(s, d.id);
    if (m.solved) return 'solved';
    if (m.failed) return 'failed';
    if (m.mode === 'open') return 'open';
    if (m.mode === 'closed') return 'closed';
    const r = Clock.read(s);
    if (r.state === 'before') return 'locked';
    if (r.state === 'over') return 'closed';
    if (d.opens.phase) return r.i >= PH(d.opens.phase) ? 'open' : 'locked';
    return r.nightMin >= d.opens.min ? 'open' : 'locked';
  }
  const forMe = (s, me) => DEFS().filter(d => isFor(s, d, me));

  /** Solve: mark it, its clue, a log line, and any messages the game sends. */
  function solve(id, me, extra) {
    const s = DB.fresh(), d = def(id); if (M(s, id).solved) return false;
    const u = Object.assign({ ['mg/' + id + '/solved']: { by: me.id, at: now() } }, extra || {});
    if (d.clue && !(s.clues && s.clues[d.clue])) u['clues/' + d.clue] = { at: now(), by: 'Mini-game: ' + d.name };
    Clock.log(u, 'game', `${me.name} solved "${d.name}".`);
    DB.update(u); return true;
  }

  /* ======================================================================
     1. THE VAULT DIAL (Frankie). Left, right, left.
        mg/vault: lockUntil (a wrong combination locks the dial for 30 seconds)
     ====================================================================== */
  function vault(me) {
    const combo = (STORY.nightwire.vault || {}).combo || [24, 61, 9], DIRS = ['L', 'R', 'L'];
    const el = h('div', 'mg mg-vault');
    let rot = 0, lastV = 0, dir = '', steps = [], drag = null, near = false, msg = '';
    el.innerHTML = `<div class="mgv-top"><b>Vault door · east hall</b><span class="mgv-led" data-v="led">LOCKED</span></div>
      <div class="mgv-wrap"><svg class="mgv-dial" viewBox="0 0 300 300" data-v="dial" role="slider" aria-label="Combination dial" aria-valuemin="0" aria-valuemax="99" tabindex="0">
        <defs><radialGradient id="mgvk" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#e9edf2"/><stop offset=".5" stop-color="#9aa3ad"/><stop offset="1" stop-color="#4b525b"/></radialGradient>
        <radialGradient id="mgvf" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#2b3038"/><stop offset="1" stop-color="#0f1216"/></radialGradient></defs>
        <circle cx="150" cy="150" r="146" fill="#1a1d22" stroke="#3a4048" stroke-width="2"/>
        <g data-v="rot">${Array.from({ length: 100 }, (_, i) => { const a = i * 3.6; return `<line x1="150" y1="14" x2="150" y2="${i % 10 ? 24 : i % 5 ? 28 : 32}" stroke="#c9ced6" stroke-width="${i % 10 ? 1.2 : 2.2}" transform="rotate(${a} 150 150)"/>` + (i % 10 ? '' : `<text x="150" y="50" text-anchor="middle" font-size="15" font-family="JetBrains Mono, monospace" fill="#e7ebf0" transform="rotate(${a} 150 150)">${i}</text>`); }).join('')}
          <circle cx="150" cy="150" r="92" fill="url(#mgvf)" stroke="#555d67" stroke-width="3"/>
          <circle cx="150" cy="150" r="64" fill="url(#mgvk)"/>${Array.from({ length: 24 }, (_, i) => `<rect x="148" y="86" width="4" height="12" rx="2" fill="#5a626c" transform="rotate(${i * 15} 150 150)"/>`).join('')}
          <circle cx="150" cy="150" r="16" fill="#2a2f36"/></g>
        <path d="M150 4 l-9 -0 l9 14 l9 -14z" fill="#d8b25e" transform="translate(0 2)"/>
      </svg><div class="mgv-read"><small>Reading</small><b data-v="num">00</b></div></div>
      <div class="mgv-steps" data-v="steps"></div>
      <div class="mgv-acts"><button class="btn small" data-v="up" aria-label="Turn left one number">↺ left</button><button class="btn primary" data-v="set">Set this number</button><button class="btn small" data-v="dn" aria-label="Turn right one number">right ↻</button></div>
      <p class="mgv-msg" data-v="msg" role="status"></p><button class="mg-link" data-v="clear">Start over</button>`;
    const q = k => el.querySelector(`[data-v="${k}"]`);
    const val = () => ((Math.round(-rot / 3.6) % 100) + 100) % 100;
    function draw() {
      const s = DB.get(), m = M(s, 'vault'), v = val(), locked = (m.lockUntil || 0) > now(), solved = !!m.solved;
      q('rot').setAttribute('transform', `rotate(${rot.toFixed(2)} 150 150)`);
      q('num').textContent = String(v).padStart(2, '0'); q('dial').setAttribute('aria-valuenow', v);
      patch(q('steps'), DIRS.map((d, i) => `<div class="${i === steps.length && !solved ? 'on' : ''}"><small>${i + 1} · turn ${d === 'L' ? 'left' : 'right'}</small><b>${steps[i] != null ? String(steps[i]).padStart(2, '0') : '__'}</b></div>`).join(''));
      q('led').textContent = solved ? 'OPEN' : locked ? 'LOCKED ' + Math.ceil((m.lockUntil - now()) / 1000) + 's' : 'LOCKED';
      el.classList.toggle('open', solved); el.classList.toggle('near', near && !solved);
      q('msg').textContent = solved ? 'Door open. The vault is open.' : locked ? 'Wrong combination. The dial is jammed for a few seconds.' : msg || (steps.length < 3 ? `Turn ${DIRS[steps.length] === 'L' ? 'LEFT (counterclockwise)' : 'RIGHT (clockwise)'} to number ${steps.length + 1}, then press Set. Near the right number the dial catches.` : '');
      q('set').disabled = solved || locked;
    }
    function turn(deg) {
      if (M(DB.get(), 'vault').solved) return;
      const before = val(); rot += deg; const v = val();
      if (deg) dir = deg < 0 ? 'L' : 'R';
      if (v !== before) {
        const t = combo[steps.length], want = DIRS[steps.length];
        const d = t == null ? 99 : Math.min(Math.abs(v - t), 100 - Math.abs(v - t));
        const was = near; near = d <= 1 && dir === want;
        if (near && !was) vib(22);
        lastV = v; msg = '';
      }
      draw();
    }
    const ang = e => { const b = q('dial').getBoundingClientRect(); return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180 / Math.PI; };
    q('dial').addEventListener('pointerdown', e => { drag = ang(e); q('dial').setPointerCapture(e.pointerId); e.preventDefault(); });
    q('dial').addEventListener('pointermove', e => { if (drag == null) return; const a = ang(e); let d = a - drag; if (d > 180) d -= 360; if (d < -180) d += 360; drag = a; turn(d); });
    ['pointerup', 'pointercancel'].forEach(t => q('dial').addEventListener(t, () => { drag = null; }));
    q('dial').addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); turn(3.6); } if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); turn(-3.6); } });
    q('up').addEventListener('click', () => turn(-3.6)); q('dn').addEventListener('click', () => turn(3.6));
    q('clear').addEventListener('click', () => { steps = []; msg = 'Cleared. Start again with a left turn.'; draw(); });
    q('set').addEventListener('click', () => {
      const s = DB.get(), m = M(s, 'vault'); if (m.solved || (m.lockUntil || 0) > now()) return;
      const want = DIRS[steps.length];
      if (dir !== want) { msg = `Turn ${want === 'L' ? 'left' : 'right'} to this number first.`; return draw(); }
      steps.push(val()); dir = ''; near = false;
      if (steps.length < 3) { msg = `Set. Now turn ${DIRS[steps.length] === 'L' ? 'left' : 'right'}.`; return draw(); }
      if (steps.every((n, i) => n === combo[i])) {
        const u = { ['feed/' + uid('g')]: { to: ['g:crew'], title: 'The vault', text: 'Door open. The vault is open.', at: now(), kind: 'msg' } };
        if (M(s, 'camera').failed) Clock.log(u, 'game', 'The cameras were still live when the vault opened: the vault camera has footage of the crew (host terminal > Games > Release footage).');
        Clock.log(u, 'game', 'The vault was opened.');
        solve('vault', me, u); vib([60, 40, 120]); steps = []; return draw();
      }
      DB.update({ 'mg/vault/lockUntil': now() + 30000 }); steps = []; vib([200]); msg = ''; draw();
    });
    return { el, sync: draw, tick: draw };
  }

  /* ======================================================================
     2. THE CAMERA LOOP (Jules). Six feeds, a 90-second timer and a trace meter.
        mg/camera: started (ms), extra (seconds the host added), looped {feed: true}, wrong (n), failed
     ====================================================================== */
  const FEEDS = [
    { id: 'lobby', name: 'Lobby', live: { door: 1, lamp: 1, guard: 0 } },
    { id: 'east', name: 'East hall', live: { door: 0, lamp: 1, guard: 1 } },
    { id: 'stairs', name: 'Vault stairs', live: { door: 0, lamp: 0, guard: 1 } },
    { id: 'keypad', name: 'Vault keypad', live: { door: 0, lamp: 1, guard: 0 }, digit: 9 },
    { id: 'dock', name: 'Loading dock', live: { door: 1, lamp: 0, guard: 0 } },
    { id: 'main', name: 'Main room', live: { door: 1, lamp: 1, guard: 1 } }
  ];
  /* four clips per feed: one right (same scene, timestamp 7:48), three nearly right */
  function clips(f, k) {
    const r = Art.rng(k * 97 + 13), L = f.live, flip = key => Object.assign({}, L, { [key]: L[key] ? 0 : 1 });
    const sec = () => String(Math.floor(r() * 50) + 10);
    const list = [
      { ok: 1, t: `7:48:${sec()}`, s: L },
      { ok: 0, t: `7:3${Math.floor(r() * 6) + 1}:${sec()}`, s: L },
      { ok: 0, t: `7:48:${sec()}`, s: flip(['door', 'lamp', 'guard'][Math.floor(r() * 3)]) },
      { ok: 0, t: `7:48:${sec()}`, s: flip(['guard', 'door', 'lamp'][Math.floor(r() * 3)]) }
    ];
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return list;
  }
  const scene = (st, extra) => `<svg viewBox="0 0 160 100" class="mgc-sc"><rect width="160" height="100" fill="${st.lamp ? '#2d3a33' : '#141a17'}"/>
    ${st.lamp ? '<path d="M120 0 L150 0 L170 100 L100 100Z" fill="#cfe8c8" opacity=".12"/><circle cx="135" cy="10" r="5" fill="#f2f7d8"/>' : '<circle cx="135" cy="10" r="5" fill="#3a4038"/>'}
    <rect x="18" y="22" width="34" height="62" fill="${st.door ? '#0a0d0b' : '#4a5a50'}" stroke="#7f9688" stroke-width="2"/>${st.door ? '<path d="M18 22 L36 30 V90 L18 84Z" fill="#5d7064"/>' : '<circle cx="46" cy="56" r="2" fill="#c9d6cc"/>'}
    ${st.guard ? '<circle cx="92" cy="44" r="7" fill="#b9c8bd"/><path d="M82 84 V60 q10 -8 20 0 V84Z" fill="#8fa497"/>' : ''}
    ${extra || ''}<rect width="160" height="100" fill="url(#mgcs)"/></svg>`;
  const KEYPAD = d => `<rect x="62" y="24" width="36" height="24" rx="2" fill="#0d120f" stroke="#7f9688"/><text x="80" y="42" text-anchor="middle" font-family="monospace" font-size="16" fill="#7dff9a">${d}</text>`;
  function camera(me) {
    const d = def('camera'), el = h('div', 'mg mg-cam');
    let sel = null, flash = '';
    el.innerHTML = `<svg width="0" height="0" style="position:absolute"><defs><pattern id="mgcs" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000" opacity=".18"/></pattern></defs></svg>
      <div class="mgc-top"><div><small>Security grid · 6 feeds</small><b data-c="clock">7:48:00 PM</b></div><div class="mgc-trace"><small>Trace</small><div><i data-c="trace"></i></div><b data-c="tv">0%</b></div><div class="mgc-time"><small>Window</small><b data-c="left">1:30</b></div></div>
      <div class="mgc-grid" data-c="grid"></div><div class="mgc-clips" data-c="clips"></div><p class="mgc-msg" data-c="msg" role="status"></p>
      <button class="btn primary mgc-go" data-c="go">Start the loop (90 seconds)</button>`;
    const q = k => el.querySelector(`[data-c="${k}"]`);
    const total = m => (d.seconds || 90) + (m.extra || 0);
    const endT = m => m.solved ? m.solved.at : m.failed ? m.failed.at : now();
    function tr(m) { if (!m.started) return 0; const t = (endT(m) - m.started) / 1000; return Math.min(100, t / total(m) * 75 + (m.wrong || 0) * 14); }
    function grid() {
      const s = DB.get(), m = M(s, 'camera'), lp = m.looped || {}, t = m.started ? Math.floor((endT(m) - m.started) / 1000) : 0;
      /* rebuilt only when something changes (patch), so a tap is never lost; the seconds tick separately */
      patch(q('grid'), FEEDS.map(f => `<button class="mgc-feed ${lp[f.id] ? 'loop' : ''} ${sel === f.id ? 'sel' : ''}" data-feed="${f.id}">${scene(f.live, f.digit ? KEYPAD(lp[f.id] ? f.digit : '_') : '')}
        <span class="mgc-lab"><i></i>${lp[f.id] ? 'LOOP' : 'REC'} · ${f.name}</span><span class="mgc-ts"></span></button>`).join(''));
      const ts = `7:${String(48 + Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      el.querySelectorAll('.mgc-ts').forEach(x => { if (x.textContent !== ts) x.textContent = ts; });
    }
    function draw() {
      const s = DB.get(), m = M(s, 'camera'), lp = m.looped || {}, solved = !!m.solved, failed = !!m.failed;
      const running = m.started && !solved && !failed;
      el.classList.toggle('done', solved); el.classList.toggle('fail', failed);
      q('go').hidden = !!m.started || solved || failed;
      const left = m.started ? Math.max(0, total(m) - (endT(m) - m.started) / 1000) : total(m);
      q('left').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
      const tv = tr(m); q('trace').style.width = tv + '%'; q('tv').textContent = Math.round(tv) + '%';
      const t = m.started ? Math.floor((endT(m) - m.started) / 1000) : 0; q('clock').textContent = `7:${String(48 + Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')} PM`;
      grid();
      if (running && sel && !lp[sel]) {
        const f = FEEDS.find(x => x.id === sel), cs = clips(f, FEEDS.indexOf(f));
        patch(q('clips'), `<small>Recorded loops for ${f.name}. Pick the one that matches the live feed and the time.</small><div>${cs.map((c, i) => `<button class="mgc-clip" data-clip="${i}">${scene(c.s, f.digit ? KEYPAD('_') : '')}<span>${c.t}</span></button>`).join('')}</div>`);
      } else patch(q('clips'), '');
      q('msg').textContent = solved ? `All six feeds looped. The cameras show an empty building from 7:50 to 8:00. The keypad feed showed ${FEEDS[3].digit}: get that to Frankie.` : failed ? 'Trace complete. The cameras stayed live, and they\'re recording.' : flash || (running ? 'Tap a feed, then pick the loop that matches it.' : 'When you\'re ready, start the loop. You\'ll have 90 seconds.');
      /* time ran out, or the trace caught you */
      if (running && (tv >= 100 || left <= 0)) { const u = { 'mg/camera/failed': { at: now() } }; Clock.log(u, 'game', 'The camera loop failed: the cameras are still recording.'); DB.update(u); }
    }
    el.addEventListener('click', e => {
      const s = DB.get(), m = M(s, 'camera');
      if (e.target.closest('[data-c="go"]')) { if (!m.started) { const u = { 'mg/camera/started': now() }; Clock.log(u, 'game', `${me.name} started the camera loop.`); DB.update(u); } return draw(); }
      if (!m.started || m.solved || m.failed) return;
      const f = e.target.closest('[data-feed]'); if (f) { sel = f.dataset.feed; flash = ''; return draw(); }
      const c = e.target.closest('[data-clip]'); if (c && sel) {
        const feed = FEEDS.find(x => x.id === sel), pick = clips(feed, FEEDS.indexOf(feed))[Number(c.dataset.clip)];
        if (pick.ok) {
          const lp = Object.assign({}, m.looped || {}, { [sel]: true }), u = { ['mg/camera/looped/' + sel]: true };
          flash = sel === 'keypad' ? `Looped. The keypad's memory shows the last digit pressed: ${FEEDS[3].digit}.` : 'Looped.'; vib(30);
          sel = null;
          if (FEEDS.every(x => lp[x.id])) { DB.update(u); solve('camera', me, { ['feed/' + uid('g')]: { to: ['g:crew'], title: 'Cameras', text: `Cameras looped from 7:50 to 8:00. The vault keypad shows ${FEEDS[3].digit}.`, at: now(), kind: 'msg' } }); }
          else DB.update(u);
        } else { DB.update({ 'mg/camera/wrong': (m.wrong || 0) + 1 }); flash = 'Wrong loop. The trace jumped.'; vib([80, 40, 80]); }
        return draw();
      }
    });
    return { el, sync: draw, tick: draw };
  }

  /* ======================================================================
     3. THE SEALED BIRTH RECORD (FBI). Three keys, each unscrambles a third.
        mg/decrypt: got { county, surname, year }, lockUntil (a wrong key locks it for 2 minutes)
     ====================================================================== */
  const SEALED = [
    { key: 'county', label: 'County of birth', ok: v => /^harlow( county)?$/.test(v), text: 'HARLOW COUNTY · RECORD OF LIVE BIRTH · SEALED BY ORDER OF THE FAMILY COURT, 2008' },
    { key: 'surname', label: 'Mother\'s surname', ok: v => v === 'ellery', text: 'MOTHER: JUNE ELLERY · FATHER: NOT NAMED' },
    { key: 'year', label: 'Year of birth', ok: v => v === '2001', text: 'CHILD: ROWAN ELLERY · BORN FEBRUARY 2001 · ADOPTED 2008' }
  ];
  const GLY = '▓▒░█▌▐■□◆◇#%&@$*';
  function decrypt(me) {
    const d = def('decrypt'), el = h('div', 'mg mg-dec');
    const anim = {};
    el.innerHTML = `<div class="mgd-doc"><div class="mgd-hd"><b>SEALED</b><span>Family Court · access by court key only</span></div>${SEALED.map((x, i) => `<p class="mgd-line" data-d="l${i}"></p>`).join('')}<div class="mgd-stamp" data-d="stamp">UNSEALED</div></div>
      <form class="mgd-keys" data-d="form">${SEALED.map(x => `<label><small>${x.label}</small><span><input class="field" name="${x.key}" autocomplete="off" spellcheck="false"><i data-d="ok-${x.key}">✓</i></span></label>`).join('')}<button class="btn primary">Apply the keys</button></form>
      <p class="mgd-msg" data-d="msg" role="status"></p>`;
    const q = k => el.querySelector(`[data-d="${k}"]`);
    const scr = n => Array.from({ length: n }, () => GLY[Math.floor(Math.random() * GLY.length)]).join('');
    let msg = '';
    function draw() {
      const s = DB.get(), m = M(s, 'decrypt'), got = m.got || {}, locked = (m.lockUntil || 0) > now();
      SEALED.forEach((x, i) => {
        const p = q('l' + i);
        if (got[x.key]) {
          if (!anim[x.key]) { anim[x.key] = now(); }
          const k = Math.min(1, (now() - anim[x.key]) / 1400), n = Math.floor(x.text.length * k);
          p.textContent = x.text.slice(0, n) + (k < 1 ? scr(x.text.length - n) : ''); p.classList.add('open');
        } else { p.textContent = scr(x.text.length); p.classList.remove('open'); }
        const inp = el.querySelector(`input[name="${x.key}"]`); inp.disabled = !!got[x.key] || locked || !!m.solved;
        if (got[x.key] && !inp.value) inp.value = x.key === 'county' ? 'Harlow' : x.key === 'surname' ? 'Ellery' : '2001';
        q('ok-' + x.key).classList.toggle('on', !!got[x.key]);
      });
      q('stamp').classList.toggle('on', !!m.solved);
      el.querySelector('.mgd-keys button').disabled = locked || !!m.solved;
      q('msg').textContent = m.solved ? 'Record unsealed. Logged to the case board.' : locked ? `Wrong key. The court system has locked this record for ${Math.ceil((m.lockUntil - now()) / 1000)} seconds.` : msg || 'Enter any key you have. Each correct one opens a third of the record. A wrong one locks the record for two minutes.';
    }
    el.addEventListener('submit', e => {
      e.preventDefault(); const s = DB.fresh(), m = M(s, 'decrypt'), got = Object.assign({}, m.got || {});
      if (m.solved || (m.lockUntil || 0) > now()) return;
      let any = false, bad = false; const u = {};
      SEALED.forEach(x => { if (got[x.key]) return; const v = (el.querySelector(`input[name="${x.key}"]`).value || '').trim().toLowerCase(); if (!v) return; any = true; if (x.ok(v)) { got[x.key] = true; u['mg/decrypt/got/' + x.key] = true; } else bad = true; });
      if (!any) { msg = 'Type at least one key.'; return draw(); }
      if (bad) { u['mg/decrypt/lockUntil'] = now() + (d.lockMin || 2) * 60000; Clock.log(u, 'game', `${me.name} tried a wrong key on the sealed birth record (locked ${d.lockMin || 2} min).`); }
      DB.update(u); msg = '';
      if (SEALED.every(x => got[x.key])) solve('decrypt', me);
      draw();
    });
    return { el, sync: draw, tick: draw, fast: true };
  }

  /* ======================================================================
     4. VICTOR'S PHONE: THE DELETED THREAD (FBI). Costs one lookup. Shared puzzle.
        mg/messages: started { by, at }, order [indexes, shuffled]
     ====================================================================== */
  const THREAD = [
    ['N', 'Day 1 · 11:48 PM', 'I know what you\'ve been carrying since 2019. I can make it lighter.', 'I know what ▒▒▒ been carrying ▒▒▒▒▒ ▒▒▒▒. I can make it lighter.'],
    ['V', 'Day 1 · 11:51 PM', 'Who is this?'],
    ['N', 'Day 2 · 9:02 AM', 'Someone who can keep you out of a cell. Larkspur, Cyprus, Meridian. You don\'t have to answer tonight.', 'Someone who can keep you ▒▒▒ ▒▒ ▒ ▒▒▒▒. ▒▒▒▒▒▒▒▒, Cyprus, ▒▒▒▒▒▒▒▒. You don\'t have to answer tonight.', 'Day ▒ · 9:02 AM'],
    ['V', 'Day 2 · 9:40 AM', 'Leave me alone.'],
    ['N', 'Day 9 · 10:15 PM', 'The buyer will not protect you. I will. Think about it.', 'The ▒▒▒▒▒ will not protect you. I will. Think about it.', 'Day 9 · 1▒:15 PM'],
    ['V', 'Day 12 · 1:30 AM', 'What would I have to do?'],
    ['N', 'Day 12 · 7:05 AM', 'Tell the truth about the buyer, on the record. Bring the ledger and I\'ll keep you out of it.', 'Tell ▒▒▒ ▒▒▒▒▒ about ▒▒▒ ▒▒▒▒▒, ▒▒ ▒▒▒ ▒▒▒▒▒▒. Bring the ▒▒▒▒▒▒ and I\'ll keep you ▒▒▒ ▒▒ ▒▒.', 'Day 1▒ · 7:05 AM'],
    ['V', 'Day 12 · 7:20 AM', 'I can\'t be seen with you.'],
    ['N', 'Day 30 · 6:44 PM', 'You won\'t be. Nobody on my team knows. Nobody at the gala will either.', 'You won\'t be. Nobody ▒▒ ▒▒ ▒▒▒▒ knows. Nobody at the gala will either.'],
    ['V', 'Day 30 · 11:12 PM', 'Remy can\'t know. Nobody can.', null, 'Day ▒▒ · 11:12 PM'],
    ['N', 'Day 52 · 8:30 PM', 'Then we meet where nobody looks. The night of your gala.'],
    ['V', 'Day 52 · 9:58 PM', 'After my toast. Come alone.', null, 'Day 5▒ · ▒:58 PM'],
    ['N', 'Day 52 · 10:03 PM', 'I\'ll be there. Delete this thread.'],
    ['N', 'Day 52 · 10:04 PM', 'Protocol says I delete my side too. Done.', '▒▒▒▒▒▒▒▒ says I delete my side too. Done.']
  ];
  function messages(me) {
    const el = h('div', 'mg mg-msg');
    let pick = null;
    el.innerHTML = `<div class="mgm-start" data-m="start"><p>Victor's phone is in evidence. A forensic extraction can recover his deleted messages, but it uses one of the team's lookups.</p><button class="btn primary" data-m="go">Run the extraction</button></div>
      <div class="mgm-board" data-m="board" hidden><div class="mgm-head"><span>+1 (•••) •••-0417 · <b>deleted thread</b></span><span class="mono" data-m="pairs">0/13</span></div><div class="mgm-list" data-m="list"></div>
      <p class="mgm-help">Tap a message, then tap where it belongs to swap them. Every pair in the right order gets its missing words back.</p></div><p class="mgm-msg" data-m="msg" role="status"></p>`;
    const q = k => el.querySelector(`[data-m="${k}"]`);
    function draw() {
      const s = DB.get(), m = M(s, 'messages');
      q('start').hidden = !!m.started; q('board').hidden = !m.started;
      if (!m.started) { const left = FBI.leftN(s); q('go').textContent = left ? `Run the extraction (1 of ${left} lookups left)` : 'The team is out of lookups'; q('go').disabled = !left; q('msg').textContent = ''; return; }
      const o = m.order || THREAD.map((_, i) => i), good = new Set();
      let pairs = 0; for (let i = 0; i < o.length - 1; i++) if (o[i + 1] === o[i] + 1) { pairs++; good.add(i); good.add(i + 1); }
      const done = pairs === THREAD.length - 1;
      q('pairs').textContent = `${pairs}/${THREAD.length - 1} in order`;
      patch(q('list'), o.map((k, i) => { const [w, ts, full, broken, bts] = THREAD[k], ok = good.has(i) || done; return `<button class="mgm-b ${w === 'V' ? 'me' : ''} ${ok ? 'ok' : ''} ${pick === i ? 'pick' : ''}" data-slot="${i}"><small>${esc(ok || !bts ? ts : bts)}</small>${esc(ok || !broken ? full : broken)}</button>`; }).join(''));
      el.classList.toggle('done', done);
      q('msg').textContent = done ? 'Thread restored. Read it as a whole.' : '';
      if (done && !m.solved) solve('messages', me);
    }
    el.addEventListener('click', e => {
      const s = DB.get(), m = M(s, 'messages');
      if (e.target.closest('[data-m="go"]')) {
        if (m.started || !FBI.leftN(s)) return;
        if (!Ask.sure(`Run a forensic extraction on Victor's phone? It uses 1 of the team's ${FBI.leftN(s)} remaining lookups.`, () => el.querySelector('[data-m="go"]').click(), { title: 'Forensic extraction', ok: 'Run it' })) return;
        const r = Art.rng(52), o = THREAD.map((_, i) => i); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
        const u = { 'mg/messages/started': { by: me.id, at: now() }, 'mg/messages/order': o, ['fbi/lookups/' + uid('q')]: { by: me.id, q: 'Forensic extraction: Victor Ashgrove\'s phone', rec: null, kind: 'extract', at: now() } };
        Clock.log(u, 'game', `${me.name} ran a forensic extraction on Victor's phone (1 lookup).`); DB.update(u); return draw();
      }
      const b = e.target.closest('[data-slot]'); if (!b || m.solved) return;
      const i = Number(b.dataset.slot);
      if (pick == null) { pick = i; return draw(); }
      if (pick === i) { pick = null; return draw(); }
      const o = (m.order || THREAD.map((_, k) => k)).slice(); [o[pick], o[i]] = [o[i], o[pick]]; pick = null;
      DB.update({ 'mg/messages/order': o }); draw();
    });
    return { el, sync: draw };
  }

  /* ======================================================================
     5. THE TORN PHOTOGRAPH (guests, staff). Nine pieces, some upside down.
        Your own progress stays on your phone. mg/photo: solved (the first one to finish)
     ====================================================================== */
  function photo(me) {
    const el = h('div', 'mg mg-ph'), KEY = 'vh:mg:photo:' + me.id;
    const src = Art.uri(Art.photo());
    let st; try { st = JSON.parse(localStorage.getItem(KEY)); } catch (e) { st = null; }
    if (!st) { const r = Art.rng(2000 + me.id.length * 7), p = Array.from({ length: 9 }, (_, i) => i); for (let i = 8; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } st = { p, rot: p.map(() => [0, 0, 1, 2, 3][Math.floor(r() * 5)]), done: false }; }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } };
    let sel = null;
    el.innerHTML = `<div class="mgp-board" data-p="board"></div><div class="mgp-back" data-p="back" hidden><small>On the back, in pencil:</small><b>"Victor Ashgrove and J. E— at the Harbor gallery, December 2000."</b></div>
      <p class="mgp-help" data-p="help">Tap two pieces to swap them. Tap a piece twice to turn it.</p>`;
    const q = k => el.querySelector(`[data-p="${k}"]`);
    function draw() {
      const solved = st.p.every((t, i) => t === i) && st.rot.every(x => x % 4 === 0);
      if (solved && !st.done) {
        st.done = true; save(); vib([40, 30, 80]);
        const s = DB.get();
        if (!M(s, 'photo').solved) {
          /* the first to finish posts the restored photo to Bebbit */
          const img = new Image(); img.onload = () => {
            let jpg = null; try { const c = document.createElement('canvas'); c.width = 800; c.height = 600; c.getContext('2d').drawImage(img, 0, 0, 800, 600); jpg = c.toDataURL('image/jpeg', .82); } catch (e) { }
            const u = {}; Bebbit.post(u, { by: me.id, real: me.id, text: 'Put the torn photo back together. On the back, in pencil: "Victor Ashgrove and J. E— at the Harbor gallery, December 2000."', photo: jpg });
            solve('photo', me, u);
          }; img.src = src;
        }
      }
      el.classList.toggle('done', st.done);
      patch(q('board'), st.p.map((t, i) => `<button class="mgp-t ${sel === i ? 'sel' : ''}" data-tile="${i}" aria-label="Piece ${i + 1}" style="background-image:url('${src}');background-position:${(t % 3) * 50}% ${Math.floor(t / 3) * 50}%;transform:rotate(${st.rot[i] * 90}deg)"></button>`).join(''));
      q('back').hidden = !st.done; q('help').hidden = st.done;
    }
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-tile]'); if (!b || st.done) return;
      const i = Number(b.dataset.tile);
      if (sel === i) { st.rot[i] = (st.rot[i] + 1) % 4; sel = null; }
      else if (sel == null) sel = i;
      else { [st.p[sel], st.p[i]] = [st.p[i], st.p[sel]]; [st.rot[sel], st.rot[i]] = [st.rot[i], st.rot[sel]]; sel = null; }
      save(); draw();
    });
    return { el, sync: draw };
  }

  /* ======================================================================
     6. IS IT REAL? (Ari and the guests). Five differences between the catalogue and the wall.
        Your own progress stays on your phone. mg/differences: solved (the first)
     ====================================================================== */
  function differences(me) {
    const el = h('div', 'mg mg-df'), KEY = 'vh:mg:diff:' + me.id;
    let found; try { found = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { found = []; }
    let misses = 0, coolUntil = 0, last = '';
    const marks = () => found.map(i => { const d = Art.DIFFS[i]; return `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="none" stroke="#ffd34d" stroke-width="3"/>`; }).join('');
    el.innerHTML = `<div class="mgf-pair"><figure><figcaption>Museum catalogue, 2019</figcaption><div class="mgf-img"><img alt="Harbor at Dusk, catalogue photo" src="${Art.uri(Art.harbor(false))}"><svg viewBox="0 0 480 340" data-f="m1"></svg></div></figure>
      <figure><figcaption>On the wall tonight · tap the differences</figcaption><div class="mgf-img" data-f="wall"><img alt="Harbor at Dusk, on the wall" src="${Art.uri(Art.harbor(true))}"><svg viewBox="0 0 480 340" data-f="m2"></svg></div></figure></div>
      <div class="mgf-bar"><b data-f="n">0 of 5</b><span data-f="msg" role="status"></span></div><ol class="mgf-list" data-f="list"></ol>`;
    const q = k => el.querySelector(`[data-f="${k}"]`);
    function draw() {
      patch(q('m1'), marks()); patch(q('m2'), marks());
      q('n').textContent = `${found.length} of 5`;
      patch(q('list'), found.map(i => `<li>${esc(Art.DIFFS[i].what)}</li>`).join(''));
      const done = found.length === 5; el.classList.toggle('done', done);
      q('msg').textContent = done ? 'Five differences. The painting on the wall is a copy. Someone signed it underneath.' : coolUntil > now() ? 'Too many guesses. Look closer for a moment.' : last;
    }
    q('wall').addEventListener('click', e => {
      if (found.length === 5 || coolUntil > now()) return;
      const b = q('wall').getBoundingClientRect(), x = (e.clientX - b.left) / b.width * 480, y = (e.clientY - b.top) / b.height * 340;
      const i = Art.DIFFS.findIndex((d, k) => !found.includes(k) && Math.hypot(d.x - x, d.y - y) <= d.r + 6);
      if (i >= 0) { found.push(i); misses = 0; last = 'Found one.'; vib(20); try { localStorage.setItem(KEY, JSON.stringify(found)); } catch (er) { } if (found.length === 5 && !M(DB.get(), 'differences').solved) { const u = {}; Clock.log(u, 'game', `${me.name} proved "Harbor at Dusk" on the wall is a copy (Indigo's mark under the frame).`); solve('differences', me, u); } }
      else { misses++; last = 'Nothing different there.'; if (misses >= 4) { coolUntil = now() + 10000; misses = 0; setTimeout(draw, 10050); } }
      draw();
    });
    return { el, sync: draw };
  }

  /* ======================================================================
     7. VICTOR'S COLLECTION LEDGER (Sterling and Penn). Find the three entries that don't add up.
        Shared: mg/ledger: hits { row: true }
     ====================================================================== */
  const LEDGER = [
    ['1st', 'Opening balance', null, 412300],
    ['2nd', 'Club dues, Harbor Club', -4200, 408100],
    ['3rd', 'Harbor & Crane: premium, new coverage', -38600, 369500],
    ['4th', 'Gallery lighting, installation', -12500, 369500, 'Payee: Vale Fine Art Advisory. Reference "P.V. 1 of 3."'],
    ['6th', 'Rent, Elm Street storage', -9000, 360500],
    ['9th', 'Kincaid Holdings: consulting', 40000, 400500],
    ['11th', 'Frame conservation', -20000, 400500, 'Payee: Vale Fine Art Advisory. Reference "P.V. 2 of 3."'],
    ['14th', 'Florist, gala deposit', -3850, 396650],
    ['18th', 'Courier, fine art', -17500, 396650, 'Payee: Vale Fine Art Advisory. Reference "P.V. 3 of 3." Paid the 28th, the day the appraisal was issued.'],
    ['21st', 'Car lease', -2400, 394250],
    ['26th', 'Household payroll', -11700, 382550],
    ['30th', 'Closing balance', null, 382550]
  ];
  const usd = n => (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US');
  function ledger(me) {
    const el = h('div', 'mg mg-lg');
    let last = '';
    el.innerHTML = `<div class="mgl-head"><b>Ashgrove Collection · expense ledger</b><span>Last month · prepared for V. J. Ashgrove</span></div><div class="mgl-table" data-l="t"></div><p class="mgl-msg" data-l="msg" role="status"></p><div class="mgl-out" data-l="out" hidden></div>`;
    const q = k => el.querySelector(`[data-l="${k}"]`);
    function draw() {
      const s = DB.get(), m = M(s, 'ledger'), hits = m.hits || {}, n = Object.keys(hits).length, done = n >= 3 || !!m.solved;
      patch(q('t'), `<div class="mgl-r mgl-h"><span>Date</span><span>Entry</span><span>Amount</span><span>Balance</span></div>` + LEDGER.map((r, i) => `<button class="mgl-r ${hits[i] ? 'hit' : ''}" data-row="${i}" ${r[2] == null ? 'disabled' : ''}><span>${r[0]}</span><span>${esc(r[1])}${hits[i] ? `<em>${esc(r[4])}</em>` : ''}</span><span class="mono">${r[2] == null ? '' : usd(r[2])}</span><span class="mono">${usd(r[3])}</span></button>`).join(''));
      q('msg').textContent = done ? '' : `${n} of 3 found. ${last}`;
      q('out').hidden = !done;
      patch(q('out'), '<b>Three payments to Vale Fine Art Advisory: $50,000 in all.</b><p>Booked as lighting, framing and a courier, so the balance never showed them. The last one went out the day Peregrine Vale\'s appraisal was issued.</p>');
      el.classList.toggle('done', done);
    }
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-row]'); if (!b) return;
      const s = DB.get(), m = M(s, 'ledger'), i = Number(b.dataset.row), r = LEDGER[i];
      if (m.solved || (m.hits || {})[i]) return;
      if (r[4]) { const u = { ['mg/ledger/hits/' + i]: true }; DB.update(u); last = 'That one doesn\'t add up.'; vib(20); if (Object.keys(Object.assign({}, m.hits, { [i]: true })).length >= 3) solve('ledger', me); }
      else last = `That one adds up: ${usd(LEDGER[i - 1][3])} ${r[2] < 0 ? '−' : '+'} $${Math.abs(r[2]).toLocaleString('en-US')} = ${usd(r[3])}.`;
      draw();
    });
    return { el, sync: draw };
  }

  /* ======================================================================
     8. THE DOOR LOG (Lane and Bo). Filter the badge swipes; name who was in the stairwell.
        Shared: mg/doorlog: tries
     ====================================================================== */
  const DOORS = ['Main entrance', 'East hall', 'Vault stairwell', 'Loading dock', 'Kitchen', 'Archive', 'Control room'];
  const SWIPES = [
    ['6:41', 'GARRITY, L.', 'Control room'], ['6:44', 'TATE, B.', 'Main entrance'], ['6:48', 'PRUITT, C.', 'East hall'], ['6:52', 'QUILL, H.', 'Kitchen'], ['6:55', 'RUIZ, J.', 'Kitchen'],
    ['6:58', 'BRANDT, C.', 'Loading dock'], ['7:00', 'TATE, B.', 'Main entrance'], ['7:03', 'CASTELLANE, A.', 'Archive'], ['7:05', 'PRUITT, C.', 'Vault stairwell'], ['7:09', 'ARCHER, S.', 'Loading dock'],
    ['7:12', 'AGENT · TEMP 1', 'Main entrance'], ['7:12', 'AGENT · TEMP 2', 'Main entrance'], ['7:13', 'AGENT · TEMP 3', 'Main entrance'], ['7:13', 'AGENT · TEMP 4', 'Main entrance'], ['7:14', 'AGENT · TEMP 5', 'Main entrance'],
    ['7:18', 'GARRITY, L.', 'East hall'], ['7:22', 'PRUITT, C.', 'East hall'], ['7:24', 'PRUITT, C.', 'Vault stairwell'], ['7:27', 'QUILL, H.', 'Loading dock'], ['7:31', 'RUIZ, J.', 'Kitchen'],
    ['7:35', 'ALBRIGHT, E.', 'Control room'], ['7:38', 'BRANDT, C.', 'Loading dock'], ['7:41', 'PRUITT, C.', 'Vault stairwell'], ['7:43', 'AGENT · TEMP 5', 'Archive'], ['7:44', 'AGENT · TEMP 3', 'Vault stairwell'],
    ['7:47', 'TATE, B.', 'East hall'], ['7:49', 'GARRITY, L.', 'Control room'], ['7:52', 'QUILL, H.', 'Main entrance'], ['7:56', 'ARCHER, S.', 'Loading dock'], ['8:00', 'TATE, B.', 'East hall'],
    ['8:01', 'TATE, B.', 'Vault stairwell'], ['8:04', 'GARRITY, L.', 'Vault stairwell'], ['8:06', 'AGENT · TEMP 1', 'Vault stairwell'], ['8:06', 'AGENT · TEMP 4', 'Vault stairwell'], ['8:09', 'CASTELLANE, A.', 'Vault stairwell']
  ];
  const tmin = t => { const [a, b] = t.split(':').map(Number); return (a < 12 ? a + 12 : a) * 60 + b; };
  function doorlog(me) {
    const el = h('div', 'mg mg-dl');
    let door = '', from = '7:00', to = '8:30', last = '';
    const people = [...new Set(SWIPES.map(x => x[1]))].sort();
    el.innerHTML = `<div class="mgdl-q"><b>Who badged into the vault stairwell between 7:38 and 7:50?</b><span>Charlie's last call was at 7:46. Find the badge, then name it.</span></div>
      <div class="mgdl-f"><label><small>Door</small><select class="field" data-o="door"><option value="">All doors</option>${DOORS.map(d => `<option>${d}</option>`).join('')}</select></label>
      <label><small>From</small><select class="field" data-o="from">${['6:40', '7:00', '7:30', '7:38', '7:45', '8:00'].map(t => `<option ${t === from ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label><small>To</small><select class="field" data-o="to">${['7:30', '7:45', '7:50', '8:00', '8:30'].map(t => `<option ${t === to ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <div class="mgdl-list" data-o="list"></div><div class="mgdl-sys" data-o="sys"></div>
      <div class="mgdl-a"><select class="field" data-o="who"><option value="">Choose a badge…</option>${people.map(p => `<option>${p}</option>`).join('')}</select><button class="btn primary" data-o="name">Name it</button></div>
      <p class="mgdl-msg" data-o="msg" role="status"></p>`;
    const q = k => el.querySelector(`[data-o="${k}"]`);
    function draw() {
      const s = DB.get(), m = M(s, 'doorlog'), cam = M(s, 'camera');
      const rows = SWIPES.filter(x => (!door || x[2] === door) && tmin(x[0]) >= tmin(from) && tmin(x[0]) <= tmin(to));
      patch(q('list'), rows.length ? rows.map(x => `<div class="${x[1].startsWith('AGENT') ? 'ag' : ''}"><span class="mono">${x[0]} PM</span><b>${x[1]}</b><span>${x[2]}</span></div>`).join('') : '<div class="mute">No swipes match.</div>');
      patch(q('sys'), `<small>System</small><div><span class="mono">7:50 PM</span>${cam.solved ? 'Cameras: <b>feed fault, all floors</b> (cleared 8:00 PM)' : 'Cameras: all feeds normal'}</div><div><span class="mono">7:50 PM</span>Winter Star case: <b>alarm</b></div>`);
      el.classList.toggle('done', !!m.solved);
      q('msg').textContent = m.solved ? 'AGENT · TEMP 3: a temporary FBI badge, issued at the main entrance at 7:13. Unassigned: the sign-out sheet for it is blank.' : last;
    }
    el.addEventListener('change', e => { const k = e.target.dataset.o; if (k === 'door') door = e.target.value; if (k === 'from') from = e.target.value; if (k === 'to') to = e.target.value; draw(); });
    el.addEventListener('click', e => {
      if (!e.target.closest('[data-o="name"]')) return;
      const v = q('who').value, s = DB.get(); if (!v || M(s, 'doorlog').solved) return;
      if (v === 'AGENT · TEMP 3') solve('doorlog', me);
      else { DB.update({ 'mg/doorlog/tries': (M(s, 'doorlog').tries || 0) + 1 }); last = SWIPES.some(x => x[1] === v && x[2] === 'Vault stairwell' && tmin(x[0]) >= tmin('7:38') && tmin(x[0]) <= tmin('7:50')) ? `${v} was there, but not the one nobody can account for. Look again.` : `${v} never touched the stairwell between 7:38 and 7:50.`; }
      draw();
    });
    return { el, sync: draw };
  }

  const BUILD = { vault, camera, decrypt, messages, photo, differences, ledger, doorlog };
  const inst = {};
  let ui = { open: null };

  /* ---------- the Tasks tab ---------- */
  function render(s, me) {
    const mine = forMe(s, me);
    if (ui.open && !mine.some(d => d.id === ui.open)) ui.open = null;
    const r = Clock.read(s);
    const card = d => {
      const st = status(s, d), m = M(s, d.id);
      const tag = st === 'solved' ? (m.solved.by === me.id ? 'Solved by you' : 'Solved' + (G.byId(m.solved.by) ? ' by ' + G.byId(m.solved.by).name.split(' ')[0] : '')) : st === 'failed' ? 'Failed' : st === 'open' ? 'Open now' : st === 'closed' ? 'Closed' : 'Opens at ' + wall(startMin(d));
      return `<button class="mg-card st-${st} ${ui.open === d.id ? 'on' : ''}" data-mg="${d.id}" ${st === 'locked' || st === 'closed' ? 'aria-disabled="true"' : ''}><span class="mg-ic">${ICON[d.id] || ''}</span><span class="mg-tx"><b>${esc(d.name)}</b><small>${esc(d.blurb)}</small></span><span class="mg-tag">${tag}</span></button>`;
    };
    const open = ui.open && def(ui.open);
    return `<div class="mg-tab"><div class="sec-title">${mine.length === 1 ? 'Your task' : 'Your tasks'} · ${mine.length}</div>
      <div class="mg-cards">${mine.map(card).join('') || '<div class="card empty">Nothing for you here tonight.</div>'}</div>
      ${open ? `<section class="mg-stage-wrap"><div class="mg-stage-h"><b>${esc(open.name)}</b><button class="btn small ghost" data-mg-close>Close</button></div><div id="mg-stage" data-g="${open.id}"></div></section>` : ''}</div>`;
  }
  /** Put the live game back into the page after the app redraws. */
  function mount() {
    const st = document.getElementById('mg-stage'); if (!st) return;
    const id = st.dataset.g, s = DB.get(), me = Session.player(); if (!me) return;
    if (!inst[id]) inst[id] = BUILD[id](me);
    const g = inst[id]; if (g.el.parentNode !== st) { st.innerHTML = ''; st.appendChild(g.el); }
    g.sync(s);
  }
  function onClick(e, me) {
    const c = e.target.closest('[data-mg]'); if (c) { const d = def(c.dataset.mg), st = status(DB.get(), d); if (st === 'locked' || st === 'closed') return true; ui.open = ui.open === d.id ? null : d.id; return 'redraw'; }
    if (e.target.closest('[data-mg-close]')) { ui.open = null; return 'redraw'; }
    return false;
  }
  /* timers inside the games (the camera window, the decrypt animation) run even between redraws */
  setInterval(() => { const st = document.getElementById('mg-stage'); if (!st) return; const g = inst[st.dataset.g]; if (g && g.tick) g.tick(); }, 250);
  setInterval(() => { const st = document.getElementById('mg-stage'); if (!st) return; const g = inst[st.dataset.g]; if (g && g.fast) g.sync(DB.get()); }, 90);

  const ICON = {
    vault: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5v3M20.5 12h-3M12 20.5v-3M3.5 12h3"/></svg>',
    camera: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3"/></svg>',
    decrypt: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>',
    messages: '<svg viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M9 7h6M9 10h4M9 13h6"/></svg>',
    photo: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 15l5-4 4 3 3-2 6 4M10 5l-2 14"/></svg>',
    differences: '<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="8" height="12"/><rect x="13.5" y="6" width="8" height="12"/><circle cx="17.5" cy="11" r="2"/></svg>',
    ledger: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    doorlog: '<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="15" cy="12" r="1"/><path d="M3 21h18"/></svg>'
  };

  /* ---------- the host's controls ---------- */
  function hostPanel(s) {
    const r = Clock.read(s);
    return DEFS().map(d => {
      const st = status(s, d), m = M(s, d.id);
      const who = d.who.map(t => t.startsWith('g:') ? (STORY.groups[t.slice(2)] || {}).name || t : (G.byId(t) || {}).name || t).join(', ');
      const prog = d.id === 'camera' ? `${Object.keys(m.looped || {}).length}/6 looped · ${m.wrong || 0} wrong` : d.id === 'decrypt' ? `${Object.keys(m.got || {}).length}/3 keys` : d.id === 'ledger' ? `${Object.keys(m.hits || {}).length}/3 found` : d.id === 'messages' ? (m.started ? 'extraction run' : 'not started') : d.id === 'doorlog' ? `${m.tries || 0} wrong name${m.tries === 1 ? '' : 's'}` : '';
      return `<div class="mgh ${'st-' + st}"><div class="mgh-a"><b>${esc(d.name)}</b><small>${esc(who)} · opens ${d.opens.phase ? 'with "' + esc(STORY.phases[PH(d.opens.phase)].short) + '"' : 'at ' + wall(d.opens.min)}${d.clue ? ' · clue ' + d.clue : ''}</small></div>
        <span class="mgh-st">${st === 'solved' ? 'Solved by ' + esc((G.byId(m.solved.by) || { name: 'the host' }).name) : st}${prog ? ' · ' + prog : ''}</span>
        <div class="mgh-b">${st !== 'solved' ? `<button class="btn small" data-mgh="open:${d.id}">${m.mode === 'open' ? 'Opened' : 'Open now'}</button><button class="btn small ghost" data-mgh="close:${d.id}">${m.mode === 'closed' ? 'Closed' : 'Close'}</button><button class="btn small" data-mgh="solve:${d.id}">${d.id === 'vault' ? 'Maintenance override' : 'Mark solved'}</button>` : ''}
        ${d.id === 'camera' && m.started && !m.solved ? '<button class="btn small" data-mgh="add30:camera">+30 sec</button>' : ''}
        ${d.id === 'camera' && m.failed ? `<button class="btn small" data-mgh="footage:camera" ${m.footage ? 'disabled' : ''}>${m.footage ? 'Footage released' : 'Release footage to the FBI'}</button>` : ''}
        <button class="btn small ghost" data-mgh="hint:${d.id}">Send a hint</button><button class="btn small ghost" data-mgh="reset:${d.id}">Reset</button></div></div>`;
    }).join('');
  }
  function hostClick(e, toast) {
    const b = e.target.closest('[data-mgh]'); if (!b) return false;
    const [a, id] = b.dataset.mgh.split(':'), d = def(id), s = DB.get(), m = M(s, id), u = {};
    if (a === 'open') { u['mg/' + id + '/mode'] = m.mode === 'open' ? null : 'open'; Clock.log(u, 'host', `${m.mode === 'open' ? 'Returned' : 'Opened'} "${d.name}"${m.mode === 'open' ? ' to the clock' : ' early'}.`); DB.update(u); toast(m.mode === 'open' ? 'Back on the clock' : 'Opened'); }
    else if (a === 'close') { u['mg/' + id + '/mode'] = m.mode === 'closed' ? null : 'closed'; Clock.log(u, 'host', `${m.mode === 'closed' ? 'Reopened' : 'Closed'} "${d.name}".`); DB.update(u); toast(m.mode === 'closed' ? 'Back on the clock' : 'Closed'); }
    else if (a === 'solve') { if (!Ask.sure(`Mark "${d.name}" solved for everyone?${d.clue ? ' Clue ' + d.clue + ' will be marked found.' : ''}`, () => hostClick(e, toast), { title: 'Mini-games', ok: 'Mark solved' })) return true; u['mg/' + id + '/solved'] = { by: 'host', at: now() }; if (d.clue) u['clues/' + d.clue] = { at: now(), by: 'Host' }; if (id === 'vault') u['feed/' + uid('g')] = { to: ['g:crew'], title: 'The vault', text: 'Maintenance override: the vault door is open.', at: now(), kind: 'msg' }; Clock.log(u, 'host', `Marked "${d.name}" solved.`); DB.update(u); toast('Marked solved'); }
    else if (a === 'reset') { if (!Ask.sure(`Reset "${d.name}"? Everyone's shared progress on it is cleared (the clue stays marked).`, () => hostClick(e, toast), { title: 'Mini-games', ok: 'Reset', danger: true })) return true; u['mg/' + id] = null; Clock.log(u, 'host', `Reset "${d.name}".`); DB.update(u); toast('Reset'); }
    else if (a === 'add30') { DB.update({ 'mg/camera/extra': (m.extra || 0) + 30 }); toast('+30 seconds on the camera loop'); }
    else if (a === 'footage') { u['mg/camera/footage'] = now(); u['feed/' + uid('g')] = { to: ['g:fbi'], title: 'Security footage', text: 'Recovered from the museum system: vault camera, 7:52 PM. Three figures inside the vault, faces turned away. One carries a large flat package.', at: now(), kind: 'msg' }; Clock.log(u, 'host', 'Released the vault-camera footage to the FBI.'); DB.update(u); toast('Footage sent to the FBI'); }
    else if (a === 'hint') { Ask.input(`A hint for "${d.name}". It goes to everyone who has this game.`, '', v => { if (!v.trim()) return; sendMessage(d.who, v.trim(), 'Hint'); toast('Hint sent'); }, { title: 'Send a hint', ok: 'Send' }); }
    return true;
  }

  return { forMe, status, render, mount, onClick, hostPanel, hostClick, openCount: (s, me) => forMe(s, me).filter(d => status(s, d) === 'open').length, wall };
})();
