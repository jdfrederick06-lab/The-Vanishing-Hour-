/* =====================================================================
   THE VANISHING HOUR — the big screen (reveal.html), for a projector or TV.
   Before the reveal it shows the vote coming in live; then it follows the
   host's slides (Host terminal > Vote). On the host's own computer, the
   arrow keys and Space step through the slides too.
   ===================================================================== */
(function () {
  const host = Session.host() || Session.lastHost();
  const root = $('#root');
  if (!host) { root.innerHTML = `<div class="bs-lock"><b>${esc(CONFIG.TITLE)}</b><p>The big screen opens from the host terminal (Vote tab).</p></div>`; return; }

  const backdrop = `<div class="bs-bg" aria-hidden="true"><img alt="" src="${Art.uri(Art.harbor(false))}"></div><div class="bs-vig" aria-hidden="true"></div>`;
  root.innerHTML = `${backdrop}<main class="bs" id="bs"></main><div class="bs-hint" id="hint">← back · → or Space next · F full screen</div>`;
  const stage = $('#bs');

  const bars = list => `<div class="bs-bars">${list.map((x, k) => `<div class="bs-bar${k === 0 ? ' lead' : ''}" style="--d:${(k * .18 + .3).toFixed(2)}s"><span class="bs-bn">${esc(x.label)}</span><span class="bs-bt"><i style="--w:${x.pct}%"></i></span><b>${x.n}</b></div>`).join('')}</div>`;
  const paras = b => (b || []).map((p, k) => `<p class="bs-p" style="--d:${(k * 1.1 + .6).toFixed(2)}s">${esc(p)}</p>`).join('');
  const cards = (list, kind) => `<div class="bs-cards">${list.map((x, k) => `<div class="bs-card ${kind === 'res' ? (x.win ? 'win' : 'lose') : 'aw'}" style="--d:${(k * .5 + .5).toFixed(2)}s"><small>${esc(kind === 'res' ? (x.win ? 'Won' : 'Lost') : x.title)}</small><b>${esc(kind === 'res' ? x.who : x.who)}</b><p>${esc(x.why)}</p></div>`).join('')}</div>`;

  /* before the reveal: the vote coming in */
  function waiting(s) {
    const open = Vote.isOpen(s), closed = Vote.isClosed(s), vs = Vote.voters(s).length, n = Vote.votedList(s).length, a = Vote.arrest(s);
    if (open || closed) {
      const C = 2 * Math.PI * 54, f = vs ? n / vs : 0;
      return `<section class="bs-slide bs-wait"><small class="bs-k">The accusation</small><h1>${open ? 'Cast your vote' : a ? 'An arrest has been made' : 'Voting is closed'}</h1>
        <div class="bs-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="t"/><circle cx="60" cy="60" r="54" class="v" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - f)).toFixed(1)}"/></svg><div><b>${n}</b><span>of ${vs}</span></div></div>
        <p class="bs-p" style="--d:.2s">${open ? 'Who stole the painting? Who is the killer? Vote on your phone. The FBI\'s votes count double.' : a ? 'Stay where you are. The truth is next.' : 'The FBI is deciding who to arrest.'}</p></section>`;
    }
    return `<section class="bs-slide bs-title"><small class="bs-k">${esc(CONFIG.EVENT)}</small><h1>${esc(CONFIG.TITLE)}</h1><p class="bs-p" style="--d:.4s">The Ashgrove Collection · One night only</p></section>`;
  }
  function slideHTML(sl) {
    return `<section class="bs-slide bs-${esc(sl.id.replace(/[^a-z-]/gi, ''))}${sl.big ? ' has-big' : ''}">
      <small class="bs-k">${esc(sl.kicker || '')}</small><h1>${esc(sl.title || '')}</h1>
      ${sl.big ? `<div class="bs-big">${esc(sl.big)}</div>` : ''}
      ${sl.bars ? (sl.bars.length ? bars(sl.bars) : '<p class="bs-p">No votes were cast.</p>') : ''}
      ${paras(sl.body)}
      ${sl.results ? cards(sl.results, 'res') : ''}${sl.awards ? cards(sl.awards, 'aw') : ''}</section>`;
  }

  let shownKey = null;
  function render() {
    const s = DB.get(), i = Reveal.step(s), all = Reveal.slides(s), sl = i >= 0 ? all[i] : null;
    const html = sl ? slideHTML(sl) : waiting(s);
    /* a new slide plays its entrance; the same slide just updates in place */
    const key = sl ? 'slide' + i : 'wait' + (Vote.isOpen(s) ? 'o' : Vote.isClosed(s) ? 'c' : '') + (Vote.arrest(s) ? 'a' : '');
    if (key !== shownKey) { shownKey = key; stage.innerHTML = html; stage._html = html; stage.classList.remove('in'); void stage.offsetWidth; stage.classList.add('in'); }
    else patch(stage, html);
    document.body.classList.toggle('bs-dark', !!sl && !!sl.big);
  }

  /* the host's own keys */
  addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    const s = DB.get(), i = Reveal.step(s), n = Reveal.slides(s).length;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); if (i < n - 1) Reveal.go(i + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); Reveal.go(i - 1 < 0 ? null : i - 1); }
    else if (e.key === 'f' || e.key === 'F') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); }
  });
  /* the key hint shows only while the mouse moves */
  let ht; addEventListener('mousemove', () => { const h = $('#hint'); h.classList.add('on'); clearTimeout(ht); ht = setTimeout(() => h.classList.remove('on'), 2200); });

  DB.on(render);
  setInterval(render, 2000);
})();
