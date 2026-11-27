/* =====================================================================
   THE VANISHING HOUR — the NFC tag (tap.html?t=<tag id>).
   One tag, a different secret for each group or person (settings/evidence.js > STORY.nfc).
   It knows who's tapping the same way a scanned QR does: the phone's sign-in.
   Every tap goes in the host's log. Before the tag "opens" on the game clock it shows nothing.
   ===================================================================== */
DB.loaded().then(function () {
  const id = (new URLSearchParams(location.search).get('t') || '').toLowerCase();
  const tag = (STORY.nfc || {})[id];
  const host = Session.lastHost(), me = host ? null : Session.lastPlayer();
  const top = '<div class="sc-top"><b>&#9673;</b><span>The Ashgrove Gala</span></div>';
  const page = inner => { $('#root').innerHTML = `<div class="sc">${top}${inner}</div>`; };
  if (!tag) return page('<div class="sc-warn">This tag isn\'t part of tonight.</div>');
  if (!me && !host) return page('<div class="sc-warn">Nothing happens. Sign in on this phone first (open the <a href="gala/">gala door</a> and type your code word), then tap again.</div>');

  const s = DB.get(), r = Clock.read(s), o = tag.opens || {};
  const pi = o.phase ? STORY.phases.findIndex(p => p.id === o.phase) : -1;
  const open = !!host || r.state === 'over' || (pi < 0 ? r.state !== 'before' : r.i >= pi);
  const line = me ? ((tag.people || {})[me.id] || (tag.groups || {})[me.group] || '') : null;

  if (me) { const u = {}; Clock.log(u, 'evidence', `${me.name} tapped the NFC tag (${tag.where || id})${open ? '' : ' before it opened'}.`); DB.update(u); }
  try { if (navigator.vibrate && open && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(40); } catch (e) { }

  if (!open) return page('<h1>' + esc(tag.title || 'A small tag') + '</h1><p class="who">A blank sticker. Nothing on it yet.</p>');
  if (host) {
    /* hosts see every version, to check the wording */
    const rows = Object.entries(tag.groups || {}).map(([g, t]) => `<div class="sc-ok"><b>${esc((STORY.groups[g] || {}).name || g)}:</b> ${esc(t)}</div>`)
      .concat(Object.entries(tag.people || {}).map(([p, t]) => `<div class="sc-ok"><b>${esc((G.byId(p) || {}).name || p)} only:</b> ${esc(t)}</div>`));
    const H = tag.hunt, won = Object.entries((s.hunt || {}).won || {}).sort((a, b) => a[1] - b[1]);
    const hunt = H ? `<h1 style="margin-top:22px">${esc(H.title)}</h1><p class="who">Riddles, answers and where to hide the cards</p>${(H.steps || []).map((st, k) => `<div class="sc-ok"><b>${k + 1}.</b> ${esc(st.q)}<br><b>Answer:</b> ${esc(st.a[0])}${st.place ? `<br><b>Hide the card:</b> ${esc(st.place)}` : ''}</div>`).join('')}<div class="sc-warn"><b>Finished so far:</b> ${won.length ? won.map(([w], i) => esc((G.byId(w) || {}).name || w) + (i ? '' : ' (first)')).join(', ') : 'nobody yet'}</div>` : '';
    return page(`<h1>${esc(tag.title || id)}</h1><p class="who">Host view · ${esc(tag.where || '')}</p>${rows.join('')}${hunt}`);
  }
  const base = `<h1>${esc(tag.title || 'A small tag')}</h1><p class="who">${esc(me.name.split(' ')[0])}, only you can see this.</p><div class="sc-ok">${esc(line || 'Nothing here means anything to you.')}</div>`;
  const back = '<p class="who"><a href="app.html">Back to your phone</a></p>';
  if (!tag.hunt) return page(base + back);

  /* ---- The Curator's Hunt (Nov 26): three riddles; the first to finish gets the Curator's secret ---- */
  const H = tag.hunt, N = (H.steps || []).length;
  const norm = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const mine = () => ((DB.get().huntp || {})[me.id]) || { step: 0 };
  const wonAt = () => ((DB.get().hunt || {}).won || {})[me.id];
  let msg = '', bad = false;
  function draw() {
    const p = mine(), w = wonAt();
    let h = `<section class="hu"><div class="hu-card"><small class="hu-kick">${esc(H.title)}</small>`;
    if (w) {
      const r = (((DB.get().hunt || {}).prize || {})[me.id]) || {};
      h += `<b class="hu-done">Solved</b>${r.first ? `<p class="hu-secret">${esc(((H.first.people || {})[me.id]) || H.first.secret)}</p>` : '<p>Someone got here before you, but the Curator pays everyone who finishes.</p>'}${r.money ? `<p class="hu-money">${esc(typeof NW !== 'undefined' ? NW.money(r.money) : '$' + r.money.toLocaleString())} has been paid into your bank account.</p>` : ''}`;
    } else {
      const st = H.steps[p.step] || H.steps[0];
      h += (p.step === 0 ? `<p class="hu-intro">${esc(H.intro)}</p>` : '') +
        `<ol class="hu-dots" aria-label="Progress">${H.steps.map((_, k) => `<li class="${k < p.step ? 'on' : k === p.step ? 'now' : ''}"></li>`).join('')}</ol>
        <p class="hu-q"><b>${p.step + 1} of ${N}.</b> ${esc(st.q)}</p>
        <form id="hf" autocomplete="off"><input id="ha" class="hu-in${bad ? ' bad' : ''}" placeholder="Your answer" autocapitalize="characters" spellcheck="false" aria-label="Your answer"><button class="hu-btn">Answer</button></form>
        <p class="hu-msg" role="status">${esc(msg)}</p>${st.hint && (p.miss || 0) >= 2 ? `<p class="hu-hint">Hint: ${esc(st.hint)}</p>` : ''}`;
    }
    page(base + h + '</div></section>' + back);
    const f = $('#hf'); if (f) f.addEventListener('submit', answer);
  }
  function answer(e) {
    e.preventDefault();
    const p = mine(), st = H.steps[p.step], v = norm($('#ha').value); if (!v) return;
    if (!st.a.some(a => norm(a) === v)) {
      bad = true; msg = 'Not quite. Look again.';
      DB.update({ ['huntp/' + me.id]: { step: p.step, miss: (p.miss || 0) + 1 } }); setTimeout(draw, 60); return;
    }
    bad = false; msg = 'Yes.';
    if (p.step + 1 < N) { DB.update({ ['huntp/' + me.id]: { step: p.step + 1, miss: 0 } }); setTimeout(draw, 60); return; }
    /* solved: first to finish gets the secret and the big prize */
    const s2 = DB.get(), first = !Object.keys((s2.hunt || {}).won || {}).length, money = first ? H.first.money : H.later.money;
    const w = typeof NW !== 'undefined' ? NW.walletOf(me) : null, at = Date.now(), u = { ['huntp/' + me.id]: { step: N, at } };
    u['hunt/won/' + me.id] = at; u['hunt/prize/' + me.id] = { first, money: w ? money : 0 };
    if (w && money) u['nw/tx/' + uid('t')] = { from: 'curator', to: w, amt: money, memo: H.title + (first ? ' · first to finish' : ''), by: me.id, at };
    Clock.log(u, 'evidence', `${me.name} solved ${H.title}${first ? ' first' : ''}.`);
    DB.update(u); msg = ''; setTimeout(draw, 80);
  }
  draw();
});
