/* =====================================================================
   THE VANISHING HOUR — the NFC tags (tap.html?t=<tag id>).
   Three kinds of tag (settings/evidence.js > STORY.nfc):
     the story tag   (frame) a different line for each group or person, part of the mystery
     quest tags      (quest: ...) the stops of Cliff's Coat, the sidequest (STORY.coat)
     oddities        (egg: true) just for fun; each player's finds are counted
   It knows who's tapping the same way a scanned QR does: the phone's sign-in.
   Every tap goes in the host's log.
   ===================================================================== */
DB.loaded().then(function () {
  const id = (new URLSearchParams(location.search).get('t') || '').toLowerCase();
  const tag = (STORY.nfc || {})[id];
  const host = Session.lastHost(), me = host ? null : Session.lastPlayer();
  const top = '<div class="sc-top"><b>&#9673;</b><span>The Ashgrove Gala</span></div>';
  const page = inner => { $('#root').innerHTML = `<div class="sc">${top}${inner}</div>`; };
  const back = '<p class="who"><a href="app.html">Back to your phone</a></p>';
  const money = n => typeof NW !== 'undefined' ? NW.money(n) : '$' + Number(n || 0).toLocaleString('en-US');
  if (!tag) return page('<div class="sc-warn">This tag isn\'t part of tonight.</div>');
  if (!me && !host) return page('<div class="sc-warn">Nothing happens. Sign in on this phone first (open the <a href="gala/">gala door</a> and type your code word), then tap again.</div>');

  const s = DB.get(), r = Clock.read(s), Q = STORY.coat || null;
  const kind = tag.quest ? 'quest' : tag.egg ? 'egg' : 'story';
  try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(40); } catch (e) { }

  /* ================= host view: every version of this tag, to check the wording ================= */
  if (host) {
    const rows = [];
    if (tag.where) rows.push(`<div class="sc-warn"><b>Where it goes:</b> ${esc(tag.where)}</div>`);
    if (kind === 'story') {
      Object.entries(tag.groups || {}).forEach(([g, t]) => rows.push(`<div class="sc-ok"><b>${esc((STORY.groups[g] || {}).name || g)}:</b> ${esc(t)}</div>`));
      Object.entries(tag.people || {}).forEach(([p, t]) => rows.push(`<div class="sc-ok"><b>${esc((G.byId(p) || {}).name || p)} only:</b> ${esc(t)}</div>`));
    } else rows.push(`<div class="sc-ok"><b>${kind === 'quest' ? 'Anyone not on this stop yet' : 'Everyone'} sees:</b> ${esc(tag.idle || '')}${tag.money ? ` <i>(first tap pays ${money(tag.money)})</i>` : ''}</div>`);
    if (kind === 'quest' && Q) {
      const L = Q.levels, v = (L.find(l => l.visits) || {}).visits || {};
      if (v[tag.quest]) rows.push(`<div class="sc-ok"><b>On "${esc(L[1].name)}":</b> ${esc(v[tag.quest])}</div>`);
      const won = Object.entries((s.hunt || {}).won || {}).sort((a, b) => a[1] - b[1]);
      const going = Object.entries(s.huntp || {}).filter(([pid, p]) => p && p.step > 0 && !((s.hunt || {}).won || {})[pid]);
      rows.push(`<div class="sc-warn"><b>${esc(Q.title)}.</b> Finished: ${won.length ? won.map(([w], i) => esc((G.byId(w) || {}).name || w) + (i ? '' : ' (first)')).join(', ') : 'nobody yet'}. Still looking: ${going.length ? going.map(([pid, p]) => `${esc((G.byId(pid) || {}).name || pid)} (level ${Math.min(p.step + 1, L.length)})`).join(', ') : 'nobody'}.</div>`);
    }
    return page(`<h1>${esc(tag.title || id)}</h1><p class="who">Host view · ${esc(kind === 'story' ? 'story tag' : kind === 'quest' ? Q ? Q.title + ' stop' : 'quest stop' : 'oddity')}</p>${rows.join('')}`);
  }

  /* ================= the story tag (part of the mystery) ================= */
  if (kind === 'story') {
    const o = tag.opens || {}, pi = o.phase ? STORY.phases.findIndex(p => p.id === o.phase) : -1;
    const open = r.state === 'over' || (pi < 0 ? r.state !== 'before' : r.i >= pi);
    const line = (tag.people || {})[me.id] || (tag.groups || {})[me.group] || '';
    const u = {}; Clock.log(u, 'evidence', `${me.name} tapped the NFC tag (${tag.where || id})${open ? '' : ' before it opened'}.`); DB.update(u);
    if (!open) return page('<h1>' + esc(tag.title || 'A small tag') + '</h1><p class="who">A blank sticker. Nothing on it yet.</p>');
    return page(`<h1>${esc(tag.title || 'A small tag')}</h1><p class="who">${esc(me.name.split(' ')[0])}, only you can see this.</p><div class="sc-ok">${esc(line || 'Nothing here means anything to you.')}</div>${back}`);
  }

  /* ================= an oddity ================= */
  const oddCount = st => { const n = Eggs.found(st || DB.get(), me.id).length; return n ? `<p class="hu-odd">Oddities you've found tonight: <b>${n}</b></p>` : ''; };
  if (kind === 'egg') {
    const u = {}, fresh = Eggs.find(me, 'tag:' + id, u);
    let paid = '';
    if (fresh && tag.money && typeof NW !== 'undefined') {
      const w = NW.walletOf(me);
      if (w) { u['nw/tx/' + uid('t')] = { from: 'house', to: w, amt: tag.money, memo: 'Found: ' + (tag.title || 'loose change'), by: me.id, at: Date.now() }; paid = `<p class="hu-money">${esc(money(tag.money))} has been added to your bank account.</p>`; }
    }
    if (fresh) DB.update(u);
    return page(`<section class="hu"><div class="hu-card hu-egg"><small class="hu-kick">${fresh ? 'You found an oddity' : 'Found this one already'}</small><h2 class="hu-h">${esc(tag.title || 'A small tag')}</h2><p class="hu-intro">${esc(tag.idle || '')}</p>${paid}${oddCount()}</div></section>${back}`);
  }

  /* ================= a stop on Cliff's Coat ================= */
  if (!Q) return page(`<h1>${esc(tag.title || 'A small tag')}</h1><div class="sc-ok">${esc(tag.idle || '')}</div>${back}`);
  const L = Q.levels, N = L.length, stop = tag.quest;
  const VIS = (L.find(l => l.visits) || {}).visits || {}, VKEYS = Object.keys(VIS);
  const open = r.state === 'over' || (r.state !== 'before' && r.nightMin >= ((Q.opens || {}).min || 0));
  const norm = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const mine = () => ((DB.get().huntp || {})[me.id]) || {};
  const step = () => mine().step || 0;
  const wonAt = () => ((DB.get().hunt || {}).won || {})[me.id];
  const idle = (extra) => page(`<section class="hu"><div class="hu-card hu-egg"><h2 class="hu-h">${esc(tag.title || 'A small tag')}</h2><p class="hu-intro">${esc(tag.idle || '')}</p>${extra || ''}</div></section>${back}`);
  const save = patch => { const u = {}; Object.entries(patch).forEach(([k, v]) => { u['huntp/' + me.id + '/' + k] = v; }); return u; };
  { const u = {}; Clock.log(u, 'game', `${me.name} tapped ${Q.title}: ${tag.title || id}.`); DB.update(u); }

  if (!open) return stop === 'start' ? page(`<section class="hu"><div class="hu-card"><small class="hu-kick">${esc(Q.title)}</small><p class="hu-intro">${esc(Q.before)}</p></div></section>${back}`) : idle();
  /* a quest stop counts as an oddity too, for anyone who isn't on the case */
  if (!wonAt() && step() === 0 && stop !== 'start') { const u = {}; if (Eggs.find(me, 'tag:' + id, u)) DB.update(u); return idle(oddCount()); }

  let msg = '', bad = false;
  function draw() {
    const p = mine(), k = p.step || 0, w = wonAt();
    let h = `<section class="hu"><div class="hu-card"><small class="hu-kick">${esc(Q.title)}</small>`;
    if (w) {
      const pr = (((DB.get().hunt || {}).prize || {})[me.id]) || {};
      const gets = pr.first ? [Q.first.prize, pr.money ? money(pr.money) + ' in your bank account (Cliff sold his car)' : '', pr.perk === 'trace' ? 'one free Bebbit trace: on any post, find out whose phone it really came from' : '', 'your name in tomorrow\'s paper'].filter(Boolean) : [pr.money ? money(pr.money) + ' in your bank account' : ''].filter(Boolean);
      h += `<b class="hu-done">Coat found</b><p class="hu-intro">${esc(pr.first ? Q.first.win : Q.later.win)}</p>${gets.length ? `<ul class="hu-gets">${gets.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}<p class="hu-small">Please leave the coat exactly where you found it.</p>`;
      page(base(h)); return;
    }
    if (k === 0) {
      h += `<h2 class="hu-h">${esc(L[0].name)}</h2><p class="hu-intro">${esc(L[0].text)}</p><button class="hu-btn hu-wide" id="hgo">${esc(L[0].go || 'Start')}</button>`;
      page(base(h)); $('#hgo').addEventListener('click', () => { const u = save({ step: 1, at0: Date.now() }); Clock.log(u, 'game', `${me.name} took the case: ${Q.title}.`); DB.update(u); setTimeout(draw, 60); });
      return;
    }
    const lv = L[k] || L[N - 1];
    h += `<ol class="hu-dots" aria-label="Level ${k + 1} of ${N}">${L.map((_, j) => `<li class="${j < k ? 'on' : j === k ? 'now' : ''}"></li>`).join('')}</ol>
      <p class="hu-lv">Level ${k + 1} of ${N}</p><h2 class="hu-h">${esc(lv.name)}</h2><p class="hu-intro">${esc(lv.text)}</p>`;
    if (lv.visits) {
      const seen = p.seen || {};
      h += `<ul class="hu-stops">${VKEYS.map(v => `<li class="${seen[v] ? 'on' : ''}"><b>${esc(((STORY.nfc || {})[v] || {}).title || v)}</b>${seen[v] ? `<span>${esc(lv.visits[v])}</span>` : '<span class="mute">Not yet.</span>'}</li>`).join('')}</ul>`;
    }
    const ready = !lv.visits || VKEYS.every(v => (p.seen || {})[v]);
    if (lv.q && ready) h += `<p class="hu-q">${esc(lv.q)}</p>
      <form id="hf" autocomplete="off"><input id="ha" class="hu-in${bad ? ' bad' : ''}" placeholder="Your answer" autocapitalize="characters" spellcheck="false" aria-label="Your answer"><button class="hu-btn">Answer</button></form>
      <p class="hu-msg" role="status">${esc(msg)}</p>${lv.hint && (p.miss || 0) >= 2 ? `<p class="hu-hint">Hint: ${esc(lv.hint)}</p>` : ''}`;
    else if (lv.visits) h += `<p class="hu-small">Tap the tag at each place. ${VKEYS.filter(v => (p.seen || {})[v]).length} of ${VKEYS.length} so far.</p>`;
    page(base(h));
    const f = $('#hf'); if (f) f.addEventListener('submit', answer);
  }
  const base = h => h + '</div></section>' + back;
  function answer(e) {
    e.preventDefault();
    const p = mine(), k = p.step || 0, lv = L[k], v = norm($('#ha').value); if (!v || !lv || !lv.q) return;
    if (!lv.a.some(a => norm(a) === v)) { bad = true; msg = 'Not quite. Look again.'; DB.update(save({ miss: (p.miss || 0) + 1 })); setTimeout(draw, 60); return; }
    bad = false; msg = '';
    const u = save({ step: k + 1, miss: 0 }); Clock.log(u, 'game', `${me.name} reached level ${k + 2} of ${Q.title}.`); DB.update(u); setTimeout(draw, 60);
  }
  function win() {
    const s2 = DB.fresh ? DB.fresh() : DB.get(), first = !Object.keys((s2.hunt || {}).won || {}).length, P = first ? Q.first : Q.later;
    const w = typeof NW !== 'undefined' ? NW.walletOf(me) : null, at = Date.now(), u = save({ step: N, at });
    u['hunt/won/' + me.id] = at; u['hunt/prize/' + me.id] = { first, money: w ? P.money : 0, perk: first ? (Q.first.perk || null) : null };
    if (w && P.money) u['nw/tx/' + uid('t')] = { from: 'cliff', to: w, amt: P.money, memo: Q.title + (first ? ' · found it first' : ' · thank you'), by: me.id, at };
    if (first && Q.post) u['beb/posts/' + uid('p')] = { by: 'cliff', real: 'cliff', text: Q.post.split('{name}').join(me.name), photo: null, tags: null, at, hacked: null, plant: true };
    Clock.log(u, 'game', `${me.name} found Cliff's coat${first ? ' FIRST' : ''}.`);
    DB.update(u);
  }

  const p0 = mine(), k0 = p0.step || 0;
  if (!wonAt()) {
    /* arriving at one of the places Cliff went */
    if (L[k0] && L[k0].visits && VIS[stop] && !(p0.seen || {})[stop]) DB.update(save({ ['seen/' + stop]: Date.now() }));
    /* the last level: the tag in the coat's pocket */
    if (k0 === N - 1 && stop === 'coat') win();
    /* the coat before its time, or the start tag's own joke after the case is taken, stays a joke */
    else if (stop === 'coat') return idle();
  }
  setTimeout(draw, 40);
});
