/* =====================================================================
   THE VANISHING HOUR — how each piece of printed evidence looks.
   EvDoc.sheet(piece, { qr }) returns one letter-size page (print.html), or the
   same document on a phone (scan.html). Pieces are in settings/evidence.js.
   Redesigned Nov 13: every piece is a full-page, real-looking document, with its
   own letterhead, paper and handwriting (each writer has a different hand).
   ===================================================================== */
const EvDoc = (() => {
  const e = s => esc(s == null ? '' : s);
  const paras = b => b.map(p => `<p>${e(p)}</p>`).join('');
  const pad = n => String(n).padStart(2, '0');
  const bx = on => `<i class="bx${on ? ' on' : ''}"></i>`;
  const bc = t => `<span class="ed-bc">*${e(t)}*</span>`;
  const blanks = s => e(s).replace(/_{3,}/g, '<span class="ed-line"></span>');
  const mono = m => e(m).replace(/\./g, ' ').trim().split(/\s+/).join('<i>·</i>');

  /* form boxes: two to a row, long answers take the whole row, no empty cells */
  const box = ([k, v], w) => `<div class="fx${w ? ' w' : ''}"><small>${e(k)}</small><b>${e(v || '')}</b></div>`;
  function boxes(f) {
    let col = 0, out = '';
    const long = x => (x[1] || '').length > 30;
    f.forEach((x, i) => {
      let w = long(x);
      if (!w && col === 0 && (i === f.length - 1 || long(f[i + 1]))) w = true;
      out += box(x, w); col = w ? 0 : (col + 1) % 2;
    });
    return `<div class="fx-grid">${out}</div>`;
  }

  /* a seeded wobble, so torn edges look the same every time they print */
  function rnd(seed) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
  function torn(side, seed) {
    const r = rnd(seed), P = [], deep = a => side === a ? 7 : 1.1;
    for (let x = 0; x <= 100; x += 4) P.push(`${x}% ${(r() * 1.1).toFixed(2)}%`);
    for (let y = 0; y <= 100; y += side === 'left' ? 2.5 : 5) P.push(`${(100 - r() * deep('left')).toFixed(2)}% ${y}%`);
    for (let x = 100; x >= 0; x -= 4) P.push(`${x}% ${(100 - r() * 1.1).toFixed(2)}%`);
    for (let y = 100; y >= 0; y -= side === 'right' ? 2.5 : 5) P.push(`${(r() * deep('right')).toFixed(2)}% ${y}%`);
    return `clip-path:polygon(${P.join(',')})`;
  }
  /* the torn-off bottom of a till receipt */
  function zig() {
    const P = ['0 0', '100% 0'];
    for (let i = 0; i <= 28; i++) P.push(`${(100 - i * 100 / 28).toFixed(2)}% ${i % 2 ? 'calc(100% - .8em)' : '100%'}`);
    return `clip-path:polygon(${P.join(',')})`;
  }
  /* banknote-style fine lines for the certificate border */
  function waveTile(color) {
    const w = 160, h = 28; let d = '';
    for (let j = 0; j < 7; j++) {
      let s = '';
      for (let x = 0; x <= w; x += 2) s += (x ? 'L' : 'M') + x + ' ' + (h / 2 + (h / 2 - 1) * Math.sin(x / w * 4 * Math.PI + j * Math.PI / 7)).toFixed(2);
      d += `<path d="${s}"/>`;
    }
    return Art.uri(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><g fill="none" stroke="${color}" stroke-width=".6">${d}</g></svg>`);
  }
  function rosette() {
    let d = '';
    for (let k = 0; k < 18; k++) {
      let s = '';
      for (let i = 0; i <= 240; i++) {
        const t = i / 240 * 2 * Math.PI, r = 70 + 18 * Math.sin(9 * t + k * .35);
        s += (i ? 'L' : 'M') + (100 + r * Math.cos(t)).toFixed(1) + ' ' + (100 + r * Math.sin(t)).toFixed(1);
      }
      d += `<path d="${s}Z"/>`;
    }
    return `<svg viewBox="0 0 200 200"><g fill="none" stroke="#6f5a26" stroke-width=".35">${d}</g></svg>`;
  }
  function seal() {
    let pts = '';
    for (let i = 0; i < 64; i++) { const a = i * Math.PI / 32, r = i % 2 ? 44 : 50; pts += `${(60 + r * Math.cos(a)).toFixed(1)},${(56 + r * Math.sin(a)).toFixed(1)} `; }
    return `<svg viewBox="0 0 120 150"><defs><radialGradient id="vcg" cx="40%" cy="35%"><stop offset="0" stop-color="#f7e3a1"/><stop offset=".55" stop-color="#d4a94a"/><stop offset="1" stop-color="#9b7224"/></radialGradient><path id="vcp" d="M27 56a33 33 0 1 1 66 0a33 33 0 1 1-66 0"/></defs>
      <path d="M42 90 28 146 39 138 47 149 58 98Z" fill="#7d1d22"/><path d="M78 90 92 146 81 138 73 149 62 98Z" fill="#94262c"/>
      <polygon points="${pts}" fill="url(#vcg)" stroke="#8a6420" stroke-width=".8"/>
      <circle cx="60" cy="56" r="40" fill="none" stroke="#8a6420" stroke-width=".8"/><circle cx="60" cy="56" r="26" fill="none" stroke="#8a6420" stroke-width=".8"/>
      <text font-family="Barlow Condensed, sans-serif" font-size="7.4" font-weight="700" letter-spacing="1.5" fill="#5e4210"><textPath href="#vcp">VALE FINE ART ADVISORY · CERTIFIED ·</textPath></text>
      <text x="60" y="64" text-anchor="middle" font-family="Playfair Display, serif" font-style="italic" font-weight="700" font-size="21" fill="#5e4210">PV</text></svg>`;
  }

  const LOGO = {
    anchor: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="20" cy="20" r="18.5"/><circle cx="20" cy="20" r="16" stroke-width=".6"/><circle cx="20" cy="10" r="2.6"/><path d="M20 12.6V31M14 16.5h12M10 23c1 5 5 8 10 8s9-3 10-8M10 23l-2 2.5M10 23l3 1.2M30 23l2 2.5M30 23l-3 1.2"/></svg>`,
    shield: `<svg viewBox="0 0 40 46"><path d="M20 2 37 8V22C37 34 29 41 20 44 11 41 3 34 3 22V8Z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m20 12 2.6 5.4 5.9.8-4.3 4.1 1 5.8L20 25.3l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="currentColor"/></svg>`,
    moon: `<svg viewBox="0 0 40 40"><path d="M26 4a16 16 0 1 0 10 27A13 13 0 1 1 26 4z" fill="currentColor"/><circle cx="31" cy="11" r="1.6" fill="currentColor"/><circle cx="35.5" cy="18" r="1" fill="currentColor"/></svg>`,
    waves: `<svg viewBox="0 0 60 24"><path d="M2 8c6-5 10-5 14 0s8 5 14 0 10-5 14 0 8 5 14 0M2 16c6-5 10-5 14 0s8 5 14 0 10-5 14 0 8 5 14 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    columns: `<svg viewBox="0 0 40 34"><path d="M2 12 20 2 38 12ZM4 14h32v2H4zM6 18h3v11H6zM13 18h3v11h-3zM24 18h3v11h-3zM31 18h3v11h-3zM3 30h34v3H3z" fill="currentColor"/></svg>`
  };
  const DART = `<svg viewBox="0 0 220 50"><g stroke="#2a2a2a" stroke-width="1.2" stroke-linejoin="round"><path d="M4 25 30 22.5v5Z" fill="#d5d9dc"/><rect x="30" y="20" width="46" height="10" rx="2" fill="#9aa1a6"/><path d="M38 20v10M44 20v10M50 20v10M56 20v10M62 20v10M68 20v10" fill="none"/><path d="M76 23.5h74v3H76Z" fill="#555"/><path d="M146 25 206 6l8 2-42 17Z" fill="#c0392b"/><path d="M146 25 206 44l8-2-42-17Z" fill="#a93226"/></g></svg>`;

  /* a halftone newspaper portrait for the clipping */
  /* dot size follows how dark each spot of a simple portrait is (a yearbook-style head and shoulders) */
  const portrait = (() => {
    const inE = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    const dark = (x, y) => {
      let d = .22 + y / 150 * .18;                                            // studio backdrop
      if (inE(x, y, 60, 158, 54, 58)) d = .62;                                // sweater
      if (y > 92 && y < 112 && x > 51 && x < 69) d = .3;                      // neck
      if (inE(x, y, 60, 112, 14, 6) && y > 106) d = .9;                       // collar shadow
      if (inE(x, y, 60, 58, 33, 40) || (y > 58 && y < 118 && x > 27 && x < 93 && Math.abs(x - 60) > 17)) d = .88; // hair
      if (inE(x, y, 60, 64, 21, 28)) {                                        // face, lit from the left
        d = .1 + (x - 44) / 40 * .22;
        if (inE(x, y, 51.5, 60, 4, 2.2) || inE(x, y, 68.5, 60, 4, 2.2)) d = .8;   // eyes
        if (inE(x, y, 51.5, 55, 5, 1.2) || inE(x, y, 68.5, 55, 5, 1.2)) d = .62;  // brows
        if (inE(x, y, 62, 71, 2.6, 4)) d = .4;                                   // nose shadow
        if (inE(x, y, 60, 80, 6.5, 2)) d = .62;                                  // mouth
      }
      return Math.min(1, Math.max(0, d));
    };
    let dots = '';
    for (let y = 1.6, row = 0; y < 150; y += 3.2, row++)
      for (let x = row % 2 ? 3.2 : 1.6; x < 120; x += 3.2) { const r = 1.85 * Math.sqrt(dark(x, y)); if (r > .25) dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}"/>`; }
    return `<svg viewBox="0 0 120 150" class="ed-portrait"><rect width="120" height="150" fill="#ece2c6"/><g fill="#1d1b17">${dots}</g></svg>`;
  })();

  function body(p) {
    const c = STORY.clipping || {};
    switch (p.style) {

      case 'form': {
        const ap = p.fields.find(x => /^approved/i.test(x[0])), f = p.fields.filter(x => x !== ap);
        return `<div class="ed-doc hc">
          <header class="hc-top"><div class="hc-logo">${LOGO.anchor}<div><b>${e(p.head.org)}</b><span>Insurance Company</span></div></div>
            <div class="hc-ref"><div><small>Form</small><b>FA-ENDT 4</b></div><div><small>Policy no.</small><b>${e((p.head.ref || '').replace(/^Policy\s*/, ''))}</b></div><div><small>Page</small><b>1 of 1</b></div></div></header>
          <div class="hc-sub">${e(p.head.sub)}</div>
          <h2 class="hc-bar">${e(p.title.split(': ')[1] || 'Endorsement')}<span>Change in scheduled value</span></h2>
          <p class="hc-note">This endorsement changes the policy. Please read it carefully.</p>
          <h3>Section 1 · Named insured and scheduled item</h3>${boxes(f.slice(0, 2))}
          <h3>Section 2 · Valuation</h3>${boxes(f.slice(2, 6))}
          <div class="hc-checks"><span>${bx(1)}Agreed value</span><span>${bx()}Market value</span><span>${bx()}Blanket limit</span><span>${bx(1)}Appraisal on file</span></div>
          <h3>Section 3 · Request and approval</h3>${boxes(f.slice(6))}
          ${ap ? `<div class="hc-sign"><div class="sigline"><span class="h-sign">${e(ap[1].split(',')[0])}</span></div><small>Authorized signature · ${e(ap[1])}</small></div>` : ''}
          ${p.stamp ? `<div class="ed-stamp"><b>${e(p.stamp)}</b><small>Fine Art Division</small></div>` : ''}
          <footer class="hc-foot"><span>FA-ENDT 4 (03/24) · All other terms of the policy are unchanged.</span></footer></div>`;
      }

      case 'cert': {
        const note = (p.attach || '').match(/"([^"]+)"/), lines = note ? note[1].split(/(?<=\.)\s+/) : [];
        return `<div class="ed-doc vc" style="background-image:url('${waveTile('#8d7a3e')}')"><div class="vc-in">
          <div class="vc-ros">${rosette()}</div><span class="vc-no">No. VFA-2291</span>
          <div class="vc-crest">PV</div><small class="vc-org">${e(p.head.org)}</small>
          <h2>${e(p.head.sub).replace(' of ', ' <i>of</i> ')}</h2>
          <p class="vc-lead">This is to certify that the work of art described below has been examined by the undersigned, and that its fair market value on the date of issue is as stated.</p>
          <dl class="vc-f">${p.fields.map(([k, v]) => `<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join('')}</dl>
          <div class="vc-foot"><div class="vc-seal">${seal()}</div><div class="vc-sign"><span class="h-sign">${e(p.sign)}</span><i></i><small>${e(p.sign)} · Principal</small></div></div>
        </div>${lines.length ? `<div class="vc-rcpt"><i class="staple"></i><p class="h-green">${lines.map(e).join('<br>')}</p></div>` : ''}</div>`;
      }

      case 'binder': {
        const sub = p.head.sub.split(' · ');
        const rowsHtml = p.rows.map(r => `<tr><td class="h-guard">${e(r[0])}</td><td class="h-guard">${e(r[1])}</td><td class="h-guard">${e(r[2])}</td><td class="h-guard">LG</td></tr>`).join('')
          + '<tr><td></td><td></td><td></td><td></td></tr>'.repeat(Math.max(0, 13 - p.rows.length));
        return `<div class="ed-doc sl"><div class="sl-holes"><i></i><i></i><i></i></div>
          <header class="sl-h"><div class="sl-logo">${LOGO.shield}<div><b>${e(p.head.org)}</b><span>Harbor Hill · Department of Protection</span></div></div><div class="sl-title"><b>${e(sub[0] || 'Radio log')}</b><span>Form SEC-07 · Rev. 2</span></div></header>
          <div class="sl-meta"><div class="fx"><small>Date</small><b class="h-guard">${e(sub[2] || '')}</b></div><div class="fx"><small>Post</small><b class="h-guard">${e(sub[1] || '')}</b></div><div class="fx"><small>Channel</small><b class="h-guard">2</b></div><div class="fx"><small>Logged by</small><b class="h-guard">L. Garrity</b></div><div class="fx"><small>Sheet</small><b class="h-guard">1 of 1</b></div></div>
          <table class="sl-t"><thead><tr><th>Time</th><th>Unit</th><th>Message / action</th><th>Init.</th></tr></thead><tbody>${rowsHtml}</tbody></table>
          <footer class="sl-f"><span>Log every call, and every call that gets no answer.</span><span>Reviewed by <i class="ed-line"></i></span></footer></div>`;
      }

      case 'letter': {
        if (p.angry) return `<div class="ed-doc lt lt-wren h-wren"><p class="lt-date">${e(p.date)}</p>${p.body.map((t, i) => `<p${i === p.body.length - 1 ? ' class="big"' : ''}>${e(t)}</p>`).join('')}<p class="lt-sig">${e(p.sign)}</p></div>`;
        if (!p.hand) return `<div class="ed-doc lt-typed"><header class="mu-h">${LOGO.columns}<b>The Museum at Harbor Hill</b><span>Office of the Director</span></header>
          <p class="lt-date">${e(p.date)}</p><div class="lt-tbody">${paras(p.body)}</div>
          <div class="lt-sigblock"><span class="h-sign">${e(p.sign)}</span><span>${e(p.sign)}</span><small>Director</small></div>
          <footer class="mu-f">The Museum at Harbor Hill · Museum Row · Harbor Hill</footer></div>`;
        return `<div class="ed-doc lt lt-june h-june"><p class="lt-date">${e(p.date)}</p><div class="lt-body">${paras(p.body)}</div><p class="lt-sig">${e(p.sign)}</p></div>`;
      }

      case 'law': return `<div class="ed-doc lw"><p class="lw-conf">Privileged &amp; confidential · Attorney–client communication</p>
          <header class="lw-h"><div class="lw-mark">A<i>&amp;</i>R</div><b>${e(p.head.org)}</b><span>${e(p.head.sub.split(' · ')[0])}</span><small>Forty Harbor Street · Harbor Hill</small></header>
          <div class="lw-cols"><aside class="lw-side"><b>Partners</b><span>Quincy Abernathy</span><span>Helen Rhee <i>(retired)</i></span><span>Daniel Osei</span><span>Lila Marchetti</span><b>Of counsel</b><span>Arthur Penhallow</span><b>Practice</b><span>Estates and trusts</span><span>Fine art and collections</span><span>Private clients</span></aside>
          <div class="lw-main"><p class="lw-date">${e(p.date)}</p><p class="lw-to">Mr. Victor J. Ashgrove<br><i>By hand</i></p><p class="lw-re">Re: Your estate</p>${paras(p.body)}
            <div class="lw-sig"><span>Yours sincerely,</span><span class="h-sign">${e(p.sign)}</span><span>${e(p.sign)}<br><small>Senior Partner</small></span></div>
            <p class="lw-init">QA/hr · Original by hand · Copy to file</p></div></div></div>`;

      case 'notecard': return `<div class="ed-doc nc"><div class="nc-card"><div class="nc-mono">${mono(p.mono)}</div><div class="nc-body h-victor">${paras(p.body)}</div><p class="nc-under h-victor">${e(p.under)}</p></div></div>`;

      case 'bag': {
        const note = p.fields.find(x => x[0] === 'Note'), f = p.fields.filter(x => x !== note);
        return `<div class="ed-doc bg"><div class="bg-stripe"><span>Evidence seal · Do not open</span></div>
          <header class="bg-h"><b>Evidence</b><div><span>Federal Bureau of Investigation</span><small>Harbor Hill field office</small></div>${bc(`${STORY.evidenceCase}-${pad(p.item)}`)}</header>
          <div class="bg-body">${boxes([['Case no.', STORY.evidenceCase], ['Item no.', pad(p.item)]].concat(f))}
            <div class="bg-row"><div class="bg-sketch"><small>Item, as found</small>${DART}</div>${note ? `<div class="bg-warn"><b>⚠ Caution</b><p>${e(note[1])}</p></div>` : ''}</div>
            <h3>Chain of custody</h3><table class="bg-t"><thead><tr><th>Released by</th><th>Received by</th><th>Date / time</th><th>Purpose</th></tr></thead><tbody>${'<tr><td></td><td></td><td></td><td></td></tr>'.repeat(4)}</tbody></table>
            <p class="bg-fine">Seal across the top. Sign and date across the seal. Do not open without a second agent present.</p></div></div>`;
      }

      case 'painting': return `<div class="ed-paint">${Art.painting()}</div>`;

      case 'receipt': {
        const F = Object.fromEntries(p.fields);
        const lines = p.fields.filter(x => x[0] !== 'Amount').map(([k, v]) => `<div class="rc-l"><span>${e(k)}</span><b>${e(v)}</b></div>`).join('');
        return `<div class="ed-doc rc"><div class="rc-wrap"><div class="rc-slip" style="${zig()}">
            <div class="rc-logo">${LOGO.moon}<b>${e(p.head.org)}</b><small>Banking after dark</small></div>
            <p class="rc-c">${e(p.head.sub)}<br>Online banking · Customer copy</p><hr>
            <p class="rc-amt"><small>Amount sent</small>${e(F.Amount || '')}</p><hr>${lines}
            <div class="rc-l"><span>Status</span><b>Completed</b></div><div class="rc-l"><span>Ref.</span><b>NB-7781-55203</b></div><hr>
            <p class="rc-c">Keep this receipt for your records.<br>Transfers cannot be reversed.</p>${bc('NB778155203')}<p class="rc-c">* * * Thank you * * *</p></div></div>
          <div class="rc-note"><div class="nc-mono">${mono(p.note.mono)}</div><p class="h-victor">${e(p.note.text)}</p><p class="h-victor rc-sig">${e(p.note.sign)}</p></div></div>`;
      }

      case 'phonelog': {
        const slip = (r, i) => `<div class="wy"><div class="wy-h"><b>While You Were Out</b><small>No. ${4471 + i}</small></div>
          <div class="wy-r"><small>For</small><span class="carbon">${r ? 'Mr. Ashgrove' : ''}</span></div>
          <div class="wy-r"><small>Date</small><span class="carbon">${r ? e(r[0]) : ''}</span><small>Time</small><span></span></div>
          <div class="wy-r"><small>M</small><span class="carbon">${r ? e(r[1]) : ''}</span></div>
          <div class="wy-r"><small>Of</small><span></span><small>Phone</small><span></span></div>
          <div class="wy-checks"><span>${bx(!!r)}Telephoned</span><span>${bx()}Please call</span><span>${bx()}Came to see you</span><span>${bx()}Will call again</span><span>${bx()}Returned your call</span><span class="u">${bx(r && /urgent/i.test(r[2]))}Urgent</span></div>
          <div class="wy-msg"><small>Message</small><p class="carbon">${r ? e(r[2]) : ''}</p></div>
          <div class="wy-r"><small>Signed</small><span class="carbon">${r ? 'M.P.' : ''}</span></div></div>`;
        const four = [0, 1, 2, 3].map(i => slip(p.rows[i], i)).join('');
        return `<div class="ed-doc wyb"><header class="wy-top"><b>Message book</b><span>Office of the Chairman · Ashgrove &amp; Grant · carbon copies · M. Pike</span></header><div class="wy-grid">${four}</div></div>`;
      }

      case 'clipping': {
        const left = p.half === 'left', t = c.text || '', k = t.indexOf(' when ');
        const a = k > 0 ? t.slice(0, k) : t, b = k > 0 ? t.slice(k + 1) : '';
        const hk = (c.head || '').indexOf(' in '), h1 = hk > 0 ? c.head.slice(0, hk) : (c.head || ''), h2 = hk > 0 ? c.head.slice(hk + 1) : '';
        const words = (c.paper || 'Harbor Ledger').split(' '), pL = words.slice(0, -1).join(' '), pR = words.slice(-1)[0];
        if (left) return `<div class="ed-doc clw"><div class="cl left" style="${torn('left', 7)}">
            <div class="cl-folio"><span>B4</span><span>${e(c.date)}</span><span class="bl">The ${e(pL)}</span></div>
            <div class="cl-cols"><div class="cl-col side"><small class="kick">Harbor Hill</small><h4>Library bond vote set for April</h4><p>The county board voted 5 to 2 on Monday to put a $4 million bond for the Harbor Hill library before voters on April 10. The money would repair the roof and add a children's wing.</p><p>"The building has leaked since 1994," said board member Ruth Nordin. Opponents said the cost should wait until the budget is settled.</p><h4>Ferry fares unchanged</h4><p>Fares on the Harbor ferry will stay at $2.50 through the summer, the transit authority said.</p></div>
            <div class="cl-col main"><h2>${e(h1)}</h2><p class="deck">Car left the road</p><figure>${portrait}<figcaption>June Ellery</figcaption></figure><p class="by">By Tom Hale · Ledger staff</p><p><span class="dl">Harlow County —</span> ${e(a).replace(/^([^,]+,[^,]+,)/, '<b>$1</b>')}</p></div></div></div></div>`;
        return `<div class="ed-doc clw"><div class="cl right" style="${torn('right', 11)}">
            <div class="cl-folio"><span class="bl">${e(pR)}</span><span>Local &amp; Region</span></div>
            <div class="cl-cols"><div class="cl-col main"><h2>${e(h2)}</h2><p class="deck">in heavy rain, police say</p><p>${e(b)}</p><p>State police said the road was closed for three hours. No other vehicles were involved.</p><p>A county spokesman said the curve near mile 14 has seen four accidents since 1998.</p><p>Funeral arrangements are pending. The family asks for privacy.</p></div>
            <div class="cl-col side"><div class="cl-wx"><b>Weather</b><p>Thursday: rain, heavy at times. High 48. Clearing Friday.</p></div><div class="cl-ad"><b>Rain or shine</b><span>Harbor Tire &amp; Auto</span><small>All-season tires from $39 · Mill Road</small></div><h4>School board meets</h4><p>The Harlow school board meets Thursday at 7 p.m. in the high school library.</p><h4>Corrections</h4><p>A Monday story gave the wrong date for the Harlow County spring fair. The fair opens May 5. The Ledger regrets the error.</p></div></div></div></div>`;
      }

      case 'photo': return `<div class="ed-doc ph"><div class="ph-print"><img alt="" src="${Art.uri(Art.photo())}"><span class="ph-date">'00 12 8</span><i class="pc tl"></i><i class="pc tr"></i><i class="pc bl"></i><i class="pc br"></i></div><p class="ph-cap h-pen">${e(p.caption)}</p></div>`;

      case 'program': {
        const s = p.head.sub.split(' · ');
        return `<div class="ed-doc pg"><div class="pg-card" style="${torn('none', 5)}"><div class="pg-logo">${LOGO.waves}</div><small class="pg-pre">${e(p.head.org)} presents</small><h2>${e(s[0])}</h2><p class="pg-sub">${e(s[1] || '')}</p><p class="pg-date">${e(s[2] || '')}</p><div class="pg-orn">✦</div><h3>Exhibiting</h3>
          <ol>${p.rows.map(r => `<li><b>${e(r[0])}</b><span></span><i>${e(r[1])}</i></li>`).join('')}</ol>
          <p class="pg-fine">Opening reception, six to nine in the evening. Refreshments in the east gallery.<br>All works are for sale; please ask at the desk.</p></div></div>`;
      }

      case 'schedule': {
        const D = [['Tate', 'Lobby', 'Lobby', 'East', 'Off', 'Lobby', 'East', 'Off'], ['Pruitt', 'East', 'Off', 'Lobby', 'Lobby', 'Off', 'Lobby', 'East'], ['Okafor', 'Off', 'East', 'Off', 'East', 'East', 'Off', 'Lobby'], ['Delacroix', 'Dock', 'Dock', 'Dock', 'Off', 'Dock', 'Dock', 'Off']];
        return `<div class="ed-doc ss"><header class="sl-h"><div class="sl-logo">${LOGO.shield}<div><b>Museum Security</b><span>Night shift rotation · last spring</span></div></div><div class="sl-title"><b>Week 14</b><span>Shifts 10 PM to 6 AM</span></div></header>
          <table class="ss-t"><thead><tr><th>Guard</th>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>${D.map(r => `<tr>${r.map((x, i) => `<td class="${i ? 'p-' + x.toLowerCase() : ''}">${e(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>
          <div class="ss-key"><b>Posts</b><span><i class="p-lobby">Lobby</i> front desk and main hall</span><span><i class="p-east">East</i> east hall and vault stairs</span><span><i class="p-dock">Dock</i> loading dock</span><span><i class="p-off">Off</i> day off</span></div>
          <p class="ss-rules">Swaps need L. Garrity's OK in writing. Keys and radios are signed out at the front desk. Lockers are yours for the season; keep them locked.</p>
          <p class="ss-note h-pen">${e(p.note)}</p></div>`;
      }

      case 'planner': {
        const [h, ...r] = p.rows;
        return `<div class="ed-doc pl"><div class="pl-rings">${'<i></i>'.repeat(13)}</div>
          <header class="pl-h"><div><small>Quill Events · H. Quill</small><b>Ashgrove Gala</b></div><span class="pl-tab">Requests &amp; changes</span></header>
          <table class="pl-t"><thead><tr><th></th>${h.map(x => `<th>${e(x)}</th>`).join('')}</tr></thead><tbody>${r.map((x, i) => `<tr><td>${bx(i !== r.length - 1)}</td>${x.map(v => `<td class="h-pen">${e(v)}</td>`).join('')}</tr>`).join('')}${`<tr><td>${bx()}</td><td></td><td></td><td></td></tr>`.repeat(9)}</tbody></table>
          <div class="pl-sticky h-pen">Doors at 7:00 sharp!</div></div>`;
      }

      case 'tips': return `<div class="ed-doc tp"><div class="tp-bar"><span>Mail · Inbox · ${p.rows.length} messages</span><span>Printed by P. Lowell</span></div>
          ${p.rows.map(r => `<div class="tp-mail"><h3>(no subject)</h3><dl><dt>From</dt><dd>(sender hidden) via anonymous relay</dd><dt>To</dt><dd>Parker Lowell</dd><dt>Received</dt><dd>${e(r[0])}</dd></dl><p>${e(r[1])}</p></div>`).join('')}
          <p class="tp-scrawl h-pen">Same relay both times. Who?</p><div class="tp-foot"><span>Page 1 of 1</span></div></div>`;

      case 'list': {
        const h = (p.head || '').split(' · ');
        return `<div class="ed-doc ls"><header class="ls-h"><b>${e(h[0])}</b><span>${e(h[1] || '')}</span></header><p class="ls-t">${e(h.slice(2).join(' · '))}</p>
          <table class="ls-tb"><thead><tr><th>No.</th><th>Resident</th><th>Placed with</th></tr></thead><tbody>${p.rows.map((r, i) => `<tr><td>${i + 1}.</td><td>${e(r)}</td><td></td></tr>`).join('')}</tbody></table>
          <p class="ls-fine">Initials and ages only. Records before 2004 were not kept.</p><div class="ls-stamp">File copy</div></div>`;
      }

      case 'notice': {
        const to = p.body.find(x => /^To:/.test(x)), rest = p.body.slice(1).filter(x => x !== to);
        const amt = (p.body.join(' ').match(/\$[\d,]+/) || [''])[0];
        return `<div class="ed-doc tn"><header class="tn-h"><div class="tn-mark">T</div><div><b>${e(p.head)}</b><span>Private credit</span></div><small>Est. three years ago</small></header>
          <div class="tn-ban">${e(p.body[0])}</div>
          ${boxes([['To', (to || '').replace(/^To:\s*/, '')], ['Re', 'All facilities, past due'], ['Amount due', amt ? amt + '.00' : ''], ['Due by', 'The last day of this month']])}
          <div class="tn-body">${paras(rest)}</div>
          <div class="tn-sig"><span class="h-sign">${e(p.sign.split(',')[0])}</span><span>${e(p.sign)}</span></div>
          <footer class="tn-f">This notice is sent under the terms of your loan agreements. Thorne Capital reserves all of its rights.</footer></div>`;
      }

      case 'memo': {
        if (p.id === 'will') {
          const who = (p.head.match(/of (.+)$/) || [, ''])[1];
          return `<div class="ed-doc wl"><div class="wl-in"><p class="wl-draft">Draft · Not executed</p><small>The</small><h2>Last Will<br><i>and</i><br>Testament</h2><small>of</small><h3>${e(who)}</h3><div class="wl-orn">❦</div>
            <dl class="wl-f">${p.rows.map(([k, v]) => `<dt>${e(k)}</dt><dd>${blanks(v)}</dd>`).join('')}</dl>
            <footer><b>Abernathy &amp; Rhee</b><span>Attorneys at Law · Forty Harbor Street · Harbor Hill</span></footer></div></div>`;
        }
        const h = (p.head || '').split(' · ');
        return `<div class="ed-doc cp"><header class="cp-h"><div class="cp-mark">C</div><div><b>${e(h[0])}</b><span>Private wealth</span></div><span class="cp-conf">${e(h[3] || 'Confidential')}</span></header>
          ${boxes([['Client', h[2] || ''], ['Report', h[1] || ''], ['Prepared by', 'P. Calloway'], ['Copies', 'One (client)']])}
          <table class="cp-t"><thead><tr><th>Holding</th><th>Position</th></tr></thead><tbody>${p.rows.map(([k, v]) => `<tr><td>${e(k)}</td><td>${e(v)}</td></tr>`).join('')}</tbody></table>
          <p class="cp-fine">Figures as of the close of business last month. This summary is for the client only and is not an offer or a valuation. Calloway Private does not give tax or legal advice.</p></div>`;
      }
      default: return '';
    }
  }

  /* the FBI evidence sticker, with its QR code */
  function tag(p, qr) {
    return `<div class="ed-tag"><div class="tg-h"><b>FBI</b><span>Evidence</span><small>Case ${e(STORY.evidenceCase || '')}</small></div>
      <div class="tg-b"><div class="tg-f"><div><small>Item no.</small><b>${pad(p.item)}</b></div><div><small>Collected by</small><span></span></div><div><small>Date / time</small><span></span></div></div>
      ${qr ? `<div class="ed-qr">${qr}<small>Scan to log</small></div>` : ''}</div></div>`;
  }

  /** One page. opts.qr = an SVG string for the tag (print), or null (props, the phone view). */
  function sheet(p, opts) {
    const o = opts || {}, hasTag = !!p.item && !o.noTag;
    return `<article class="ed-page st-${p.style}${p.aged ? ' aged' : ''}${p.angry ? ' notebook' : ''}${o.phone ? ' phone' : ''}${hasTag ? ' tagged' : ''}" data-id="${e(p.id)}">
      <div class="ed-paper">${body(p)}</div>${hasTag ? tag(p, o.qr) : ''}</article>`;
  }
  return { sheet, tag };
})();
