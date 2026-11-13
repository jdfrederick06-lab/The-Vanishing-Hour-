/* =====================================================================
   THE VANISHING HOUR — the invitation (index.html). The page everyone sees first.
   A museum after dark. The gallery wall behind moves gently with the mouse (or the
   tilt of a phone). In front hangs one carved, gilded frame under a brass picture
   light, empty: that's where the invitation is. Calm on purpose: nothing flickers,
   the frame stays put, and scrolling just scrolls.
   Keeps the story's secrets: no teams, no deaths, no heist. Only Victor's party.
   From here, players with a code word go through to the gala door (gala/).

   Replies are saved as rsvp/{id} and listed on the host terminal (RSVPs tab).
   A reply is never deleted: changing it keeps the earlier version.
   This page doesn't load story.js, so it can go online before the game does.
     rsvp/{id} = { first, last, reply: yes|maybe|no, size: lead|support, world, phone, email,
                   with, notes, at, updated?, history?: [earlier versions], token }
     world is the answer to "Which best describes you?" and quietly maps to a side of the
     story (guest, fbi, crew, staff, any); only the host sees which is which.
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

  const SIZES = [['lead', 'A leading role', 'At the heart of the story: the biggest secrets and the hardest choices.'], ['support', 'A large supporting role', 'Still deep in the plot, with a little more room to breathe.']];
  /* "Which best describes you?" Each answer quietly points at a side of the story (the value). */
  const WORLDS = [['guest', 'The one everyone is watching', 'Charming, connected, a little dramatic.'], ['fbi', 'The one asking the questions', 'You notice what others miss and can\'t leave a puzzle alone.'], ['crew', 'The one with a plan', 'Calm under pressure. Rules are more like suggestions.'], ['staff', 'The one nobody notices', 'Quietly in the background, hearing everything.'], ['any', 'Surprise me', 'Cast me wherever the story needs me.']];
  const REPLIES = [['yes', 'Accepts with pleasure'], ['maybe', 'Hopes to attend'], ['no', 'Declines with regret']];

  /* the house rules (nothing that gives the story away). third value = remember this one */
  const RULES = [
    ['Stay in character', 'From the moment you arrive until the final reveal, you are your character. If you ever need to step out, just say so plainly.'],
    ['Your code word is your key', 'It signs your phone into the game. Never share it, and never type in anyone else\'s.'],
    ['You may lie, except under oath', 'Everyone has secrets and you may lie about yours. But some facts in your file are sworn: if you\'re asked about one directly and on the record, you must tell the truth.', 1],
    ['Your file stays yours', 'Never show anyone your character file. Share what you choose, in your own words.'],
    ['Leave things as you find them', 'If you find something with a tag on it, scan it, then put it back where it was. Never force a lock.'],
    ['Nothing real is at stake', 'Any money in the game is play money. Nobody spends a real cent.'],
    ['The host\'s word is final', 'If the host calls "Pause," everyone freezes. The host settles every dispute.'],
    ['Be kind', 'Real people are behind every character. Mind the building, no running on the stairs, and look after each other.']
  ];
  const BRING = [['A charged phone', 'The night runs on it.'], ['Gala attire', 'Black tie optional. Your file suggests a look.'], ['Your character', 'Read your file before you arrive.'], ['Nothing else', 'No real money or valuables needed.']];
  const FAQ = [
    ['Do I need to be good at acting?', 'Not at all. Read your file, talk to people and chase your goals. Every part works at any level.'],
    ['When do I find out who I am?', 'About a week before the night, your character file arrives by email: who you are, what you want, what you\'re hiding, and your code word.'],
    ['How long is it?', 'About two and a half hours, start to finish.'],
    ['Can I come with a friend?', 'Yes, as long as they reply too. Tell us in your reply if you\'d like a storyline together.'],
    ['What if I don\'t have a smartphone?', 'Say so in your reply and we\'ll set you up another way.'],
    ['Is it scary?', 'It\'s a murder mystery, so expect a crime or two. Nothing gory and no jump scares.'],
    ['I already have a code word. Where do I go?', 'Use "Enter the gala" above, or "I have a code word" at the top of the page. Type it in and your phone becomes your character\'s.']
  ];

  const st = { step: 'form', err: '', f: { first: '', last: '', reply: '', size: '', world: '', phone: '', email: '', with: '', notes: '' } };
  const prev = mine(); if (prev) { const s = DB.get(), r = s.rsvp && s.rsvp[prev.id]; if (r && r.token === prev.token) { st.step = 'done'; st.saved = Object.assign({ id: prev.id }, r); } }

  /* ---------- drawn pieces (one set of gradients, shared) ---------- */
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <radialGradient id="g-boss" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff3c8"/><stop offset=".45" stop-color="#d8b25e"/><stop offset="1" stop-color="#5e4211"/></radialGradient>
    <linearGradient id="g-block" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e1a0"/><stop offset=".45" stop-color="#b08534"/><stop offset="1" stop-color="#4d360f"/></linearGradient>
    <linearGradient id="g-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e4211"/><stop offset=".25" stop-color="#f6dc94"/><stop offset=".5" stop-color="#b58a3a"/><stop offset=".8" stop-color="#6d4c17"/><stop offset="1" stop-color="#3a2909"/></linearGradient>
    <linearGradient id="g-rod" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5e4211"/><stop offset=".5" stop-color="#e9c873"/><stop offset="1" stop-color="#5e4211"/></linearGradient>
    <radialGradient id="g-wax" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#cf3550"/><stop offset=".5" stop-color="#931429"/><stop offset="1" stop-color="#4a0611"/></radialGradient>
    <radialGradient id="g-waxin" cx=".64" cy=".72" r=".8"><stop offset="0" stop-color="#a51d34"/><stop offset="1" stop-color="#650a1b"/></radialGradient>
    <radialGradient id="g-gloss" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="g-rope" x1="0" x2="1"><stop offset="0" stop-color="#6d4c17"/><stop offset=".5" stop-color="#f0d488"/><stop offset="1" stop-color="#6d4c17"/></linearGradient>
    <linearGradient id="g-vel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c23b55"/><stop offset="1" stop-color="#5c0815"/></linearGradient>
  </defs></svg>`;
  /* a carved rosette for each corner of the frame */
  const rosette = c => `<svg class="ros ${c}" viewBox="0 0 60 60" aria-hidden="true"><rect x="2" y="2" width="56" height="56" rx="4" fill="url(#g-block)"/><rect x="6.5" y="6.5" width="47" height="47" rx="3" fill="#3a2909" opacity=".45"/><rect x="7.5" y="7.5" width="45" height="45" rx="2.5" fill="url(#g-block)" opacity=".7"/>
    ${Array.from({ length: 8 }, (_, i) => `<ellipse cx="30" cy="16.5" rx="5" ry="10" fill="url(#g-boss)" stroke="#4d360f" stroke-width=".7" transform="rotate(${i * 45} 30 30)"/>`).join('')}
    ${Array.from({ length: 8 }, (_, i) => `<ellipse cx="30" cy="21.5" rx="2.8" ry="6" fill="url(#g-boss)" stroke="#4d360f" stroke-width=".5" transform="rotate(${i * 45 + 22.5} 30 30)"/>`).join('')}
    <circle cx="30" cy="30" r="5.4" fill="url(#g-boss)" stroke="#4d360f" stroke-width=".7"/><circle cx="28.6" cy="28.4" r="1.7" fill="#fff6d6" opacity=".75"/></svg>`;
  /* the brass picture light */
  const lamp = `<div class="lamp" aria-hidden="true"><svg viewBox="0 0 400 74">
    <path d="M200 74 V52 C200 44 196 40 188 38" fill="none" stroke="url(#g-rod)" stroke-width="5" stroke-linecap="round"/><rect x="186" y="62" width="28" height="12" rx="2" fill="url(#g-brass)"/>
    <rect x="30" y="16" width="340" height="22" rx="11" fill="url(#g-brass)"/><rect x="30" y="16" width="340" height="22" rx="11" fill="none" stroke="#3a2909" stroke-opacity=".6"/>
    <ellipse cx="30" cy="27" rx="6" ry="11" fill="#d8b25e" stroke="#3a2909" stroke-opacity=".6"/><ellipse cx="370" cy="27" rx="6" ry="11" fill="#8a6420" stroke="#3a2909" stroke-opacity=".6"/>
    <rect x="44" y="34" width="312" height="4" rx="2" fill="#fff4cf"/><rect x="44" y="34" width="312" height="4" rx="2" fill="#ffd98a" opacity=".7" style="filter:blur(3px)"/>
    <path d="M60 20 H340" stroke="#fff3c8" stroke-opacity=".55" stroke-width="1.5" stroke-linecap="round"/></svg></div>`;
  /* the Ashgrove wax seal: an hourglass, ringed with the collection's name */
  function waxSeal() {
    const N = 48, p = [];
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, r = 44 + Math.sin(a * 3 + .7) * 1.9 + Math.sin(a * 5 + 2.1) * 1.3 + Math.sin(a * 11) * .7; p.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]); }
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], f = n => n.toFixed(2);
    let m0 = mid(p[N - 1], p[0]), d = `M${f(m0[0])} ${f(m0[1])}`;
    for (let i = 0; i < N; i++) { const q = mid(p[i], p[(i + 1) % N]); d += ` Q${f(p[i][0])} ${f(p[i][1])} ${f(q[0])} ${f(q[1])}`; }
    const glass = 'M-8 -12.5 H8 M-8 12.5 H8 M-6.2 -12.5 C-6.2 -4.5 -1.4 -2.2 -1.4 0 C-1.4 2.2 -6.2 4.5 -6.2 12.5 M6.2 -12.5 C6.2 -4.5 1.4 -2.2 1.4 0 C1.4 2.2 6.2 4.5 6.2 12.5';
    const sand = 'M-4.6 11.6 Q0 6.2 4.6 11.6 Z M-3.2 -8.5 Q0 -5.2 3.2 -8.5 Z';
    const words = 'THE ASHGROVE COLLECTION · MMXXVII · ';
    return `<svg class="seal" viewBox="0 0 100 100" aria-hidden="true">
      <defs><path id="seal-ring" d="M50 50 m-25.5 0 a25.5 25.5 0 1 1 51 0 a25.5 25.5 0 1 1 -51 0"/></defs>
      <path d="${d}" fill="url(#g-wax)"/>
      <path d="${d}" fill="none" stroke="#2c0309" stroke-opacity=".35" stroke-width=".8"/>
      <circle cx="50" cy="50" r="34.5" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="2.4"/>
      <circle cx="50" cy="50" r="33.5" fill="url(#g-waxin)"/>
      <circle cx="49.3" cy="49.3" r="34" fill="none" stroke="#ffb3c0" stroke-opacity=".18" stroke-width="1"/>
      ${Array.from({ length: 44 }, (_, i) => { const a = i / 44 * Math.PI * 2; return `<circle cx="${f(50 + Math.cos(a) * 31)}" cy="${f(50 + Math.sin(a) * 31)}" r=".85" fill="#2c0309" fill-opacity=".35"/>`; }).join('')}
      <text font-family="Bodoni Moda, Georgia, serif" font-size="5.6" letter-spacing=".9" fill="#2c0309" fill-opacity=".45"><textPath href="#seal-ring" startOffset="0">${words}</textPath></text>
      <text font-family="Bodoni Moda, Georgia, serif" font-size="5.6" letter-spacing=".9" fill="#ffd3da" fill-opacity=".22" transform="translate(-.35 -.35)"><textPath href="#seal-ring" startOffset="0">${words}</textPath></text>
      <circle cx="50" cy="50" r="20" fill="none" stroke="#2c0309" stroke-opacity=".3" stroke-width="1"/>
      <g transform="translate(50.6 50.6)" fill="none" stroke="#2c0309" stroke-opacity=".5" stroke-width="1.8" stroke-linecap="round"><path d="${glass}"/></g><g transform="translate(50.6 50.6)" fill="#2c0309" fill-opacity=".45"><path d="${sand}"/></g>
      <g transform="translate(49.6 49.6)" fill="none" stroke="#ffc4cf" stroke-opacity=".38" stroke-width="1.4" stroke-linecap="round"><path d="${glass}"/></g><g transform="translate(49.6 49.6)" fill="#ffc4cf" fill-opacity=".25"><path d="${sand}"/></g>
      <ellipse cx="34" cy="28" rx="15" ry="7" fill="url(#g-gloss)" transform="rotate(-32 34 28)"/></svg>`;
  }
  /* the same emblem, in gold line, for Victor's letterhead */
  const crest = `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="none" stroke="#9c7428" stroke-width="1.2"/><circle cx="24" cy="24" r="18.5" fill="none" stroke="#9c7428" stroke-width=".6"/><g transform="translate(24 24)" fill="none" stroke="#7a5719" stroke-width="1.3" stroke-linecap="round"><path d="M-7 -11 H7 M-7 11 H7 M-5.4 -11 C-5.4 -4 -1.2 -2 -1.2 0 C-1.2 2 -5.4 4 -5.4 11 M5.4 -11 C5.4 -4 1.2 -2 1.2 0 C1.2 2 5.4 4 5.4 11"/></g><path d="M20 34.5 Q24 30 28 34.5 Z" fill="#9c7428"/></svg>`;

  let k = 0;
  const title = CONFIG.TITLE.split(' ').map(w => `<span class="w">${w.split('').map(ch => `<span class="c" style="--k:${k++}">${esc(ch)}</span>`).join('')}</span>`).join(' ');
  const rope = `<svg viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
    ${[60, 600, 1140].map(x => `<rect x="${x - 6}" y="20" width="12" height="100" fill="url(#g-rope)"/><circle cx="${x}" cy="16" r="12" fill="url(#g-rope)"/>`).join('')}
    <path d="M66 26 Q330 104 594 26" fill="none" stroke="url(#g-vel)" stroke-width="11" stroke-linecap="round"/><path d="M606 26 Q870 104 1134 26" fill="none" stroke="url(#g-vel)" stroke-width="11" stroke-linecap="round"/></svg>`;

  function hero() {
    return `<section class="hero" id="top" aria-label="The invitation">
      <div class="hang">${lamp}
        <div class="frame" id="frame">
          <i class="rail t"></i><i class="rail r"></i><i class="rail b"></i><i class="rail l"></i><i class="miter"></i>
          <div class="shine-clip" aria-hidden="true"><i class="shine" id="shine"></i></div>
          ${['tl', 'tr', 'bl', 'br'].map(rosette).join('')}
          <div class="fillet"><div class="liner"><div class="canvas"><div class="patch" aria-hidden="true"></div><i class="hook l" aria-hidden="true"></i><i class="hook r" aria-hidden="true"></i>
            <span class="kick">An interactive murder mystery</span>
            <p class="from">Mr. Victor Ashgrove<br>requests the pleasure of your company at</p>
            <h1 class="title" aria-label="${esc(CONFIG.TITLE)}">${title}</h1>
            <div class="rule" aria-hidden="true"><i></i><b></b><i></i></div>
            <p class="event">${esc(CONFIG.EVENT)}<em>An evening with the Ashgrove Collection · ${esc(CONFIG.SEASON)}</em></p>
            <div class="hero-acts"><a class="btn gold" href="#reply">${st.step === 'done' ? 'See your reply' : 'Kindly reply'}</a><a class="btn ghost" href="#evening">Read the invitation</a></div>
          </div></div></div>
        </div>
      </div>
      <div class="label"><b>${esc(CONFIG.TITLE)}</b><span>Henri Valcourt, 1874 · Oil on canvas<br>From the Ashgrove Collection</span><span class="when">On view for one night only. ${esc(I.PLACE || '')}.</span></div>
      <a class="cue" href="#evening">Enter<i></i></a>
    </section>`;
  }
  const head = (num, kick, h) => `<div class="gal-head reveal"><span class="num" aria-hidden="true">${num}</span><span class="kick">${kick}</span><h2>${h}</h2></div>`;
  function sections() {
    return `
    <section class="gal" id="evening"><div class="gal-in">
      ${head('I', 'The evening', 'You are cordially <em>invited</em>')}
      <div class="evening">
        <article class="letter reveal"><div class="lh">${crest}<div><b>Victor J. Ashgrove</b><span>The Ashgrove Collection</span></div></div>
          <p class="dear">My dear friend,</p>
          <p>For one evening this spring, I am opening the Ashgrove Collection to a few of the most interesting people I know. There will be music, champagne, and conversation. Some of the guests are old friends. A few, I suspect, are not.</p>
          <p>I hear every guest arrives with a story. I'd ask you to bring one too: come as someone else. Everyone else will.</p>
          <p>Do stay for my toast. It's the reason for the whole affair.</p>
          <div class="sig"><i>Until then,</i><b>Victor Ashgrove</b></div>
          <p class="ps">P.S. Keep this invitation to yourself. Not everyone made the list.</p>
        </article>
        <div class="reveal" style="transition-delay:.12s"><p class="steps-h">How the night works</p><ol class="steps">
          <li><b>Reply</b><p>Tell us you're coming, how big a part you'd like, and which kind of person you are. We'll do the rest.</p></li>
          <li><b>Become someone else</b><p>About a week before, your character arrives by email: a name, a past, secrets worth keeping, goals worth chasing, and a code word.</p></li>
          <li><b>Play the night</b><p>Your phone becomes your character's. Talk, trade, bargain and dig. At the end, everyone gives their verdict, and the truth comes out.</p></li>
        </ol></div>
      </div>
    </div></section>

    <section class="gal" id="where"><div class="gal-in">
      ${head('II', 'When and where', 'Admit one')}
      <div class="ticket reveal"><div class="main">
        <div class="tk-top"><b>${esc(CONFIG.EVENT)}</b><small>${esc(CONFIG.SEASON)}</small></div>
        <div class="tk-grid">
          <div><small>Date</small><b>${esc(I.DATE || '')}</b></div>
          <div><small>Doors</small><b>${esc(I.TIME || '')}</b></div>
          <div><small>Place</small><b>${esc(I.PLACE || '')}</b><span>The evening moves between several rooms. Directions come with your character.</span></div>
          <div><small>Dress</small><b>${esc(I.DRESS || '')}</b></div>
        </div></div>
        <div class="stub"><div><span class="adm">Admit one</span><small>No. ${String(1874).padStart(6, '0')}</small></div></div>
      </div>
      <div class="bring reveal">${BRING.map(([h, p], i) => `<div><small>Bring ${['i', 'ii', 'iii', 'iv'][i]}</small><b>${esc(h)}</b><span>${esc(p)}</span></div>`).join('')}</div>
    </div></section>

    <section class="gal" id="rules"><div class="gal-in">
      ${head('III', 'Before you arrive', 'The house rules')}
      <div class="plaque reveal"><i class="screw s1"></i><i class="screw s2"></i><i class="screw s3"></i><i class="screw s4"></i>
        <ol class="rules">${RULES.map(([h, p, key]) => `<li${key ? ' class="key"' : ''}>${key ? '<span class="tag">Remember this one</span>' : ''}<h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('')}</ol></div>
    </div></section>

    <section class="gal" id="reply"><div class="gal-in">
      ${head('IV', 'R.S.V.P.', 'Kindly reply')}
      <div class="reply-wrap reveal"><div id="card"></div></div>
    </div></section>`;
  }

  const opt = (name, val, label, sub, on) => `<label class="opt${on ? ' on' : ''}"><input type="radio" name="${name}" value="${val}" ${on ? 'checked' : ''}><span class="dot" aria-hidden="true"></span><span><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></label>`;
  const label = (list, v) => (list.find(x => x[0] === v) || [, ''])[1];
  function card() {
    const f = st.f, coming = f.reply === 'yes' || f.reply === 'maybe';
    if (st.step === 'done') {
      const r = st.saved, rep = label(REPLIES, r.reply);
      return `<div class="card">${waxSeal()}<div class="done">
        <svg class="tick" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>
        <h3>${r.reply === 'no' ? 'We\'ll miss you' : 'Your reply is in'}</h3>
        <p class="who"><span>M</span>${esc(r.first)} ${esc(r.last)}</p>
        <p class="rep">${esc(rep)}</p>
        ${r.reply === 'no' ? '<p>Thank you for letting us know. If your plans change, you can change your reply here.</p>'
          : `<p>About a week before the night you'll receive your character: who you are, what you're hiding, and the code word that lets you in. ${r.email ? 'It goes to <b>' + esc(r.email) + '</b>.' : 'Your host will hand it to you.'}</p>
            <ul class="sum"><li><span>Part</span>${esc(label(SIZES, r.size) || 'To be decided')}</li><li><span>You are</span>${esc(label(WORLDS, r.world) || 'To be decided')}</li></ul>`}
        <p class="refno">Reply no. ${esc(ref(r.id))}</p>
        <button type="button" class="linkbtn" data-iv="edit">Change my reply</button></div></div>`;
    }
    return `<form class="card" id="rvf" novalidate>${waxSeal()}
      <div class="card-head"><small>The favour of a reply</small><b>${esc(CONFIG.EVENT)}</b><span>${esc(I.RSVP_BY || '')}</span></div>
      <div class="name"><span class="m" aria-hidden="true">M</span><input class="fld" name="first" placeholder="First name" value="${esc(f.first)}" autocomplete="given-name" aria-label="First name"><input class="fld" name="last" placeholder="Last name" value="${esc(f.last)}" autocomplete="family-name" aria-label="Last name"></div>
      <fieldset class="set replies"><legend>Your reply</legend>${REPLIES.map(([v, l]) => opt('reply', v, l, '', f.reply === v)).join('')}</fieldset>
      ${coming ? `
        <fieldset class="set"><legend>How big a part would you like?</legend><span class="hint">Every part is a real part. This is about how much of the spotlight you want.</span>${SIZES.map(([v, l, d]) => opt('size', v, l, d, f.size === v)).join('')}</fieldset>
        <fieldset class="set"><legend>Which best describes you?</legend><span class="hint">Answer honestly. It helps us cast you.</span><div class="grid2">${WORLDS.map(([v, l, d]) => opt('world', v, l, d, f.world === v)).join('')}</div></fieldset>
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
  const motes = calm ? '' : Array.from({ length: 20 }, () => `<i style="--x:${rnd(0, 100).toFixed(1)}%;--y:${rnd(20, 100).toFixed(1)}%;--s:${rnd(1.5, 3.2).toFixed(1)}px;--t:${rnd(16, 30).toFixed(1)}s;--d:-${rnd(0, 30).toFixed(1)}s;--dx:${rnd(-40, 40).toFixed(0)}px"></i>`).join('');
  const seen = k => { try { return sessionStorage.getItem(k); } catch (e) { return '1'; } };
  const opening = !calm && !seen('vh:opened');

  $('#root').innerHTML = `${defs}
    ${opening ? `<div id="opener" aria-hidden="true"><div class="op-clock"><svg viewBox="0 0 100 100"><circle class="op-ring" cx="50" cy="50" r="46"/>${Array.from({ length: 12 }, (_, i) => `<line class="op-tick" x1="50" y1="6" x2="50" y2="${i % 3 ? 9 : 12}" transform="rotate(${i * 30} 50 50)"/>`).join('')}<line class="op-hand h" x1="50" y1="50" x2="50" y2="26"/><line class="op-hand" x1="50" y1="56" x2="50" y2="10"/><circle class="op-pin" cx="50" cy="50" r="2.2"/></svg><div class="op-words">Doors at seven.</div></div><button class="op-skip" type="button">Skip</button></div>` : ''}
    <div class="stage" aria-hidden="true">
      <div class="layer l-wall"></div>
      <div class="layer l-rail"></div>
      <div class="layer l-far">${art}</div>
      <div class="layer l-mid motes">${motes}</div>
      <div class="layer l-near"><div class="rope">${rope}</div></div>
    </div>
    <div class="shaft" aria-hidden="true"></div><div class="beam" aria-hidden="true"></div>
    <nav class="nav" id="nav"><a class="brand" href="#top">${esc(CONFIG.TITLE)}</a><span class="links"><a href="#evening">The evening</a><a href="#where">When &amp; where</a><a href="#rules">House rules</a><a href="#reply">R.S.V.P.</a></span><a class="enter" href="${DOOR}"><b class="lg">I have a code word</b><b class="sm">Code word</b><span aria-hidden="true">→</span></a></nav>
    <main class="page">
      ${hero()}
      ${sections()}
      <section class="door"><span class="kick">Already have your code word?</span><br><a class="big" href="${DOOR}">Enter the gala <span aria-hidden="true">→</span></a><p>Type your code word at the door and your phone becomes your character's.</p></section>
      <section class="faqs" id="faq"><div class="gal-in"><h2>Common questions</h2><div class="faq">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></div></section>
      <footer>${esc(CONFIG.TITLE)} · ${esc(CONFIG.SEASON)}<br>Hosted by ${esc(I.HOST || '')}</footer>
    </main>
    <a class="clock" id="clock" href="#top" aria-label="Back to the top"><svg viewBox="0 0 44 44"><circle class="ring" cx="22" cy="22" r="20"/><line class="hh" x1="22" y1="22" x2="22" y2="12"/><line class="mh" x1="22" y1="22" x2="22" y2="6"/></svg><span class="t" id="clockt">7:00 PM</span></a>
    <div class="vig" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>`;
  document.title = CONFIG.TITLE + ' · You\'re invited';
  drawCard();

  /* ---------- the opener: the clock sweeps, then the room fades up ---------- */
  if (opening) {
    document.body.classList.add('opening');
    const op = $('#opener');
    let done = false;
    const finish = () => { if (done) return; done = true; op.classList.add('gone'); document.body.classList.remove('opening'); try { sessionStorage.setItem('vh:opened', '1'); } catch (e) { } setTimeout(() => op.remove(), 1200); };
    setTimeout(finish, 2100);
    op.addEventListener('click', finish); addEventListener('wheel', finish, { once: true, passive: true }); addEventListener('touchstart', finish, { once: true, passive: true });
    addEventListener('keydown', function esc1(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { finish(); removeEventListener('keydown', esc1); } });
  }

  /* ---------- the wall moves with you (gently) ----------
     Only the gallery behind moves: each layer at its own depth, on a soft spring, with
     transforms set once per frame (nothing repaints). The frame never moves. The spotlight
     follows the pointer and the light on the gilt follows it too; both settle down as you
     scroll past the frame. When nobody moves, everything eases back to rest. */
  const P = { x: 0, y: 0, tx: 0, ty: 0, mx: innerWidth / 2, my: innerHeight * .36, tmx: innerWidth / 2, tmy: innerHeight * .36, last: -1e9 };
  const frame = $('#frame'), shine = $('#shine'), beam = $('.beam'), shaft = $('.shaft');
  const L = [['.l-wall', 8, 6], ['.l-rail', 12, 8], ['.l-far', 20, 12], ['.l-mid', 32, 18], ['.l-near', 52, 26]].map(([s, dx, dy]) => ({ el: $(s), dx, dy }));
  const aim = (cx, cy) => { P.tx = cx / innerWidth * 2 - 1; P.ty = cy / innerHeight * 2 - 1; P.tmx = cx; P.tmy = cy; P.last = performance.now(); };
  if (!calm) {
    addEventListener('pointermove', e => { if (e.pointerType !== 'touch') aim(e.clientX, e.clientY); }, { passive: true });
    /* phones: tilt the phone and the wall tilts with it (where the browser allows it without asking) */
    addEventListener('deviceorientation', e => {
      if (e.gamma == null) return;
      const gx = Math.max(-1, Math.min(1, e.gamma / 30)), gy = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      P.tx = gx; P.ty = gy; P.tmx = (gx + 1) / 2 * innerWidth; P.tmy = (gy + 1) / 2 * innerHeight * .8; P.last = performance.now();
    }, { passive: true });
  }
  const nav = $('#nav'), clock = $('#clock'), clockt = $('#clockt'), hh = $('.clock .hh'), mh = $('.clock .mh');
  let maxScroll = 1, clockKey = '', navOn = null, clockOn = null, lit = -1;
  const measure = () => { maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight); };
  addEventListener('resize', measure); addEventListener('load', measure); measure();
  let prevT = performance.now();
  function tick(now) {
    const dt = Math.min(64, now - prevT) / 16.67; prevT = now;
    const ease = q => 1 - Math.pow(1 - q, dt);
    /* nobody moving for a while: drift back to rest, slowly (no wandering light) */
    if (now - P.last > 5000) { P.tx = 0; P.ty = 0; P.tmx = innerWidth / 2; P.tmy = innerHeight * .36; }
    const a = ease(.045), b = ease(.09);
    P.x += (P.tx - P.x) * a; P.y += (P.ty - P.y) * a; P.mx += (P.tmx - P.mx) * b; P.my += (P.tmy - P.my) * b;
    for (const l of L) l.el.style.transform = `translate3d(${(-P.x * l.dx).toFixed(2)}px, ${(-P.y * l.dy).toFixed(2)}px, 0)`;
    beam.style.transform = `translate3d(${P.mx.toFixed(1)}px, ${P.my.toFixed(1)}px, 0)`;
    shaft.style.transform = `translate3d(${P.mx.toFixed(1)}px, 0, 0) rotate(${((P.mx / innerWidth - .5) * -10).toFixed(2)}deg)`;
    /* past the frame, the spotlight dims to a soft ambient glow */
    const hv = Math.min(1, Math.max(0, scrollY / (innerHeight * .8))), l2 = Math.round((1 - hv) * 20) / 20;
    if (l2 !== lit) { lit = l2; beam.style.opacity = (.35 + .65 * l2).toFixed(2); shaft.style.opacity = (.6 * l2).toFixed(2); }
    if (l2 > 0) { const r = frame.getBoundingClientRect(); shine.style.transform = `translate3d(${(P.mx - r.left).toFixed(1)}px, ${(P.my - r.top).toFixed(1)}px, 0)`; }
    const solid = scrollY > 40; if (solid !== navOn) { navOn = solid; nav.classList.toggle('solid', solid); }
    const show = scrollY > innerHeight * .6; if (show !== clockOn) { clockOn = show; clock.classList.toggle('show', show); }
    const m = Math.round(Math.min(1, Math.max(0, scrollY / maxScroll)) * 150 / 5) * 5, h = 7 + Math.floor(m / 60), mm = m % 60, key = h + ':' + mm;
    if (key !== clockKey) { clockKey = key; hh.setAttribute('transform', `rotate(${((h % 12) + mm / 60) * 30} 22 22)`); mh.setAttribute('transform', `rotate(${mm * 6} 22 22)`); clockt.textContent = `${h}:${String(mm).padStart(2, '0')} PM`; }
    if (!calm) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  if (calm) addEventListener('scroll', () => requestAnimationFrame(tick), { passive: true });
  /* sections fade in as they come into view */
  if (!calm && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: .1, rootMargin: '0px 0px -6% 0px' });
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
    if (b.dataset.iv === 'edit') { const r = st.saved; st.f = { first: r.first, last: r.last, reply: r.reply, size: SIZES.some(x => x[0] === r.size) ? r.size : '', world: r.world || '', phone: r.phone || '', email: r.email || '', with: r.with || '', notes: r.notes || '' }; st.step = 'form'; drawCard(); }
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'rvf') return; e.preventDefault();
    const f = st.f, coming = f.reply === 'yes' || f.reply === 'maybe';
    const fail = m => { st.err = m; drawCard(); const er = $('#rvf .err'); if (er) er.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' }); };
    f.first = f.first.trim(); f.last = f.last.trim(); f.email = f.email.trim();
    if (!f.first || !f.last) return fail('Please write your first and last name.');
    if (!f.reply) return fail('Please choose your reply.');
    if (coming && !f.size) return fail('How big a part would you like?');
    if (coming && !f.world) return fail('Which best describes you?');
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
