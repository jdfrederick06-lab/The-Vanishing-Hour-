/* =====================================================================
   THE VANISHING HOUR — the invitation and RSVP page (rsvp.html).
   The front is Victor Ashgrove's engraved invitation; "Reply" turns it over
   to a classic reply card. Replies are saved as rsvp/{id} and listed on the
   host terminal (RSVPs tab). A reply is never deleted: changing it keeps the
   earlier version, and the host can only archive.
   This page doesn't load story.js, so it can go online before the game does.
     rsvp/{id} = { first, last, reply: yes|maybe|no, size, world, phone, email,
                   with, notes, at, updated?, history?: [earlier versions], token }
   ===================================================================== */
(function () {
  const I = CONFIG.INVITE || {};
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'vh:' + CONFIG.GAME_ID + ':myrsvp';
  const mine = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const remember = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } };
  const ref = id => id.slice(-6).toUpperCase();

  const SIZES = [['lead', 'A leading role', 'Big secrets. You drive the story.'], ['support', 'A supporting role', 'A few secrets and a goal or two.'], ['cameo', 'A cameo', 'Light and relaxed. Mostly watch the drama.']];
  const WORLDS = [['guest', 'A guest at the gala', 'Socialites, collectors and old money'], ['fbi', 'An FBI agent', 'Work the case from FBI Headquarters'], ['crew', 'The art crew', 'Pull off the heist without getting caught'], ['staff', 'Gala staff', 'Guards, caterers, the people who see everything'], ['any', 'Surprise me', 'Put me wherever the story needs me']];
  const REPLIES = [['yes', 'accepts with pleasure'], ['maybe', 'hopes to attend'], ['no', 'declines with regret']];

  const st = { side: 'front', step: 'form', err: '', f: { first: '', last: '', reply: '', size: '', world: '', phone: '', email: '', with: '', notes: '' } };
  const prev = mine(); if (prev) { const s = DB.get(), r = s.rsvp && s.rsvp[prev.id]; if (r && r.token === prev.token) { st.step = 'done'; st.saved = Object.assign({ id: prev.id }, r); } }

  const corner = n => `<svg class="gl-corner k${n}" viewBox="0 0 40 40" aria-hidden="true"><path d="M1 39 V15 Q1 1 15 1 H39" fill="none" stroke="url(#gc)" stroke-width="1.2"/><path d="M6 39 V19 Q6 6 19 6 H39" fill="none" stroke="url(#gc)" stroke-width=".6"/><path d="M11 11 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" fill="url(#gc)"/></svg>`;
  const lobes = Array.from({ length: 22 }, (_, k) => { const a = k / 22 * Math.PI * 2, r = 35 + (k % 2 ? 2.6 : -.6) + Math.sin(k * 1.7) * 1.2; return `${(40 + Math.cos(a) * r).toFixed(1)},${(40 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
  const seal = `<svg viewBox="0 0 80 80"><defs><radialGradient id="wax" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#d8384d"/><stop offset=".55" stop-color="#9a1427"/><stop offset="1" stop-color="#5c0815"/></radialGradient></defs><polygon points="${lobes}" fill="url(#wax)"/><circle cx="40" cy="40" r="25" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2.2"/><text x="40" y="49.5" text-anchor="middle" font-family="Cinzel, serif" font-size="26" fill="rgba(0,0,0,.38)">A</text><text x="39.2" y="48.7" text-anchor="middle" font-family="Cinzel, serif" font-size="26" fill="rgba(255,255,255,.16)">A</text><ellipse cx="29" cy="24" rx="9" ry="4" fill="rgba(255,255,255,.18)" transform="rotate(-30 29 24)"/></svg>`;
  const title = CONFIG.EVENT.split(' ').map((w, i) => `<span class="gl-w" style="--i:${i}">${w.split('').map((ch, j) => `<span style="--j:${i * 6 + j}">${esc(ch)}</span>`).join('')}</span>`).join(' ');
  const rnd = (a, b) => a + Math.random() * (b - a);

  function front() {
    return `<div class="rv-face rv-front gl-card"><div class="gl-foil"></div><div class="gl-sheen"></div>${[1, 2, 3, 4].map(corner).join('')}
      <div class="gl-eyebrow">Mr. Victor Ashgrove<br>requests the pleasure of your company at</div>
      <h1 class="gl-title" aria-label="${esc(CONFIG.EVENT)}">${title}</h1>
      <div class="gl-orn" aria-hidden="true"><i></i><b>◆</b><i></i></div>
      <p class="gl-sub">An evening with the Ashgrove Collection<br>and the Winter Star</p>
      <dl class="rv-when"><div><dt>When</dt><dd>${esc(I.DATE || '')}</dd><dd class="rv-dim">${esc(I.TIME || '')}</dd></div><div><dt>Where</dt><dd>${esc(I.PLACE || '')}</dd></div><div><dt>Dress</dt><dd>${esc(I.DRESS || '')}</dd></div></dl>
      <button type="button" class="btn primary gl-btn rv-go" data-rv="flip"><span>${st.step === 'done' ? 'See your reply' : 'Reply'}</span></button>
      <p class="rv-rsvpby">R.S.V.P. · ${esc(I.RSVP_BY || '')}</p></div>`;
  }
  const opt = (name, val, label, sub, on) => `<label class="rv-opt${on ? ' on' : ''}"><input type="radio" name="${name}" value="${val}" ${on ? 'checked' : ''}><span class="rv-dot" aria-hidden="true"></span><span><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></label>`;
  function back() {
    const f = st.f, coming = f.reply === 'yes' || f.reply === 'maybe';
    if (st.step === 'done') {
      const r = st.saved, rep = (REPLIES.find(x => x[0] === r.reply) || [])[1] || '';
      return `<div class="rv-face rv-back rv-card"><div class="rv-done">
        <div class="rv-tick" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>
        <h2>${r.reply === 'no' ? 'We\'ll miss you' : 'Your reply is in'}</h2>
        <p class="rv-line"><span>M</span><b>${esc(r.first)} ${esc(r.last)}</b></p>
        <p class="rv-reply">${esc(rep)}</p>
        ${r.reply === 'no' ? '<p class="rv-p">Thank you for letting us know. If your plans change, you can change your reply here.</p>'
          : `<p class="rv-p">Before the night you'll get your character: who you are, your secrets, and the code word that lets you in. ${r.email ? 'It goes to <b>' + esc(r.email) + '</b>.' : 'Your host will hand it to you.'}</p>
            <ul class="rv-sum"><li><span>Part</span>${esc((SIZES.find(x => x[0] === r.size) || [, ''])[1])}</li><li><span>Playing as</span>${esc((WORLDS.find(x => x[0] === r.world) || [, ''])[1])}</li></ul>
            <p class="rv-p rv-dim">Bring a charged phone. The whole night runs on it.</p>`}
        <p class="rv-ref">Reply no. ${esc(ref(r.id))}</p>
        <div class="rv-acts"><button type="button" class="rv-link" data-rv="edit">Change my reply</button><button type="button" class="rv-link" data-rv="flip">Back to the invitation</button></div></div></div>`;
    }
    return `<form class="rv-face rv-back rv-card" id="rvf" novalidate>
      <div class="rv-head"><small>Kindly reply</small><b>${esc(CONFIG.EVENT)}</b></div>
      <div class="rv-name"><span class="rv-m">M</span><input class="rv-in" name="first" placeholder="First name" value="${esc(f.first)}" autocomplete="given-name" aria-label="First name"><input class="rv-in" name="last" placeholder="Last name" value="${esc(f.last)}" autocomplete="family-name" aria-label="Last name"></div>
      <fieldset class="rv-set rv-replies"><legend class="hide">Your reply</legend>${REPLIES.map(([v, l]) => opt('reply', v, l, '', f.reply === v)).join('')}</fieldset>
      ${coming ? `
        <div class="rv-what"><b>What this is:</b> an interactive murder mystery. You'll play a character all night: a guest, an agent, a thief or staff, with secrets to keep and a goal to chase. Someone at the gala is a killer. Nobody is told the answer.</div>
        <fieldset class="rv-set"><legend>How big a part would you like?</legend>${SIZES.map(([v, l, d]) => opt('size', v, l, d, f.size === v)).join('')}</fieldset>
        <fieldset class="rv-set"><legend>Which side of the night sounds most fun?</legend>${WORLDS.map(([v, l, d]) => opt('world', v, l, d, f.world === v)).join('')}</fieldset>
        <fieldset class="rv-set rv-row"><legend>Will you have a smartphone with you?</legend>${opt('phone', 'yes', 'Yes', '', f.phone === 'yes')}${opt('phone', 'no', 'No', '', f.phone === 'no')}</fieldset>
        <label class="rv-l">Email <i>(we send your character here)</i><input class="rv-in wide" type="email" name="email" placeholder="you@example.com" value="${esc(f.email)}" autocomplete="email"></label>
        <label class="rv-l">Anyone you'd love a storyline with? <i>(optional)</i><input class="rv-in wide" name="with" placeholder="A friend, a roommate…" value="${esc(f.with)}" maxlength="140"></label>
        <label class="rv-l">Allergies, access needs, or anything we should know? <i>(optional)</i><textarea class="rv-in wide" name="notes" rows="2" maxlength="400" placeholder="Stairs, food, anything your character shouldn't do…">${esc(f.notes)}</textarea></label>` : ''}
      <div class="err" role="alert">${esc(st.err)}</div>
      <button class="btn primary gl-btn rv-send" type="submit"><span>${st.saved ? 'Update my reply' : 'Send my reply'}</span></button>
      <button type="button" class="rv-link" data-rv="flip">Back to the invitation</button>
      <p class="rv-fine">Your reply is only seen by the hosts.</p>
    </form>`;
  }

  /* one side at a time; turning the card over plays the flip */
  let drawn = 0;   /* the slow gala entrance plays only the first time */
  function draw(turn) {
    $('#rvstage').innerHTML = `<div class="rv-flip${turn && !calm ? ' turn' : ''}${drawn++ ? ' again' : ''}">${st.side === 'back' ? back() : front()}</div>`;
  }
  $('#root').innerHTML = `<div class="gl rv" id="scene">
    <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="gc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e3a4"/><stop offset=".5" stop-color="#a8822f"/><stop offset="1" stop-color="#e8c46c"/></linearGradient></defs></svg>
    <div class="gl-wall"></div><div class="gl-spot" id="spot" aria-hidden="true"></div>
    <div class="gl-motes" aria-hidden="true">${Array.from({ length: calm ? 0 : 22 }, () => `<i style="left:${rnd(2, 98)}%;--s:${rnd(2, 4.5).toFixed(1)}px;--t:${rnd(9, 20).toFixed(1)}s;--dl:-${rnd(0, 20).toFixed(1)}s;--dx:${rnd(-40, 40).toFixed(0)}px"></i>`).join('')}</div>
    <main class="gl-stage rv-stage"><div id="rvstage"></div><div class="gl-seal rv-seal" aria-hidden="true">${seal}</div>
      <p class="gl-fine">${esc(CONFIG.TITLE)} · ${esc(CONFIG.SEASON)} · Hosted by ${esc(I.HOST || '')}</p></main>
    <div class="gl-vig"></div></div>`;
  document.title = "You're Invited · " + CONFIG.EVENT;
  draw();
  if (!calm) addEventListener('pointermove', e => { const s = $('#spot'); if (s) { s.style.setProperty('--mx', e.clientX + 'px'); s.style.setProperty('--my', e.clientY + 'px'); } });

  /* keep typed answers without redrawing (so the keyboard stays put) */
  document.addEventListener('input', e => { const n = e.target.name; if (n && n in st.f && e.target.type !== 'radio') st.f[n] = e.target.value; });
  document.addEventListener('change', e => {
    const n = e.target.name; if (!n || !(n in st.f) || e.target.type !== 'radio') return;
    const was = st.f[n]; st.f[n] = e.target.value; st.err = '';
    /* the extra questions appear once you say you're coming */
    if (n === 'reply' && ((was === 'yes' || was === 'maybe') !== (st.f.reply === 'yes' || st.f.reply === 'maybe'))) { const y = scrollY; draw(); scrollTo(0, y); }
    else $$('input[name="' + n + '"]').forEach(x => x.closest('.rv-opt').classList.toggle('on', x.checked));
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-rv]'); if (!b) return;
    if (b.dataset.rv === 'flip') { st.side = st.side === 'back' ? 'front' : 'back'; st.err = ''; draw(true); scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' }); }
    if (b.dataset.rv === 'edit') { const r = st.saved; st.f = { first: r.first, last: r.last, reply: r.reply, size: r.size || '', world: r.world || '', phone: r.phone || '', email: r.email || '', with: r.with || '', notes: r.notes || '' }; st.step = 'form'; draw(); }
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'rvf') return; e.preventDefault();
    const f = st.f, coming = f.reply === 'yes' || f.reply === 'maybe';
    const fail = m => { st.err = m; draw(); const er = $('#rvf .err'); if (er) er.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' }); };
    f.first = f.first.trim(); f.last = f.last.trim(); f.email = f.email.trim();
    if (!f.first || !f.last) return fail('Please write your first and last name.');
    if (!f.reply) return fail('Please choose your reply.');
    if (coming && !f.size) return fail('How big a part would you like?');
    if (coming && !f.world) return fail('Which side of the night sounds most fun?');
    if (coming && !f.phone) return fail('Will you have a smartphone with you?');
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return fail('That email doesn\'t look right.');
    const rec = { first: f.first, last: f.last, reply: f.reply, size: coming ? f.size : null, world: coming ? f.world : null, phone: coming ? f.phone : null, email: f.email || null, with: coming ? f.with.trim() || null : null, notes: coming ? f.notes.trim() || null : null };
    const s = DB.fresh(), u = {};
    let id;
    if (st.saved && s.rsvp && s.rsvp[st.saved.id]) {
      /* changing a reply keeps the earlier version */
      id = st.saved.id;
      const old = s.rsvp[id], keep = Object.assign({}, old); delete keep.history; delete keep.token;
      Object.assign(rec, { at: old.at, token: old.token, updated: Date.now(), history: (old.history || []).concat([keep]) });
    } else {
      id = uid('v');
      Object.assign(rec, { at: Date.now(), token: Math.random().toString(36).slice(2) + Date.now().toString(36) });
    }
    u['rsvp/' + id] = rec;
    if (!DB.update(u)) return fail('Something went wrong saving your reply. Please try again.');
    remember({ id, token: rec.token });
    st.saved = Object.assign({ id }, rec); st.step = 'done'; st.err = ''; draw();
    scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  });
})();
