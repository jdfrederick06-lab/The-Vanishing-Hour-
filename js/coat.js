/* =====================================================================
   THE VANISHING HOUR — Cliff's Coat, the NFC sidequest (Nov 26). Story: settings/evidence.js > STORY.coat.
   The tags (tap.html) only record what a player finds. Once they take the case, the case file
   lives in its own tab on their phone ("The coat"), apart from the rest of the game: the current
   level, what they've found so far, and the answer box.
   Progress, each player's own (huntp/{id}):
     step   0 = not started; k = working on level k (1-based)
     seen   {stop: at}   tags found on the current level (visits, and a `tap` level's tag)
     trail  how many trail tags done, in order
     miss   wrong answers on this level (a hint after 2)
   Who finished is public: hunt/won/{id} = at, hunt/prize/{id} = { first, money, perk }.
   ===================================================================== */
const Coat = (() => {
  const Q = () => (typeof STORY !== 'undefined' && STORY.coat) || null;
  const L = () => (Q() || {}).levels || [];
  const mine = (s, id) => ((s.huntp || {})[id]) || {};
  const wonAt = (s, id) => ((s.hunt || {}).won || {})[id];
  const started = (s, id) => !!Q() && (!!wonAt(s, id) || (mine(s, id).step || 0) > 0);
  const isOpen = s => { if ((s.setup || {}).coatTest) return true; const r = Clock.read(s); return r.state === 'over' || (r.state !== 'before' && r.nightMin >= ((Q().opens || {}).min || 0)); };
  const norm = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const tagName = stop => stop === 'start' ? 'The coat check poster' : (((STORY.nfc || {})[Object.keys(STORY.nfc || {}).find(k => (STORY.nfc[k] || {}).quest === stop)] || {}).title || stop);
  const money = n => typeof NW !== 'undefined' ? NW.money(n) : '$' + Number(n || 0).toLocaleString('en-US');
  const put = (id, patch, u) => { const w = u || {}; Object.entries(patch).forEach(([k, v]) => { w['huntp/' + id + '/' + k] = v; }); return w; };

  /** is the current level's question ready to answer? */
  function ready(lv, p) {
    if (!lv || !lv.q) return false;
    if (lv.visits) return Object.keys(lv.visits).every(v => (p.seen || {})[v]);
    if (lv.tap) return !!(p.seen || {})[lv.tap];
    return true;
  }
  /** move to the next level (or finish) */
  function advance(me, p, u) {
    const k = p.step || 1;
    if (k >= L().length) return win(me, u);
    put(me.id, { step: k + 1, seen: null, trail: null, miss: 0 }, u);
    Clock.log(u, 'game', `${me.name} reached level ${k + 1} of ${Q().title}.`);
  }
  function win(me, u) {
    const s = DB.fresh ? DB.fresh() : DB.get(), first = !Object.keys((s.hunt || {}).won || {}).length, C = Q(), P = first ? C.first : C.later;
    const w = typeof NW !== 'undefined' ? NW.walletOf(me) : null, at = Date.now();
    put(me.id, { step: L().length + 1, seen: null, trail: null, miss: 0, at }, u);
    u['hunt/won/' + me.id] = at; u['hunt/prize/' + me.id] = { first, money: w ? P.money : 0, perk: first ? (C.first.perk || null) : null };
    if (w && P.money) u['nw/tx/' + uid('t')] = { from: 'cliff', to: w, amt: P.money, memo: C.title + (first ? ' · found it first' : ' · thank you'), by: me.id, at };
    if (first && C.post) u['beb/posts/' + uid('p')] = { by: 'cliff', real: 'cliff', text: C.post.split('{name}').join(me.name), photo: null, tags: null, at, hacked: null, plant: true };
    Clock.log(u, 'game', `${me.name} finished ${C.title}${first ? ' FIRST' : ''}.`);
  }

  /* ================= a tag was tapped (tap.html): record it, say what was found ================= */
  /** returns { title, kick, body, start?, link } for the tap page */
  function tap(me, stop) {
    const C = Q(), s = DB.get(), tag = Object.values(STORY.nfc || {}).find(t => t.quest === stop) || {};
    const idle = { title: tag.title, body: tag.idle || '', link: started(s, me.id) };
    { const u = {}; Clock.log(u, 'game', `${me.name} tapped ${C.title}: ${tag.title || stop}.`); DB.update(u); }
    if (!isOpen(s)) return stop === 'start' ? { title: C.title, kick: 'Missing', body: C.before } : idle;
    if (wonAt(s, me.id)) return { title: tag.title, kick: 'Case closed', body: (stop === 'start' ? 'Cliff waves at you from the coat check. He has not let go of the coat. ' : '') + (tag.idle || ''), link: true };
    const p = mine(s, me.id), k = p.step || 0;
    if (!k) return stop === 'start' ? { title: 'MISSING', kick: C.title, body: C.poster, start: true } : idle;
    const lv = L()[k - 1], u = {};
    let found = null, kick = 'Added to your case file';
    if (lv.visits && lv.visits[stop]) {
      if (!(p.seen || {})[stop]) put(me.id, { ['seen/' + stop]: Date.now() }, u);
      found = lv.visits[stop];
    } else if (lv.trail && lv.trail.includes(stop)) {
      const i = lv.trail.indexOf(stop), done = p.trail || 0;
      if (i === done) { found = lv.notes[stop]; if (i + 1 >= lv.trail.length) advance(me, p, u); else put(me.id, { trail: done + 1 }, u); }
      else if (i < done) { found = lv.notes[stop]; kick = 'Already in your case file'; }
      else { found = lv.wrong; kick = 'Not yet'; }
    } else if (lv.tap === stop) {
      if (lv.q) { if (!(p.seen || {})[stop]) put(me.id, { ['seen/' + stop]: Date.now() }, u); found = stop === 'start' ? 'Cliff is at the coat check, arms folded. "Prove it," he says. Answer him in your case file.' : (lv.found || 'Found.'); }
      else { found = lv.found || 'Found.'; advance(me, p, u); }
    }
    if (Object.keys(u).length) DB.update(u);
    return found ? { title: tag.title, kick, body: found, link: true } : idle;
  }
  /** take the case (the button on the poster) */
  function begin(me) {
    const s = DB.get(); if (started(s, me.id)) return;
    const u = put(me.id, { step: 1, at0: Date.now() }); Clock.log(u, 'game', `${me.name} took the case: ${Q().title}.`); DB.update(u);
  }

  /* ================= the case file (its own tab in the app) ================= */
  function render(s, me, ui) {
    const C = Q(); if (!C) return '';
    const p = mine(s, me.id), k = p.step || 0, LV = L(), N = LV.length, w = wonAt(s, me.id);
    const dots = `<ol class="cf-dots" aria-label="Level ${Math.min(k, N)} of ${N}">${LV.map((_, j) => `<li class="${w || j + 1 < k ? 'on' : j + 1 === k ? 'now' : ''}"></li>`).join('')}</ol>`;
    let cur = '';
    if (w) {
      const pr = (((s.hunt || {}).prize || {})[me.id]) || {};
      const gets = pr.first ? [C.first.prize, pr.money ? money(pr.money) + ' in your bank account (Cliff sold his car)' : '', pr.perk === 'trace' ? 'one free Bebbit trace: on any post made from now on, find out whose phone it really came from' : '', 'your name in tomorrow\'s paper'].filter(Boolean) : [pr.money ? money(pr.money) + ' in your bank account' : ''].filter(Boolean);
      cur = `<div class="cf-done"><b>Case closed</b><p>${esc(pr.first ? C.first.win : C.later.win)}</p>${gets.length ? `<ul>${gets.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}</div>`;
    } else {
      const lv = LV[k - 1] || LV[0];
      let list = '';
      if (lv.visits) list = `<ul class="cf-stops">${Object.keys(lv.visits).map(v => `<li class="${(p.seen || {})[v] ? 'on' : ''}"><b>${esc(tagName(v))}</b>${(p.seen || {})[v] ? `<span>${esc(lv.visits[v])}</span>` : '<span class="mute">Not found yet.</span>'}</li>`).join('')}</ul>`;
      if (lv.trail) list = `<ul class="cf-stops">${lv.trail.map((t, i) => `<li class="${i < (p.trail || 0) ? 'on' : ''}"><b>Stop ${i + 1}</b>${i < (p.trail || 0) ? `<span>${esc(lv.notes[t])}</span>` : `<span class="mute">${i === (p.trail || 0) ? 'Next.' : 'Later.'}</span>`}</li>`).join('')}</ul>`;
      const r = ready(lv, p);
      const form = r ? `<p class="cf-q">${esc(lv.q)}</p><form class="cf-form" data-cf-form autocomplete="off"><input class="field cf-in${ui.bad ? ' bad' : ''}" data-cf-in placeholder="Your answer" autocapitalize="characters" spellcheck="false" aria-label="Your answer"><button class="btn primary">Answer</button></form><p class="cf-msg" role="status">${esc(ui.msg || '')}</p>${lv.hint && (p.miss || 0) >= 2 ? `<p class="cf-hint">Hint: ${esc(lv.hint)}</p>` : ''}` : (lv.q && lv.tap ? `<p class="cf-wait">Tap the tag at ${esc(tagName(lv.tap).toLowerCase())} first.</p>` : '');
      cur = `<p class="cf-lv">Level ${k} of ${N}</p><h2>${esc(lv.name)}</h2><p class="cf-text">${esc(lv.text)}</p>${list}${form}`;
    }
    /* your notes: everything found on the levels already done */
    const notes = ['Cliff\'s poster: ' + C.poster];
    LV.slice(0, w ? N : Math.max(0, k - 1)).forEach(lv => {
      if (lv.visits) Object.values(lv.visits).forEach(t => notes.push(t));
      if (lv.trail) lv.trail.forEach(t => notes.push(lv.notes[t]));
      if (lv.found) notes.push(lv.found);
    });
    return `<div class="cf"><div class="cf-card"><small class="cf-kick">Case file · ${esc(C.title)}</small>${dots}${cur}</div>
      <details class="cf-notes"${k <= 1 && !w ? ' open' : ''}><summary>Your notes (${notes.length})</summary><ol>${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ol></details>
      <p class="cf-foot">This is a sidequest. It has nothing to do with the murders, so play it whenever you like.</p></div>`;
  }
  function onSubmit(e, me, ui, redraw) {
    const f = e.target.closest('[data-cf-form]'); if (!f) return false;
    e.preventDefault();
    const s = DB.get(), p = mine(s, me.id), lv = L()[(p.step || 1) - 1], v = norm((f.querySelector('[data-cf-in]') || {}).value);
    if (!v || !lv || !ready(lv, p) || wonAt(s, me.id)) return true;
    const u = {};
    if (!lv.a.some(a => norm(a) === v)) { ui.bad = true; ui.msg = 'Not quite. Look again.'; put(me.id, { miss: (p.miss || 0) + 1 }, u); }
    else { ui.bad = false; ui.msg = ''; advance(me, p, u); }
    DB.update(u); if (document.activeElement) document.activeElement.blur(); redraw(); return true;
  }
  return { started, isOpen, tap, begin, render, onSubmit, won: wonAt };
})();
