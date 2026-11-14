/* =====================================================================
   THE VANISHING HOUR — the other print material. Host only.
     posters.html   posters for the walls and signs for the rooms (letter, portrait;
                    they scale up cleanly if a print shop blows them up to 11x17 or 18x24)
     badges.html    a name badge for every character (4 x 3 inches, six to a sheet,
                    fits a standard badge holder), plus host and blank badges
   Badges show each character's public cover only: the crew wear staff badges,
   Vivienne and Blair wear guest badges. If a character has been cast from the
   RSVPs, the player's name prints small on the badge, so badges are easy to hand out.
   ===================================================================== */
(function () {
  const PAGE = document.body.dataset.page, root = $('#root');
  if (!Session.lastHost()) { root.innerHTML = `<div class="pp-lock"><b>${esc(CONFIG.TITLE)}</b><p>This page is for the host. Sign in at the <a href="host.html">host terminal</a> first, then come back.</p></div>`; return; }
  const I = CONFIG.INVITE || {};
  const base = location.href.replace(/[^/]*([?#].*)?$/, '');
  const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
  const qr = url => {
    if (typeof qrcode === 'undefined') return '<div class="pp-noqr">QR needs internet</div>';
    const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  };

  /* ---------- little drawings ---------- */
  const hourglass = `<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M8 3h24M8 49h24" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M11 5c0 11 7 15 9 21-2 6-9 10-9 21h18c0-11-7-15-9-21 2-6 9-10 9-21z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15 43c1-5 4-7 5-9 1 2 4 4 5 9z" fill="currentColor"/><path d="M14 11h12c-1 3-4 6-6 8-2-2-5-5-6-8z" fill="currentColor" opacity=".55"/></svg>`;
  const star = `<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="22" cy="22" r="16" fill="none" stroke="currentColor" stroke-width=".7" stroke-dasharray="1.5 2"/><path d="M22 10l2.9 8.4h8.9l-7.2 5.2 2.8 8.4-7.4-5.2-7.4 5.2 2.8-8.4-7.2-5.2h8.9z" fill="currentColor"/></svg>`;
  function diamond() {
    const P = (r, n, off) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI + off; return [100 + r * Math.cos(a), 100 + r * Math.sin(a)]; });
    const outer = P(92, 16, -Math.PI / 2), table = P(46, 8, -Math.PI / 2 + Math.PI / 8), star8 = P(70, 8, -Math.PI / 2);
    const pt = p => p[0].toFixed(1) + ',' + p[1].toFixed(1);
    let facets = '';
    for (let i = 0; i < 16; i++) { const t = table[Math.floor(((i + 1) % 16) / 2) % 8], s = star8[Math.round(i / 2) % 8]; facets += `<polygon points="${pt(outer[i])} ${pt(outer[(i + 1) % 16])} ${pt(s)}" fill="${i % 2 ? '#cfe2f7' : '#8fb4dc'}" opacity="${(0.55 + (i % 4) * 0.12).toFixed(2)}"/>`; void t; }
    for (let i = 0; i < 8; i++) facets += `<polygon points="${pt(star8[i])} ${pt(table[i])} ${pt(table[(i + 7) % 8])}" fill="${i % 2 ? '#e9f3ff' : '#a9c8ea'}" opacity=".9"/><polygon points="${pt(star8[i])} ${pt(table[i])} ${pt(star8[(i + 1) % 8])}" fill="${i % 2 ? '#b8d3f0' : '#f4f9ff'}" opacity=".85"/>`;
    return `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="dg" cx="38%" cy="32%"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#bcd6f2"/><stop offset="1" stop-color="#6d93c2"/></radialGradient></defs>
      <polygon points="${outer.map(pt).join(' ')}" fill="url(#dg)"/>${facets}<polygon points="${table.map(pt).join(' ')}" fill="#f7fbff" opacity=".75" stroke="#fff" stroke-width=".6"/>
      <g stroke="#fff" stroke-width=".5" opacity=".7" fill="none"><polygon points="${outer.map(pt).join(' ')}"/>${table.map((p, i) => `<line x1="${pt(p).split(',')[0]}" y1="${pt(p).split(',')[1]}" x2="${pt(star8[i]).split(',')[0]}" y2="${pt(star8[i]).split(',')[1]}"/>`).join('')}</g>
      <g fill="#fff"><path d="M150 40l2 8 8 2-8 2-2 8-2-8-8-2 8-2z"/><path d="M48 150l1.4 5.6 5.6 1.4-5.6 1.4-1.4 5.6-1.4-5.6-5.6-1.4 5.6-1.4z" opacity=".8"/><path d="M128 78l1 4 4 1-4 1-1 4-1-4-4-1 4-1z" opacity=".9"/></g></svg>`;
  }

  /* ---------- posters and signs ---------- */
  const POSTERS = [
    { id: 'gala', group: 'Posters', title: 'The gala poster', note: 'For the entrance and the hallways.', html: () => `
      <div class="pp-gala"><div class="pg-rule"></div>
        <small class="pg-pre">The Ashgrove Collection presents</small>
        <div class="pg-frame"><img alt="" src="${Art.uri(Art.harbor(false))}"></div>
        <h2>${esc(CONFIG.EVENT)}</h2>
        <p class="pg-sub">An evening with <i>${esc(CONFIG.TITLE)}</i> and the Winter Star</p>
        <div class="pg-orn">${hourglass}</div>
        <p class="pg-when">${esc(CONFIG.SEASON)} · ${esc((I.TIME || 'Doors at 7:00 PM').split(' · ')[0])}</p>
        <p class="pg-where">${esc(I.PLACE || '')} · ${esc(I.DRESS || '')}</p>
        <small class="pg-foot">One night only</small></div>` },
    { id: 'star', group: 'Posters', title: 'The Winter Star', note: 'Beside the diamond\'s case.', html: () => `
      <div class="pp-star"><small class="ps-pre">On view tonight</small><div class="ps-gem">${diamond()}</div>
        <h2>The Winter Star</h2><p class="ps-sub">The third-largest diamond in the country</p>
        <div class="ps-line"></div>
        <p class="ps-lent">On loan from the collection of<br><b>Dominique Saint-Clair</b><br>Geneva and New York</p>
        <p class="ps-fine">Please do not touch the case. Protected tonight by the FBI Art Crime Team.</p></div>` },
    { id: 'labels', group: 'Posters', title: 'Wall labels', note: 'Cut along the lines. One beside the painting, one beside the diamond.', html: () => `
      <div class="pp-labels">${[
        ['Henri Valcourt', 'French, 19th century', 'The Vanishing Hour, 1874', 'Oil on canvas', 'A French harbor at dusk, painted in the last light of a single evening. The star of the Ashgrove Collection.', 'Lent by Victor J. Ashgrove'],
        ['The Winter Star', 'Diamond', 'Cut stone, platinum setting', '', 'The third-largest diamond in the country, shown tonight under the protection of the FBI Art Crime Team.', 'Lent by Dominique Saint-Clair']
      ].map(l => `<div class="pl-l"><b>${esc(l[0])}</b><small>${esc(l[1])}</small><i>${esc(l[2])}</i>${l[3] ? `<span>${esc(l[3])}</span>` : ''}<p>${esc(l[4])}</p><em>${esc(l[5])}</em></div>`).join('')}</div>` },
    { id: 'bebbit', group: 'Posters', title: 'Join Bebbit', note: 'Near the bar and the photo spot. The QR opens the Bebbit door.', html: () => `
      <div class="pp-beb"><div class="pb-logo">b</div><h2>b/thegala</h2><p class="pb-sub">The official feed of tonight's ${esc(CONFIG.EVENT)}</p>
        <div class="pb-qr">${qr(base + 'bebbit/')}</div><p class="pb-scan">Scan with your phone's camera</p>
        <p class="pb-rules">Post your photos. Tag your friends.<br>Be nice. Mostly.</p></div>` },
    { id: 'fbi', group: 'Signs', title: 'FBI command post', note: 'On the FBI\'s room or table.', html: () => `
      <div class="pp-fbi"><div class="pf-strip">Restricted area · Law enforcement only</div><div class="pf-emb">${star}</div><h2>FBI</h2><p class="pf-k">Art Crime Team</p>
        <div class="pf-box"><b>Command post</b><span>Authorized personnel only</span></div><p class="pf-case">Case ${esc(STORY.fbi.caseNo)}</p></div>` },
    { id: 'staff', group: 'Signs', title: 'Staff only', note: 'At the door to the vault stairs.', html: () => `
      <div class="pp-staff"><div class="pst-bar"></div><p class="pst-k">Museum security</p><h2>Staff only</h2><p class="pst-sub">beyond this point</p><div class="pst-arrow">Vault stairs · East hall</div><p class="pst-fine">Guests, please return to the main hall. All doors are monitored.</p></div>` },
    { id: 'casino', group: 'Signs', title: 'The casino', note: 'At the casino table, if a co-host deals; otherwise near the bar.', html: () => `
      <div class="pp-cas"><div class="pc-in"><p class="pc-k">The Saint-Clair Foundation</p><h2>Casino</h2><div class="pc-suits">♠ ♥ ♦ ♣</div><p class="pc-games">Roulette · Blackjack · Lucky dice</p><p class="pc-how">Play on your phone in NightBank.<br>The house's winnings go to the Saint-Clair Foundation.</p><p class="pc-fine">The house always wins in the end. Play responsibly.</p></div></div>` },
    { id: 'lockdown', group: 'Signs', title: 'Lockdown notice', note: 'A prop: the FBI or Lane tapes it to the doors when the building locks down (Act II).', html: () => `
      <div class="pp-lock2"><div class="pl2-top"><span>Notice</span><span>Case ${esc(STORY.fbi.caseNo)}</span></div><h2>Lockdown</h2>
        <p class="pl2-big">No one may leave this building until further notice.</p><p class="pl2-txt">By order of the Federal Bureau of Investigation. Remain in the public rooms. Anyone who tries to leave will be detained and questioned.</p>
        <div class="pl2-sig"><span class="pl2-hand">D. Ward</span><small>Special Agent in Charge</small></div></div>` }
  ];

  /* ---------- badges ---------- */
  const cover = c => (c.group === 'crew' || c.group === 'thief') ? (c.id === 'blair' || c.id === 'vivienne' ? 'guest' : 'staff') : c.group;
  const look = c => c.id === 'parker' ? 'press' : cover(c);
  const band = c => { const r = c.role.toLowerCase(); return /guard|security/.test(r) ? ['Security', 'sec'] : /cater|driver/.test(r) ? ['Catering', 'cat'] : /bartend/.test(r) ? ['Bar', 'bar'] : /event/.test(r) ? ['Events', 'evt'] : /handler/.test(r) ? ['Collections', 'col'] : /tech/.test(r) ? ['Artist team', 'art'] : ['Staff', 'stf']; };
  /* who plays whom, from the host's RSVP casting */
  function players() {
    const out = {}; Object.values(DB.get().rsvp || {}).forEach(r => { if (r.archived) return; if (r.cast) out[r.cast] = `${r.first || ''} ${r.last || ''}`.trim(); if (r.plus && r.plus.cast) out[r.plus.cast] = `${r.plus.first || ''} ${r.plus.last || ''}`.trim(); }); return out;
  }
  function badge(c, who) {
    const kind = c ? look(c) : who.kind, name = c ? c.name : '', role = c ? c.role : '', by = c && who && who.player ? `<span class="bd-by">Played by ${esc(who.player)}</span>` : '';
    const slot = '<i class="bd-slot"></i>', blankName = '<span class="bd-blank"></span>';
    /* long names shrink to fit on one line (k = how wide that badge's lettering runs) */
    const fit = (base, k) => name ? `style="font-size:${Math.min(base, 84 / (name.length * k)).toFixed(2)}cqw"` : '';
    if (kind === 'fbi') {
      const parts = name.split(' '), last = parts.slice(1).join(' ');
      return `<div class="bd bd-fbi">${slot}<div class="bd-in"><div class="bd-fh">${star}<div><b>FBI</b><small>Art Crime Team</small></div></div><b class="bd-name" ${fit(10.5, .62)}>${c ? `<span>${esc(last.toUpperCase())},</span> ${esc(parts[0])}` : blankName}</b><span class="bd-role">${esc(role)}</span><div class="bd-band">Case ${esc(STORY.fbi.caseNo)} · Protection detail</div>${by}</div></div>`;
    }
    if (kind === 'staff') {
      const [label, k] = c ? band(c) : ['Staff', 'stf'];
      return `<div class="bd bd-staff bd-${k}">${slot}<div class="bd-in"><div class="bd-sh">${hourglass}<small>${esc(CONFIG.EVENT)}</small></div><b class="bd-name" ${fit(11.5, .56)}>${c ? esc(name) : blankName}</b><span class="bd-role">${esc(role)}</span><div class="bd-band">${esc(label)}</div>${by}</div></div>`;
    }
    if (kind === 'press') return `<div class="bd bd-press">${slot}<div class="bd-in"><div class="bd-sh">${hourglass}<small>${esc(CONFIG.EVENT)}</small></div><b class="bd-name" ${fit(11.5, .56)}>${esc(name)}</b><span class="bd-role">${esc(role)}</span><div class="bd-band">Press</div>${by}</div></div>`;
    if (kind === 'host') return `<div class="bd bd-host">${slot}<div class="bd-in"><div class="bd-gh">${hourglass}</div><small class="bd-ev">${esc(CONFIG.EVENT)}</small><b class="bd-name">Host</b><span class="bd-blank"></span><div class="bd-band">Ask me anything</div></div></div>`;
    return `<div class="bd bd-guest">${slot}<div class="bd-in"><div class="bd-gh">${hourglass}</div><small class="bd-ev">${esc(CONFIG.EVENT)}</small><b class="bd-name" ${fit(12.5, .47)}>${c ? esc(name) : blankName}</b><span class="bd-role">${esc(role)}</span><div class="bd-band">Guest</div>${by}</div></div>`;
  }
  function badgeList() {
    const P = players(), order = { fbi: 0, staff: 1, press: 2, guest: 3 };
    const cast = STORY.characters.slice().sort((a, b) => order[look(a)] - order[look(b)] || a.name.localeCompare(b.name)).map(c => badge(c, { player: P[c.id] }));
    const extra = [badge(null, { kind: 'host' }), badge(null, { kind: 'host' }), badge(null, { kind: 'host' }), badge(null, { kind: 'guest' }), badge(null, { kind: 'staff' }), badge(null, { kind: 'guest' })];
    return { cast, extra, cast_n: Object.keys(P).length };
  }

  /* ---------- the page ---------- */
  const pick = { Posters: true, Signs: true, cast: true, extra: true };
  function draw() {
    if (PAGE === 'badges') {
      const B = badgeList(), list = [].concat(pick.cast ? B.cast : [], pick.extra ? B.extra : []), sheets = [];
      for (let i = 0; i < list.length; i += 6) sheets.push(list.slice(i, i + 6));
      root.innerHTML = `<div class="pp-bar"><h1>Badges<small>${STORY.characters.length} characters · 3 host · 3 blank · ${sheets.length} sheets</small></h1>
        <label><input type="checkbox" data-g="cast" ${pick.cast ? 'checked' : ''}> Characters</label><label><input type="checkbox" data-g="extra" ${pick.extra ? 'checked' : ''}> Host and blank badges</label>
        <a href="host.html">Host terminal</a><button class="go" data-act="print">Print</button></div>
        <p class="pp-note">Letter paper, portrait, "Background graphics" on, margins "None". Each badge is 4 × 3 inches and fits a standard badge holder; cut along the grey lines. Badges show public covers only: the crew wear staff badges, Vivienne and Blair wear guest badges, Parker wears press. ${B.cast_n ? `${B.cast_n} badges carry the player's name from your RSVP casting.` : 'Cast characters in the host terminal (RSVPs) and each badge also prints the player\'s name, small.'}</p>
        <div class="pp-sheets">${sheets.map(sh => `<div class="pp-sheet bd-sheet">${sh.join('')}</div>`).join('')}</div>`;
      return;
    }
    const groups = ['Posters', 'Signs'];
    root.innerHTML = `<div class="pp-bar"><h1>Posters and signs<small>${POSTERS.length} pages · letter, portrait</small></h1>
      ${groups.map(g => `<label><input type="checkbox" data-g="${g}" ${pick[g] ? 'checked' : ''}> ${g}</label>`).join('')}
      <a href="host.html">Host terminal</a><button class="go" data-act="print">Print</button></div>
      <p class="pp-note">Letter paper, portrait, "Background graphics" on, margins "None". Every page also scales cleanly to a print shop's 11 × 17 or 18 × 24.${local ? ' <b>The Bebbit QR code points at this computer, so print that poster again once the site is online.</b>' : ''}</p>
      ${groups.filter(g => pick[g]).map(g => `<section class="pp-sec"><h2>${g}</h2><div class="pp-grid">${POSTERS.filter(p => p.group === g).map(p => `<div class="pp-item"><article class="pp-page pp-${p.id}-page">${p.html()}</article><small class="who">${esc(p.title)} · ${esc(p.note)}</small></div>`).join('')}</div></section>`).join('')}`;
  }
  document.addEventListener('change', e => { const g = e.target.dataset.g; if (g) { pick[g] = e.target.checked; draw(); } });
  document.addEventListener('click', e => { if (e.target.closest('[data-act="print"]')) window.print(); });
  draw();
})();
