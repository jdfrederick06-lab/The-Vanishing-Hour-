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

  /* ---------- the host book ---------- */
  const ANSWERS = {
    vault: 'Combination ' + ((STORY.nightwire.vault || {}).combo || [24, 61, 9]).join(', ') + ' (left, right, left). Maintenance override in Host > Games if they get stuck.',
    camera: 'Pick the live feed for each camera; the keypad feed shows the 9. If it fails, Host > Games > Release footage gives the vault footage to the FBI.',
    record: 'Keys: Ellery, 2001, Harlow. Reveals June Ellery\'s child, born February 2001, adopted 2008.',
    phone: '14 messages back in order (costs one FBI lookup). Reveals Victor\'s last texts.',
    photo: 'Caption on the back: "Victor Ashgrove and J. E— at the Harbor gallery, December 2000." First to finish posts it to Bebbit.',
    differences: 'Seven differences; the last is Indigo\'s hidden mark.',
    ledger: 'Three entries hide money (12,500 / 20,000 / 17,500). The answer: $50,000 to Vale Fine Art Advisory.',
    doorlog: 'Badge T-03 (an FBI temporary badge) into the vault stairwell at 7:44, after Charlie.'
  };
  function hostBook(k) {
    const H = hostOf(k), groups = H.groups || null;
    const inScope = c => !groups || groups.includes(c.group);
    const touches = to => !groups || G.touches(to, groups);
    const cast = STORY.characters.filter(inScope), names = players();
    const R = STORY.reveal || {}, killer = G.byId(R.killer);
    const sec = (id, title, body, cls) => `<section class="bk-sec ${cls || ''}" id="${id}"><h2>${title}</h2>${body}</section>`;
    const toc = [];
    const add = (id, title, body, cls) => { toc.push([id, title]); return sec(id, title, body, cls); };
    const games = (STORY.games || []).filter(g => !groups || G.touches(g.who, groups) || (g.backup && G.touches(g.backup, groups)));
    const opensAt = o => o.phase ? clockAt(start(STORY.phases.findIndex(p => p.id === o.phase))) : o.min != null ? clockAt(o.min) : 'when the host opens it';

    let html = '';
    /* the truth */
    html += add('truth', 'The truth, on one page',
      `<p class="bk-lead">${killer ? `<b>The killer is ${esc(killer.name)}.</b> ` : ''}The painting was stolen by the ${esc(groupName(R.thiefGroup || 'crew'))}${R.diamondThief && G.byId(R.diamondThief) ? `; ${esc(G.byId(R.diamondThief).name)} went for the diamond` : ''}. Keep this book closed around players.</p>` +
      (R.chapters || []).map(ch => `<div class="bk-ch"><small>${esc(ch.kicker || '')}</small><b>${esc(ch.title)}${ch.big ? ' ' + esc(ch.big) : ''}</b>${(ch.body || []).map(p => `<p>${md(p)}</p>`).join('')}</div>`).join(''));
    /* codes and links */
    html += add('codes', 'Codes and links',
      `<table class="bk-t"><tr><th>What</th><th>Where</th><th>Code word</th></tr>
        ${(k === 'main' ? STORY.hosts : [H]).map(h => `<tr><td>${esc(h.label)} (host terminal)</td><td class="mono">${esc(site)}host.html</td><td class="mono"><b>${esc(h.code)}</b></td></tr>`).join('')}
        <tr><td>Players sign in</td><td class="mono">${esc(site)}gala/</td><td>their own code word (cast list)</td></tr>
        ${k === 'main' ? `<tr><td>Big screen (projector)</td><td class="mono">${esc(site)}reveal.html</td><td>host code</td></tr><tr><td>Print pages</td><td class="mono">print.html · posters.html · badges.html · books.html</td><td>host code</td></tr>` : ''}</table>
       <p>If a phone dies, the player can sign in on any other phone with the same code word; nothing is lost. A host can sign in on several devices at once.</p>`);
    /* before the doors */
    const arrive = STORY.phases[0];
    const pre = k === 'main' ? [
      'Laptop for the host terminal, charged, signed in with the main host code',
      'Projector or TV showing reveal.html (sign in with the host code, press F for full screen)',
      'Wi-Fi works in every room; test one phone in the farthest room',
      'Evidence printed and placed (see "Evidence and props" below); June\'s painting is ready to hang in the vault',
      'Props handed to their holders before the briefings',
      'Badges cut and in sleeves, laid out by group; posters and signs up',
      'NFC tag behind June\'s painting (tap it once with a signed-in phone to test)',
      'Host terminal > Setup: night reset, test speed back to x1',
      'Host terminal > Health: no errors showing'
    ] : ['Your badge and this book', 'Sign in to the host terminal with your code on your phone or laptop', 'Read your groups\' dossiers below the cast list once more', 'Know where your groups\' briefing happens'];
    html += add('before', 'Before the doors open', `<ul class="bk-check">${pre.concat(arrive.todo || []).map(t => `<li>${box}${md(t)}</li>`).join('')}</ul>`);
    /* run of show */
    html += add('show', 'Run of show', STORY.phases.map((p, i) => {
      const cues = (p.cues || []).filter(c => (c.to && touches(c.to)) || (!c.to && k === 'main'));
      const gs = games.filter(g => g.opens && ((g.opens.phase === p.id) || (g.opens.min != null && g.opens.min >= start(i) && g.opens.min < start(i) + p.min)));
      return `<div class="bk-phase"><div class="bk-ph"><span class="bk-time">${clockAt(start(i))}</span><b>${esc(p.name)}</b><span class="bk-len">${p.min} min</span></div>
        ${p.note ? `<p>${md(p.note)}</p>` : ''}${p.say ? `<p class="bk-say">Say: "${md(p.say)}"</p>` : ''}
        ${cues.length ? `<table class="bk-t bk-cues">${cues.map(c => `<tr><td class="bk-time">${clockAt(start(i) + c.at)}</td><td>${c.to ? '<b>' + esc(G.toLabel(c.to)) + '</b>: ' + md(c.title ? c.title + '. ' : '') + md(c.text || '') : '<b>Bebbit</b> (planted): ' + md((c.post || {}).text || '')}${c.host ? `<div class="bk-note">${md(c.host)}</div>` : ''}</td></tr>`).join('')}</table>` : ''}
        ${gs.length ? `<p class="bk-games">Opens now: ${gs.map(g => esc(g.name)).join(', ')}</p>` : ''}
        ${(p.todo || []).length && i > 0 ? `<ul class="bk-check">${p.todo.map(t => `<li>${box}${md(t)}</li>`).join('')}</ul>` : ''}</div>`;
    }).join('') + `<p class="bk-note">Phones get every cue by themselves on the clock. This list is so you know what's happening and can nudge people.</p>`);
    /* cast */
    html += add('cast', groups ? 'Your groups and code words' : 'Cast and code words', `<table class="bk-t bk-cast"><tr><th>Character</th><th>Group</th><th>Cover role</th><th>Code word</th><th>Played by</th></tr>
      ${cast.slice().sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)).map(c => `<tr><td><b>${esc(c.name)}</b>${c.key ? ' <span class="bk-key">key</span>' : ''}</td><td>${esc(groupName(c.group))}</td><td>${esc(c.role)}</td><td class="mono">${esc(c.code)}</td><td>${esc(names[c.id] || '')}</td></tr>`).join('')}</table>
      <p class="bk-note">"Key" players drive the story. If one is a no-show, mark them in Host > People; their mini-games pass to a backup by themselves.</p>`);
    /* evidence */
    if (k === 'main') html += add('evidence', 'Evidence and props', `<table class="bk-t"><tr><th>#</th><th>Piece</th><th>Where it goes / who holds it</th><th>Clue</th></tr>
      ${(STORY.evidence || []).map(e => `<tr><td>${e.item}</td><td>${esc(e.title)}</td><td>${esc(e.holder || '')}</td><td>${esc(e.clue || '')}</td></tr>`).join('')}
      ${(STORY.props || []).map(p => `<tr><td>prop</td><td>${esc(p.title)}</td><td>${esc(p.holder || '')}</td><td></td></tr>`).join('')}</table>
      <p class="bk-note">Print from print.html. Scanning a QR tag marks its clue found and shares it with everyone; Host > Games shows which have been scanned.</p>`);
    /* games */
    if (games.length) html += add('games', 'Mini-games and answers', games.map(g => `<div class="bk-game"><b>${esc(g.name)}</b> · ${esc(G.toLabel(g.who))}${g.backup ? ' (backup: ' + esc(G.toLabel(g.backup)) + ')' : ''} · opens ${esc(opensAt(g.opens || {}))}${g.clue ? ' · clue ' + esc(g.clue) : ''}<p>${md(g.blurb || '')}</p><p class="bk-ans">Answer: ${md(ANSWERS[g.id] || 'see Host > Games')}</p></div>`).join('') +
      `<p class="bk-note">Host > Games can open a game early, close it, mark it solved, add 30 seconds or send a hint.</p>`);
    /* money */
    if (!groups || groups.includes('crew')) {
      const N = STORY.nightwire, ws = N.wallets || {};
      html += add('money', 'Money at a glance', `<table class="bk-t"><tr><th>Account</th><th>Who</th><th>Starts with</th></tr>${Object.entries(ws).map(([id, w]) => `<tr><td class="mono">${esc(w.name)}</td><td>${esc([].concat(w.members).map(m => m.startsWith('g:') ? groupName(m.slice(2)) : (G.byId(m) || { name: m }).name).join(', '))}</td><td>${money(w.start)}${w.pending ? ' + ' + money(w.pending.amount) + ' on delivery (void when Victor dies)' : ''}</td></tr>`).join('')}</table>
        <ul><li>The crew needs to sell the painting for about ${money(N.goal)} to one of: ${esc((N.buyers || []).map(b => (G.byId(b) || { name: b }).name).join(', '))}. Sale money is held until ${esc((STORY.phases.find(p => p.id === N.escrowUntil) || {}).name || 'later')}.</li>
        <li>The rich can "free up" more money once a night; it arrives after a wait on the game clock.</li>
        <li>Casino: the house always wins in the end; its take goes to ${esc((G.byId((N.casino || {}).beneficiary) || {}).name || 'the foundation')}, ${Math.round(((N.casino || {}).harperCut || 0) * 100)}% to ${esc((G.byId((N.casino || {}).feeTo) || {}).name || 'Harper')}. The FBI can't play.</li>
        <li>Cameron lends ${money((N.lending || {}).min)} to ${money((N.lending || {}).max)}; an overdue loan lets Cameron freeze the borrower by court order and name them publicly.</li>
        <li>Host > NIGHTWIRE: + or - money for anyone, freeze or unfreeze, make freed-up money arrive now.</li></ul>`);
    }
    if (!groups || groups.includes('fbi')) {
      const F = STORY.fbi || {};
      html += add('fbi', 'The FBI\'s tools', `<ul><li>${F.lookups || 10} record lookups for the whole team (a "no match" still costs one). Host > FBI: +1 lookup.</li>
        <li>${esc((G.byId(F.lead) || { name: 'The lead' }).name)} leads: ${F.warrants || 3} warrants (unseal records, freeze accounts), detentions, and releasing statements to the room.</li>
        <li>Records sections marked sealed need a warrant; restricted sections open only for ${esc((F.cleared || []).map(id => (G.byId(id) || { name: id }).name).join(', '))}.</li>
        <li>The FBI has Bebbit read-only, and FBI votes count double.</li></ul>`);
    }
    /* the vote and the reveal */
    html += add('reveal', 'The vote, the arrest and the reveal', `<ol>
        <li>Voting opens by itself at "${esc((STORY.phases.find(p => p.id === 'vote') || {}).name || 'The accusation')}" (or Host > Vote > Open). Phones ask: who stole the painting, and who is the killer.</li>
        <li>When voting closes, ${esc((STORY.vote.arrestBy || []).map(id => (G.byId(id) || { name: id }).name).join(', then '))} makes the arrest on their phone (the first one who is present).</li>
        <li>${k === 'main' ? 'Host > Vote: press Next to step through the slides. Read the line under each slide aloud. The big screen and every phone follow.' : 'Jacob runs the reveal from the main terminal.'}</li></ol>
      ${k === 'main' ? `<div class="bk-script">${(R.chapters || []).map((ch, j) => `<p><span class="bk-time">${j + 1}</span><b>${esc(ch.title)}${ch.big ? ' ' + esc(ch.big) : ''}</b><br><span class="bk-say">"${md(ch.say || '')}"</span></p>`).join('')}</div>` : ''}`);
    /* trouble */
    html += add('trouble', 'When something goes wrong', `<table class="bk-t">
      <tr><td><b>A phone can't sign in</b></td><td>Check the code word in the cast list (no spaces). Open ${esc(site)}gala/ in the phone's browser, not a social app.</td></tr>
      <tr><td><b>A phone dies</b></td><td>Sign in on any phone with the same code word. Everything is still there.</td></tr>
      <tr><td><b>Someone didn't come</b></td><td>Host > People > No-show. Their games pass to a backup; the vote skips them.</td></tr>
      <tr><td><b>Someone is out of line</b></td><td>Host > People > Throw out: no vote, no money. "Let back in" undoes it.</td></tr>
      <tr><td><b>Something looks broken</b></td><td>Host > Health: errors from phones and who is connected. Reloading the page fixes most things.</td></tr>
      <tr><td><b>Running late</b></td><td>Space pauses the clock; + adds 5 minutes; N moves to the next phase.</td></tr>
      <tr><td><b>A game is stuck</b></td><td>Host > Games: send a hint, add 30 seconds, or mark it solved.</td></tr></table>`);
    html += add('keys', 'Host terminal keys', `<table class="bk-t"><tr><td class="mono">Space</td><td>pause / resume (or start the night)</td></tr><tr><td class="mono">+ / -</td><td>add 5 minutes / take away 1 minute</td></tr><tr><td class="mono">N / B</td><td>next phase / back one phase (both ask first)</td></tr><tr><td class="mono">M</td><td>quick message</td></tr><tr><td class="mono">/</td><td>search the cast</td></tr><tr><td class="mono">P</td><td>hide the screen (privacy blur)</td></tr><tr><td class="mono">1-9</td><td>switch section</td></tr></table>`);

    const cover = `<section class="bk-cover"><small>The Vanishing Hour · ${esc(CONFIG.EVENT)} · ${esc(CONFIG.SEASON)}</small><h1>Host book</h1><h3>${esc(H.label)}${H.role === 'main' ? ' · ' + esc(H.name) : ''}</h3>
      <p class="bk-conf">Confidential. The whole solution is inside.</p>
      <p>${esc(CONFIG.INVITE.DATE)} · ${esc(CONFIG.INVITE.TIME)} · ${esc(CONFIG.INVITE.PLACE)}</p>
      ${groups ? `<p>You look after: <b>${esc(groups.map(groupName).join(', '))}</b> (${cast.length} players).</p>` : ''}
      <ol class="bk-toc">${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol>
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
  const secOf = (c, re) => (Dossier.sections(STORY.dossiers[c.id] || '').find(x => x.title && re.test(x.title)) || null);
  const firstLines = (sec, n) => !sec ? [] : sec.lines.map(l => l.trim()).filter(l => l && !/^\|\s*:?-{2,}/.test(l) && !/^#/.test(l)).slice(0, n);
  const clip = (s, n) => s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;
  const tableRow = l => { const cells = l.replace(/^\||\|$/g, '').split('|').map(x => x.trim()); return cells.length > 1 ? `<b>${md(cells[0])}</b>: ${md(clip(cells.slice(1).join(' · '), 110))}` : md(clip(l, 140)); };

  /* ---------- cheat cards ---------- */
  function card(c, names) {
    const goals = firstLines(secOf(c, /goal/i), 4).map(l => md(clip(l.replace(/^([-*]|\d+\.)\s+/, ''), 150)));
    const find = firstLines(secOf(c, /who to find/i), 6).filter(l => !/^\|\s*(who|person|name)\s*\|/i.test(l)).slice(0, 4).map(l => /^\|/.test(l) ? tableRow(l) : md(clip(l.replace(/^([-*]|\d+\.)\s+/, ''), 140)));
    const moments = []; STORY.phases.forEach((p, i) => (p.cues || []).forEach(q => { if (q.to && [].concat(q.to).some(t => t === c.id || t === 'g:' + c.group)) moments.push(`<b>${clockAt(start(i) + q.at)}</b> ${md(q.title || '')}`); }));
    const pw = (STORY.bebbit.powers || {})[c.id], w = typeof NW !== 'undefined' ? NW.walletOf(c) : null;
    const extras = [];
    if (pw) extras.push('Bebbit: ' + Object.entries(pw).map(([k, n]) => `${n} ${{ delete: 'removals', trace: 'traces', hack: 'disguised posts' }[k] || k}`).join(', '));
    if (w && typeof NW !== 'undefined') extras.push('NightBank: ' + money((NW.wallets()[w] || {}).start) + (NW.wallets()[w] && NW.wallets()[w].members.length > 1 || /^g:/.test(String((NW.wallets()[w] || {}).members)) ? ' (shared account)' : ''));
    const gm = (STORY.games || []).filter(g => [].concat(g.who).includes(c.id)); if (gm.length) extras.push('Your game: ' + gm.map(g => g.name).join(', '));
    /* the bribe lines from the dossier (Nov 24), shortened for the card */
    firstLines(secOf(c, /bribe/i), 2).forEach(l => extras.push(l.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').replace(/^Bribes: /, 'Bribes: ').replace(/^Paying to keep your secret: /, 'To bury your secret: ')));
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
  function dossiers() {
    const names = players();
    return who().map(c => {
      const secs = Dossier.sections(STORY.dossiers[c.id] || ''), intro = secs.shift(), world = G.door(c);
      return `<article class="bk-dos w-${world}"><header class="bk-dh"><div class="bk-stamp">${esc((Dossier.STAMP || {})[world] || 'PRIVATE & CONFIDENTIAL')}</div><small>Dossier · for ${esc(c.name)} only${names[c.id] ? ' · ' + esc(names[c.id]) : ''}</small><h2>${esc(c.name)}</h2><p>${esc(c.role)} · ${esc(groupName(c.group))} · code word <span class="mono">${esc(c.code)}</span></p>${intro && intro.lines.join('').trim() ? intro.html : ''}</header>
        ${secs.filter(x => x.title).map(x => `<section class="bk-ds ${Dossier.KIND(x.title)}"><h3>${Dossier.inline(x.title)}</h3>${x.html}</section>`).join('')}
        <footer>Never show this file to anyone. Tell people what you choose, in your own words.</footer></article>`;
    }).join('') || '<p>No one to print.</p>';
  }

  /* ---------- the page ---------- */
  function draw() {
    const H = host.role === 'main' ? null : (hostOf(host.role).groups || null);
    const groupsList = Object.keys(STORY.groups).filter(g => !H || H.includes(g));
    const people = ['cards', 'dossiers'].includes(kind);
    const bar = `<div class="bk-bar"><b>Books</b>${allowedKinds.map(([k, t]) => `<button data-k="${k}" aria-pressed="${kind === k}">${esc(t)}</button>`).join('')}
      ${people ? `<select data-only><option value="all">Everyone (${STORY.characters.filter(c => !H || H.includes(c.group)).length})</option>${groupsList.map(g => `<option value="${g}" ${only === g ? 'selected' : ''}>${esc(groupName(g))}</option>`).join('')}<optgroup label="One person">${STORY.characters.filter(c => !H || H.includes(c.group)).sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}" ${only === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup></select>` : ''}
      <a href="host.html">Host terminal</a><button class="go" data-print>Print or save as PDF</button></div>`;
    const body = kind === 'cards' ? cards() : kind === 'dossiers' ? dossiers() : hostBook(kind);
    $('#root').innerHTML = bar + `<div class="bk-doc k-${kind}">${body}</div>`;
    document.title = (KINDS.find(x => x[0] === kind) || [0, 'Books'])[1] + ' · The Vanishing Hour';
  }
  document.addEventListener('click', e => {
    const k = e.target.closest('[data-k]'); if (k) { kind = k.dataset.k; only = 'all'; history.replaceState(null, '', '?k=' + kind); draw(); window.scrollTo(0, 0); return; }
    if (e.target.closest('[data-print]')) window.print();
  });
  document.addEventListener('change', e => { const s = e.target.closest('[data-only]'); if (s) { only = s.value; history.replaceState(null, '', '?k=' + kind + (only !== 'all' ? '&only=' + only : '')); draw(); } });
  DB.loaded().then(draw);
})();
