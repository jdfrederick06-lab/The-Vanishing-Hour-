/* =====================================================================
   THE VANISHING HOUR — the invitation (you.html). Third version, Nov 25 (Jacob: "it has the gala
   part but not the art").
   The personal link in a guest's casting email (you.html?as=CODE). A private viewing:
     1. A gallery wall, a picture light, and a gilded frame under a velvet drape.
        "A private viewing for <guest>". Tap to unveil.
     2. Under the drape: a painting of The Vanishing Hour, and on the frame's mat the invitation,
        to the guest by name.
     3. "Who you'll be tonight": the drape falls and rises again on their character's portrait,
        with a museum wall label.
     4. Kindly reply: accept (choosing the character's pronouns), ask for another character, or
        regretfully decline. And a note to the host, which they can also send all night from the app.
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
  const DOOR = G.door(ME);
  const WORLD = { fbi: 'The FBI field office', bebbit: 'The gala floor', nightwire: 'The back rooms' }[DOOR] || '';
  const INV = CONFIG.INVITE || {};
  const prof = () => Pron.profile(ME.id) || {};
  const guest = () => String(prof().guest || '').trim();
  const save = u => DB.update(Object.fromEntries(Object.entries(u).map(([k, v]) => ['players/' + ME.id + '/profile/' + k, v])));
  const OPTS = ['she/her', 'he/him', 'they/them'];
  let pick = null, other = '', mode = 'reply', sentNote = false, busy = false;

  /* the painting: The Vanishing Hour (dusk over the water, Ashgrove House on the point), painted in SVG */
  const PAINTING = `<svg class="iv-paint" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label="The Vanishing Hour, a painting of the sun setting over water">
    <defs>
      <linearGradient id="vhSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#191733"/><stop offset=".38" stop-color="#4b2f57"/><stop offset=".66" stop-color="#b8606a"/><stop offset=".86" stop-color="#eba06c"/><stop offset="1" stop-color="#f7cf86"/></linearGradient>
      <linearGradient id="vhSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d4057"/><stop offset=".35" stop-color="#352540"/><stop offset="1" stop-color="#0f0c19"/></linearGradient>
      <radialGradient id="vhSun"><stop offset="0" stop-color="#fff6d8"/><stop offset=".45" stop-color="#ffd58e"/><stop offset="1" stop-color="#ffb070" stop-opacity="0"/></radialGradient>
      <filter id="vhOil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".008 .06" numOctaves="3" seed="7"/><feDisplacementMap in="SourceGraphic" scale="16" xChannelSelector="R" yChannelSelector="G"/></filter>
      <filter id="vhOilS" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="2"/><feDisplacementMap in="SourceGraphic" scale="2.5" xChannelSelector="R" yChannelSelector="G"/></filter>
      <filter id="vhGrain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .25  0 0 0 0 .18  0 0 0 0 .1  0 0 0 .55 0"/></filter>
    </defs>
    <g filter="url(#vhOil)">
      <rect x="-20" y="-20" width="440" height="180" fill="url(#vhSky)"/>
      <ellipse cx="120" cy="58" rx="120" ry="10" fill="#7a4a6e" opacity=".55"/><ellipse cx="300" cy="96" rx="140" ry="8" fill="#d98a78" opacity=".45"/><ellipse cx="230" cy="40" rx="90" ry="6" fill="#5a3a66" opacity=".6"/>
      <circle cx="262" cy="156" r="58" fill="url(#vhSun)" opacity=".9"/><circle cx="262" cy="158" r="22" fill="#fff0c4"/>
      <rect x="-20" y="156" width="440" height="110" fill="url(#vhSea)"/>
      <g fill="#ffd9a0" opacity=".7"><rect x="236" y="164" width="52" height="3"/><rect x="242" y="174" width="40" height="2.5"/><rect x="230" y="186" width="62" height="2.5" opacity=".7"/><rect x="246" y="200" width="30" height="2" opacity=".6"/><rect x="226" y="214" width="70" height="2" opacity=".4"/></g>
    </g>
    <g filter="url(#vhOilS)">
      <!-- the headland, and Ashgrove House on it: two wings, a gabled centre, a clock tower, cypress trees -->
      <g fill="#120d16">
        <path d="M-20 162 C20 150 50 146 70 144 L170 144 C190 146 205 152 220 162 Z"/>
        <rect x="64" y="124" width="34" height="22"/><path d="M60 125 L81 112 L102 125 Z"/>
        <rect x="98" y="114" width="44" height="32"/><path d="M94 115 L120 96 L146 115 Z"/>
        <rect x="142" y="124" width="30" height="22"/><path d="M138 125 L157 113 L176 125 Z"/>
        <rect x="114" y="74" width="12" height="26"/><path d="M111 75 L120 60 L129 75 Z"/>
        <path d="M44 146 C40 132 42 118 47 108 C52 118 54 132 50 146 Z"/><path d="M182 146 C178 134 180 122 185 114 C190 122 192 134 188 146 Z"/><path d="M194 148 C191 138 192 130 196 124 C200 130 201 138 198 148 Z"/>
      </g>
      <circle cx="120" cy="84" r="3.2" fill="#f3d79a"/>
      <g fill="#ffcf7a"><rect x="70" y="131" width="4" height="6"/><rect x="86" y="131" width="4" height="6"/><rect x="104" y="122" width="4" height="7"/><rect x="113" y="122" width="4" height="7"/><rect x="123" y="122" width="4" height="7"/><rect x="132" y="122" width="4" height="7"/><rect x="117" y="134" width="6" height="10"/><rect x="149" y="131" width="4" height="6"/><rect x="162" y="131" width="4" height="6"/></g>
      <g fill="#ffcf7a" opacity=".35"><rect x="104" y="150" width="3" height="10"/><rect x="118" y="150" width="4" height="14"/><rect x="132" y="150" width="3" height="9"/></g>
    </g>
    <rect width="400" height="240" filter="url(#vhGrain)" opacity=".5"/>
  </svg>`;
  /* their portrait: a figure in silhouette against a painted ground, in the colors of their world */
  const GROUND = { fbi: ['#1d2c44', '#3f5b7d', '#9bb1c4'], bebbit: ['#3a1424', '#8c3346', '#e7a66b'], nightwire: ['#0f2622', '#1f5a4c', '#8fc9a6'] }[DOOR] || ['#2a1f24', '#6b4a3a', '#d9b45a'];
  const PORTRAIT = `<svg class="iv-paint" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Portrait of ${esc(ME.name)}, in silhouette">
    <defs>
      <radialGradient id="vhGround" cx=".55" cy=".35" r=".8"><stop offset="0" stop-color="${GROUND[2]}"/><stop offset=".45" stop-color="${GROUND[1]}"/><stop offset="1" stop-color="${GROUND[0]}"/></radialGradient>
      <linearGradient id="vhRim" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${GROUND[2]}" stop-opacity=".7"/><stop offset=".25" stop-color="#000" stop-opacity="0"/></linearGradient>
      <filter id="vhOil2" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".02 .05" numOctaves="3" seed="11"/><feDisplacementMap in="SourceGraphic" scale="12" xChannelSelector="R" yChannelSelector="G"/></filter>
      <filter id="vhOilS2" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="9"/><feDisplacementMap in="SourceGraphic" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter>
      <filter id="vhGrain2"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 .25  0 0 0 0 .18  0 0 0 0 .1  0 0 0 .5 0"/></filter>
    </defs>
    <g filter="url(#vhOil2)">
      <rect x="-20" y="-20" width="440" height="340" fill="url(#vhGround)"/>
    </g>
    <g filter="url(#vhOilS2)">
      <g fill="#120d10"><ellipse cx="200" cy="118" rx="44" ry="54"/><path d="M182 150 C184 170 182 184 176 194 C120 204 74 246 70 320 L330 320 C326 246 280 204 224 194 C218 184 216 170 218 150 Z"/></g>
      <g fill="url(#vhRim)"><ellipse cx="200" cy="118" rx="44" ry="54"/><path d="M70 320 C74 246 120 204 176 194 C186 200 214 200 224 194 C280 204 326 246 330 320 Z"/></g>
    </g>
    <rect width="400" height="300" filter="url(#vhGrain2)" opacity=".5"/>
  </svg>`;

  /* the framed piece. which = 'invite' | 'portrait' */
  function framed(which) {
    const g = guest(), pr = Pron.of(ME.id);
    if (which === 'portrait') return `<div class="iv-art">${PORTRAIT}</div>`;
    return `<div class="iv-art">${PAINTING}</div>
      <div class="iv-mat-text">
        <small class="iv-kick">The Ashgrove Foundation</small>
        <p class="iv-line">requests the pleasure of the company of</p>
        <h1 class="iv-guest">${esc(g || 'our honoured guest')}</h1>
        <p class="iv-line">at the unveiling of</p>
        <p class="iv-work"><i>The Vanishing Hour</i></p>
        <p class="iv-line small">shown in public for one night only, at the Ashgrove Gala</p>
        <dl class="iv-when">
          <div><dt>When</dt><dd>${esc(INV.DATE || '')}</dd></div>
          <div><dt>Doors</dt><dd>${esc(INV.TIME || '')}</dd></div>
          <div><dt>Where</dt><dd>${esc(INV.PLACE || '')}</dd></div>
          <div><dt>Dress</dt><dd>${esc(INV.DRESS || '')}</dd></div>
        </dl>
      </div>`;
  }
  /* the museum wall label beside the portrait */
  function label() {
    const pr = Pron.of(ME.id);
    return `<aside class="iv-label" aria-label="About your character">
      <b class="iv-lname">${esc(ME.name)}</b>
      <span class="iv-lrole">${esc(ME.role)}${pr ? ` · <em>${esc(pr)}</em>` : ''}</span>
      <span class="iv-lmed">Portrait of a guest, 2027. Oil on canvas.</span>
      <p>${esc(ME.profile || '')}</p>
      <span class="iv-lroom">On view tonight: <b>${esc(WORLD)}</b></span>
    </aside>`;
  }

  /* the reply card */
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
        <div class="iv-row"><button type="button" class="iv-btn" data-a="${dec ? 'decline' : 'send'}">${dec ? 'Send my regrets' : 'Send my request'}</button><button type="button" class="iv-link" data-a="back">Back</button></div>
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
        <div class="iv-or"><button type="button" class="iv-link" data-a="change">Ask for another character</button><span aria-hidden="true">·</span><button type="button" class="iv-link" data-a="declinemode">Regretfully decline</button></div>
      </div>
      <div class="iv-err" id="err" role="alert"></div></section>`;
  }
  /* always there: a note to the host */
  function notes() {
    const mine = HostNote.mine(ME.id);
    return `<details class="iv-reply iv-notes"${sentNote || mine.length ? ' open' : ''}><summary><span class="iv-kick">A note to the host</span><span class="iv-sum">Questions, ideas, anything at all</span></summary><div class="iv-nbody">
      <p>Only the hosts read it. You can send one from your phone all night, too.</p>
      <textarea class="iv-field" id="hn" maxlength="500" placeholder="Write a note"></textarea>
      <div class="iv-row"><button type="button" class="iv-btn iv-quiet" data-a="note">Send to the host</button>${sentNote ? '<span class="iv-sent">✓ Sent</span>' : ''}</div>
      ${mine.length ? `<ul class="iv-sentlist" aria-label="Notes you've sent">${mine.slice(0, 5).map(n => `<li><time>${esc(new Date(n.at).toLocaleDateString([], { month: 'short', day: 'numeric' }))}</time>${esc(n.text)}</li>`).join('')}</ul>` : ''}</div></details>`;
  }

  /* the page. step: veiled > invite > portrait */
  function heading(step) {
    const g = guest();
    if (step === 'veiled') return `<small class="iv-kick">${esc(CONFIG.TITLE)}</small><h2 class="iv-head">A private viewing${g ? ` for <span>${esc(g)}</span>` : ''}</h2>`;
    if (step === 'invite') return `<small class="iv-kick">${esc(CONFIG.TITLE)}</small><h2 class="iv-head">You're invited${g ? `, <span>${esc(g)}</span>` : ''}</h2>`;
    return `<small class="iv-kick">${g ? esc(g) + ', tonight' : 'Tonight'} you will arrive as</small><h2 class="iv-head"><span>${esc(ME.name)}</span></h2>`;
  }
  function below(step) {
    if (step === 'veiled') return `<button type="button" class="iv-btn iv-quiet" data-a="unveil">Unveil</button>`;
    if (step === 'invite') return `<button type="button" class="iv-btn" data-a="turn">Who you'll be tonight <span aria-hidden="true">→</span></button>`;
    return label() + `<button type="button" class="iv-link" data-a="unturn">← See the invitation again</button>`;
  }
  /* the room behind it all: out-of-focus gala lights drifting, dust turning in the picture light */
  const R = (a, b) => (a + Math.random() * (b - a)).toFixed(1);
  const ambience = () => calm ? '' : `<div class="iv-bokeh" aria-hidden="true">${Array.from({ length: 14 }, (_, k) => `<i style="left:${R(-5, 95)}%;top:${R(-5, 95)}%;--d:${R(70, 190)}px;--o:${R(.05, .16)};--h:${k % 3 ? '42' : '350'};animation-duration:${R(22, 44)}s,${R(5, 11)}s;animation-delay:-${R(0, 40)}s,-${R(0, 10)}s"></i>`).join('')}</div>`;
  const motes = () => calm ? '' : `<div class="iv-motes" aria-hidden="true">${Array.from({ length: 22 }, () => `<i style="left:${R(20, 80)}%;top:${R(4, 90)}%;--s:${R(1.5, 3.5)}px;animation-duration:${R(9, 18)}s;animation-delay:-${R(0, 18)}s;--x:${R(-26, 26)}px;--y:${R(-40, 40)}px"></i>`).join('')}</div>`;
  /* gold sparks thrown off when the curtains part */
  function sparks() {
    if (calm) return; const w = $('#wall'); if (!w) return;
    const b = document.createElement('div'); b.className = 'iv-sparks'; b.setAttribute('aria-hidden', 'true');
    b.innerHTML = Array.from({ length: 34 }, () => { const a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 170; return `<i style="--dx:${(Math.cos(a) * r).toFixed(0)}px;--dy:${(Math.sin(a) * r * .8 - 30).toFixed(0)}px;--s:${R(2, 5)}px;animation-delay:${R(0, .25)}s"></i>`; }).join('') + '<b class="iv-flash"></b>';
    w.appendChild(b); setTimeout(() => b.remove(), 2600);
  }
  function stage(step) {
    root.innerHTML = `${ambience()}<main class="iv-wrap">
      <header class="iv-top" id="top">${heading(step)}</header>
      <div class="iv-wall ${step}" id="wall">
        <div class="iv-lamp" aria-hidden="true"><i></i></div>${motes()}
        <div class="iv-frame" id="frame">
          <div class="iv-mat" id="mat">${framed(step === 'portrait' ? 'portrait' : 'invite')}</div>
          <button type="button" class="iv-drape" id="drape" aria-label="Unveil your invitation" ${step === 'veiled' ? '' : 'tabindex="-1" aria-hidden="true"'}><span class="iv-panel l"></span><span class="iv-panel r"></span><span class="iv-cord" aria-hidden="true"><i></i></span></button>
        </div>
      </div>
      <div class="iv-below" id="below">${below(step)}</div>
      <div id="pan" class="iv-pan">${step === 'portrait' ? reply() + notes() : ''}</div>
      <p class="iv-copy">${step === 'veiled' ? '' : '<button type="button" class="iv-link" data-a="replay">Replay the unveiling</button><br>'}${esc(COPYRIGHT)}</p></main>`;
  }
  function set(step) {
    $('#wall').className = 'iv-wall ' + step; $('#top').innerHTML = heading(step); $('#below').innerHTML = below(step);
    const pn = $('#pan');
    if (step === 'portrait') { pn.innerHTML = reply() + notes(); pn.classList.remove('in'); void pn.offsetWidth; pn.classList.add('in'); } else pn.innerHTML = '';
  }
  function drawPan() { const pn = $('#pan'), w = $('#wall'); if (pn && w && w.classList.contains('portrait')) pn.innerHTML = reply() + notes(); }
  function unveil() {
    const w = $('#wall'); if (busy || !w || !w.classList.contains('veiled')) return;
    busy = true; if (!prof().opened && !Session.hostDevice()) save({ opened: Date.now() });
    /* the cord falls, the two velvet panels sweep apart and gather at the sides, light and sparks */
    w.classList.add('opening'); setTimeout(sparks, calm ? 0 : 700);
    setTimeout(() => { set('invite'); const d = $('#drape'); d.tabIndex = -1; d.setAttribute('aria-hidden', 'true'); $('.iv-copy').insertAdjacentHTML('afterbegin', '<button type="button" class="iv-link" data-a="replay">Replay the unveiling</button><br>'); busy = false; }, calm ? 0 : 2600);
  }
  /* the curtains sweep closed over the frame, the piece changes, and they part again */
  function swap(to) {
    const w = $('#wall'); if (busy || !w) return; busy = true;
    w.classList.add('covering');
    setTimeout(() => {
      $('#mat').innerHTML = framed(to === 'portrait' ? 'portrait' : 'invite'); set(to); w.classList.add('covered');
      setTimeout(() => { w.classList.remove('covered'); setTimeout(sparks, calm ? 0 : 500); setTimeout(() => { busy = false; }, calm ? 0 : 2200); }, calm ? 0 : 450);
    }, calm ? 0 : 1300);
  }

  document.addEventListener('click', e => {
    if (e.target.closest('#drape')) return unveil();
    const a = e.target.closest('[data-a]'), p = e.target.closest('[data-p]');
    if (p) { pick = p.dataset.p; drawPan(); if (pick === 'other') setTimeout(() => { const o = $('#other'); if (o) o.focus(); }, 0); return; }
    if (!a) return;
    const act = a.dataset.a, err = t => { const el = $('#err'); if (el) el.textContent = t; };
    if (act === 'unveil') return unveil();
    if (act === 'turn') return swap('portrait');
    if (act === 'unturn') return swap('invite');
    if (act === 'replay') { mode = 'reply'; busy = false; stage('veiled'); scrollTo(0, 0); return; }
    if (act === 'change' || act === 'declinemode') { mode = act === 'change' ? 'change' : 'decline'; drawPan(); setTimeout(() => { const n = $('#note'); if (n) n.focus({ preventScroll: true }); }, 0); return; }
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
      setTimeout(() => { drawPan(); const r = $('.iv-lrole'); if (r) r.innerHTML = `${esc(ME.role)} · <em>${esc(pr)}</em>`; }, 250); return;
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
    /* first visit: the unveiling. Coming back: straight to the portrait and the reply card. */
    stage(p.opened ? 'portrait' : 'veiled');
    DB.on(() => { if (!(document.activeElement && document.activeElement.matches('input, textarea'))) drawPan(); });
  });
})();
