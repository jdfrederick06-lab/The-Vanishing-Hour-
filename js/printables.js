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
  /* oddities (Nov 26): tiny fine print at the bottom of some posters. Jokes only, so they live here in the public code */
  const FINE = { gala: 'The coat check is not responsible for lost coats. Cliff, this means you.', bebbit: 'By scanning this code you agree that Bebbit owns your photos, your soul and your crab cake opinions. (Drew wrote this himself at 3 AM.)', casino: 'The house always wins. The house is a charity. Please do the math, then do not tell anyone.' };
  const fine = id => FINE[id] ? `<p class="pp-fine">${esc(FINE[id])}</p>` : '';
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
      <div class="pp-gala"><i class="pg-c tl"></i><i class="pg-c tr"></i><i class="pg-c bl"></i><i class="pg-c br"></i>
        <small class="pg-pre">The Ashgrove Collection presents</small>
        <div class="pg-spot" aria-hidden="true"></div><div class="pg-frame"><img alt="" src="${Art.uri(Art.harbor(false))}"></div><div class="pg-plaque">The Ashgrove Collection · Harbor Hill</div>
        <h2 class="foil">${esc(CONFIG.EVENT)}</h2>
        <p class="pg-sub">An evening with <i>${esc(CONFIG.TITLE)}</i> and the Winter Star</p>
        <div class="pg-orn">${hourglass}</div>
        <p class="pg-when">${esc(CONFIG.SEASON)} · ${esc((I.TIME || 'Doors at 7:00 PM').split(' · ')[0])}</p>
        <p class="pg-where">${esc(I.PLACE || '')} · ${esc(I.DRESS || '')}</p>
        <small class="pg-foot">One night only</small></div>` },
    { id: 'star', group: 'Posters', title: 'The Winter Star', note: 'Beside the diamond\'s case.', html: () => `
      <div class="pp-star"><div class="ps-spot" aria-hidden="true"></div><small class="ps-pre">On view tonight</small><div class="ps-gem">${diamond()}<i class="ps-plinth" aria-hidden="true"></i></div>
        <h2 class="foil-ice">The Winter Star</h2><p class="ps-sub">The third-largest diamond in the country</p>
        <div class="ps-line"></div>
        <p class="ps-lent">On loan from the collection of<br><b>Dominique Saint-Clair</b><br>Geneva and New York</p>
        <p class="ps-fine">Please do not touch the case. Protected tonight by the FBI Art Crime Team.</p></div>` },
    { id: 'labels', group: 'Posters', title: 'Wall labels', note: 'Cut along the lines. One beside the painting, one beside the diamond.', html: () => `
      <div class="pp-labels">${[
        ['Henri Valcourt', 'French, 19th century', 'The Vanishing Hour, 1874', 'Oil on canvas', 'A French harbor at dusk, painted in the last light of a single evening. The star of the Ashgrove Collection.', 'Lent by Victor J. Ashgrove'],
        ['The Winter Star', 'Diamond', 'Cut stone, platinum setting', '', 'The third-largest diamond in the country, shown tonight under the protection of the FBI Art Crime Team.', 'Lent by Dominique Saint-Clair']
      ].map((l, k) => `<div class="pl-l"><div class="pl-h"><span>The Ashgrove Collection</span><span>No. 2027.${k + 1}</span></div><b>${esc(l[0])}</b><small>${esc(l[1])}</small><i>${esc(l[2])}</i>${l[3] ? `<span>${esc(l[3])}</span>` : ''}<p>${esc(l[4])}</p><em>${esc(l[5])}</em></div>`).join('')}</div>` },
    { id: 'bebbit', group: 'Posters', title: 'Join Bebbit', note: 'Near the bar and the photo spot. The QR opens the Bebbit door.', html: () => `
      <div class="pp-beb"><div class="pb-logo">b</div><h2>b/thegala</h2><p class="pb-sub">The official feed of tonight's ${esc(CONFIG.EVENT)}</p>
        <div class="pb-post"><span class="pb-av">b</span><div><b>thegala_mod <small>· pinned</small></b><p>Welcome to b/thegala. Post your photos, tag your friends, and be nice. Mostly.</p></div></div><div class="pb-qr">${qr(base + 'bebbit/')}</div><p class="pb-scan">Scan with your phone's camera</p>
        <p class="pb-rules">Photos, gossip and the occasional scandal.<br>Only on Bebbit.</p></div>` },
    { id: 'fbi', group: 'Signs', title: 'FBI command post', note: 'On the FBI\'s room or table.', html: () => `
      <div class="pp-fbi"><div class="pf-strip">Restricted area · Law enforcement only</div><div class="pf-emb">${star}</div><h2>FBI</h2><p class="pf-k">Art Crime Team</p>
        <div class="pf-box"><b>Command post</b><span>Authorized personnel only</span></div><p class="pf-case">Case ${esc(STORY.fbi.caseNo)}</p></div>` },
    { id: 'staff', group: 'Signs', title: 'Staff only', note: 'At the door to the vault stairs.', html: () => `
      <div class="pp-staff"><div class="pst-bar"></div><p class="pst-k">Museum security</p><h2>Staff only</h2><p class="pst-sub">beyond this point</p><div class="pst-arrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>Vault stairs · East hall</div><p class="pst-fine">Guests, please return to the main hall. All doors are monitored.</p></div>` },
    { id: 'casino', group: 'Signs', title: 'The casino', note: 'At the casino table, if a co-host deals; otherwise near the bar.', html: () => `
      <div class="pp-cas"><div class="pc-wheel" aria-hidden="true"></div><div class="pc-in"><p class="pc-k">The Saint-Clair Foundation</p><h2>Casino</h2><div class="pc-chips" aria-hidden="true">${[['#b3201f', '5'], ['#111', '25'], ['#1d4f91', '100'], ['#c9a24f', '500']].map(([c, n]) => `<span class="pc-chip" style="--c:${c}"><b>${n}</b></span>`).join('')}</div><div class="pc-suits">♠ ♥ ♦ ♣</div><p class="pc-games">Roulette · Blackjack · Lucky dice</p><p class="pc-how">Play on your phone: open your bank tab and tap Casino.<br>The house's winnings go to the Saint-Clair Foundation.</p><p class="pc-fine">The house always wins in the end. Play responsibly.</p></div></div>` },
    { id: 'lockdown', group: 'Signs', title: 'Lockdown notice', note: 'A prop: the FBI or Lane tapes it to the doors when the building locks down (Act II).', html: () => `
      <div class="pp-lock2"><div class="pl2-tape a" aria-hidden="true">${'FBI · Do not cross · '.repeat(8)}</div><div class="pl2-tape b" aria-hidden="true">${'FBI · Do not cross · '.repeat(8)}</div><div class="pl2-top"><span>Notice</span><span>Case ${esc(STORY.fbi.caseNo)}</span></div><h2>Lockdown</h2>
        <p class="pl2-big">No one may leave this building until further notice.</p><p class="pl2-txt">By order of the Federal Bureau of Investigation. Remain in the public rooms. Anyone who tries to leave will be detained and questioned.</p>
        <div class="pl2-sig"><span class="pl2-hand">D. Ward</span><small>Special Agent in Charge</small></div></div>` }
  ];

  /* ---------- more drawings for the posters ---------- */
  const spark = (x, y, s, o) => `<i class="p2-spark" style="left:${x}cqw;top:${y}cqw;width:${s}cqw;height:${s}cqw;opacity:${o || 1}"></i>`;
  const ICONS = {
    statement: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
    evidence: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><circle cx="11.5" cy="13" r="3"/><path d="M13.7 15.2 16 17.5"/></svg>',
    warrant: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18H6z"/><path d="M9 8h6M9 11h6M9 14h3"/><circle cx="15" cy="17" r="1.6"/></svg>',
    wheel: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/></svg>',
    cards: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="11" height="15" rx="1.5" transform="rotate(-8 8 12)"/><rect x="10" y="4" width="11" height="15" rx="1.5" transform="rotate(8 15 11)"/></svg>',
    dice: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="12" cy="12" r="1.2"/></svg>'
  };
  /* an American roulette wheel, 38 pockets in the real order */
  function wheel() {
    const nums = ['0', '28', '9', '26', '30', '11', '7', '20', '32', '17', '5', '22', '34', '15', '3', '24', '36', '13', '1', '00', '27', '10', '25', '29', '12', '8', '19', '31', '18', '6', '21', '33', '16', '4', '23', '35', '14', '2'];
    const red = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    const p = (r, a) => [(100 + r * Math.sin(a)).toFixed(2), (100 - r * Math.cos(a)).toFixed(2)];
    const step = 2 * Math.PI / nums.length;
    let wedges = '', text = '';
    nums.forEach((n, i) => {
      const a0 = i * step, a1 = a0 + step, [x1, y1] = p(96, a0), [x2, y2] = p(96, a1), [x3, y3] = p(70, a1), [x4, y4] = p(70, a0);
      const col = n === '0' || n === '00' ? '#0e7a45' : red.has(+n) ? '#b3201f' : '#141414';
      wedges += `<path d="M${x1} ${y1}A96 96 0 0 1 ${x2} ${y2}L${x3} ${y3}A70 70 0 0 0 ${x4} ${y4}Z" fill="${col}" stroke="#d9b45a" stroke-width=".5"/>`;
      const [tx, ty] = p(87, a0 + step / 2);
      text += `<text x="${tx}" y="${ty}" transform="rotate(${((a0 + step / 2) * 180 / Math.PI).toFixed(1)} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" font-family="Inter, sans-serif" font-weight="700" font-size="6.4" fill="#f6eedb">${n}</text>`;
    });
    let frets = ''; for (let i = 0; i < 38; i++) { const [x1, y1] = p(70, i * step), [x2, y2] = p(58, i * step); frets += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d9b45a" stroke-width=".6"/>`; }
    return `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="wood" cx="50%" cy="45%"><stop offset="0" stop-color="#7a4a22"/><stop offset="1" stop-color="#3a200c"/></radialGradient><radialGradient id="cone" cx="45%" cy="40%"><stop offset="0" stop-color="#f7e3a1"/><stop offset="1" stop-color="#8a6420"/></radialGradient></defs>
      <circle cx="100" cy="100" r="99.5" fill="url(#wood)" stroke="#d9b45a" stroke-width="1"/>${wedges}${text}
      <circle cx="100" cy="100" r="70" fill="#2a170a" stroke="#d9b45a" stroke-width=".8"/>${frets}<circle cx="100" cy="100" r="58" fill="url(#wood)" stroke="#d9b45a" stroke-width=".8"/>
      <circle cx="100" cy="100" r="22" fill="url(#cone)"/><g stroke="#f3dc93" stroke-width="3" stroke-linecap="round"><path d="M100 72v56M72 100h56"/></g><circle cx="100" cy="100" r="7" fill="#f3dc93" stroke="#8a6420"/>
      <circle cx="${p(64, .9)[0]}" cy="${p(64, .9)[1]}" r="3.2" fill="#fff" stroke="#bbb" stroke-width=".5"/></svg>`;
  }
  const dressParts = (I.DRESS || 'Gala attire').split(/,\s*/);
  const chatter = (((STORY.bebbit || {}).chatter) || []).filter(c => /crab|champagne|lighting/i.test(c.text)).slice(0, 2);
  const acct = id => (((STORY.bebbit || {}).accounts) || {})[id] || { name: id };

  /* ---------- posters and signs, the new versions ---------- */
  /* the upgraded versions (Nov 14); both versions stay, and the host picks which to print */
  const POSTERS_NEW = [
    { id: 'gala', group: 'Posters', title: 'The gala poster', note: 'For the entrance and the hallways.', html: () => `
      <div class="p2-gala"><div class="g2-rays" aria-hidden="true"></div><div class="g2-border" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <header class="g2-top"><span>The Ashgrove Collection</span><b>✦</b><span>presents</span></header>
        <div class="g2-art"><div class="g2-light" aria-hidden="true"></div><div class="g2-frame"><div class="g2-canvas"><img alt="" src="${Art.uri(Art.harbor(false))}"></div></div><div class="g2-plaque">The Ashgrove Collection · Harbor Hill</div></div>
        <h2 class="g2-title"><small>The</small><span>Ashgrove Gala</span></h2>
        <p class="g2-sub">An evening with <i>${esc(CONFIG.TITLE)}</i> and the Winter Star</p>
        <div class="g2-info"><div><small>When</small><b>${esc(CONFIG.SEASON)}</b><span>${esc((I.TIME || 'Doors at 7:00 PM').split(' · ')[0])}</span></div><div><small>Where</small><b>${esc(I.PLACE || 'To be announced')}</b><span>Harbor Hill</span></div><div><small>Dress</small><b>${esc(dressParts[0])}</b><span>${esc(dressParts.slice(1).join(', ') || '')}</span></div></div>
        <footer class="g2-foot"><i></i>One night only<i></i></footer></div>` },
    { id: 'star', group: 'Posters', title: 'The Winter Star', note: 'Beside the diamond\'s case.', html: () => `
      <div class="p2-star"><div class="s2-beam" aria-hidden="true"></div>${spark(16, 22, 3, .7)}${spark(80, 30, 4)}${spark(70, 64, 2.4, .8)}${spark(24, 58, 2, .6)}${spark(86, 88, 2.6, .5)}${spark(10, 96, 3, .5)}
        <header class="s2-top"><span>On view tonight</span><span>One night only</span></header>
        <div class="s2-case"><i class="s2-glass" aria-hidden="true"></i><div class="s2-gem">${diamond()}</div><div class="s2-cushion" aria-hidden="true"></div></div>
        <h2 class="foil-ice s2-title">The Winter Star</h2>
        <p class="s2-sub">The third-largest diamond in the country</p>
        <div class="s2-facts"><div><small>Lent by</small><b>Dominique Saint-Clair</b></div><div><small>From</small><b>Geneva &amp; New York</b></div><div><small>Guarded by</small><b>The FBI Art Crime Team</b></div></div>
        <p class="s2-fine">Please do not touch the case</p></div>` },
    { id: 'labels', group: 'Posters', title: 'Wall labels', note: 'Cut along the dashed lines. One beside the painting, one beside the diamond.', html: () => `
      <div class="p2-labels">${[
        { thumb: `<img alt="" src="${Art.uri(Art.harbor(false))}">`, no: '2027.1', h: 'Henri Valcourt', d: 'French, 19th century', t: 'The Vanishing Hour', y: '1874', m: 'Oil on canvas', p: 'A French harbor at dusk, painted in the last light of a single evening. The star of the Ashgrove Collection.', c: 'Lent by Victor J. Ashgrove' },
        { thumb: diamond(), no: '2027.2', h: 'The Winter Star', d: 'Diamond', t: 'Cut stone, platinum setting', y: '', m: '', p: 'The third-largest diamond in the country, shown tonight under the protection of the FBI Art Crime Team.', c: 'Lent by Dominique Saint-Clair' }
      ].map(l => `<div class="l2"><span class="l2-cut" aria-hidden="true">✂</span><div class="l2-th">${l.thumb}</div><div class="l2-tx"><div class="l2-h"><span>The Ashgrove Collection</span><span>No. ${l.no}</span></div><b>${esc(l.h)}</b><small>${esc(l.d)}</small><i>${esc(l.t)}${l.y ? `, ${esc(l.y)}` : ''}</i>${l.m ? `<span>${esc(l.m)}</span>` : ''}<p>${esc(l.p)}</p><em>${esc(l.c)}</em></div></div>`).join('')}</div>` },
    { id: 'bebbit', group: 'Posters', title: 'Join Bebbit', note: 'Near the bar and the photo spot. The QR opens the Bebbit door.', html: () => `
      <div class="p2-beb"><i class="b2-blob a" aria-hidden="true"></i><i class="b2-blob b" aria-hidden="true"></i>
        <header class="b2-top"><span class="b2-logo">b</span><div><h2>b/thegala</h2><p>The official feed of tonight's ${esc(CONFIG.EVENT)}</p></div></header>
        <div class="b2-stage"><div class="b2-phone"><div class="b2-notch"></div><div class="b2-screen">
          <div class="b2-bar"><b>bebbit</b><span>b/thegala</span></div>
          <div class="b2-post pin"><span class="b2-av" style="--h:262">b</span><div><b>thegala_mod <small>· pinned</small></b><p>Welcome to b/thegala. Post your photos, tag your friends, and be nice. Mostly.</p></div></div>
          <div class="b2-post"><span class="b2-av" style="--h:20">C</span><div><b>${esc(acct('cityscene').name)}</b><div class="b2-photo"><span>✦</span></div><p class="b2-meta">♥ 128 · 24 comments</p></div></div>
          ${chatter.map((c, k) => `<div class="b2-post"><span class="b2-av" style="--h:${120 + k * 80}">${esc(acct(c.by).name[0].toUpperCase())}</span><div><b>${esc(acct(c.by).name)}</b><p>${esc(c.text)}</p></div></div>`).join('')}
        </div></div>
        <div class="b2-qr"><div>${qr(base + 'bebbit/')}</div><b>Scan to join</b><small>with your phone's camera</small></div>
        <span class="b2-tag t1">#AshgroveGala</span><span class="b2-tag t2">#WinterStar</span></div>
        <p class="b2-foot">Photos, gossip and the occasional scandal. Only on Bebbit.</p></div>` },
    { id: 'fbi', group: 'Signs', title: 'FBI command post', note: 'On the FBI\'s room or table.', html: () => `
      <div class="p2-fbi"><div class="f2-strip">Restricted area · Law enforcement only</div>
        <div class="f2-emb">${star}</div><h2>FBI</h2><p class="f2-k">Art Crime Team · Field command post</p>
        <div class="f2-box"><small>This room is a</small><b>Command post</b><span>Authorized personnel only</span></div>
        <div class="f2-list">${[['statement', 'Statements', 'Give yours to an agent'], ['evidence', 'Evidence', 'Hand in what you find'], ['warrant', 'Warrants', 'Issued by the agent in charge']].map(([ic, b, s]) => `<div><span class="f2-ic">${ICONS[ic]}</span><b>${b}</b><small>${s}</small></div>`).join('')}</div>
        <div class="f2-foot"><span>Case ${esc(STORY.fbi.caseNo)}</span><span>Harbor Hill field office</span></div><div class="f2-hazard" aria-hidden="true"></div></div>` },
    { id: 'staff', group: 'Signs', title: 'Staff only', note: 'At the door to the vault stairs.', html: () => `
      <div class="p2-staff"><div class="t2-panel"><div class="t2-no" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="#d62b1f" stroke-width="10"/><path d="M19 19 81 81" stroke="#d62b1f" stroke-width="10"/><circle cx="50" cy="34" r="8" fill="#fff"/><path d="M38 76V52q0-8 12-8t12 8v24" fill="#fff"/></svg></div>
        <h2>Staff<br>only</h2><p>beyond this point</p></div>
        <div class="t2-low"><div class="t2-dir"><span>Vault stairs</span><span>East hall</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg></div>
          <p class="t2-fine">Guests, please return to the main hall. All doors are monitored.</p><div class="t2-sig">${hourglass}<span>Museum security · The Ashgrove Collection</span></div></div></div>` },
    { id: 'casino', group: 'Signs', title: 'The casino', note: 'At the casino table, if a co-host deals; otherwise near the bar.', html: () => `
      <div class="p2-cas"><div class="c2-wheel">${wheel()}</div><div class="c2-in"><p class="c2-k">The Saint-Clair Foundation</p><h2 class="foil">Casino</h2>
        <div class="c2-games">${[['wheel', 'Roulette'], ['cards', 'Blackjack'], ['dice', 'Lucky dice']].map(([ic, n]) => `<div><span>${ICONS[ic]}</span><b>${n}</b></div>`).join('')}</div>
        <div class="c2-chips" aria-hidden="true">${[['#b3201f', '5'], ['#111', '25'], ['#1d4f91', '100'], ['#c9a24f', '500']].map(([c, n]) => `<span class="pc-chip" style="--c:${c}"><b>${n}</b></span>`).join('')}</div>
        <p class="c2-how">Play on your phone: open your bank tab and tap Casino.<br>The house's winnings go to the Saint-Clair Foundation.</p><p class="c2-fine">The house always wins in the end. Play responsibly.</p></div></div>` },
    { id: 'lockdown', group: 'Signs', title: 'Lockdown notice', note: 'A prop: the FBI or Lane tapes it to the doors when the building locks down (Act II).', html: () => `
      <div class="p2-lock"><i class="k2-mask a" aria-hidden="true"></i><i class="k2-mask b" aria-hidden="true"></i>
        <header class="k2-head"><span class="k2-emb">${star}</span><div><b>Federal Bureau of Investigation</b><span>Harbor Hill field office · Art Crime Team</span></div><span class="k2-no">Notice No. ${esc(STORY.fbi.caseNo)}-L</span></header>
        <div class="k2-rule"></div><h2>Lockdown</h2><div class="k2-rule"></div>
        <p class="k2-big">No one may leave this building until further notice.</p>
        <ul class="k2-list"><li>Remain in the public rooms.</li><li>Do not use any exit, including fire doors.</li><li>If you saw something, tell an agent now.</li></ul>
        <p class="k2-txt">Anyone who tries to leave will be detained and questioned.</p>
        <div class="k2-sig"><span class="k2-hand">D. Ward</span><small>Special Agent in Charge</small></div>
        <footer class="k2-foot">Official notice · Do not remove</footer><div class="k2-tape" aria-hidden="true">${'FBI · Do not cross · '.repeat(6)}</div></div>` }
  ];
  /* ---------- badges ---------- */
  const cover = c => (c.group === 'crew' || c.group === 'thief') ? (c.id === 'blair' || c.id === 'vivienne' ? 'guest' : 'staff') : c.group;
  const look = c => c.id === 'parker' ? 'press' : cover(c);
  const band = c => { const r = c.role.toLowerCase(); return /guard|security/.test(r) ? ['Security', 'sec'] : /cater|driver/.test(r) ? ['Catering', 'cat'] : /bartend/.test(r) ? ['Bar', 'bar'] : /event/.test(r) ? ['Events', 'evt'] : /handler/.test(r) ? ['Collections', 'col'] : /tech/.test(r) ? ['Artist team', 'art'] : ['Staff', 'stf']; };
  /* who plays whom, and their RSVP photo, from the host's RSVP casting */
  function players() {
    const out = {}, safe = p => typeof p === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p) ? p : null;
    Object.values(DB.get().rsvp || {}).forEach(r => {
      if (r.archived) return;
      if (r.cast) out[r.cast] = { name: `${r.first || ''} ${r.last || ''}`.trim(), photo: safe(r.photo) };
      if (r.plus && r.plus.cast) out[r.plus.cast] = { name: `${r.plus.first || ''} ${r.plus.last || ''}`.trim(), photo: null };
    });
    return out;
  }
  const columns = '<svg viewBox="0 0 40 34" aria-hidden="true"><path d="M2 12 20 2 38 12ZM4 14h32v2H4zM6 18h3v11H6zM13 18h3v11h-3zM24 18h3v11h-3zM31 18h3v11h-3zM3 30h34v3H3z" fill="currentColor"/></svg>';
  /* a made-up seal for the Art Crime Team (not the real FBI seal) */
  const seal = `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><path id="sealp" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0"/><radialGradient id="sealg" cx="40%" cy="35%"><stop offset="0" stop-color="#f6e2a0"/><stop offset="1" stop-color="#b08a36"/></radialGradient></defs>
    <circle cx="60" cy="60" r="58" fill="#0f2a52"/><circle cx="60" cy="60" r="55" fill="none" stroke="url(#sealg)" stroke-width="2"/><circle cx="60" cy="60" r="36" fill="none" stroke="url(#sealg)" stroke-width="1.5"/>
    <text font-family="Inter, sans-serif" font-size="8.2" font-weight="700" fill="#f0d48a"><textPath href="#sealp" textLength="276" lengthAdjust="spacing">ART CRIME TEAM · HARBOR HILL FIELD OFFICE ·</textPath></text>
    <path d="M60 33l6.3 18.3h19.3L70 62.6l6 18.4L60 69.7 44 81l6-18.4-15.6-11.3h19.3z" fill="url(#sealg)"/></svg>`;
  const silhouette = '<svg viewBox="0 0 60 72" aria-hidden="true"><rect width="60" height="72" fill="#cfd6e0"/><circle cx="30" cy="27" r="13" fill="#9aa6b6"/><path d="M6 72c2-16 12-24 24-24s22 8 24 24z" fill="#9aa6b6"/></svg>';
  /* where each department's pass lets them go */
  const ACCESS = { sec: 'All areas · Vault stairs', evt: 'Galleries · Back of house', bar: 'Bar · Kitchen', col: 'Galleries · Vault · Loading dock', cat: 'Kitchen · Service halls · Loading dock', art: 'Stage · Service halls', stf: 'Galleries · Back of house' };
  const vendor = k => k === 'cat' || k === 'art';
  const LEVEL = { sec: 3, col: 2, evt: 2, bar: 1, cat: 1, art: 1, stf: 1 };
  const COLORS = { guest: '#c9a24f', press: '#c0392b', host: '#c9a24f', sec: '#3a4f72', cat: '#b0602c', bar: '#7a2e5a', evt: '#2f7a6d', col: '#8a6a2c', art: '#4b4ba0', stf: '#2f7a6d' };

  function badge(c, who) {
    const kind = c ? look(c) : who.kind, P = (who && who.player) || null;
    const parts = c ? c.name.split(' ') : [], first = parts.slice(0, -1).join(' '), last = parts.slice(-1)[0] || '';
    const serial = c ? String([...c.id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 9000, 7) + 1000) : '';
    const fit = (s, base, w, k) => s ? `style="font-size:${Math.min(base, w / (Math.max(s.length, 4) * k)).toFixed(2)}cqw"` : '';
    /* the player's name and their character's pronouns (Nov 25) */
    const pr = c && typeof Pron !== 'undefined' ? Pron.of(c.id) : '';
    const by = (P && P.name) || pr ? `<span class="c4-by">${P && P.name ? esc(P.name) : ''}${P && P.name && pr ? ' · ' : ''}${pr ? esc(pr) : ''}</span>` : '';

    if (kind === 'fbi') return `<div class="c4 c4-fbi"><i class="f4-bg" aria-hidden="true"></i><span class="f4-wm" aria-hidden="true">${seal}</span>
      <header class="f4-h"><span class="f4-seal">${seal}</span><div><b>Federal Bureau of Investigation</b><small>Art Crime Team · Agent credential</small></div></header>
      <dl class="f4-f"><dt>Name</dt><dd class="f4-nm" ${fit(c ? last + ', ' + first : '', 7, 80, .6)}>${c ? `${esc(last.toUpperCase())}, ${esc(first)}` : '<span class="c4-line"></span>'}</dd>
        <dt>Title</dt><dd>${esc(c ? c.role : '')}</dd></dl>
      <div class="f4-sig"><span class="f4-hand">${c ? esc(c.name) : ''}</span><small>Signature of holder</small></div>
      <footer class="f4-foot"><b>${esc(c ? (c.role.toUpperCase().includes('ANALYST') ? 'Intelligence' : c.role.toUpperCase().includes('TECHNICIAN') ? 'Evidence' : 'Special agent') : 'Special agent')}</b><span>${c ? 'No. ACT-' + serial + ' · ' : ''}Case ${esc(STORY.fbi.caseNo)}</span></footer>
      <span class="f4-micro">${'ASHGROVE GALA PROP CREDENTIAL · '.repeat(6)}</span></div>`;

    if (kind === 'staff') {
      const [label, k] = c ? band(c) : ['Staff', 'stf'], isV = vendor(k), lvl = LEVEL[k] || 1;
      return `<div class="c4 c4-staff" style="--c:${COLORS[k]}"><span class="m4-wm" aria-hidden="true">${columns}</span>
        <header class="m4-h"><span class="m4-logo">${columns}</span><div><b>The Museum at Harbor Hill</b><small>${isV ? 'Approved vendor · Gala night only' : 'Staff identification'}</small></div><span class="m4-lvl">${isV ? 'Vendor' : 'Staff'}</span></header><i class="m4-rule" aria-hidden="true"></i>
        <div class="m4-tx">${c ? `<span class="m4-first">${esc(first)}</span><b class="m4-last" ${fit(last, 10, 62, .6)}>${esc(last)}</b>` : '<span class="c4-line"></span><span class="c4-line"></span>'}<span class="m4-dept">${esc(label)}${c ? ` <i>·</i> <span>${esc(c.role)}</span>` : ''}</span></div>
        <div class="m4-level"><b>${lvl}</b><small>Access<br>level</small></div>
        <div class="m4-acc">${(ACCESS[k] || '').split(' · ').map(z => `<span>${esc(z)}</span>`).join('')}</div>
        <footer class="m4-foot"><span>${isV ? 'Vendor' : 'Employee'} no. ${serial || '______'}</span><i class="m4-bars" aria-hidden="true"></i></footer>${by}</div>`;
    }    /* guests, press and hosts: the collection pass, with the painting across the top */
    const type = kind === 'press' ? 'Press' : kind === 'host' ? 'Host' : 'Guest';
    return `<div class="c4 c4-guest" style="--c:${COLORS[kind] || COLORS.guest}">
      <div class="g4-art"><img alt="" src="${HARBOR}"><span class="g4-ev"><i>${hourglass}</i>${esc(CONFIG.EVENT)}</span><b class="g4-type">${type}</b></div><i class="g4-band" aria-hidden="true"></i>
      <div class="g4-body">${kind === 'host' ? `<span class="g4-first">Ask me anything</span><b class="g4-last">Your host</b>` : c ? `<span class="g4-first">${esc(first)}</span><b class="g4-last" ${fit(last, 11, 84, .6)}>${esc(last)}</b><span class="g4-role">${esc(c.role)}</span>` : '<span class="c4-line"></span><span class="c4-line"></span>'}</div>
      <i class="g4-frame" aria-hidden="true"></i><footer class="g4-foot"><span>${esc(CONFIG.SEASON)} · ${esc(((CONFIG.INVITE || {}).TIME || 'Doors at 7:00 PM').split(' · ')[0])}</span><span>${serial ? 'No. ' + serial : 'The Ashgrove Collection'}</span></footer>${by}</div>`;
  }
  let HARBOR = '';
  function badgeList() {
    HARBOR = HARBOR || (typeof Art !== 'undefined' ? Art.uri(Art.harbor(false)) : '');
    const P = players(), order = { fbi: 0, staff: 1, press: 2, guest: 3 };
    const cast = STORY.characters.slice().sort((a, b) => order[look(a)] - order[look(b)] || a.name.localeCompare(b.name)).map(c => badge(c, { player: P[c.id] }));
    const extra = [badge(null, { kind: 'host' }), badge(null, { kind: 'host' }), badge(null, { kind: 'host' }), badge(null, { kind: 'guest' }), badge(null, { kind: 'guest' }), badge(null, { kind: 'staff' }), badge(null, { kind: 'staff' }), badge(null, { kind: 'fbi' })];
    return { cast, extra, cast_n: Object.keys(P).length };
  }

  /* ---------- the page ---------- */
  const pick = { Posters: true, Signs: true, cast: true, extra: true };
  function draw() {
    if (PAGE === 'badges') {
      const B = badgeList(), list = [].concat(pick.cast ? B.cast : [], pick.extra ? B.extra : []), sheets = [];
      for (let i = 0; i < list.length; i += 8) sheets.push(list.slice(i, i + 8));
      root.innerHTML = `<div class="pp-bar"><h1>Badges<small>${STORY.characters.length} characters · 3 host · 5 blank · ${sheets.length} sheets</small></h1>
        <label><input type="checkbox" data-g="cast" ${pick.cast ? 'checked' : ''}> Characters</label><label><input type="checkbox" data-g="extra" ${pick.extra ? 'checked' : ''}> Host and blank badges</label>
        <a href="host.html">Host terminal</a><button class="go" data-act="print">Print</button></div>
        <p class="pp-note">Each badge is 3.5 × 2.5 inches, eight to a letter sheet, for standard plastic sleeves, with a gap between badges: cut along the thin grey outlines. Letter paper, portrait, "Background graphics" on, margins "None". Guests get the collection pass, the FBI an agent credential, museum staff a staff ID (catering and the touring tech get the vendor version). Badges show public covers only: the crew look like staff, Vivienne and Blair like guests. ${B.cast_n ? `${B.cast_n} badges carry the player's name, small.` : ''}</p>
        <div class="pp-sheets">${sheets.map(sh => `<div class="pp-sheet c4-sheet"><div class="c4-grid">${sh.join('')}</div></div>`).join('')}</div>`;
      return;
    }
    /* one poster alone: posters.html?only=gala (classic) or ?only=gala&v=new */
    const q = new URLSearchParams(location.search), only = q.get('only');
    if (only) { const p = (q.get('v') === 'new' ? POSTERS_NEW : POSTERS).find(x => x.id === only); document.body.classList.add('pp-bare'); root.innerHTML = p ? `<article class="pp-page pp-${p.id}-page">${p.html()}${fine(p.id)}</article>` : ''; return; }
    /* every poster in both versions; the host ticks the ones to print (or save as a PDF) */
    const VERS = [['classic', 'Classic', POSTERS], ['new', 'New', POSTERS_NEW]];
    root.innerHTML = `<div class="pp-bar"><h1>Posters and signs<small>${POSTERS.length} posters · each in two versions · tick the ones to print</small></h1>
      <span class="pp-count" id="ppc"></span>
      <button data-pk="classic">All classic</button><button data-pk="new">All new</button><button data-pk="none">Clear</button>
      <a href="host.html">Host terminal</a><button class="go" data-act="print" id="ppgo">Print selected</button></div>
      <p class="pp-note">Tick "Print this" under each version you want, then Print selected. To make a PDF, choose "Save as PDF" as the printer. Letter paper, portrait, "Background graphics" on, margins "None". Every page also scales cleanly to a print shop's 11 × 17 or 18 × 24.${local ? ' <b>The Bebbit QR code points at this computer, so print that poster again once the site is online.</b>' : ''}</p>
      ${POSTERS.map(p => `<section class="pp-sec pp-row" data-row="${p.id}"><header><h2>${esc(p.title)}</h2><small>${esc(p.group)} · ${esc(p.note)}</small></header><div class="pp-pair">${VERS.map(([v, label, list]) => { const x = list.find(y => y.id === p.id); return x ? `<div class="pp-item" data-key="${p.id}:${v}"><div class="pp-ver"><b>${label}</b><button class="pp-pick" data-pick="${p.id}:${v}" aria-pressed="false"><i></i>Print this</button></div><article class="pp-page pp-${x.id}-page">${x.html()}${fine(x.id)}</article></div>` : ''; }).join('')}</div></section>`).join('')}`;
    sync();
  }
  /* which versions are ticked, remembered on this computer */
  let chosen = new Set();
  try { chosen = new Set(JSON.parse(localStorage.getItem('vh:posterpick') || '[]')); } catch (e) { /* private mode */ }
  function sync() {
    if (PAGE !== 'posters') return;
    $$('.pp-item[data-key]').forEach(el => { const on = chosen.has(el.dataset.key); el.classList.toggle('on', on); const b = el.querySelector('.pp-pick'); if (b) b.setAttribute('aria-pressed', on); });
    $$('.pp-row').forEach(r => r.classList.toggle('has-on', !!r.querySelector('.pp-item.on')));
    const n = $$('.pp-item.on').length, c = $('#ppc'), go = $('#ppgo');
    if (c) c.textContent = n ? `${n} page${n === 1 ? '' : 's'} selected` : 'Nothing selected yet';
    if (go) { go.disabled = !n; go.textContent = n ? `Print selected (${n})` : 'Print selected'; }
    try { localStorage.setItem('vh:posterpick', JSON.stringify([...chosen])); } catch (e) { /* private mode */ }
  }
  document.addEventListener('change', e => { const g = e.target.dataset.g; if (g) { pick[g] = e.target.checked; draw(); } });
  document.addEventListener('click', e => {
    let t;
    if ((t = e.target.closest('[data-pick]'))) { const k = t.dataset.pick; if (chosen.has(k)) chosen.delete(k); else chosen.add(k); return sync(); }
    if ((t = e.target.closest('[data-pk]'))) { const v = t.dataset.pk; chosen = new Set(v === 'none' ? [] : POSTERS.map(p => p.id + ':' + v)); return sync(); }
    if (e.target.closest('[data-act="print"]')) { if (PAGE === 'posters' && !$$('.pp-item.on').length) return; PrintLock.ask(() => window.print()); }
  });  draw();
  PrintLock.install();
})();
