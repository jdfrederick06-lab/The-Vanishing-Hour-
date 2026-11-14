/* =====================================================================
   THE VANISHING HOUR — "Print the evidence" (print.html). Host only.
   Every printed clue, letter-size, one per sheet, with an FBI evidence sticker and a QR code
   that points at scan.html on wherever the site is hosted. Tick what to print, then Print.
   Tip: print on cream or ivory card stock for the letters; plain white for the forms.
   ===================================================================== */
(function () {
  const host = Session.lastHost();
  if (!host) {
    $('#root').innerHTML = `<div class="sc"><div class="sc-top"><b>FBI</b><span>Evidence printing</span></div><div class="sc-warn">This page is for the host. Sign in at the <a href="host.html">host terminal</a> first, then come back.</div></div>`;
    return;
  }
  /* QR codes point at the scan page next to this one, wherever the site is hosted */
  const base = location.href.replace(/[^/]*([?#].*)?$/, '');
  const qr = code => {
    if (typeof qrcode === 'undefined') return '<div style="padding:30% 0;font-size:.8em;text-align:center">QR needs internet</div>';
    const q = qrcode(0, 'M'); q.addData(base + 'scan.html?e=' + encodeURIComponent(code)); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  };
  const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
  const groups = [
    ['main', 'The nine printed clues', 'Approved Nov 12. Each gets a QR tag.', STORY.evidence.filter(p => p.item <= 9)],
    ['locks', 'Inside the locks', 'For Charlie\'s locker (417), Victor\'s desk (key 1) and the archive box (key 2).', STORY.evidence.filter(p => p.item > 9)],
    ['props', 'Character props', 'Paper the dossiers promise. No QR codes: the character decides who sees them.', STORY.props]
  ];
  const pick = { main: true, locks: true, props: true };
  function draw() {
    $('#root').innerHTML = `<div class="ev-bar"><h1>Print the evidence<small>Case ${esc(STORY.evidenceCase)} · ${STORY.evidence.length} tagged pieces, ${STORY.props.length} props</small></h1>
      ${groups.map(([k, t]) => `<label><input type="checkbox" data-g="${k}" ${pick[k] ? 'checked' : ''}> ${esc(t)}</label>`).join('')}
      <a href="host.html">Host terminal</a><button class="go" data-act="print">Print</button></div>
      <p class="ev-note">Letter paper, portrait, no margins ("None" or "Minimum" in the print dialog), and turn on "Background graphics" so the paper colors and the evidence stickers print. June's painting looks best on matte photo paper or canvas paper, framed.${local ? ' <b>The QR codes point at this computer (' + esc(location.host) + '), so phones can\'t open them yet. Print the final copies once the site is online.</b>' : ''}</p>
      ${groups.filter(g => pick[g[0]]).map(([k, t, note, list]) => `<section class="ev-sec"><h2>${esc(t)} · ${esc(note)}</h2><div class="ev-grid">${list.map(p => `<div class="ev-item">${EvDoc.sheet(p, { qr: k === 'props' ? null : qr(p.code), noTag: k === 'props' })}<small class="who">${p.item ? 'Item ' + p.item + ' · ' : ''}${esc(p.title)} · ${esc(p.holder)}${p.clue ? ' · clue ' + esc(p.clue) : ''}</small></div>`).join('')}</div></section>`).join('')}`;
  }
  document.addEventListener('change', e => { const g = e.target.dataset.g; if (g) { pick[g] = e.target.checked; draw(); } });
  document.addEventListener('click', e => { if (e.target.closest('[data-act="print"]')) window.print(); });
  draw();
})();
