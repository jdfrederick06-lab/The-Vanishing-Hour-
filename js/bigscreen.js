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

  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const hourglass = '<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M8 3h24M8 49h24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M11 5c0 11 7 15 9 21-2 6-9 10-9 21h18c0-11-7-15-9-21 2-6 9-10 9-21z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15 43c1-5 4-7 5-9 1 2 4 4 5 9z" fill="currentColor"/></svg>';
  const laurel = '<svg viewBox="0 0 60 30" aria-hidden="true"><g fill="currentColor"><path d="M30 27c-8-1-15-6-18-14 5 3 10 7 18 14z"/><path d="M30 27c8-1 15-6 18-14-5 3-10 7-18 14z"/><ellipse cx="11" cy="10" rx="2.4" ry="5" transform="rotate(-30 11 10)"/><ellipse cx="17" cy="6" rx="2.2" ry="4.6" transform="rotate(-10 17 6)"/><ellipse cx="49" cy="10" rx="2.4" ry="5" transform="rotate(30 49 10)"/><ellipse cx="43" cy="6" rx="2.2" ry="4.6" transform="rotate(10 43 6)"/></g></svg>';
  const backdrop = `<div class="bs-bg" aria-hidden="true"><img alt="" src="${Art.uri(Art.harbor(false))}"></div><div class="bs-vig" aria-hidden="true"></div><div class="bs-rays" aria-hidden="true"></div><div class="bs-grain" aria-hidden="true"></div>`;
  root.innerHTML = `${backdrop}<main class="bs" id="bs"></main><div class="bs-prog" id="prog" aria-hidden="true"></div><div class="bs-hint" id="hint">← back · → or Space next · F full screen</div>`;
  const stage = $('#bs');

  const face = (id, label) => { const c = G.byId(id), n = c ? c.name : label; return `<span class="bs-av" style="--h:${Vote.hue(n)}">${esc(initials(n))}</span>`; };
  const bars = list => `<div class="bs-bars">${list.map((x, k) => `<div class="bs-bar${k === 0 ? ' lead' : ''}" style="--d:${(k * .22 + .4).toFixed(2)}s">${face(x.id, x.label)}<span class="bs-bn">${esc(x.label)}</span><span class="bs-bt"><i style="--w:${x.pct}%"></i></span><b data-count="${x.n}">0</b></div>`).join('')}</div>`;
  const paras = (b, d0) => (b || []).map((p, k) => `<p class="bs-p" style="--d:${(k * 1.1 + (d0 || .6)).toFixed(2)}s">${esc(p)}</p>`).join('');
  const results = list => `<div class="bs-cards">${list.map((x, k) => `<div class="bs-card ${x.win ? 'win' : 'lose'}" style="--d:${(k * .55 + .6).toFixed(2)}s"><i aria-hidden="true">${x.win ? '✓' : '✕'}</i><div><small>${x.win ? 'Won' : 'Lost'}</small><b>${esc(x.who)}</b><p>${esc(x.why)}</p></div></div>`).join('')}</div>`;
  const awards = list => `<div class="bs-aw">${list.map((x, k) => `<div class="bs-award" style="--d:${(k * .7 + .6).toFixed(2)}s"><span class="bs-laurel">${laurel}</span><small>${esc(x.title)}</small><b>${esc(x.who)}</b><p>${esc(x.why)}</p></div>`).join('')}</div>`;

  /* before the reveal: the vote coming in */
  function waiting(s) {
    const open = Vote.isOpen(s), closed = Vote.isClosed(s), vs = Vote.voters(s).length, n = Vote.votedList(s).length, a = Vote.arrest(s);
    if (open || closed) {
      const C = 2 * Math.PI * 54, f = vs ? n / vs : 0;
      if (a) { const c = G.byId(a.who); return `<section class="bs-slide bs-arrested"><small class="bs-k">The arrest</small><h1>An arrest has been made</h1><div class="bs-mug">${face(a.who)}<div class="bs-plate"><b>${esc(c ? c.name : '')}</b><span>Case ${esc(STORY.fbi.caseNo)}</span></div></div><p class="bs-p" style="--d:.8s">Stay where you are. The truth is next.</p></section>`; }
      return `<section class="bs-slide bs-wait"><small class="bs-k">The accusation</small><h1>${open ? 'Cast your vote' : 'Voting is closed'}</h1>
        <div class="bs-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="t"/><circle cx="60" cy="60" r="54" class="v" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - f)).toFixed(1)}"/></svg><div><b>${n}</b><span>of ${vs} have voted</span></div></div>
        <p class="bs-p" style="--d:.2s">${open ? 'Who stole the painting? Who is the killer? Vote on your phone, on your Now screen.' : 'The FBI is deciding who to arrest.'}</p></section>`;
    }
    return `<section class="bs-slide bs-title"><div class="bs-orn">${hourglass}</div><small class="bs-k">${esc(CONFIG.EVENT)}</small><h1>${esc(CONFIG.TITLE)}</h1><p class="bs-p" style="--d:.4s">The Ashgrove Collection · One night only</p></section>`;
  }
  function slideHTML(sl) {
    const kick = `<small class="bs-k">${sl.chapter ? `<span class="bs-ch">Chapter ${ROMAN[sl.chapter] || sl.chapter}</span>` : ''}${esc(sl.kicker || '')}</small>`;
    /* a chapter with a picture: words on the left, the picture on the right */
    if (sl.art) return `<section class="bs-slide bs-split"><div class="bs-txt">${kick}<h1>${esc(sl.title || '')}</h1>${paras(sl.body, .7)}</div><div class="bs-art">${Vote.art(sl.art)}</div></section>`;
    if (sl.id === 'end') return `<section class="bs-slide bs-title bs-end"><div class="bs-orn">${hourglass}</div>${kick}<h1>${esc(sl.title)}</h1><p class="bs-p" style="--d:.8s"><i>${esc(CONFIG.TITLE)}</i> · ${esc(CONFIG.SEASON)}</p></section>`;
    return `<section class="bs-slide bs-${esc(sl.id.replace(/[^a-z-]/gi, ''))}${sl.big ? ' has-big' : ''}">${kick}<h1>${esc(sl.title || '')}</h1>
      ${sl.big ? `<div class="bs-big">${esc(sl.big)}</div>` : ''}
      ${sl.bars ? (sl.bars.length ? bars(sl.bars) : '<p class="bs-p">No votes were cast.</p>') : ''}
      ${paras(sl.body, sl.big ? 2.6 : .6)}${sl.results ? results(sl.results) : ''}${sl.awards ? awards(sl.awards) : ''}</section>`;
  }
  /* vote counts tick up as their bars grow */
  function countUp() {
    $$('[data-count]', stage).forEach((el, k) => {
      const to = Number(el.dataset.count), t0 = performance.now() + 500 + k * 220, dur = 1400;
      const step = now => { const p = Math.min(1, Math.max(0, (now - t0) / dur)); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  let shownKey = null;
  function render() {
    const s = DB.get(), i = Reveal.step(s), all = Reveal.slides(s), sl = i >= 0 ? all[i] : null;
    const html = sl ? slideHTML(sl) : waiting(s);
    /* a new slide plays its entrance; the same slide just updates in place */
    const key = sl ? 'slide' + i : 'wait' + (Vote.isOpen(s) ? 'o' : Vote.isClosed(s) ? 'c' : '') + (Vote.arrest(s) ? 'a' : '');
    if (key !== shownKey) { shownKey = key; stage.innerHTML = html; stage._html = html; stage.classList.remove('in'); void stage.offsetWidth; stage.classList.add('in'); countUp(); }
    else if (!sl || !sl.bars) patch(stage, html);
    document.body.classList.toggle('bs-dark', !!sl && (!!sl.big || !!sl.art));
    patch($('#prog'), sl ? all.map((x, k) => `<i class="${k < i ? 'done' : k === i ? 'on' : ''}${x.chapter ? ' ch' : ''}"></i>`).join('') : '');
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
