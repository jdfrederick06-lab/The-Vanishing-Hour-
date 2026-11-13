/* =====================================================================
   THE VANISHING HOUR — the invitation page (rsvp.html).
   One scrolling page: Victor Ashgrove's engraved invitation, what the
   evening is, when and where, the rules of the night, what to bring, a few
   questions people ask, and the reply card. Nothing here gives the story away.
   Replies are saved as rsvp/{id} and listed on the host terminal (RSVPs tab).
   A reply is never deleted: changing it keeps the earlier version.
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

  /* the rules of the night (no spoilers) */
  const RULES = [
    ['Stay in character', 'From the moment you walk in until the final reveal, you are your character. If you need to step out of the game, say so plainly.'],
    ['Your code word is your key', 'It signs your phone into the game. Never share it, and never type someone else\'s.'],
    ['You may lie', 'Everyone has secrets, and you can lie about yours. The one exception: your sworn facts. If an FBI agent asks you about one directly, you must tell the truth.'],
    ['Your dossier stays yours', 'Never show anyone your file. Tell people what you choose, in your own words.'],
    ['Evidence is real', 'Found something? Scan the tag on it so everyone can see it, then leave it where it was unless your dossier says otherwise.'],
    ['Locks open the right way', 'Locked boxes open with the right key or code. Never force anything.'],
    ['The money is play money', 'NightBank, the casino, bribes and loans use game money only. Nobody spends a real cent.'],
    ['The host\'s word is final', 'If the host calls "Pause," freeze. If you\'re told you\'ve been thrown out of the gala, you keep playing, but you lose your vote and your money.'],
    ['If your character dies', 'Stay dead and stay quiet. The host will give you a new role, or you can enjoy the show.'],
    ['Everyone votes', 'At the end, everyone accuses: who stole the painting, and who is the killer. Then the truth is read.'],
    ['Be kind', 'Real people are behind every character. No rough handling, no running on the stairs, and look after the building.']
  ];
  const BRING = [['A charged phone', 'The whole night runs on it. A charger helps.'], ['Gala attire', 'Black tie optional. Your dossier suggests a costume.'], ['Your character', 'Read your dossier before you arrive. It\'s sent about a week before.'], ['Nothing else', 'No real money or valuables. Everything you need is in the game.']];
  const FAQ = [
    ['Do I need to be good at acting?', 'No. Read your dossier, talk to people, and follow your goals. Big or small, every part works at any level.'],
    ['How long is it?', 'About two and a half hours, start to finish.'],
    ['Can I come with a friend?', 'Yes, as long as they reply too. Tell us in your reply if you want a storyline together.'],
    ['What if I don\'t have a smartphone?', 'Say so in your reply and we\'ll set you up with a paper version.'],
    ['Is it scary?', 'It\'s a murder mystery, so there are two deaths in the story. Nothing gory, no jump scares.']
  ];

  const st = { step: 'form', err: '', f: { first: '', last: '', reply: '', size: '', world: '', phone: '', email: '', with: '', notes: '' } };
  const prev = mine(); if (prev) { const s = DB.get(), r = s.rsvp && s.rsvp[prev.id]; if (r && r.token === prev.token) { st.step = 'done'; st.saved = Object.assign({ id: prev.id }, r); } }

  const corner = n => `<svg class="gl-corner k${n}" viewBox="0 0 40 40" aria-hidden="true"><path d="M1 39 V15 Q1 1 15 1 H39" fill="none" stroke="url(#gc)" stroke-width="1.2"/><path d="M6 39 V19 Q6 6 19 6 H39" fill="none" stroke="url(#gc)" stroke-width=".6"/><path d="M11 11 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" fill="url(#gc)"/></svg>`;
  const lobes = Array.from({ length: 22 }, (_, k) => { const a = k / 22 * Math.PI * 2, r = 35 + (k % 2 ? 2.6 : -.6) + Math.sin(k * 1.7) * 1.2; return `${(40 + Math.cos(a) * r).toFixed(1)},${(40 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
  const seal = `<svg viewBox="0 0 80 80"><defs><radialGradient id="wax" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#d8384d"/><stop offset=".55" stop-color="#9a1427"/><stop offset="1" stop-color="#5c0815"/></radialGradient></defs><polygon points="${lobes}" fill="url(#wax)"/><circle cx="40" cy="40" r="25" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2.2"/><text x="40" y="49.5" text-anchor="middle" font-family="Cinzel, serif" font-size="26" fill="rgba(0,0,0,.38)">A</text><text x="39.2" y="48.7" text-anchor="middle" font-family="Cinzel, serif" font-size="26" fill="rgba(255,255,255,.16)">A</text><ellipse cx="29" cy="24" rx="9" ry="4" fill="rgba(255,255,255,.18)" transform="rotate(-30 29 24)"/></svg>`;
  const title = CONFIG.EVENT.split(' ').map((w, i) => `<span class="gl-w" style="--i:${i}">${w.split('').map((ch, j) => `<span style="--j:${i * 6 + j}">${esc(ch)}</span>`).join('')}</span>`).join(' ');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const orn = '<div class="rv-orn" aria-hidden="true"><i></i><b>◆</b><i></i></div>';

  function hero() {
    return `<div class="rv-hero gl-card"><div class="gl-foil"></div><div class="gl-sheen"></div>${[1, 2, 3, 4].map(corner).join('')}
      <div class="gl-eyebrow">Mr. Victor Ashgrove<br>requests the pleasure of your company at</div>
      <h1 class="gl-title" aria-label="${esc(CONFIG.EVENT)}">${title}</h1>
      <div class="gl-orn" aria-hidden="true"><i></i><b>◆</b><i></i></div>
      <p class="gl-sub">An evening with the Ashgrove Collection<br>and the Winter Star</p>
      <dl class="rv-when"><div><dt>When</dt><dd>${esc(I.DATE || '')}</dd><dd class="rv-dim">${esc(I.TIME || '')}</dd></div><div><dt>Where</dt><dd>${esc(I.PLACE || '')}</dd></div><div><dt>Dress</dt><dd>${esc(I.DRESS || '')}</dd></div></dl>
      <div class="rv-cta"><a class="btn primary gl-btn" href="#reply"><span>${st.step === 'done' ? 'See your reply' : 'Reply'}</span></a><a class="rv-link" href="#rules">The rules of the night</a></div>
      <p class="rv-rsvpby">R.S.V.P. · ${esc(I.RSVP_BY || '')}</p></div>`;
  }
  const sec = (id, kicker, head, body) => `<section class="rv-sec" id="${id}" aria-labelledby="${id}-h"><small class="rv-kick">${kicker}</small><h2 id="${id}-h">${head}</h2>${orn}${body}</section>`;
  function sections() {
    return sec('evening', 'The evening', 'A night you play, not watch', `
        <p class="rv-lead">For one night only, Victor Ashgrove opens his private art collection to the city's most powerful people. Then a painting vanishes, a guard is found dead, and everyone in the room becomes a suspect. Including you.</p>
        <div class="rv-steps">
          <div><b>1</b><h3>Reply</h3><p>Tell us you're coming, and what kind of part you'd enjoy.</p></div>
          <div><b>2</b><h3>Get your character</h3><p>About a week before, you'll receive a dossier: who you are, your secrets, your goals, and your code word.</p></div>
          <div><b>3</b><h3>Play the night</h3><p>Your phone becomes your character's world. Talk, scheme, trade secrets, follow the money, and find the truth before the vote.</p></div>
        </div>`)
      + sec('where', 'When and where', esc(I.PLACE || 'To be announced'), `
        <div class="rv-facts">
          <div><small>Date</small><b>${esc(I.DATE || '')}</b></div>
          <div><small>Doors</small><b>${esc(I.TIME || '')}</b></div>
          <div><small>Place</small><b>${esc(I.PLACE || '')}</b><span>The story moves between several rooms. Directions come with your dossier.</span></div>
          <div><small>Dress</small><b>${esc(I.DRESS || '')}</b></div>
        </div>`)
      + sec('rules', 'Before you arrive', 'The rules of the night', `<ol class="rv-rules">${RULES.map(([h, p]) => `<li><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('')}</ol>`)
      + sec('bring', 'What to bring', 'Come ready', `<ul class="rv-bring">${BRING.map(([h, p]) => `<li><b>${esc(h)}</b><span>${esc(p)}</span></li>`).join('')}</ul>`)
      + sec('faq', 'Questions', 'People ask', `<div class="rv-faq">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`);
  }
  const opt = (name, val, label, sub, on) => `<label class="rv-opt${on ? ' on' : ''}"><input type="radio" name="${name}" value="${val}" ${on ? 'checked' : ''}><span class="rv-dot" aria-hidden="true"></span><span><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></label>`;
  function card() {
    const f = st.f, coming = f.reply === 'yes' || f.reply === 'maybe';
    if (st.step === 'done') {
      const r = st.saved, rep = (REPLIES.find(x => x[0] === r.reply) || [])[1] || '';
      return `<div class="rv-card"><div class="rv-done">
        <div class="rv-tick" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>
        <h2>${r.reply === 'no' ? 'We\'ll miss you' : 'Your reply is in'}</h2>
        <p class="rv-line"><span>M</span><b>${esc(r.first)} ${esc(r.last)}</b></p>
        <p class="rv-reply">${esc(rep)}</p>
        ${r.reply === 'no' ? '<p class="rv-p">Thank you for letting us know. If your plans change, you can change your reply here.</p>'
          : `<p class="rv-p">About a week before the night you'll get your character: who you are, your secrets, and the code word that lets you in. ${r.email ? 'It goes to <b>' + esc(r.email) + '</b>.' : 'Your host will hand it to you.'}</p>
            <ul class="rv-sum"><li><span>Part</span>${esc((SIZES.find(x => x[0] === r.size) || [, ''])[1])}</li><li><span>Playing as</span>${esc((WORLDS.find(x => x[0] === r.world) || [, ''])[1])}</li></ul>
            <p class="rv-p rv-dim">Until then, have a look at the rules of the night above.</p>`}
        <p class="rv-ref">Reply no. ${esc(ref(r.id))}</p>
        <div class="rv-acts"><button type="button" class="rv-link" data-rv="edit">Change my reply</button></div></div></div>`;
    }
    return `<form class="rv-card" id="rvf" novalidate>
      <div class="rv-head"><small>Kindly reply</small><b>${esc(CONFIG.EVENT)}</b></div>
      <div class="rv-name"><span class="rv-m">M</span><input class="rv-in" name="first" placeholder="First name" value="${esc(f.first)}" autocomplete="given-name" aria-label="First name"><input class="rv-in" name="last" placeholder="Last name" value="${esc(f.last)}" autocomplete="family-name" aria-label="Last name"></div>
      <fieldset class="rv-set rv-replies"><legend class="hide">Your reply</legend>${REPLIES.map(([v, l]) => opt('reply', v, l, '', f.reply === v)).join('')}</fieldset>
      ${coming ? `
        <fieldset class="rv-set"><legend>How big a part would you like?</legend>${SIZES.map(([v, l, d]) => opt('size', v, l, d, f.size === v)).join('')}</fieldset>
        <fieldset class="rv-set"><legend>Which side of the night sounds most fun?</legend>${WORLDS.map(([v, l, d]) => opt('world', v, l, d, f.world === v)).join('')}</fieldset>
        <fieldset class="rv-set rv-row"><legend>Will you have a smartphone with you?</legend>${opt('phone', 'yes', 'Yes', '', f.phone === 'yes')}${opt('phone', 'no', 'No', '', f.phone === 'no')}</fieldset>
        <label class="rv-l">Email <i>(we send your character here)</i><input class="rv-in wide" type="email" name="email" placeholder="you@example.com" value="${esc(f.email)}" autocomplete="email"></label>
        <label class="rv-l">Anyone you'd love a storyline with? <i>(optional)</i><input class="rv-in wide" name="with" placeholder="A friend, a roommate…" value="${esc(f.with)}" maxlength="140"></label>
        <label class="rv-l">Allergies, access needs, or anything we should know? <i>(optional)</i><textarea class="rv-in wide" name="notes" rows="2" maxlength="400" placeholder="Stairs, food, anything your character shouldn't do…">${esc(f.notes)}</textarea></label>` : ''}
      <div class="err" role="alert">${esc(st.err)}</div>
      <button class="btn primary gl-btn rv-send" type="submit"><span>${st.saved ? 'Update my reply' : 'Send my reply'}</span></button>
      <p class="rv-fine">Only the hosts see your reply.</p>
    </form>`;
  }
  function drawCard() { $('#rvcard').innerHTML = card(); }

  $('#root').innerHTML = `<div class="gl rv" id="scene">
    <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="gc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e3a4"/><stop offset=".5" stop-color="#a8822f"/><stop offset="1" stop-color="#e8c46c"/></linearGradient></defs></svg>
    <div class="gl-wall"></div><div class="gl-spot" id="spot" aria-hidden="true"></div>
    <div class="gl-motes" aria-hidden="true">${Array.from({ length: calm ? 0 : 22 }, () => `<i style="left:${rnd(2, 98)}%;--s:${rnd(2, 4.5).toFixed(1)}px;--t:${rnd(9, 20).toFixed(1)}s;--dl:-${rnd(0, 20).toFixed(1)}s;--dx:${rnd(-40, 40).toFixed(0)}px"></i>`).join('')}</div>
    <main class="rv-page">
      <div class="rv-top">${hero()}<div class="gl-seal rv-seal" aria-hidden="true">${seal}</div></div>
      ${sections()}
      <section class="rv-sec rv-replysec" id="reply" aria-labelledby="reply-h"><small class="rv-kick">R.S.V.P.</small><h2 id="reply-h">Kindly reply</h2>${orn}<div id="rvcard"></div></section>
      <footer class="rv-foot"><p>${esc(CONFIG.TITLE)} · ${esc(CONFIG.SEASON)}</p><p>Hosted by ${esc(I.HOST || '')}</p><p><a href="index.html">Already have your code word? Enter the gala</a></p></footer>
    </main>
    <div class="gl-vig"></div></div>`;
  document.title = "You're Invited · " + CONFIG.EVENT;
  drawCard();
  if (!calm) addEventListener('pointermove', e => { const s = $('#spot'); if (s) { s.style.setProperty('--mx', e.clientX + 'px'); s.style.setProperty('--my', e.clientY + 'px'); } });
  /* sections drift in as they scroll into view */
  if (!calm && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: .12 });
    $$('.rv-sec').forEach(s => { s.classList.add('rv-fade'); io.observe(s); });
  }

  /* keep typed answers without redrawing (so the keyboard stays put) */
  document.addEventListener('input', e => { const n = e.target.name; if (n && n in st.f && e.target.type !== 'radio') st.f[n] = e.target.value; });
  document.addEventListener('change', e => {
    const n = e.target.name; if (!n || !(n in st.f) || e.target.type !== 'radio') return;
    const was = st.f[n]; st.f[n] = e.target.value; st.err = '';
    /* the extra questions appear once you say you're coming */
    if (n === 'reply' && ((was === 'yes' || was === 'maybe') !== (st.f.reply === 'yes' || st.f.reply === 'maybe'))) drawCard();
    else $$('input[name="' + n + '"]').forEach(x => x.closest('.rv-opt').classList.toggle('on', x.checked));
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-rv]'); if (!b) return;
    if (b.dataset.rv === 'edit') { const r = st.saved; st.f = { first: r.first, last: r.last, reply: r.reply, size: r.size || '', world: r.world || '', phone: r.phone || '', email: r.email || '', with: r.with || '', notes: r.notes || '' }; st.step = 'form'; drawCard(); }
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'rvf') return; e.preventDefault();
    const f = st.f, coming = f.reply === 'yes' || f.reply === 'maybe';
    const fail = m => { st.err = m; drawCard(); const er = $('#rvf .err'); if (er) er.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' }); };
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
    st.saved = Object.assign({ id }, rec); st.step = 'done'; st.err = ''; drawCard();
    const sec = $('#reply'); if (sec) sec.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
  });
})();
