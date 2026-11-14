/* =====================================================================
   THE VANISHING HOUR — the player app.
   One app, three looks. Who you are decides which world you see:
   FBI Headquarters, Bebbit or NIGHTWIRE. This is the shell: sign-in,
   the phase clock, your alerts from the host, Who's Who and your file.
   Each world's own tools plug into the "world" tab.
   ===================================================================== */
(function () {
  /* host "Open as" links: app.html?as=CODE */
  const as = new URLSearchParams(location.search).get('as');
  /* the host terminal's live view: app.html?watch=CODE shows that player's phone exactly as they see it,
     without signing anyone in here and without counting as them being online */
  const watch = new URLSearchParams(location.search).get('watch'), watched = watch && G.byCode(watch);
  if (watched) { Session.player = () => watched; document.documentElement.classList.add('watching'); }
  else if (as) { Session.signIn(as); history.replaceState(null, '', location.pathname); }

  const ME = Session.player();
  if (!ME) { location.replace(ROOT + 'gala/'); return; }

  const WORLD = G.door(ME), W = STORY.worlds[WORLD];
  document.body.dataset.world = WORLD;
  document.title = W.name;

  let tab = 'now', seenCount = Number(sessionStorage.getItem('vh:seen') || 0), openPerson = null;
  const freshIds = new Set();
  /* Bebbit: the main tab for guests and staff; an extra tab for everyone else */
  const bebUI = Bebbit.newUI();
  const onBebbit = () => tab === 'beb' || (tab === 'world' && WORLD === 'bebbit');
  const bctx = { me: ME, ui: bebUI, redraw: force => render(force) };
  /* FBI Headquarters: the agents' main tab */
  const fbiUI = FBI.newUI();
  const onFBI = () => tab === 'world' && WORLD === 'fbi';
  const fctx = { me: ME, ui: fbiUI, redraw: force => render(force) };
  /* NIGHTWIRE: the criminals' main tab. NightBank: a small extra tab for buyers and Harper. */
  const nwUI = NW.newUI();
  const myWallet = NW.walletOf(ME);
  const hasBank = WORLD !== 'nightwire' && !!myWallet;
  const onNW = () => (tab === 'world' && WORLD === 'nightwire') || tab === 'bank';
  const nctx = { me: ME, ui: nwUI, redraw: force => render(force) };

  const icons = {
    now: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    world: { fbi: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>', bebbit: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>', nightwire: '<svg viewBox="0 0 24 24"><path d="M4 7l5 5-5 5M12 17h8"/></svg>' }[WORLD],
    bank: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
    beb: '<svg viewBox="0 0 24 24"><path d="M5 4h11a4 4 0 014 4v5a4 4 0 01-4 4H9l-4 3z"/><path d="M9 9h6M9 12h4"/></svg>',
    people: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.900 1.900 6.500 5.500M16 4.800a3.500 3.500 0 010 6.400M18 14.800c2 .700 3.200 2.400 3.600 5.200"/></svg>',
    me: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    tasks: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/></svg>'
  };
  /* the mini-games: a "Tasks" tab for anyone who has one tonight */
  const hasGames = typeof Games !== 'undefined';
  const TASKS = { fbi: 'Tasks', bebbit: 'Puzzles', nightwire: 'Jobs' }[WORLD];
  /* the accusation: the ballot, the arrest and the reveal show at the top of Now */
  const hasVote = typeof Vote !== 'undefined' && !watched;

  const head = () => {
    const chip = `<button class="me-chip" data-tab="me" aria-label="Your file"><span class="avatar">${esc(initials(ME.name))}</span>${esc(ME.name.split(' ')[0])}</button>`;
    if (WORLD === 'fbi') return `<div class="fbi-strip">CLASSIFIED // LAW ENFORCEMENT SENSITIVE</div><div class="head-fbi"><svg width="40" height="40" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20.5" fill="#0e2240" stroke="#d4b25c" stroke-width="1.5"/><path d="M22 10 L24.9 18.4 L33.8 18.4 L26.6 23.6 L29.4 32 L22 26.8 L14.6 32 L17.4 23.6 L10.2 18.4 L19.1 18.4 Z" fill="#d4b25c"/></svg><div><div class="fbi-word" style="letter-spacing:2px">FEDERAL BUREAU</div><div class="t">Headquarters</div></div>${chip}</div>`;
    if (WORLD === 'bebbit') return `<div class="head-beb"><div class="beb-mark sm">b</div>bebbit${chip}</div>`;
    return `<div class="head-nw"><div class="nw-logo sm" data-t="nightwire"><span>nightwire</span></div>${chip}</div>`;
  };

  /* alerts addressed to me, newest first */
  const myAlerts = s => Object.entries(s.feed || {}).filter(([, f]) => G.hits(f.to, ME)).sort((a, b) => b[1].at - a[1].at);

  /* the big world-styled card at the top of "Now": a ring for the time left and a step for each part of the night */
  const HERO = {
    fbi: { tag: 'Case ' + STORY.fbi.caseNo, wait: 'Standby', live: 'Active', before: 'Your team is on standby. Read your file now. Your briefing starts when the doors open.' },
    bebbit: { tag: 'b/thegala', wait: 'Starting soon', live: 'Live', before: "Everyone's still getting ready. The feed goes live when the doors open." },
    nightwire: { tag: '// secure channel', wait: 'idle', live: 'live', before: 'Channel open. Read your file and stay quiet until the signal comes.' }
  }[WORLD];
  function hero(r) {
    const C = 2 * Math.PI * 27, live = r.state === 'live' || r.state === 'paused';
    const frac = live ? r.frac : r.state === 'over' ? 1 : 0;
    const status = r.state === 'paused' ? (WORLD === 'nightwire' ? 'paused' : 'Paused') : live ? HERO.live : r.state === 'over' ? (WORLD === 'nightwire' ? 'closed' : 'Closed') : HERO.wait;
    let kicker, name, sub, center;
    if (r.state === 'before') { kicker = CONFIG.EVENT; name = "The doors aren't open yet"; sub = HERO.before; center = '<span class="hero-dot"></span>'; }
    else if (r.state === 'over') { kicker = CONFIG.EVENT; name = 'The night is over'; sub = 'Thank you for playing.'; center = '<span class="hero-end">✓</span>'; }
    else { kicker = `Part ${r.i + 1} of ${STORY.phases.length} · ${hmm(r.nightMin)} in`; name = r.phase.name; sub = r.state === 'paused' ? 'The host has paused the clock.' : 'Time left in this part of the night.'; center = `<b class="mono">${mmss(r.remainGameMs)}</b>`; }
    const steps = STORY.phases.map((p, k) => `<i class="${r.state === 'over' || k < r.i ? 'done' : k === r.i && live ? 'on' : ''}"></i>`).join('');
    return `<div class="hero hero-${WORLD}${r.state === 'paused' ? ' paused' : ''}">
      <div class="hero-bg" aria-hidden="true"></div>
      <div class="hero-top"><span class="hero-tag">${esc(HERO.tag)}</span><span class="hero-live${live && r.state !== 'paused' ? ' on' : ''}"><i></i>${esc(status)}</span></div>
      <div class="hero-main">
        <div class="hero-ring"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="trk" cx="32" cy="32" r="27"/><circle class="val" cx="32" cy="32" r="27" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - frac)).toFixed(1)}"/></svg><div class="hero-c">${center}</div></div>
        <div class="hero-txt"><div class="kicker">${esc(kicker)}</div><div class="phase-name">${esc(name)}</div><p>${esc(sub)}</p></div>
      </div>
      <div class="hero-steps" aria-hidden="true">${steps}</div>
    </div>`;
  }

  function nowView(s) {
    const r = Clock.read(s), alerts = myAlerts(s);
    const list = alerts.length ? alerts.map(([id, f]) => `
      <div class="card alert${freshIds.has(id) ? ' new' : ''}">
        <div class="row between"><div class="ttl">${esc(f.title)}</div><div class="when">${esc(wallTime(f.at))}</div></div>
        <div>${esc(f.text)}</div>
      </div>`).join('') : `<div class="card empty empty-rich"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v10H8l-4 4z"/><path d="M8 10h8M8 13h5"/></svg><div><b>No messages yet</b><span>Messages meant only for you will appear here, and your phone will buzz.</span></div></div>`;
    const rel = FBI.released(s);
    const official = rel.length ? `<div class="sec-title">Official FBI statements</div>` + rel.map(x => `<div class="card alert"><div class="row between"><div class="ttl">${esc(G.byId(x.subject) ? G.byId(x.subject).name : '')}${x.sworn ? ' · sworn' : ''}</div><div class="when">${esc(wallTime(x.at))}</div></div><div>"${esc(x.text)}"</div></div>`).join('') : '';
    /* on a computer: messages on the left, your ID and official statements on the right */
    /* the evidence room: every printed clue someone has scanned, for everyone to read */
    const ev = Object.entries(s.ev || {}).map(([code, x]) => Object.assign({ code }, x, (STORY.evidence || []).find(e => e.code === code))).filter(x => x.title).sort((a, b) => b.at - a.at);
    const room = ev.length ? `<div class="sec-title">The evidence room · ${ev.length}</div><div class="evr">${ev.map(x => `<a href="${ROOT}scan.html?e=${encodeURIComponent(x.code)}&v=1"><span>ITEM ${x.item}</span>${esc(x.title)}<small>${esc(wallTime(x.at))}</small></a>`).join('')}</div>` : '';
    return `${hero(r)}${hasVote ? Vote.block(s, ME) : ''}<div class="dk-cols"><div class="dk-a"><div class="sec-title">For you</div>${list}${room}</div><div class="dk-b"><div class="dk-only"><div class="sec-title" style="margin-bottom:12px">You</div>${idCard(s)}</div>${official}</div></div>`;
  }

  function worldView() {
    return `<div class="card"><div class="kicker">${esc(W.name)}</div><div class="phase-name" style="margin:6px 0 8px">${esc(W.tab)}</div><p class="mute">${esc(W.soon)}</p></div>`;
  }

  function peopleView(s) {
    const order = ['guest', 'staff', 'fbi', 'crew', 'thief'];
    /* Everyone sees public covers only. Crew and thief appear under their cover roles, among the guests and staff. */
    const cover = c => (c.group === 'crew' || c.group === 'thief') ? (c.id === 'blair' || c.id === 'vivienne' ? 'guest' : 'staff') : c.group;
    const names = { guest: 'Guests', staff: 'Staff and security', fbi: 'FBI detail' };
    return '<div class="ppl">' + ['guest', 'staff', 'fbi'].map(g => {
      const list = STORY.characters.filter(c => cover(c) === g && !G.noshow(s, c.id)).sort((a, b) => a.name.localeCompare(b.name));
      return `<section class="ppl-g"><div class="sec-title">${names[g]} · ${list.length}</div><div class="card" style="padding-top:6px;padding-bottom:6px">` + list.map(c => `
        <div class="person" data-person="${c.id}" role="button" tabindex="0">
          <span class="avatar">${esc(initials(c.name))}</span>
          <div style="min-width:0"><div class="nm">${esc(c.name)}${c.id === ME.id ? ' <span class="chip">you</span>' : ''}${s.fbi && s.fbi.detained && s.fbi.detained[c.id] ? ' <span class="chip" style="color:var(--danger);border-color:var(--danger)">detained</span>' : ''}</div><div class="rl">${esc(c.role)}</div>${openPerson === c.id ? `<div class="pf">${esc(c.profile)}</div>` : ''}</div>
        </div>`).join('') + `</div></section>`;
    }).join('') + '</div>';
  }

  /* "My file": an ID in the style of your world: FBI credentials, a Bebbit profile or a NIGHTWIRE operator card */
  function idCard(s) {
    const parts = ME.name.split(' '), first = parts[0], last = parts.slice(1).join(' ') || first;
    const serial = (ME.id.toUpperCase().replace(/[^A-Z]/g, '') + 'XXXX').slice(0, 4) + '-' + String(ME.name.length * 739 % 9000 + 1000);
    if (WORLD === 'fbi') return `<div class="idc idc-fbi"><div class="idc-holo" aria-hidden="true"></div>
      <div class="idc-top"><svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20.5" fill="#0e2240" stroke="#d4b25c" stroke-width="1.4"/><circle cx="22" cy="22" r="15.5" fill="none" stroke="#d4b25c" stroke-width=".7" stroke-dasharray="1.5 2"/><path d="M22 10 L24.9 18.4 L33.8 18.4 L26.6 23.6 L29.4 32 L22 26.8 L14.6 32 L17.4 23.6 L10.2 18.4 L19.1 18.4 Z" fill="#d4b25c"/></svg><div><small>Federal Bureau</small><b>Credentials</b></div><span class="idc-chip" aria-hidden="true"></span></div>
      <div class="idc-body"><div class="idc-photo">${esc(initials(ME.name))}</div><div class="idc-f">
        <small>Name</small><b>${esc(last.toUpperCase())}, ${esc(first)}</b>
        <small>Title</small><span>${esc(ME.role)}</span>
        <small>Assignment</small><span>Art Crime Team · Case ${esc(STORY.fbi.caseNo)}</span></div></div>
      <div class="idc-foot"><span class="mono">ID ${esc(serial)}</span><span class="idc-sig">${esc(ME.name)}</span></div></div>`;
    if (WORLD === 'bebbit') {
      const mine = Bebbit.list(s).filter(p => p.by === ME.id && !p.deleted);
      const votes = mine.reduce((n, p) => n + Bebbit.nVotes(s, p.id), 0), coms = mine.reduce((n, p) => n + Bebbit.comments(s, p.id).length, 0);
      return `<div class="idc idc-beb"><div class="idc-cover" aria-hidden="true"><i></i><i></i><i></i></div>
        <span class="avatar idc-av" style="${Bebbit.tint(ME.name)}">${esc(initials(ME.name))}</span>
        <b class="idc-name">${esc(ME.name)}</b><span class="idc-handle">u/${esc(first.toLowerCase())} · b/thegala</span>
        <p class="idc-bio">${esc(ME.role)}</p>
        <div class="idc-stats"><div><b>${mine.length}</b><small>posts</small></div><div><b>${votes}</b><small>upvotes</small></div><div><b>${coms}</b><small>comments</small></div></div></div>`;
    }
    const w = NW.walletOf(ME);
    return `<div class="idc idc-nw"><div class="idc-scan" aria-hidden="true"></div>
      <div class="idc-row mono"><span>&gt; operator profile</span><span class="idc-ok">● verified</span></div>
      <b class="idc-handle-nw" data-t="${esc((ME.alias || first).toLowerCase())}">${esc((ME.alias || first).toLowerCase())}</b>
      <div class="idc-grid mono"><span>name</span><span>${esc(ME.name.toLowerCase())}</span><span>cover</span><span>${esc(ME.role.toLowerCase())}</span><span>wallet</span><span>${w ? NW.money(NW.balance(s, w)) : 'none'}</span><span>key</span><span>${esc(serial.toLowerCase())}</span></div>
      <div class="idc-bars" aria-hidden="true">${Array.from({ length: 34 }, (_, i) => `<i style="height:${30 + (i * 37 % 70)}%"></i>`).join('')}</div></div>`;
  }

  function meView(s) {
    const d = STORY.dossiers[ME.id];
    return `<div class="dk-cols me"><div class="dk-b sticky">${idCard(s)}
      <div class="sec-title">What everyone knows about you</div>
      <div class="card">${esc(ME.profile)}</div></div><div class="dk-a">
      ${d && typeof Dossier !== 'undefined' ? Dossier.render(d, ME, WORLD) : `<div class="sec-title">Your dossier</div>
      <div class="card dossier">${'<div class="empty-rich"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></svg><div><b>Sealed until the night</b><span>Your full dossier (your backstory, secrets, goals and who to find) will appear here before the night.</span></div></div>'}</div>`}
      <button class="btn" data-act="out">Sign out</button></div></div>`;
  }

  /* don't redraw while a finger is down, or the tap would be lost */
  let holding = false;
  document.addEventListener('pointerdown', () => { holding = true; });
  ['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => { holding = false; setTimeout(render, 0); }));
  function render(force) {
    if (holding) return;
    const s = DB.get(), alerts = myAlerts(s);
    if (tab === 'now') { seenCount = alerts.length; sessionStorage.setItem('vh:seen', seenCount); }
    const unseen = Math.max(0, alerts.length - seenCount);
    patch($('#head'), head());
    /* don't redraw under someone who is typing (a forced redraw is the app's own doing) */
    const a = document.activeElement, typing = a && $('#main').contains(a) && a.matches('input, textarea, select');
    if (force || !typing) {
      const bv = () => Bebbit.render(s, ME, bebUI);
      patch($('#main'), tab === 'now' ? nowView(s) : tab === 'world' ? (WORLD === 'bebbit' ? bv() : WORLD === 'fbi' ? FBI.render(s, ME, fbiUI) : WORLD === 'nightwire' ? NW.render(s, ME, nwUI) : worldView()) : tab === 'bank' ? NW.renderBank(s, ME, nwUI) : tab === 'beb' ? `<div class="beb-skin">${bv()}</div>` : tab === 'people' ? peopleView(s) : tab === 'tasks' && hasGames ? Games.render(s, ME) : meView(s));
      /* the casino's wheel and dice, and the mini-games, are kept alive between redraws (a spin or a drag never restarts) */
      if (typeof Casino !== 'undefined') Casino.mount();
      if (hasGames) Games.mount(tab === 'tasks');
    }
    const b = (id, label, ic, badge) => `<button data-tab="${id}" aria-current="${tab === id}">${ic}${label}${badge ? `<span class="badge">${badge}</span>` : ''}</button>`;
    const items = [b('now', 'Now', icons.now, unseen), b('world', W.tab, icons.world)];
    if (WORLD !== 'bebbit') items.push(b('beb', 'Bebbit', icons.beb));
    if (hasBank) items.push(b('bank', 'NightBank', icons.bank));
    if (hasGames && Games.forMe(s, ME).length) items.push(b('tasks', TASKS, icons.tasks, Games.openCount(s, ME)));
    items.push(b('people', 'People', icons.people), b('me', 'My file', icons.me));
    patch($('#navin'), `<div style="grid-template-columns:repeat(${items.length},1fr)">${items.join('')}</div>`);
    /* slide the highlight under the current tab */
    /* works for the bottom bar (phone) and the sidebar (computer): measure the real button */
    const cur = $$('#navin button').find(x => x.dataset.tab === tab), ind = $('#navind');
    if (ind && cur) { const k = 6; ind.style.width = (cur.offsetWidth - k * 2) + 'px'; ind.style.height = (cur.offsetHeight - k * 2) + 'px'; ind.style.transform = `translate(${cur.offsetLeft + k}px, ${cur.offsetTop + k}px)`; }
    const r = Clock.read(s);
    patch($('#navfoot'), `<div class="nf"><small>${r.state === 'live' ? 'Now' : r.state === 'paused' ? 'Paused' : r.state === 'over' ? 'Finished' : 'Starting soon'}</small><b>${esc(r.phase && (r.state === 'live' || r.state === 'paused') ? r.phase.name : CONFIG.EVENT)}</b>${r.state === 'live' || r.state === 'paused' ? `<span class="mono">${mmss(r.remainGameMs)} left</span><i style="width:${(r.frac * 100).toFixed(1)}%"></i>` : ''}</div>`);
    document.documentElement.style.setProperty('--hh', $('#head').offsetHeight + 'px');
    phaseWatch(s);
  }

  /* when the phase changes, announce it full-screen for a moment */
  let lastPhase = null;
  function phaseWatch(s) {
    const r = Clock.read(s), key = r.state === 'before' ? 'before' : r.i;
    if (lastPhase !== null && key !== lastPhase && r.state !== 'before' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const ov = document.createElement('div'); ov.className = 'phase-ov phase-ov-' + WORLD;
      ov.innerHTML = `<div class="po"><small>${r.state === 'over' ? CONFIG.EVENT : 'Now'}</small><b>${esc(r.state === 'over' ? 'The night is over' : r.phase.name)}</b><i></i></div>`;
      document.body.appendChild(ov); setTimeout(() => ov.remove(), 3300);
      if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(200);
    }
    lastPhase = key;
  }
  /* entrances play only when a tab first opens */
  function enter() { const m = $('#main'); m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter'); clearTimeout(enter.t); enter.t = setTimeout(() => m.classList.remove('enter'), 900); }

  /* phone: header on top, tabs along the bottom. Computer (960px and wider): the tabs become a left sidebar
     with a small clock under them, and the screens spread into columns. Same markup, CSS decides. */
  $('#root').innerHTML = `<div class="amb amb-${WORLD}" aria-hidden="true"></div><div class="app"><header class="app-head" id="head"></header><div class="app-body"><nav class="app-nav" id="nav" aria-label="Sections"><div class="navwrap"><span class="nav-ind" id="navind"></span><div id="navin"></div></div><div class="nav-foot" id="navfoot"></div></nav><main class="app-main" id="main"></main></div></div>`;
  addEventListener('resize', () => render());

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]'); if (t) { const changed = tab !== t.dataset.tab; tab = t.dataset.tab; window.scrollTo(0, 0); render(true); if (changed) enter(); return; }
    if (tab === 'me' && typeof Dossier !== 'undefined' && Dossier.onClick(e)) return;
    if (tab === 'now' && hasVote && Vote.onClick(e, ME, () => render(true))) return;
    if (tab === 'tasks' && hasGames) { const g = Games.onClick(e, ME); if (g) { if (g === 'redraw') render(true); return; } }
    if (onBebbit() && Bebbit.onClick(e, bctx)) return;
    if (onFBI() && FBI.onClick(e, fctx)) return;
    if (onNW() && NW.onClick(e, nctx)) return;
    const p = e.target.closest('[data-person]'); if (p) { openPerson = openPerson === p.dataset.person ? null : p.dataset.person; return render(); }
    if (e.target.closest('[data-act="out"]')) { Session.signOut(); location.href = ROOT + (WORLD === 'bebbit' ? 'bebbit/' : WORLD + '/'); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-person], .person[data-bb-profile]')) e.target.click(); });
  document.addEventListener('input', e => { if (hasVote && Vote.onInput(e)) return; if (onBebbit()) Bebbit.onInput(e, bctx); else if (onFBI()) FBI.onInput(e, fctx); else if (onNW()) NW.onInput(e, nctx); });
  document.addEventListener('change', e => { if (onBebbit()) Bebbit.onChange(e, bctx); else if (onFBI()) FBI.onChange(e, fctx); else if (onNW()) NW.onChange(e, nctx); });
  document.addEventListener('submit', e => { if (onBebbit()) Bebbit.onSubmit(e, bctx); else if (onFBI()) FBI.onSubmit(e, fctx); else if (onNW()) NW.onSubmit(e, nctx); });
  /* leaving a text box: catch up on anything that changed while typing */
  document.addEventListener('focusout', () => setTimeout(render, 0));

  /* new alert: buzz, toast, highlight */
  let known = null;
  function watchAlerts(s) {
    const ids = myAlerts(s).map(a => a[0]);
    if (known) {
      const added = ids.filter(id => !known.has(id));
      if (added.length) {
        added.forEach(id => { freshIds.add(id); setTimeout(() => freshIds.delete(id), 2000); });
        if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate([120, 60, 120]);
        if (tab !== 'now') toast('New message for you');
      }
    }
    known = new Set(ids);
  }
  function toast(text) { const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = text; document.body.appendChild(d); setTimeout(() => d.remove(), 3500); }

  /* presence: tell the host this phone is here */
  const beat = () => DB.update({ ['players/' + ME.id + '/seen']: Date.now(), ['players/' + ME.id + '/world']: WORLD });
  if (!watched) {
    if (!(DB.get().players && DB.get().players[ME.id])) { const u = {}; Clock.log(u, 'join', ME.name + ' signed in.'); DB.update(u); }
    beat(); setInterval(beat, 20000);
  }

  DB.on(s => { watchAlerts(s); render(); });
  enter();
  setInterval(render, 1000);
})();
