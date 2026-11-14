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

  /** Bars for a tally (used on phones, the host terminal and the big screen) */
  function bars(s, q, max) {
    const T = tally(s, q), top = T.list.slice(0, max || 5);
    if (!top.length) return '<p class="vt-none">No votes yet.</p>';
    const hi = top[0].n;
    return `<div class="vt-bars">${top.map((x, k) => { const c = G.byId(x.id); return `<div class="vt-bar${k === 0 ? ' lead' : ''}"><span class="vt-bn">${esc(c.name)}</span><span class="vt-bt"><i style="--w:${(x.n / hi * 100).toFixed(1)}%"></i></span><b class="mono">${x.n}</b></div>`; }).join('')}</div>`;
  }

  /* ---------- the phone ---------- */
  const ui = { q: 'thief', find: '', open: null };
  const av = c => `<span class="avatar">${esc(initials(c.name))}</span>`;
  function pickList(s, sel, attr) {
    return `<label class="vt-find"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg><input data-vt-find placeholder="Search names" value="${esc(ui.find)}" autocomplete="off"></label>
      <div class="vt-list">${candidates(s).map(c => { const hide = ui.find && !c.name.toLowerCase().includes(ui.find.toLowerCase()); return `<button class="vt-c${sel === c.id ? ' on' : ''}" ${attr}="${c.id}" data-n="${esc(c.name.toLowerCase())}"${hide ? ' hidden' : ''}>${av(c)}<span><b>${esc(c.name)}</b><small>${esc(c.role)}</small></span><i class="vt-tick" aria-hidden="true"></i></button>`; }).join('')}</div>`;
  }
  function ballot(s, me) {
    if (!canVote(s, me)) return `<section class="vt"><div class="vt-head"><small>The accusation</small><b>Voting is open</b><p>${esc(whyNot(s, me))}</p><p class="vt-count"><span class="mono">${votedList(s).length}/${voters(s).length}</span> have voted</p></div></section>`;
    const b = ballots(s)[me.id] || {}, nAns = QS().filter(q => b[q[0]]).length;
    if (!QS().some(q => q[0] === ui.q)) ui.q = QS()[0][0];
    return `<section class="vt"><div class="vt-head"><small>The accusation</small><b>${nAns === QS().length ? 'Your vote is in' : 'Cast your vote'}</b>
        <p>${nAns === QS().length ? 'You can still change either answer until voting closes.' : `Answer both questions. You can change your answers until voting closes.`}${weight(me) > 1 ? ' <em>Your vote counts double.</em>' : ''}</p></div>
      <div class="vt-qs" role="tablist">${QS().map(([k, label], i) => { const c = b[k] && G.byId(b[k]); return `<button role="tab" data-vt-q="${k}" aria-selected="${ui.q === k}" class="${c ? 'ans' : ''}"><small>${i + 1} · ${esc(label)}</small><b>${c ? esc(c.name) : 'Not answered'}</b></button>`; }).join('')}</div>
      ${pickList(s, b[ui.q], 'data-vt-pick')}
      <p class="vt-count"><span class="mono">${votedList(s).length}/${voters(s).length}</span> have voted so far</p></section>`;
  }
  function arrestCard(s, me) {
    const K = tally(s, 'killer');
    return `<section class="vt vt-arr"><div class="vt-head"><small>${esc(me.role)}</small><b>Make the arrest</b><p>The votes are in. The room says who it believes, but the call is yours: who do you arrest for the murders?</p></div>
      <div class="vt-sub">The room's vote · who is the killer</div>${bars(s, 'killer', 3)}${K.tie ? '<p class="vt-none">It\'s a tie at the top.</p>' : ''}
      <div class="vt-sub">Arrest</div>${pickList(s, ui.open, 'data-vt-arrest')}</section>`;
  }
  const slideHTML = sl => `<section class="vt vt-rev"><div class="vt-head"><small>${esc(sl.kicker || '')}</small><b>${esc(sl.title || '')}</b></div>
      ${sl.big ? `<div class="vt-big">${esc(sl.big)}</div>` : ''}${(sl.body || []).map(p => `<p class="vt-p">${esc(p)}</p>`).join('')}
      ${sl.bars ? `<div class="vt-bars">${sl.bars.map((x, k) => `<div class="vt-bar${k === 0 ? ' lead' : ''}"><span class="vt-bn">${esc(x.label)}</span><span class="vt-bt"><i style="--w:${x.pct}%"></i></span><b class="mono">${x.n}</b></div>`).join('')}</div>` : ''}
      ${sl.results ? `<div class="vt-res">${sl.results.map(x => `<div class="${x.win ? 'win' : 'lose'}"><b>${esc(x.who)}</b><span>${x.win ? 'Won' : 'Lost'}</span><small>${esc(x.why)}</small></div>`).join('')}</div>` : ''}
      ${sl.awards ? `<div class="vt-res">${sl.awards.map(x => `<div class="win"><b>${esc(x.title)}</b><span>${esc(x.who)}</span><small>${esc(x.why)}</small></div>`).join('')}</div>` : ''}</section>`;

  /** What goes at the top of a player's Now screen: the reveal, the ballot, the arrest, or nothing */
  function block(s, me) {
    const rv = s.reveal && s.reveal.slide;
    if (rv) return slideHTML(rv);
    if (isOpen(s)) return ballot(s, me);
    if (isClosed(s) && (S(s).ballots || S(s).state)) {
      const a = arrest(s), boss = arrester(s);
      if (a) { const c = G.byId(a.who), by = G.byId(a.by); return `<section class="vt vt-done"><div class="vt-head"><small>The arrest</small><b>${esc(c ? c.name : '')} has been arrested</b><p>${by ? esc(by.name) : 'The FBI'} made the arrest. Stay where you are: the truth is next.</p></div></section>`; }
      if (boss && boss.id === me.id) return arrestCard(s, me);
      return `<section class="vt vt-done"><div class="vt-head"><small>The accusation</small><b>Voting is closed</b><p>${boss ? esc(boss.name) + ' is' : 'The FBI is'} deciding who to arrest. Watch the room.</p></div></section>`;
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
    if ((t = q('[data-vt-q]'))) { ui.q = t.dataset.vtQ; redraw(); return true; }
    if ((t = q('[data-vt-pick]'))) {
      const s = DB.fresh(); if (!isOpen(s) || !canVote(s, me)) { redraw(); return true; }
      const id = t.dataset.vtPick, b = Object.assign({}, ballots(s)[me.id] || {});
      b[ui.q] = b[ui.q] === id ? null : id; b.at = Date.now();
      const u = { ['vote/ballots/' + me.id]: b };
      if (QS().every(x => b[x[0]]) && !done(s, me.id)) Clock.log(u, 'vote', `${me.name} voted.`);
      DB.update(u);
      /* after the first answer, go straight to the next unanswered question */
      const next = QS().find(x => !b[x[0]]); if (b[ui.q] && next) ui.q = next[0];
      ui.find = ''; redraw(); return true;
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

  return { isOpen, isClosed, canVote, weight, candidates, ballots, voters, votedList, done, tally, bars, arrester, arrest, makeArrest, block, slideHTML, onClick, onInput, questions: QS };
})();
