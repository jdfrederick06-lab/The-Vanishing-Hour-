/* =====================================================================
   THE VANISHING HOUR — the invitation (you.html), Nov 25 (redone the same day, Jacob:
   "grand, animated, feel like you're actually getting invited to an art gala").
   The personal link in a guest's casting email (you.html?as=CODE).
     1. A sealed envelope, addressed to the guest by their own name. Tap to break the seal.
     2. A formal invitation from the Ashgrove Foundation, to them, by name.
     3. The card turns over: tonight you will arrive as ... their character.
     4. Kindly reply: accept (choosing the character's pronouns), ask for another character,
        or regretfully decline. And a note to the host, which they can also send all night from the app.
   Saved at players/{id}/profile = { guest, opened, accepted, declined, pronouns, change: { note, at }, dossier }
   and asks/{key} for notes. The host sees all of it in Host terminal > RSVPs and Messages.
   ===================================================================== */
(function () {
  /* the personal link carries the code word: you.html?as=CODE signs this tab in as that character */
  const AS = new URLSearchParams(location.search).get('as');
  if (AS) { Session.signIn(AS); history.replaceState(null, '', location.pathname); }
  const ME = Session.player();
  const root = $('#root');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!ME) {
    root.innerHTML = `<main class="iv-wrap"><section class="iv-reply iv-done"><small class="iv-kick">${esc(CONFIG.TITLE)}</small><h3>This link didn't open</h3><p>Use the personal link in your invitation email, or sign in with your code word at the gala door.</p><a class="iv-btn" href="gala/">Go to the gala door</a></section><p class="iv-copy">${esc(COPYRIGHT)}</p></main>`;
    return;
  }
  const first = ME.name.split(' ')[0];
  const WORLD = { fbi: 'The FBI field office', bebbit: 'The gala floor', nightwire: 'The back rooms' }[G.door(ME)] || '';
  const INV = CONFIG.INVITE || {};
  const prof = () => Pron.profile(ME.id) || {};
  const guest = () => String(prof().guest || '').trim();
  const save = u => DB.update(Object.fromEntries(Object.entries(u).map(([k, v]) => ['players/' + ME.id + '/profile/' + k, v])));
  const OPTS = ['she/her', 'he/him', 'they/them'];
  const initials = n => n.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  let pick = null, other = '', mode = 'reply', sentNote = false;

  /* ornaments */
  const CORNER = (t = '') => '<svg viewBox="0 0 60 60" aria-hidden="true"><g transform="' + t + '"><path d="M2 58V20C2 10 10 2 20 2h38"/><path d="M8 58V24c0-9 7-16 16-16h34"/><circle cx="20" cy="20" r="3.2"/><path d="M14 36c6 0 10-4 10-10M36 14c0 6-4 10-10 10"/></g></svg>';
  const FLOURISH = '<svg class="iv-flourish" viewBox="0 0 240 24" aria-hidden="true"><path d="M4 12h88M148 12h88"/><path d="M96 12c8-10 16-10 24 0s16 10 24 0"/><path d="M96 12c8 10 16 10 24 0s16-10 24 0"/><circle cx="120" cy="12" r="2.6"/></svg>';
  const corners = `<span class="iv-c tl">${CORNER()}</span><span class="iv-c tr">${CORNER("translate(60 0) scale(-1 1)")}</span><span class="iv-c bl">${CORNER("translate(0 60) scale(1 -1)")}</span><span class="iv-c br">${CORNER("translate(60 60) scale(-1 -1)")}</span>`;
  const dust = () => calm ? '' : `<div class="iv-dust" aria-hidden="true">${Array.from({ length: 34 }, () => `<i style="left:${(Math.random() * 100).toFixed(1)}%;animation-delay:${(-Math.random() * 16).toFixed(1)}s;animation-duration:${(10 + Math.random() * 10).toFixed(1)}s;--s:${(0.5 + Math.random() * 1.3).toFixed(2)};--x:${(Math.random() * 60 - 30).toFixed(0)}px"></i>`).join('')}</div>`;

  /* 2: the invitation */
  function invitation() {
    const g = guest();
    return `<article class="iv-card iv-front" aria-label="Your invitation">${corners}<div class="iv-sheen" aria-hidden="true"></div>
      <small class="iv-kick">The Ashgrove Foundation</small>
      <p class="iv-line">requests the honour of the presence of</p>
      <h1 class="iv-guest">${esc(g || 'Our honoured guest')}</h1>
      <p class="iv-line">at the <b>Ashgrove Gala</b>, in celebration of</p>
      <p class="iv-work">The Vanishing Hour</p>
      <p class="iv-line small">a masterpiece shown in public for one night only</p>
      ${FLOURISH}
      <dl class="iv-when">
        <div><dt>When</dt><dd>${esc(INV.DATE || '')}</dd></div>
        <div><dt>Doors</dt><dd>${esc(INV.TIME || '')}</dd></div>
        <div><dt>Where</dt><dd>${esc(INV.PLACE || '')}</dd></div>
        <div><dt>Dress</dt><dd>${esc(INV.DRESS || '')}</dd></div>
      </dl>
      <button type="button" class="iv-btn iv-turn" data-a="turn">Who you'll be tonight <span aria-hidden="true">→</span></button>
    </article>`;
  }
  /* 3: the other side of the card */
  function character() {
    const pr = Pron.of(ME.id);
    return `<article class="iv-card iv-back" aria-label="Your character">${corners}<div class="iv-sheen" aria-hidden="true"></div>
      <small class="iv-kick">${esc(guest() ? guest() + ', tonight' : 'Tonight')} you will arrive as</small>
      <div class="iv-medal" aria-hidden="true"><span>${esc(initials(ME.name))}</span></div>
      <h2 class="iv-name">${esc(ME.name)}</h2>
      <p class="iv-role">${esc(ME.role)}${pr ? ` <span class="iv-pr">${esc(pr)}</span>` : ''}</p>
      ${FLOURISH}
      <p class="iv-prof">${esc(ME.profile || '')}</p>
      <p class="iv-world"><span>Where you'll spend the night</span><b>${esc(WORLD)}</b></p>
      <p class="iv-secret">Your full file (your secrets, your goals, and who to find) opens once you accept.</p>
      <button type="button" class="iv-link iv-flipback" data-a="unturn">← See the invitation again</button>
    </article>`;
  }

  /* 4: the reply card */
  function reply() {
    const p = prof(), fixed = Pron.fixed(ME.id), g = guest();
    if (p.declined) return `<section class="iv-reply iv-done"><small class="iv-kick">Kindly reply</small>
      <h3>We'll miss you${g ? ', ' + esc(g) : ''}.</h3>
      <p>You let the host know you can't make it, and ${esc(first)} will go to someone else.</p>
      <button type="button" class="iv-link" data-a="undecline">Changed your mind? Reply again</button></section>`;
    if (p.accepted && mode !== 'change') return `<section class="iv-reply iv-done"><small class="iv-kick">Kindly reply</small>
      <div class="iv-check" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>
      <h3>You're on the list${g ? ', ' + esc(g) : ''}.</h3>
      <p>You will play ${esc(ME.name)}${Pron.of(ME.id) ? ` (${esc(Pron.of(ME.id))})` : ''}. Your file is open now: backstory, secrets, goals, and who to find. Read it before the gala.</p>
      <a class="iv-btn" href="app.html?tab=me">Open your file</a>
      <button type="button" class="iv-link" data-a="change">Need a different character?</button></section>`;
    if (mode === 'change' || mode === 'decline') {
      const dec = mode === 'decline';
      return `<section class="iv-reply"><small class="iv-kick">Kindly reply</small>
        <h3>${dec ? 'Regretfully declines' : 'Would like another character'}</h3>
        <p>${dec ? 'Sorry you can\'t make it. Anything you want the host to know? (Optional.)' : 'Tell the host what you\'d like instead. They\'ll be in touch.'}</p>
        <textarea class="iv-field" id="note" maxlength="300" placeholder="${dec ? 'Optional' : 'For example: someone with fewer lines, or a part alongside friends of mine'}">${dec ? '' : esc((p.change || {}).note || '')}</textarea>
        <div class="iv-row"><button type="button" class="iv-btn${dec ? ' iv-dark' : ''}" data-a="${dec ? 'decline' : 'send'}">${dec ? 'Send my regrets' : 'Send my request'}</button><button type="button" class="iv-link" data-a="back">Back</button></div>
        <div class="iv-err" id="err" role="alert"></div></section>`;
    }
    const asked = p.change && !p.accepted ? `<p class="iv-sent">✓ You asked for a different character. The host will be in touch, or you can still accept this one.</p>` : '';
    return `<section class="iv-reply"><small class="iv-kick">Kindly reply</small>${asked}
      <div class="iv-step"><b>${esc(first)}'s pronouns</b>
      ${fixed ? `<p>${esc(first)}'s pronouns are part of the story: <span class="iv-chip on">${esc(fixed)}</span></p>`
        : `<div class="iv-chips" role="radiogroup" aria-label="${esc(first)}'s pronouns">${OPTS.map(o => `<button type="button" role="radio" aria-checked="${pick === o}" class="iv-chip${pick === o ? ' on' : ''}" data-p="${o}">${o}</button>`).join('')}<button type="button" role="radio" aria-checked="${pick === 'other'}" class="iv-chip${pick === 'other' ? ' on' : ''}" data-p="other">Something else</button></div>
          ${pick === 'other' ? `<input class="iv-field" id="other" maxlength="24" placeholder="e.g. xe/xem" value="${esc(other)}">` : ''}
          <p class="iv-hint">Everyone sees these next to ${esc(first)}'s name all night.</p>`}</div>
      <div class="iv-choices">
        <button type="button" class="iv-btn iv-yes" data-a="accept">Joyfully accepts</button>
        <button type="button" class="iv-ghost" data-a="change">Would like another character</button>
        <button type="button" class="iv-ghost" data-a="declinemode">Regretfully declines</button>
      </div>
      <div class="iv-err" id="err" role="alert"></div></section>`;
  }
  /* always there: a note to the host */
  function notes() {
    const mine = HostNote.mine(ME.id);
    return `<section class="iv-reply iv-notes"><small class="iv-kick">A note to the host</small>
      <p>A question, something you need, a costume idea, anything at all. Only the hosts read it. You can send one from your phone all night, too.</p>
      <textarea class="iv-field" id="hn" maxlength="500" placeholder="Write a note"></textarea>
      <div class="iv-row"><button type="button" class="iv-btn iv-dark" data-a="note">Send to the host</button>${sentNote ? '<span class="iv-sent">✓ Sent</span>' : ''}</div>
      ${mine.length ? `<ul class="iv-sentlist" aria-label="Notes you've sent">${mine.slice(0, 5).map(n => `<li><time>${esc(new Date(n.at).toLocaleDateString([], { month: 'short', day: 'numeric' }))}</time>${esc(n.text)}</li>`).join('')}</ul>` : ''}</section>`;
  }

  /* the page. step: sealed (envelope) > invite (the front of the card) > char (turned over, with the reply) */
  function stage(step) {
    const g = guest();
    root.innerHTML = `<main class="iv-wrap">${dust()}<div class="iv-spot" aria-hidden="true"></div>
      <div class="iv-scene ${step}" id="scene">
        <button type="button" class="iv-env" id="env" aria-label="Break the seal and open your invitation" ${step === 'sealed' ? '' : 'hidden'}>
          <span class="iv-eback"></span><span class="iv-peek"></span><span class="iv-pocket"></span><span class="iv-flap"></span>
          <span class="iv-addr"><small>By hand, for</small><b>${esc(g || first)}</b></span>
          <span class="iv-seal" aria-hidden="true"><i class="l"></i><i class="r"></i><em>A</em></span>
        </button>
        <div class="iv-flip" id="flip"><div class="iv-inner">${invitation()}${character()}</div></div>
      </div>
      <p class="iv-tap" id="tap" ${step === 'sealed' ? '' : 'hidden'}>Tap the seal to open</p>
      <div id="pan" class="iv-pan">${step === 'char' ? reply() + notes() : ''}</div>
      <p class="iv-copy"><button type="button" class="iv-link" data-a="replay">Replay the invitation</button><br>${esc(COPYRIGHT)}</p></main>`;
  }
  function drawPan() { const pn = $('#pan'), sc = $('#scene'); if (pn && sc && sc.classList.contains('char')) pn.innerHTML = reply() + notes(); }
  function go(step) {
    const sc = $('#scene'); if (!sc) return;
    sc.className = 'iv-scene ' + step;
    const pn = $('#pan');
    if (step === 'char') { pn.innerHTML = reply() + notes(); pn.classList.remove('in'); void pn.offsetWidth; pn.classList.add('in'); }
    else pn.innerHTML = '';
    setTimeout(() => sc.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }), calm ? 0 : 450);
  }
  function openIt() {
    const sc = $('#scene'); if (!sc || !sc.classList.contains('sealed') || sc.classList.contains('breaking')) return;
    $('#tap').hidden = true;
    sc.classList.add('breaking');
    if (!prof().opened) save({ opened: Date.now() });
    setTimeout(() => sc.classList.add('opening'), calm ? 0 : 600);
    setTimeout(() => { sc.className = 'iv-scene invite rising'; $('#env').hidden = true; }, calm ? 0 : 2100);
    setTimeout(() => sc.classList.remove('rising'), calm ? 0 : 3400);
  }

  document.addEventListener('click', e => {
    if (e.target.closest('#env')) return openIt();
    const a = e.target.closest('[data-a]'), p = e.target.closest('[data-p]');
    if (p) { pick = p.dataset.p; drawPan(); if (pick === 'other') setTimeout(() => { const o = $('#other'); if (o) o.focus(); }, 0); return; }
    if (!a) return;
    const act = a.dataset.a, err = t => { const el = $('#err'); if (el) el.textContent = t; };
    if (act === 'turn') return go('char');
    if (act === 'unturn') return go('invite');
    if (act === 'replay') { mode = 'reply'; stage('sealed'); scrollTo(0, 0); if (calm) openIt(); return; }
    if (act === 'change' || act === 'declinemode') { mode = act === 'change' ? 'change' : 'decline'; drawPan(); setTimeout(() => { const n = $('#note'); if (n) n.focus(); }, 0); return; }
    if (act === 'back') { mode = 'reply'; drawPan(); return; }
    if (act === 'undecline') { save({ declined: null }); mode = 'reply'; setTimeout(drawPan, 250); return; }
    if (act === 'send') {
      const note = ($('#note').value || '').trim(); if (!note) { $('#note').focus(); return err('Tell the host what you would like instead.'); }
      save({ change: { note, at: Date.now() }, accepted: null, declined: null }); mode = 'reply'; setTimeout(drawPan, 250); return;
    }
    if (act === 'decline') {
      const note = ($('#note').value || '').trim();
      save({ declined: Date.now(), accepted: null }); if (note) HostNote.send(ME.id, 'Declining: ' + note, 'invite');
      mode = 'reply'; setTimeout(drawPan, 250); return;
    }
    if (act === 'accept') {
      const fixed = Pron.fixed(ME.id), pr = fixed || (pick === 'other' ? (other || '').trim() : pick);
      if (!pr) return err(`Choose ${first}'s pronouns first.`);
      save({ accepted: Date.now(), declined: null, pronouns: fixed ? null : pr, change: null }); mode = 'reply';
      setTimeout(() => { drawPan(); const r = $('.iv-back .iv-role'); if (r) r.innerHTML = `${esc(ME.role)} <span class="iv-pr">${esc(pr)}</span>`; }, 250); return;
    }
    if (act === 'note') {
      const box = $('#hn'); if (!HostNote.send(ME.id, box.value, 'invite')) { box.focus(); return; }
      sentNote = true; setTimeout(() => { drawPan(); sentNote = false; }, 250);
    }
  });
  document.addEventListener('input', e => { if (e.target.id === 'other') other = e.target.value; });

  DB.loaded().then(() => {
    if ((DB.get().news || {}).closed) { location.replace('news.html'); return; }
    const p = prof();
    if (p.pronouns && !Pron.fixed(ME.id)) { pick = OPTS.includes(p.pronouns) ? p.pronouns : 'other'; if (pick === 'other') other = p.pronouns; }
    /* first visit: the whole opening. Coming back: straight to the character and the reply card. */
    stage(p.opened ? 'char' : 'sealed');
    if (!p.opened && calm) openIt();
    DB.on(() => { if (!(document.activeElement && document.activeElement.matches('input, textarea'))) drawPan(); });
  });
})();
