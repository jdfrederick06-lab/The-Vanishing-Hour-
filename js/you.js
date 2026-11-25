/* =====================================================================
   THE VANISHING HOUR — your character (you.html), Nov 25.
   The personal link in a player's casting email (you.html?as=CODE). A sealed envelope opens to
   reveal their character; they choose their character's pronouns (Rowan and Victor are fixed by
   the story), then accept, or ask the host for a different character.
   Saved at players/{id}/profile = { opened, accepted, pronouns, change: { note, at }, dossier }.
   The host sees all of it in Host terminal > RSVPs.
   ===================================================================== */
(function () {
  const ME = Session.player();
  const root = $('#root');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!ME) {
    root.innerHTML = `<main class="yo-wrap"><div class="yo-card yo-plain"><small class="yo-kick">${esc(CONFIG.EVENT)}</small><h1>This link didn't open</h1><p>Use the personal link in your email, or sign in with your code word at the gala door.</p><a class="yo-btn" href="gala/">Go to the gala door</a></div><p class="yo-copy">${esc(COPYRIGHT)}</p></main>`;
    return;
  }
  const first = ME.name.split(' ')[0];
  const WORLD = { fbi: 'FBI Headquarters', bebbit: 'The gala', nightwire: 'Omnizon' }[G.door(ME)] || '';
  const prof = () => Pron.profile(ME.id) || {};
  const save = u => DB.update(Object.fromEntries(Object.entries(u).map(([k, v]) => ['players/' + ME.id + '/profile/' + k, v])));
  const OPTS = ['she/her', 'he/him', 'they/them'];
  let pick = null, mode = 'card', other = '';

  function card() {
    return `<div class="yo-card" id="card"><div class="yo-foil" aria-hidden="true"></div>
      <small class="yo-kick">The Ashgrove Gala · ${esc(CONFIG.TITLE)}</small>
      <p class="yo-will">You will play</p>
      <h1 class="yo-name" id="nm" aria-label="${esc(ME.name)}">${calm ? esc(ME.name) : ''}</h1>
      <p class="yo-role">${esc(ME.role)}</p>
      <div class="yo-rule" aria-hidden="true"></div>
      <p class="yo-prof">${esc(ME.profile || '')}</p>
      <dl class="yo-facts"><dt>Where you'll spend the night</dt><dd>${esc(WORLD)}</dd><dt>When</dt><dd>${esc(CONFIG.INVITE.DATE)}</dd><dt>Where</dt><dd>${esc(CONFIG.INVITE.PLACE)}</dd></dl>
    </div>`;
  }
  function panel() {
    const p = prof(), fixed = Pron.fixed(ME.id);
    if (p.accepted && mode !== 'change') return `<section class="yo-panel yo-done"><b>You're in, ${esc(first)}.</b>
      <p>You accepted ${esc(ME.name)}${Pron.of(ME.id) ? ` (${esc(Pron.of(ME.id))})` : ''}. Your full file is waiting: backstory, secrets, goals, and who to find.</p>
      <a class="yo-btn" href="app.html?tab=me">Open your file</a>
      <button type="button" class="yo-link" data-a="change">Need a different character?</button></section>`;
    if (mode === 'change') return `<section class="yo-panel"><b>Ask for a different character</b>
      <p>Tell the host what you'd like instead. They'll be in touch.</p>
      <textarea class="field yo-note" id="note" maxlength="300" placeholder="For example: someone with less to say, or a part with friends I know">${esc((p.change || {}).note || '')}</textarea>
      <div class="yo-row"><button type="button" class="yo-btn" data-a="send">Send my request</button><button type="button" class="yo-link" data-a="back">Back</button></div></section>`;
    const asked = p.change && !p.accepted ? `<p class="yo-sent">✓ You asked for a different character. The host will be in touch.</p>` : '';
    return `<section class="yo-panel">${asked}
      <b>Your character's pronouns</b>
      ${fixed ? `<p>${esc(first)}'s pronouns are part of the story: <span class="yo-chip on">${esc(fixed)}</span></p>`
        : `<div class="yo-chips" role="radiogroup" aria-label="Pronouns">${OPTS.map(o => `<button type="button" role="radio" aria-checked="${pick === o}" class="yo-chip${pick === o ? ' on' : ''}" data-p="${o}">${o}</button>`).join('')}<button type="button" role="radio" aria-checked="${pick === 'other'}" class="yo-chip${pick === 'other' ? ' on' : ''}" data-p="other">Something else</button></div>
          ${pick === 'other' ? `<input class="field yo-other" id="other" maxlength="24" placeholder="e.g. xe/xem" value="${esc(other)}">` : ''}
          <p class="yo-hint">Everyone will see these next to ${esc(first)}'s name tonight.</p>`}
      <button type="button" class="yo-btn yo-go" data-a="accept">I'll play ${esc(first)}</button>
      <button type="button" class="yo-link" data-a="change">Ask for a different character</button>
      <div class="err" id="err" role="alert"></div></section>`;
  }
  function draw() { const pn = $('#pan'); if (pn) pn.innerHTML = panel(); }

  /* the opening: a sealed envelope; tap it (or wait) and the card rises out */
  function stage(open) {
    root.innerHTML = `<main class="yo-wrap"><div class="yo-spot" aria-hidden="true"></div>
      <div class="yo-stage${open ? ' opened' : ''}" id="stage">
        <button type="button" class="yo-env" id="env" aria-label="Open your invitation">
          <span class="yo-back"></span><span class="yo-flap"></span><span class="yo-front"><span class="yo-to">For ${esc(first)}</span></span>
          <span class="yo-seal" aria-hidden="true">VH</span>
        </button>
        ${card()}
      </div>
      <div id="pan" class="yo-pan">${open ? panel() : ''}</div>
      ${open ? '' : '<button type="button" class="yo-skip" data-a="skip">Skip the opening</button>'}
      <p class="yo-copy">${esc(COPYRIGHT)}</p></main>`;
    if (open) $('#nm').textContent = ME.name;
  }
  function openIt() {
    const st = $('#stage'); if (!st || st.classList.contains('opening') || st.classList.contains('opened')) return;
    st.classList.add('opening'); const sk = $('.yo-skip'); if (sk) sk.remove();
    const nm = $('#nm'), name = ME.name; let i = 0;
    setTimeout(() => {
      st.classList.add('opened');
      if (calm) { nm.textContent = name; $('#pan').innerHTML = panel(); return; }
      const tick = () => { nm.textContent = name.slice(0, ++i); if (i < name.length) setTimeout(tick, 70); else setTimeout(() => { $('#pan').innerHTML = panel(); $('#pan').classList.add('in'); }, 350); };
      setTimeout(tick, 900);
    }, calm ? 0 : 1100);
  }

  document.addEventListener('click', e => {
    if (e.target.closest('#env')) return openIt();
    const a = e.target.closest('[data-a]'), p = e.target.closest('[data-p]');
    if (p) { pick = p.dataset.p; draw(); if (pick === 'other') setTimeout(() => { const o = $('#other'); if (o) o.focus(); }, 0); return; }
    if (!a) return;
    const act = a.dataset.a;
    if (act === 'skip') { stage(true); return; }
    if (act === 'change') { mode = 'change'; draw(); return; }
    if (act === 'back') { mode = 'card'; draw(); return; }
    if (act === 'send') {
      const note = ($('#note').value || '').trim(); if (!note) { $('#note').focus(); return; }
      save({ change: { note, at: Date.now() }, accepted: null }); mode = 'card'; setTimeout(draw, 300); return;
    }
    if (act === 'accept') {
      const fixed = Pron.fixed(ME.id), pr = fixed || (pick === 'other' ? (other || '').trim() : pick);
      if (!pr) { $('#err').textContent = 'Choose your character\'s pronouns first.'; return; }
      save({ accepted: Date.now(), pronouns: fixed ? null : pr, change: null }); mode = 'card'; setTimeout(draw, 300);
    }
  });
  document.addEventListener('input', e => { if (e.target.id === 'other') other = e.target.value; });

  DB.loaded().then(() => {
    if ((DB.get().news || {}).closed) { location.replace('news.html'); return; }
    const p = prof();
    if (!p.opened) save({ opened: Date.now() });
    if (p.pronouns && !Pron.fixed(ME.id)) { pick = OPTS.includes(p.pronouns) ? p.pronouns : 'other'; if (pick === 'other') other = p.pronouns; }
    stage(!!p.accepted);
    if (!p.accepted && calm) openIt();
    DB.on(() => { if (mode === 'card' && $('#pan') && $('#pan').innerHTML && !document.activeElement.matches('input, textarea')) draw(); });
  });
})();
