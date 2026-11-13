/* =====================================================================
   THE VANISHING HOUR — the eight mini-games (the "Tasks" tab in the player app).
   Settings (who, when, which clue) are in settings/evidence.js under STORY.games.
   How each game plays (goal, rules, hints, what it reveals) is in INFO below.

   Every game runs inside the same frame (shell): a briefing card, then the game with a
   bar on top (your time, mistakes, progress, hints, how to play), then a results card.
   Your own time, mistakes and hints stay on your phone (localStorage vh:mg:run:<game>:<you>).

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
  const fmt = sec => { sec = Math.max(0, Math.floor(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
  const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const usd = n => (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US');

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
     HOW EACH GAME PLAYS: the briefing, three hints (each adds a minute to your
     time), the par for three stars, and what the results card says was found.
     ====================================================================== */
  const INFO = {
    vault: {
      diff: 3, mins: '5–10', par: { sec: 360, miss: 0 },
      goal: 'Open the vault door before anyone checks the east hall.',
      rules: ['Drag the dial, or use the Left and Right buttons. Turn <b>left</b> to the first number and press Set, <b>right</b> to the second, <b>left</b> to the third.',
        'Each number is held by someone different: the vault schematic on the NIGHTWIRE market, Sloane, and Jules\'s camera loop.',
        'No numbers? Crack it by feel. The dial gives one soft click when it sits <b>exactly</b> on the right number, turning the right way.',
        'A wrong combination jams the dial for everyone: 30 seconds, then a minute, then two.'],
      hints: ['The first number is printed on the vault schematic, a file you can buy on the NIGHTWIRE market.',
        'Sloane knows the second number. Ask in the crew chat before you guess.',
        'The third number shows on the vault keypad feed once Jules loops that camera.'],
      outcome: 'The vault door is open. The crew has been told on NIGHTWIRE.'
    },
    camera: {
      diff: 4, mins: '2', par: { sec: 120, miss: 0 },
      goal: 'Splice a recorded loop into all six live feeds before the trace finds you.',
      rules: ['Press Start: the clock gives you <b>90 seconds</b> and the trace starts climbing.',
        'Tap a feed. Its live picture opens next to five recordings. Only one matches <b>exactly</b>: the door, the lamp, the guard and which side they stand, the cart, the painting on the wall.',
        'The recording must be from right before now (<b>7:47</b>). An old recording or a wrong scene makes the trace jump.',
        'Loop the vault keypad feed and you\'ll see Frankie\'s third number.'],
      hints: ['Check the timestamp first. Only recordings from 7:47 can work.',
        'Then the small things: which side the guard stands on, and whether the cart and the painting are there.',
        'A wrong pick costs far more trace than a slow one. Take two seconds to compare.'],
      outcome: 'The cameras show an empty building from 7:50 to 8:00. The vault keypad showed a 9: get it to Frankie.',
      fail: 'The trace finished first. The cameras stayed live, and they recorded the vault.'
    },
    decrypt: {
      diff: 3, mins: '5–10', par: { sec: 600, miss: 0 },
      goal: 'Unseal the 2001 birth record that the family court locked away.',
      rules: ['Three keys open it: the <b>county</b> of birth, the <b>mother\'s surname</b>, and the <b>year</b> of birth.',
        'Each correct key decrypts a third of the page. You can try one key at a time.',
        'A wrong key locks the record for the whole team for two minutes. Be sure before you apply.'],
      hints: ['Every key is somewhere in the evidence from 2001.',
        'The torn photograph names a woman as "J. E—". Something else in the evidence has her whole name.',
        'Whoever this record is about was born the same year that woman died. The county is on anything official about the crash on Route 9.'],
      outcome: 'Record unsealed: June Ellery\'s child, born February 2001, adopted in 2008. Logged to the case board.'
    },
    messages: {
      diff: 4, mins: '8–12', par: { sec: 720, miss: 0 },
      goal: 'Rebuild the thread Victor deleted from his phone.',
      rules: ['Running the extraction uses one of the team\'s lookups. After that, the whole FBI team works on the same thread.',
        'Tap a message to pick it up, then tap where it belongs. It moves there and the rest shift down.',
        'Most timestamps were damaged. Read it as a conversation: who reaches out, who answers, what comes next.',
        'The counter shows how many neighbouring messages are in the right order. The missing words come back when the whole thread is right.'],
      hints: ['It starts with the stranger writing late at night. Victor\'s messages are the blue ones.',
        'It ends with two messages from the stranger, one minute apart, about deleting the thread.',
        'In the middle, Victor asks what he would have to do. The answer mentions the ledger.'],
      outcome: 'The thread is whole again. Read it start to finish: it isn\'t an affair.'
    },
    photo: {
      diff: 3, mins: '6–10', par: { sec: 480, miss: 0 },
      goal: 'Put the torn photograph back together and turn it over.',
      rules: ['Sixteen torn pieces. <b>Drag</b> a piece onto another to swap them, or tap one and then the other.',
        'Tap a piece <b>twice</b> to turn it the right way up. Some are upside down.',
        'Torn edges only fit their real neighbours. When every piece is right, the photo turns over.'],
      hints: ['Start with the corners. The orange date stamp is in the bottom right.',
        'Two people: a young woman with long dark hair on the left, Victor in a dark suit on the right.',
        'Framed pictures hang along the top row. The floor runs along the bottom.'],
      outcome: 'On the back, in pencil: "Victor Ashgrove and J. E— at the Harbor gallery, December 2000." It\'s been posted to Bebbit.'
    },
    differences: {
      diff: 3, mins: '5–8', par: { sec: 360, miss: 2 },
      goal: 'Prove whether the "Harbor at Dusk" on the wall is the real painting.',
      rules: ['<b>Seven</b> things are different between the 2019 catalogue photo and the painting on the wall tonight.',
        'Tap a difference on either picture. Look closely: some are very small.',
        'Four wrong taps in a row and your eyes need a ten-second rest.'],
      hints: ['Start with the sky: the sun, and the birds.',
        'Count things: the lighthouse\'s red bands, the lines of light on the water.',
        'Look at the small boat\'s sail, and at the very bottom-right corner, under the frame.'],
      outcome: 'The painting on the wall is a copy, and its painter left a mark under the frame: a dot of indigo and the initials I.H.'
    },
    ledger: {
      diff: 4, mins: '8–12', par: { sec: 600, miss: 0 },
      goal: 'Audit Victor\'s ledger and find the three entries that hide money.',
      rules: ['Each balance should be the one above it plus or minus the amount. In three entries, the balance moves by <b>more</b> than the entry says.',
        'Tap any amount or balance to send it to the adding machine. Tap the flag on a line to mark it.',
        'Flag exactly three, then submit the audit. A wrong audit locks the ledger for a minute.',
        'Sterling and Penn share the ledger: each other\'s flags show up.'],
      hints: ['None of the three is money coming in, and none is the opening or closing line.',
        'The three are spread across the month: one early, one in the middle, one near the end.',
        'What would an art adviser hide inside? Lighting, framing and couriers are worth checking.'],
      outcome: 'Three payments to Vale Fine Art Advisory, $50,000 in all, hidden inside lighting, framing and a courier. The last went out the day Peregrine Vale\'s appraisal was issued.'
    },
    doorlog: {
      diff: 4, mins: '6–10', par: { sec: 480, miss: 0 },
      goal: 'Find whose badge opened the vault stairwell after Charlie went in.',
      rules: ['Charlie\'s last radio call came from the vault stairwell at <b>7:46</b>.',
        'The log only shows badge numbers. Tap a swipe to look its badge up in the register.',
        'A <b>denied</b> swipe means the door stayed shut.',
        'Pick the swipe and press Flag. Three wrong flags lock the console for two minutes.'],
      hints: ['Show only the vault stairwell, and narrow the time to around 7:30 to 7:50.',
        'Find Charlie\'s own badge first. You want someone who went in after it.',
        'Look the remaining badge up in the register. Who signed for it?'],
      outcome: 'Badge T-03: one of five temporary FBI badges handed out at the main entrance at 7:13. Nobody signed for it by name.'
    }
  };

  const IC = {
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
    miss: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
    bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0012 3z"/></svg>',
    help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17h.01"/></svg>',
    check: '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23"/><path d="M15 27l7 7 15-16"/></svg>',
    cross: '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23"/><path d="M18 18l16 16M34 18L18 34"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>'
  };

  /* ======================================================================
     THE FRAME every game runs in: briefing → play (with the bar) → results.
     ====================================================================== */
  function shell(id, me) {
    const d = def(id), info = INFO[id] || { rules: [], hints: [] }, KEY = 'vh:mg:run:' + id + ':' + me.id;
    let r; try { r = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { r = {}; }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch (e) { } };
    let view = null, help = false;
    const wrap = h('div', 'mgx mgx-' + id);
    const q = k => wrap.querySelector(`[data-x="${k}"]`);
    const bump = kind => { wrap.classList.remove('bad', 'good'); void wrap.offsetWidth; wrap.classList.add(kind); clearTimeout(bump.t); bump.t = setTimeout(() => wrap.classList.remove(kind), 600); };
    const ctx = { me, miss(n) { r.miss = (r.miss || 0) + (n || 1); save(); bump('bad'); hud(DB.get()); }, good() { bump('good'); } };
    const game = BUILD[id](me, ctx);
    const who = G.toLabel(d.who);
    wrap.innerHTML = `<section class="mgx-brief" data-x="brief"></section>
      <section class="mgx-play" data-x="play">
        <div class="mgx-hud">
          <span class="mgx-st" title="Your time"><i>${IC.clock}</i><b data-x="time">0:00</b></span>
          <span class="mgx-st" title="Mistakes"><i>${IC.miss}</i><b data-x="miss">0</b></span>
          <span class="mgx-pg" data-x="pg"><span class="mgx-pgb"><i data-x="pgb"></i></span><small data-x="pgt"></small></span>
          <button class="mgx-hb" data-x="hint">${IC.bulb}<span>Hint</span><small data-x="hl"></small></button>
          <button class="mgx-hb ic" data-x="help" aria-label="How to play" title="How to play">${IC.help}</button>
        </div>
        <div class="mgx-tips" data-x="tips"></div>
        <div class="mgx-banner" data-x="banner" hidden></div>
        <div class="mgx-stage" data-x="stage"></div>
      </section>
      <section class="mgx-result" data-x="result" hidden></section>`;
    q('stage').appendChild(game.el);
    const elapsed = () => r.t0 ? ((r.t1 || now()) - r.t0) / 1000 + (r.hints || 0) * 60 : 0;
    const stars = () => Math.max(1, 3 - ((r.hints || 0) > 0) - ((r.miss || 0) > (info.par ? info.par.miss : 0)) - (elapsed() > (info.par ? info.par.sec : 600)));
    const starRow = n => `<div class="mgx-stars" aria-label="${n} of 3 stars">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}" style="--i:${i}">${IC.star}</i>`).join('')}</div>`;

    function brief(s) {
      const st = status(s, d), m = M(s, id), dots = Array.from({ length: 5 }, (_, i) => `<i class="${i < info.diff ? 'on' : ''}"></i>`).join('');
      const going = id === 'camera' && m.started && !m.solved && !m.failed;
      const label = help ? 'Back to the game' : r.t0 ? 'Carry on' : id === 'camera' ? (going ? 'Join the loop' : 'Start the loop · 90 seconds') : 'Start';
      patch(q('brief'), `<div class="mgx-art">${THUMB[id] || ''}<span class="mgx-art-ic">${ICON[id] || ''}</span></div>
        <div class="mgx-bx"><small class="mgx-kick">${esc(KICK())}${help ? ' · how to play' : ''}</small><h3>${esc(d.name)}</h3><p class="mgx-goal">${esc(info.goal)}</p>
          <div class="mgx-meta"><span><small>Difficulty</small><b class="mgx-dots">${dots}</b></span><span><small>Takes about</small><b>${esc(info.mins)} min</b></span><span><small>For</small><b>${esc(who)}</b></span>${d.clue ? `<span><small>Unlocks</small><b>Clue ${esc(d.clue)}</b></span>` : ''}</div>
          <ol class="mgx-rules">${info.rules.map(x => `<li>${x}</li>`).join('')}</ol>
          <div class="mgx-go"><button class="btn primary" data-x="start">${label}</button><small>${going && !r.t0 ? 'The loop is already running. Hurry.' : (info.hints.length ? `${info.hints.length} hints if you get stuck, each one adds a minute.` : '')}</small></div></div>`);
    }
    function result(s) {
      const st = status(s, d), m = M(s, id), ok = st === 'solved', by = ok && m.solved.by !== me.id ? (G.byId(m.solved.by) || { name: m.solved.by === 'host' ? 'the host' : 'someone' }).name : null;
      const mine = !!r.t0;
      patch(q('result'), `<div class="mgx-rs ${ok ? 'ok' : 'no'}"><div class="mgx-seal">${ok ? IC.check : IC.cross}</div>
        <small class="mgx-kick">${ok ? (by ? 'Solved by ' + esc(by.split(' ')[0]) : 'Solved') : 'Failed'}${m.solved && m.solved.at ? ' · ' + esc(wallTime(m.solved.at)) : ''}</small><h3>${esc(d.name)}</h3>
        ${mine ? `<div class="mgx-stats"><span><b>${fmt(elapsed())}</b><small>Your time${r.hints ? ' (with hints)' : ''}</small></span><span><b>${r.miss || 0}</b><small>Mistakes</small></span><span><b>${r.hints || 0}</b><small>Hints</small></span></div>${ok ? starRow(stars()) : ''}` : ''}
        <div class="mgx-find"><small>${ok ? 'What it showed' : 'What happened'}</small><p>${esc(ok ? info.outcome : info.fail || '')}</p>${ok && d.clue ? `<span>Clue ${esc(d.clue)} is marked found</span>` : ''}</div>
        <div class="mgx-rb"><button class="btn" data-x="board">See the ${id === 'photo' ? 'photo' : id === 'messages' ? 'thread' : id === 'ledger' ? 'ledger' : id === 'differences' ? 'paintings' : 'board'}</button><button class="btn primary" data-mg-close>Back to the list</button></div></div>`);
    }
    function hud(s) {
      const st = status(s, d), fin = st === 'solved' || st === 'failed';
      const t = q('time').textContent = fmt(elapsed());
      q('miss').textContent = r.miss || 0;
      const p = game.prog ? game.prog(s) : null;
      if (p) { q('pg').hidden = false; q('pg').classList.toggle('nobar', !p[1]); q('pgb').style.width = (p[1] ? p[0] / p[1] * 100 : 0).toFixed(1) + '%'; q('pgt').textContent = p[2] || `${p[0]}/${p[1]}`; } else q('pg').hidden = true;
      const left = info.hints.length - (r.hints || 0);
      q('hint').disabled = fin || left <= 0; q('hl').textContent = left > 0 ? `${left} left` : 'none left';
      patch(q('tips'), (info.hints.slice(0, r.hints || 0)).map((x, i) => `<div class="mgx-tip"><small>Hint ${i + 1}</small><p>${esc(x)}</p></div>`).join(''));
      q('banner').hidden = !fin;
      if (fin) patch(q('banner'), `<span>${st === 'solved' ? '✓ Solved' : '✕ Failed'}${r.t0 ? ' · ' + fmt(elapsed()) : ''}</span>${st === 'solved' && r.t0 ? starRow(stars()) : ''}<button class="mg-link" data-x="results">Results</button>`);
      return t;
    }
    function sync(s) {
      const st = status(s, d), m = M(s, id), fin = st === 'solved' || st === 'failed';
      /* the host reset this game: start fresh */
      if (!fin && r.end) { r = {}; save(); view = null; }
      if (fin && r.t0 && !r.t1) { r.t1 = (m.solved || m.failed || {}).at || now(); save(); }
      /* let the game show its own finish (the photo turning over, the stamp) before the results card */
      if (fin && !r.end) { r.end = true; save(); if (st === 'solved') vib([40, 30, 90]); if (view === 'play') setTimeout(() => { if (view === 'play') { view = 'result'; sync(DB.get()); } }, id === 'photo' ? 2600 : 1800); else view = 'result'; }
      if (!view) view = fin ? 'result' : r.t0 ? 'play' : 'brief';
      if (!fin && view === 'result') view = r.t0 ? 'play' : 'brief';
      q('brief').hidden = view !== 'brief'; q('play').hidden = view !== 'play'; q('result').hidden = view !== 'result';
      wrap.dataset.view = view;
      if (view === 'brief') brief(s);
      else if (view === 'result') result(s);
      else { game.sync(s); hud(s); }
    }
    wrap.addEventListener('click', e => {
      const b = e.target.closest('[data-x]'); if (!b || !wrap.contains(b)) return;
      const x = b.dataset.x, s = DB.get(), st = status(s, d), fin = st === 'solved' || st === 'failed';
      if (x === 'start') {
        if (help) { help = false; view = fin ? 'result' : 'play'; }
        else { if (!r.t0) { r.t0 = now(); save(); } view = 'play'; if (game.start && !fin) game.start(); }
        sync(DB.get()); wrap.closest('.mgs-body') && (wrap.closest('.mgs-body').scrollTop = 0);
      } else if (x === 'help') { help = true; view = 'brief'; sync(s); }
      else if (x === 'board') { view = 'play'; sync(s); }
      else if (x === 'results') { view = 'result'; sync(s); }
      else if (x === 'hint') {
        const n = r.hints || 0; if (fin || n >= info.hints.length) return;
        if (!Ask.sure(`Take hint ${n + 1} of ${info.hints.length}? It adds one minute to your time.`, () => q('hint').click(), { title: 'A hint', ok: 'Show me' })) return;
        r.hints = n + 1; save(); const u = {}; Clock.log(u, 'game', `${me.name} took hint ${n + 1} on "${d.name}".`); DB.update(u); sync(DB.get());
      }
    });
    return {
      el: wrap, sync,
      tick() { if (view === 'play') { hud(DB.get()); if (game.tick) game.tick(); } },
      fast: game.fast ? () => { if (view === 'play') game.sync(DB.get()); } : null
    };
  }

  /* ======================================================================
     1. THE VAULT DIAL (Frankie). Left, right, left.
        mg/vault: lockUntil, fails (each wrong combination jams it longer)
     ====================================================================== */
  function vault(me, ctx) {
    const combo = (STORY.nightwire.vault || {}).combo || [24, 61, 9], DIRS = ['L', 'R', 'L'];
    const el = h('div', 'mg mg-vault');
    let rot = 0, dir = '', steps = [], drag = null, msg = '', spin = 0, vel = 0, lastMove = 0, raf = 0, clickT = 0;
    el.innerHTML = `<div class="mgv-door"><div class="mgv-plate"><span class="mgv-brand">Hartwell &amp; Sons · Boston · 1912</span><span class="mgv-led" data-v="led">LOCKED</span></div>
      <div class="mgv-wrap"><div class="mgv-bolts" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => `<i style="--a:${i * 45}deg"></i>`).join('')}</div>
      <svg class="mgv-dial" viewBox="0 0 300 300" data-v="dial" role="slider" aria-label="Combination dial" aria-valuemin="0" aria-valuemax="99" tabindex="0">
        <defs><radialGradient id="mgvk" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#f1f4f7"/><stop offset=".45" stop-color="#a3abb5"/><stop offset="1" stop-color="#454c55"/></radialGradient>
        <radialGradient id="mgvf" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#2e333b"/><stop offset="1" stop-color="#0c0f13"/></radialGradient>
        <linearGradient id="mgvr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a525c"/><stop offset=".5" stop-color="#1a1e24"/><stop offset="1" stop-color="#3a414a"/></linearGradient></defs>
        <circle cx="150" cy="150" r="148" fill="url(#mgvr)"/><circle cx="150" cy="150" r="140" fill="#14171c" stroke="#0a0c0f" stroke-width="2"/>
        <g data-v="rot">${Array.from({ length: 100 }, (_, i) => { const a = i * 3.6; return `<line x1="150" y1="16" x2="150" y2="${i % 10 ? 25 : i % 5 ? 29 : 33}" stroke="#d4d9e0" stroke-width="${i % 10 ? 1.1 : 2.4}" transform="rotate(${a} 150 150)"/>` + (i % 10 ? '' : `<text x="150" y="52" text-anchor="middle" font-size="15" font-weight="600" font-family="JetBrains Mono, monospace" fill="#eef1f5" transform="rotate(${a} 150 150)">${i}</text>`); }).join('')}
          <circle cx="150" cy="150" r="90" fill="url(#mgvf)" stroke="#4f5761" stroke-width="3"/>
          <circle cx="150" cy="150" r="66" fill="url(#mgvk)"/>${Array.from({ length: 30 }, (_, i) => `<rect x="148.5" y="84" width="3" height="11" rx="1.5" fill="#5f6771" transform="rotate(${i * 12} 150 150)"/>`).join('')}
          <circle cx="150" cy="150" r="20" fill="#262b32" stroke="#59616b"/><circle cx="150" cy="150" r="6" fill="#0f1215"/></g>
        <path d="M150 3 l-8 0 l8 13 l8 -13z" fill="#e2bd66" stroke="#7a5e22"/>
        <circle data-v="tick" cx="150" cy="22" r="3" fill="#fff6d0" opacity="0"/>
      </svg>
      <div class="mgv-read"><small>Dial</small><b data-v="num">00</b><span data-v="dirl">—</span></div></div>
      <div class="mgv-steps" data-v="steps"></div></div>
      <div class="mgv-acts"><button class="btn small" data-v="up" aria-label="Turn left one number">‹ Left</button><button class="btn primary" data-v="set">Set this number</button><button class="btn small" data-v="dn" aria-label="Turn right one number">Right ›</button></div>
      <p class="mgv-msg" data-v="msg" role="status"></p><button class="mg-link" data-v="clear">Start over</button>`;
    const q = k => el.querySelector(`[data-v="${k}"]`);
    const val = () => ((Math.round(-rot / 3.6) % 100) + 100) % 100;
    function draw() {
      const s = DB.get(), m = M(s, 'vault'), v = val(), locked = (m.lockUntil || 0) > now(), solved = !!m.solved;
      q('rot').setAttribute('transform', `rotate(${rot.toFixed(2)} 150 150)`);
      q('num').textContent = String(v).padStart(2, '0'); q('dial').setAttribute('aria-valuenow', v);
      q('dirl').textContent = dir === 'L' ? '↺ left' : dir === 'R' ? '↻ right' : '—';
      patch(q('steps'), DIRS.map((dd, i) => `<div class="${i === steps.length && !solved ? 'on' : ''} ${steps[i] != null || solved ? 'set' : ''}"><small>${i + 1} · turn ${dd === 'L' ? 'left' : 'right'}</small><b>${solved ? String(combo[i]).padStart(2, '0') : steps[i] != null ? String(steps[i]).padStart(2, '0') : '– –'}</b></div>`).join(''));
      q('led').textContent = solved ? 'OPEN' : locked ? 'JAMMED · ' + Math.ceil((m.lockUntil - now()) / 1000) + 's' : 'LOCKED';
      el.classList.toggle('open', solved); el.classList.toggle('jam', locked && !solved);
      q('msg').textContent = solved ? 'The bolts slide back. The vault is open.' : locked ? 'Wrong combination. The dial is jammed.' : msg || (steps.length < 3 ? `Turn ${DIRS[steps.length] === 'L' ? 'LEFT' : 'RIGHT'} to number ${steps.length + 1}, then press Set.` : '');
      q('set').disabled = solved || locked;
      const k = Math.max(0, 1 - (now() - clickT) / 260); q('tick').setAttribute('opacity', k.toFixed(2));
    }
    function turn(deg) {
      if (M(DB.get(), 'vault').solved || (M(DB.get(), 'vault').lockUntil || 0) > now()) return;
      const before = val(); rot += deg; const v = val();
      if (deg) dir = deg < 0 ? 'L' : 'R';
      if (v !== before) {
        msg = '';
        /* the soft click: only exactly on the right number, turning the right way */
        const t = combo[steps.length];
        if (t != null && v === t && dir === DIRS[steps.length]) { clickT = now(); vib(12); }
      }
      draw();
    }
    const stopSpin = () => { spin = 0; cancelAnimationFrame(raf); };
    function coast() { if (Math.abs(spin) < .15) return stopSpin(); turn(spin); spin *= .9; raf = requestAnimationFrame(coast); }
    const ang = e => { const b = q('dial').getBoundingClientRect(); return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180 / Math.PI; };
    q('dial').addEventListener('pointerdown', e => { stopSpin(); drag = ang(e); vel = 0; lastMove = performance.now(); try { q('dial').setPointerCapture(e.pointerId); } catch (er) { } e.preventDefault(); });
    q('dial').addEventListener('pointermove', e => { if (drag == null) return; const a = ang(e); let dd = a - drag; if (dd > 180) dd -= 360; if (dd < -180) dd += 360; drag = a; const t = performance.now(); vel = dd / Math.max(8, t - lastMove) * 16; lastMove = t; turn(dd); });
    ['pointerup', 'pointercancel'].forEach(t => q('dial').addEventListener(t, () => { if (drag == null) return; drag = null; if (performance.now() - lastMove < 80 && Math.abs(vel) > 2) { spin = Math.max(-14, Math.min(14, vel)); coast(); } }));
    q('dial').addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); turn(-3.6); } if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); turn(3.6); } if (e.key === 'Enter') q('set').click(); });
    q('up').addEventListener('click', () => turn(-3.6)); q('dn').addEventListener('click', () => turn(3.6));
    q('clear').addEventListener('click', () => { steps = []; dir = ''; msg = 'Cleared. Start again with a left turn.'; draw(); });
    q('set').addEventListener('click', () => {
      const s = DB.get(), m = M(s, 'vault'); if (m.solved || (m.lockUntil || 0) > now()) return;
      const want = DIRS[steps.length];
      if (dir !== want) { msg = `This number has to be reached turning ${want === 'L' ? 'left' : 'right'}.`; return draw(); }
      steps.push(val()); dir = '';
      if (steps.length < 3) { msg = `Set. Now turn ${DIRS[steps.length] === 'L' ? 'left' : 'right'}.`; return draw(); }
      if (steps.every((n, i) => n === combo[i])) {
        const u = { ['feed/' + uid('g')]: { to: ['g:crew'], title: 'The vault', text: 'Door open. The vault is open.', at: now(), kind: 'msg' } };
        if (M(s, 'camera').failed) Clock.log(u, 'game', 'The cameras were still live when the vault opened: the vault camera has footage of the crew (host terminal > Games > Release footage).');
        Clock.log(u, 'game', 'The vault was opened.');
        solve('vault', me, u); ctx.good(); steps = []; return draw();
      }
      const fails = (m.fails || 0), secs = [30, 60, 120][Math.min(fails, 2)];
      const u = { 'mg/vault/lockUntil': now() + secs * 1000, 'mg/vault/fails': fails + 1 }; Clock.log(u, 'game', `Wrong combination on the vault (jammed ${secs} s).`);
      DB.update(u); steps = []; vib([200]); msg = ''; ctx.miss(); draw();
    });
    return { el, sync: draw, tick: draw, prog: s => [M(s, 'vault').solved ? 3 : steps.length, 3, (M(s, 'vault').solved ? 3 : steps.length) + ' of 3 set'] };
  }

  /* ======================================================================
     2. THE CAMERA LOOP (Jules). Six feeds, a 90-second window and a trace meter.
        mg/camera: started (ms), extra (seconds the host added), looped {feed: true}, wrong (n), failed
     ====================================================================== */
  /* guard: 0 none, 1 left, 2 right */
  const FEEDS = [
    { id: 'lobby', name: 'Lobby', live: { door: 1, lamp: 1, guard: 0, cart: 0, art: 1 } },
    { id: 'east', name: 'East hall', live: { door: 0, lamp: 1, guard: 2, cart: 0, art: 1 } },
    { id: 'stairs', name: 'Vault stairs', live: { door: 0, lamp: 0, guard: 1, cart: 0, art: 0 } },
    { id: 'keypad', name: 'Vault keypad', live: { door: 0, lamp: 1, guard: 0, cart: 0, art: 0 }, digit: 9 },
    { id: 'dock', name: 'Loading dock', live: { door: 1, lamp: 0, guard: 1, cart: 1, art: 0 } },
    { id: 'main', name: 'Main room', live: { door: 1, lamp: 1, guard: 2, cart: 1, art: 1 } }
  ];
  /* five recordings per feed: one right (same scene, 7:47), one old, three that differ in one small thing */
  function clips(f, k) {
    const r = Art.rng(k * 131 + 29), L = f.live, sec = () => String(Math.floor(r() * 50) + 10);
    const vary = key => { const s = Object.assign({}, L); if (key === 'guard') s.guard = L.guard === 0 ? 1 + Math.floor(r() * 2) : L.guard === 1 ? 2 : 1; else s[key] = L[key] ? 0 : 1; return s; };
    const keys = shuffle(['guard', 'cart', 'art', 'door'], r);
    return shuffle([
      { ok: 1, t: `7:47:${sec()}`, s: L },
      { ok: 0, t: `7:${20 + Math.floor(r() * 16)}:${sec()}`, s: L },
      { ok: 0, t: `7:47:${sec()}`, s: vary(keys[0]) },
      { ok: 0, t: `7:47:${sec()}`, s: vary(keys[1]) },
      { ok: 0, t: `7:47:${sec()}`, s: vary(keys[2]) }
    ], r);
  }
  const scene = (st, extra) => `<svg viewBox="0 0 160 100" class="mgc-sc" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="${st.lamp ? '#2a3731' : '#111714'}"/>
    <path d="M0 76 L160 76 L160 100 L0 100Z" fill="${st.lamp ? '#1f2924' : '#0b100d'}"/><path d="M0 76 L-30 100 M160 76 L190 100 M40 76 L28 100 M120 76 L132 100" stroke="${st.lamp ? '#34443b' : '#18201b'}"/>
    ${st.lamp ? '<path d="M126 8 L144 8 L172 100 L98 100Z" fill="#d7efcc" opacity=".09"/><rect x="128" y="4" width="14" height="5" rx="1" fill="#e9f3d0"/>' : '<rect x="128" y="4" width="14" height="5" rx="1" fill="#2f3a33"/>'}
    ${st.art ? '<rect x="70" y="20" width="26" height="19" fill="#3a463e" stroke="#9db1a2" stroke-width="1.6"/><path d="M72 36 l7 -8 l6 5 l5 -4 l4 7z" fill="#73897a"/>' : ''}
    <rect x="14" y="26" width="30" height="50" fill="${st.door ? '#070908' : '#465950'}" stroke="#7f9688" stroke-width="2"/>${st.door ? '<path d="M14 26 L30 32 V82 L14 76Z" fill="#5a6d61"/>' : '<circle cx="39" cy="52" r="1.8" fill="#c9d6cc"/>'}
    ${st.cart ? '<g><rect x="128" y="60" width="22" height="12" fill="#55665b"/><rect x="126" y="58" width="26" height="3" fill="#7c8f82"/><circle cx="132" cy="75" r="2.5" fill="#1a201c"/><circle cx="146" cy="75" r="2.5" fill="#1a201c"/></g>' : ''}
    ${st.guard ? `<g transform="translate(${st.guard === 1 ? 58 : 108} 0)"><circle cx="0" cy="46" r="6.5" fill="#b9c8bd"/><path d="M-9 84 V62 q9 -8 18 0 V84Z" fill="#8fa497"/><rect x="-9" y="66" width="18" height="2" fill="#4d5d52"/></g>` : ''}
    ${extra || ''}<rect width="160" height="100" fill="url(#mgcs)"/><rect width="160" height="100" fill="url(#mgcv)"/></svg>`;
  const KEYPAD = dg => `<rect x="62" y="22" width="38" height="28" rx="2" fill="#0b100d" stroke="#7f9688"/><rect x="66" y="26" width="30" height="13" fill="#06120a"/><text x="81" y="37" text-anchor="middle" font-family="monospace" font-size="12" fill="#7dff9a">${dg}</text>${[0, 1, 2].map(i => `<rect x="${67 + i * 10}" y="42" width="7" height="5" fill="#3a463e"/>`).join('')}`;
  function camera(me, ctx) {
    const d = def('camera'), el = h('div', 'mg mg-cam');
    let sel = null, flash = '', flashOk = false;
    el.innerHTML = `<svg width="0" height="0" style="position:absolute"><defs><pattern id="mgcs" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1.2" fill="#000" opacity=".22"/></pattern><radialGradient id="mgcv" cx=".5" cy=".5" r=".7"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient></defs></svg>
      <div class="mgc-top"><div class="mgc-ttl"><small>Ashgrove · security grid</small><b data-c="clock">7:48:00 PM</b></div>
        <div class="mgc-trace"><small>Trace <b data-c="tv">0%</b></small><div><i data-c="trace"></i></div></div>
        <div class="mgc-time"><small>Window</small><b data-c="left">1:30</b></div></div>
      <div class="mgc-grid" data-c="grid"></div>
      <div class="mgc-splice" data-c="splice"></div>
      <p class="mgc-msg" data-c="msg" role="status"></p>`;
    const q = k => el.querySelector(`[data-c="${k}"]`);
    const total = m => (d.seconds || 90) + (m.extra || 0);
    const endT = m => m.solved ? m.solved.at : m.failed ? m.failed.at : now();
    const ts = m => { const t = m.started ? Math.floor((endT(m) - m.started) / 1000) : 0; return `7:${String(48 + Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
    function tr(m) { if (!m.started) return 0; const t = (endT(m) - m.started) / 1000; return Math.min(100, t / total(m) * 70 + (m.wrong || 0) * 16); }
    function draw() {
      const s = DB.get(), m = M(s, 'camera'), lp = m.looped || {}, solved = !!m.solved, failed = !!m.failed;
      const running = m.started && !solved && !failed;
      el.classList.toggle('done', solved); el.classList.toggle('fail', failed); el.classList.toggle('run', !!running);
      const left = m.started ? Math.max(0, total(m) - (endT(m) - m.started) / 1000) : total(m);
      q('left').textContent = fmt(left); q('left').classList.toggle('hot', running && left < 20);
      const tv = tr(m); q('trace').style.width = tv + '%'; q('tv').textContent = Math.round(tv) + '%'; el.classList.toggle('hot', tv > 70 && !!running);
      const now_ = ts(m); q('clock').textContent = now_ + ' PM';
      /* rebuilt only when something changes (patch), so a tap is never lost; the seconds tick separately */
      patch(q('grid'), FEEDS.map(f => `<button class="mgc-feed ${lp[f.id] ? 'loop' : ''} ${sel === f.id ? 'sel' : ''}" data-feed="${f.id}" aria-label="${f.name}${lp[f.id] ? ', looped' : ''}">${scene(f.live, f.digit ? KEYPAD(lp[f.id] ? f.digit : '–') : '')}
        <span class="mgc-lab"><i></i>${lp[f.id] ? 'LOOP' : 'LIVE'} · ${f.name}</span><span class="mgc-ts"></span></button>`).join(''));
      el.querySelectorAll('.mgc-ts').forEach(x => { if (x.textContent !== now_) x.textContent = now_; });
      if (running && sel && !lp[sel]) {
        const f = FEEDS.find(x => x.id === sel), cs = clips(f, FEEDS.indexOf(f));
        const fresh = patch(q('splice'), `<small class="mgc-sh">${f.name} · the live picture, and five recordings. Pick the one that matches exactly.</small><div class="mgc-sg"><div class="mgc-live">${scene(f.live, f.digit ? KEYPAD('–') : '')}<span class="mgc-tag">LIVE</span><span class="mgc-ts2"></span></div>
          ${cs.map((c, i) => `<button class="mgc-clip" data-clip="${i}">${scene(c.s, f.digit ? KEYPAD('–') : '')}<span>REC ${c.t}</span></button>`).join('')}</div>`);
        el.querySelectorAll('.mgc-ts2').forEach(x => { if (x.textContent !== now_) x.textContent = now_; });
        /* on a phone the splice panel is below the feeds: bring it into view */
        if (fresh && innerWidth < 760) q('splice').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else patch(q('splice'), running ? '<div class="mgc-pick"><svg viewBox="0 0 24 24"><rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3"/></svg>Tap a live feed to splice a loop into it.</div>' : '');
      q('msg').textContent = solved ? `All six feeds looped. The keypad feed showed ${FEEDS[3].digit}.` : failed ? 'Trace complete. The cameras stayed live.' : flash || (running ? '' : 'Waiting to start.');
      q('msg').className = 'mgc-msg' + (flash ? (flashOk ? ' ok' : ' bad') : '');
      /* time ran out, or the trace caught you */
      if (running && (tv >= 100 || left <= 0)) { const u = { 'mg/camera/failed': { at: now() } }; Clock.log(u, 'game', 'The camera loop failed: the cameras are still recording.'); DB.update(u); }
    }
    el.addEventListener('click', e => {
      const s = DB.get(), m = M(s, 'camera');
      if (!m.started || m.solved || m.failed) return;
      const f = e.target.closest('[data-feed]'); if (f) { if ((m.looped || {})[f.dataset.feed]) return; sel = sel === f.dataset.feed ? null : f.dataset.feed; flash = ''; return draw(); }
      const c = e.target.closest('[data-clip]'); if (c && sel) {
        const feed = FEEDS.find(x => x.id === sel), pick = clips(feed, FEEDS.indexOf(feed))[Number(c.dataset.clip)];
        if (pick.ok) {
          const lp = Object.assign({}, m.looped || {}, { [sel]: true }), u = { ['mg/camera/looped/' + sel]: true };
          flash = sel === 'keypad' ? `Looped. The keypad's memory shows the last digit pressed: ${FEEDS[3].digit}.` : `${feed.name}: looped.`; flashOk = true; vib(30); ctx.good();
          sel = null;
          if (FEEDS.every(x => lp[x.id])) { DB.update(u); solve('camera', me, { ['feed/' + uid('g')]: { to: ['g:crew'], title: 'Cameras', text: `Cameras looped from 7:50 to 8:00. The vault keypad shows ${FEEDS[3].digit}.`, at: now(), kind: 'msg' } }); }
          else DB.update(u);
        } else { DB.update({ 'mg/camera/wrong': (m.wrong || 0) + 1 }); flash = pick.t.startsWith('7:47') ? 'Wrong loop: the scene doesn\'t match. The trace jumped.' : 'Wrong loop: that recording is old. The trace jumped.'; flashOk = false; vib([80, 40, 80]); ctx.miss(); }
        return draw();
      }
    });
    return {
      el, sync: draw, tick: draw,
      start() { const m = M(DB.get(), 'camera'); if (!m.started) { const u = { 'mg/camera/started': now() }; Clock.log(u, 'game', `${me.name} started the camera loop.`); DB.update(u); } },
      prog: s => { const n = Object.keys(M(s, 'camera').looped || {}).length; return [n, 6, n + ' of 6 looped']; }
    };
  }

  /* ======================================================================
     3. THE SEALED BIRTH RECORD (FBI). Three keys, each unscrambles a third.
        mg/decrypt: got { county, surname, year }, lockUntil (a wrong key locks it for 2 minutes)
     ====================================================================== */
  const SEALED = [
    { key: 'county', label: 'County of birth', ph: 'County', ok: v => /^harlow( county)?$/.test(v), show: 'Harlow', text: 'HARLOW COUNTY · RECORD OF LIVE BIRTH · SEALED BY ORDER OF THE FAMILY COURT, 2008' },
    { key: 'surname', label: 'Mother\'s surname', ph: 'Surname', ok: v => v === 'ellery', show: 'Ellery', text: 'MOTHER: JUNE ELLERY, 23 · FATHER: NOT NAMED' },
    { key: 'year', label: 'Year of birth', ph: 'YYYY', ok: v => v === '2001', show: '2001', text: 'CHILD: ROWAN ELLERY · BORN FEBRUARY 2001 · ADOPTED 2008' }
  ];
  const GLY = '▓▒░█▌▐■□◆◇#%&@$*';
  function decrypt(me, ctx) {
    const d = def('decrypt'), el = h('div', 'mg mg-dec');
    const anim = {};
    el.innerHTML = `<div class="mgd-doc"><div class="mgd-crest" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18"/><circle cx="20" cy="20" r="13"/><path d="M20 9l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z"/></svg></div>
        <div class="mgd-hd"><small>Family Court · Records Division</small><b>Record of live birth</b><span>Sealed · access by court key only · Docket 08-FC-0417</span></div>
        ${SEALED.map((x, i) => `<div class="mgd-row"><small>${['Section A · registry', 'Section B · parents', 'Section C · child'][i]}</small><p class="mgd-line" data-d="l${i}"></p></div>`).join('')}
        <div class="mgd-foot"><span>Sealed 2008</span><span>Clerk: M. Ostrander</span></div><div class="mgd-stamp" data-d="stamp">UNSEALED</div><div class="mgd-lock" data-d="lockv"><b>RECORD LOCKED</b><span data-d="lockt"></span></div></div>
      <form class="mgd-keys" data-d="form">${SEALED.map(x => `<label class="mgd-k" data-d="k-${x.key}"><small>${x.label}</small><span><input class="field" name="${x.key}" placeholder="${x.ph}" autocomplete="off" spellcheck="false" ${x.key === 'year' ? 'inputmode="numeric" maxlength="4"' : ''}><i>✓</i></span></label>`).join('')}<button class="btn primary">Apply keys</button></form>
      <p class="mgd-msg" data-d="msg" role="status"></p>`;
    const q = k => el.querySelector(`[data-d="${k}"]`);
    const scr = n => Array.from({ length: n }, () => GLY[Math.floor(Math.random() * GLY.length)]).join('');
    let msg = '', lastScr = 0;
    function draw() {
      const s = DB.get(), m = M(s, 'decrypt'), got = m.got || {}, locked = (m.lockUntil || 0) > now();
      const reshuffle = now() - lastScr > 140; if (reshuffle) lastScr = now();
      SEALED.forEach((x, i) => {
        const p = q('l' + i);
        if (got[x.key]) {
          if (!anim[x.key]) anim[x.key] = now();
          const k = Math.min(1, (now() - anim[x.key]) / 1600), n = Math.floor(x.text.length * k);
          const t = x.text.slice(0, n) + (k < 1 ? scr(x.text.length - n) : ''); if (p.textContent !== t) p.textContent = t; p.classList.add('open');
        } else { if (reshuffle || !p.textContent) p.textContent = scr(x.text.length); p.classList.remove('open'); }
        const inp = el.querySelector(`input[name="${x.key}"]`); inp.disabled = !!got[x.key] || locked || !!m.solved;
        if (got[x.key] && inp.value !== x.show) inp.value = x.show;
        q('k-' + x.key).classList.toggle('ok', !!got[x.key]);
      });
      q('stamp').classList.toggle('on', !!m.solved);
      q('lockv').classList.toggle('on', locked && !m.solved); q('lockt').textContent = locked ? fmt((m.lockUntil - now()) / 1000) : '';
      el.querySelector('.mgd-keys button').disabled = locked || !!m.solved;
      q('msg').textContent = m.solved ? 'Record unsealed. Logged to the case board.' : locked ? (msg ? msg + ' ' : 'A wrong key was applied. ') + 'The court system locked the record.' : msg || 'Enter the keys you\'re sure of. Each right one opens a third of the record.';
    }
    el.addEventListener('submit', e => {
      e.preventDefault(); const s = DB.fresh(), m = M(s, 'decrypt'), got = Object.assign({}, m.got || {});
      if (m.solved || (m.lockUntil || 0) > now()) return;
      let any = false, bad = 0, good = 0; const u = {};
      SEALED.forEach(x => { if (got[x.key]) return; const v = (el.querySelector(`input[name="${x.key}"]`).value || '').trim().toLowerCase().replace(/\s+/g, ' '); if (!v) return; any = true; if (x.ok(v)) { got[x.key] = true; good++; u['mg/decrypt/got/' + x.key] = true; } else bad++; });
      if (!any) { msg = 'Type at least one key.'; return draw(); }
      if (bad) { u['mg/decrypt/lockUntil'] = now() + (d.lockMin || 2) * 60000; Clock.log(u, 'game', `${me.name} tried a wrong key on the sealed birth record (locked ${d.lockMin || 2} min).`); ctx.miss(bad); el.querySelectorAll('.mgd-k:not(.ok) input').forEach(i => { i.value = ''; }); }
      else ctx.good();
      DB.update(u); msg = good && bad ? `${good} key${good > 1 ? 's' : ''} worked, ${bad} didn't.` : '';
      if (SEALED.every(x => got[x.key])) solve('decrypt', me);
      draw();
    });
    return { el, sync: draw, tick: draw, fast: true, prog: s => { const n = Object.keys(M(s, 'decrypt').got || {}).length; return [n, 3, n + ' of 3 keys']; } };
  }

  /* ======================================================================
     4. VICTOR'S PHONE: THE DELETED THREAD (FBI). Costs one lookup. Shared puzzle.
        mg/messages: started { by, at }, order [indexes, shuffled]
        [who, real timestamp, full text, damaged text (null = intact), damaged timestamp (null = readable)]
     ====================================================================== */
  const THREAD = [
    ['N', 'Day 1 · 11:48 PM', 'I know what you\'ve been carrying since 2019. I can make it lighter.', 'I know what ▒▒▒ been carrying ▒▒▒▒▒ ▒▒▒▒. I can make it lighter.', 'Day ▒ · 11:48 PM'],
    ['V', 'Day 1 · 11:51 PM', 'Who is this?', null, 'Day ▒ · ▒▒:51 PM'],
    ['N', 'Day 2 · 9:02 AM', 'Someone who can keep you out of a cell. Larkspur, Cyprus, Meridian. You don\'t have to answer tonight.', 'Someone who can keep you ▒▒▒ ▒▒ ▒ ▒▒▒▒. ▒▒▒▒▒▒▒▒, Cyprus, ▒▒▒▒▒▒▒▒. You don\'t have to answer tonight.', 'Day ▒ · 9:02 AM'],
    ['V', 'Day 2 · 9:40 AM', 'Leave me alone.', null, null],
    ['N', 'Day 9 · 10:15 PM', 'The buyer will not protect you. I will. Think about it.', 'The ▒▒▒▒▒ will not protect you. I will. Think about it.', 'Day ▒ · 1▒:15 PM'],
    ['V', 'Day 12 · 1:30 AM', 'What would I have to do?', null, '▒▒▒ ▒▒ · 1:30 AM'],
    ['N', 'Day 12 · 7:05 AM', 'Tell the truth about the buyer, on the record. Bring the ledger and I\'ll keep you out of it.', 'Tell ▒▒▒ ▒▒▒▒▒ about ▒▒▒ ▒▒▒▒▒, ▒▒ ▒▒▒ ▒▒▒▒▒▒. Bring the ▒▒▒▒▒▒ and I\'ll keep you ▒▒▒ ▒▒ ▒▒.', 'Day 1▒ · 7:05 AM'],
    ['V', 'Day 12 · 7:20 AM', 'I can\'t be seen with you.', null, null],
    ['N', 'Day 30 · 6:44 PM', 'You won\'t be. Nobody on my team knows. Nobody at the gala will either.', 'You won\'t be. Nobody ▒▒ ▒▒ ▒▒▒▒ knows. Nobody at the gala will either.', 'Day ▒▒ · 6:44 PM'],
    ['V', 'Day 30 · 11:12 PM', 'Remy can\'t know. Nobody can.', null, 'Day ▒▒ · 11:12 PM'],
    ['N', 'Day 52 · 8:30 PM', 'Then we meet where nobody looks. The night of your gala.', null, null],
    ['V', 'Day 52 · 9:58 PM', 'After my toast. Come alone.', null, 'Day 5▒ · ▒:58 PM'],
    ['N', 'Day 52 · 10:03 PM', 'I\'ll be there. Delete this thread.', null, '▒▒▒ ▒▒ · 10:03 PM'],
    ['N', 'Day 52 · 10:04 PM', 'Protocol says I delete my side too. Done.', '▒▒▒▒▒▒▒▒ says I delete my side too. Done.', 'Day ▒▒ · 10:04 PM']
  ];
  function messages(me, ctx) {
    const el = h('div', 'mg mg-msg');
    let pick = null;
    el.innerHTML = `<div class="mgm-desk"><div class="mgm-phone"><div class="mgm-screen"><div class="mgm-bar"><span>9:41</span><i class="mgm-notch"></i><span class="mgm-sig"><i></i><i></i><i></i><b></b></span></div>
      <div class="mgm-start" data-m="start"><div class="mgm-tag">EVIDENCE · VA-PHONE-01</div><div class="mgm-lock"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg></div><b>Victor Ashgrove's phone</b><p>A forensic extraction can recover his deleted messages. It uses one of the team's lookups.</p><button class="btn primary" data-m="go">Run the extraction</button></div>
      <div class="mgm-board" data-m="board" hidden><div class="mgm-head"><span class="mgm-av">?</span><div><b>+1 (•••) •••-0417</b><small>Recovered · deleted thread</small></div><span class="mgm-pairs" data-m="pairs"></span></div><div class="mgm-list" data-m="list"></div>
      <p class="mgm-help" data-m="help"></p></div></div></div>
      <aside class="mgm-side"><small>Forensic extraction</small><b data-m="sideh">Not run yet</b><p data-m="side">Victor's phone was bagged as evidence at the scene.</p></aside></div>`;
    const q = k => el.querySelector(`[data-m="${k}"]`);
    function draw() {
      const s = DB.get(), m = M(s, 'messages');
      q('start').hidden = !!m.started; q('board').hidden = !m.started;
      if (!m.started) { const left = FBI.leftN(s); q('go').textContent = left ? `Run the extraction · ${left} lookup${left === 1 ? '' : 's'} left` : 'The team is out of lookups'; q('go').disabled = !left; return; }
      const o = m.order || THREAD.map((_, i) => i);
      let pairs = 0; for (let i = 0; i < o.length - 1; i++) if (o[i + 1] === o[i] + 1) pairs++;
      const done = pairs === THREAD.length - 1;
      q('pairs').textContent = `${pairs} / ${THREAD.length - 1}`;
      q('help').textContent = done ? 'Every word is back.' : pick != null ? 'Now tap the message it should sit in place of. Tap it again to put it down.' : 'Tap a message to pick it up.';
      q('sideh').textContent = done ? 'Thread restored' : `${pairs} of ${THREAD.length - 1} in order`;
      q('side').textContent = done ? 'All 14 messages, in order, with the damaged words recovered.' : `Recovered by ${(G.byId(m.started.by) || { name: 'the team' }).name.split(' ')[0]} at ${wallTime(m.started.at)}. Fourteen messages, out of order. Most timestamps are damaged.`;
      /* FLIP: remember where each bubble was, so a move (yours or a teammate's) slides */
      const before = {}; q('list').querySelectorAll('[data-k]').forEach(b => { before[b.dataset.k] = b.getBoundingClientRect().top; });
      const changed = patch(q('list'), o.map((k, i) => { const [w, ts, full, broken, bts] = THREAD[k]; return `<button class="mgm-b ${w === 'V' ? 'me' : ''} ${pick === i ? 'pick' : ''}" data-slot="${i}" data-k="${k}"><small>${esc(done || !bts ? ts : bts)}</small>${esc(done || !broken ? full : broken)}</button>`; }).join(''));
      if (changed !== false) q('list').querySelectorAll('[data-k]').forEach(b => { const was = before[b.dataset.k]; if (was == null) return; const dy = was - b.getBoundingClientRect().top; if (Math.abs(dy) < 2) return; b.style.transition = 'none'; b.style.transform = `translateY(${dy}px)`; requestAnimationFrame(() => { b.style.transition = ''; b.style.transform = ''; }); });
      el.classList.toggle('done', done);
      if (done && !m.solved) solve('messages', me);
    }
    el.addEventListener('click', e => {
      const s = DB.get(), m = M(s, 'messages');
      if (e.target.closest('[data-m="go"]')) {
        if (m.started || !FBI.leftN(s)) return;
        if (!Ask.sure(`Run a forensic extraction on Victor's phone? It uses 1 of the team's ${FBI.leftN(s)} remaining lookups.`, () => el.querySelector('[data-m="go"]').click(), { title: 'Forensic extraction', ok: 'Run it' })) return;
        const r = Art.rng(52), o = shuffle(THREAD.map((_, i) => i), r);
        const u = { 'mg/messages/started': { by: me.id, at: now() }, 'mg/messages/order': o, ['fbi/lookups/' + uid('q')]: { by: me.id, q: 'Forensic extraction: Victor Ashgrove\'s phone', rec: null, kind: 'extract', at: now() } };
        Clock.log(u, 'game', `${me.name} ran a forensic extraction on Victor's phone (1 lookup).`); DB.update(u); return draw();
      }
      const b = e.target.closest('[data-slot]'); if (!b || m.solved) return;
      const i = Number(b.dataset.slot);
      if (pick == null) { pick = i; return draw(); }
      if (pick === i) { pick = null; return draw(); }
      /* move the picked message to this spot; the rest shift */
      const o = (m.order || THREAD.map((_, k) => k)).slice(), [x] = o.splice(pick, 1); o.splice(i, 0, x); pick = null;
      DB.update({ 'mg/messages/order': o }); draw();
    });
    return {
      el, sync: draw,
      prog: s => { const m = M(s, 'messages'); if (!m.started) return null; const o = m.order || []; let p = 0; for (let i = 0; i < o.length - 1; i++) if (o[i + 1] === o[i] + 1) p++; return [p, THREAD.length - 1, p + ' of ' + (THREAD.length - 1) + ' pairs']; }
    };
  }

  /* ======================================================================
     5. THE TORN PHOTOGRAPH (guests, staff, crew). Sixteen torn pieces, some upside down.
        Your own progress stays on your phone. mg/photo: solved (the first one to finish)
     ====================================================================== */
  const PN = 4, PW = 100, PHH = 75;
  let PHOTO_JPG = null; const photoWait = [];
  function photoRaster(cb) {
    if (PHOTO_JPG) return cb(PHOTO_JPG);
    photoWait.push(cb); if (photoWait.length > 1) return;
    const img = new Image();
    img.onload = () => { let u = null; try { const c = document.createElement('canvas'); c.width = 800; c.height = 600; c.getContext('2d').drawImage(img, 0, 0, 800, 600); u = c.toDataURL('image/jpeg', .86); } catch (e) { } PHOTO_JPG = u || img.src; photoWait.splice(0).forEach(f => f(PHOTO_JPG)); };
    img.onerror = () => { PHOTO_JPG = img.src; photoWait.splice(0).forEach(f => f(PHOTO_JPG)); };
    img.src = Art.uri(Art.photo());
  }
  /* the tears: every inside edge is a jagged line shared by the two pieces either side of it */
  const TEAR = (() => {
    const r = Art.rng(1213), seg = () => { const a = [0]; for (let i = 1; i < 9; i++) a.push((r() - .5) * 10); a.push(0); return a; };
    const H = [], V = [];
    for (let row = 1; row < PN; row++) { H[row] = []; for (let c = 0; c < PN; c++) H[row][c] = seg(); }
    for (let col = 1; col < PN; col++) { V[col] = []; for (let rr = 0; rr < PN; rr++) V[col][rr] = seg(); }
    return { H, V };
  })();
  function piecePoly(t) {
    const R = Math.floor(t / PN), C = t % PN, x0 = C * PW, x1 = x0 + PW, y0 = R * PHH, y1 = y0 + PHH;
    const hp = (row, c, rev) => { const o = TEAR.H[row][c], n = o.length - 1, a = []; for (let i = 0; i <= n; i++) a.push([c * PW + PW * i / n, row * PHH + o[i]]); return rev ? a.reverse() : a; };
    const vp = (col, rr, rev) => { const o = TEAR.V[col][rr], n = o.length - 1, a = []; for (let i = 0; i <= n; i++) a.push([col * PW + o[i], rr * PHH + PHH * i / n]); return rev ? a.reverse() : a; };
    const pts = [].concat(R === 0 ? [[x0, y0], [x1, y0]] : hp(R, C), C === PN - 1 ? [[x1, y0], [x1, y1]] : vp(C + 1, R), R === PN - 1 ? [[x1, y1], [x0, y1]] : hp(R + 1, C, true), C === 0 ? [[x0, y1], [x0, y0]] : vp(C, R, true));
    return pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  }
  function photo(me, ctx) {
    const el = h('div', 'mg mg-ph'), KEY = 'vh:mg:photo2:' + me.id, N = PN * PN, pid = 'mgph' + me.id.replace(/\W/g, '');
    let st; try { st = JSON.parse(localStorage.getItem(KEY)); } catch (e) { st = null; }
    if (!st || !st.p || st.p.length !== N) {
      const r = Art.rng(4000 + me.id.length * 31 + me.id.charCodeAt(0)); let p;
      do { p = shuffle([...Array(N).keys()], r); } while (p.filter((t, i) => t === i).length > 1);
      st = { p, rot: p.map(() => r() < .45 ? 2 : 0), moves: 0, done: false };
    }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } };
    let sel = null, drag = null, src = null, last = '';
    el.innerHTML = `<div class="mgp-table"><div class="mgp-frame"><svg class="mgp-board" viewBox="-10 -10 420 320" data-p="board"><defs>${[...Array(N).keys()].map(t => `<clipPath id="${pid}-${t}"><polygon points="${piecePoly(t)}"/></clipPath>`).join('')}<filter id="${pid}-sh" x="-15%" y="-15%" width="130%" height="130%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.8" flood-color="#1a0d04" flood-opacity=".6"/></filter></defs>
        <rect x="0" y="0" width="400" height="300" class="mgp-slots"/>${[1, 2, 3].map(i => `<line x1="${i * PW}" y1="0" x2="${i * PW}" y2="300" class="mgp-gl"/><line x1="0" y1="${i * PHH}" x2="400" y2="${i * PHH}" class="mgp-gl"/>`).join('')}
        <g data-p="pcs"><text x="200" y="155" text-anchor="middle" class="mgp-wait">Developing…</text></g></svg></div>
        <div class="mgp-back" data-p="back"><small>On the back, in pencil:</small><b>"Victor Ashgrove and J. E— at the Harbor gallery, December 2000."</b></div></div>
      <div class="mgp-bar"><span data-p="help"></span><button class="mg-link" data-p="flip" hidden>Turn it over</button></div>`;
    const q = k => el.querySelector(`[data-p="${k}"]`), board = q('board');
    function render() {
      if (!src) return;
      const order = [...Array(N).keys()].filter(i => i !== sel).concat(sel != null ? [sel] : []);
      q('pcs').innerHTML = order.map(i => {
        const t = st.p[i], dx = (i % PN - t % PN) * PW, dy = (Math.floor(i / PN) - Math.floor(t / PN)) * PHH, cx = (t % PN + .5) * PW, cy = (Math.floor(t / PN) + .5) * PHH;
        return `<g class="pc ${sel === i ? 'sel' : ''}" data-tile="${i}" transform="translate(${dx} ${dy}) rotate(${st.rot[i] * 90} ${cx} ${cy})"><g filter="url(#${pid}-sh)"><image href="${src}" width="400" height="300" preserveAspectRatio="none" clip-path="url(#${pid}-${t})"/></g><polygon points="${piecePoly(t)}" class="pe"/></g>`;
      }).join('');
    }
    function draw() {
      const solved = st.p.every((t, i) => t === i) && st.rot.every(x => x % 4 === 0);
      if (solved && !st.done) {
        st.done = true; st.flip = false; save(); ctx.good();
        setTimeout(() => { st.flip = true; save(); draw(); }, 1100);
        if (!M(DB.get(), 'photo').solved) photoRaster(jpg => {
          const u = {}; Bebbit.post(u, { by: me.id, real: me.id, text: 'Put the torn photo back together. On the back, in pencil: "Victor Ashgrove and J. E— at the Harbor gallery, December 2000."', photo: jpg && jpg.startsWith('data:image/jpeg') ? jpg : null });
          solve('photo', me, u);
        });
      }
      el.classList.toggle('done', st.done); el.classList.toggle('flip', !!st.flip);
      q('help').textContent = st.done ? 'Every piece fits.' : last || (sel != null ? 'Tap it again to turn it over, or tap another piece to swap.' : 'Drag a piece onto another to swap them. Tap a piece twice to turn it.');
      q('flip').hidden = !st.done; q('flip').textContent = st.flip ? 'Turn it back' : 'Turn it over';
      if (!drag) render();
    }
    photoRaster(u => { src = u; draw(); });
    const swap = (a, b) => { [st.p[a], st.p[b]] = [st.p[b], st.p[a]]; [st.rot[a], st.rot[b]] = [st.rot[b], st.rot[a]]; st.moves = (st.moves || 0) + 1; };
    const toSvg = e => { const pt = board.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(board.getScreenCTM().inverse()); };
    board.addEventListener('pointerdown', e => {
      const g = e.target.closest('[data-tile]'); if (!g || st.done) return;
      const p = toSvg(e); drag = { i: Number(g.dataset.tile), g, x: p.x, y: p.y, base: g.getAttribute('transform'), moved: false };
      try { board.setPointerCapture(e.pointerId); } catch (er) { } e.preventDefault();
    });
    board.addEventListener('pointermove', e => {
      if (!drag) return; const p = toSvg(e), dx = p.x - drag.x, dy = p.y - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      if (!drag.moved) { drag.moved = true; drag.g.classList.add('drag'); drag.g.parentNode.appendChild(drag.g); }
      drag.g.setAttribute('transform', `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) ` + drag.base);
    });
    const end = e => {
      if (!drag) return; const dd = drag; drag = null;
      if (dd.moved) {
        const p = toSvg(e), c = Math.floor(p.x / PW), rr = Math.floor(p.y / PHH), j = c >= 0 && c < PN && rr >= 0 && rr < PN ? rr * PN + c : -1;
        if (j >= 0 && j !== dd.i) { swap(dd.i, j); vib(10); }
        sel = null; last = '';
      } else if (sel === dd.i) { st.rot[dd.i] = (st.rot[dd.i] + 2) % 4; st.moves = (st.moves || 0) + 1; sel = null; }
      else if (sel == null) sel = dd.i;
      else { swap(sel, dd.i); sel = null; vib(10); }
      save(); draw();
    };
    board.addEventListener('pointerup', end);
    board.addEventListener('pointercancel', () => { drag = null; draw(); });
    q('flip').addEventListener('click', () => { st.flip = !st.flip; save(); draw(); });
    return { el, sync: draw, prog: () => [0, 0, (st.moves || 0) + ' moves'] };
  }

  /* ======================================================================
     6. IS IT REAL? (Ari and the guests). Seven differences between the catalogue and the wall.
        Your own progress stays on your phone. mg/differences: solved (the first)
     ====================================================================== */
  function differences(me, ctx) {
    const el = h('div', 'mg mg-df'), KEY = 'vh:mg:diff2:' + me.id, D = Art.DIFFS, N = D.length;
    let found; try { found = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { found = []; }
    let streak = 0, coolUntil = 0, last = '', press = null;
    const src = { o: Art.uri(Art.harbor(false)), c: Art.uri(Art.harbor(true)) };
    el.innerHTML = `<div class="mgf-wall"><div class="mgf-pair">${[['o', 'Museum catalogue · 2019'], ['c', 'On the wall · tonight']].map(([k, cap]) => `<figure><div class="mgf-img" data-f="${k}"><img alt="" src="${src[k]}" draggable="false"><svg viewBox="0 0 480 340" data-f="m${k}"></svg></div><figcaption>${cap}</figcaption></figure>`).join('')}</div></div>
      <div class="mgf-bar"><div class="mgf-pips" data-f="pips"></div><span data-f="msg" role="status"></span></div><ol class="mgf-list" data-f="list"></ol>`;
    const q = k => el.querySelector(`[data-f="${k}"]`);
    const marks = () => found.map(i => { const dd = D[i]; return `<circle cx="${dd.x}" cy="${dd.y}" r="${dd.r}" class="mgf-ring"/>`; }).join('');
    function draw() {
      patch(q('mo'), marks()); patch(q('mc'), marks());
      patch(q('pips'), D.map((_, i) => `<i class="${i < found.length ? 'on' : ''}"></i>`).join('') + `<b>${found.length} of ${N}</b>`);
      patch(q('list'), found.map(i => `<li>${esc(D[i].what)}</li>`).join(''));
      const done = found.length === N; el.classList.toggle('done', done);
      const cool = coolUntil > now(); el.classList.toggle('cool', cool);
      q('msg').textContent = done ? 'All seven. The painting on the wall is a copy, and someone signed it.' : cool ? `Too many guesses. Rest your eyes: ${Math.ceil((coolUntil - now()) / 1000)} s.` : last;
    }
    function tapAt(k, e) {
      if (found.length === N || coolUntil > now()) return;
      const b = q(k).querySelector('img').getBoundingClientRect(), x = (e.clientX - b.left) / b.width * 480, y = (e.clientY - b.top) / b.height * 340;
      if (x < 0 || y < 0 || x > 480 || y > 340) return;
      const i = D.findIndex((dd, j) => !found.includes(j) && Math.hypot(dd.x - x, dd.y - y) <= dd.r + 4);
      if (i >= 0) {
        found.push(i); streak = 0; last = 'Found one.'; vib(20); ctx.good(); try { localStorage.setItem(KEY, JSON.stringify(found)); } catch (er) { }
        if (found.length === N && !M(DB.get(), 'differences').solved) { const u = {}; Clock.log(u, 'game', `${me.name} proved "Harbor at Dusk" on the wall is a copy (Indigo's mark under the frame).`); solve('differences', me, u); }
      } else {
        streak++; last = 'Nothing different there.'; ctx.miss();
        const svg = q('m' + k), mk = document.createElementNS('http://www.w3.org/2000/svg', 'g'); mk.setAttribute('class', 'mgf-x'); mk.innerHTML = `<path d="M${x - 7} ${y - 7}l14 14M${x + 7} ${y - 7}l-14 14"/>`; svg.appendChild(mk); setTimeout(() => mk.remove(), 700);
        if (streak >= 4) { coolUntil = now() + 10000; streak = 0; }
      }
      draw();
    }
    /* a tap is a tap (a drag or scroll isn't) */
    ['o', 'c'].forEach(k => {
      const box = q(k);
      box.addEventListener('pointerdown', e => { press = { k, x: e.clientX, y: e.clientY }; });
      box.addEventListener('pointerup', e => { const p = press; press = null; if (p && p.k === k && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 10) tapAt(k, e); });
      box.addEventListener('pointercancel', () => { press = null; });
    });
    return { el, sync: draw, tick: () => { if (coolUntil) draw(); }, prog: () => [found.length, N, found.length + ' of ' + N] };
  }

  /* ======================================================================
     7. VICTOR'S COLLECTION LEDGER (Sterling and Penn). Three entries hide money.
        Shared: mg/ledger: flags { row: true }, audits (wrong ones), lockUntil
        [date, entry, amount as written, money hidden inside it, the note shown once found]
     ====================================================================== */
  const LEDGER_SRC = [
    ['1st', 'Opening balance', null, 0, null, 412300],
    ['2nd', 'Club dues, Harbor Club', -4200],
    ['3rd', 'Harbor & Crane: insurance premium', -38600],
    ['4th', 'Gallery lighting, installation', -2800, 12500, 'Payee: Vale Fine Art Advisory. Reference "P.V. 1 of 3."'],
    ['6th', 'Rent, Elm Street storage', -9000],
    ['7th', 'Wine cellar, restock', -6450],
    ['9th', 'Kincaid Holdings: consulting', 40000],
    ['11th', 'Frame conservation', -4600, 20000, 'Payee: Vale Fine Art Advisory. Reference "P.V. 2 of 3."'],
    ['12th', 'Catalogue printing', -7320],
    ['14th', 'Florist, gala deposit', -3850],
    ['15th', 'Dividend, Grant Energy', 12640],
    ['21st', 'Car lease', -2400],
    ['24th', 'Private security, gala night', -8200],
    ['26th', 'Household payroll', -11700],
    ['27th', 'Pledge, Saint-Clair Foundation', -25000],
    ['28th', 'Courier, fine art', -1950, 17500, 'Payee: Vale Fine Art Advisory. Reference "P.V. 3 of 3." Paid the 28th, the day the appraisal was issued.'],
    ['29th', 'Refund, Harbor Club overcharge', 420],
    ['30th', 'Closing balance', null]
  ];
  const LEDGER = (() => { let bal = 0; return LEDGER_SRC.map((r, i) => { if (i === 0) bal = r[5]; else if (r[2] != null) bal += r[2] - (r[3] || 0); return { date: r[0], what: r[1], amt: r[2], hide: r[3] || 0, note: r[4] || '', bal, fixed: r[2] == null }; }); })();
  function ledger(me, ctx) {
    const el = h('div', 'mg mg-lg');
    let last = '', tape = [], sign = 1;
    el.innerHTML = `<div class="mgl-desk"><div class="mgl-book"><div class="mgl-head"><div><b>Ashgrove Collection</b><span>Expense ledger · last month · prepared for V. J. Ashgrove</span></div><span class="mgl-stamp" data-l="stamp">AUDITED</span></div><div class="mgl-table" data-l="t"></div></div>
      <aside class="mgl-tape"><div class="mgl-mach"><b>Adding machine</b><div class="mgl-ops"><button data-l="op" data-s="1" class="on" aria-label="Add">+</button><button data-l="op" data-s="-1" aria-label="Subtract">−</button><button data-l="clr">C</button></div></div><div class="mgl-roll" data-l="roll"></div><div class="mgl-tot"><small>Total</small><b data-l="tot">0</b></div><small class="mgl-tip">Tap any amount or balance in the ledger to send it here.</small></aside></div>
      <div class="mgl-bar"><span data-l="fl"></span><button class="btn primary" data-l="sub">Submit the audit</button></div>
      <p class="mgl-msg" data-l="msg" role="status"></p><div class="mgl-out" data-l="out" hidden></div>`;
    const q = k => el.querySelector(`[data-l="${k}"]`);
    function draw() {
      const s = DB.get(), m = M(s, 'ledger'), flags = m.flags || {}, nf = Object.keys(flags).length, solved = !!m.solved, locked = (m.lockUntil || 0) > now();
      patch(q('t'), `<div class="mgl-r mgl-h"><span></span><span>Date</span><span>Entry</span><span>Amount</span><span>Balance</span></div>` + LEDGER.map((r, i) => `<div class="mgl-r ${flags[i] ? 'flag' : ''} ${solved && r.hide ? 'hit' : ''} ${r.fixed ? 'fx' : ''}" data-row="${i}">
        <span>${r.fixed ? '' : `<button class="mgl-f" data-flag="${i}" aria-pressed="${!!flags[i]}" aria-label="Flag ${esc(r.what)}" ${solved || locked ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M6 21V4M6 4h11l-2 4 2 4H6"/></svg></button>`}</span>
        <span>${r.date}</span><span>${esc(r.what)}${solved && r.hide ? `<em>${esc(r.note)} Hidden: ${usd(r.hide)}.</em>` : ''}</span>
        <span>${r.amt == null ? '' : `<button class="mgl-n" data-amt="${r.amt}">${usd(r.amt)}</button>`}</span><span><button class="mgl-n" data-amt="${r.bal}">${usd(r.bal)}</button></span></div>`).join(''));
      q('fl').innerHTML = solved ? 'Audit accepted.' : `<b>${nf}</b> of 3 flagged${m.audits ? ` · ${m.audits} audit${m.audits > 1 ? 's' : ''} rejected` : ''}`;
      q('sub').disabled = solved || locked || nf !== 3; q('sub').textContent = locked ? `Locked · ${fmt((m.lockUntil - now()) / 1000)}` : 'Submit the audit';
      q('stamp').classList.toggle('on', solved);
      q('msg').textContent = solved ? '' : locked ? (last || 'The ledger is locked while the last audit is reviewed.') : last;
      q('out').hidden = !solved;
      patch(q('out'), '<b>Three payments to Vale Fine Art Advisory: $50,000 in all.</b><p>Each one was hidden inside an ordinary bill (lighting, framing, a courier), so the entry looked small while the balance dropped by much more. The last went out the day Peregrine Vale\'s appraisal was issued.</p>');
      el.classList.toggle('done', solved);
      patch(q('roll'), tape.length ? tape.map(v => `<div class="${v < 0 ? 'neg' : ''}"><span>${v < 0 ? '−' : '+'}</span>${Math.abs(v).toLocaleString('en-US')}</div>`).join('') : '<div class="mute">Empty</div>');
      const tot = tape.reduce((a, b) => a + b, 0); q('tot').textContent = (tot < 0 ? '−' : '') + Math.abs(tot).toLocaleString('en-US');
      const roll = q('roll'); roll.scrollTop = roll.scrollHeight;
    }
    el.addEventListener('click', e => {
      const s = DB.get(), m = M(s, 'ledger');
      const op = e.target.closest('[data-l="op"]'); if (op) { sign = Number(op.dataset.s); el.querySelectorAll('[data-l="op"]').forEach(b => b.classList.toggle('on', b === op)); return; }
      if (e.target.closest('[data-l="clr"]')) { tape = []; return draw(); }
      const n = e.target.closest('[data-amt]'); if (n) { tape.push(sign * Number(n.dataset.amt)); tape = tape.slice(-14); n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); return draw(); }
      if (m.solved) return;
      const f = e.target.closest('[data-flag]');
      if (f) {
        if ((m.lockUntil || 0) > now()) return;
        const i = Number(f.dataset.flag), on = !(m.flags || {})[i];
        if (on && Object.keys(m.flags || {}).length >= 3) { last = 'An audit names exactly three entries. Unflag one first.'; return draw(); }
        last = ''; DB.update({ ['mg/ledger/flags/' + i]: on ? true : null }); return draw();
      }
      if (e.target.closest('[data-l="sub"]')) {
        const flags = Object.keys(m.flags || {}).map(Number); if (flags.length !== 3 || (m.lockUntil || 0) > now()) return;
        const right = flags.filter(i => LEDGER[i].hide).length;
        if (right === 3) { const u = {}; Clock.log(u, 'game', `${me.name} found $50,000 to Vale Fine Art Advisory hidden in Victor's ledger.`); solve('ledger', me, u); ctx.good(); }
        else { const u = { 'mg/ledger/audits': (m.audits || 0) + 1, 'mg/ledger/lockUntil': now() + 60000 }; Clock.log(u, 'game', `${me.name}'s audit of Victor's ledger was rejected (${right} of 3 right).`); DB.update(u); ctx.miss(); last = `Audit rejected: ${right} of the 3 flagged entries ${right === 1 ? 'is' : 'are'} right. Locked for a minute.`; }
        return draw();
      }
    });
    return { el, sync: draw, tick: () => { if ((M(DB.get(), 'ledger').lockUntil || 0) > now() - 1500) draw(); }, prog: s => { const m = M(s, 'ledger'), n = m.solved ? 3 : Object.keys(m.flags || {}).length; return [n, 3, n + ' of 3 flagged']; } };
  }

  /* ======================================================================
     8. THE DOOR LOG (Lane and Bo). Badge numbers, a register, and one swipe that matters.
        Shared: mg/doorlog: tries, lockUntil
     ====================================================================== */
  const DOORS = ['Main entrance', 'East hall', 'Vault stairwell', 'Loading dock', 'Kitchen', 'Archive', 'Control room'];
  const TEMPNOTE = 'Issued 7:12–7:14 PM at the main entrance. Signed for as a batch of five by D. Ward. Individual holders not recorded.';
  const BADGES = {
    'B-1102': ['Lane Garrity', 'Head of security', 'All doors'], 'B-1131': ['Charlie Pruitt', 'Night guard', 'All doors'], 'B-1134': ['Bo Tate', 'Night guard', 'All doors'],
    'B-2207': ['Harper Quill', 'Event manager', 'Main entrance, East hall, Kitchen, Loading dock'], 'B-2215': ['Jamie Ruiz', 'Head bartender', 'Main entrance, Kitchen'],
    'B-3301': ['Emerson Albright', 'Museum director', 'Main entrance, East hall, Archive, Control room'], 'B-3318': ['Dr. Ari Castellane', 'Chief curator', 'East hall, Archive, Vault stairwell'],
    'V-0412': ['Sloane Archer', 'Art handler · vendor', 'Loading dock, East hall'], 'V-0420': ['Casey Brandt', 'Catering driver · vendor', 'Loading dock, Kitchen'],
    'C-11': ['Agency staff', 'Bellwood Catering · temporary', 'Kitchen, Main entrance'], 'C-12': ['Agency staff', 'Bellwood Catering · temporary', 'Kitchen, Main entrance'], 'C-13': ['Agency staff', 'Bellwood Catering · temporary', 'Kitchen, Main entrance'], 'C-14': ['Agency staff', 'Bellwood Catering · temporary', 'Kitchen, Main entrance'],
    'T-01': ['FBI detail', 'Temporary badge', 'Main entrance, East hall, Archive, Vault stairwell', TEMPNOTE], 'T-02': ['FBI detail', 'Temporary badge', 'Main entrance, East hall, Archive, Vault stairwell', TEMPNOTE], 'T-03': ['FBI detail', 'Temporary badge', 'Main entrance, East hall, Archive, Vault stairwell', TEMPNOTE], 'T-04': ['FBI detail', 'Temporary badge', 'Main entrance, East hall, Archive, Vault stairwell', TEMPNOTE], 'T-05': ['FBI detail', 'Temporary badge', 'Main entrance, East hall, Archive, Vault stairwell', TEMPNOTE]
  };
  /* [time, badge, door, denied?] */
  const SWIPES = [
    ['6:41', 'B-1102', 'Control room'], ['6:44', 'B-1134', 'Main entrance'], ['6:48', 'B-1131', 'East hall'], ['6:50', 'C-11', 'Kitchen'], ['6:50', 'C-12', 'Kitchen'], ['6:51', 'C-13', 'Kitchen'], ['6:51', 'C-14', 'Kitchen'],
    ['6:52', 'B-2207', 'Kitchen'], ['6:55', 'B-2215', 'Kitchen'], ['6:58', 'V-0420', 'Loading dock'], ['7:00', 'B-1134', 'Main entrance'], ['7:03', 'B-3318', 'Archive'], ['7:05', 'B-1131', 'Vault stairwell'], ['7:09', 'V-0412', 'Loading dock'],
    ['7:12', 'T-01', 'Main entrance'], ['7:12', 'T-02', 'Main entrance'], ['7:13', 'T-03', 'Main entrance'], ['7:13', 'T-04', 'Main entrance'], ['7:14', 'T-05', 'Main entrance'],
    ['7:18', 'B-1102', 'East hall'], ['7:20', 'C-13', 'Main entrance'], ['7:22', 'B-1131', 'East hall'], ['7:24', 'B-1131', 'Vault stairwell'], ['7:27', 'B-2207', 'Loading dock'], ['7:29', 'C-11', 'Main entrance'], ['7:31', 'B-2215', 'Kitchen'],
    ['7:35', 'B-3301', 'Control room'], ['7:36', 'C-12', 'East hall', 1], ['7:38', 'V-0420', 'Loading dock'], ['7:41', 'B-1131', 'Vault stairwell'], ['7:43', 'T-05', 'Archive'], ['7:43', 'C-12', 'Vault stairwell', 1], ['7:44', 'T-03', 'Vault stairwell'],
    ['7:47', 'B-1134', 'East hall'], ['7:49', 'B-1102', 'Control room'], ['7:52', 'B-2207', 'Main entrance'], ['7:56', 'V-0412', 'Loading dock'], ['7:58', 'C-14', 'Kitchen'], ['8:00', 'B-1134', 'East hall'],
    ['8:01', 'B-1134', 'Vault stairwell'], ['8:03', 'C-11', 'Kitchen'], ['8:04', 'B-1102', 'Vault stairwell'], ['8:06', 'T-01', 'Vault stairwell'], ['8:06', 'T-04', 'Vault stairwell'], ['8:09', 'B-3318', 'Vault stairwell']
  ];
  const ANSWER = SWIPES.findIndex(x => x[0] === '7:44' && x[1] === 'T-03');
  const tmin = t => { const [a, b] = t.split(':').map(Number); return (a < 12 ? a + 12 : a) * 60 + b; };
  const TIMES = (() => { const a = []; for (let m = 18 * 60 + 40; m <= 20 * 60 + 10; m += 5) a.push(`${Math.floor(m / 60) - 12}:${String(m % 60).padStart(2, '0')}`); return a; })();
  function doorlog(me, ctx) {
    const el = h('div', 'mg mg-dl');
    let door = '', from = '6:40', to = '8:10', find = '', pickI = null, last = '';
    el.innerHTML = `<div class="mgdl-q"><span class="mgdl-led"></span><div><b>Charlie's last radio call came from the vault stairwell at 7:46.</b><span>Someone else's badge opened that door after Charlie went in. Find the swipe and flag it.</span></div></div>
      <div class="mgdl-cols"><div class="mgdl-main">
        <div class="mgdl-f"><div class="mgdl-chips" data-o="chips"></div>
          <div class="mgdl-row2"><label><small>From</small><select class="field" data-o="from">${TIMES.map(t => `<option ${t === from ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label><small>To</small><select class="field" data-o="to">${TIMES.map(t => `<option ${t === to ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="grow"><small>Badge</small><input class="field" data-o="find" placeholder="e.g. B-1131" autocomplete="off" spellcheck="false"></label></div></div>
        <div class="mgdl-list" data-o="list"></div><small class="mgdl-count" data-o="count"></small></div>
        <aside class="mgdl-side"><div class="mgdl-card" data-o="card"></div><div class="mgdl-sys" data-o="sys"></div></aside></div>
      <p class="mgdl-msg" data-o="msg" role="status"></p>`;
    const q = k => el.querySelector(`[data-o="${k}"]`);
    function draw() {
      const s = DB.get(), m = M(s, 'doorlog'), cam = M(s, 'camera'), locked = (m.lockUntil || 0) > now(), solved = !!m.solved;
      patch(q('chips'), ['', ...DOORS].map(dd => `<button class="${door === dd ? 'on' : ''}" data-door="${dd}">${dd || 'All doors'}</button>`).join(''));
      const f = find.trim().toUpperCase();
      const rows = SWIPES.map((x, i) => [x, i]).filter(([x]) => (!door || x[2] === door) && tmin(x[0]) >= tmin(from) && tmin(x[0]) <= tmin(to) && (!f || x[1].includes(f)));
      const p = pickI != null ? SWIPES[pickI] : null, bd = p ? BADGES[p[1]] : null;
      const card = p ? `<small>Register lookup</small><div class="mgdl-id"><b>${p[1]}</b><span>${esc(bd[0])}</span></div><dl><dt>Role</dt><dd>${esc(bd[1])}</dd><dt>Access</dt><dd>${esc(bd[2])}</dd>${bd[3] ? `<dt>Note</dt><dd>${esc(bd[3])}</dd>` : ''}<dt>This swipe</dt><dd>${p[0]} PM · ${p[2]} · ${p[3] ? 'denied' : 'granted'}</dd></dl>
        <button class="btn primary" data-o="flag" ${solved || locked ? 'disabled' : ''}>${locked ? 'Console locked · ' + fmt((m.lockUntil - now()) / 1000) : 'Flag this swipe'}</button>${last && !solved ? `<p class="mgdl-fb">${esc(last)}</p>` : ''}` : '<small>Register lookup</small><p class="mute">Tap a swipe in the log to look its badge up.</p>';
      /* on a phone the lookup opens right under the swipe you tapped */
      const narrow = innerWidth < 820;
      patch(q('list'), `<div class="mgdl-h"><span>Time</span><span>Badge</span><span>Door</span><span>Result</span></div>` + (rows.length ? rows.map(([x, i]) => `<button class="mgdl-r ${pickI === i ? 'on' : ''} ${x[3] ? 'den' : ''} ${solved && i === ANSWER ? 'ans' : ''}" data-sw="${i}"><span>${x[0]} PM</span><b>${x[1]}</b><span>${x[2]}</span><span class="res">${x[3] ? 'DENIED' : 'GRANTED'}</span></button>${narrow && pickI === i ? `<div class="mgdl-card mgdl-inl">${card}</div>` : ''}`).join('') : '<div class="mute">No swipes match.</div>'));
      q('count').textContent = `${rows.length} of ${SWIPES.length} swipes`;
      patch(q('card'), narrow ? '' : card); q('card').hidden = narrow;
      patch(q('sys'), `<small>System events</small><div><span>7:46 PM</span>Radio: <b>last call, C. Pruitt</b> (vault stairwell)</div><div><span>7:50 PM</span>${cam.solved ? 'Cameras: <b>feed fault, all floors</b> (cleared 8:00 PM)' : 'Cameras: all feeds normal'}</div><div><span>7:50 PM</span>Winter Star case: <b>alarm</b></div>`);
      el.classList.toggle('done', solved); el.classList.toggle('lock', locked && !solved);
      q('msg').textContent = solved ? 'Badge T-03: a temporary FBI badge, issued at the main entrance at 7:13. Nobody signed for it by name.' : locked ? 'Too many wrong flags. The console is locked.' : last;
    }
    el.addEventListener('click', e => {
      const dc = e.target.closest('[data-door]'); if (dc) { door = dc.dataset.door; return draw(); }
      const sw = e.target.closest('[data-sw]'); if (sw) { pickI = Number(sw.dataset.sw); last = ''; return draw(); }
      if (!e.target.closest('[data-o="flag"]') || pickI == null) return;
      const s = DB.get(), m = M(s, 'doorlog'); if (m.solved || (m.lockUntil || 0) > now()) return;
      if (pickI === ANSWER) { const u = {}; Clock.log(u, 'game', `${me.name} found badge T-03 in the vault stairwell at 7:44.`); solve('doorlog', me, u); ctx.good(); return draw(); }
      const x = SWIPES[pickI], tries = (m.tries || 0) + 1, u = { 'mg/doorlog/tries': tries };
      if (tries % 3 === 0) u['mg/doorlog/lockUntil'] = now() + 120000;
      DB.update(u); ctx.miss();
      last = x[1] === 'B-1131' && x[0] === '7:41' ? 'That\'s Charlie\'s own badge, going in.' : x[3] ? 'Denied: that door never opened for it.' : x[2] !== 'Vault stairwell' ? 'That swipe isn\'t at the vault stairwell.' : 'Wrong time: that isn\'t between Charlie going in and the last call.';
      draw();
    });
    el.addEventListener('change', e => { const k = e.target.dataset.o; if (k === 'from') from = e.target.value; if (k === 'to') to = e.target.value; draw(); });
    el.addEventListener('input', e => { if (e.target.dataset.o === 'find') { find = e.target.value; draw(); } });
    return { el, sync: draw, tick: () => { if ((M(DB.get(), 'doorlog').lockUntil || 0) > now() - 1500) draw(); }, prog: s => { const m = M(s, 'doorlog'); return m.solved ? [1, 1, 'Found'] : null; } };
  }

  const BUILD = { vault, camera, decrypt, messages, photo, differences, ledger, doorlog };
  const inst = {};
  let ui = { open: null };

  /* ---------- the Tasks tab ----------
     A list of cards (redrawn by the app), and one sheet that slides up over everything
     when a game is open. The sheet lives outside the app's page, so a redraw never touches it. */
  const THUMB = {
    vault: '<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="tv" cx=".4" cy=".35"><stop offset="0" stop-color="#e9edf2"/><stop offset="1" stop-color="#5a626c"/></radialGradient></defs><rect width="160" height="100" fill="#15181d"/><circle cx="80" cy="54" r="38" fill="#22272e" stroke="#4a515a" stroke-width="2"/>' + Array.from({ length: 40 }, (_, i) => `<line x1="80" y1="18" x2="80" y2="${i % 5 ? 22 : 25}" stroke="#c9ced6" stroke-width="1" transform="rotate(${i * 9} 80 54)"/>`).join('') + '<circle cx="80" cy="54" r="24" fill="#2b3038"/><circle cx="80" cy="54" r="16" fill="url(#tv)"/><path d="M80 10l-5 0 5 8 5-8z" fill="#d8b25e"/></svg>',
    camera: '<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#070a08"/>' + [[6, 6], [82, 6], [6, 52], [82, 52]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="72" height="42" fill="${i === 1 ? '#141a17' : '#2d3a33'}" stroke="#3c6e2a"/><circle cx="${x + 7}" cy="${y + 7}" r="2.4" fill="${i === 2 ? '#b6ff3b' : '#ff3b5c'}"/><rect x="${x + 10}" y="${y + 14}" width="14" height="24" fill="#4a5a50"/>${i % 2 ? `<circle cx="${x + 48}" cy="${y + 20}" r="4" fill="#b9c8bd"/><rect x="${x + 43}" y="${y + 25}" width="10" height="13" fill="#8fa497"/>` : ''}`).join('') + '</svg>',
    decrypt: '<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#1d2c45"/><rect x="34" y="8" width="92" height="96" fill="#f6f3ea"/><rect x="42" y="18" width="40" height="5" fill="#8f1d17"/>' + [30, 40, 50, 60, 70].map((y, i) => `<rect x="42" y="${y}" width="${[70, 60, 74, 50, 66][i]}" height="5" fill="${i === 1 ? '#10213f' : '#2a2a2a'}" opacity="${i === 1 ? 1 : .85}"/>`).join('') + '<g transform="rotate(-14 104 74)"><rect x="80" y="64" width="50" height="18" fill="none" stroke="#b3261e" stroke-width="2.5"/><text x="105" y="77" text-anchor="middle" font-family="monospace" font-size="10" font-weight="700" fill="#b3261e">SEALED</text></g></svg>',
    messages: '<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#dfe6f2"/><rect x="52" y="6" width="56" height="100" rx="10" fill="#0b0b0d"/><rect x="56" y="12" width="48" height="90" rx="6" fill="#fff"/><rect x="60" y="22" width="30" height="9" rx="4.5" fill="#e9e9eb"/><rect x="72" y="35" width="28" height="9" rx="4.5" fill="#0a84ff"/><rect x="60" y="48" width="34" height="9" rx="4.5" fill="#e9e9eb"/><rect x="62" y="51" width="14" height="3" fill="#9aa0a6"/><rect x="74" y="61" width="26" height="9" rx="4.5" fill="#0a84ff"/><rect x="60" y="74" width="24" height="9" rx="4.5" fill="#e9e9eb"/></svg>',
    photo: '<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#5a3a24"/><rect width="160" height="100" fill="url(#tw)" opacity=".4"/><defs><pattern id="tw" width="160" height="8" patternUnits="userSpaceOnUse"><rect width="160" height="3" fill="#6d4a30"/></pattern></defs>' + [[40, 16, -6], [82, 12, 8], [44, 52, 4], [86, 54, -10]].map(([x, y, a]) => `<g transform="rotate(${a} ${x + 18} ${y + 16})"><path d="M${x} ${y} h38 l-2 8 l3 7 l-2 9 l1 8 h-38 l2 -9 l-3 -7 l2 -8z" fill="#f3efe4"/><rect x="${x + 3}" y="${y + 3}" width="32" height="26" fill="#a99474"/><circle cx="${x + 16}" cy="${y + 13}" r="4" fill="#7d6a52"/></g>`).join('') + '</svg>',
    differences: '<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#20242c"/>' + [10, 84].map((x, i) => `<rect x="${x}" y="22" width="66" height="50" fill="#b88d3a"/><rect x="${x + 4}" y="26" width="58" height="42" fill="#c46a4a"/><rect x="${x + 4}" y="50" width="58" height="18" fill="#2c3a5a"/><circle cx="${x + 48}" cy="${i ? 38 : 34}" r="${i ? 4 : 6}" fill="#ffe2a8"/><rect x="${x + 22}" y="78" width="22" height="5" fill="#d8b25e" opacity=".6"/>`).join('') + '<circle cx="132" cy="38" r="9" fill="none" stroke="#ffd34d" stroke-width="2"/></svg>',
    ledger: '<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#f4f1e2"/>' + Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${14 + i * 10}" x2="160" y2="${14 + i * 10}" stroke="#9ec5a6"/>`).join('') + '<line x1="26" y1="0" x2="26" y2="100" stroke="#d9837a"/><line x1="112" y1="0" x2="112" y2="100" stroke="#9ec5a6"/><line x1="136" y1="0" x2="136" y2="100" stroke="#9ec5a6"/>' + [20, 30, 40, 50, 60, 70, 80].map(y => `<rect x="32" y="${y}" width="${50 + (y * 7) % 26}" height="3" fill="#3d3a32" opacity=".7"/><rect x="118" y="${y}" width="14" height="3" fill="#3d3a32" opacity=".7"/>`).join('') + '<ellipse cx="80" cy="51" rx="62" ry="7" fill="none" stroke="#c0392b" stroke-width="2"/></svg>',
    doorlog: '<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><rect width="160" height="100" fill="#0b1220"/>' + Array.from({ length: 8 }, (_, i) => `<rect x="10" y="${10 + i * 10}" width="20" height="4" fill="#4f6b95"/><rect x="36" y="${10 + i * 10}" width="${40 + (i * 13) % 30}" height="4" fill="${i === 5 ? '#ffb547' : '#9fb7dc'}"/><rect x="118" y="${10 + i * 10}" width="30" height="4" fill="#4f6b95"/>`).join('') + '<rect x="6" y="57" width="148" height="12" fill="none" stroke="#ffb547"/></svg>'
  };
  const KICK = () => ({ fbi: 'Case work', bebbit: 'Tonight\'s puzzles', nightwire: '// tonight\'s jobs' }[document.body.dataset.world] || 'Tonight');
  const tagOf = (s, d, me) => { const st = status(s, d), m = M(s, d.id); return st === 'solved' ? (m.solved.by === me.id ? 'Solved by you' : 'Solved' + (G.byId(m.solved.by) ? ' by ' + G.byId(m.solved.by).name.split(' ')[0] : '')) : st === 'failed' ? 'Failed' : st === 'open' ? 'Open now' : st === 'closed' ? 'Closed' : 'Opens ' + wall(startMin(d)); };
  function render(s, me) {
    const mine = forMe(s, me);
    if (ui.open && !mine.some(d => d.id === ui.open)) ui.open = null;
    const r = Clock.read(s), nowMin = r.state === 'live' || r.state === 'paused' ? r.nightMin : null;
    const sts = mine.map(d => status(s, d)), done = sts.filter(x => x === 'solved').length, open = sts.filter(x => x === 'open').length;
    const next = mine.filter((d, i) => sts[i] === 'locked').map(startMin).sort((a, b) => a - b)[0];
    const C = 2 * Math.PI * 22, frac = mine.length ? done / mine.length : 0;
    const hero = `<div class="mgt-hero"><div class="mgt-ring"><svg viewBox="0 0 52 52" aria-hidden="true"><circle class="t" cx="26" cy="26" r="22"/><circle class="v" cx="26" cy="26" r="22" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - frac)).toFixed(1)}"/></svg><b>${done}<i>/${mine.length}</i></b></div>
      <div class="mgt-tx"><small>${esc(KICK())}</small><b>${open ? `${open} open now` : mine.length && done === mine.length ? 'All done. Nice work.' : 'Nothing open yet'}</b><span>${next != null ? `Next opens at ${wall(next)}${nowMin != null ? ' · in ' + Math.max(1, Math.round(next - nowMin)) + ' min' : ''}` : open ? 'Tap one to begin.' : ''}</span></div></div>`;
    const card = (d, i) => {
      const st = sts[i], info = INFO[d.id] || {};
      return `<button class="mg-card st-${st}" data-mg="${d.id}" ${st === 'locked' || st === 'closed' ? 'aria-disabled="true"' : ''}><span class="mg-art">${THUMB[d.id] || ''}<span class="mg-badge" aria-hidden="true">${st === 'solved' ? '✓' : st === 'locked' || st === 'closed' ? '<svg viewBox="0 0 24 24"><rect x="6" y="11" width="12" height="9" rx="2"/><path d="M9 11V8a3 3 0 016 0v3"/></svg>' : st === 'failed' ? '!' : ''}</span></span><span class="mg-body"><span class="mg-tag"><i></i>${esc(tagOf(s, d, me))}</span><b>${esc(d.name)}</b><small>${esc(d.blurb)}</small><span class="mg-foot"><span class="mg-dots" title="Difficulty">${Array.from({ length: 5 }, (_, k) => `<i class="${k < (info.diff || 0) ? 'on' : ''}"></i>`).join('')}</span><span>${esc(info.mins || '')} min</span>${d.clue ? `<span>Clue ${esc(d.clue)}</span>` : ''}</span></span></button>`;
    };
    return `<div class="mg-tab">${mine.length ? hero : ''}<div class="mg-cards">${mine.map(card).join('') || '<div class="card empty">Nothing for you here tonight.</div>'}</div></div>`;
  }
  let sheet = null;
  function ensureSheet() {
    if (sheet) return sheet;
    sheet = h('div', 'mg-sheet');
    sheet.innerHTML = `<div class="mgs-back" data-mg-close></div><section class="mgs-panel" role="dialog" aria-modal="true" aria-labelledby="mgs-t"><header class="mgs-h"><span class="mgs-ic" aria-hidden="true"></span><div class="mgs-ttl"><b id="mgs-t"></b><small></small></div><span class="mgs-st"></span><button class="mgs-x" data-mg-close aria-label="Close">✕</button></header><div class="mgs-body" id="mg-stage"></div></section>`;
    document.body.appendChild(sheet); return sheet;
  }
  /** Show the open game in its sheet (or hide the sheet). The app calls this after every redraw. */
  function mount(active) {
    const me = Session.player(); if (!me) return;
    if (!ui.open || active === false) { if (sheet && sheet.classList.contains('on')) { sheet.classList.remove('on'); document.documentElement.classList.remove('mg-lock'); } return; }
    const s = DB.get(), d = def(ui.open), sh = ensureSheet(), body = sh.querySelector('.mgs-body');
    if (!inst[d.id]) inst[d.id] = shell(d.id, me);
    const g = inst[d.id];
    if (g.el.parentNode !== body) { body.innerHTML = ''; body.appendChild(g.el); body.scrollTop = 0; }
    body.dataset.g = d.id; sh.dataset.g = d.id;
    patch(sh.querySelector('.mgs-ic'), ICON[d.id] || ''); patch(sh.querySelector('.mgs-ttl b'), esc(d.name)); patch(sh.querySelector('.mgs-ttl small'), esc(KICK()));
    const st = status(s, d); sh.querySelector('.mgs-st').className = 'mgs-st st-' + st; patch(sh.querySelector('.mgs-st'), esc(tagOf(s, d, me)));
    if (!sh.classList.contains('on')) { sh.classList.add('on'); document.documentElement.classList.add('mg-lock'); }
    g.sync(s);
  }
  function onClick(e, me) {
    if (e.target.closest('[data-mg-close]')) { ui.open = null; return 'redraw'; }
    const c = e.target.closest('[data-mg]'); if (c) {
      const d = def(c.dataset.mg), st = status(DB.get(), d);
      if (st === 'locked' || st === 'closed') {
        /* say why instead of doing nothing */
        note(st === 'closed' ? `"${d.name}" is closed.` : `"${d.name}" opens at ${wall(startMin(d))}${d.opens.phase ? ' (when "' + STORY.phases[PH(d.opens.phase)].short + '" starts)' : ''}. The host can open it early.`);
        c.classList.remove('nudge'); void c.offsetWidth; c.classList.add('nudge');
        return true;
      }
      ui.open = d.id; return 'redraw';
    }
    return false;
  }
  function note(text) { document.querySelectorAll('.toast.mg-note').forEach(t => t.remove()); const t = h('div', 'toast mg-note'); t.setAttribute('role', 'status'); t.textContent = text; document.body.appendChild(t); setTimeout(() => t.remove(), 3500); }
  addEventListener('keydown', e => { if (e.key === 'Escape' && ui.open && !(typeof Ask !== 'undefined' && Ask.isOpen())) { ui.open = null; mount(false); } });
  /* timers inside the games (the camera window, the decrypt animation) run even between redraws */
  const live = () => sheet && sheet.classList.contains('on') && inst[ui.open];
  setInterval(() => { const g = live(); if (g && g.tick) g.tick(); }, 250);
  setInterval(() => { const g = live(); if (g && g.fast) g.fast(); }, 90);
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
    const allOpen = DEFS().every(d => M(s, d.id).mode === 'open' || M(s, d.id).solved);
    const bar = `<div class="mgh-all"><span>${allOpen ? 'Every game is open early.' : 'Games open on the night\'s clock. To try them now, open them all.'}</span><button class="btn small ${allOpen ? '' : 'primary'}" data-mgh="${allOpen ? 'clockall' : 'openall'}:all">${allOpen ? 'Put all back on the clock' : 'Open all now'}</button></div>`;
    return bar + '<div class="mgh-grid">' + DEFS().map(d => {
      const st = status(s, d), m = M(s, d.id);
      const who = d.who.map(t => t.startsWith('g:') ? (STORY.groups[t.slice(2)] || {}).name || t : (G.byId(t) || {}).name || t).join(', ');
      const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
      const prog = d.id === 'camera' ? `${Object.keys(m.looped || {}).length}/6 looped · ${pl(m.wrong || 0, 'wrong pick')}` : d.id === 'decrypt' ? `${Object.keys(m.got || {}).length}/3 keys` : d.id === 'ledger' ? `${Object.keys(m.flags || {}).length}/3 flagged · ${pl(m.audits || 0, 'rejected audit')}` : d.id === 'messages' ? (m.started ? 'extraction run' : 'not started') : d.id === 'doorlog' ? pl(m.tries || 0, 'wrong flag') : d.id === 'vault' ? pl(m.fails || 0, 'wrong combination') : '';
      const pct = st === 'solved' ? 100 : d.id === 'camera' ? Object.keys(m.looped || {}).length / 6 * 100 : d.id === 'decrypt' ? Object.keys(m.got || {}).length / 3 * 100 : d.id === 'messages' && m.started ? 15 : 0;
      const chip = st === 'solved' ? 'Solved' : st === 'open' ? (m.mode === 'open' ? 'Open (early)' : 'Open') : st === 'locked' ? 'Waiting' : st === 'closed' ? 'Closed' : 'Failed';
      return `<article class="mgh st-${st}"><div class="mgh-top"><span class="mgh-ic">${ICON[d.id] || ''}</span><div class="mgh-a"><b>${esc(d.name)}</b><small>${esc(who)}</small></div><span class="mgh-chip">${chip}</span></div>
        <div class="mgh-meta"><span>Opens ${d.opens.phase ? 'with "' + esc(STORY.phases[PH(d.opens.phase)].short) + '"' : 'at ' + wall(d.opens.min)}</span>${d.clue ? `<span>Clue ${d.clue}</span>` : ''}${st === 'solved' ? `<span>by ${esc((G.byId(m.solved.by) || { name: 'the host' }).name)} · ${esc(wallTime(m.solved.at))}</span>` : prog ? `<span>${prog}</span>` : ''}</div>
        <div class="mgh-bar"><i style="width:${Math.round(pct)}%"></i></div>
        <div class="mgh-b">${st !== 'solved' ? `<button class="btn small ${m.mode === 'open' ? 'primary' : ''}" data-mgh="open:${d.id}">${m.mode === 'open' ? 'Opened early' : 'Open now'}</button><button class="btn small ghost" data-mgh="close:${d.id}">${m.mode === 'closed' ? 'Closed' : 'Close'}</button><button class="btn small" data-mgh="solve:${d.id}">${d.id === 'vault' ? 'Override' : 'Mark solved'}</button>` : ''}${d.id === 'camera' && m.started && !m.solved && !m.failed ? '<button class="btn small" data-mgh="add30:camera">+30 sec</button>' : ''}${d.id === 'camera' && m.failed ? `<button class="btn small primary" data-mgh="footage:camera" ${m.footage ? 'disabled' : ''}>${m.footage ? 'Footage released' : 'Release footage'}</button>` : ''}<span class="mgh-more"><button class="btn small ghost" data-mgh="hint:${d.id}">Hint</button><button class="btn small ghost" data-mgh="reset:${d.id}" title="Clear this game's progress">↺</button></span></div></article>`;
    }).join('') + '</div>';
  }
  function hostClick(e, toast) {
    const b = e.target.closest('[data-mgh]'); if (!b) return false;
    const [a, id] = b.dataset.mgh.split(':'), s = DB.get(), u = {};
    if (a === 'openall' || a === 'clockall') { DEFS().forEach(g => { u['mg/' + g.id + '/mode'] = a === 'openall' ? 'open' : null; }); Clock.log(u, 'host', a === 'openall' ? 'Opened every mini-game early.' : 'Put every mini-game back on the clock.'); DB.update(u); toast(a === 'openall' ? 'All games open' : 'Back on the clock'); return true; }
    const d = def(id), m = M(s, id);
    if (a === 'open') { u['mg/' + id + '/mode'] = m.mode === 'open' ? null : 'open'; Clock.log(u, 'host', `${m.mode === 'open' ? 'Returned' : 'Opened'} "${d.name}"${m.mode === 'open' ? ' to the clock' : ' early'}.`); DB.update(u); toast(m.mode === 'open' ? 'Back on the clock' : 'Opened'); }
    else if (a === 'close') { u['mg/' + id + '/mode'] = m.mode === 'closed' ? null : 'closed'; Clock.log(u, 'host', `${m.mode === 'closed' ? 'Reopened' : 'Closed'} "${d.name}".`); DB.update(u); toast(m.mode === 'closed' ? 'Back on the clock' : 'Closed'); }
    else if (a === 'solve') { if (!Ask.sure(`Mark "${d.name}" solved for everyone?${d.clue ? ' Clue ' + d.clue + ' will be marked found.' : ''}`, () => hostClick(e, toast), { title: 'Mini-games', ok: 'Mark solved' })) return true; u['mg/' + id + '/solved'] = { by: 'host', at: now() }; if (d.clue) u['clues/' + d.clue] = { at: now(), by: 'Host' }; if (id === 'vault') u['feed/' + uid('g')] = { to: ['g:crew'], title: 'The vault', text: 'Maintenance override: the vault door is open.', at: now(), kind: 'msg' }; Clock.log(u, 'host', `Marked "${d.name}" solved.`); DB.update(u); toast('Marked solved'); }
    else if (a === 'reset') { if (!Ask.sure(`Reset "${d.name}"? Everyone's shared progress on it is cleared (the clue stays marked).`, () => hostClick(e, toast), { title: 'Mini-games', ok: 'Reset', danger: true })) return true; u['mg/' + id] = m.mode ? { mode: m.mode } : null; Clock.log(u, 'host', `Reset "${d.name}".`); DB.update(u); toast('Reset'); }
    else if (a === 'add30') { DB.update({ 'mg/camera/extra': (m.extra || 0) + 30 }); toast('+30 seconds on the camera loop'); }
    else if (a === 'footage') { u['mg/camera/footage'] = now(); u['feed/' + uid('g')] = { to: ['g:fbi'], title: 'Security footage', text: 'Recovered from the museum system: vault camera, 7:52 PM. Three figures inside the vault, faces turned away. One carries a large flat package.', at: now(), kind: 'msg' }; Clock.log(u, 'host', 'Released the vault-camera footage to the FBI.'); DB.update(u); toast('Footage sent to the FBI'); }
    else if (a === 'hint') { Ask.input(`A hint for "${d.name}". It goes to everyone who has this game.`, '', v => { if (!v.trim()) return; sendMessage(d.who, v.trim(), 'Hint'); toast('Hint sent'); }, { title: 'Send a hint', ok: 'Send' }); }
    return true;
  }

  return { forMe, status, render, mount, onClick, hostPanel, hostClick, openCount: (s, me) => forMe(s, me).filter(d => status(s, d) === 'open').length, wall };
})();
