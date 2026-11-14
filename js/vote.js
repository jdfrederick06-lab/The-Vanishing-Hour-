/* =====================================================================
   THE VANISHING HOUR — the accusation (the vote) and the arrest.
   Loaded by the player app, the host terminal and the big screen.
   No spoilers in here: who really did it lives in settings/reveal.js,
   which the player app never loads.

   state.vote = { state: 'open' | 'closed' | null (null = follow the clock),
                  ballots: { [playerId]: { thief, killer, at } },
                  arrest:  { who, by, at } }
   state.reveal = { step, slide }   (the host's reveal; phones show the slide they're sent)
   ===================================================================== */
const Vote = (() => {
  const V = () => STORY.vote || {};
  const S = s => s.vote || {};
  const QS = () => V().questions || [['thief', 'Who stole the painting?'], ['killer', 'Who is the killer?']];
  const SHORT = { thief: 'The painting', killer: 'The killer' };
  const voteIdx = () => STORY.phases.findIndex(p => p.id === 'vote');

  /* open: the host opened it, or the clock is in "The accusation" and the host hasn't closed it */
  function isOpen(s) {
    const st = S(s).state; if (st === 'closed') return false; if (st === 'open') return true;
    const r = Clock.read(s); return (r.state === 'live' || r.state === 'paused') && !!r.phase && r.phase.id === 'vote';
  }
  /* closed: the host closed it, or the clock has moved past the accusation */
  function isClosed(s) {
    const st = S(s).state; if (st === 'closed') return true; if (st === 'open') return false;
    const r = Clock.read(s), vi = voteIdx();
    return r.state === 'over' || (vi >= 0 && r.i > vi && (r.state === 'live' || r.state === 'paused'));
  }
  const out = (s, id) => !!(s.cast && s.cast[id] && s.cast[id].out);
  const canVote = (s, c) => !!c && !(V().noVote || []).includes(c.id) && !G.noshow(s, c.id) && !out(s, c.id);
  const whyNot = (s, c) => out(s, c.id) ? "You were thrown out of the gala, so you don't get a vote." : (V().noVote || []).includes(c.id) ? "The dead don't vote. Watch it unfold." : 'You have no vote tonight.';
  const weight = c => (V().weights || {})[c.group] || 1;
  const candidates = s => STORY.characters.filter(c => !(V().notCandidates || []).includes(c.id) && !G.noshow(s, c.id)).sort((a, b) => a.name.localeCompare(b.name));
  const ballots = s => S(s).ballots || {};
  const voters = s => STORY.characters.filter(c => canVote(s, c));
  const done = (s, id) => { const b = ballots(s)[id]; return !!(b && QS().every(q => b[q[0]])); };
  const votedList = s => voters(s).filter(c => done(s, c.id));
  const arrester = s => (V().arrestBy || []).map(G.byId).find(c => c && !G.noshow(s, c.id)) || null;
  const arrest = s => S(s).arrest || null;

  /** Weighted count for one question: { list:[{id,n,voters}], total, top, tie } */
  function tally(s, q) {
    const t = {}; let total = 0;
    Object.entries(ballots(s)).forEach(([id, b]) => {
      const c = G.byId(id); if (!c || !canVote(s, c) || !b || !b[q] || !G.byId(b[q])) return;
      const w = weight(c); (t[b[q]] = t[b[q]] || { id: b[q], n: 0, voters: [] }).n += w; t[b[q]].voters.push(id); total += w;
    });
    const list = Object.values(t).sort((a, b) => b.n - a.n || G.byId(a.id).name.localeCompare(G.byId(b.id).name));
    return { list, total, top: list[0] ? list[0].id : null, tie: list.length > 1 && list[0].n === list[1].n };
  }

  /* a face for everyone: initials on a colour that's always the same for that name */
  const hue = name => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const face = (c, cls) => `<span class="vt-av ${cls || ''}" style="--h:${hue(c.name)}">${esc(initials(c.name))}</span>`;

  /** Bars for a tally (phones and the host terminal) */
  function bars(s, q, max) {
    const T = tally(s, q), top = T.list.slice(0, max || 5);
    if (!top.length) return '<p class="vt-none">No votes yet.</p>';
    const hi = top[0].n;
    return `<div class="vt-bars">${top.map((x, k) => { const c = G.byId(x.id); return `<div class="vt-bar${k === 0 ? ' lead' : ''}">${face(c, 'sm')}<span class="vt-bn">${esc(c.name)}</span><span class="vt-bt"><i style="--w:${(x.n / hi * 100).toFixed(1)}%"></i></span><b class="mono">${x.n}</b></div>`; }).join('')}</div>`;
  }

  /* ---------- the pictures beside the truth's chapters (the data is in settings/reveal.js) ---------- */
  const DART = '<svg viewBox="0 0 220 50" class="ra-dart" aria-hidden="true"><g stroke="#2a2a2a" stroke-width="1.2" stroke-linejoin="round"><path d="M4 25 30 22.5v5Z" fill="#d5d9dc"/><rect x="30" y="20" width="46" height="10" rx="2" fill="#9aa1a6"/><path d="M76 23.5h74v3H76Z" fill="#555"/><path d="M146 25 206 6l8 2-42 17Z" fill="#c0392b"/><path d="M146 25 206 44l8-2-42-17Z" fill="#a93226"/></g></svg>';
  function art(a) {
    if (!a) return '';
    const e = esc;
    if (a.kind === 'letter') return `<div class="ra ra-letter"><span class="ra-date">${e(a.date)}</span><p>${e(a.text)}</p><span class="ra-sign">${e(a.sign)}</span></div>`;
    if (a.kind === 'record') return `<div class="ra ra-rec"><header>${e(a.title)}</header><dl>${(a.lines || []).map(([k, v]) => `<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join('')}</dl><div class="ra-stamp">${e(a.stamp)}</div></div>`;
    if (a.kind === 'money') return `<div class="ra ra-money"><small>${e(a.label)}</small><s>${e(a.from)}</s><b>${e(a.to)}</b><em>${e(a.note)}</em></div>`;
    if (a.kind === 'radio') return `<div class="ra ra-radio"><header><span>Radio log</span><span>East hall · vault</span></header><div class="ra-row"><b>${e(a.time)}</b><span>${e(a.who)}</span><p>${e(a.text)}</p></div><div class="ra-row dim"><b>7:50 PM</b><span>—</span><p>(no further calls)</p></div>${DART}</div>`;
    if (a.kind === 'napkin') return `<div class="ra ra-napkin"><span>${e(a.text)}</span></div>`;
    if (a.kind === 'frames') return `<div class="ra ra-frames">${(a.items || []).map(([w, t]) => `<div class="ra-frame"><div><b>${e(w)}</b><small>${e(t)}</small></div></div>`).join('')}</div>`;
    return '';
  }

  /* ---------- the phone ---------- */
  const ui = { q: 'thief', find: '', open: null, edit: false };
  const world = () => (document.body && document.body.dataset.world) || '';
  const KICK = { fbi: `Official ballot · Case ${(STORY.fbi || {}).caseNo || ''}`, bebbit: 'b/thegala · the big poll', nightwire: '// the vote' };
  const ICON = {
    ballot: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16v8H4z"/><path d="M8 12V5h8v7"/><path d="M10 8.5l1.5 1.5L14 7"/></svg>',
    cuffs: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="15" r="4.2"/><circle cx="17" cy="15" r="4.2"/><path d="M9.5 9.5 12 7l2.5 2.5M12 7V4"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'
  };
  const head = (kick, title, sub, icon, cls) => `<div class="vt-head ${cls || ''}"><span class="vt-ic">${icon}</span><div><small>${kick}</small><b>${title}</b>${sub ? `<p>${sub}</p>` : ''}</div></div>`;
  const turnout = s => { const n = votedList(s).length, m = voters(s).length; return `<div class="vt-turn"><span class="vt-tb"><i style="width:${m ? (n / m * 100).toFixed(1) : 0}%"></i></span><span><b class="mono">${n}</b> of ${m} have voted</span></div>`; };
  function pickList(s, sel, attr) {
    return `<label class="vt-find"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg><input data-vt-find placeholder="Search ${candidates(s).length} names" value="${esc(ui.find)}" autocomplete="off" enterkeyhint="search"></label>
      <div class="vt-list">${candidates(s).map(c => { const hide = ui.find && !c.name.toLowerCase().includes(ui.find.toLowerCase()); return `<button class="vt-c${sel === c.id ? ' on' : ''}" ${attr}="${c.id}" data-n="${esc(c.name.toLowerCase())}"${hide ? ' hidden' : ''}>${face(c)}<span class="vt-ct"><b>${esc(c.name)}</b><small>${esc(c.role)}</small></span><i class="vt-tick" aria-hidden="true"></i></button>`; }).join('')}</div>`;
  }
  function ballot(s, me) {
    const kick = KICK[world()] || 'The accusation';
    if (!canVote(s, me)) return `<section class="vt">${head(kick, 'Voting is open', esc(whyNot(s, me)), ICON.ballot)}${turnout(s)}</section>`;
    const b = ballots(s)[me.id] || {}, all = QS().every(q => b[q[0]]);
    if (!QS().some(q => q[0] === ui.q)) ui.q = QS()[0][0];
    const steps = `<div class="vt-steps">${QS().map(([k, label], i) => { const c = b[k] && G.byId(b[k]); return `<button data-vt-q="${k}" aria-pressed="${!all || ui.edit ? ui.q === k : false}" class="${c ? 'ans' : ''}"><span class="vt-n">${c ? '' : i + 1}</span><span class="vt-st"><small>${esc(SHORT[k] || label)}</small><b>${c ? esc(c.name) : 'Not answered'}</b></span></button>`; }).join('')}</div>`;
    /* all answered: a filed ballot, with a way back in */
    if (all && !ui.edit) {
      return `<section class="vt vt-filed">${head(kick, 'Your vote is in', `You can change it until voting closes.${weight(me) > 1 ? ' <em>Your vote counts double.</em>' : ''}`, ICON.ballot)}
        <div class="vt-ticket"><div class="vt-stamp">Vote cast</div>${QS().map(([k, label]) => { const c = G.byId(b[k]); return `<div class="vt-tk">${face(c)}<div><small>${esc(label)}</small><b>${esc(c.name)}</b></div></div>`; }).join('')}</div>
        <button class="vt-change" data-vt-edit>Change my answers</button>${turnout(s)}</section>`;
    }
    return `<section class="vt">${head(kick, 'Cast your vote', `Two questions. Change your mind any time until voting closes.${weight(me) > 1 ? ' <em>Your vote counts double.</em>' : ''}`, ICON.ballot)}
      ${steps}<div class="vt-q">${esc((QS().find(q => q[0] === ui.q) || [])[1] || '')}</div>${pickList(s, b[ui.q], 'data-vt-pick')}
      ${all ? '<button class="vt-change" data-vt-edit>Done</button>' : ''}${turnout(s)}</section>`;
  }
  function arrestCard(s, me) {
    const K = tally(s, 'killer');
    return `<section class="vt vt-arr"><div class="vt-warrant"><span>Arrest</span><span class="mono">Case ${esc((STORY.fbi || {}).caseNo || '')}</span></div>
      ${head(esc(me.role), 'Make the arrest', 'The votes are in. The room has said who it believes, but the call is yours: who do you arrest for the murders?', ICON.cuffs, 'red')}
      <div class="vt-sub">The room's vote · Who is the killer?</div>${bars(s, 'killer', 3)}${K.tie ? '<p class="vt-none">It\'s a tie at the top.</p>' : ''}
      <div class="vt-sub">Who do you arrest?</div>${pickList(s, ui.open, 'data-vt-arrest')}</section>`;
  }
  function slideHTML(sl) {
    const bar = sl.bars ? `<div class="vt-bars">${sl.bars.map((x, k) => { const c = G.byId(x.id); return `<div class="vt-bar${k === 0 ? ' lead' : ''}">${c ? face(c, 'sm') : ''}<span class="vt-bn">${esc(x.label)}</span><span class="vt-bt"><i style="--w:${x.pct}%"></i></span><b class="mono">${x.n}</b></div>`; }).join('')}</div>` : '';
    return `<section class="vt vt-rev"><div class="vt-rh"><small>${sl.chapter ? `Chapter ${sl.chapter} · ` : ''}${esc(sl.kicker || '')}</small><b>${esc(sl.title || '')}</b></div>
      ${sl.big ? `<div class="vt-big">${esc(sl.big)}</div>` : ''}${sl.art ? `<div class="vt-art">${art(sl.art)}</div>` : ''}
      ${(sl.body || []).map(p => `<p class="vt-p">${esc(p)}</p>`).join('')}${bar}
      ${sl.results ? `<div class="vt-res">${sl.results.map(x => `<div class="${x.win ? 'win' : 'lose'}"><i aria-hidden="true">${x.win ? '✓' : '✕'}</i><b>${esc(x.who)}</b><span>${x.win ? 'Won' : 'Lost'}</span><small>${esc(x.why)}</small></div>`).join('')}</div>` : ''}
      ${sl.awards ? `<div class="vt-res">${sl.awards.map(x => `<div class="aw"><i aria-hidden="true">★</i><b>${esc(x.title)}</b><span>${esc(x.who)}</span><small>${esc(x.why)}</small></div>`).join('')}</div>` : ''}</section>`;
  }

  /** What goes at the top of a player's Now screen: the reveal, the ballot, the arrest, or nothing.
      A card is "fresh" (plays its entrance) only for its first moment on screen. */
  const firstSeen = {};
  function block(s, me) {
    const html = blockHTML(s, me), m = html.match(/^<section class="vt([^"]*)"/);
    if (!m) return html;
    const key = m[1] + '|' + ((s.reveal && s.reveal.step) ?? ''), now = Date.now();
    if (!firstSeen[key]) firstSeen[key] = now;
    return now - firstSeen[key] < 1600 ? html.replace('<section class="vt', '<section class="vt fresh') : html;
  }
  function blockHTML(s, me) {
    const rv = s.reveal && s.reveal.slide;
    if (rv) return slideHTML(rv);
    if (isOpen(s)) return ballot(s, me);
    if (isClosed(s) && (S(s).ballots || S(s).state)) {
      const a = arrest(s), boss = arrester(s);
      if (a) {
        const c = G.byId(a.who), by = G.byId(a.by);
        return `<section class="vt vt-cuffed"><div class="vt-mug"><div class="vt-mugbg" aria-hidden="true">${[6, 5, 4].map(n => `<span>${n} ft</span>`).join('')}</div>${c ? face(c, 'xl') : ''}<div class="vt-plate"><b>${esc(c ? c.name : '')}</b><span class="mono">Case ${esc((STORY.fbi || {}).caseNo || '')}</span></div><div class="vt-stamp red">Arrested</div></div>
          <p class="vt-mugp">${by ? esc(by.name) : 'The FBI'} made the arrest. Stay where you are: the truth is next.</p></section>`;
      }
      if (boss && boss.id === me.id) return arrestCard(s, me);
      return `<section class="vt vt-done">${head('The accusation', 'Voting is closed', `${boss ? esc(boss.name) + ' is' : 'The FBI is'} deciding who to arrest. Watch the room.`, ICON.lock)}${turnout(s)}</section>`;
    }
    return '';
  }

  /* typing in the search box filters the names in place (a full redraw would drop the keyboard) */
  function onInput(e) {
    if (!e.target.matches('[data-vt-find]')) return false;
    ui.find = e.target.value;
    $$('.vt-c').forEach(b => { b.hidden = !!ui.find && !b.dataset.n.includes(ui.find.toLowerCase()); });
    return true;
  }
  function onClick(e, me, redraw) {
    const q = sel => e.target.closest(sel); let t;
    if ((t = q('[data-vt-q]'))) { ui.q = t.dataset.vtQ; ui.edit = true; redraw(); return true; }
    if (q('[data-vt-edit]')) { ui.edit = !ui.edit; ui.find = ''; redraw(); return true; }
    if ((t = q('[data-vt-pick]'))) {
      const s = DB.fresh(); if (!isOpen(s) || !canVote(s, me)) { redraw(); return true; }
      const id = t.dataset.vtPick, b = Object.assign({}, ballots(s)[me.id] || {});
      b[ui.q] = b[ui.q] === id ? null : id; b.at = Date.now();
      const u = { ['vote/ballots/' + me.id]: b };
      if (QS().every(x => b[x[0]]) && !done(s, me.id)) Clock.log(u, 'vote', `${me.name} voted.`);
      DB.update(u);
      /* after an answer, go straight to the next unanswered question; when both are in, file the ballot */
      const next = QS().find(x => !b[x[0]]);
      if (b[ui.q] && next) ui.q = next[0];
      if (!next) { ui.edit = false; if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(40); }
      ui.find = ''; redraw(); window.scrollTo({ top: Math.max(0, ($('.vt') || {}).offsetTop - 70 || 0), behavior: 'smooth' }); return true;
    }
    if ((t = q('[data-vt-arrest]'))) {
      const s = DB.fresh(), c = G.byId(t.dataset.vtArrest), boss = arrester(s);
      if (!c || !boss || boss.id !== me.id || arrest(s)) { redraw(); return true; }
      ui.open = c.id;
      if (!Ask.sure(`Arrest ${c.name} for the murders? Everyone will be told.`, () => onClick(e, me, redraw), { title: 'The arrest', ok: 'Arrest ' + c.name.split(' ')[0], danger: true })) { redraw(); return true; }
      makeArrest(c.id, me.id); ui.find = ''; redraw(); return true;
    }
    return false;
  }
  /** Record the arrest and tell every phone (the host can also make it for them) */
  function makeArrest(who, by) {
    const c = G.byId(who), b = G.byId(by), u = { 'vote/arrest': { who, by, at: Date.now() } };
    u['feed/' + uid('a')] = { to: ['all'], title: 'An arrest', text: `${b ? b.name : 'The FBI'} has arrested ${c.name} for the murders of Charlie Pruitt and Victor Ashgrove.`, at: Date.now(), kind: 'msg' };
    Clock.log(u, 'vote', `${b ? b.name : 'The host'} arrested ${c.name}.`); DB.update(u);
  }

  return { isOpen, isClosed, canVote, weight, candidates, ballots, voters, votedList, done, tally, bars, face, hue, art, arrester, arrest, makeArrest, block, slideHTML, onClick, onInput, questions: QS, short: SHORT };
})();
