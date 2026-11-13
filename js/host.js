/* =====================================================================
   THE VANISHING HOUR — the host terminal.
   Everything in the game reports back here: the clock, cues, who is
   signed in, messages and the activity log. The main host sees all of
   it; a co-host sees only their own groups.

   Layout: a left rail (sections, keys 1–8), a status bar that is always
   on screen (clock, phase, time left, pause), and the section itself.
   Press ? for every keyboard shortcut.
   ===================================================================== */
(function () {
  let ME = Session.host();
  let tab = 'tonight', filter = 'all', pq = '';
  const root = $('#root');
  const mark = '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 2 L28 15 L15 28 L2 15 Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15 8 L22 15 L15 22 L8 15 Z" fill="currentColor"/></svg>';
  const I = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const ICON = {
    tonight: I('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    people: I('<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><path d="M16 5.5a3 3 0 010 6M17.5 14.5c1.9.6 3 2.2 3.4 5"/>'),
    messages: I('<path d="M4 5h16v11H9.5L5 19.5V16H4z"/><path d="M8 9.5h8M8 12.5h5"/>'),
    fbi: I('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'),
    bebbit: I('<path d="M5 4h11a4 4 0 014 4v5a4 4 0 01-4 4H9l-4 3z"/>'),
    nightwire: I('<rect x="3" y="4.5" width="18" height="15" rx="1.5"/><path d="M7 10l3 2.5L7 15M12.5 15H17"/>'),
    rsvps: I('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>'),
    setup: I('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>')
  };

  /* ---------- sign-in ---------- */
  function login() {
    root.innerHTML = `<div class="ht-login"><div class="ht-grid" aria-hidden="true"></div><div class="ht-scan" aria-hidden="true"></div>
      <form class="ht-lcard" id="hl" autocomplete="off">
        <div class="ht-lbrand">${mark}<div><b>Host terminal</b><small>${esc(CONFIG.TITLE)} · ${esc(CONFIG.EVENT)} · ${esc(CONFIG.SEASON)}</small></div></div>
        <div class="ht-boot mono" aria-hidden="true">
          <div style="--d:.2s"><span>story</span>${STORY.characters.length} players · ${STORY.phases.length} phases · ${STORY.clues.length} clues</div>
          <div style="--d:.5s"><span>worlds</span>FBI Headquarters · Bebbit · NIGHTWIRE</div>
          <div style="--d:.8s"><span>link</span>${CONFIG.BACKEND === 'local' ? 'local test mode · this computer only' : 'online'}</div>
          <div style="--d:1.1s"><span>status</span>awaiting host code<i class="ht-caret"></i></div>
        </div>
        <div><label class="lbl" for="hc">Host code</label><input class="field mono" id="hc" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="XXXXXX-00"></div>
        <button class="btn primary" type="submit">Open the terminal <kbd>Enter</kbd></button><div class="err" id="he" role="alert"></div></form></div>`;
    setTimeout(() => { const f = $('#hc'); if (f) f.focus(); }, 300);
    $('#hl').addEventListener('submit', e => {
      e.preventDefault();
      if (G.hostByCode($('#hc').value)) { Session.signIn($('#hc').value); ME = Session.host(); shell(); }
      else { $('#he').textContent = normCode($('#hc').value) ? "That isn't a host code." : 'Enter your host code first.'; const c = $('#hl'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }
    });
  }

  /* ---------- helpers ---------- */
  const scope = () => ME.groups || null;                       // null = sees everything
  const inScope = c => !scope() || scope().includes(c.group);
  const cast = () => STORY.characters.filter(inScope);
  const gcol = g => STORY.groups[g].color;
  const ago = (ts, now) => { const m = Math.floor((now - ts) / 60000); return m < 1 ? 'just now' : m + ' min ago'; };
  const cueId = (p, j) => p.id + '_' + j;
  const isLive = r => r.state === 'live' || r.state === 'paused';
  const clockNow = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const tabList = () => [['tonight', 'Tonight'], ['people', 'People'], ['messages', 'Messages'], ['fbi', 'FBI'], ['bebbit', 'Bebbit'], ['nightwire', 'NIGHTWIRE'], ['rsvps', 'RSVPs'], ['setup', 'Setup']]
    .filter(t => (ME.role === 'main' || (t[0] !== 'setup' && t[0] !== 'rsvps')) && (t[0] !== 'fbi' || !scope() || scope().includes('fbi')) && (t[0] !== 'nightwire' || !scope() || scope().includes('crew')));
  const panel = (title, aside, body, cls) => `<section class="card ${cls || ''}"><div class="card-h"><span>${title}</span>${aside ? `<span class="card-a">${aside}</span>` : ''}</div>${body}</section>`;

  /* ---------- toasts: a short note after every action ---------- */
  function toast(text, kind) {
    const el = $('#toast'); if (!el) return;
    el.innerHTML = `<i></i>${esc(text)}`; el.className = 'ht-toast on ' + (kind || '');
    clearTimeout(toast.t); toast.t = setTimeout(() => { el.className = 'ht-toast ' + (kind || ''); }, 2400);
  }

  /* ---------- the left rail ---------- */
  function rail(s, r, now) {
    const nNeeds = needItems(s, r, now).filter(x => !x.calm).length;
    const on = cast().filter(c => G.online(s, c.id, now)).length;
    const badge = {
      tonight: nNeeds ? `<em class="warn">${nNeeds}</em>` : '',
      people: `<em>${on}</em>`,
      bebbit: Bebbit.list(s).length ? `<em>${Bebbit.list(s).filter(p => !p.deleted).length}</em>` : '',
      fbi: s.fbi ? `<em>${FBI.leftN(s)}</em>` : ''
    };
    return `<div class="ht-brand">${mark}<div><b>Host terminal</b><small>${esc(ME.label)}</small></div></div>
      <nav class="ht-nav" aria-label="Sections">${tabList().map((t, k) => `<button data-tab="${t[0]}" aria-current="${tab === t[0]}">${ICON[t[0]]}<span>${t[1]}</span>${badge[t[0]] || ''}<kbd>${k + 1}</kbd></button>`).join('')}</nav>
      <div class="ht-rail-foot">
        <button class="ht-keyhint" data-act="privacy"><kbd>P</kbd> Hide screen</button>
        <button class="ht-keyhint" data-act="keys"><kbd>?</kbd> Keyboard shortcuts</button>
        <div class="ht-me"><span class="ht-av">${esc(initials(ME.label))}</span><div><b>${esc(ME.label)}</b><small>${scope() ? 'Sees: ' + scope().map(g => esc(STORY.groups[g].name)).join(', ') : 'Sees everything'}</small></div></div>
        <button class="btn small ghost" data-act="signout">Sign out</button>
      </div>`;
  }

  /* ---------- the status bar (always on screen) ---------- */
  function top(s, r, now) {
    const n = STORY.phases.length, live = isLive(r);
    const pill = r.state === 'live' ? '<span class="pill live"><i></i>Live</span>' : r.state === 'paused' ? '<span class="pill paused"><i></i>Paused</span>' : r.state === 'over' ? '<span class="pill">Finished</span>' : '<span class="pill idle"><i></i>Standing by</span>';
    const players = cast().filter(c => !G.noshow(s, c.id)), on = players.filter(c => G.online(s, c.id, now)).length;
    const btn = r.state === 'live' ? '<button class="btn primary ht-go" data-act="pause">Pause <kbd>Space</kbd></button>'
      : r.state === 'paused' ? '<button class="btn primary ht-go pulse" data-act="resume">Resume <kbd>Space</kbd></button>'
      : r.state === 'before' && ME.role === 'main' ? '<button class="btn primary ht-go" data-act="start">Start the night <kbd>Space</kbd></button>' : '';
    return `<div class="ht-bar-in">
      <div class="ht-clock"><b class="mono">${esc(clockNow())}</b><small>local time</small></div>
      <div class="ht-stat">${pill}</div>
      <div class="ht-stat wide"><small>Phase</small><b>${live ? `<span class="mono dim">${String(r.i + 1).padStart(2, '0')}/${n}</span> ${esc(r.phase.name)}` : r.state === 'over' ? 'All phases done' : 'Not started'}</b></div>
      <div class="ht-stat"><small>Time left</small><b class="mono ${live && r.remainGameMs < 60000 ? 'hot' : ''}">${live ? mmss(r.remainGameMs) : '--:--'}</b></div>
      <div class="ht-stat"><small>Into the night</small><b class="mono">${live ? hmm(r.nightMin) : '0:00'}</b></div>
      <div class="ht-stat"><small>Connected</small><b class="mono">${on}<span class="dim">/${players.length}</span></b></div>
      ${Clock.speed(s) > 1 ? `<span class="pill paused" title="Test speed is on. Turn it off in Setup.">Test ×${Clock.speed(s)}</span>` : ''}
      <div class="ht-bar-acts"><button class="btn ghost ht-hide" data-act="privacy" title="Hide the screen (P)" aria-label="Hide the screen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.5-2.7 3.8M6.5 6.6C4.4 7.9 2.8 10 2 12c1 2.5 5 7 10 7 1.8 0 3.5-.6 5-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg></button>${btn}</div></div>`;
  }

  /* ---------- Tonight ---------- */
  function track(s, r) {
    const n = STORY.phases.length;
    return `<div class="ht-track" style="grid-template-columns:${STORY.phases.map(p => `minmax(64px,${Clock.mins(s, STORY.phases.indexOf(p))}fr)`).join(' ')}">` + STORY.phases.map((p, i) => {
      const cls = r.i > i || r.state === 'over' ? 'done' : r.i === i && isLive(r) ? 'now' : '';
      return `<button class="seg ${cls}" ${ME.role === 'main' ? `data-jump="${i}"` : 'disabled'} title="${esc(p.name)} · starts ${hmm(Clock.startOf(s, i))} · ${Clock.mins(s, i)} min${ME.role === 'main' ? ' · click to jump here' : ''}">
        <span class="b">${r.i === i && isLive(r) ? `<i style="width:${(r.frac * 100).toFixed(1)}%"></i>` : ''}</span>
        <span class="l"><b>${String(i + 1).padStart(2, '0')}</b> ${esc(p.short)}</span><span class="m mono">${hmm(Clock.startOf(s, i))}</span></button>`;
    }).join('') + `</div>`;
  }

  function nextCue(s, r) {
    if (!isLive(r)) return null;
    const p = r.phase;
    const list = p.cues.map((c, j) => ({ c, j })).filter(x => G.touches(x.c.to, scope()) && !(s.feed && s.feed[cueId(p, x.j)]));
    return list.length ? Object.assign(list[0], { due: (list[0].c.at - r.elapsedMin) * 60000 }) : null;
  }

  function deck(s, r) {
    const C = 2 * Math.PI * 76, ring = (frac, big, small, cls) => `<div class="ht-ring ${cls || ''}"><svg viewBox="0 0 176 176" aria-hidden="true"><circle class="trk" cx="88" cy="88" r="76"/><circle class="tick" cx="88" cy="88" r="84"/>${frac !== null ? `<circle class="val" cx="88" cy="88" r="76" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - frac)).toFixed(1)}"/>` : ''}</svg><div><b class="mono">${big}</b><small>${small}</small></div></div>`;
    if (!isLive(r)) {
      const signed = cast().filter(c => s.players && s.players[c.id]).length;
      return `<section class="card deck ${r.state}"><div class="deck-l">
        <div class="deck-meta mono">${r.state === 'over' ? 'Finished' : 'Pre-show'} · ${STORY.phases.length} phases · ${hmm(Clock.startOf(s, STORY.phases.length))} planned</div>
        <h2 class="deck-t">${r.state === 'over' ? 'The night is over' : 'Ready when you are'}</h2>
        <p class="deck-n">${r.state === 'over' ? 'Every phase has run. You can restart from any phase in Setup.' : `${signed} of ${cast().length} players have signed in. When you start, the clock runs by itself: phases change and cues go to phones on time. You can pause or add time whenever you need to.`}</p>
        ${r.state === 'before' ? `<div class="deck-lbl">Opening</div><div class="say"><q>${esc(STORY.phases[0].say || STORY.phases[0].note)}</q></div>` : ''}
        </div><div class="deck-r">${ring(r.state === 'over' ? 1 : null, hmm(Clock.startOf(s, STORY.phases.length)), 'planned length')}
        ${ME.role === 'main' && r.state === 'before' ? '<button class="btn primary big" data-act="start">Start the night <kbd>Space</kbd></button>' : ''}</div></section>`;
    }
    const p = r.phase, next = STORY.phases[r.i + 1], nc = nextCue(s, r);
    const todos = p.todo || [], doneN = todos.filter((t, k) => s.todo && s.todo[p.id + '_' + k]).length;
    const todo = todos.map((t, k) => { const id = p.id + '_' + k; return `<label class="check"><input type="checkbox" data-todo="${id}" ${s.todo && s.todo[id] ? 'checked' : ''}><span>${esc(t)}</span></label>`; }).join('');
    return `<section class="card deck ${r.state}"><div class="deck-l">
      <div class="deck-meta mono">Phase ${String(r.i + 1).padStart(2, '0')} of ${STORY.phases.length} · ${Clock.mins(s, r.i)} min phase · ${Math.floor(r.elapsedMin)} min in · ${hmm(r.nightMin)} into the night</div>
      <h2 class="deck-t">${esc(p.name)}</h2>
      <p class="deck-n">${esc(p.note)}</p>
      ${nc ? `<div class="deck-next"><span class="deck-lbl">Next cue</span><b class="mono">${nc.due > 0 ? 'in ' + mmss(nc.due) : 'sending…'}</b><span class="deck-next-t">${esc(nc.c.to ? G.toLabel(nc.c.to) : 'Bebbit')} · ${esc(nc.c.title || (nc.c.post ? 'Planted post' : nc.c.text))}</span><button class="btn small" data-cue="${r.i}:${nc.j}">Send now</button></div>` : ''}
      ${todo ? `<div class="deck-todo"><div class="deck-lbl">Your checklist <span class="mono">${doneN}/${todos.length}</span></div>${todo}</div>` : ''}
      ${p.say ? `<div class="say"><div class="deck-lbl">Read aloud</div><q>${esc(p.say)}</q></div>` : ''}
      </div><div class="deck-r">
      <div class="deck-lbl c">${next ? 'Until ' + esc(next.name) : 'Until the end of the night'}</div>
      ${ring(r.frac, mmss(r.remainGameMs), r.state === 'paused' ? 'paused' : 'left in phase', r.state === 'paused' ? 'paused' : r.remainGameMs < 60000 ? 'hot' : '')}
      ${r.state === 'paused' ? '<button class="btn primary big pulse" data-act="resume">Resume <kbd>Space</kbd></button>' : '<button class="btn primary big" data-act="pause">Pause <kbd>Space</kbd></button>'}
      <div class="two"><button class="btn" data-act="sub1">−1 min <kbd>−</kbd></button><button class="btn" data-act="add5">+5 min <kbd>+</kbd></button></div>
      ${ME.role === 'main' ? `<div class="two"><button class="btn ghost" data-act="back">◂ Back <kbd>B</kbd></button><button class="btn ghost" data-act="next">Next ▸ <kbd>N</kbd></button></div>` : ''}
      </div></section>`;
  }

  function cueRows(s, r, i, live) {
    const p = STORY.phases[i]; if (!p) return '';
    const nc = live ? nextCue(s, r) : null;
    return p.cues.map((c, j) => ({ c, j })).filter(x => G.touches(x.c.to, scope())).map(({ c, j }) => {
      const sent = s.feed && s.feed[cueId(p, j)];
      const due = live ? (c.at - r.elapsedMin) * 60000 : null;
      const isNext = nc && nc.j === j && i === r.i;
      const status = sent ? `<span class="chip ok">sent ${esc(wallTime(sent.at))}</span>` : live ? `<span class="mono due">in ${mmss(Math.max(0, due))}</span><button class="btn small" data-cue="${i}:${j}">Send now</button>` : '';
      const who = [c.to ? G.toLabel(c.to) : '', c.post ? 'Bebbit' : ''].filter(Boolean).join(' + ');
      const plant = c.post ? `<small>Posts on Bebbit as ${esc(Bebbit.shown(Bebbit.who(c.post.by)))}: "${esc(c.post.text)}"</small>` : '';
      return `<div class="cue ${sent ? 'sent' : ''}${isNext ? ' next' : ''}"><span class="t mono">${hmm(Clock.startOf(s, i) + c.at)}</span><span class="who">${esc(who)}</span><span class="txt">${c.to ? `<b>${esc(c.title || '')}</b> ${esc(c.text)}` : '<b>Planted post</b>'}${plant}${c.host ? `<small class="hostnote">Host: ${esc(c.host)}</small>` : ''}</span><span class="st">${status}</span></div>`;
    }).join('');
  }

  function cuesCard(s, r) {
    if (r.state === 'over') return '';
    const i = Math.max(0, r.i), live = isLive(r), p = STORY.phases[i];
    const mine = p.cues.filter(c => G.touches(c.to, scope())), sentN = p.cues.filter((c, j) => G.touches(c.to, scope()) && s.feed && s.feed[cueId(p, j)]).length;
    const now = cueRows(s, r, i, live), nx = STORY.phases[i + 1];
    return panel(live ? 'Cue queue' : 'First cues', `<span class="mono">${sentN}/${mine.length} sent</span> · cues send themselves`, now || '<div class="empty">No cues in this phase.</div>', 'cues')
      + (live && nx ? panel(`Up next · ${esc(nx.name)}`, `<span class="mono">${hmm(Clock.startOf(s, i + 1))} · ${Clock.mins(s, i + 1)} min</span>`, `<p class="deck-n" style="margin-bottom:8px">${esc(nx.note)}</p>${cueRows(s, r, i + 1, false)}`, 'cues later') : '');
  }

  function evidence(s) {
    if (scope()) return '';
    const found = n => s.clues && s.clues[n];
    const nf = STORY.clues.filter(c => found(c[0])).length;
    return panel(`Evidence board`, `<span class="mono">${nf}/${STORY.clues.length}</span> found · click to mark`,
      `<div class="ev-bar"><i style="width:${(nf / STORY.clues.length * 100).toFixed(0)}%"></i></div>
      <div class="tiles">${STORY.clues.map(c => `<button class="tile ${found(c[0]) ? 'found' : ''}" data-clue="${c[0]}" aria-pressed="${!!found(c[0])}"><b>${c[0]}</b><span>${esc(c[1])}</span></button>`).join('')}</div>
      <div class="deck-lbl" style="margin:14px 0 8px">Red herrings</div>
      <div class="filters">${STORY.herrings.map(c => `<button class="btn small herring ${found(c[0]) ? 'on' : ''}" data-clue="${c[0]}" aria-pressed="${!!found(c[0])}">${c[0]} · ${esc(c[1])}</button>`).join('')}</div>`);
  }

  function groupCards(s, now) {
    return panel('Groups', 'connected now', `<div class="grps">` + Object.entries(STORY.groups).filter(([g]) => !scope() || scope().includes(g)).map(([g, info]) => {
      const list = STORY.characters.filter(c => c.group === g && !G.noshow(s, c.id)), on = list.filter(c => G.online(s, c.id, now)).length;
      return `<button class="grp" data-tab="people" data-filter="${g}" style="--g:${info.color}"><span class="dot"></span><span class="n">${esc(info.name)}</span><span class="w">${esc(STORY.worlds[info.door].name)}</span><span class="c mono">${on}/${list.length}</span><span class="bar"><i style="width:${list.length ? on / list.length * 100 : 0}%"></i></span></button>`;
    }).join('') + `</div>`);
  }

  function needItems(s, r, now) {
    const out = [];
    const gone = cast().filter(c => G.noshow(s, c.id));
    if (r.state === 'paused') out.push({ html: `<b>The clock is paused</b><p>Nothing moves until you resume. Players see "paused" on their phones.</p><button class="btn small primary" data-act="resume">Resume</button>` });
    if (isLive(r)) {
      const missing = cast().filter(c => c.key && !G.noshow(s, c.id) && !G.online(s, c.id, now));
      if (missing.length) out.push({ html: `<b>${missing.length} key ${missing.length === 1 ? 'player is' : 'players are'} not connected</b><p>${missing.map(c => esc(c.name)).join(', ')}. Check their phones, or mark a no-show in People.</p><button class="btn small" data-tab="people">Open People</button>` });
      if (r.remainGameMs < 60000 && r.state === 'live') out.push({ html: `<b>Less than a minute left in this phase</b><p>${Clock.auto(s) ? 'The next phase starts by itself.' : 'Auto-advance is off. Press N to move on.'} Need longer? Press + for five more minutes.</p>` });
    }
    if (gone.length) out.push({ calm: true, html: `<b>${gone.length} marked no-show</b><p>${gone.map(c => esc(c.name)).join(', ')}. They're hidden from Who's Who.</p>` });
    if (r.state === 'before') { const n = cast().filter(c => s.players && s.players[c.id]).length; out.push({ calm: true, html: `<b>${n} of ${cast().length} signed in</b><p>Players sign in at their door with their code word. Everyone's code is in People.</p>` }); }
    return out;
  }
  function needs(s, r, now) {
    const out = needItems(s, r, now), hot = out.filter(x => !x.calm).length;
    return panel('Needs you', hot ? `<span class="chip warn">${hot}</span>` : '<span class="chip ok">all clear</span>', out.map(x => `<div class="need ${x.calm ? 'calm' : ''}">${x.html}</div>`).join('') || '<div class="empty">Nothing needs you right now.</div>', 'needs' + (hot ? ' hot' : ''));
  }

  function quickMsg() {
    const groups = Object.keys(STORY.groups).filter(g => !scope() || scope().includes(g));
    return panel('Quick message', '<kbd>M</kbd> to type here', `<form id="qf" class="qf">
      <select class="field" id="qto" aria-label="Send to">${scope() ? '' : '<option value="all">Everyone</option>'}${groups.map(g => `<option value="g:${g}">${esc(STORY.groups[g].name)} (group)</option>`).join('')}${cast().slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
      <div class="qrow"><input class="field" id="qtx" placeholder="Type, then press Enter" aria-label="Message" autocomplete="off"><button class="btn primary" type="submit">Send</button></div></form>`, 'qm');
  }

  function systems(s, now) {
    const on = d => STORY.characters.filter(c => G.door(c) === d && G.online(s, c.id, now)).length;
    const rows = [
      ['fbi', 'FBI Headquarters', `<div class="ic ic-fbi">★</div>`],
      ['bebbit', 'Bebbit', `<div class="ic ic-beb">b</div>`],
      ['nightwire', 'NIGHTWIRE', `<div class="ic ic-nw mono">n/</div>`]
    ].filter(x => !scope() || STORY.characters.some(c => inScope(c) && G.door(c) === x[0]));
    return panel('Systems', '', rows.map(x => `<div class="sys">${x[2]}<div style="flex:1;min-width:0"><b>${x[1]} <span class="dot on"></span></b><small>${on(x[0])} connected · ${x[0] === 'bebbit' ? Bebbit.list(s).filter(p => !p.deleted).length + ' live posts' : x[0] === 'nightwire' ? NW.money(NW.balance(s, 'crew')) + ' in the crew wallet' + (s.nw && s.nw.sale && s.nw.sale.sold ? ' · SOLD' : '') : FBI.leftN(s) + '/' + FBI.total(s) + ' lookups left · ' + Object.values((s.fbi && s.fbi.statements) || {}).filter(z => !z.withdrawn).length + ' statements'}</small></div><button class="btn small ghost" data-tab="${x[0]}">Open</button></div>`).join(''), 'systems');
  }

  function activity(s) {
    const rows = Object.values(s.log || {}).sort((a, b) => b.at - a.at).slice(0, 18);
    return panel('Live log', `<span class="mono">${Object.keys(s.log || {}).length} events</span>`, `<div class="log mono">${rows.map(l => `<div class="ln t-${esc(l.tag)}"><span class="t">${esc(new Date(l.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))}</span><span class="g">${esc(l.tag)}</span><span class="x">${esc(l.text)}</span></div>`).join('') || '<div class="empty">Nothing yet.</div>'}</div>`, 'logp');
  }

  /* ---------- People ---------- */
  function peopleHead(s, now) {
    const groups = Object.keys(STORY.groups).filter(g => !scope() || scope().includes(g));
    const fb = (id, label, col) => `<button class="btn small ghost seg-btn" data-filter="${id}" aria-pressed="${filter === id}"${col ? ` style="--g:${col}"` : ''}>${col ? '<span class="dot"></span>' : ''}${label}</button>`;
    return `<div class="pp-head"><div class="pp-search">${I('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>')}<input class="field" id="pq" placeholder="Search name, role or code word" value="${esc(pq)}" autocomplete="off" aria-label="Search the cast"><kbd>/</kbd></div>
      <div class="filters">${fb('all', 'Everyone')}${groups.map(g => fb(g, esc(STORY.groups[g].name), gcol(g))).join('')}</div></div>`;
  }
  function people(s, now) {
    const q = pq.trim().toLowerCase();
    const list = cast().filter(c => (filter === 'all' || c.group === filter) && (!q || [c.name, c.role, c.code, c.alias || ''].join(' ').toLowerCase().includes(q)));
    const on = list.filter(c => G.online(s, c.id, now)).length;
    return panel(`The cast · ${list.length}`, `<span class="mono">${on}</span> connected`, `<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Name</th><th>Who they are</th><th>Group</th><th>Code word</th><th>NightBank</th><th>Last seen</th><th></th></tr></thead><tbody>
      ${list.map(c => { const p = s.players && s.players[c.id], ns = G.noshow(s, c.id), o = G.online(s, c.id, now); return `<tr class="${ns ? 'gone' : ''}" style="--g:${gcol(c.group)}">
        <td class="stripe"><span class="dot ${o ? 'on' : ''}" title="${o ? 'Connected' : 'Not connected'}"></span></td>
        <td><div class="nm"><span class="ht-av sm">${esc(initials(c.name))}</span><b>${esc(c.name)}</b>${c.key ? ' <span class="chip key" title="The night needs this player">key</span>' : ''}</div></td>
        <td class="mute">${esc(c.role)}</td>
        <td><span class="chip grpchip">${esc(STORY.groups[c.group].name)}</span></td>
        <td class="mono code">${esc(c.code)}</td>
        <td>${(() => { const w = NW.walletOf(c); return w ? `<button class="money-cell" data-nwgrant="${w}" title="Add or take money: ${esc(NW.wname(w))}"><span class="mono">${NW.money(NW.balance(s, w))}</span>${NW.wallets()[w].personal ? '' : `<small>${esc(NW.wname(w))}</small>`}<i>±</i></button>` : '<span class="mute">none</span>'; })()}</td>
        <td class="mute">${ns ? 'No-show' : p ? (o ? '<span class="live-t">online</span>' : ago(p.seen, now)) : 'Never'}${s.fbi && s.fbi.detained && s.fbi.detained[c.id] ? ' <span class="chip bad">detained</span>' : ''}${NW.isOut(s, c.id) ? ' <span class="chip bad">thrown out</span>' : ''}</td>
        <td><div class="acts"><a class="btn small" href="app.html?as=${encodeURIComponent(c.code)}" target="_blank" rel="noopener">Open as</a><button class="btn small" data-msg="${c.id}">Message</button><button class="btn small ghost" data-noshow="${c.id}">${ns ? 'Undo no-show' : 'No-show'}</button><button class="btn small ${NW.isOut(s, c.id) ? '' : 'ghost'}" data-out="${c.id}" title="Thrown out: no vote at the end, and no money moves">${NW.isOut(s, c.id) ? 'Let back in' : 'Throw out'}</button></div></td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">Nobody matches.</td></tr>'}
      </tbody></table></div>`);
  }

  /* ---------- Messages ---------- */
  function composer() {
    const groups = Object.keys(STORY.groups).filter(g => !scope() || scope().includes(g));
    return panel('Send a message to phones', 'their phone buzzes', `<form id="mf" style="display:flex;flex-direction:column;gap:12px">
        <div><label class="lbl" for="mto">To</label><select class="field" id="mto">
          ${scope() ? '' : '<option value="all">Everyone</option>'}
          ${groups.map(g => `<option value="g:${g}">${esc(STORY.groups[g].name)} (group)</option>`).join('')}
          ${cast().slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
        <div><label class="lbl" for="mtx">Message</label><textarea class="field" id="mtx" placeholder="What should they see?"></textarea></div>
        <div class="row"><button class="btn primary" type="submit">Send <kbd>Ctrl Enter</kbd></button><span class="err" id="me" role="alert"></span></div>
      </form>`);
  }
  function sent(s) {
    const rows = Object.values(s.feed || {}).filter(f => G.touches(f.to, scope())).sort((a, b) => b.at - a.at).slice(0, 40);
    return panel(`Sent to phones · ${rows.length}`, '', `<div class="log mono">${rows.map(f => `<div class="ln t-msg"><span class="t">${esc(wallTime(f.at))}</span><span class="g">${esc(G.toLabel(f.to))}</span><span class="x"><b>${esc(f.title)}</b> ${esc(f.text)}</span></div>`).join('') || '<div class="empty">Nothing sent yet.</div>'}</div>`);
  }

  /* ---------- Bebbit (the host sees everything, including removed posts and who really posted) ---------- */
  const hb = { as: 'mod', text: '', photo: null, err: '', show: 'all' };
  const stat = (n, l) => `<div class="stat"><b>${n}</b><small>${l}</small></div>`;
  function bebCompose() {
    const acc = Object.keys(STORY.bebbit.accounts || {});
    return panel('Post to Bebbit', 'appears on every phone instantly', `<form id="bf" style="display:flex;flex-direction:column;gap:12px">
        <div><label class="lbl" for="bas">Post as</label><select class="field" id="bas">
          ${acc.map(a => `<option value="${a}" ${hb.as === a ? 'selected' : ''}>@${esc(STORY.bebbit.accounts[a].name)} (${esc(STORY.bebbit.accounts[a].role)})</option>`).join('')}
          ${STORY.characters.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}" ${hb.as === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
        <div><label class="lbl" for="btx">Post</label><textarea class="field" id="btx" maxlength="500" placeholder="Gossip, a leak, an old photo…">${esc(hb.text)}</textarea></div>
        ${hb.photo ? `<div class="row"><img src="${esc(hb.photo)}" alt="Photo to post" style="width:120px;border-radius:10px"><button type="button" class="btn small" data-act="bunphoto">Remove photo</button></div>` : ''}
        <div class="row" style="flex-wrap:wrap"><label class="btn small">Add photo<input type="file" accept="image/*" id="bph" class="hide"></label><button class="btn primary" type="submit">Post now</button><span class="err" role="alert">${esc(hb.err)}</span></div>
      </form>
      <p class="mute" style="font-size:12px;margin-top:10px">Timed posts (like the archive photo) are set in story.js and appear in Tonight's cue queue.</p>`);
  }
  function bebStats(s) {
    const ps = Bebbit.list(s), pw = STORY.bebbit.powers || {};
    const pc = STORY.bebbit.photoCount && G.byId(STORY.bebbit.photoCount);
    return panel('At a glance', '', `<div class="stats">${stat(ps.filter(p => !p.deleted).length, 'live posts')}${stat(ps.filter(p => p.photo).length, 'photos')}${stat(ps.filter(p => p.deleted).length, 'removed')}${stat(ps.filter(p => p.hacked).length, 'disguised')}</div>
      ${pc ? `<div class="sys" style="margin-top:10px"><div style="flex:1"><b>${esc(pc.name.split(' ')[0])}'s socialite count</b><small>Different people tagged in ${esc(pc.name.split(' ')[0])}'s photos</small></div><span class="bignum mono">${Bebbit.photoCount(s)}</span></div>` : ''}
      ${Object.entries(pw).map(([id, p]) => `<div class="sys"><div style="flex:1"><b>${esc(G.byId(id).name)}</b><small>${Object.entries(p).map(([k, n]) => `${{ delete: 'removals', trace: 'traces', hack: 'disguised posts' }[k] || k}: ${Bebbit.used(s, id, k)} of ${n} used`).join(' · ')}</small></div></div>`).join('')}`);
  }
  function bebList(s) {
    const all = Bebbit.list(s).sort((a, b) => b.at - a.at);
    const ps = all.filter(p => hb.show === 'all' || (hb.show === 'flag' && (p.deleted || p.hacked)) || (hb.show === 'photo' && p.photo));
    const fb = (k, l) => `<button class="btn small ghost seg-btn" data-bshow="${k}" aria-pressed="${hb.show === k}">${l}</button>`;
    return panel(`Every post · ${all.length}`, `<span class="filters">${fb('all', 'All')}${fb('photo', 'Photos')}${fb('flag', 'Removed or disguised')}</span>`,
      ps.map(p => {
        const a = Bebbit.who(p.by), r = Bebbit.who(p.real), img = Bebbit.safeImg(p.photo), tr = s.beb.traces && s.beb.traces[p.id];
        const flags = [p.plant ? '<span class="chip">planted</span>' : '', p.hacked ? `<span class="chip bad">disguised · really ${esc(r.name)}</span>` : '', p.deleted ? `<span class="chip warn">removed by ${esc(G.byId(p.deleted.by) ? G.byId(p.deleted.by).name.split(' ')[0] : 'host')}</span>` : '', tr ? `<span class="chip">traced by ${esc(G.byId(tr.by).name.split(' ')[0])}</span>` : ''].join(' ');
        return `<div class="post ${p.deleted ? 'gone' : ''}">
          <span class="t mono">${esc(wallTime(p.at))}</span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
            <div><b>${esc(Bebbit.shown(a))}</b> ${flags}</div>
            ${p.text ? `<div>${esc(p.text)}</div>` : ''}${img ? `<img src="${esc(img)}" alt="" style="max-width:220px;border-radius:10px">` : ''}
            <div class="mute" style="font-size:12px">${Bebbit.nVotes(s, p.id)} votes · ${Bebbit.comments(s, p.id).length} comments${(p.tags || []).length ? ' · with ' + p.tags.map(t => esc(G.byId(t).name)).join(', ') : ''}</div>
          </div>
          <button class="btn small ${p.deleted ? '' : 'ghost'}" data-bdel="${p.id}">${p.deleted ? 'Restore' : 'Remove'}</button></div>`;
      }).join('') || '<div class="empty">No posts yet.</div>');
  }

  /* ---------- FBI (the host sees every lookup, edit and withdrawn statement) ---------- */
  function fbiLeft(s) {
    const f = s.fbi || {}, sts = Object.values(f.statements || {}), looks = FBI.lookups(s);
    return panel('At a glance', '<button class="btn small" data-act="fbibonus">+1 lookup for the team</button>', `<div class="stats">${stat(FBI.leftN(s) + '/' + FBI.total(s), 'lookups left')}${stat(sts.filter(x => !x.withdrawn).length, 'statements')}${stat(Object.keys(f.warrants || {}).length + '/' + (STORY.fbi.warrants || 0), 'warrants used')}${stat(Object.keys(f.detained || {}).length, 'detained')}</div>`)
      + panel(`Lookups · ${looks.length}`, '', `<div class="log mono">${looks.map(l => `<div class="ln t-cue"><span class="t">${esc(wallTime(l.at))}</span><span class="g">${esc(FBI.first(l.by))}</span><span class="x">"${esc(l.q)}" → ${l.rec ? esc(FBI.rec(l.rec).title) : 'no match'}</span></div>`).join('') || '<div class="empty">No lookups yet.</div>'}</div>`)
      + panel('Warrants and detentions', '', `<div class="log mono">${Object.entries(f.warrants || {}).map(([id, x]) => `<div class="ln t-host"><span class="t">${esc(wallTime(x.at))}</span><span class="g">warrant</span><span class="x">${esc(G.byId(id).name)}</span></div>`).join('')}${Object.entries(f.detained || {}).map(([id, x]) => `<div class="ln t-bad"><span class="t">${esc(wallTime(x.at))}</span><span class="g">detained</span><span class="x">${esc(G.byId(id).name)}</span></div>`).join('') || (Object.keys(f.warrants || {}).length ? '' : '<div class="empty">None yet.</div>')}</div>`);
  }
  function fbiRight(s) {
    const f = s.fbi || {}, sts = Object.entries(f.statements || {}).map(([id, x]) => Object.assign({ id }, x)).sort((a, b) => b.at - a.at);
    const notes = Object.values(f.notes || {}).sort((a, b) => b.at - a.at);
    return panel(`Statement log · ${sts.length}`, 'edits and withdrawals are only visible to you', sts.map(x => `<div class="stmt ${x.withdrawn ? 'gone' : ''}">
        <div class="row between"><span><b>${esc(G.byId(x.subject).name)}</b> <span class="mute">· logged by ${esc(FBI.first(x.by))}</span></span><span class="mono mute" style="font-size:12px">${esc(wallTime(x.at))}</span></div>
        <div class="row" style="gap:6px;flex-wrap:wrap">${x.sworn ? '<span class="chip">sworn</span>' : ''}${x.public ? '<span class="chip ok">released</span>' : ''}${x.withdrawn ? `<span class="chip bad">withdrawn ${esc(wallTime(x.withdrawn))}</span>` : ''}</div>
        <div>"${esc(x.text)}"</div>
        ${(x.edits || []).map(ed => `<div class="mute" style="font-size:12px">Before an edit at ${esc(wallTime(ed.at))}: "${esc(ed.text)}"</div>`).join('')}</div>`).join('') || '<div class="empty">No statements yet.</div>')
      + panel('Team notes', '', `<div class="log mono">${notes.map(n => `<div class="ln t-msg"><span class="t">${esc(wallTime(n.at))}</span><span class="g">${esc(FBI.first(n.by))}</span><span class="x">${esc(n.text)}</span></div>`).join('') || '<div class="empty">None yet.</div>'}</div>`);
  }

  /* ---------- NIGHTWIRE (every wallet, purchase, bid and burner message) ---------- */
  function nwLeft(s) {
    const NWc = STORY.nightwire, n = s.nw || {}, sale = n.sale, bids = Object.values(n.bids || {}).sort((a, b) => b.amt - a.amt);
    /* special accounts first (crew, thief, buyers), then everyone's personal account, richest first */
    const all = NW.wallets(), row = w => {
      const p = NW.pendingState(s, w), fz = NW.frozen(s, w), cfg = NW.fuCfg(w), f = NW.fuOf(s, w);
      /* money tied up: not freed yet · clearing (with "arrive now") · cleared */
      const fu = !cfg ? '' : !f ? ` · ${NW.money(cfg.amt)} tied up` : NW.fuReady(s, f) ? ` · freed ${NW.money(f.amt)}` : ` · freeing ${NW.money(f.amt)}, arrives ${hmm(f.ready)}`;
      return `<div class="sys ${fz ? 'frozen' : ''}"><div style="flex:1;min-width:0"><b>${esc(NW.wname(w))}${fz ? ` <span class="chip bad">frozen · ${esc(fz.by)}</span>` : ''}</b><small>${all[w].personal ? 'Personal account' : esc([].concat(all[w].members).map(m => m.startsWith('g:') ? STORY.groups[m.slice(2)].name : G.byId(m).name).join(', '))}${p ? ` · ${p.void ? 'client payment VOID' : NW.money(p.amount) + ' due on delivery'}` : ''}${fu}</small></div><span class="mono money">${NW.money(NW.balance(s, w))}</span>${f && !NW.fuReady(s, f) ? `<button class="btn small" data-nwfast="${w}" title="Make the freed-up money arrive now">Arrive now</button>` : ''}<button class="btn small ghost" data-nwfreeze="${w}">${fz ? 'Unfreeze' : 'Freeze'}</button><button class="btn small ghost" data-nwgrant="${w}">± money</button></div>`;
    };
    const special = Object.keys(all).filter(w => !all[w].personal), personal = Object.keys(all).filter(w => all[w].personal).sort((a, b) => NW.balance(s, b) - NW.balance(s, a));
    const pct = sale && sale.sold ? Math.min(100, sale.sold.amt / NWc.goal * 100) : 0;
    return panel('Special accounts', 'crew, thief and buyers', special.map(row).join(''))
      + panel(`Everyone's NightBank · ${personal.length}`, 'spending money follows net worth · story.js', `<div class="acct-list">${personal.map(row).join('')}</div>`)
      + panel(`The sale`, `goal <span class="mono">${NW.money(NWc.goal)}</span>`, !sale ? '<div class="empty">The crew hasn\'t opened a sale yet.</div>' : `<div class="deck-n">Asking ${NW.money(sale.ask)} · pitched to ${sale.pitched.map(b => esc(NW.wname(b))).join(', ')}</div>
          <div class="ev-bar" style="margin:10px 0"><i style="width:${pct.toFixed(0)}%"></i></div>
          ${sale.sold ? `<div class="need"><b>SOLD to ${esc(NW.wname(sale.sold.to))} for ${NW.money(sale.sold.amt)}</b><p>${esc(wallTime(sale.sold.at))}</p></div>` : ''}
          <div class="log mono">${bids.map(b => `<div class="ln t-money"><span class="t">${esc(wallTime(b.at))}</span><span class="g">${esc(NW.wname(b.from))}</span><span class="x">bid ${NW.money(b.amt)}</span></div>`).join('') || '<div class="empty">No bids yet.</div>'}</div>`);
  }
  /* the casino, Cameron's loans, freed-up money, freezes and who's been thrown out */
  function moneyGames(s) {
    const cs = STORY.nightwire.casino || {}, st0 = Casino.stats(s), mode = (s.nw || {}).casinoMode || 'auto';
    const loans = NW.loans(s), frozen = Object.entries((s.nw || {}).frozen || {}), out = STORY.characters.filter(c => NW.isOut(s, c.id));
    const st = l => l.status === 'active' ? (NW.isLate(s, l) ? '<span class="chip bad">overdue</span>' : `<span class="chip">due ${hmm(l.due)}</span>`) : `<span class="chip ${l.status === 'paid' ? 'ok' : ''}">${l.status}</span>`;
    const neg = n => (n < 0 ? '−' : '') + NW.money(Math.abs(n));
    const best = st0.best && st0.best.net > 0 ? `${esc(G.byId(st0.best.by) ? G.byId(st0.best.by).name : st0.best.by)} +${NW.money(st0.best.net)} (${st0.best.game})` : 'nobody yet';
    return panel('Money games', `casino ${Casino.isOpen(s) ? '<span class="live-t">open</span>' : 'closed'}`, `
      <div class="mg-mode"><span>Casino</span>${[['auto', 'Follow the clock'], ['open', 'Force open'], ['closed', 'Force closed']].map(([k, l]) => `<button class="btn small ${mode === k ? '' : 'ghost'}" data-csmode="${k}" aria-pressed="${mode === k}">${l}</button>`).join('')}</div>
      <div class="stats mg-stats"><div class="stat"><small>Rounds</small><b>${st0.rounds}${st0.open ? ` <em>+${st0.open} live</em>` : ''}</b></div><div class="stat"><small>Wagered</small><b>${NW.money(st0.wagered)}</b></div><div class="stat"><small>House net</small><b>${neg(st0.houseNet)}</b></div><div class="stat"><small>To ${esc(G.byId(cs.beneficiary) ? G.byId(cs.beneficiary).name.split(' ')[0] : 'foundation')}</small><b>${NW.money(st0.foundation)}</b></div><div class="stat"><small>Harper's fee</small><b>${NW.money(st0.fee)}</b></div></div>
      <div class="mg-games">${st0.games.map(x => `<span><b>${x.g === 'dice' ? 'Lucky dice' : x.g[0].toUpperCase() + x.g.slice(1)}</b> ${x.n} rounds · house ${neg(x.house)}</span>`).join('')}<span><b>Biggest win</b> ${best}</span></div>
      <div class="mg-h">Loans · ${loans.length}</div>
      ${loans.map(l => `<div class="sys"><div style="flex:1;min-width:0"><b>${esc(NW.bname(l))} · ${NW.money(l.amt)} at ${l.rate}%</b><small>repays ${NW.money(l.owed)}${l.court ? ' · frozen by court order' : ''}${l.named ? ' · named publicly' : ''}</small></div>${st(l)}</div>`).join('') || '<div class="empty">No loans yet.</div>'}
      <div class="mg-h">Frozen accounts · ${frozen.length}</div>
      ${frozen.map(([w, f]) => `<div class="sys"><div style="flex:1;min-width:0"><b>${esc(NW.wname(w))}</b><small>${esc(NW.FROZE[f.by] || f.by)} · ${esc(wallTime(f.at))}</small></div><button class="btn small ghost" data-nwfreeze="${w}">Unfreeze</button></div>`).join('') || '<div class="empty">None.</div>'}
      <div class="mg-h">Thrown out · ${out.length}</div>
      ${out.map(c => `<div class="sys"><div style="flex:1;min-width:0"><b>${esc(c.name)}</b><small>no vote, no money moves</small></div><button class="btn small ghost" data-out="${c.id}">Let back in</button></div>`).join('') || '<div class="empty">Nobody. Throw someone out from People.</div>'}`);
  }
  function nwRight(s) {
    const n = s.nw || {}, chat = Object.values(n.chat || {}).sort((a, b) => b.at - a.at).slice(0, 40);
    const buys = NW.txs(s).filter(t => t.to === 'market'), rest = NW.txs(s).filter(t => t.to !== 'market' && t.from !== 'casino' && t.to !== 'casino');
    return moneyGames(s) + panel(`Market purchases · ${buys.length}`, '', `<div class="log mono">${buys.map(t => `<div class="ln t-money"><span class="t">${esc(wallTime(t.at))}</span><span class="g">${esc(G.byId(t.by) ? G.byId(t.by).name.split(' ')[0] : t.by)}</span><span class="x">"${esc(t.memo)}" · ${NW.money(t.amt)} from ${esc(NW.wname(t.from))}</span></div>`).join('') || '<div class="empty">Nothing bought yet.</div>'}</div>`)
      + panel(`NightBank transfers · ${rest.length}`, '', `<div class="log mono">${rest.map(t => `<div class="ln t-money"><span class="t">${esc(wallTime(t.at))}</span><span class="g">${esc(NW.wname(t.from))}</span><span class="x">→ ${esc(NW.wname(t.to))} ${NW.money(t.amt)}${t.memo ? ` "${esc(t.memo)}"` : ''}</span></div>`).join('') || '<div class="empty">No transfers yet.</div>'}</div>`)
      + panel('Crew burner chat', '', `<div class="log mono">${chat.map(m => `<div class="ln t-join"><span class="t">${esc(wallTime(m.at))}</span><span class="g">${esc(G.byId(m.by).name.split(' ')[0])}</span><span class="x">${esc(m.text)}</span></div>`).join('') || '<div class="empty">Quiet.</div>'}</div>`);
  }

  /* ---------- RSVPs (main host only; replies from rsvp.html, never deleted) ---------- */
  const rv = { q: '', show: 'all' };
  const RV = {
    reply: { yes: 'Coming', maybe: 'Maybe', no: 'Not coming' },
    size: { lead: 'Lead', support: 'Supporting', cameo: 'Cameo' },
    world: { guest: 'Guest', fbi: 'FBI', crew: 'Art crew', staff: 'Staff', any: 'Surprise me' }
  };
  const rsvps = s => Object.entries(s.rsvp || {}).map(([id, r]) => Object.assign({ id }, r)).sort((a, b) => b.at - a.at);
  function rsvpHead(s) {
    const all = rsvps(s), live = all.filter(r => !r.archived), n = k => live.filter(r => r.reply === k).length;
    const coming = live.filter(r => r.reply !== 'no'), cnt = (f, v) => coming.filter(r => r[f] === v).length;
    const castN = coming.filter(r => r.cast).length, noPhone = coming.filter(r => r.phone === 'no').length;
    const fb = (k, l) => `<button class="btn small ghost seg-btn" data-rvshow="${k}" aria-pressed="${rv.show === k}">${l}</button>`;
    return panel('Replies', `<a class="btn small" href="rsvp.html" target="_blank" rel="noopener">Open the invitation page</a> <button class="btn small" data-act="rvcsv">Download spreadsheet</button>`, `
      <div class="stats"><div class="stat"><small>Coming</small><b>${n('yes')}</b></div><div class="stat"><small>Maybe</small><b>${n('maybe')}</b></div><div class="stat"><small>Not coming</small><b>${n('no')}</b></div><div class="stat"><small>Cast so far</small><b>${castN}<em class="rv-of"> / ${coming.length}</em></b></div></div>
      <div class="mg-games rv-tally"><span><b>Part</b> ${Object.entries(RV.size).map(([k, l]) => `${l} ${cnt('size', k)}`).join(' · ')}</span><span><b>Wants</b> ${Object.entries(RV.world).map(([k, l]) => `${l} ${cnt('world', k)}`).join(' · ')}</span>${noPhone ? `<span class="warn-t"><b>No phone</b> ${noPhone}: plan a paper version for them</span>` : ''}</div>
      <div class="pp-head rv-head2"><div class="pp-search">${I('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>')}<input class="field" id="rvq" placeholder="Search names, emails, notes" value="${esc(rv.q)}" autocomplete="off" aria-label="Search replies"></div>
        <div class="filters">${fb('all', 'All')}${fb('yes', 'Coming')}${fb('maybe', 'Maybe')}${fb('no', 'Not coming')}${fb('uncast', 'Not cast yet')}${fb('archived', 'Archived')}</div></div>`);
  }
  function rsvpList(s) {
    const all = rsvps(s), q = rv.q.trim().toLowerCase();
    const taken = {}; all.forEach(r => { if (r.cast && !r.archived) taken[r.cast] = r.id; });
    const dupe = r => all.filter(x => x.id !== r.id && !x.archived && (x.first + ' ' + x.last).toLowerCase() === (r.first + ' ' + r.last).toLowerCase()).length > 0;
    const list = all.filter(r => (rv.show === 'archived' ? r.archived : !r.archived) && (rv.show === 'all' || rv.show === 'archived' || (rv.show === 'uncast' ? r.reply !== 'no' && !r.cast : r.reply === rv.show))
      && (!q || [r.first, r.last, r.email, r.with, r.notes].join(' ').toLowerCase().includes(q)));
    const chars = STORY.characters.slice().sort((a, b) => a.name.localeCompare(b.name));
    const pick = r => r.reply === 'no' ? '<span class="mute">—</span>' : `<select class="field rv-cast" data-rvcast="${r.id}" aria-label="Cast ${esc(r.first)} as"><option value="">Not cast</option>${Object.keys(STORY.groups).map(g => `<optgroup label="${esc(STORY.groups[g].name)}">${chars.filter(c => c.group === g).map(c => `<option value="${c.id}" ${r.cast === c.id ? 'selected' : ''} ${taken[c.id] && taken[c.id] !== r.id ? 'disabled' : ''}>${esc(c.name)}${taken[c.id] && taken[c.id] !== r.id ? ' (taken)' : ''}</option>`).join('')}</optgroup>`).join('')}</select>${r.cast && G.byId(r.cast) ? `<small class="mono rv-code">${esc(G.byId(r.cast).code)}</small>` : ''}`;
    return panel(`${rv.show === 'archived' ? 'Archived replies' : 'Every reply'} · ${list.length}`, 'never deleted; changes keep the earlier version', `<div class="tbl-wrap"><table class="tbl rv-tbl"><thead><tr><th>Name</th><th>Reply</th><th>Part</th><th>Wants</th><th>Phone</th><th>Email</th><th>Notes</th><th>Character</th><th>Replied</th><th></th></tr></thead><tbody>
      ${list.map(r => `<tr class="${r.archived ? 'gone' : ''}"><td><b>${esc(r.first)} ${esc(r.last)}</b>${r.updated ? ` <span class="chip" title="Changed ${(r.history || []).length} time(s)">changed</span>` : ''}${dupe(r) ? ' <span class="chip bad">same name twice?</span>' : ''}</td>
        <td><span class="chip ${r.reply === 'yes' ? 'ok' : r.reply === 'no' ? 'bad' : ''}">${RV.reply[r.reply] || ''}</span></td>
        <td>${RV.size[r.size] || '<span class="mute">—</span>'}</td><td>${RV.world[r.world] || '<span class="mute">—</span>'}</td>
        <td>${r.phone === 'no' ? '<span class="chip bad">no phone</span>' : r.phone ? 'Yes' : '<span class="mute">—</span>'}</td>
        <td class="mute">${r.email ? esc(r.email) : '—'}</td>
        <td class="rv-notes">${r.with ? `<div><b>With:</b> ${esc(r.with)}</div>` : ''}${r.notes ? `<div>${esc(r.notes)}</div>` : ''}${!r.with && !r.notes ? '<span class="mute">—</span>' : ''}</td>
        <td><div class="rv-castcell">${pick(r)}</div></td>
        <td class="mute">${esc(new Date(r.updated || r.at).toLocaleDateString([], { month: 'short', day: 'numeric' }))}</td>
        <td><button class="btn small ghost" data-rvarch="${r.id}">${r.archived ? 'Restore' : 'Archive'}</button></td></tr>`).join('') || `<tr><td colspan="10" class="empty">${all.length ? 'Nobody matches.' : 'No replies yet. Share the invitation page to collect them.'}</td></tr>`}
      </tbody></table></div>`);
  }
  /** Everything as a spreadsheet (archived replies included, marked). */
  function rsvpCSV() {
    const s = DB.get(), cell = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const rows = [['First', 'Last', 'Reply', 'Part', 'Wants to play', 'Phone', 'Email', 'Storyline with', 'Notes', 'Character', 'Code word', 'Replied', 'Changed', 'Archived']]
      .concat(rsvps(s).map(r => [r.first, r.last, RV.reply[r.reply], RV.size[r.size], RV.world[r.world], r.phone, r.email, r.with, r.notes, r.cast && G.byId(r.cast) ? G.byId(r.cast).name : (r.cast || ''), r.cast && G.byId(r.cast) ? G.byId(r.cast).code : '', new Date(r.at).toLocaleString(), r.updated ? new Date(r.updated).toLocaleString() : '', r.archived ? 'yes' : '']));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv' }));
    a.download = 'Vanishing Hour RSVPs.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Spreadsheet downloaded');
  }

  /* ---------- Setup ---------- */
  function setupLen(s) {
    return panel('Phase lengths (minutes)', `total <span class="mono">${hmm(Clock.startOf(s, STORY.phases.length))}</span>`,
      STORY.phases.map((p, i) => `<div class="setrow"><label for="len_${p.id}"><span class="mono dim">${hmm(Clock.startOf(s, i))}</span> ${esc(p.name)}</label><input class="field mono" id="len_${p.id}" data-len="${p.id}" type="number" min="1" max="120" value="${Clock.mins(s, i)}"></div>`).join('')
      + `<p class="mute" style="font-size:12px;margin-top:8px">A change applies the next time that phase starts.</p>`);
  }
  function setupTools(s, r) {
    return panel('Clock', '', `<label class="check"><input type="checkbox" data-set="auto" ${Clock.auto(s) ? 'checked' : ''}><span>Move to the next phase by itself when time runs out</span></label>
        <div class="setrow"><label for="spd">Test speed (1 = real time; 60 = one minute per second)</label><select class="field" id="spd" data-set="speed">${[1, 10, 30, 60].map(v => `<option value="${v}" ${Clock.speed(s) === v ? 'selected' : ''}>×${v}</option>`).join('')}</select></div>
        <div class="setrow"><label for="jump">Jump to a phase</label><select class="field" id="jump" data-set="jump"><option value="">Choose…</option>${STORY.phases.map((p, i) => `<option value="${i}">${esc(p.short)}</option>`).join('')}</select></div>`)
      + panel('Doors', 'any code word works at any door', [['index.html', 'The gala (front door for everyone)'], ['fbi/', 'FBI Headquarters'], ['bebbit/', 'Bebbit'], ['nightwire/', 'NIGHTWIRE']].map(d => `<div class="sys"><div style="flex:1;min-width:0"><b>${d[1]}</b><small class="mono">${esc(new URL(d[0], location.href).href)}</small></div><a class="btn small" href="${d[0]}" target="_blank" rel="noopener">Open</a></div>`).join(''))
      + panel('Host codes', '', STORY.hosts.map(h => `<div class="sys"><div style="flex:1"><b>${esc(h.label)}</b><small>${h.groups ? 'Sees only: ' + h.groups.map(g => esc(STORY.groups[g].name)).join(', ') : 'Sees everything'}</small></div><span class="mono code">${esc(h.code)}</span></div>`).join(''))
      + panel('Start over', '', `<p class="deck-n" style="margin-bottom:12px">Clears the clock, messages, sign-ins and the activity log on this computer. The story file isn't touched.</p><button class="btn danger" data-act="reset">Reset the night</button>`, 'danger-zone');
  }

  /* ---------- keyboard shortcuts sheet ---------- */
  function keysSheet() {
    const k = (keys, what) => `<div><span>${keys.map(x => `<kbd>${x}</kbd>`).join(' ')}</span><span>${what}</span></div>`;
    return `<div class="ht-keys-card" role="dialog" aria-label="Keyboard shortcuts"><div class="card-h"><span>Keyboard shortcuts</span><button class="btn small ghost" data-act="keys">Close <kbd>Esc</kbd></button></div>
      <div class="ht-keys-grid">${k(['Space'], 'Pause / resume (or start the night)')}${k(['+'], 'Add 5 minutes to this phase')}${k(['−'], 'Take away 1 minute')}${k(['N'], 'Next phase')}${k(['B'], 'Back one phase')}${k(['M'], 'Type a quick message')}${k(['/'], 'Search the cast')}${k(['1', '…', '7'], 'Switch section')}${k(['Ctrl', 'Enter'], 'Send a message')}${k(['P'], 'Hide the screen (privacy blur)')}${k(['Esc'], 'Leave a text box')}${k(['?'], 'Show this sheet')}</div>
      <p class="mute" style="font-size:12px;margin-top:12px">Shortcuts never fire while you're typing in a box. Next and Back always ask first.</p></div>`;
  }

  /* ---------- page ---------- */
  function shell() {
    root.innerHTML = `<div class="ht" id="ht"><aside class="ht-rail" id="rail"></aside><div class="ht-body"><header class="ht-bar" id="top"></header><main class="h-wrap" id="wrap"></main></div></div><div class="ht-toast" id="toast" role="status" aria-live="polite"></div><div class="ht-keys" id="keys" hidden></div>
      <div class="ht-privacy" id="privacy" hidden><button data-act="privacy" aria-label="Show the screen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.5-2.7 3.8M6.5 6.6C4.4 7.9 2.8 10 2 12c1 2.5 5 7 10 7 1.8 0 3.5-.6 5-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg><b>Screen hidden</b><small>Press <kbd>P</kbd> or click to show it again</small></button></div>`;
    setPrivate(sessionStorage.getItem('vh:private') === '1');
    render();
  }
  /* privacy: blur the whole terminal when someone walks behind you. The clock keeps running underneath. */
  function setPrivate(on) {
    document.body.classList.toggle('ht-private', on);
    const p = $('#privacy'); if (p) p.hidden = !on;
    try { sessionStorage.setItem('vh:private', on ? '1' : '0'); } catch (e) { /* private mode */ }
    if (on && document.activeElement) document.activeElement.blur();
  }
  /* don't redraw while a finger or mouse button is down, or the tap would be lost */
  let holding = false;
  document.addEventListener('pointerdown', () => { holding = true; });
  ['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => { holding = false; setTimeout(render, 0); }));
  /* briefly add a class to the page (entrances, the phase-change flash) */
  function pulse(cls, ms) { const w = $('#wrap'); if (!w) return; w.classList.remove(cls); void w.offsetWidth; w.classList.add(cls); setTimeout(() => w.classList.remove(cls), ms); }
  const col = (id, extra) => `<div id="${id}" class="col"${extra || ''}></div>`;
  /* leave a section alone while someone is typing in it */
  const keep = id => { const el = $('#' + id), a = document.activeElement; return !!(el && a && el.contains(a) && a.matches('input, textarea, select')); };
  let lastPhase = null;
  function render() {
    if (!ME || !$('#wrap') || holding) return;
    const s = DB.get(), now = Date.now(), r = Clock.read(s, now);
    if (lastPhase !== null && lastPhase !== r.i) { setTimeout(() => pulse('flash', 1700), 0); if (r.phase) toast('Now: ' + r.phase.name, 'gold'); }
    lastPhase = r.i;
    patch($('#rail'), rail(s, r, now));
    patch($('#top'), top(s, r, now));
    const w = $('#wrap');
    if (w.dataset.view !== tab) {
      w.dataset.view = tab;
      w.innerHTML = tab === 'tonight' ? `<div id="t0"></div><div class="h-cols"><div class="h-main">${col('t1')}</div><div class="h-side">${col('t2')}${col('t3')}${col('t4')}</div></div>`
        : tab === 'people' ? `${col('p0')}${col('p1')}`
        : tab === 'rsvps' ? `${col('p1')}${col('p2')}`
        : tab === 'bebbit' ? `<div class="grid2"><div class="col">${col('p1')}${col('p3')}</div>${col('p2')}</div>`
        : `<div class="grid2">${col('p1')}${col('p2')}</div>`;
      if (tab === 'tonight') patch($('#t3'), quickMsg());
      if (tab === 'people') patch($('#p0'), peopleHead(s, now));
    }
    if (tab === 'tonight') { patch($('#t0'), track(s, r)); patch($('#t1'), deck(s, r) + cuesCard(s, r) + evidence(s)); patch($('#t2'), needs(s, r, now)); patch($('#t4'), groupCards(s, now) + systems(s, now) + activity(s)); }
    else if (tab === 'people') { if (!keep('p0')) patch($('#p0'), peopleHead(s, now)); patch($('#p1'), people(s, now)); }
    else if (tab === 'messages') { if (!keep('p1')) patch($('#p1'), composer()); patch($('#p2'), sent(s)); }
    else if (tab === 'fbi') { patch($('#p1'), fbiLeft(s)); patch($('#p2'), fbiRight(s)); }
    else if (tab === 'nightwire') { patch($('#p1'), nwLeft(s)); patch($('#p2'), nwRight(s)); }
    else if (tab === 'bebbit') { if (!keep('p1')) patch($('#p1'), bebCompose()); patch($('#p3'), bebStats(s)); patch($('#p2'), bebList(s)); }
    else if (tab === 'rsvps') { if (!keep('p1')) patch($('#p1'), rsvpHead(s)); patch($('#p2'), rsvpList(s)); }
    else if (tab === 'setup') { if (!document.activeElement || !document.activeElement.matches('[data-len]')) patch($('#p1'), setupLen(s)); patch($('#p2'), setupTools(s, r)); }
  }
  function go(t) { if (tab === t) return; tab = t; render(); pulse('enter', 800); }

  /* every button and every shortcut ends up here */
  function act(a) {
    const s = DB.get(), r = Clock.read(s);
    if (a === 'start') { if (r.state !== 'before' || ME.role !== 'main') return; Clock.start(0); toast('The night has started', 'gold'); }
    else if (a === 'pause') { if (r.state !== 'live') return; Clock.pause(); toast('Clock paused', 'warn'); }
    else if (a === 'resume') { if (r.state !== 'paused') return; Clock.resume(); toast('Clock running'); }
    else if (a === 'add5') { if (!isLive(r)) return; Clock.add(5); toast('+5 minutes on this phase'); }
    else if (a === 'sub1') { if (!isLive(r)) return; Clock.add(-1); toast('−1 minute on this phase'); }
    else if (a === 'next') { if (ME.role !== 'main' || r.state === 'over') return; const nx = STORY.phases[Math.max(-1, r.i) + 1]; if (Ask.sure(nx ? `Move to "${nx.name}" now?` : 'End the night now?', () => act('next'), { title: 'The clock', ok: nx ? 'Move on' : 'End the night' })) { Clock.start(Math.max(-1, r.i) + 1); } }
    else if (a === 'back') { if (ME.role !== 'main' || !(r.i > 0)) return; if (Ask.sure('Go back and restart the previous phase? Its cues will be sent again.', () => act('back'), { title: 'The clock', ok: 'Go back' })) Clock.start(r.i - 1); }
    else if (a === 'reset') { if (Ask.sure('Reset the whole night on this computer? This clears the clock, messages and sign-ins.', () => act('reset'), { title: 'Reset', ok: 'Reset everything', danger: true })) { DB.reset(); toast('The night was reset'); } }
    else if (a === 'fbibonus') { const u = { 'fbi/bonus': ((s.fbi && s.fbi.bonus) || 0) + 1 }; Clock.log(u, 'host', 'Gave the FBI one extra lookup.'); DB.update(u); toast('The FBI got one extra lookup'); }
    else if (a === 'privacy') setPrivate(!document.body.classList.contains('ht-private'));
    else if (a === 'keys') { const k = $('#keys'); if (k.hidden) { k.innerHTML = keysSheet(); k.hidden = false; } else k.hidden = true; }
    else if (a === 'signout') { Session.signOut(); ME = null; login(); }
  }

  function hostClick(e) {
    if (!ME || Ask.isOpen()) return;
    const q = sel => e.target.closest(sel);
    let t;
    if (e.target.id === 'keys') { $('#keys').hidden = true; return; }
    if ((t = q('[data-filter]'))) { filter = t.dataset.filter; if (t.dataset.tab) { tab = t.dataset.tab; pulse('enter', 800); } $('#p0') && ($('#p0')._html = null); return render(); }
    if ((t = q('[data-tab]'))) return go(t.dataset.tab);
    if ((t = q('[data-jump]'))) { const i = Number(t.dataset.jump), r = Clock.read(DB.get()); if (i === r.i && isLive(r)) return; if (Ask.sure(`Jump to "${STORY.phases[i].name}" and start it now?`, () => hostClick(e), { title: 'The clock', ok: 'Jump there' })) Clock.start(i); return; }
    if ((t = q('[data-cue]'))) { const [i, j] = t.dataset.cue.split(':').map(Number), u = {}; Clock.cue(u, STORY.phases[i], j); DB.update(u); return toast('Cue sent'); }
    if ((t = q('[data-clue]'))) { const n = t.dataset.clue, s = DB.get(), on = !(s.clues && s.clues[n]); DB.update({ ['clues/' + n]: on ? { at: Date.now() } : null }); return toast(`${n} ${on ? 'marked found' : 'unmarked'}`); }
    if ((t = q('[data-noshow]'))) { const id = t.dataset.noshow, on = !G.noshow(DB.get(), id), u = { ['cast/' + id + '/noshow']: on ? true : null }; Clock.log(u, 'host', G.byId(id).name + (on ? ' marked no-show.' : ' is back (no-show undone).')); DB.update(u); return toast(G.byId(id).name + (on ? ' marked no-show' : ' is back')); }
    if ((t = q('[data-nwgrant]'))) {
      const w = t.dataset.nwgrant;
      return Ask.input(`How much should go into ${NW.wname(w)}? Type a minus sign to take money out (for example -5000, or 2.5M).`, '10000', v => {
      const neg = /^\s*-/.test(v), amt = (neg ? -1 : 1) * NW.amount(String(v).replace(/^\s*-/, ''));
      if (!amt) return toast('No change: that amount wasn\'t a number', 'warn');
      const u = { ['nw/tx/' + uid('t')]: amt > 0 ? { from: 'host', to: w, amt, memo: 'Host adjustment', by: 'host', at: Date.now() } : { from: w, to: 'host', amt: -amt, memo: 'Host adjustment', by: 'host', at: Date.now() } };
      /* the account holder's phone gets a bank notice, like a real deposit or charge */
      NW.membersOf(w).forEach(id => { u['feed/' + uid('w')] = { to: [id], title: 'NightBank', text: amt > 0 ? `${NW.money(amt)} was deposited to your account.` : `${NW.money(-amt)} was withdrawn from your account.`, at: Date.now(), kind: 'nw' }; });
      Clock.log(u, 'host', `${amt > 0 ? 'Added' : 'Removed'} ${NW.money(Math.abs(amt))} ${amt > 0 ? 'to' : 'from'} ${NW.wname(w)}.`); DB.update(u); toast(`${amt > 0 ? '+' : '−'}${NW.money(Math.abs(amt))} · ${NW.wname(w)}`);
      }, { title: 'NightBank', ok: 'Apply' });
    }
    if ((t = q('[data-nwfreeze]'))) {
      const w = t.dataset.nwfreeze, s = DB.fresh(), fz = NW.frozen(s, w), u = {};
      if (!fz && !Ask.sure(`Freeze ${NW.wname(w)}? They can still receive money, but can't send, bid, bet or borrow.`, () => hostClick(e), { title: 'NightBank', ok: 'Freeze', danger: true })) return;
      if (fz) NW.unfreeze(u, w, 'host'); else NW.freeze(u, w, 'host', null);
      DB.update(u); return toast(`${NW.wname(w)} ${fz ? 'unfrozen' : 'frozen'}`);
    }
    if ((t = q('[data-csmode]'))) {
      const m = t.dataset.csmode, u = { 'nw/casinoMode': m === 'auto' ? null : m };
      Clock.log(u, 'host', m === 'auto' ? 'The casino follows the clock again.' : `Casino forced ${m}.`);
      if (m !== 'auto') u['feed/' + uid('m')] = { to: ['all'], title: 'The Saint-Clair Casino', text: m === 'open' ? 'The tables are open. Find the Casino in your NightBank.' : 'The tables are closed for now.', at: Date.now(), kind: 'msg' };
      DB.update(u); return toast(m === 'auto' ? 'Casino follows the clock' : `Casino ${m}`);
    }
    if ((t = q('[data-nwfast]'))) { const w = t.dataset.nwfast, u = {}; NW.arriveNow(u, w); DB.update(u); return toast(`${NW.wname(w)}: freed-up money arrived`); }
    if ((t = q('[data-out]'))) {
      const id = t.dataset.out, c = G.byId(id), on = !NW.isOut(DB.get(), id);
      if (on && !Ask.sure(`Throw ${c.name} out of the gala? They won't get a vote at the end, and they can't move money for the rest of the night.`, () => hostClick(e), { title: 'Thrown out', ok: 'Throw out', danger: true })) return;
      const u = { ['cast/' + id + '/out']: on ? { at: Date.now() } : null };
      u['feed/' + uid('m')] = { to: [id], title: on ? 'Thrown out' : 'Welcome back', text: on ? "You've been thrown out of the gala. You won't get a vote at the end, and your NightBank is locked for the rest of the night. Stay in character." : "You're back in the gala. Your vote and your NightBank are restored.", at: Date.now(), kind: 'msg' };
      Clock.log(u, 'host', `${c.name} ${on ? 'was thrown out of the gala' : 'was let back in'}.`);
      DB.update(u); return toast(`${c.name} ${on ? 'thrown out' : 'let back in'}`);
    }
    if ((t = q('[data-rvshow]'))) { rv.show = t.dataset.rvshow; $('#p1')._html = null; return render(); }
    if ((t = q('[data-rvarch]'))) {
      const id = t.dataset.rvarch, r0 = DB.get().rsvp[id], on = !r0.archived, u = { ['rsvp/' + id + '/archived']: on ? Date.now() : null };
      Clock.log(u, 'host', `RSVP from ${r0.first} ${r0.last} ${on ? 'archived' : 'restored'}.`); DB.update(u); return toast(on ? 'Archived (not deleted)' : 'Restored');
    }
    if (q('[data-act="rvcsv"]')) return rsvpCSV();
    if ((t = q('[data-bshow]'))) { hb.show = t.dataset.bshow; return render(); }
    if ((t = q('[data-bdel]'))) {
      const id = t.dataset.bdel, p = DB.get().beb.posts[id], u = {};
      u['beb/posts/' + id + '/deleted'] = p.deleted ? null : { by: 'host', at: Date.now() };
      Clock.log(u, 'host', (p.deleted ? 'Restored' : 'Removed') + ' a Bebbit post by ' + Bebbit.shown(Bebbit.who(p.by)) + '.');
      DB.update(u); return toast(p.deleted ? 'Post restored' : 'Post removed');
    }
    if ((t = q('[data-act="bunphoto"]'))) { hb.photo = null; $('#p1')._html = null; return render(); }
    if ((t = q('[data-msg]'))) { tab = 'messages'; render(); $('#mto').value = t.dataset.msg; $('#mtx').focus(); return; }
    if ((t = q('[data-act]'))) act(t.dataset.act);
  }
  document.addEventListener('click', hostClick);

  /* keyboard: never while typing in a box */
  document.addEventListener('keydown', e => {
    if (!ME || !$('#wrap')) return;
    const el = e.target, typing = el.closest && el.closest('input, textarea, select, [contenteditable]');
    if (typing) {
      if (e.key === 'Escape') el.blur();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && el.id === 'mtx') { e.preventDefault(); $('#mf').requestSubmit(); }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key, tabs = tabList(), r = Clock.read(DB.get());
    /* P works first, and while the screen is hidden every other key is ignored */
    if (k === 'p' || k === 'P') { e.preventDefault(); return act('privacy'); }
    if (document.body.classList.contains('ht-private')) return;
    if (k === 'Escape') { $('#keys').hidden = true; return; }
    if (/^[1-9]$/.test(k) && tabs[Number(k) - 1]) { e.preventDefault(); return go(tabs[Number(k) - 1][0]); }
    if (k === ' ') { e.preventDefault(); if (r.state === 'live') act('pause'); else if (r.state === 'paused') act('resume'); else if (r.state === 'before' && ME.role === 'main' && !Ask.isOpen()) Ask.sure('Start the night now?', () => act('start'), { title: 'The clock', ok: 'Start the night' }); return; }
    if (k === '+' || k === '=' || e.code === 'Equal' || e.code === 'NumpadAdd') return act('add5');
    if (k === '-' || k === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract') return act('sub1');
    if (k === 'n' || k === 'N') return act('next');
    if (k === 'b' || k === 'B') return act('back');
    if (k === '?') return act('keys');
    if (k === 'm' || k === 'M') { e.preventDefault(); go('tonight'); const f = $('#qtx'); if (f) f.focus(); return; }
    if (k === '/') { e.preventDefault(); go('people'); const f = $('#pq'); if (f) f.focus(); }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'btx') hb.text = e.target.value;
    if (e.target.id === 'pq') { pq = e.target.value; render(); }
    if (e.target.id === 'rvq') { rv.q = e.target.value; render(); }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'bas') { hb.as = t.value; return; }
    if (t.matches('[data-rvcast]')) {
      /* cast a guest who replied as a character (the code word goes on their printed invitation) */
      const id = t.dataset.rvcast, ch = t.value || null, r0 = (DB.get().rsvp || {})[id], u = { ['rsvp/' + id + '/cast']: ch };
      Clock.log(u, 'host', ch ? `Cast ${r0.first} ${r0.last} as ${G.byId(ch).name}.` : `Uncast ${r0.first} ${r0.last}.`);
      DB.update(u); return toast(ch ? `Cast as ${G.byId(ch).name}` : 'Casting cleared');
    }
    if (t.id === 'bph') { const f = t.files && t.files[0]; if (f) Bebbit.shrink(f).then(src => { hb.photo = src; hb.err = ''; }).catch(err => { hb.err = err.message; }).then(() => { $('#p1')._html = null; document.activeElement.blur(); render(); }); return; }
    if (t.matches('[data-todo]')) DB.update({ ['todo/' + t.dataset.todo]: t.checked ? true : null });
    else if (t.matches('[data-len]')) { const v = Math.round(Number(t.value)); if (v >= 1 && v <= 120) { DB.update({ ['setup/len/' + t.dataset.len]: v }); toast('Phase length saved'); } }
    else if (t.matches('[data-set="auto"]')) { DB.update({ 'setup/auto': t.checked }); toast(t.checked ? 'Auto-advance on' : 'Auto-advance off'); }
    else if (t.matches('[data-set="speed"]')) {
      /* keep the game clock where it is when the speed changes mid-phase */
      const s = DB.fresh(), k = Clock.speed(s) / Number(t.value), c = s.clock, u = { 'setup/speed': Number(t.value) };
      if (c && c.i >= 0 && c.i < STORY.phases.length) { const at = c.paused ? c.pausedAt : Date.now(); u['clock/len'] = c.len * k; u['clock/startedAt'] = at - (at - c.startedAt) * k; }
      DB.update(u); toast(Number(t.value) > 1 ? `Test speed ×${t.value}` : 'Real-time clock');
    }
    else if (t.matches('[data-set="jump"]') && t.value !== '') { const i = Number(t.value); t.value = ''; Ask.sure('Jump to "' + STORY.phases[i].name + '" and start it now?', () => Clock.start(i), { title: 'The clock', ok: 'Jump there' }); }
  });
  document.addEventListener('submit', e => {
    if (e.target.id === 'bf') {
      e.preventDefault();
      hb.text = $('#btx').value.trim(); hb.as = $('#bas').value;
      if (!hb.text && !hb.photo) { hb.err = 'Write something or add a photo.'; $('#p1')._html = null; document.activeElement.blur(); return render(); }
      const u = {}; Bebbit.post(u, { by: hb.as, text: hb.text, photo: hb.photo, plant: true });
      hb.err = DB.update(u) ? '' : "Couldn't save. The photo may be too large for this test computer.";
      if (!hb.err) { hb.text = ''; hb.photo = null; toast('Posted to Bebbit'); }
      $('#p1')._html = null; document.activeElement.blur(); return render();
    }
    if (e.target.id === 'qf') {
      e.preventDefault();
      const text = $('#qtx').value.trim(); if (!text) return $('#qtx').focus();
      const to = $('#qto').value;
      sendMessage(to, text, ME.role === 'main' ? 'From the host' : 'From your handler');
      $('#qtx').value = ''; return toast('Sent to ' + G.toLabel(to));
    }
    if (e.target.id !== 'mf') return;
    e.preventDefault();
    const text = $('#mtx').value.trim();
    if (!text) { $('#me').textContent = 'Write a message first.'; return; }
    sendMessage($('#mto').value, text, ME.role === 'main' ? 'From the host' : 'From your handler');
    $('#mtx').value = ''; $('#me').textContent = ''; toast('Sent to ' + G.toLabel($('#mto').value));
  });

  if (ME) shell(); else login();
  DB.on(render);
  setInterval(() => { if (ME) { Clock.tick(); render(); } }, 500);
})();
