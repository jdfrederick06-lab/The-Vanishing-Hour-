/* =====================================================================
   THE VANISHING HOUR — the doors (sign-in screens).
   Four entrances, one site underneath. Each page sets window.DOOR to
   'gala', 'fbi', 'bebbit' or 'nightwire' and this file builds that
   door's scene. Any code word works at any door; players always land
   in their own world.
   ===================================================================== */
(function () {
  const door = window.DOOR || 'gala';
  document.body.dataset.world = door;
  document.body.classList.add('is-door');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const field = (label, ph, extra = '') => `<label class="hide" for="code">${label}</label><input class="field" id="code" name="code" placeholder="${ph}" autocapitalize="characters" autocorrect="off" spellcheck="false" autocomplete="off" aria-label="${label}" ${extra}>`;

  /* ---------- THE GALA: an art gallery at night, and an engraved invitation ---------- */
  function gala() {
    const frames = [
      { a: 'a1', w: 120, h: 150, y: 0 }, { a: 'a2', w: 96, h: 124, y: 26 }, { a: 'a3', w: 170, h: 112, y: 8 },
      { a: 'a4', w: 104, h: 104, y: 30 }, { a: 'a5', w: 128, h: 160, y: 2 }
    ];
    const title = CONFIG.EVENT.split(' ').map((w, i) => `<span class="gl-w" style="--i:${i}">${w.split('').map((ch, j) => `<span style="--j:${i * 6 + j}">${esc(ch)}</span>`).join('')}</span>`).join(' ');
    /* gilded corner flourishes and a wax seal, drawn here so they stay crisp at any size */
    const corner = n => `<svg class="gl-corner k${n}" viewBox="0 0 40 40" aria-hidden="true"><path d="M1 39 V15 Q1 1 15 1 H39" fill="none" stroke="url(#gc)" stroke-width="1.2"/><path d="M6 39 V19 Q6 6 19 6 H39" fill="none" stroke="url(#gc)" stroke-width=".6"/><path d="M11 11 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" fill="url(#gc)"/></svg>`;
    const lobes = Array.from({ length: 22 }, (_, k) => { const a = k / 22 * Math.PI * 2, r = 35 + (k % 2 ? 2.6 : -.6) + Math.sin(k * 1.7) * 1.2; return `${(40 + Math.cos(a) * r).toFixed(1)},${(40 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
    const seal = `<div class="gl-seal" aria-hidden="true"><svg viewBox="0 0 80 80"><defs><radialGradient id="wax" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#d8384d"/><stop offset=".55" stop-color="#9a1427"/><stop offset="1" stop-color="#5c0815"/></radialGradient></defs>
      <polygon points="${lobes}" fill="url(#wax)"/><circle cx="40" cy="40" r="25" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2.2"/><circle cx="40" cy="40" r="25" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1" transform="translate(-.8 -.8)"/>
      <text x="40" y="49.5" text-anchor="middle" font-family="Cinzel, serif" font-size="26" fill="rgba(0,0,0,.38)">A</text><text x="39.2" y="48.7" text-anchor="middle" font-family="Cinzel, serif" font-size="26" fill="rgba(255,255,255,.16)">A</text>
      <ellipse cx="29" cy="24" rx="9" ry="4" fill="rgba(255,255,255,.18)" transform="rotate(-30 29 24)"/></svg></div>`;
    return `<div class="gl" id="scene">
      <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="gc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e3a4"/><stop offset=".5" stop-color="#a8822f"/><stop offset="1" stop-color="#e8c46c"/></linearGradient></defs></svg>
      <div class="gl-wall"></div><div class="gl-spot" id="spot" aria-hidden="true"></div>
      <div class="gl-frames" id="frames">${frames.map((f, i) => `<div class="gl-hang" style="--w:${f.w}px;--h:${f.h}px;--y:${f.y}px;--d:${i * 0.12}s" data-depth="${0.4 + (i % 3) * 0.3}"><div class="gl-beam"></div><div class="gl-frame"><div class="gl-art ${f.a}"></div></div><div class="gl-plaque"></div></div>`).join('')}</div>
      <div class="gl-motes" aria-hidden="true">${Array.from({ length: calm ? 0 : 26 }, () => `<i style="left:${rnd(2, 98)}%;--s:${rnd(2, 4.5).toFixed(1)}px;--t:${rnd(9, 20).toFixed(1)}s;--dl:-${rnd(0, 20).toFixed(1)}s;--dx:${rnd(-40, 40).toFixed(0)}px"></i>`).join('')}</div>
      <main class="gl-stage">
        <div class="gl-card" id="card">
          <div class="gl-foil"></div><div class="gl-sheen"></div>${[1, 2, 3, 4].map(corner).join('')}
          <svg class="gl-gem" width="54" height="54" viewBox="0 0 60 60" aria-hidden="true"><defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e3a4"/><stop offset=".5" stop-color="#b98a2e"/><stop offset="1" stop-color="#f2d58a"/></linearGradient></defs><path d="M30 6 L52 24 L30 54 L8 24 Z" fill="none" stroke="url(#gg)" stroke-width="1.6"/><path d="M8 24 H52 M30 6 L22 24 L30 54 L38 24 Z" fill="none" stroke="url(#gg)" stroke-width="1"/><circle class="gl-glint" cx="40" cy="15" r="2.2" fill="#fff"/></svg>
          <div class="gl-eyebrow">Mr. Victor Ashgrove<br>requests the pleasure of your company at</div>
          <h1 class="gl-title" aria-label="${esc(CONFIG.EVENT)}">${title}</h1>
          <div class="gl-orn" aria-hidden="true"><i></i><b>◆</b><i></i></div>
          <p class="gl-sub">An evening with the Ashgrove Collection<br>and the Winter Star</p>
          <div class="gl-meta"><span>One night only</span><span>Black tie</span></div>
          <form id="f" autocomplete="off">
            <div class="gl-label">Present your invitation</div>
            ${field('Your code word', 'Your code word')}
            <button class="btn primary gl-btn" type="submit"><span>Enter the gala</span></button>
            <div class="err" id="err" role="alert"></div>
          </form>
        </div>
        ${seal}
        <p class="gl-fine">Your code word is printed on your invitation.<br>${esc(CONFIG.TITLE)} · ${esc(CONFIG.SEASON)}</p>
      </main>
      <div class="gl-floor"><svg class="gl-rope" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="rope" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3202f"/><stop offset="1" stop-color="#5a0a14"/></linearGradient><linearGradient id="brass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5a1c"/><stop offset=".5" stop-color="#f2d58a"/><stop offset="1" stop-color="#7a5a1c"/></linearGradient></defs>
        <path d="M40 30 C 300 118, 900 118, 1160 30" fill="none" stroke="url(#rope)" stroke-width="12" stroke-linecap="round"/>
        ${[40, 1160].map(x => `<rect x="${x - 6}" y="22" width="12" height="98" rx="3" fill="url(#brass)"/><circle cx="${x}" cy="22" r="11" fill="url(#brass)"/>`).join('')}</svg></div>
      <div class="gl-vig"></div>
    </div>`;
  }

  /* ---------- FBI: a secure terminal ---------- */
  function fbi() {
    return `<div class="fx-fbi" id="scene">
      <div class="fbi-strip">CLASSIFIED // LAW ENFORCEMENT SENSITIVE</div>
      <div class="fbi-plane" aria-hidden="true"></div><div class="fbi-sweep" aria-hidden="true"></div>
      <main class="fbi-panel" id="card">
        <div class="fbi-sealwrap" aria-hidden="true"><span class="fbi-ring r1"></span><span class="fbi-ring r2"></span>
          <svg class="fbi-ringtext" viewBox="0 0 140 140"><defs><path id="rt" d="M70 70 m-58 0 a58 58 0 1 1 116 0 a58 58 0 1 1 -116 0"/></defs><text><textPath href="#rt">FEDERAL BUREAU · ART CRIME TEAM · CASE ${esc((STORY.fbi || {}).caseNo || '')} · FIDELITY · </textPath></text></svg>
          <svg class="fbi-seal" width="96" height="96" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20.5" fill="#0e2240" stroke="#d4b25c" stroke-width="1.2" class="s-out"/><circle cx="22" cy="22" r="15.5" fill="none" stroke="#d4b25c" stroke-width=".7" stroke-dasharray="1.5 2" class="s-dash"/><path class="s-star" d="M22 10 L24.9 18.4 L33.8 18.4 L26.6 23.6 L29.4 32 L22 26.8 L14.6 32 L17.4 23.6 L10.2 18.4 L19.1 18.4 Z" fill="#d4b25c" stroke="#d4b25c" stroke-width=".6"/></svg></div>
        <div class="fbi-word">FEDERAL BUREAU</div><h1 class="fbi-h">Headquarters</h1>
        <div class="fbi-term" id="term" aria-hidden="true"></div>
        <form id="f" autocomplete="off">${field('Badge code', 'BADGE CODE')}<button class="btn primary" type="submit">Secure sign-in</button><div class="err" id="err" role="alert"></div></form>
        <p class="fbi-fine">Unauthorized access is a federal offense.<br>Art Crime Team · Case ${esc((STORY.fbi || {}).caseNo || '')}</p>
      </main>
      <div class="fbi-ticker" aria-hidden="true"><div>${'NCIC · VICAP · ART CRIME TEAM · INTERPOL STOLEN WORKS · NATIONAL STOLEN ART FILE · LATENT PRINTS · '.repeat(4)}</div></div>
    </div>`;
  }

  /* ---------- BEBBIT: bright, social, buzzing ---------- */
  function bebbit() {
    const gossip = [['BS', 'bailey', 'omg the dresses tonight', '#ff8fb1'], ['DF', 'dusty', 'something BIG is happening tonight. trust me.', '#ffc46b'], ['RL', 'remy', 'June wedding, here we come', '#8fd3ff'], ['JO', 'jet', 'soundcheck done', '#a99bff'], ['PV', 'peregrine', 'darling, the canapés are a cry for help', '#7ee0b5'], ['GB', 'gray', 'proud to support the arts!', '#ffb38a']];
    return `<div class="fx-beb" id="scene">
      <div class="beb-blob b1"></div><div class="beb-blob b2"></div><div class="beb-blob b3"></div>
      <div class="beb-float" aria-hidden="true">${gossip.map((g, i) => `<div class="beb-bub" style="--x:${[6, 62, 14, 70, 4, 58][i]}%;--t:${(14 + i * 1.7).toFixed(1)}s;--dl:-${(i * 2.6).toFixed(1)}s"><span class="beb-av" style="background:${g[3]}">${g[0]}</span><span><b>@${g[1]}</b>${esc(g[2])}</span></div>`).join('')}</div>
      <main class="beb-panel" id="card">
        <div class="beb-logo"><div class="beb-mark">b</div><span>bebbit</span></div>
        <p class="beb-tag">Everyone at the gala is talking.<br><b>Come see what they're saying.</b></p>
        <div class="beb-live"><span class="beb-ping"></span>b/thegala · live tonight</div>
        <form id="f" autocomplete="off">${field('Your code word', 'Your code word')}<button class="btn primary" type="submit">Log in</button><div class="err" id="err" role="alert"></div></form>
      </main>
    </div>`;
  }

  /* ---------- NIGHTWIRE: a terminal that boots ---------- */
  function nightwire() {
    return `<div class="fx-nw" id="scene"><canvas id="rain" aria-hidden="true"></canvas><div class="nw-crt" aria-hidden="true"></div>
      <main class="nw-panel" id="card">
        <div class="nw-logo big glitch" data-t="nightwire"><span>nightwire</span></div>
        <div class="nw-boot mono" id="term" aria-hidden="true"></div>
        <form id="f" autocomplete="off" class="nw-gate">${field('Handle key', 'handle key')}<button class="btn primary" type="submit">&gt; connect</button><div class="err" id="err" role="alert"></div></form>
        <p class="nw-fine">If you don't know what this is, you're in the wrong place.</p>
      </main></div>`;
  }

  document.title = { gala: CONFIG.EVENT, fbi: 'FBI Headquarters', bebbit: 'bebbit', nightwire: 'NIGHTWIRE' }[door];
  $('#root').innerHTML = ({ gala, fbi, bebbit, nightwire }[door] || gala)();

  /* ---------- typed terminal lines ---------- */
  function type(lines, el, speed, done) {
    if (calm) { el.innerHTML = lines.map(l => `<div>${l}</div>`).join(''); return done && done(); }
    let i = 0;
    const next = () => {
      if (i >= lines.length) return done && done();
      const row = document.createElement('div'); el.appendChild(row);
      const text = lines[i++]; let k = 0;
      const step = () => { row.innerHTML = text.slice(0, ++k) + '<i class="caret"></i>'; if (k < text.length) setTimeout(step, speed); else { row.innerHTML = text; setTimeout(next, 120); } };
      step();
    };
    next();
  }

  /* ---------- per-door life ---------- */
  if (door === 'gala' && !calm) {
    const fr = $('#frames');
    addEventListener('pointermove', e => {
      const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      $$('.gl-hang', fr).forEach(h => { const d = Number(h.dataset.depth); h.style.translate = `${(-x * 18 * d).toFixed(1)}px ${(-y * 8 * d).toFixed(1)}px`; });
      $('#card').style.transform = `rotateY(${(x * 5).toFixed(2)}deg) rotateX(${(-y * 5).toFixed(2)}deg)`;
      /* a soft gallery light follows the pointer; the card's foil catches it */
      const sp = $('#spot'); sp.style.setProperty('--mx', e.clientX + 'px'); sp.style.setProperty('--my', e.clientY + 'px');
      $('#card').style.setProperty('--gx', ((x + .5) * 100).toFixed(1) + '%'); $('#card').style.setProperty('--gy', ((y + .5) * 100).toFixed(1) + '%');
    });
  }
  if (door === 'fbi') type(['> SECURE TERMINAL · ART CRIME TEAM', '> CASE ' + ((STORY.fbi || {}).caseNo || '') + ' · STATUS: ACTIVE', '> AUTHENTICATION REQUIRED'], $('#term'), 22);
  if (door === 'nightwire') {
    const f = $('#f'); f.classList.add('waiting');
    type(['> handshake relay 1 .......... ok', '> handshake relay 2 .......... ok', '> handshake relay 3 .......... ok', '> logs: disabled · trace: none', '> awaiting handle key_'], $('#term'), 12, () => f.classList.remove('waiting'));
    const cv = $('#rain'), g = cv.getContext('2d'), glyph = '01アカサタナ#$%&*+<>=ABCDEF0123456789';
    let cols = [], w = 0, h = 0;
    const size = () => { w = cv.width = innerWidth; h = cv.height = innerHeight; cols = Array.from({ length: Math.ceil(w / 16) }, () => rnd(-h, 0)); };
    size(); addEventListener('resize', size);
    if (!calm) setInterval(() => {
      g.fillStyle = 'rgba(5,6,5,.18)'; g.fillRect(0, 0, w, h); g.font = '14px JetBrains Mono, monospace';
      cols.forEach((y, i) => { g.fillStyle = Math.random() < .04 ? '#e2ffad' : 'rgba(182,255,59,.55)'; g.fillText(glyph[Math.random() * glyph.length | 0], i * 16, y); cols[i] = y > h + rnd(0, 400) ? 0 : y + 16; });
    }, 70);
  }

  /* ---------- sign-in, with a little ceremony ---------- */
  const card = $('#card');
  function welcome(kind, who) {
    const name = who ? who.name.split(' ')[0] : '';
    const go = () => { location.href = ROOT + (kind === 'host' ? 'host.html' : 'app.html'); };
    if (calm) return go();
    const ov = document.createElement('div'); ov.className = 'door-ok door-ok-' + door;
    ov.innerHTML = {
      gala: `<div class="dk-light"></div><div class="dk-txt"><small>Welcome to the Ashgrove Gala</small><b>${esc(name)}</b></div>`,
      fbi: `<div class="dk-txt"><small>IDENTITY VERIFIED</small><b>${esc(who ? who.name.toUpperCase() : '')}</b><div class="dk-bar"><i></i></div><span class="dk-stamp">ACCESS GRANTED</span></div>`,
      bebbit: `<div class="dk-txt"><div class="beb-mark">b</div><small>Welcome back</small><b>${esc(name)}</b></div>`,
      nightwire: `<div class="dk-txt mono"><small>&gt; decrypting handle</small><div class="dk-bar"><i></i></div><b>&gt; connected</b></div>`
    }[door];
    document.body.appendChild(ov); card.classList.add('leaving');
    setTimeout(go, door === 'gala' ? 1700 : 1500);
  }
  $('#f').addEventListener('submit', e => {
    e.preventDefault();
    const code = $('#code').value, err = $('#err');
    if (!normCode(code)) { err.textContent = 'Enter your code word first.'; return; }
    const kind = Session.signIn(code);
    if (kind) return welcome(kind, kind === 'host' ? G.hostByCode(code) : G.byCode(code));
    err.textContent = { fbi: 'Badge code not recognized.', nightwire: 'handle key rejected.' }[door] || "That code word didn't work. Check your invitation.";
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
  });
  $('#code').addEventListener('input', () => { $('#err').textContent = ''; });
})();
