/* =====================================================================
   THE VANISHING HOUR — the invitation (index.html). The page everyone sees first.
   A museum after dark. The gallery wall, the paintings and the spotlight move
   with the mouse (or the tilt of a phone), and slide as you scroll. In the middle
   hangs an empty gilded frame: that's where the invitation is.
   From here, players with a code word go through to the gala door (gala/).

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
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  const mine = () => { try { return JSON.parse(store.get(KEY)) || null; } catch (e) { return null; } };
  const ref = id => id.slice(-6).toUpperCase();
  const rnd = (a, b) => a + Math.random() * (b - a);
  const DOOR = 'gala/';

  const SIZES = [['lead', 'A leading role', 'Big secrets. You drive the story.'], ['support', 'A supporting role', 'A few secrets and a goal or two.'], ['cameo', 'A cameo', 'Light and relaxed. Mostly watch the drama.']];
  const WORLDS = [['guest', 'A guest at the gala', 'Socialites, collectors and old money'], ['fbi', 'An FBI agent', 'Work the case from FBI Headquarters'], ['crew', 'The art crew', 'Pull off the heist without getting caught'], ['staff', 'Gala staff', 'Guards, caterers, the people who see everything'], ['any', 'Surprise me', 'Put me wherever the story needs me']];
  const REPLIES = [['yes', 'Accepts with pleasure'], ['maybe', 'Hopes to attend'], ['no', 'Declines with regret']];

  /* the rules of the night (no spoilers). key = shown full width */
  const RULES = [
    ['Stay in character', 'From the moment you walk in until the final reveal, you are your character. If you need to step out of the game, say so plainly.'],
    ['Your code word is your key', 'It signs your phone into the game. Never share it, and never type someone else\'s.'],
    ['You may lie, except under oath', 'Everyone has secrets, and you can lie about yours. The one exception is your sworn facts: if an FBI agent asks you about one directly, you must tell the truth.', 1],
    ['Your dossier stays yours', 'Never show anyone your file. Tell people what you choose, in your own words.'],
    ['Evidence is real', 'Found something? Scan the tag on it so everyone can see it, then leave it where it was unless your dossier says otherwise.'],
    ['Locks open the right way', 'Locked boxes open with the right key or code. Never force anything.'],
    ['The money is play money', 'NightBank, the casino, bribes and loans use game money only. Nobody spends a real cent.'],
    ['The host\'s word is final', 'If the host calls "Pause," freeze. If you\'re told you\'ve been thrown out of the gala, keep playing, but you lose your vote and your money.'],
    ['If your character dies', 'Stay dead and stay quiet. The host will give you a new role, or you can enjoy the show.'],
    ['Everyone votes', 'At the end, everyone accuses: who stole the painting, and who is the killer. Then the truth is read.'],
    ['Be kind', 'Real people are behind every character. No rough handling, no running on the stairs, and look after the building.']
  ];
  const ICON = {
    reply: '<path d="M8 22h48v34H8z"/><path d="M8 22l24 20 24-20"/><path d="M28 9h8v13"/>',
    file: '<path d="M10 16h18l5 6h21v32H10z"/><circle cx="32" cy="38" r="7"/><path d="M28 45l-3 7M36 45l3 7"/>',
    play: '<rect x="20" y="8" width="24" height="48" rx="4"/><path d="M28 50h8"/><path d="M26 26c4-4 8-4 12 0M29 31c2-2 4-2 6 0"/><circle cx="32" cy="35" r="1.2"/>',
    phone: '<rect x="20" y="8" width="24" height="48" rx="4"/><path d="M28 50h8M30 13h4"/>',
    tie: '<path d="M32 32l-18-11v22zM32 32l18-11v22z"/><rect x="28.5" y="28.5" width="7" height="7" rx="1.5"/>',
    book: '<path d="M32 18c-6-4-14-4-20-2v34c6-2 14-2 20 2 6-4 14-4 20-2V16c-6-2-14-2-20 2zM32 18v34"/>',
    hand: '<path d="M22 34V18a3 3 0 016 0v12M28 28V14a3 3 0 016 0v14M34 28V16a3 3 0 016 0v14M40 30v-8a3 3 0 016 0v14c0 10-7 18-16 18-6 0-10-3-13-8l-6-10a3 3 0 015-3l4 5"/>'
  };
  const svg = (k, cls) => `<svg viewBox="0 0 64 64" aria-hidden="true" ${cls ? `class="${cls}"` : ''}>${ICON[k]}</svg>`;
  const BRING = [['phone', 'A charged phone', 'The whole night runs on it. A charger helps.'], ['tie', 'Gala attire', 'Black tie optional. Your dossier suggests a costume.'], ['book', 'Your character', 'Read your dossier before you arrive. It comes about a week before.'], ['hand', 'Nothing else', 'No real money or valuables. Everything you need is in the game.']];
  const FAQ = [
    ['Do I need to be good at acting?', 'No. Read your dossier, talk to people, and follow your goals. Big or small, every part works at any level.'],
    ['How long is it?', 'About two and a half hours, start to finish.'],
    ['Can I come with a friend?', 'Yes, as long as they reply too. Tell us in your reply if you want a storyline together.'],
    ['What if I don\'t have a smartphone?', 'Say so in your reply and we\'ll set you up with a paper version.'],
    ['Is it scary?', 'It\'s a murder mystery, so there are two deaths in the story. Nothing gory, no jump scares.'],
    ['I already have a code word. Where do I go?', 'Through the gala door at the bottom of this page, or the code word button at the top. Type it in, and your phone becomes your character\'s.']
  ];

  const st = { step: 'form', err: '', f: { first: '', last: '', reply: '', size: '', world: '', phone: '', email: '', with: '', notes: '' } };
  const prev = mine(); if (prev) { const s = DB.get(), r = s.rsvp && s.rsvp[prev.id]; if (r && r.token === prev.token) { st.step = 'done'; st.saved = Object.assign({ id: prev.id }, r); } }

  /* ---------- pieces ---------- */
  const scroll = '<svg class="orn" viewBox="0 0 80 80" aria-hidden="true"><defs><linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0be"/><stop offset=".45" stop-color="#c79a45"/><stop offset="1" stop-color="#7c5719"/></linearGradient></defs><path d="M6 74V30C6 16 16 6 30 6h44" fill="none" stroke="url(#og)" stroke-width="5"/><path d="M14 74V34c0-11 9-20 20-20h40" fill="none" stroke="url(#og)" stroke-width="1.6"/><path d="M22 22c8-10 22-8 24 2 2 8-6 12-11 8-4-3-2-9 3-8" fill="none" stroke="url(#og)" stroke-width="3" stroke-linecap="round"/><path d="M22 22c-10 8-8 22 2 24 8 2 12-6 8-11-3-4-9-2-8 3" fill="none" stroke="url(#og)" stroke-width="3" stroke-linecap="round"/><circle cx="22" cy="22" r="4.5" fill="url(#og)"/></svg>';
  const crest = '<svg class="orn top" viewBox="0 0 120 40" aria-hidden="true"><path d="M60 4c-8 10-22 14-34 12 8 6 20 8 30 4-6 6-6 14 4 18 10-4 10-12 4-18 10 4 22 2 30-4-12 2-26-2-34-12z" fill="url(#og)"/><circle cx="60" cy="22" r="4" fill="#8e1630" stroke="url(#og)" stroke-width="1.5"/></svg>';
  const corners = ['tl', 'tr', 'bl', 'br'].map(c => scroll.replace('class="orn"', `class="orn ${c}"`).replace('id="og"', c === 'tl' ? 'id="og"' : 'id="og-' + c + '"').replace(/url\(#og\)/g, c === 'tl' ? 'url(#og)' : 'url(#og-' + c + ')')).join('');
  const lobes = Array.from({ length: 22 }, (_, k) => { const a = k / 22 * Math.PI * 2, r = 35 + (k % 2 ? 2.6 : -.6) + Math.sin(k * 1.7) * 1.2; return `${(40 + Math.cos(a) * r).toFixed(1)},${(40 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
  const seal = `<svg class="seal" viewBox="0 0 80 80" aria-hidden="true"><defs><radialGradient id="wax" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#d8384d"/><stop offset=".55" stop-color="#9a1427"/><stop offset="1" stop-color="#5c0815"/></radialGradient></defs><polygon points="${lobes}" fill="url(#wax)"/><circle cx="40" cy="40" r="25" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2.2"/><text x="40" y="50" text-anchor="middle" font-family="Bodoni Moda, serif" font-style="italic" font-size="28" fill="rgba(0,0,0,.4)">A</text><text x="39.2" y="49.2" text-anchor="middle" font-family="Bodoni Moda, serif" font-style="italic" font-size="28" fill="rgba(255,255,255,.16)">A</text><ellipse cx="29" cy="24" rx="9" ry="4" fill="rgba(255,255,255,.18)" transform="rotate(-30 29 24)"/></svg>`;
  let k = 0;
  const title = CONFIG.TITLE.split(' ').map(w => `<span class="w">${w.split('').map(ch => `<span class="c" style="--k:${k++}">${esc(ch)}</span>`).join('')}</span>`).join(' ');
  const rope = `<svg viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="brass" x1="0" x2="1"><stop offset="0" stop-color="#6d4c17"/><stop offset=".5" stop-color="#f0d488"/><stop offset="1" stop-color="#6d4c17"/></linearGradient><linearGradient id="vel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c23b55"/><stop offset="1" stop-color="#5c0815"/></linearGradient></defs>
    ${[60, 600, 1140].map(x => `<rect x="${x - 6}" y="20" width="12" height="100" fill="url(#brass)"/><circle cx="${x}" cy="16" r="12" fill="url(#brass)"/>`).join('')}
    <path d="M66 26 Q330 104 594 26" fill="none" stroke="url(#vel)" stroke-width="11" stroke-linecap="round"/><path d="M606 26 Q870 104 1134 26" fill="none" stroke="url(#vel)" stroke-width="11" stroke-linecap="round"/></svg>`;

  function hero() {
    return `<section class="hero" id="top" aria-label="The invitation">
      <div class="hang">
        <div class="wire" aria-hidden="true"><svg viewBox="0 0 200 64" preserveAspectRatio="none"><path d="M0 64 L100 4 L200 64" fill="none" stroke="rgba(216,178,94,.45)" stroke-width="1"/><circle cx="100" cy="4" r="4" fill="#c79a45"/></svg></div>
        <div class="frame" id="frame"><div class="shine-clip" aria-hidden="true"><i class="shine" id="shine"></i></div>${corners}${crest}
          <div class="liner"><div class="canvas"><div class="patch" aria-hidden="true"></div>
            <span class="kick">An interactive murder mystery</span>
            <p class="from">Mr. Victor Ashgrove<br>requests the pleasure of your company at</p>
            <h1 class="title" aria-label="${esc(CONFIG.TITLE)}">${title}</h1>
            <div class="rule" aria-hidden="true"><i></i><b></b><i></i></div>
            <p class="event">${esc(CONFIG.EVENT)}<em>An evening with the Ashgrove Collection and the Winter Star</em></p>
            <div class="hero-acts"><a class="btn gold" href="#reply">${st.step === 'done' ? 'See your reply' : 'Kindly reply'}</a><a class="btn ghost" href="#rules">The rules of the night</a></div>
          </div></div>
        </div>
        <div class="label"><i class="dot" aria-hidden="true"></i><b>${esc(CONFIG.TITLE)}</b><span>Henri Valcourt, 1874 · Oil on canvas<br>From the Ashgrove Collection</span><span class="when">On view for one night only. ${esc(I.PLACE || '')}, ${esc(I.DATE || '')}.</span></div>
      </div>
      <a class="cue" href="#evening">Enter<i></i></a>
    </section>`;
  }
  const head = (num, kick, h) => `<div class="gal-head reveal"><span class="num" aria-hidden="true">${num}</span><span class="kick">${kick}</span><h2>${h}</h2></div>`;
  function galleries() {
    return `
    <section class="gal" id="evening"><div class="gal-in">
      ${head('I', 'The evening', 'A night you <em>play</em>, not watch')}
      <p class="lead reveal">For one night only, Victor Ashgrove opens his private collection to the city's most powerful people. Then <em>a painting vanishes</em>, a guard is found dead, and everyone in the room becomes a suspect. Including you.</p>
      <div class="exhibits">
        ${[['reply', 'No. 1', 'Reply', 'Tell us you\'re coming, and what kind of part you\'d enjoy.'], ['file', 'No. 2', 'Receive your dossier', 'About a week before: who you are, your secrets, your goals and your code word.'], ['play', 'No. 3', 'Play the night', 'Your phone becomes your character\'s world. Scheme, trade secrets, follow the money, and find the truth before the vote.']]
          .map(([ic, n, h, p], i) => `<div class="ex reveal" style="transition-delay:${i * .12}s"><div class="pic"><div>${svg(ic)}</div></div><div class="plac"><small>${n}</small><b>${h}</b><p>${p}</p></div></div>`).join('')}
      </div>
    </div></section>

    <section class="gal" id="where"><div class="gal-in">
      ${head('II', 'When and where', 'Admit one')}
      <div class="ticket reveal"><div class="main">
        <div class="tk-top"><b>${esc(CONFIG.EVENT)}</b><small>${esc(CONFIG.SEASON)}</small></div>
        <div class="tk-grid">
          <div><small>Date</small><b>${esc(I.DATE || '')}</b></div>
          <div><small>Doors</small><b>${esc(I.TIME || '')}</b></div>
          <div><small>Place</small><b>${esc(I.PLACE || '')}</b><span>The story moves between several rooms. Directions come with your dossier.</span></div>
          <div><small>Dress</small><b>${esc(I.DRESS || '')}</b></div>
        </div></div>
        <div class="stub"><div><span class="adm">Admit one</span><small>No. ${String(1874).padStart(6, '0')}</small></div></div>
      </div>
    </div></section>

    <section class="gal" id="rules"><div class="gal-in">
      ${head('III', 'Before you arrive', 'The rules of the night')}
      <ol class="rules">${RULES.map(([h, p, key], i) => `<li class="reveal${key ? ' key' : ''}" style="transition-delay:${(i % 3) * .08}s"><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('')}</ol>
    </div></section>

    <section class="gal" id="bring"><div class="gal-in">
      ${head('IV', 'What to bring', 'Come ready')}
      <div class="bring">${BRING.map(([ic, h, p], i) => `<div class="reveal" style="transition-delay:${i * .1}s">${svg(ic)}<b>${esc(h)}</b><span>${esc(p)}</span></div>`).join('')}</div>
    </div></section>

    <section class="gal" id="faq"><div class="gal-in">
      ${head('V', 'Questions', 'People ask')}
      <div class="faq reveal">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
    </div></section>

    <section class="gal" id="reply"><div class="gal-in">
      ${head('VI', 'R.S.V.P.', 'Kindly reply')}
      <div class="reply-wrap reveal"><div id="card"></div></div>
    </div></section>`;
  }

  const opt = (name, val, label, sub, on) => `<label class="opt${on ? ' on' : ''}"><input type="radio" name="${name}" value="${val}" ${on ? 'checked' : ''}><span class="dot" aria-hidden="true"></span><span><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></label>`;
  function card() {
    const f = st.f, coming = f.reply === 'yes' || f.reply === 'maybe';
    if (st.step === 'done') {
      const r = st.saved, rep = (REPLIES.find(x => x[0] === r.reply) || [])[1] || '';
      return `<div class="card">${seal}<div class="done">
        <svg class="tick" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>
        <h3>${r.reply === 'no' ? 'We\'ll miss you' : 'Your reply is in'}</h3>
        <p class="who"><span>M</span>${esc(r.first)} ${esc(r.last)}</p>
        <p class="rep">${esc(rep)}</p>
        ${r.reply === 'no' ? '<p>Thank you for letting us know. If your plans change, you can change your reply here.</p>'
          : `<p>About a week before the night you'll get your character: who you are, your secrets, and the code word that lets you in. ${r.email ? 'It goes to <b>' + esc(r.email) + '</b>.' : 'Your host will hand it to you.'}</p>
            <ul class="sum"><li><span>Part</span>${esc((SIZES.find(x => x[0] === r.size) || [, ''])[1])}</li><li><span>Playing as</span>${esc((WORLDS.find(x => x[0] === r.world) || [, ''])[1])}</li></ul>`}
        <p class="refno">Reply no. ${esc(ref(r.id))}</p>
        <button type="button" class="linkbtn" data-iv="edit">Change my reply</button></div></div>`;
    }
    return `<form class="card" id="rvf" novalidate>${seal}
      <div class="card-head"><small>The favour of a reply</small><b>${esc(CONFIG.EVENT)}</b></div>
      <div class="name"><span class="m" aria-hidden="true">M</span><input class="fld" name="first" placeholder="First name" value="${esc(f.first)}" autocomplete="given-name" aria-label="First name"><input class="fld" name="last" placeholder="Last name" value="${esc(f.last)}" autocomplete="family-name" aria-label="Last name"></div>
      <fieldset class="set replies"><legend>Your reply</legend>${REPLIES.map(([v, l]) => opt('reply', v, l, '', f.reply === v)).join('')}</fieldset>
      ${coming ? `
        <fieldset class="set"><legend>How big a part would you like?</legend>${SIZES.map(([v, l, d]) => opt('size', v, l, d, f.size === v)).join('')}</fieldset>
        <fieldset class="set"><legend>Which side of the night sounds most fun?</legend>${WORLDS.map(([v, l, d]) => opt('world', v, l, d, f.world === v)).join('')}</fieldset>
        <fieldset class="set"><legend>Will you have a smartphone with you?</legend><div class="row2">${opt('phone', 'yes', 'Yes', '', f.phone === 'yes')}${opt('phone', 'no', 'No', '', f.phone === 'no')}</div></fieldset>
        <label class="lab">Email <i>(your character is sent here)</i><input class="fld" type="email" name="email" placeholder="you@example.com" value="${esc(f.email)}" autocomplete="email"></label>
        <label class="lab">Anyone you'd love a storyline with? <i>(optional)</i><input class="fld" name="with" placeholder="A friend, a roommate…" value="${esc(f.with)}" maxlength="140"></label>
        <label class="lab">Allergies, access needs, anything we should know? <i>(optional)</i><textarea class="fld" name="notes" rows="2" maxlength="400" placeholder="Stairs, food, anything your character shouldn't do…">${esc(f.notes)}</textarea></label>` : ''}
      <div class="err" role="alert">${esc(st.err)}</div>
      <button class="btn send" type="submit">${st.saved ? 'Update my reply' : 'Send my reply'}</button>
      <p class="fine">Only the hosts see your reply.</p>
    </form>`;
  }
  const drawCard = () => { $('#card').innerHTML = card(); };

  /* ---------- the page ---------- */
  const art = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'].map(a => `<div class="art ${a}"><i></i><b></b></div>`).join('');
  const motes = calm ? '' : Array.from({ length: 26 }, () => `<i style="--x:${rnd(0, 100).toFixed(1)}%;--y:${rnd(20, 100).toFixed(1)}%;--s:${rnd(1.5, 3.6).toFixed(1)}px;--t:${rnd(10, 22).toFixed(1)}s;--d:-${rnd(0, 22).toFixed(1)}s;--dx:${rnd(-50, 50).toFixed(0)}px"></i>`).join('');
  const opening = !calm && !sessionStorage_get('vh:opened');
  function sessionStorage_get(k) { try { return sessionStorage.getItem(k); } catch (e) { return '1'; } }

  $('#root').innerHTML = `
    ${opening ? `<div id="opener" aria-hidden="true"><div class="op-flick"></div><div class="op-clock"><svg viewBox="0 0 100 100"><circle class="op-ring" cx="50" cy="50" r="46"/>${Array.from({ length: 12 }, (_, i) => `<line class="op-tick" x1="50" y1="6" x2="50" y2="${i % 3 ? 9 : 12}" transform="rotate(${i * 30} 50 50)"/>`).join('')}<line class="op-hand h" x1="50" y1="50" x2="50" y2="26"/><line class="op-hand" x1="50" y1="56" x2="50" y2="10"/><circle class="op-pin" cx="50" cy="50" r="2.2"/></svg><div class="op-words">Doors at seven.</div></div><button class="op-skip" type="button">Skip</button></div>` : ''}
    <div class="stage" aria-hidden="true">
      <div class="layer l-wall"></div>
      <div class="layer l-rail"></div>
      <div class="layer l-far">${art}</div>
      <div class="layer l-mid motes">${motes}</div>
      <div class="layer l-near"><div class="rope">${rope}</div></div>
    </div>
    <div class="shaft" aria-hidden="true"></div><div class="beam" aria-hidden="true"></div>
    <nav class="nav" id="nav"><a class="brand" href="#top">${esc(CONFIG.TITLE)}</a><a class="enter" href="${DOOR}"><b class="lg">I have a code word</b><b class="sm">Code word</b><span aria-hidden="true">→</span></a></nav>
    <main class="page">
      ${hero()}
      ${galleries()}
      <section class="door"><span class="kick">Already have your code word?</span><br><a class="big" href="${DOOR}">Enter the gala <span aria-hidden="true">→</span></a><p>Type your code word at the door and your phone becomes your character's: their files, their apps, their secrets.</p></section>
      <footer>${esc(CONFIG.TITLE)} · ${esc(CONFIG.SEASON)}<br>Hosted by ${esc(I.HOST || '')}</footer>
    </main>
    <a class="clock" id="clock" href="#top" aria-label="Back to the top"><svg viewBox="0 0 44 44"><circle class="ring" cx="22" cy="22" r="20"/><line class="hh" x1="22" y1="22" x2="22" y2="12"/><line class="mh" x1="22" y1="22" x2="22" y2="6"/></svg><span class="t" id="clockt">7:00 PM</span></a>
    <div class="vig" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>`;
  document.title = CONFIG.TITLE + ' · You\'re invited';
  drawCard();

  /* ---------- the opener ---------- */
  if (opening) {
    document.body.classList.add('opening');
    const op = $('#opener');
    let done = false;
    const finish = () => { if (done) return; done = true; op.classList.add('gone'); document.body.classList.remove('opening'); try { sessionStorage.setItem('vh:opened', '1'); } catch (e) { } setTimeout(() => op.remove(), 1100); };
    setTimeout(() => op.classList.add('lit'), 1350);
    setTimeout(finish, 2000);
    op.addEventListener('click', finish); addEventListener('wheel', finish, { once: true, passive: true }); addEventListener('touchstart', finish, { once: true, passive: true });
    addEventListener('keydown', function esc1(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { finish(); removeEventListener('keydown', esc1); } });
  }

  /* ---------- the gallery moves with you ----------
     Everything moves with transforms set once per frame, so nothing repaints and it stays smooth:
     the wall layers (each at its own depth), the spotlight, the shaft of light, the frame's tilt and
     the shine on the gilt. Scrolling slides the far layers and gently lets the frame drift away. */
  const P = { x: 0, y: 0, tx: 0, ty: 0, mx: innerWidth / 2, my: innerHeight * .3, tmx: innerWidth / 2, tmy: innerHeight * .3, last: -1e9, sy: scrollY, vh: innerHeight };
  const frame = $('#frame'), hang = $('.hang'), shine = $('#shine'), beam = $('.beam'), shaft = $('.shaft');
  const L = [['.l-wall', 10, 8, .05], ['.l-rail', 16, 10, .1], ['.l-far', 26, 16, .18], ['.l-mid', 44, 26, .3], ['.l-near', 80, 40, 0]].map(([s, dx, dy, k]) => ({ el: $(s), dx, dy, k }));
  const nums = $$('.gal-head .num');
  const aim = (cx, cy) => { P.tx = cx / innerWidth * 2 - 1; P.ty = cy / innerHeight * 2 - 1; P.tmx = cx; P.tmy = cy; P.last = performance.now(); };
  if (!calm) {
    addEventListener('pointermove', e => { if (e.pointerType !== 'touch') aim(e.clientX, e.clientY); }, { passive: true });
    addEventListener('pointerdown', e => aim(e.clientX, e.clientY), { passive: true });
    /* phones: tilt the phone and the gallery tilts with it (where the browser allows it without asking) */
    addEventListener('deviceorientation', e => {
      if (e.gamma == null) return;
      const gx = Math.max(-1, Math.min(1, e.gamma / 25)), gy = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
      P.tx = gx; P.ty = gy; P.tmx = (gx + 1) / 2 * innerWidth; P.tmy = (gy + 1) / 2 * innerHeight * .8; P.last = performance.now();
    }, { passive: true });
  }
  const nav = $('#nav'), clock = $('#clock'), clockt = $('#clockt'), hh = $('.clock .hh'), mh = $('.clock .mh');
  let maxScroll = 1, clockKey = '', navOn = null, clockOn = null, frameBox = null;
  const measure = () => { P.vh = innerHeight; maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight); frameBox = null; };
  addEventListener('resize', measure); addEventListener('load', measure); measure();
  let prevT = performance.now();
  function tick(now) {
    /* frame-rate independent easing: the same feel at 60 or 120 frames a second */
    const dt = Math.min(64, now - prevT) / 16.67; prevT = now;
    const ease = k => 1 - Math.pow(1 - k, dt);
    /* nobody moving? the light drifts on its own, slowly */
    if (!calm && now - P.last > 3000) { const t = now / 1000; P.tx = Math.sin(t * .3) * .45; P.ty = Math.cos(t * .23) * .3; P.tmx = innerWidth * (.5 + Math.sin(t * .3) * .26); P.tmy = innerHeight * (.34 + Math.cos(t * .23) * .1); }
    const a = ease(.085), b = ease(.16);
    P.x += (P.tx - P.x) * a; P.y += (P.ty - P.y) * a; P.mx += (P.tmx - P.mx) * b; P.my += (P.tmy - P.my) * b;
    P.sy += (scrollY - P.sy) * ease(.22);
    const sp = Math.min(1, Math.max(0, P.sy / maxScroll));
    /* the wall: each layer at its own depth, sliding a little as you scroll */
    for (const l of L) l.el.style.transform = `translate3d(${(-P.x * l.dx).toFixed(2)}px, ${(-P.y * l.dy - sp * l.k * P.vh).toFixed(2)}px, 0)`;
    beam.style.transform = `translate3d(${P.mx.toFixed(1)}px, ${P.my.toFixed(1)}px, 0)`;
    shaft.style.transform = `translate3d(${P.mx.toFixed(1)}px, 0, 0) rotate(${((P.mx / innerWidth - .5) * -14).toFixed(2)}deg)`;
    /* the frame: tilts toward you, and drifts back and fades as you scroll past it */
    const hp = Math.min(1, Math.max(0, P.sy / (P.vh * .9)));
    if (hp < 1) {
      hang.style.transform = `translate3d(0, ${(hp * 70).toFixed(1)}px, 0) scale(${(1 - hp * .07).toFixed(4)})`;
      hang.style.opacity = (1 - hp * .85).toFixed(3);
      frame.style.transform = `rotateX(${(-P.y * 4).toFixed(2)}deg) rotateY(${(P.x * 6).toFixed(2)}deg)`;
      if (!frameBox) { const r = frame.getBoundingClientRect(); frameBox = { l: r.left, t: r.top + scrollY }; }
      shine.style.transform = `translate3d(${(P.mx - frameBox.l).toFixed(1)}px, ${(P.my - (frameBox.t - scrollY)).toFixed(1)}px, 0)`;
    } else if (hang.style.opacity !== '0.150') { hang.style.opacity = '0.150'; }
    /* the gallery numerals lag behind the page a little */
    for (const n of nums) { const r = n.parentNode.getBoundingClientRect(); if (r.bottom > -200 && r.top < P.vh + 200) n.style.transform = `translate3d(0, ${((r.top - P.vh * .4) * -.12).toFixed(1)}px, 0)`; }
    /* the nav and the little clock */
    const solid = scrollY > 40; if (solid !== navOn) { navOn = solid; nav.classList.toggle('solid', solid); }
    const show = scrollY > P.vh * .6; if (show !== clockOn) { clockOn = show; clock.classList.toggle('show', show); }
    const m = Math.round(Math.min(1, Math.max(0, scrollY / maxScroll)) * 150 / 5) * 5, h = 7 + Math.floor(m / 60), mm = m % 60, key = h + ':' + mm;
    if (key !== clockKey) { clockKey = key; hh.setAttribute('transform', `rotate(${((h % 12) + mm / 60) * 30} 22 22)`); mh.setAttribute('transform', `rotate(${mm * 6} 22 22)`); clockt.textContent = `${h}:${String(mm).padStart(2, '0')} PM`; }
    if (!calm) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  if (calm) addEventListener('scroll', () => requestAnimationFrame(tick), { passive: true });
  /* galleries drift in as they come into view */
  if (!calm && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  } else $$('.reveal').forEach(el => el.classList.add('in'));

  /* ---------- the reply card ---------- */
  /* keep typed answers without redrawing (so the keyboard stays put) */
  document.addEventListener('input', e => { const n = e.target.name; if (n && n in st.f && e.target.type !== 'radio') st.f[n] = e.target.value; });
  document.addEventListener('change', e => {
    const n = e.target.name; if (!n || !(n in st.f) || e.target.type !== 'radio') return;
    const was = st.f[n]; st.f[n] = e.target.value; st.err = '';
    /* the extra questions appear once you say you're coming */
    if (n === 'reply' && ((was === 'yes' || was === 'maybe') !== (st.f.reply === 'yes' || st.f.reply === 'maybe'))) drawCard();
    else $$('input[name="' + n + '"]').forEach(x => x.closest('.opt').classList.toggle('on', x.checked));
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-iv]'); if (!b) return;
    if (b.dataset.iv === 'edit') { const r = st.saved; st.f = { first: r.first, last: r.last, reply: r.reply, size: r.size || '', world: r.world || '', phone: r.phone || '', email: r.email || '', with: r.with || '', notes: r.notes || '' }; st.step = 'form'; drawCard(); }
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
    store.set(KEY, JSON.stringify({ id, token: rec.token }));
    st.saved = Object.assign({ id }, rec); st.step = 'done'; st.err = ''; drawCard();
    const sec = $('#reply'); if (sec) sec.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
  });
})();
