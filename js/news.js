/* =====================================================================
   THE VANISHING HOUR — the morning paper (news.html), Nov 25.
   The Harbor Ledger, the morning after the gala. Written by the host terminal when the night
   ends (state news, see host.js composePaper) and shown to everyone; while news.closed is set,
   the rest of the site sends players here.
   ===================================================================== */
(function () {
  const root = $('#root');
  const signedIn = () => !!(Session.lastPlayer() || Session.lastHost());
  const P = t => `<p>${esc(t)}</p>`;

  function gate(msg) {
    root.innerHTML = `<main class="np-gate"><div class="np-mast mini"><b>The Harbor Ledger</b></div>
      <p>${esc(msg)}</p>
      <form id="g" autocomplete="off"><input class="np-in" id="code" placeholder="Your code word" autocapitalize="characters" spellcheck="false" aria-label="Your code word"><button class="np-btn">Read the paper</button><div class="np-err" id="err" role="alert"></div></form>
      <small>${esc(COPYRIGHT)}</small></main>`;
    $('#g').addEventListener('submit', async e => {
      e.preventDefault(); const v = $('#code').value, r = await Boot.tryCode(v).catch(() => null);
      if (!r) { $('#err').textContent = "That code word didn't work."; return; }
      Boot.remember(r.kind, v); location.reload();
    });
  }
  function paper(n) {
    /* dated the morning after: a paper closed in the evening carries the next day's date */
    const now = new Date(n.at || Date.now()); if (now.getHours() >= 12) now.setDate(now.getDate() + 1);
    const cols = (n.stories || []).map(st => `<article class="np-story"><h3>${esc(st.head)}</h3>${P(st.body)}</article>`).join('');
    root.innerHTML = `<main class="np">
      <header class="np-head">
        <div class="np-ear left">Morning edition<br><b>Price: one secret</b></div>
        <h1 class="np-mast">${esc(n.paper || 'The Harbor Ledger')}</h1>
        <div class="np-ear right">Harlow County<br><b>Since 1901</b></div>
        <div class="np-dateline"><span>${esc(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</span><span>${esc(n.edition || '')}</span><span>${esc(CONFIG.TITLE)}</span></div>
      </header>
      <section class="np-lead">
        <small class="np-kick">${esc(n.lead.kicker || '')}</small>
        <h2>${esc(n.lead.head)}</h2>
        <p class="np-deck">${esc(n.lead.deck)}</p>
        <div class="np-cols">${(n.lead.body || []).map(P).join('')}</div>
      </section>
      <div class="np-grid">
        <div class="np-main">
          ${cols}
          <article class="np-story np-truth"><h3>The whole story</h3>${(n.truth || []).map(ch => `<div class="np-ch"><small>${esc(ch.kicker)}</small><b>${esc(ch.title)}</b>${(ch.body || []).map(P).join('')}</div>`).join('')}</article>
        </div>
        <aside class="np-side">
          <div class="np-box"><h4>How every side did</h4>${(n.results || []).map(r => `<div class="np-res ${r.win ? 'win' : 'lose'}"><b>${r.win ? 'Won' : 'Lost'}</b><span><strong>${esc(r.who)}.</strong> ${esc(r.why)}</span></div>`).join('')}</div>
          ${(n.awards || []).length ? `<div class="np-box"><h4>The night's honors</h4>${n.awards.map(a => `<div class="np-aw"><small>${esc(a.title)}</small><b>${esc(a.who)}</b><span>${esc(a.why)}</span></div>`).join('')}</div>` : ''}
          <div class="np-box"><h4>The vote</h4><p>${n.vote.votes} ballots were cast.${n.vote.topKiller ? ` The room named <b>${esc(n.vote.topKiller)}</b> as the killer` : ''}${n.vote.topThief ? ` and <b>${esc(n.vote.topThief)}</b> for the theft` : ''}.</p></div>
          ${(n.sources || []).length ? `<div class="np-box np-scoop"><h4>Sources say</h4>${n.sources.map(P).join('')}</div>` : ''}
        </aside>
      </div>
      <section class="np-cast"><h4>Starring</h4><div class="np-cast-l">${(n.cast || []).map(c => `<div><b>${esc(c.name)}</b>${c.pronouns ? ` <i>(${esc(c.pronouns)})</i>` : ''}<span>${esc(c.role)}</span>${c.player ? `<em>played by ${esc(c.player)}</em>` : ''}</div>`).join('')}</div></section>
      <footer class="np-foot">${esc(CONFIG.TITLE)} · ${esc(COPYRIGHT)}<br>Thank you for playing.</footer>
    </main>`;
    document.title = (n.lead.head || 'The Harbor Ledger') + ' · The Harbor Ledger';
  }
  /* anyone can read the paper once it's out, no code word needed (Nov 26): the database lets anyone
     read state/pub/news (one rule, see private/database.rules.json). If that rule isn't in place yet,
     visitors get the code-word gate as before. */
  function publicNews() {
    if (CONFIG.BACKEND === 'local') return DB.loaded().then(() => DB.get().news || false);   /* false = not out yet, null = couldn't read */
    try {
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(CONFIG.FIREBASE);
      return firebase.database(app).ref('state/pub/news').once('value').then(s => s.val() || false, () => null);
    } catch (e) { return Promise.resolve(null); }
  }
  if (!signedIn()) {
    root.innerHTML = '<main class="np-gate"><div class="np-mast mini"><b>The Harbor Ledger</b></div><p>Fetching the morning paper…</p></main>';
    return publicNews().then(n => n && n.lead ? paper(n) : gate(n === null ? 'The night is over. Enter your code word to read the morning paper.' : "The morning paper isn't out yet. Check back when the night is over."));
  }
  DB.loaded().then(() => {
    const draw = () => { const n = DB.get().news; if (n && n.lead) paper(n); else root.innerHTML = `<main class="np-gate"><div class="np-mast mini"><b>The Harbor Ledger</b></div><p>The morning paper isn't out yet. Check back when the night is over.</p><a class="np-btn" href="app.html">Back to the game</a><small>${esc(COPYRIGHT)}</small></main>`; };
    draw(); DB.on(draw);
  });
})();
