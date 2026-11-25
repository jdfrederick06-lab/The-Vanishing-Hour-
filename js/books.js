/* =====================================================================
   THE VANISHING HOUR — the printed books (books.html). Host only. SPOILERS.
     ?k=main | fbi | crew   the host book (Jacob's, the FBI handler's, the crew handler's)
     ?k=cards               one-page cheat cards, two to a sheet
     ?k=dossiers            every dossier, each starting on a new page
   Everything is built from the settings files (story.js, dossiers.js, evidence.js,
   reveal.js), so the books stay current: change the story, reprint.
   Player names come from Host terminal > RSVPs (who is cast as whom), when available.
   ===================================================================== */
(function () {
  const host = Session.lastHost();
  if (!host) {
    $('#root').innerHTML = `<div class="bk-gate">This page is for the hosts. Sign in at the <a href="host.html">host terminal</a> first, then come back.</div>`;
    return;
  }
  const P = new URLSearchParams(location.search);
  let kind = P.get('k') || (host.role === 'main' ? 'main' : host.role);
  let only = P.get('only') || 'all';           /* cards/dossiers: 'all', a group, or one character */
  const KINDS = [['main', 'Host book · Jacob'], ['fbi', 'Host book · FBI handler'], ['crew', 'Host book · crew handler'], ['cards', 'Cheat cards'], ['dossiers', 'Dossier printouts']];
  /* co-hosts only get their own book (and their groups' cards and dossiers) */
  const allowedKinds = host.role === 'main' ? KINDS : KINDS.filter(([k]) => k === host.role || k === 'cards' || k === 'dossiers');
  if (!allowedKinds.some(([k]) => k === kind)) kind = allowedKinds[0][0];

  const site = location.href.replace(/[^/]*([?#].*)?$/, '');
  const clockAt = min => { const t = 19 * 60 + Math.round(min); const h = Math.floor(t / 60), m = t % 60; return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
  const S0 = { setup: {} };   /* phase lengths as written in story.js */
  const start = i => Clock.startOf(S0, i);
  const groupName = g => (STORY.groups[g] || {}).name || g;
  const hostOf = k => STORY.hosts.find(h => h.role === k) || STORY.hosts[0];
  const money = n => typeof NW !== 'undefined' ? NW.money(n) : '$' + Number(n || 0).toLocaleString('en-US');
  const md = s => Dossier.inline(String(s || ''));
  const box = '<span class="bk-box"></span>';

  /* who plays whom, from the RSVPs (host view of the database) */
  function players() {
    const out = {}, r = (DB.get() || {}).rsvp || {};
    Object.values(r).forEach(x => {
      if (x && x.cast && !x.archive) out[x.cast] = `${x.first || ''} ${x.last || ''}`.trim();
      if (x && x.plus && x.plus.cast) out[x.plus.cast] = `${x.plus.first || ''} ${x.plus.last || ''}`.trim();
    });
    return out;
  }

  /* ---------- the host book (Nov 24: the complete book, one per host) ----------
     Everything a host needs, in order: their job, the truth, getting ready (countdown, shopping,
     rooms and decor, props, the website), the night step by step, every solution, their players,
     the vote and the reveal, and every dossier they look after. The hand-written parts live in
     settings/reveal.js (STORY.reveal.guide), which only the hosts can unlock. */
  const ANSWERS = {
    vault: 'Combination ' + ((STORY.nightwire.vault || {}).combo || [24, 61, 9]).join(', ') + ' (left, right, left). Maintenance override in Host > Games if they get stuck.',
    camera: 'Pick the live feed for each camera; the keypad feed shows the 9. If it fails, Host > Games > Release footage gives the vault footage to the FBI.',
    decrypt: 'Keys: Ellery, 2001, Harlow. Reveals June Ellery\'s child, born February 2001, adopted 2008.',
    record: 'Keys: Ellery, 2001, Harlow. Reveals June Ellery\'s child, born February 2001, adopted 2008.',
    messages: '14 messages back in order (costs one FBI lookup). Reads as a handler (Noor) and a witness (Victor).',
    phone: '14 messages back in order (costs one FBI lookup). Reveals Victor\'s last texts.',
    photo: 'Caption on the back: "Victor Ashgrove and J. E— at the Harbor gallery, December 2000." First to finish posts it to Bebbit.',
    differences: 'Seven differences; the last is Indigo\'s hidden mark.',
    ledger: 'Three entries hide money (12,500 / 20,000 / 17,500). The answer: $50,000 to Vale Fine Art Advisory.',
    doorlog: 'Badge T-03 (an FBI temporary badge) into the vault stairwell at 7:44, after Charlie.'
  };
  /* a character's one-card summary: goals, who to find, their moments, what they have */
  function quick(c) {
    const goals = firstLines(secOf(c, /goal/i), 4).map(l => md(clip(l.replace(/^([-*]|\d+\.)\s+/, ''), 150)));
    const find = firstLines(secOf(c, /who to find/i), 6).filter(l => !/^\|\s*(who|person|name)\s*\|/i.test(l)).slice(0, 4).map(l => /^\|/.test(l) ? tableRow(l) : md(clip(l.replace(/^([-*]|\d+\.)\s+/, ''), 140)));
    const moments = []; STORY.phases.forEach((p, i) => (p.cues || []).forEach(q => { if (q.to && [].concat(q.to).some(t => t === c.id || t === 'g:' + c.group)) moments.push(`<b>${clockAt(start(i) + q.at)}</b> ${md(q.title || '')}`); }));
    const pw = (STORY.bebbit.powers || {})[c.id], w = typeof NW !== 'undefined' ? NW.walletOf(c) : null;
    const extras = [];
    if (pw) extras.push('Bebbit: ' + Object.entries(pw).map(([k, n]) => `${n} ${{ delete: 'removals', trace: 'traces', hack: 'disguised posts' }[k] || k}`).join(', '));
    if (w && typeof NW !== 'undefined') extras.push(Names.bank(c) + ': ' + money((NW.wallets()[w] || {}).start) + (NW.wallets()[w] && NW.wallets()[w].members.length > 1 || /^g:/.test(String((NW.wallets()[w] || {}).members)) ? ' (shared account)' : ''));
    const gm = (STORY.games || []).filter(g => [].concat(g.who).includes(c.id)); if (gm.length) extras.push('Your game: ' + gm.map(g => g.name).join(', '));
    firstLines(secOf(c, /bribe/i), 2).forEach(l => extras.push(l.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').replace(/^Paying to keep your secret: /, 'To bury your secret: ')));
    return { goals, find, moments, extras };
  }
  function hostBook(k) {
    const H = hostOf(k), groups = H.groups || null, GD = (STORY.reveal || {}).guide || {};
    const inScope = c => !groups || groups.includes(c.group);
    const touches = to => !groups || G.touches(to, groups);
    const mine = r => k === 'main' || r === k || r === 'all';
    const cast = STORY.characters.filter(inScope).sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)), names = players();
    const R = STORY.reveal || {}, killer = G.byId(R.killer);
    const nm = id => (G.byId(id) || { name: id }).name;
    const ROLE = { main: 'Main host', fbi: 'FBI handler', crew: 'Crew handler', all: 'Every host' };
    const toc = []; let part = 0;
    const partH = (t, sub) => { part++; toc.push(['p' + part, `Part ${part} · ${t}`, true]); return `<div class="bk-part" id="p${part}"><small>Part ${part}</small><h1>${esc(t)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`; };
    const add = (id, title, body) => { toc.push([id, title]); return `<section class="bk-sec" id="${id}"><h2>${esc(title)}</h2>${body}</section>`; };
    const tbl = (head, rows, cls) => `<table class="bk-t ${cls || ''}"><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(x => `<td>${md(x)}</td>`).join('')}</tr>`).join('')}</table>`;
    const ul = (arr, check) => arr.length ? `<ul class="${check ? 'bk-check' : ''}">${arr.map(t => `<li>${check ? box : ''}${md(t)}</li>`).join('')}</ul>` : '';
    const games = (STORY.games || []).filter(g => !groups || G.touches(g.who, groups) || (g.backup && G.touches(g.backup, groups)));
    const opensAt = o => o.phase ? clockAt(start(STORY.phases.findIndex(p => p.id === o.phase))) : o.min != null ? clockAt(o.min) : 'when the host opens it';
    const gameMin = t => { const m = String(t).match(/^(\d+):(\d\d)$/); return m ? Number(m[1]) * 60 + Number(m[2]) + (Number(m[1]) < 7 ? 12 * 60 : 0) - 19 * 60 : null; };
    const mems = (GD.memories || []).filter(m => inScope(G.byId(m[1]) || {}) || k === 'main');
    let html = '';

    /* ===== Part 1: your night ===== */
    html += partH('Your night', 'Start here. Read this part first.');
    const SH = GD.startHere || {};
    if (SH.all) html += add('start', 'Start here', (SH.all || []).concat(SH[k] || []).map(p => `<p>${md(p)}</p>`).join('') +
      ((SH.steps || {})[k] ? `<h3>Your night in ${SH.steps[k].length} steps</h3><ol class="bk-steps-list">${SH.steps[k].map(x => `<li>${md(x)}</li>`).join('')}</ol>` : '') +
      `<div class="bk-tip"><b>Reading this on your phone?</b> Use the <b>Go to</b> menu at the top to jump anywhere. On the night, <b>Right now</b> takes you straight to the part of the night that's happening.</div>`);
    html += add('job', 'Your job tonight', ((GD.jobs || {})[k] || []).map(p => `<p>${md(p)}</p>`).join('') +
      (groups ? `<p>You look after <b>${esc(groups.map(groupName).join(', '))}</b>: ${cast.length} players.</p>` : '') +
      `<p class="bk-note">How to use this book: read Parts 1 to 3 the week before. Keep Part 4 open on the night; it runs in clock order. Part 5 has every answer. The dossiers for your players are at the back.</p>`);
    if (GD.glossary) html += add('glossary', 'Words you\'ll hear tonight', `<dl class="bk-gloss">${GD.glossary.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${md(d)}</dd>`).join('')}</dl>`);
    html += add('contacts', 'Contacts', `<table class="bk-t bk-fill">${(GD.contacts || []).map(([a, b]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td><td class="bk-line"></td></tr>`).join('')}</table>`);
    html += add('codes', 'Codes and links',
      `<table class="bk-t"><tr><th>What</th><th>Where</th><th>Code word</th></tr>
        ${(k === 'main' ? STORY.hosts : [H]).map(h => `<tr><td>${esc(h.label)} (host terminal)</td><td class="mono">${esc(site)}host.html</td><td class="mono"><b>${esc(h.code)}</b></td></tr>`).join('')}
        <tr><td>Players sign in</td><td class="mono">${esc(site)}gala/</td><td>their own code word (see Part 6)</td></tr>
        ${k === 'main' ? `<tr><td>Big screen (projector)</td><td class="mono">${esc(site)}reveal.html</td><td>host code</td></tr><tr><td>Print pages</td><td class="mono">print.html · posters.html · badges.html · books.html</td><td>host code</td></tr>` : ''}</table>
       <p>If a phone dies, the player signs in on any other phone with the same code word; nothing is lost. A host can be signed in on several devices at once.</p>`);

    /* ===== Part 2: the truth ===== */
    html += partH('The truth', 'Keep this book closed around players');
    html += add('truth', 'What really happened',
      `<p class="bk-lead">${killer ? `<b>The killer is ${esc(killer.name)}.</b> ` : ''}The painting was stolen by the ${esc(groupName(R.thiefGroup || 'crew'))}${R.diamondThief && G.byId(R.diamondThief) ? `; ${esc(G.byId(R.diamondThief).name)} went for the diamond` : ''}.</p>` +
      (R.chapters || []).map(ch => `<div class="bk-ch"><small>${esc(ch.kicker || '')}</small><b>${esc(ch.title)}${ch.big ? ' ' + esc(ch.big) : ''}</b>${(ch.body || []).map(p => `<p>${md(p)}</p>`).join('')}</div>`).join(''));
    if (GD.solve) html += add('solve', 'How players get to the killer', `<p>No single clue names ${esc(killer ? killer.name : 'the killer')}. Players have to answer five questions, each from two or three places (paper, FBI Headquarters, Bebbit, Omnizon), so no one group can solve it alone.</p>` +
      tbl(['#', 'The question', 'What answers it', 'Clues'], GD.solve.map((r, i) => [String(i + 1), '**' + r[0] + '**', r[1], r[2]])) + (GD.theft ? `<p>${md(GD.theft)}</p>` : ''));
    if (GD.wins) html += add('wins', 'Who wins', tbl(['Group', 'They win if'], GD.wins.map(r => ['**' + r[0] + '**', r[1]])));

    /* ===== Part 3: getting ready ===== */
    html += partH('Getting ready', 'From three weeks out to the hour before the doors open');
    html += add('countdown', 'Getting ready, week by week', (GD.countdown || []).map(s => { const items = s.items.filter(([r]) => mine(r)); return items.length ? `<h3>${esc(s.when)}</h3><ul class="bk-check">${items.map(([r, t]) => `<li>${box}${md(t)}${k === 'main' && r !== 'main' ? ` <span class="bk-who-tag">${esc(ROLE[r] || r)}</span>` : ''}</li>`).join('')}</ul>` : ''; }).join(''));
    const shop = (GD.shopping || []).filter(([, , r]) => mine(r));
    if (shop.length) html += add('shopping', 'Shopping and supplies', tbl(['', 'Item', 'How many'].concat(k === 'main' ? ['Who brings it'] : []), shop.map(([t, n, r]) => [box, t, n].concat(k === 'main' ? [ROLE[r] || r] : [])), 'bk-shop') +
      `<p class="bk-note">Printed pieces (evidence, props, badges, posters, cheat cards, dossiers) come from the print pages; see the countdown.</p>`);
    const rooms = (GD.rooms || []), myRooms = rooms.filter(r => mine(r.owner));
    html += add('rooms', 'Rooms and decor', `<p>The building is decided in January. Write each room's real name on the line.</p>` +
      myRooms.map(r => `<div class="bk-room"><div class="bk-room-h"><b>${esc(r.name)}</b>${k === 'main' ? `<span class="bk-who-tag">${esc(ROLE[r.owner] || r.owner)}</span>` : ''}<span class="bk-line">Room:</span></div><p>${md(r.what)}</p>${ul(r.setup || [], true)}${r.decor ? `<p class="bk-note"><b>Look:</b> ${md(r.decor)}</p>` : ''}</div>`).join('') +
      (k !== 'main' ? `<p class="bk-note">The other rooms (${esc(rooms.filter(r => !mine(r.owner)).map(r => r.name).join(', '))}) are set by the other hosts.</p>` : ''));
    const D = GD.decor || {};
    if (k === 'main' && D.look) html += add('decor', 'The look, music and dress code', ul(D.look) + `<p><b>Dress code.</b> ${md(D.dress || '')}</p>` + tbl(['Part of the night', 'Music'], D.music || []) + (D.extras ? `<h3>Also</h3>${ul(D.extras, true)}` : ''));
    else if (D.dress) html += add('decor', 'Dress code', `<p>${md(D.dress)}</p>`);
    const propRows = (GD.props || []).filter(([who]) => k === 'main' || cast.some(c => c.name.split(' ')[0] === who));
    if (propRows.length) html += add('props', 'Props to hand out', tbl(['', 'Who', 'What they get'], propRows.map(([w, t]) => [box, '**' + w + '**', t])) +
      (k === 'main' ? `<h3>Evidence</h3>${tbl(['#', 'Piece', 'Where it goes / who holds it', 'Clue'], (STORY.evidence || []).map(e => [String(e.item), e.title, e.holder || '', e.clue || '']))}<p class="bk-note">Print from print.html. Scanning a QR tag marks its clue found and shares it with everyone; Host > Games shows which have been scanned.</p>` : ''));
    const W = GD.website || {};
    html += add('website', 'The website', ['before', 'during', 'after'].map(t => { const rows = (W[t] || []).filter(([r]) => mine(r)); return rows.length ? `<h3>${{ before: 'Before the doors', during: 'During the night', after: 'At the end' }[t]}</h3>${ul(rows.map(([, x]) => x), t === 'before')}` : ''; }).join('') +
      `<p class="bk-note">Phones get every cue by themselves on the clock. The host terminal shows Now, Next and a countdown; every host can pause it.</p>`);

    /* ===== Part 4: the night, step by step ===== */
    html += partH('The night, step by step', 'Keep this part open on the night. It runs in clock order: just follow it down.');
    toc.push(['show', 'The night, minute by minute']);
    html += `<section class="bk-sec" id="show"><h2>The night, minute by minute</h2><p class="bk-lead">Each box below is one part of the night. Read the box when that part starts: what's happening, what to say, your checklist, and what to do if people get stuck.</p>` + STORY.phases.map((p, i) => {
      const G2 = (GD.phases || {})[p.id] || {}, from = start(i), to = from + p.min;
      const cues = (p.cues || []).filter(c => (c.to && touches(c.to)) || (!c.to && k === 'main'));
      const gs = games.filter(g => g.opens && ((g.opens.phase === p.id) || (g.opens.min != null && g.opens.min >= from && g.opens.min < to)));
      const mm = mems.filter(m => { const t = gameMin(m[0]); return t == null ? p.id === 'act2' : t >= from && t < to; });
      const steps = k === 'main' ? [['You', G2.main], ['FBI handler', G2.fbi], ['Crew handler', G2.crew]] : [['You', G2[k]]];
      const hints = Object.entries(G2.hints || {}).filter(([a]) => k === 'main' || (k === 'fbi' ? a === 'fbi' : a === 'crew' || a === 'guest' && false));
      return `<div class="bk-phase" id="ph-${p.id}"><div class="bk-ph"><span class="bk-time">${clockAt(from)}</span><b>${esc(p.name)}</b><span class="bk-len">${p.min} min · until ${clockAt(to)}</span></div>
        ${p.note ? `<p>${md(p.note)}</p>` : ''}${p.say ? `<p class="bk-say">Say: "${md(p.say)}"</p>` : ''}
        ${steps.filter(([, a]) => a && a.length).map(([who, a]) => `<div class="bk-steps"><h4>${esc(who)}</h4>${ul(a, true)}</div>`).join('')}
        ${cues.length ? `<h4>On the phones</h4><table class="bk-t bk-cues">${cues.map(c => `<tr><td class="bk-time">${clockAt(from + c.at)}</td><td>${c.to ? '<b>' + esc(Names.say(G.toLabel(c.to))) + '</b>: ' + md(c.title ? c.title + '. ' : '') + md(c.text || '') : '<b>Bebbit</b> (planted): ' + md((c.post || {}).text || '')}${c.host ? `<div class="bk-note">${md(c.host)}</div>` : ''}</td></tr>`).join('')}</table>` : ''}
        ${mm.length ? `<h4>Memories</h4><table class="bk-t bk-cues">${mm.map(m => `<tr><td class="bk-time">${esc(m[0])}</td><td><b>${esc(nm(m[1]))}</b> (${esc(m[2])}): ${md(m[3])}<div class="bk-note">${md(m[4])}</div></td></tr>`).join('')}</table>` : ''}
        ${gs.length ? `<p class="bk-games">Opens now: ${gs.map(g => esc(g.name)).join(', ')}</p>` : ''}
        ${hints.length ? `<div class="bk-hints"><h4>If they're stuck, nudge</h4>${hints.map(([a, l]) => `<p><b>${esc({ guest: 'Guests', fbi: 'Agents', crew: 'Crew' }[a] || a)}:</b> ${l.map(x => '"' + md(x) + '"').join(' · ')}</p>`).join('')}</div>` : ''}
        ${(p.todo || []).length ? `<h4>Before you move on</h4><ul class="bk-check">${p.todo.map(t => `<li>${box}${md(t)}</li>`).join('')}</ul>` : ''}</div>`;
    }).join('') + `</section>`;

    /* ===== Part 5: solutions ===== */
    html += partH('Every answer', 'Look things up here when players ask, or when you need to check a solution');
    if (GD.clues) html += add('clues', 'The 15 clues', tbl(['#', 'Clue', 'Form', 'Who has it / how it\'s found', 'From', 'What it proves', 'Backup'], GD.clues, 'bk-small-t'));
    if (GD.herrings) html += add('herrings', 'The red herrings', tbl(['#', 'Red herring', 'Points at', 'The innocent truth', 'How players clear it'], GD.herrings, 'bk-small-t'));
    if (GD.decoys) html += add('decoys', 'Wrong trails built into the story', tbl(['Decoy', 'Points at', 'Why it\'s innocent'], GD.decoys, 'bk-small-t'));
    if (GD.locks) html += add('locks', 'The locked props', tbl(['Lock', 'What it holds', 'How it opens'].concat(k === 'main' ? ['Set by'] : []), GD.locks.map(r => r.slice(0, 3).concat(k === 'main' ? [ROLE[r[3]] || r[3]] : []))));
    if (games.length) html += add('games', 'Mini-games and answers', games.map(g => `<div class="bk-game"><b>${esc(g.name)}</b> · ${esc(Names.say(G.toLabel(g.who)))}${g.backup ? ' (backup: ' + esc(Names.say(G.toLabel(g.backup))) + ')' : ''} · opens ${esc(opensAt(g.opens || {}))}${g.clue ? ' · clue ' + esc(g.clue) : ''}<p>${md(Names.say(g.blurb || ''))}</p><p class="bk-ans">Answer: ${md(ANSWERS[g.id] || 'see Host > Games')}</p></div>`).join('') +
      `<p class="bk-note">Host > Games can open a game early, close it, mark it solved, add 30 seconds or send a hint.</p>`);
    if (!groups || groups.includes('fbi')) {
      const F = STORY.fbi || {}, recs = STORY.records || [];
      html += add('fbi', 'The FBI\'s tools and records', `<ul><li>${F.lookups || 10} record lookups for the whole team (a "no match" still costs one). Host > FBI: +1 lookup.</li>
        <li>${esc(nm(F.lead))} leads: ${F.warrants || 3} warrants (unseal records, freeze bank accounts), detentions, and releasing statements to the room.</li>
        <li>Sealed sections need a warrant; restricted sections open only for ${esc((F.cleared || []).map(nm).join(', '))}.</li>
        <li>The FBI has Bebbit read-only, can't play the casino, and their votes count double.</li></ul>
        <h3>What each lookup finds</h3>` + tbl(['Record', 'Says', 'Locked parts'], recs.map(r => [`**${r.title || r.names[0]}**${r.noMatch ? ' (no match: a fake identity)' : ''}`, (r.fields || []).map(f => f[0] + ': ' + f[1]).concat(r.notes || []).join(' · '), (r.sections || []).map(s => `**${s.title}**${s.needs ? ' (' + (s.needs === 'warrant' ? 'warrant' : 'clearance') + ')' : ''}${s.clue ? ' · clue ' + s.clue : ''}: ${s.body.replace(/\n/g, ' ')}`).join('<br>')]), 'bk-small-t'));
    }
    if (!groups || groups.includes('crew')) {
      const N = STORY.nightwire, ws = N.wallets || {};
      html += add('money', 'Money and Omnizon', tbl(['Account', 'Who', 'Starts with'], Object.entries(ws).map(([id, w]) => [`\`${w.name}\``, [].concat(w.members).map(m => m.startsWith('g:') ? groupName(m.slice(2)) : nm(m)).join(', '), money(w.start) + (w.pending ? ' + ' + money(w.pending.amount) + ' on delivery (void when Victor dies)' : '')])) +
        `<ul><li>The crew needs to sell the painting for about ${money(N.goal)} to one of: ${esc((N.buyers || []).map(nm).join(', '))}. Sale money is held until ${esc((STORY.phases.find(p => p.id === N.escrowUntil) || {}).name || 'later')}.</li>
        <li>Each player's bank goes by a different name: Bebbit Banking (guests and staff), the Federal Credit Union (FBI), Omnizon Wallet (crew). It's one bank underneath.</li>
        <li>The rich can "free up" more money once a night; it arrives after a wait on the game clock.</li>
        <li>Casino: the house always wins in the end; its take goes to ${esc(nm((N.casino || {}).beneficiary) || 'the foundation')}, less a ${Math.round(((N.casino || {}).companyCut || 0) * 100)}% event fee to ${esc(nm((N.casino || {}).feeTo) || 'Harper')}'s events company. ${esc(nm((N.casino || {}).feeTo) || 'Harper')} only gets a ${(((N.casino || {}).harperCut || 0) * 100).toFixed(2).replace(/0$/, '')}% commission, so the casino never fixes her $180,000 problem. Winners count against the foundation, so its total can go negative. Table limit ${money((N.casino || {}).maxBet || 0)} a round; the roulette wheel has three zeros. The FBI can't play.</li>
        <li>Cameron lends ${money((N.lending || {}).min)} to ${money((N.lending || {}).max)}; an overdue loan lets Cameron freeze the borrower by court order and name them publicly.</li>
        <li>Host terminal > Omnizon: + or - money for anyone, freeze or unfreeze, make freed-up money arrive now.</li></ul>
        <h3>On Omnizon tonight</h3>` + tbl(['File', 'Seller', 'Price', 'Who can buy', 'Appears'], (N.market || []).map(it => [it.title, it.seller, money(it.price), it.for.map(groupName).join(', '), it.from ? clockAt(start(STORY.phases.findIndex(p => p.id === it.from))) : 'from the start'])));
    }

    /* ===== Part 6: your players ===== */
    html += partH(groups ? 'Your players' : 'The cast', 'Code words, and everything each player is trying to do');
    html += add('cast', groups ? 'Your groups and code words' : 'Cast and code words', tbl(['Character', 'Group', 'Cover role', 'Code word', 'Played by'], cast.map(c => [`**${c.name}**${c.key ? ' <span class="bk-key">key</span>' : ''}`, groupName(c.group), c.role, '`' + c.code + '`', names[c.id] || ''])) +
      `<p class="bk-note">"Key" players drive the story. If one is a no-show, mark them in Host > People; their mini-games pass to a backup by themselves.</p>`);
    html += add('guide', 'Player by player', cast.map(c => { const q = quick(c); return `<div class="bk-who g-${c.group}"><div class="bk-who-h"><b>${esc(c.name)}</b><span>${esc(groupName(c.group))} · ${esc(c.role)}${names[c.id] ? ' · ' + esc(names[c.id]) : ''}</span><span class="mono">${esc(c.code)}</span></div>
      <div class="bk-cols"><div>${q.goals.length ? `<h4>Goals</h4><ul>${q.goals.map(g => `<li>${g}</li>`).join('')}</ul>` : ''}${q.find.length ? `<h4>Finds</h4><ul>${q.find.map(g => `<li>${g}</li>`).join('')}</ul>` : ''}</div>
      <div>${q.moments.length ? `<h4>Moments</h4><ul class="bk-mom">${q.moments.map(m => `<li>${m}</li>`).join('')}</ul>` : ''}${q.extras.length ? `<h4>Has</h4><ul>${q.extras.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div></div></div>`; }).join(''));

    /* ===== Part 7: the end ===== */
    html += partH('The end of the night', 'The vote, the arrest and the reveal');
    html += add('reveal', 'The vote, the arrest and the reveal', `<ol>
        <li>Voting opens by itself at "${esc((STORY.phases.find(p => p.id === 'vote') || {}).name || 'The accusation')}" (or Host > Vote > Open). Phones ask: who stole the painting, and who is the killer.</li>
        <li>When voting closes, ${esc((STORY.vote.arrestBy || []).map(nm).join(', then '))} makes the arrest on their phone (the first one who is present).</li>
        <li>${k === 'main' ? 'Host > Vote: press Next to step through the slides. Read the line under each slide aloud. The big screen and every phone follow.' : 'Jacob runs the reveal from the main terminal. Stand with your group.'}</li>
        <li>Then announce each group's result (see "Who wins" in Part 2).</li></ol>
      <div class="bk-script">${(R.chapters || []).map((ch, j) => `<p><span class="bk-time">${j + 1}</span><b>${esc(ch.title)}${ch.big ? ' ' + esc(ch.big) : ''}</b><br><span class="bk-say">"${md(ch.say || '')}"</span></p>`).join('')}</div>`);
    html += add('trouble', 'When something goes wrong', `<table class="bk-t">
      <tr><td><b>A phone can't sign in</b></td><td>Check the code word in Part 6 (no spaces). Open ${esc(site)}gala/ in the phone's browser, not inside a social app.</td></tr>
      <tr><td><b>A phone dies</b></td><td>Sign in on any phone with the same code word. Everything is still there.</td></tr>
      <tr><td><b>Someone didn't come</b></td><td>Host > People > No-show. Their games pass to a backup; the vote skips them. Every key clue has a backup (Part 5).</td></tr>
      <tr><td><b>Someone is out of line</b></td><td>Host > People > Throw out: no vote, no money. "Let back in" undoes it.</td></tr>
      <tr><td><b>Something looks broken</b></td><td>Host > Health: errors from phones and who is connected. Reloading the page fixes most things.</td></tr>
      <tr><td><b>Running late</b></td><td>Space pauses the clock; + adds 5 minutes; N moves to the next phase.</td></tr>
      <tr><td><b>Players are stuck</b></td><td>Use the nudges in Part 4, or Host > Messages to send one privately. Host > Games: hint, +30 seconds, or mark solved.</td></tr>
      <tr><td><b>A co-host is missing</b></td><td>The main host's book has every co-host step in Part 4. The crew handler's timed setups matter most.</td></tr></table>`);
    html += add('keys', 'Host terminal keys', `<table class="bk-t"><tr><td class="mono">Space</td><td>pause / resume (or start the night)</td></tr><tr><td class="mono">+ / -</td><td>add 5 minutes / take away 1 minute</td></tr><tr><td class="mono">N / B</td><td>next phase / back one phase (both ask first)</td></tr><tr><td class="mono">M</td><td>quick message</td></tr><tr><td class="mono">/</td><td>search the cast</td></tr><tr><td class="mono">P</td><td>hide the screen (privacy blur)</td></tr><tr><td class="mono">1-9</td><td>switch section</td></tr></table>`);

    /* ===== Appendix: every dossier this host looks after ===== */
    toc.push(['dossiers', `Appendix · ${groups ? 'Your players\' dossiers' : 'All ' + cast.length + ' dossiers'}`, true]);
    html += `<div class="bk-part" id="dossiers"><small>Appendix</small><h1>${groups ? 'Your players\' dossiers' : 'Every dossier'}</h1><p>${cast.length} dossiers, each on its own page.</p></div>` + cast.map(c => dossierPage(c, names)).join('');

    const cover = `<section class="bk-cover"><small>The Vanishing Hour · ${esc(CONFIG.EVENT)} · ${esc(CONFIG.SEASON)}</small><h1>Host book</h1><h3>${esc(H.label)}${H.role === 'main' ? ' · ' + esc(H.name) : ''}</h3>
      <p class="bk-conf">Confidential. The whole solution is inside.</p>
      <p>${esc(CONFIG.INVITE.DATE)} · ${esc(CONFIG.INVITE.TIME)} · ${esc(CONFIG.INVITE.PLACE)}</p>
      ${groups ? `<p>You look after: <b>${esc(groups.map(groupName).join(', '))}</b> (${cast.length} players).</p>` : ''}
      <ol class="bk-toc">${toc.map(([id, t, big]) => `<li class="${big ? 'big' : ''}"><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol>
      <p class="bk-note">Printed ${esc(new Date().toLocaleDateString())}. Built from the story files, so reprint after changes.</p></section>`;
    return `<article class="bk-book">${cover}${html}</article>`;
  }

  /* ---------- people to print (cards and dossiers) ---------- */
  function who() {
    const H = host.role === 'main' ? null : (hostOf(host.role).groups || null);
    let list = STORY.characters.filter(c => !H || H.includes(c.group));
    if (only !== 'all') list = G.byId(only) ? list.filter(c => c.id === only) : list.filter(c => c.group === only);
    return list.slice().sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  }
  const secOf = (c, re) => (Dossier.sections(Names.say(STORY.dossiers[c.id] || '', c)).find(x => x.title && re.test(x.title)) || null);
  const firstLines = (sec, n) => !sec ? [] : sec.lines.map(l => l.trim()).filter(l => l && !/^\|\s*:?-{2,}/.test(l) && !/^#/.test(l)).slice(0, n);
  const clip = (s, n) => s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;
  const tableRow = l => { const cells = l.replace(/^\||\|$/g, '').split('|').map(x => x.trim()); return cells.length > 1 ? `<b>${md(cells[0])}</b>: ${md(clip(cells.slice(1).join(' · '), 110))}` : md(clip(l, 140)); };

  /* ---------- cheat cards ---------- */
  function card(c, names) {
    const { goals, find, moments, extras } = quick(c);
    return `<div class="bk-card g-${c.group}"><header><div><small>${esc(groupName(c.group))} · for ${esc(c.name.split(' ')[0])} only</small><h3>${esc(c.name)}</h3><p>${esc(c.role)}</p></div>
        <div class="bk-code"><small>Your code word</small><b class="mono">${esc(c.code)}</b><small>${esc(site.replace(/^https?:\/\//, ''))}gala/</small>${names[c.id] ? `<small>${esc(names[c.id])}</small>` : ''}</div></header>
      <div class="bk-cols"><div>${goals.length ? `<h4>Your goals</h4><ul>${goals.map(g => `<li>${g}</li>`).join('')}</ul>` : ''}${find.length ? `<h4>Find</h4><ul>${find.map(g => `<li>${g}</li>`).join('')}</ul>` : ''}</div>
        <div>${moments.length ? `<h4>Your moments</h4><ul class="bk-mom">${moments.slice(0, 6).map(m => `<li>${m}</li>`).join('')}</ul>` : ''}${extras.length ? `<h4>You have</h4><ul>${extras.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        <p class="bk-small">Everything else is in "My file" on your phone. Never show this card to anyone.</p></div></div></div>`;
  }
  function cards() {
    const names = players(), list = who(), pages = [];
    for (let i = 0; i < list.length; i += 2) pages.push(`<div class="bk-sheet bk-cards">${list.slice(i, i + 2).map(c => card(c, names)).join('<div class="bk-cut"></div>')}</div>`);
    return pages.join('') || '<p>No one to print.</p>';
  }

  /* ---------- dossier printouts ---------- */
  function dossierPage(c, names) {
    const secs = Dossier.sections(Names.say(STORY.dossiers[c.id] || '', c)), intro = secs.shift(), world = G.door(c);
    return `<article class="bk-dos w-${world}"><header class="bk-dh"><div class="bk-stamp">${esc((Dossier.STAMP || {})[world] || 'PRIVATE & CONFIDENTIAL')}</div><small>Dossier · for ${esc(c.name)} only${names[c.id] ? ' · ' + esc(names[c.id]) : ''}</small><h2>${esc(c.name)}</h2><p>${esc(c.role)} · ${esc(groupName(c.group))} · code word <span class="mono">${esc(c.code)}</span></p>${intro && intro.lines.join('').trim() ? intro.html : ''}</header>
        ${secs.filter(x => x.title).map(x => `<section class="bk-ds ${Dossier.KIND(x.title)}"><h3>${Dossier.inline(x.title)}</h3>${x.html}</section>`).join('')}
        <footer>Never show this file to anyone. Tell people what you choose, in your own words.</footer></article>`;
  }
  function dossiers() {
    const names = players();
    return who().map(c => dossierPage(c, names)).join('') || '<p>No one to print.</p>';
  }
  /* ---------- the page ---------- */
  function draw() {
    const H = host.role === 'main' ? null : (hostOf(host.role).groups || null);
    const groupsList = Object.keys(STORY.groups).filter(g => !H || H.includes(g));
    const people = ['cards', 'dossiers'].includes(kind);
    const bar = `<div class="bk-bar"><b>Books</b>${allowedKinds.map(([k, t]) => `<button data-k="${k}" aria-pressed="${kind === k}">${esc(t)}</button>`).join('')}
      ${people ? `<select data-only><option value="all">Everyone (${STORY.characters.filter(c => !H || H.includes(c.group)).length})</option>${groupsList.map(g => `<option value="${g}" ${only === g ? 'selected' : ''}>${esc(groupName(g))}</option>`).join('')}<optgroup label="One person">${STORY.characters.filter(c => !H || H.includes(c.group)).sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}" ${only === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup></select>` : ''}
      ${!people ? `<select data-jump aria-label="Go to a section"><option value="">Go to…</option></select><button data-now title="Jump to the part of the night that's happening">Right now</button>` : ''}
      <a href="host.html">Host terminal</a><button class="go" data-print>Print or save as PDF</button></div>`;
    const body = kind === 'cards' ? cards() : kind === 'dossiers' ? dossiers() : hostBook(kind);
    $('#root').innerHTML = bar + `<div class="bk-doc k-${kind}">${body}</div>`;
    document.title = (KINDS.find(x => x[0] === kind) || [0, 'Books'])[1] + ' · The Vanishing Hour';
    /* the Go to menu lists every part and section of the book */
    const j = $('[data-jump]'); if (j) j.innerHTML = '<option value="">Go to…</option>' + $$('.bk-toc li a').map(a => `<option value="${a.getAttribute('href').slice(1)}">${a.parentElement.classList.contains('big') ? '' : '   '}${esc(a.textContent)}</option>`).join('');
  }
  /* Right now: the part of the night the clock is in */
  function jumpNow() {
    const r = Clock.read(DB.get() || {}), id = r.state === 'before' ? 'start' : r.state === 'over' ? 'reveal' : 'ph-' + (r.phase || {}).id;
    const el = document.getElementById(id) || document.getElementById('show'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.addEventListener('click', e => {
    const k = e.target.closest('[data-k]'); if (k) { kind = k.dataset.k; only = 'all'; history.replaceState(null, '', '?k=' + kind); draw(); window.scrollTo(0, 0); return; }
    if (e.target.closest('[data-print]')) PrintLock.ask(() => window.print());
    if (e.target.closest('[data-now]')) jumpNow();
  });
  document.addEventListener('change', e => { const jp = e.target.closest('[data-jump]'); if (jp && jp.value) { const el = document.getElementById(jp.value); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); jp.value = ''; return; } });
  document.addEventListener('change', e => { const s = e.target.closest('[data-only]'); if (s) { only = s.value; history.replaceState(null, '', '?k=' + kind + (only !== 'all' ? '&only=' + only : '')); draw(); } });
  PrintLock.install();
  DB.loaded().then(draw);
})();
