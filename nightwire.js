/* =====================================================================
   THE VANISHING HOUR — NIGHTWIRE and NightBank.
   The criminals' dark web: a data market, wallets, NightBank transfers,
   the private sale of the painting, and the crew's burner chat.
   Buyers and Harper only get NightBank (a small tab in their app).
   Rules, wallets and market items live in story.js (STORY.nightwire).

   Data lives under state.nw:
     tx/{id}       { from, to, amt, memo, by, at, item }   to/from = wallet id, or 'market'
     bought/{wallet}/{item}  { by, at }
     sale          { ask, pitched:[wallet ids], by, at, sold:{ to, amt, at } }
     bids/{id}     { from, amt, by, at }
     chat/{id}     { by, text, at }
   ===================================================================== */
const NW = (() => {
  const C = () => STORY.nightwire || {};
  const N = s => s.nw || {};
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const first = id => { const c = G.byId(id); return c ? c.name.split(' ')[0] : id; };

  /* ---------- wallets ----------
     The special accounts from story.js, plus a personal NightBank account for everyone
     they don't cover, holding that person's spending money (story.js > spending). */
  let ALL = null;
  const W = () => {
    if (ALL) return ALL;
    const base = Object.assign({}, C().wallets || {}), sp = C().spending || {}, def = sp.defaults || {};
    const covered = c => Object.values(base).some(w => [].concat(w.members).some(m => m === c.id || m === 'g:' + c.group));
    STORY.characters.forEach(c => { if (!covered(c)) base[c.id] = { name: c.name, members: [c.id], start: sp[c.id] != null ? sp[c.id] : (def[c.group] || 0), bank: true, personal: true }; });
    return (ALL = base);
  };
  /** The wallet this character can spend from (or null). */
  const walletOf = me => { const e = Object.entries(W()).find(([, w]) => [].concat(w.members).some(m => m === me.id || m === 'g:' + me.group)); return e ? e[0] : null; };
  const wname = id => id === 'market' ? 'NIGHTWIRE market' : id === 'host' ? 'NightBank' : id === 'casino' ? 'Charity casino' : id === 'freeup' ? 'Your investments' : W()[id] ? W()[id].name : id;
  /** who you can pay by name: everyone outside your own account. Secret accounts are paid by handle. */
  const payees = (me, w) => STORY.characters.filter(c => c.id !== me.id && walletOf(c) !== w).sort((a, b) => a.name.localeCompare(b.name));
  const byHandle = h => { const k = String(h || '').trim().replace(/^@/, '').toLowerCase(); return Object.keys(W()).find(id => W()[id].name.toLowerCase() === k) || null; };
  const txs = s => Object.entries(N(s).tx || {}).map(([id, t]) => Object.assign({ id }, t)).sort((a, b) => b.at - a.at);
  /* escrow: money marked hold:'<phase id>' leaves the sender at once but reaches the
     receiver only when that phase starts (the painting sale, held until 1:45) */
  const held = (s, t) => { if (!t.hold) return false; const r = Clock.read(s), i = STORY.phases.findIndex(p => p.id === t.hold); return r.state !== 'over' && r.i < i; };
  /* game minutes since the night began (0 before it starts) */
  const nightNow = s => { const r = Clock.read(s); return r.state === 'before' ? 0 : r.state === 'over' ? 1e9 : r.nightMin; };
  /* money tied up: freeUp[w] = { amt, wait }; state nw/freeup/{w} = { by, at, start, ready, amt, now?, told? } */
  const fuCfg = w => (C().freeUp || {})[w] || null;
  const fuOf = (s, w) => (N(s).freeup || {})[w] || null;
  const fuReady = (s, f) => !!f && (!!f.now || nightNow(s) >= f.ready);
  function balance(s, w) { const st = (W()[w] || {}).start || 0, f = fuOf(s, w); return txs(s).reduce((b, t) => b + (t.to === w && !held(s, t) ? t.amt : 0) - (t.from === w ? t.amt : 0), st + (fuReady(s, f) ? f.amt : 0)); }
  /* freezes (nw/frozen/{w} = { by: 'host'|'fbi'|'court', who, at, loan? }) and the thrown-out list (cast/{id}/out) */
  const frozen = (s, w) => (N(s).frozen || {})[w] || null;
  const isOut = (s, id) => !!(s.cast && s.cast[id] && s.cast[id].out);
  const FROZE = { fbi: 'by the FBI', court: 'by court order (an unpaid loan)', host: 'by the bank' };
  /** Why this person can't move money from this account right now (or null). A court freeze still lets you repay. */
  function blockedWhy(s, me, w, repay) {
    if (isOut(s, me.id)) return "You've been thrown out of the gala, so your account is locked for the rest of the night.";
    const f = frozen(s, w);
    if (f && !(repay && f.by === 'court')) return `This account is frozen ${FROZE[f.by] || ''}. You can still receive money, but you can't move any${f.by === 'court' ? ' except to repay the loan, which lifts the freeze' : ''}.`;
    return null;
  }
  function freeze(u, w, by, who, loan) {
    u['nw/frozen/' + w] = { by, who: who || null, at: Date.now(), loan: loan || null };
    alertWallet(u, w, 'Account frozen', `Your NightBank account has been frozen ${FROZE[by] || ''}. You can't send, bid, bet or borrow until it's lifted.`);
    Clock.log(u, 'nightwire', `${wname(w)}'s account was frozen ${FROZE[by] || ''}${who && G.byId(who) ? ' (' + G.byId(who).name + ')' : ''}.`);
  }
  function unfreeze(u, w, who, quiet) {
    u['nw/frozen/' + w] = null;
    alertWallet(u, w, 'Account unfrozen', 'Your NightBank account is working again.');
    if (!quiet) Clock.log(u, 'nightwire', `${wname(w)}'s account was unfrozen${who && G.byId(who) ? ' by ' + G.byId(who).name : who === 'host' ? ' by the host' : ''}.`);
  }
  /* Cameron's loans: nw/loans/{id} = { lender, borrower, to, amt, rate, owed, term, at, by, status: offer|active|declined|withdrawn|paid, due?, court?, named?, lateTold? } */
  const LC = () => C().lending || {};
  const loans = s => Object.entries(N(s).loans || {}).map(([id, l]) => Object.assign({ id }, l)).sort((a, b) => b.at - a.at);
  const loanById = (s, id) => { const l = (N(s).loans || {})[id]; return l ? Object.assign({ id }, l) : null; };
  const isLate = (s, l) => l.status === 'active' && nightNow(s) > l.due;
  const isLender = me => !!LC().lender && me.id === LC().lender;
  const escrowed = (s, w) => txs(s).filter(t => t.to === w && held(s, t)).reduce((n, t) => n + t.amt, 0);
  const releaseAt = () => { const p = STORY.phases.find(x => x.id === C().escrowUntil); return p ? hmm(Clock.startOf(DB.get(), STORY.phases.indexOf(p))) : ''; };
  const membersOf = w => STORY.characters.filter(c => [].concat((W()[w] || {}).members || []).some(m => m === c.id || m === 'g:' + c.group)).map(c => c.id);
  function pendingState(s, w) {
    const p = (W()[w] || {}).pending; if (!p) return null;
    const r = Clock.read(s), idx = STORY.phases.findIndex(x => x.id === p.voidAt);
    const sold = N(s).sale && N(s).sale.sold;
    return { amount: p.amount, label: p.label, void: idx >= 0 && r.i >= idx, sold: !!sold };
  }

  /* ---------- the market ---------- */
  const phaseIdx = id => STORY.phases.findIndex(p => p.id === id);
  const available = (s, it) => !it.from || Clock.read(s).i >= phaseIdx(it.from);
  const owns = (s, w, item) => !!(((N(s).bought || {})[w] || {})[item]);
  /** each file sells once: the wallet that bought it, or null */
  const soldTo = (s, item) => Object.keys(N(s).bought || {}).find(w => (N(s).bought[w] || {})[item]) || null;
  const marketFor = me => (C().market || []).filter(it => it.for.includes(me.group));

  /* ---------- shared writes ---------- */
  function alertWallet(u, w, title, text, except) { membersOf(w).filter(id => id !== except).forEach(id => { u['feed/' + uid('w')] = { to: [id], title, text, at: Date.now(), kind: 'nw' }; }); }
  function transfer(u, from, to, amt, memo, by, toName, hold) {
    u['nw/tx/' + uid('t')] = { from, to, amt, memo: memo || null, by, at: Date.now(), toName: toName || null, hold: hold || null };
    alertWallet(u, to, 'NightBank', `${money(amt)} received from ${wname(from)}${memo ? ': "' + memo + '"' : '.'}`);
    Clock.log(u, 'nightwire', `${G.byId(by) ? G.byId(by).name : by} sent ${money(amt)} from ${wname(from)} to ${wname(to)}${memo ? ' ("' + memo + '")' : ''}.`);
  }

  /* ---------- screens ---------- */
  const newUI = () => ({ sub: 'market', bsub: 'acct', open: null, send: { to: '', amt: '', memo: '', handle: '' }, bid: '', ask: '', pitch: [], chat: '', err: '', errFor: '', sent: null,
    lend: { to: '', amt: '', rate: 150, term: 30 }, unf: '', cs: null });
  /* an error shows only in the panel it belongs to (send, bid, lend, freeup, loan) */
  const errBox = (ui, key) => `<div class="err" role="alert">${(ui.errFor || 'send') === key ? esc(ui.err) : ''}</div>`;
  const say = (ui, key, msg) => { ui.err = msg; ui.errFor = key; };
  const handleLine = (s, me, w) => `<div class="nw-hd"><span><b>●</b> 3 relays · ${80 + (Date.now() / 7000 | 0) % 60} ms</span><span class="nw-amber">auto-wipe 23:59</span></div><div class="nw-handle">handle <b>${esc(wname(w))}</b>${me.group === 'crew' ? ' · client verified' : ''}</div>`;
  function subs(me, ui) {
    const list = me.group === 'crew' ? [['market', 'MARKET'], ['wallet', 'WALLET'], ['sale', 'SALE'], ['burner', 'BURNER']] : [['market', 'MARKET'], ['wallet', 'WALLET']];
    return `<div class="nw-tabs" style="grid-template-columns:repeat(${list.length},1fr)">${list.map(([k, l]) => `<button data-nw-sub="${k}" aria-current="${ui.sub === k}">${l}</button>`).join('')}</div>`;
  }
  function walletCard(s, w) {
    const p = pendingState(s, w), b = balance(s, w), esc_ = escrowed(s, w);
    return `<div class="nw-card"><div class="nw-row nw-k"><span>BALANCE</span><span>${esc(wname(w))}</span></div>
      <div class="nw-big">${money(b)}</div>
      ${esc_ ? `<div class="nw-row" style="border-top:1px dashed var(--line);padding-top:8px"><span class="nw-k">IN ESCROW · RELEASED ${esc(releaseAt())}</span><span class="nw-amber">${money(esc_)}</span></div>` : ''}
      ${p ? `<div class="nw-row" style="border-top:1px dashed var(--line);padding-top:8px"><span class="nw-k">${esc(p.label.toUpperCase())}</span><span class="${p.void ? 'nw-red' : 'nw-hi'}">${p.void ? 'VOID' : money(p.amount)}</span></div>
        <div class="${p.void ? 'nw-red' : 'nw-amber'}" style="font-size:11px">${p.void ? '! Your client is gone. That money is never coming.' : '! If the client goes dark, the delivery payment is void.'}</div>` : ''}</div>`;
  }
  function marketView(s, me, ui) {
    const w = walletOf(me), items = marketFor(me);
    const vis = items.filter(it => available(s, it)), soon = items.length - vis.length;
    return `${walletCard(s, w)}<div class="nw-row"><span class="nw-hi"><b>&gt; market // data drops</b></span><span class="nw-k">${vis.length} listed</span></div>
      <div class="nw-items">${vis.map(it => {
        const mine = owns(s, w, it.id), openIt = ui.open === it.id, gone = !mine && !!soldTo(s, it.id);
        return `<div class="nw-item${it.from ? ' hot' : ''}${gone ? ' gone' : ''}">
          <div class="nw-row"><b class="nw-it">${esc(it.title.toUpperCase())}</b>${gone ? '<span class="nw-red">SOLD</span>' : it.from && !mine ? '<span class="nw-hot">NEW</span>' : '<span class="nw-k">1 copy</span>'}</div>
          <div class="nw-k">${esc(it.teaser)}</div>
          ${mine && openIt ? `<div class="nw-body${ui.fresh === it.id ? ' fresh' : ''}">${esc(it.body)}</div>` : ''}
          <div class="nw-row"><span class="nw-k">seller ${esc(it.seller)} · ★ 4.${(it.price / 1000 | 0) % 9 + 1}</span>
            ${mine ? `<button class="nw-btn ghost" data-nw-open="${it.id}">${openIt ? 'HIDE' : 'OPEN FILE'}</button>` : gone ? '<span class="nw-k">sold to another buyer</span>' : `<button class="nw-btn" data-nw-buy="${it.id}">${money(it.price)}</button>`}</div></div>`;
      }).join('')}</div>
      ${soon ? `<div class="nw-k" style="text-align:center;padding:8px">${soon} more ${soon === 1 ? 'drop' : 'drops'} coming later tonight.</div>` : ''}
      <div class="err" role="alert">${esc(ui.err)}</div>`;
  }
  const payeeOptions = (me, w, ui) => `<option value="">${'Choose someone…'}</option>${payees(me, w).map(c => `<option value="${c.id}" ${ui.send.to === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}<option value="__handle" ${ui.send.to === '__handle' ? 'selected' : ''}>Another account (enter its handle)</option>`;
  function sendForm(s, me, ui, w) {
    return `<form class="nw-card nw-form" data-nw-form="send"><div class="nw-hi"><b>&gt; nightbank // send</b></div>
      <select class="field" data-nw="to" aria-label="Send to">${payeeOptions(me, w, ui)}</select>
      ${ui.send.to === '__handle' ? `<input class="field" data-nw="handle" placeholder="account handle" value="${esc(ui.send.handle)}" aria-label="Account handle" autocapitalize="off" spellcheck="false">` : ''}
      <input class="field" data-nw="amt" inputmode="decimal" placeholder="amount ($, or 250K / 1.5M)" value="${esc(ui.send.amt)}" aria-label="Amount" autocomplete="off">
      <input class="field" data-nw="memo" maxlength="80" placeholder="memo (optional)" value="${esc(ui.send.memo)}" aria-label="Memo">
      <button class="nw-btn" type="submit">&gt; send</button><div class="err" role="alert">${esc(ui.err)}</div></form>`;
  }
  function ledger(s, w) {
    const mine = txs(s).filter(t => t.from === w || t.to === w);
    return `<div class="nw-row"><span class="nw-hi"><b>&gt; ledger</b></span><span class="nw-k">${mine.length}</span></div><div class="nw-card">${mine.map(t => {
      const out = t.from === w;
      return `<div class="nw-tx"><span class="nw-k">${esc(wallTime(t.at))}</span><span style="flex:1;min-width:0">${out ? 'to' : 'from'} ${esc(out ? (t.toName || wname(t.to)) : wname(t.from))}${t.memo ? ` <span class="nw-k">"${esc(t.memo)}"</span>` : ''}</span><span class="${out ? 'nw-red' : 'nw-hi'}">${out ? '−' : '+'}${money(t.amt)}</span></div>`;
    }).join('') || '<div class="nw-k">No activity.</div>'}</div>`;
  }
  function nwLoans(s, me, w) {
    const mine = loans(s).filter(l => l.to === w && (l.status === 'offer' || l.status === 'active'));
    if (!mine.length) return '';
    return `<div class="nw-row"><span class="nw-hi"><b>&gt; loans // ${esc(wname(LC().lender).toLowerCase())}</b></span><span class="nw-k">${mine.length}</span></div>` + mine.map(l => l.status === 'offer'
      ? `<div class="nw-item"><div>${money(l.amt)} at ${l.rate}% · repay ${money(l.owed)}, due ${l.term} min after you accept</div><div class="nw-row" style="justify-content:flex-start"><button class="nw-btn" data-nw-loanok="${l.id}">ACCEPT</button><button class="nw-btn ghost" data-nw-loanno="${l.id}">DECLINE</button></div></div>`
      : `<div class="nw-item"><div class="nw-row"><span>owe ${money(l.owed)}</span><span class="${isLate(s, l) ? 'nw-red' : 'nw-amber'}">${isLate(s, l) ? 'OVERDUE' : 'DUE ' + hmm(l.due)}</span></div><button class="nw-btn" data-nw-repay="${l.id}">REPAY ${money(l.owed)}</button></div>`).join('');
  }
  /* Jules: unfreeze one account, once */
  function unfreezeTool(s, me, ui) {
    if (!(C().unfreezers || []).includes(me.id)) return '';
    const used = (N(s).unfroze || {})[me.id], list = Object.keys(N(s).frozen || {});
    return `<form class="nw-card nw-form" data-nw-form="unfreeze"><div class="nw-hi"><b>&gt; exploit // unfreeze an account</b></div>
      ${used ? `<div class="nw-k">used: ${esc(wname(used.w))} unfrozen at ${esc(wallTime(used.at))}. one shot, gone.</div>`
        : list.length ? `<select class="field" data-nw="unf" aria-label="Account to unfreeze"><option value="">choose a frozen account…</option>${list.map(x => `<option value="${x}" ${ui.unf === x ? 'selected' : ''}>${esc(wname(x))}</option>`).join('')}</select><button class="nw-btn" type="submit">&gt; run exploit (1 use)</button>`
        : '<div class="nw-k">no frozen accounts on the network. 1 use left.</div>'}</form>`;
  }
  function walletView(s, me, ui) {
    const w = walletOf(me);
    return walletCard(s, w) + nwLoans(s, me, w) + unfreezeTool(s, me, ui) + sendForm(s, me, ui, w) + ledger(s, w);
  }

  function saleView(s, me, ui) {
    const sale = N(s).sale, bids = Object.entries(N(s).bids || {}).map(([id, b]) => Object.assign({ id }, b)).sort((a, b) => b.amt - a.amt);
    const goal = C().goal || 0, got = sale && sale.sold ? sale.sold.amt : 0;
    const prog = `<div class="nw-card"><div class="nw-row nw-k"><span>SALE GOAL</span><span>${money(goal)}</span></div><div class="nw-big">${money(got)}</div>
      <div class="nw-grid">${Array.from({ length: 20 }, (_, i) => `<i class="${i < Math.round(got / goal * 20) ? 'on' : ''}"></i>`).join('')}</div></div>`;
    if (!sale) return prog + `<form class="nw-card nw-form" data-nw-form="list"><div class="nw-hi"><b>&gt; open a private sale</b></div><div class="nw-k">${esc(C().saleItem)}</div>
        <input class="field" data-nw="ask" inputmode="numeric" placeholder="asking price ($)" value="${esc(ui.ask)}" aria-label="Asking price">
        <div class="nw-k">Pitch it to:</div>${(C().buyers || []).map(b => `<label class="check"><input type="checkbox" data-nw-pitch="${b}" ${ui.pitch.includes(b) ? 'checked' : ''}>${esc(wname(b))}</label>`).join('')}
        <button class="nw-btn" type="submit">&gt; open sale</button><div class="err" role="alert">${esc(ui.err)}</div></form>`;
    if (sale.sold) return prog + `<div class="nw-card"><div class="nw-hi"><b>SOLD</b></div><div>${esc(C().saleItem)} sold to <b>${esc(wname(sale.sold.to))}</b> for ${money(sale.sold.amt)}.</div><div class="nw-k">${escrowed(s, 'crew') ? `The money is in escrow until ${esc(releaseAt())}. ` : ''}Now get it out of the building.</div></div>`;
    return prog + `<div class="nw-card"><div class="nw-row"><span class="nw-hi"><b>&gt; sale open</b></span><span class="nw-k">asking ${money(sale.ask)}</span></div>
        <div class="nw-k">Pitched to: ${sale.pitched.map(b => esc(wname(b))).join(', ')}</div>
        <div class="nw-row" style="gap:6px;flex-wrap:wrap">${(C().buyers || []).filter(b => !sale.pitched.includes(b)).map(b => `<button class="nw-btn ghost" data-nw-addpitch="${b}">+ ${esc(wname(b))}</button>`).join('')}</div></div>
      <div class="nw-row"><span class="nw-hi"><b>&gt; bids</b></span><span class="nw-k">${bids.length}</span></div>
      ${bids.map(b => `<div class="nw-item"><div class="nw-row"><b>${esc(wname(b.from))}</b><span class="nw-hi">${money(b.amt)}</span></div><div class="nw-row"><span class="nw-k">${esc(wallTime(b.at))}</span><button class="nw-btn" data-nw-accept="${b.id}">ACCEPT</button></div></div>`).join('') || '<div class="nw-k" style="padding:6px 2px">No bids yet. Buyers see your offer in their NightBank.</div>'}
      <button class="nw-btn ghost" data-nw-close>CLOSE THE SALE</button><div class="err" role="alert">${esc(ui.err)}</div>`;
  }
  function burnerView(s, me, ui) {
    const msgs = Object.values(N(s).chat || {}).sort((a, b) => a.at - b.at).slice(-60);
    return `<div class="nw-card nw-chat">${msgs.map(m => `<div><span class="nw-k">${esc(wallTime(m.at))} ${esc(first(m.by).toLowerCase())}&gt;</span> ${esc(m.text)}</div>`).join('') || '<div class="nw-k">burner open. crew only. no logs.</div>'}</div>
      <form class="nw-input" data-nw-form="chat"><span class="nw-hi">&gt;</span><input data-nw="chat" value="${esc(ui.chat)}" maxlength="240" placeholder="message the crew" aria-label="Message the crew"><button class="nw-btn" type="submit">SEND</button></form>`;
  }
  function render(s, me, ui) {
    const w = walletOf(me); if (!w) return '<div class="nw-card">No NIGHTWIRE account.</div>';
    const body = ui.sub === 'wallet' ? walletView(s, me, ui) : ui.sub === 'sale' && me.group === 'crew' ? saleView(s, me, ui) : ui.sub === 'burner' && me.group === 'crew' ? burnerView(s, me, ui) : marketView(s, me, ui);
    const why = blockedWhy(s, me, w);
    return `<div class="nw">${handleLine(s, me, w)}${subs(me, ui)}${why ? `<div class="nw-card nw-lock"><b>! ${isOut(s, me.id) ? 'ACCESS REVOKED' : 'WALLET FROZEN'}</b><span>${esc(why)}</span></div>` : ''}${body}</div>`;
  }

  /* ---------- NightBank ----------
     Everyone outside NIGHTWIRE gets it as its own tab. It looks like a real private bank:
     Account (card, send money, loans, money tied up, activity), Casino (casino.js), and
     Lending for Cameron. */
  const tier = b => b >= 10000000 ? 'Black' : b >= 1000000 ? 'Platinum' : b >= 100000 ? 'Gold' : 'Classic';
  const last4 = w => { let h = 7; for (const ch of w) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return String(h % 9000 + 1000); };
  const ini = n => String(n).split(/[\s_]+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('') || '•';
  const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const waitLabel = m => m >= 60 && m % 60 === 0 ? (m / 60) + (m === 60 ? ' hour' : ' hours') : m + ' minutes';
  const minsLeft = until => Math.max(1, Math.round(until));
  const dueLabel = (s, l) => l.due > nightNow(s) ? `due at ${hmm(l.due)} · ${minsLeft(l.due - nightNow(s))} min left` : 'overdue';
  const bname = l => (G.byId(l.borrower) || {}).name || wname(l.to);
  const isCasinoTx = t => t.from === 'casino' || t.to === 'casino';
  const casinoOn = s => typeof Casino !== 'undefined' && Casino.isOpen(s);

  function renderBank(s, me, ui) {
    const w = walletOf(me); if (!w) return '<div class="nb"><div class="nb-panel">No NightBank account.</div></div>';
    const tabs = [['acct', 'Account'], ['casino', 'Casino']].concat(isLender(me) ? [['lend', 'Lending']] : []);
    if (!tabs.some(t => t[0] === ui.bsub)) ui.bsub = 'acct';
    const why = blockedWhy(s, me, w), out = isOut(s, me.id), cs = ui.bsub === 'casino';
    const body = cs ? (typeof Casino !== 'undefined' ? Casino.render(s, me, ui, w) : '') : ui.bsub === 'lend' ? lendView(s, me, ui, w) : acctView(s, me, ui, w);
    return `<div class="nb${cs ? ' nb-casino' : ''}">
      <div class="nb-top"><div class="nb-brand"><svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="nbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8f7bff"/><stop offset="1" stop-color="#36d1c4"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#nbg)"/><path d="M19.5 8.5a8 8 0 1 0 4 14.6A9.5 9.5 0 0 1 19.5 8.5z" fill="#fff"/></svg><div><b>NightBank</b><small>${cs ? 'Private Banking · Casino floor' : 'Private Banking'}</small></div></div>
        <span class="nb-secure ${why ? 'bad' : ''}">${LOCK}${why ? (out ? 'Locked' : 'Frozen') : 'Secured'}</span></div>
      <div class="nb-seg" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-nb-sub="${k}" aria-selected="${ui.bsub === k}">${l}${k === 'casino' && casinoOn(s) ? '<i class="nb-live" title="Tables open"></i>' : ''}${k === 'acct' && loans(s).some(x => x.to === w && x.status === 'offer') ? '<i class="nb-dot" title="Loan offer waiting"></i>' : ''}</button>`).join('')}</div>
      ${why ? `<div class="nb-alert">${LOCK}<div><b>${out ? 'Account locked' : 'Account frozen'}</b><p>${esc(why)}</p></div></div>` : ''}
      ${body}</div>`;
  }

  /* money tied up in investments: free it up once, then wait */
  function freeUpPanel(s, me, w, ui) {
    const cfg = fuCfg(w); if (!cfg) return '';
    const f = fuOf(s, w), now = nightNow(s);
    if (!f) return `<div class="nb-panel nb-fu"><div class="nb-h">Tied up in investments <span class="nb-tag">Not liquid</span></div>
      <div class="nb-fu-amt">${money(cfg.amt)}</div>
      <p class="nb-p">Most of your fortune is in property, stock and companies. You can sell some of it tonight, but the money takes <b>${waitLabel(cfg.wait)}</b> of game time to clear.${cfg.why ? ' ' + esc(cfg.why) : ''} One request per night, so choose your moment.</p>
      <button type="button" class="btn nb-go alt" data-nw-freeup>Free up ${money(cfg.amt)}</button>${errBox(ui, 'freeup')}</div>`;
    if (fuReady(s, f)) return `<div class="nb-panel nb-fu done"><div class="nb-h">Investments <span class="nb-tag ok">Cleared</span></div><p class="nb-p">✓ ${money(f.amt)} cleared at ${hmm(f.now ? f.start : f.ready)} and is in your balance.</p></div>`;
    const pct = Math.min(100, Math.max(0, (now - f.start) / Math.max(1, f.ready - f.start) * 100));
    return `<div class="nb-panel nb-fu"><div class="nb-h">Freeing up money <span class="nb-tag hot">Clearing</span></div>
      <div class="nb-fu-amt">${money(f.amt)}</div>
      <div class="nb-bar"><i style="width:${pct.toFixed(0)}%"></i></div>
      <div class="nb-row nb-sub"><span>Clears at ${hmm(f.ready)} on the game clock</span><span>${minsLeft(f.ready - now)} min left</span></div></div>`;
  }
  /* loans the borrower sees (offers to accept, loans to repay) */
  function loanPanel(s, me, w, ui) {
    const mine = loans(s).filter(l => l.to === w && (l.status === 'offer' || l.status === 'active'));
    if (!mine.length) return '';
    return `<div class="nb-panel nb-loan"><div class="nb-h">Loans <span class="nb-count">${mine.length}</span></div>${mine.map(l => l.status === 'offer'
      ? `<div class="nb-li"><div><b>${esc(wname(l.lender))} offers you ${money(l.amt)}</b><small>${l.rate}% interest · you'd repay ${money(l.owed)} within ${l.term} minutes of accepting</small></div>
          <div class="nb-li-a"><button type="button" class="btn small primary" data-nw-loanok="${l.id}">Accept</button><button type="button" class="btn small ghost" data-nw-loanno="${l.id}">Decline</button></div></div>`
      : `<div class="nb-li ${isLate(s, l) ? 'late' : ''}"><div><b>You owe ${money(l.owed)}</b><small>${esc(wname(l.lender))} · borrowed ${money(l.amt)} at ${l.rate}% · ${isLate(s, l) ? `<span class="neg">OVERDUE${l.court ? ' · account frozen by court order' : ''}</span>` : esc(dueLabel(s, l))}</small></div>
          <div class="nb-li-a"><button type="button" class="btn small primary" data-nw-repay="${l.id}">Repay ${money(l.owed)}</button></div></div>`).join('')}${errBox(ui, 'loan')}</div>`;
  }
  function acctView(s, me, ui, w) {
    const b = balance(s, w), sale = N(s).sale, myBids = Object.values(N(s).bids || {}).filter(x => x.from === w).sort((a, c) => c.at - a.at);
    const all = txs(s).filter(t => t.from === w || t.to === w), f = fuOf(s, w), freed = fuReady(s, f) ? f.amt : 0;
    /* casino play and house proceeds collapse into one line each, so the activity stays readable */
    const plain = all.filter(t => !isCasinoTx(t)), play = all.filter(t => isCasinoTx(t) && !t.house), house = all.filter(t => t.house);
    const playNet = play.reduce((n, t) => n + (t.to === w ? t.amt : -t.amt), 0), houseIn = house.reduce((n, t) => n + t.amt, 0);
    const inSum = plain.filter(t => t.to === w).reduce((n, t) => n + t.amt, freed + houseIn + Math.max(0, playNet));
    const outSum = plain.filter(t => t.from === w).reduce((n, t) => n + t.amt, Math.max(0, -playNet));
    let offer = '';
    if (sale && (sale.pitched || []).includes(w)) {
      offer = sale.sold ? `<div class="nb-panel nb-offer"><div class="nb-h">Private offer <span class="nb-tag">Closed</span></div><p>${sale.sold.to === w ? `Your bid of ${money(sale.sold.amt)} was accepted. The seller will arrange collection.` : 'This item sold to another buyer.'}</p></div>`
        : `<form class="nb-panel nb-offer" data-nw-form="bid"><div class="nb-h">Private offer <span class="nb-tag hot">Escrow</span></div>
          <p>A private seller is offering <b>${esc(C().saleItem)}</b>. Asking ${money(sale.ask)}. Funds are held in escrow until the seller accepts.</p>
          <label class="nb-l">Your bid<div class="nb-amt"><span>$</span><input class="field" data-nw="bid" inputmode="decimal" placeholder="e.g. 25M" value="${esc(ui.bid)}" aria-label="Your bid" autocomplete="off"></div></label>
          <button class="btn primary nb-go" type="submit">Place bid</button>
          ${myBids.length ? `<div class="nb-sub">Your bids: ${myBids.map(x => money(x.amt)).join(', ')}</div>` : ''}${errBox(ui, 'bid')}</form>`;
    }
    const row = (who, memo, at, amt, out, av) => `<div class="nb-tx"><span class="nb-av${av ? ' ' + av : ''}">${av === 'cs' ? '♠' : esc(ini(who))}</span><div class="nb-tx-m"><b>${esc(who)}</b><small>${memo ? esc(memo) + ' · ' : ''}${esc(at)}</small></div><span class="nb-amt-v ${out ? 'neg' : 'pos'}">${out ? '−' : '+'}${money(amt)}</span></div>`;
    const lastAt = list => list.length ? 'last ' + wallTime(list[0].at) : '';
    const rows = [
      play.length ? row('Charity casino', `${play.filter(t => t.from === w).length} bets`, lastAt(play), Math.abs(playNet), playNet < 0, 'cs') : '',
      house.length ? row('Charity casino proceeds', `${house.length} payments`, lastAt(house), houseIn, false, 'cs') : '',
      freed ? row('Your investments', 'Freed up', 'cleared ' + hmm(f.now ? f.start : f.ready), freed, false) : '',
      ...plain.map(t => { const out = t.from === w, who = out ? (t.toName || wname(t.to)) : wname(t.from); return row(who, t.memo, wallTime(t.at), t.amt, out); })
    ].join('') || '<div class="nb-empty">No activity yet. Money you send or receive tonight shows up here.</div>';
    const count = plain.length + (play.length ? 1 : 0) + (house.length ? 1 : 0) + (freed ? 1 : 0);
    return `<div class="nb-grid"><div class="nb-a">
        <div class="nb-card t-${tier(b).toLowerCase()}"><div class="nb-shine" aria-hidden="true"></div>
          <div class="nb-row"><span class="nb-holder">${esc(me.name)}</span><svg class="nb-cl" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7c2.5 3 2.5 7 0 10M12 5c3.5 4 3.5 10 0 14M16 3c4.5 5 4.5 13 0 18"/></svg></div>
          <span class="nb-chip" aria-hidden="true"></span>
          <div class="nb-bal"><small>Available balance</small><b>${money(b)}</b></div>
          <div class="nb-row"><span class="nb-num">•••• •••• •••• ${last4(w)}</span><span class="nb-tier">${tier(b)}</span></div></div>
        <div class="nb-stats"><div><small>Money in tonight</small><b class="pos">+${money(inSum)}</b></div><div><small>Money out tonight</small><b class="neg">−${money(outSum)}</b></div></div>
        ${loanPanel(s, me, w, ui)}${offer}${freeUpPanel(s, me, w, ui)}
      </div><div class="nb-b">
        <form class="nb-panel" data-nw-form="send"><div class="nb-h">Send money</div>
          <label class="nb-l">To<select class="field" data-nw="to" aria-label="Send to">${payeeOptions(me, w, ui)}</select></label>
          ${ui.send.to === '__handle' ? `<label class="nb-l">Account handle<input class="field" data-nw="handle" placeholder="e.g. their account handle" value="${esc(ui.send.handle)}" autocapitalize="off" spellcheck="false"></label>` : ''}
          <label class="nb-l">Amount<div class="nb-amt"><span>$</span><input class="field" data-nw="amt" inputmode="decimal" placeholder="0" value="${esc(ui.send.amt)}" aria-label="Amount" autocomplete="off"></div></label>
          <label class="nb-l">Note <i>(optional)</i><input class="field" data-nw="memo" maxlength="80" placeholder="What's it for?" value="${esc(ui.send.memo)}"></label>
          <button class="btn primary nb-go" type="submit">Send</button>
          ${ui.sent ? `<div class="nb-ok">✓ Sent ${esc(ui.sent)}</div>` : ''}${errBox(ui, 'send')}</form>
        <div class="nb-panel"><div class="nb-h">Activity <span class="nb-count">${count}</span></div>${rows}</div>
      </div></div>
      <p class="nb-fine">NightBank Private · Accounts are confidential. Only you can see your balance. Tip: type amounts like 250K or 1.5M.</p>`;
  }

  /* ---------- Cameron's lending desk ---------- */
  function lendView(s, me, ui, w) {
    const L = LC(), mine = loans(s).filter(l => l.lender === w), x = ui.lend;
    const owe = Math.round((amount(x.amt) || 0) * (1 + x.rate / 100));
    const outNow = mine.filter(l => l.status === 'active').reduce((n, l) => n + l.owed, 0);
    const profit = mine.filter(l => l.status === 'paid').reduce((n, l) => n + l.owed - l.amt, 0);
    const late = mine.filter(l => isLate(s, l)).length;
    const busy = new Set(mine.filter(l => l.status === 'offer' || l.status === 'active').map(l => l.borrower));
    const chip = l => l.status === 'offer' ? '<span class="nb-tag hot">Offered</span>' : l.status === 'active' ? (isLate(s, l) ? '<span class="nb-tag bad">Overdue</span>' : '<span class="nb-tag">Active</span>') : l.status === 'paid' ? '<span class="nb-tag ok">Repaid</span>' : `<span class="nb-tag">${l.status === 'declined' ? 'Declined' : 'Withdrawn'}</span>`;
    const acts = l => l.status === 'offer' ? `<button type="button" class="btn small ghost" data-nw-loanwd="${l.id}">Withdraw</button>`
      : isLate(s, l) ? `${l.court ? '<span class="nb-sub">Frozen by court order</span>' : `<button type="button" class="btn small danger" data-nw-court="${l.id}">Freeze by court order</button>`}${l.named ? '<span class="nb-sub">Named publicly</span>' : `<button type="button" class="btn small" data-nw-name="${l.id}">Name publicly</button>`}` : '';
    const sorted = mine.slice().sort((a, b) => (isLate(s, b) - isLate(s, a)) || ((b.status === 'active') - (a.status === 'active')) || b.at - a.at);
    return `<div class="nb-grid"><div class="nb-a">
        <div class="nb-panel nb-lend"><div class="nb-lend-mark">TC</div><div class="nb-h">Thorne Capital <span class="nb-count">Private lending</span></div>
          <div class="nb-lend-stats"><div><small>Out on loan</small><b>${money(outNow)}</b></div><div><small>Profit tonight</small><b>${money(profit)}</b></div><div><small>Overdue</small><b class="${late ? 'neg' : ''}">${late}</b></div></div>
          <p class="nb-p">Lend ${money(L.min)} to ${money(L.max)} at ${L.rateMin}% to ${L.rateMax}%, your call. Miss the deadline and you can freeze their account by court order and name them in front of the whole gala.</p></div>
        <form class="nb-panel" data-nw-form="lend"><div class="nb-h">Offer a loan</div>
          <label class="nb-l">To<select class="field" data-nw="lto" aria-label="Lend to"><option value="">Choose someone…</option>${payees(me, w).map(c => `<option value="${c.id}" ${x.to === c.id ? 'selected' : ''} ${busy.has(c.id) ? 'disabled' : ''}>${esc(c.name)}${busy.has(c.id) ? ' (has an open loan)' : ''}</option>`).join('')}</select></label>
          <label class="nb-l">Amount<div class="nb-amt"><span>$</span><input class="field" data-nw="lamt" inputmode="decimal" placeholder="${L.min.toLocaleString('en-US')} to ${L.max.toLocaleString('en-US')}" value="${esc(x.amt)}" aria-label="Loan amount" autocomplete="off"></div></label>
          <div class="cs-quick">${[5000, 25000, 50000, 100000].filter(v => v >= L.min && v <= L.max).map(v => `<button type="button" class="nb-pill" data-nw-lq="${v}">${v >= 1e6 ? '$' + v / 1e6 + 'M' : '$' + v / 1e3 + 'K'}</button>`).join('')}</div>
          <label class="nb-l">Interest <b class="nb-rate" data-nw-rateout>${x.rate}%</b><input type="range" class="nb-range" data-nw="lrate" min="${L.rateMin}" max="${L.rateMax}" step="5" value="${x.rate}" aria-label="Interest rate"></label>
          <label class="nb-l">Due<select class="field" data-nw="lterm" aria-label="Due in">${(L.terms || [30]).map(t => `<option value="${t}" ${Number(x.term) === t ? 'selected' : ''}>${t} minutes after they accept</option>`).join('')}</select></label>
          <div class="nb-sum">They'd repay <b data-nw-owe>${owe ? money(owe) : '—'}</b></div>
          <button class="btn primary nb-go" type="submit">Send loan offer</button>
          ${errBox(ui, 'lend')}</form>
      </div><div class="nb-b">
        <div class="nb-panel"><div class="nb-h">Your loans <span class="nb-count">${mine.length}</span></div>
          ${sorted.map(l => `<div class="nb-li ${isLate(s, l) ? 'late' : ''}"><div><b>${esc(bname(l))} · ${money(l.amt)} at ${l.rate}%</b><small>repays ${money(l.owed)}${l.status === 'active' ? ' · ' + esc(dueLabel(s, l)) : l.status === 'offer' ? ' · waiting for them to accept' : ''}</small></div><div class="nb-li-a">${chip(l)}${acts(l)}</div></div>`).join('') || '<div class="nb-empty">No loans yet. Find someone short of money.</div>'}
          ${errBox(ui, 'loan')}</div>
      </div></div>`;
  }

  /* ---------- events ---------- */
  /* play the "decrypting" reveal once */
  function fresh(ui, id) { ui.fresh = id; clearTimeout(fresh.t); fresh.t = setTimeout(() => { ui.fresh = null; }, 1100); }
  /** "250K", "1.5M", "$2,000,000" → a whole number of dollars */
  const amount = v => {
    const m = String(v || '').trim().toLowerCase().replace(/[$,\s]/g, '').match(/^(\d*\.?\d+)([kmb])?$/);
    if (!m) return 0;
    const n = Number(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2]] || 1);
    return Number.isFinite(n) ? Math.round(n) : 0;
  };
  /** Run by the host page with the clock: freed-up money arriving, loans going overdue. */
  function tick(s, u) {
    Object.entries(N(s).freeup || {}).forEach(([w, f]) => {
      if (f.told || !fuReady(s, f)) return;
      u['nw/freeup/' + w + '/told'] = true;
      alertWallet(u, w, 'NightBank', `${money(f.amt)} from your investments has cleared. It's in your balance now.`);
      Clock.log(u, 'nightwire', `${wname(w)}: ${money(f.amt)} freed up and cleared.`);
    });
    loans(s).forEach(l => {
      if (l.lateTold || !isLate(s, l)) return;
      u['nw/loans/' + l.id + '/lateTold'] = true;
      alertWallet(u, l.to, 'Loan overdue', `Your loan from ${wname(l.lender)} is overdue: you owe ${money(l.owed)}. Repay now, or they can freeze your account by court order and name you publicly.`);
      alertWallet(u, l.lender, 'Loan overdue', `${bname(l)} hasn't repaid ${money(l.owed)}. You can now freeze their account by court order or name them publicly (NightBank > Lending).`);
      Clock.log(u, 'nightwire', `${bname(l)}'s loan from ${wname(l.lender)} is overdue (${money(l.owed)}).`);
    });
  }
  /** Host: make freed-up money arrive now. */
  function arriveNow(u, w) {
    const s = DB.fresh(), f = fuOf(s, w); if (!f) return;
    u['nw/freeup/' + w + '/now'] = true; u['nw/freeup/' + w + '/told'] = true; u['nw/freeup/' + w + '/start'] = Math.min(f.start, nightNow(s));
    alertWallet(u, w, 'NightBank', `${money(f.amt)} from your investments has cleared. It's in your balance now.`);
    Clock.log(u, 'host', `Made ${wname(w)}'s freed-up ${money(f.amt)} arrive now.`);
  }
  function onClick(e, ctx) {
    const { me, ui } = ctx, q = sel => e.target.closest(sel); let el;
    const done = () => { ctx.redraw(true); return true; };
    const err = (key, m) => { say(ui, key, m); return done(); };
    if ((el = q('[data-nw-sub]'))) { ui.sub = el.dataset.nwSub; ui.err = ''; return done(); }
    if ((el = q('[data-nb-sub]'))) { ui.bsub = el.dataset.nbSub; ui.err = ''; window.scrollTo(0, 0); return done(); }
    if (typeof Casino !== 'undefined' && ui.bsub === 'casino' && Casino.onClick(e, ctx)) return true;
    if ((el = q('[data-nw-lq]'))) { ui.lend.amt = Number(el.dataset.nwLq).toLocaleString('en-US'); return done(); }
    if (q('[data-nw-freeup]')) {
      const s = DB.fresh(), w = walletOf(me), cfg = fuCfg(w);
      if (!cfg || fuOf(s, w)) return true;
      const why = blockedWhy(s, me, w); if (why) return err('freeup', why);
      if (!confirm(`Free up ${money(cfg.amt)}? It takes ${waitLabel(cfg.wait)} on the game clock to clear, and you can only do this once tonight.`)) return true;
      const start = nightNow(s), u = { ['nw/freeup/' + w]: { by: me.id, at: Date.now(), start, ready: start + cfg.wait, amt: cfg.amt } };
      Clock.log(u, 'nightwire', `${me.name} started freeing up ${money(cfg.amt)} (clears at ${hmm(start + cfg.wait)}).`);
      DB.update(u); ui.err = ''; return done();
    }
    if ((el = q('[data-nw-loanok]'))) {
      const s = DB.fresh(), l = loanById(s, el.dataset.nwLoanok), w = walletOf(me);
      if (!l || l.status !== 'offer' || l.to !== w) return true;
      const why = blockedWhy(s, me, w); if (why) return err('loan', why);
      const lender = G.byId(LC().lender);
      if (frozen(s, l.lender) || (lender && isOut(s, lender.id)) || balance(s, l.lender) < l.amt) return err('loan', `${wname(l.lender)} can't fund this loan right now.`);
      const due = nightNow(s) + l.term;
      if (!confirm(`Accept ${money(l.amt)} from ${wname(l.lender)}? You'll owe ${money(l.owed)} by ${hmm(due)} on the game clock.`)) return true;
      const u = { ['nw/loans/' + l.id + '/status']: 'active', ['nw/loans/' + l.id + '/due']: due, ['nw/loans/' + l.id + '/acceptedBy']: me.id };
      transfer(u, l.lender, w, l.amt, 'Loan', me.id, null);
      alertWallet(u, l.lender, 'Loan accepted', `${me.name} accepted your loan of ${money(l.amt)}. ${money(l.owed)} is due at ${hmm(due)}.`);
      DB.update(u); ui.err = ''; return done();
    }
    if ((el = q('[data-nw-loanno]'))) {
      const s = DB.fresh(), l = loanById(s, el.dataset.nwLoanno); if (!l || l.status !== 'offer') return true;
      const u = { ['nw/loans/' + l.id + '/status']: 'declined' }; alertWallet(u, l.lender, 'Loan declined', `${me.name} turned down your loan offer.`);
      Clock.log(u, 'nightwire', `${me.name} declined a loan from ${wname(l.lender)}.`); DB.update(u); return done();
    }
    if ((el = q('[data-nw-loanwd]'))) {
      const s = DB.fresh(), l = loanById(s, el.dataset.nwLoanwd); if (!l || l.status !== 'offer') return true;
      const u = { ['nw/loans/' + l.id + '/status']: 'withdrawn' }; alertWallet(u, l.to, 'Loan offer withdrawn', `${wname(l.lender)} withdrew the loan offer.`); DB.update(u); return done();
    }
    if ((el = q('[data-nw-repay]'))) {
      const s = DB.fresh(), l = loanById(s, el.dataset.nwRepay), w = walletOf(me);
      if (!l || l.status !== 'active' || l.to !== w) return true;
      const why = blockedWhy(s, me, w, true); if (why) return err('loan', why);
      if (balance(s, w) < l.owed) return err('loan', `You need ${money(l.owed)} to repay this loan. You have ${money(balance(s, w))}.`);
      if (!confirm(`Repay ${money(l.owed)} to ${wname(l.lender)}?`)) return true;
      const u = { ['nw/loans/' + l.id + '/status']: 'paid', ['nw/loans/' + l.id + '/paidAt']: Date.now() };
      transfer(u, w, l.lender, l.owed, 'Loan repaid', me.id, null);
      /* paying it off lifts a court freeze, unless another loan is still overdue */
      const f = frozen(s, w);
      if (f && f.by === 'court' && !loans(s).some(x => x.id !== l.id && x.to === w && isLate(s, x))) unfreeze(u, w, l.lender);
      DB.update(u); ui.err = ''; return done();
    }
    if ((el = q('[data-nw-court]'))) {
      const s = DB.fresh(), l = loanById(s, el.dataset.nwCourt);
      if (!l || !isLender(me) || !isLate(s, l) || l.court) return true;
      if (isOut(s, me.id)) return err('loan', blockedWhy(s, me, l.lender));
      if (!confirm(`Get a court order to freeze ${bname(l)}'s account? They won't be able to move money until they repay.`)) return true;
      const u = { ['nw/loans/' + l.id + '/court']: Date.now() };
      if (!frozen(s, l.to)) freeze(u, l.to, 'court', me.id, l.id);
      DB.update(u); return done();
    }
    if ((el = q('[data-nw-name]'))) {
      const s = DB.fresh(), l = loanById(s, el.dataset.nwName);
      if (!l || !isLender(me) || !isLate(s, l) || l.named) return true;
      if (isOut(s, me.id)) return err('loan', blockedWhy(s, me, l.lender));
      if (!confirm(`Name ${bname(l)} publicly? Every phone in the room will see that they defaulted.`)) return true;
      const u = { ['nw/loans/' + l.id + '/named']: Date.now() };
      u['feed/' + uid('w')] = { to: ['all'], title: wname(l.lender) + ' · public notice', text: `${bname(l)} has defaulted on a loan and owes ${money(l.owed)}.`, at: Date.now(), kind: 'nw' };
      Clock.log(u, 'nightwire', `${me.name} publicly named ${bname(l)} for an unpaid loan. Throw them out? (People tab)`);
      DB.update(u); return done();
    }
    if ((el = q('[data-nw-open]'))) { ui.open = ui.open === el.dataset.nwOpen ? null : el.dataset.nwOpen; fresh(ui, ui.open); return done(); }
    if ((el = q('[data-nw-buy]'))) {
      const it = (C().market || []).find(x => x.id === el.dataset.nwBuy), s = DB.fresh(), w = walletOf(me);
      if (!it || owns(s, w, it.id)) return true;
      const why = blockedWhy(s, me, w); if (why) { ui.err = why; return done(); }
      if (soldTo(s, it.id)) { ui.err = 'Sold. Someone else bought that file first.'; return done(); }
      if (balance(s, w) < it.price) { ui.err = 'Insufficient funds.'; return done(); }
      if (!confirm(`Buy "${it.title}" for ${money(it.price)}?`)) return true;
      const u = { ['nw/tx/' + uid('t')]: { from: w, to: 'market', amt: it.price, memo: it.title, by: me.id, at: Date.now(), item: it.id }, ['nw/bought/' + w + '/' + it.id]: { by: me.id, at: Date.now() } };
      Clock.log(u, 'nightwire', `${me.name} bought "${it.title}" for ${money(it.price)} (${wname(w)}).`);
      if (it.clue && !(s.clues && s.clues[it.clue])) { u['clues/' + it.clue] = { at: Date.now(), by: 'NIGHTWIRE' }; Clock.log(u, 'nightwire', `Evidence ${it.clue} bought on NIGHTWIRE.`); }
      alertWallet(u, w, 'NIGHTWIRE', `${me.name.split(' ')[0]} bought "${it.title}". It's in the market tab.`, me.id);
      DB.update(u); ui.open = it.id; fresh(ui, it.id); ui.err = ''; return done();
    }
    if ((el = q('[data-nw-addpitch]'))) {
      const s = DB.fresh(), sale = N(s).sale; if (!sale) return true;
      if (isOut(s, me.id)) { ui.err = blockedWhy(s, me, walletOf(me)); return done(); }
      const u = { 'nw/sale/pitched': sale.pitched.concat([el.dataset.nwAddpitch]) }; alertWallet(u, el.dataset.nwAddpitch, 'Private offer', 'A seller on NightBank has something you\'ll want. Check your NightBank tab.'); DB.update(u); return true;
    }
    if ((el = q('[data-nw-accept]'))) {
      const s = DB.fresh(), b = (N(s).bids || {})[el.dataset.nwAccept];
      if (!b || !N(s).sale || N(s).sale.sold) return true;
      if (isOut(s, me.id)) { ui.err = blockedWhy(s, me, walletOf(me)); return done(); }
      if (balance(s, b.from) < b.amt) { ui.err = `${wname(b.from)} can't cover that bid anymore.`; return done(); }
      if (frozen(s, b.from) || isOut(s, b.by)) { ui.err = `${wname(b.from)}'s account is locked. That bid can't be paid.`; return done(); }
      if (!confirm(`Sell to ${wname(b.from)} for ${money(b.amt)}?`)) return true;
      const u = { 'nw/sale/sold': { to: b.from, amt: b.amt, at: Date.now() } };
      transfer(u, b.from, 'crew', b.amt, 'Private sale', me.id, null, C().escrowUntil || null);
      alertWallet(u, b.from, 'You won', `Your bid of ${money(b.amt)} was accepted. The seller will arrange collection.`);
      Clock.log(u, 'nightwire', `SOLD: the painting to ${wname(b.from)} for ${money(b.amt)}.`);
      DB.update(u); return true;
    }
    if (q('[data-nw-close]')) { if (!confirm('Close the sale? Bids are cleared.')) return true; const u = { 'nw/sale': null, 'nw/bids': null }; Clock.log(u, 'nightwire', `${me.name} closed the sale.`); DB.update(u); return true; }
    return false;
  }
  function onInput(e, ctx) {
    const el = e.target, ui = ctx.ui, k = el.dataset && el.dataset.nw;
    if (typeof Casino !== 'undefined' && ui.bsub === 'casino' && Casino.onInput(e, ctx)) return true;
    if (!k) return false;
    if (k === 'amt' || k === 'memo' || k === 'handle') ui.send[k] = el.value; else if (k === 'bid') ui.bid = el.value; else if (k === 'ask') ui.ask = el.value; else if (k === 'chat') ui.chat = el.value;
    else if (k === 'lamt' || k === 'lrate') {
      if (k === 'lamt') ui.lend.amt = el.value; else ui.lend.rate = Number(el.value);
      /* update the live numbers without redrawing the form */
      const r = $('[data-nw-rateout]'), o = $('[data-nw-owe]'), owe = Math.round(amount(ui.lend.amt) * (1 + ui.lend.rate / 100));
      if (r) r.textContent = ui.lend.rate + '%'; if (o) o.textContent = owe ? money(owe) : '—';
    }
    else return false;
    return true;
  }
  function onChange(e, ctx) {
    const el = e.target, ui = ctx.ui;
    if (el.matches('[data-nw="to"]')) { const was = ui.send.to; ui.send.to = el.value; ui.err = ''; if ((was === '__handle') !== (el.value === '__handle')) { ctx.redraw(true); if (el.value === '__handle') setTimeout(() => { const h = $('[data-nw="handle"]'); if (h) h.focus(); }, 0); } return true; }
    if (el.matches('[data-nw-pitch]')) { const b = el.dataset.nwPitch; ui.pitch = el.checked ? ui.pitch.concat([b]) : ui.pitch.filter(x => x !== b); return true; }
    if (el.matches('[data-nw="lto"]')) { ui.lend.to = el.value; ui.err = ''; return true; }
    if (el.matches('[data-nw="lterm"]')) { ui.lend.term = Number(el.value); return true; }
    if (el.matches('[data-nw="unf"]')) { ui.unf = el.value; return true; }
    return false;
  }
  function onSubmit(e, ctx) {
    const f = e.target.closest('[data-nw-form]'); if (!f) return false;
    e.preventDefault();
    const { me, ui } = ctx, kind = f.dataset.nwForm, w = walletOf(me), s = DB.fresh();
    const fail = m => { say(ui, kind, m); ctx.redraw(true); return true; }, ok = () => { ui.err = ''; if (document.activeElement) document.activeElement.blur(); ctx.redraw(true); return true; };
    if (kind === 'send') {
      const amt = amount(ui.send.amt), to = ui.send.to;
      if (!to) return fail('Choose who to send to.');
      /* pay a person by name, or a secret account by its handle */
      let tw, tname;
      if (to === '__handle') { tw = byHandle(ui.send.handle); if (!tw) return fail('No account has that handle.'); tname = W()[tw].name; }
      else { const c = G.byId(to); tw = c && walletOf(c); if (!tw) return fail('That person has no account.'); tname = c.name; }
      if (tw === w) return fail("That's your own account.");
      if (amt < 1) return fail('Enter an amount, like 5000 or 2.5M.');
      const why = blockedWhy(s, me, w); if (why) return fail(why);
      if (balance(s, w) < amt) return fail(`Insufficient funds. You have ${money(balance(s, w))}.`);
      if (!confirm(`Send ${money(amt)} to ${tname}?`)) return true;
      const u = {}; transfer(u, w, tw, amt, ui.send.memo.trim(), me.id, tname); DB.update(u);
      ui.send = { to: '', amt: '', memo: '', handle: '' }; ui.sent = `${money(amt)} to ${tname}`;
      clearTimeout(ui.sentT); ui.sentT = setTimeout(() => { ui.sent = null; ctx.redraw(true); }, 4000);
      return ok();
    }
    if (kind === 'list') {
      const ask = amount(ui.ask);
      if (isOut(s, me.id)) return fail(blockedWhy(s, me, w));
      if (ask < 1) return fail('Set an asking price.');
      if (!ui.pitch.length) return fail('Pitch it to at least one buyer.');
      const u = { 'nw/sale': { ask, pitched: ui.pitch.slice(), by: me.id, at: Date.now() } };
      ui.pitch.forEach(b => alertWallet(u, b, 'Private offer', 'A seller on NightBank has something you\'ll want. Check your NightBank tab.'));
      Clock.log(u, 'nightwire', `${me.name} opened a private sale (asking ${money(ask)}) to ${ui.pitch.map(wname).join(', ')}.`);
      DB.update(u); ui.ask = ''; ui.pitch = []; return ok();
    }
    if (kind === 'bid') {
      const amt = amount(ui.bid), sale = N(s).sale;
      if (!sale || sale.sold || !sale.pitched.includes(w)) return fail('This offer is no longer open.');
      if (amt < 1) return fail('Enter a bid, like 25M.');
      const why = blockedWhy(s, me, w); if (why) return fail(why);
      if (balance(s, w) < amt) return fail(`You don't have that much in NightBank. You have ${money(balance(s, w))}.`);
      const u = { ['nw/bids/' + uid('b')]: { from: w, amt, by: me.id, at: Date.now() } };
      alertWallet(u, 'crew', 'New bid', `${wname(w)} bid ${money(amt)} for the painting.`);
      Clock.log(u, 'nightwire', `${me.name} bid ${money(amt)} on the painting.`);
      DB.update(u); ui.bid = ''; return ok();
    }
    if (kind === 'lend') {
      const L = LC(), x = ui.lend, amt = amount(x.amt), c = G.byId(x.to);
      if (!isLender(me)) return true;
      if (!c) return fail('Choose who to lend to.');
      const why = blockedWhy(s, me, w); if (why) return fail(why);
      if (isOut(s, c.id)) return fail(`${c.name} has been thrown out of the gala and can't borrow.`);
      if (loans(s).some(l => l.lender === w && l.borrower === c.id && (l.status === 'offer' || l.status === 'active'))) return fail(`${c.name} already has an open loan with you.`);
      if (amt < L.min || amt > L.max) return fail(`Loans are ${money(L.min)} to ${money(L.max)}.`);
      if (x.rate < L.rateMin || x.rate > L.rateMax) return fail(`Interest is ${L.rateMin}% to ${L.rateMax}%.`);
      if (balance(s, w) < amt) return fail("You don't have that much to lend right now.");
      const to = walletOf(c); if (!to) return fail('That person has no account.');
      const owed = Math.round(amt * (1 + x.rate / 100)), term = Number(x.term) || 30;
      const u = { ['nw/loans/' + uid('L')]: { lender: w, borrower: c.id, to, amt, rate: x.rate, owed, term, at: Date.now(), by: me.id, status: 'offer' } };
      alertWallet(u, to, 'Loan offer', `${wname(w)} offers you ${money(amt)} at ${x.rate}% interest (repay ${money(owed)}). Check your NightBank to accept or decline.`);
      Clock.log(u, 'nightwire', `${me.name} offered ${c.name} a loan: ${money(amt)} at ${x.rate}%, repay ${money(owed)} within ${term} min.`);
      DB.update(u); ui.lend = { to: '', amt: '', rate: x.rate, term }; return ok();
    }
    if (kind === 'unfreeze') {
      if (!(C().unfreezers || []).includes(me.id) || (N(s).unfroze || {})[me.id]) return true;
      const t = ui.unf; if (!t || !frozen(s, t)) { ui.err = 'Choose a frozen account.'; ctx.redraw(true); return true; }
      if (!confirm(`Unfreeze ${wname(t)}? You can only do this once tonight.`)) return true;
      const u = { ['nw/unfroze/' + me.id]: { w: t, at: Date.now() } }; unfreeze(u, t, null, true);
      Clock.log(u, 'nightwire', `${me.name} hacked NightBank and unfroze ${wname(t)}.`);
      DB.update(u); ui.unf = ''; return ok();
    }
    if (kind === 'chat') {
      const text = ui.chat.trim(); if (!text || me.group !== 'crew') return true;
      DB.update({ ['nw/chat/' + uid('c')]: { by: me.id, text, at: Date.now() } }); ui.chat = '';
      ctx.redraw(true); setTimeout(() => { const i = $('[data-nw="chat"]'); if (i) i.focus(); }, 0); return true;
    }
    return true;
  }

  return { newUI, render, renderBank, onClick, onInput, onChange, onSubmit, walletOf, wname, balance, txs, money, amount, pendingState, wallets: W, membersOf,
    tick, arriveNow, freeze, unfreeze, frozen, isOut, blockedWhy, fuCfg, fuOf, fuReady, loans, isLate, nightNow, bname, FROZE, phaseIdx, cfg: C };
})();
