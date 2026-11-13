/* =====================================================================
   THE VANISHING HOUR — how each piece of printed evidence looks.
   EvDoc.sheet(piece, { qr }) returns one letter-size page (print.html), or the
   same document on a phone (scan.html). Pieces are in settings/evidence.js.
   ===================================================================== */
const EvDoc = (() => {
  const e = s => esc(s == null ? '' : s);
  const rows = (r, cls) => `<table class="ed-t ${cls || ''}">${r.map((x, i) => `<tr>${x.map(c => i === 0 && cls === 'head' ? `<th>${e(c)}</th>` : `<td>${e(c)}</td>`).join('')}</tr>`).join('')}</table>`;
  const fields = f => `<dl class="ed-f">${f.map(([k, v]) => `<dt>${e(k)}</dt><dd>${v ? e(v) : '<span class="ed-blank"></span>'}</dd>`).join('')}</dl>`;
  const paras = b => b.map(p => `<p>${e(p)}</p>`).join('');

  /* the manila FBI evidence tag, with its QR code */
  function tag(p, qr) {
    return `<div class="ed-tag"><i class="ed-hole"></i><div class="ed-tag-t"><b>FBI</b><span>Evidence</span></div>
      <div class="ed-tag-f"><small>Case</small><b>${e(STORY.evidenceCase || '')}</b><small>Item</small><b>${p.item}</b></div>
      ${qr ? `<div class="ed-qr">${qr}</div><small class="ed-scan">Scan to log</small>` : ''}<div class="ed-tag-l"><small>Collected by</small><span></span><small>Time</small><span></span></div></div>`;
  }

  /* a halftone newspaper portrait for the clipping */
  const portrait = `<svg viewBox="0 0 120 150" class="ed-portrait"><defs><pattern id="ht" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="#222"/></pattern><mask id="hm"><rect width="120" height="150" fill="#fff"/><ellipse cx="60" cy="62" rx="26" ry="32" fill="#000"/><path d="M14 150 C18 112 40 98 60 98 C80 98 102 112 106 150Z" fill="#555"/></mask></defs><rect width="120" height="150" fill="#ddd"/><rect width="120" height="150" fill="url(#ht)" mask="url(#hm)"/><path d="M30 58 C30 26 90 24 92 58 C96 92 84 120 80 132 C78 104 74 90 70 84 C60 92 44 96 34 92 C30 80 30 70 30 58Z" fill="url(#ht)"/></svg>`;

  function body(p) {
    const c = STORY.clipping || {};
    switch (p.style) {
      case 'form': return `<header class="ed-lh ed-ins"><b>${e(p.head.org)}</b><span>${e(p.head.sub)}</span><small>${e(p.head.ref)}</small></header><h2>Endorsement No. 4 · Schedule of Values</h2>${fields(p.fields)}${p.stamp ? `<div class="ed-stamp">${e(p.stamp)}</div>` : ''}<footer class="ed-fine">Harbor & Crane Insurance Company · Fine Art & Collections Division · This endorsement forms part of the policy named above.</footer>`;
      case 'cert': return `<div class="ed-cert"><header><small>${e(p.head.org)}</small><h2>${e(p.head.sub)}</h2></header>${fields(p.fields)}<div class="ed-sign"><span class="ed-hand">${e(p.sign)}</span><small>${e(p.sign)}, Principal</small></div></div><div class="ed-receipt-note"><span class="ed-hand green">Fee: $50,000. Received with thanks. P.V.</span></div>`;
      case 'binder': return `<header class="ed-lh ed-sec"><b>${e(p.head.org)}</b><span>${e(p.head.sub)}</span></header>${rows([['Time', 'Unit', 'Message']].concat(p.rows), 'head binder')}<p class="ed-hand small">Logged by L. Garrity</p>`;
      case 'letter': return `<div class="ed-letter ${p.angry ? 'angry' : ''}"><p class="ed-date ed-hand">${e(p.date)}</p><div class="ed-hand">${paras(p.body)}</div><p class="ed-hand ed-sig">${e(p.sign)}</p></div>`;
      case 'law': return `<header class="ed-lh ed-law"><b>${e(p.head.org)}</b><span>${e(p.head.sub)}</span></header><p class="ed-date">${e(p.date)}</p>${paras(p.body)}<p class="ed-sig"><span class="ed-hand">${e(p.sign)}</span><br>${e(p.sign)}, Senior Partner</p>`;
      case 'notecard': return `<div class="ed-card"><div class="ed-mono">${e(p.mono)}</div><div class="ed-hand">${paras(p.body)}</div><p class="ed-hand ed-under">${e(p.under)}</p></div>`;
      case 'bag': return `<div class="ed-bag"><header><b>EVIDENCE</b><span>Federal Bureau of Investigation · Case ${e(STORY.evidenceCase)}</span></header>${fields(p.fields)}<p class="ed-fine">Seal across the top. Sign and date across the seal. Do not open without a second agent present.</p><div class="ed-bag-chain">${rows([['Released by', 'Received by', 'Date / time'], ['', '', ''], ['', '', '']], 'head')}</div></div>`;
      case 'painting': return `<div class="ed-paint">${Art.painting()}</div>`;
      case 'receipt': return `<div class="ed-two"><div class="ed-nb"><header><b>${e(p.head.org)}</b><span>${e(p.head.sub)}</span></header>${fields(p.fields)}<p class="ed-fine">Ref. NB-7781-${e(p.code)} · Printed copy</p></div><div class="ed-card small"><div class="ed-mono">${e(p.note.mono)}</div><p class="ed-hand">${e(p.note.text)}</p><p class="ed-hand ed-sig">${e(p.note.sign)}</p></div></div>`;
      case 'phonelog': return `<div class="ed-pad"><header><b>While You Were Out</b><span>Ashgrove & Grant · Office of the Chairman</span></header>${p.rows.map(r => `<div class="ed-msgslip"><small>${e(r[0])}</small><b class="ed-hand">${e(r[1])}</b><p class="ed-hand">${e(r[2])}</p></div>`).join('')}<p class="ed-fine">Carbon copies · M. Pike</p></div>`;
      case 'clipping': {
        const left = p.half === 'left';
        return `<div class="ed-clip ${left ? 'left' : 'right'}"><div class="ed-clip-mast"><span>${e(c.paper)}</span><span>${e(c.date)}</span><span>Page B4</span></div>
          <h2>${left ? 'Young mother dies' : 'in Route 9 crash'}</h2>
          <div class="ed-clip-cols">${left ? `${portrait}<p><b>June Ellery, 23,</b> an art student of Harlow County, was killed Tuesday night</p><p class="ed-filler">The county will review the stretch of road this spring. Funeral arrangements are pending. The family asks for privacy.</p>` : `<p>when her car left Route 9 in heavy rain. She is survived by an infant son.</p><p class="ed-filler">State police said the road was closed for three hours. No other vehicles were involved. A spokesman for the county said the curve near mile 14 has seen four accidents since 1998.</p>`}</div></div>`;
      }
      case 'photo': return `<div class="ed-photo"><img alt="" src="${Art.uri(Art.photo())}"><p class="ed-hand">${e(p.caption)}</p></div>`;
      case 'program': return `<div class="ed-prog"><header><b>${e(p.head.org)}</b><span>${e(p.head.sub)}</span></header><ol>${p.rows.map(r => `<li><b>${e(r[0])}</b><i>${e(r[1])}</i></li>`).join('')}</ol><p class="ed-fine">Refreshments in the east gallery. All works are for sale; please ask at the desk.</p></div>`;
      case 'schedule': return `<header class="ed-lh ed-sec"><b>Museum Security</b><span>Night shift rotation · last spring</span></header>${rows([['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], ['Tate', 'Lobby', 'Lobby', 'East', 'Off', 'Lobby', 'East', 'Off'], ['Pruitt', 'East', 'Off', 'Lobby', 'Lobby', 'Off', 'Lobby', 'East'], ['Okafor', 'Off', 'East', 'Off', 'East', 'East', 'Off', 'Lobby'], ['Delacroix', 'Dock', 'Dock', 'Dock', 'Off', 'Dock', 'Dock', 'Off']], 'head sched')}<p class="ed-hand ed-margin">${e(p.note)}</p>`;
      case 'planner': return `<div class="ed-planner"><header><b>Ashgrove Gala</b><span>Requests and changes · H. Quill</span></header>${rows(p.rows, 'head')}</div>`;
      case 'tips': return `<div class="ed-tips">${p.rows.map(r => `<div class="ed-mail"><small>From: (hidden sender) · ${e(r[0])}</small><p>${e(r[1])}</p></div>`).join('')}</div>`;
      case 'list': return `<div class="ed-list"><header>${e(p.head)}</header><ol>${p.rows.map(r => `<li>${e(r)}</li>`).join('')}</ol><p class="ed-fine">Initials and ages only. Records before 2004 were not kept.</p></div>`;
      case 'notice': return `<header class="ed-lh ed-law"><b>${e(p.head)}</b><span>Private credit · Est. three years ago</span></header><h2 class="ed-red">${e(p.body[0])}</h2>${paras(p.body.slice(1))}<p class="ed-sig"><span class="ed-hand">${e(p.sign)}</span></p>`;
      case 'memo': return `<header class="ed-lh"><b>${e(p.head)}</b></header>${rows(p.rows)}`;
      default: return '';
    }
  }

  /** One page. opts.qr = an SVG string for the tag (print), or null (props, the phone view). */
  function sheet(p, opts) {
    const o = opts || {}, hasTag = !!p.item && !o.noTag;
    return `<article class="ed-page st-${p.style}${p.aged ? ' aged' : ''}${o.phone ? ' phone' : ''}${hasTag ? ' tagged' : ''}" data-id="${e(p.id)}">
      <div class="ed-paper">${body(p)}</div>${hasTag ? tag(p, o.qr) : ''}</article>`;
  }
  return { sheet, tag };
})();
