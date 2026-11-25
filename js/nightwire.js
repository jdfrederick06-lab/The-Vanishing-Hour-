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
  /* balances have cents (Nov 24): "$1,549.21"; whole amounts still show as "$5,000" */
  const cents = n => Math.round((Number(n) || 0) * 100) / 100;
  const money = n => { const v = cents(n); return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
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
  /* Nov 25 (Jacob): freed-up money arrives in five equal transfers as the wait runs, not all at the end */
  const FU_STEPS = 5;
  const fuStep = (s, f) => !f ? 0 : fuReady(s, f) ? FU_STEPS : Math.max(0, Math.min(FU_STEPS, Math.floor((nightNow(s) - f.start) / Math.max(1, f.ready - f.start) * FU_STEPS)));
  const fuCleared = (s, f) => !f ? 0 : cents(f.amt * fuStep(s, f) / FU_STEPS);
  const fuNextAt = (s, f) => f ? f.start + (f.ready - f.start) * (fuStep(s, f) + 1) / FU_STEPS : 0;
  /* Privacy (Nov 23): a phone only downloads the payments of its own account. Its members (and the
     hosts) work the balance out from that history; everyone else sees the balance the account last
     published at nw/bal/{w} (needed when the crew takes a buyer's bid, or a borrower takes a loan). */
  function sees(w) { const me = DB.who ? DB.who() : null; if (!me || me.host) return true; return Route.wallet(w).some(b => b === 'p/' + me.id || b === 'g/' + me.group); }
  function computed(s, w) { const st = (W()[w] || {}).start || 0, f = fuOf(s, w); return cents(txs(s).reduce((b, t) => b + (t.to === w && !held(s, t) ? t.amt : 0) - (t.from === w ? t.amt : 0), st + fuCleared(s, f))); }
  function balance(s, w) {
    if (sees(w)) return computed(s, w);
    const p = (N(s).bal || {})[w]; return p ? p.amt : ((W()[w] || {}).start || 0);
  }
  /** Take money out of account w safely: hold a short lock on the account, re-check on the newest
      numbers that it still has `amt`, then save build(s)'s writes and the account's new balance.
      Resolves true if it went through, false if the money wasn't there any more. */
  function spend(w, amt, build) {
    return DB.guard('w_' + w, s => {
      const have = balance(s, w); if (have < amt) return null;
      const u = build(s); if (!u) return null;
      u['nw/bal/' + w] = { amt: cents(have - amt), at: Date.now() };
      return u;
    });
  }
  /** Each phone keeps its own account's published balance up to date (money coming in, freed-up money). */
  let pubAt = 0;
  function publish(s, me) {
    const w = me && walletOf(me); if (!w || !sees(w) || Date.now() - pubAt < 3000) return;
    const b = computed(s, w), p = (N(s).bal || {})[w];
    if (!p || p.amt !== b) { pubAt = Date.now(); DB.update({ ['nw/bal/' + w]: { amt: b, at: Date.now() } }); }
  }
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

  /* ---------- screens: Omnizon, "a Nightwire company" (Nov 24) ----------
     NIGHTWIRE looks like an ordinary online store (black, orange, blue) that is secretly
     the dark-web market. Departments: Shop (the market, with a product page and a checkout),
     Wallet, Sell (crew: the private sale, "Seller Central"), Messages (crew: the burner) and
     Casino. "Place your order" on the checkout is the confirmation, so there's no extra pop-up. */
  const newUI = () => ({ sub: 'market', bsub: 'acct', open: null, view: 'home', item: null, cat: 'all', q: '', bought: null,
    send: { to: '', amt: '', memo: '', handle: '' }, bid: '', ask: '', pitch: [], chat: '', err: '', errFor: '', sent: null,
    lend: { to: '', amt: '', rate: 150, term: 30 }, unf: '', cs: null });
  /* an error shows only in the panel it belongs to (send, bid, lend, freeup, loan, buy, list, unfreeze) */
  const errBox = (ui, key) => `<div class="err" role="alert">${(ui.errFor || 'send') === key ? esc(ui.err) : ''}</div>`;
  const say = (ui, key, msg) => { ui.err = msg; ui.errFor = key; };

  const MARK = (n = 30) => `<svg class="oz-mark" width="${n}" height="${n}" viewBox="0 0 30 30" aria-hidden="true"><rect width="30" height="30" rx="8" fill="#f26a1b"/><circle cx="15" cy="15" r="7.5" fill="none" stroke="#0b0d12" stroke-width="3.4"/><rect x="19.5" y="19.5" width="5" height="5" rx="1.2" fill="#1f5fd6"/></svg>`;
  const WORD = '<span class="oz-word"><b>omnizon</b><small>a Nightwire company</small></span>';
  const IC = {
    search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
    shop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M15.5 14.5h2"/></svg>',
    sell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12.5V4h8.5L21 13.5 13.5 21z"/><circle cx="7.5" cy="8.5" r="1.4"/></svg>',
    msg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    casino: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7z"/></svg>',
    shieldOk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    done: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#0f7b3f"/><path d="M9.5 16.5l4.5 4.5 8.5-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    wait: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="none" stroke="#e3e6ec" stroke-width="4"/><path d="M16 4a12 12 0 0 1 12 12" fill="none" stroke="#1f5fd6" stroke-width="4" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur=".8s" repeatCount="indefinite"/></path></svg>',
    ring: '<svg width="18" height="18" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="8" fill="none" stroke="#f26a1b" stroke-width="3.6"/></svg>'
  };
  /* what each file looks like in the store (story.js can set it.kind to override) */
  const KIND = { vault: 'blueprint', bankvictor: 'statement', shells: 'statement', ashfall: 'casefile', tips: 'casefile', devereaux: 'casefile', donors: 'list', bebbitdata: 'list', birth: 'envelope', dna: 'helix' };
  const DEPT = { blueprint: 'Blueprints', statement: 'Financial records', casefile: 'Background checks', list: 'Data and lists', envelope: 'Sealed records', helix: 'Sealed records' };
  const TINT = { blueprint: 'blue', statement: 'orange', casefile: 'gray', list: 'green', envelope: 'sand', helix: 'violet' };
  const kindOf = it => it.kind || KIND[it.id] || 'casefile';
  const ART = {
    blueprint: '<rect x="25" y="24" width="76" height="84" rx="3" fill="#0b0d12" opacity=".12"/><rect x="22" y="20" width="76" height="84" rx="3" fill="#1f5fd6"/><path d="M32 20v84M42 20v84M52 20v84M62 20v84M72 20v84M82 20v84M22 30h76M22 40h76M22 50h76M22 60h76M22 70h76M22 80h76M22 90h76" stroke="#fff" stroke-opacity=".16" stroke-width="1"/><path d="M32 34h56v36H32zM60 34v36M32 52h28M66 78h22v18H66z" fill="none" stroke="#fff" stroke-width="2"/><circle cx="77" cy="87" r="4" fill="none" stroke="#f26a1b" stroke-width="2.2"/><rect x="32" y="84" width="24" height="3" rx="1.5" fill="#f26a1b"/>',
    statement: '<rect x="29" y="20" width="68" height="88" rx="3" fill="#0b0d12" opacity=".12"/><rect x="26" y="16" width="68" height="88" rx="3" fill="#fff"/><path d="M26 19a3 3 0 0 1 3-3h62a3 3 0 0 1 3 3v11H26z" fill="#0b0d12"/><rect x="32" y="21" width="22" height="4" rx="2" fill="#f26a1b"/><rect x="33" y="38" width="38" height="3" rx="1.5" fill="#c9d2e3"/><rect x="76" y="38" width="12" height="3" rx="1.5" fill="#c9d2e3"/><rect x="33" y="48" width="32" height="3" rx="1.5" fill="#c9d2e3"/><rect x="76" y="48" width="12" height="3" rx="1.5" fill="#c9d2e3"/><rect x="30" y="55" width="60" height="9" rx="2" fill="#ffe2cf"/><rect x="33" y="58" width="36" height="3" rx="1.5" fill="#e0560f"/><rect x="76" y="58" width="12" height="3" rx="1.5" fill="#e0560f"/><rect x="33" y="70" width="40" height="3" rx="1.5" fill="#c9d2e3"/><rect x="76" y="70" width="12" height="3" rx="1.5" fill="#c9d2e3"/><path d="M33 86h55" stroke="#0b0d12" stroke-width="1.5"/><rect x="68" y="90" width="20" height="4" rx="2" fill="#0b0d12"/>',
    casefile: '<rect x="21" y="34" width="84" height="68" rx="4" fill="#0b0d12" opacity=".12"/><path d="M18 30a4 4 0 0 1 4-4h24l7 7h45a4 4 0 0 1 4 4v59a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4z" fill="#1a2233"/><rect x="27" y="44" width="66" height="48" rx="3" fill="#fff"/><rect x="33" y="51" width="19" height="23" rx="2" fill="#dfe4ec"/><circle cx="42.5" cy="59" r="4.5" fill="#8a94a8"/><path d="M35 73c1.5-5 4.3-7 7.5-7s6 2 7.5 7z" fill="#8a94a8"/><rect x="57" y="53" width="29" height="3" rx="1.5" fill="#c9d2e3"/><rect x="57" y="61" width="22" height="3" rx="1.5" fill="#c9d2e3"/><rect x="57" y="69" width="26" height="3" rx="1.5" fill="#c9d2e3"/><rect x="33" y="81" width="42" height="5" rx="1.5" fill="#0b0d12"/><g transform="rotate(-9 82 32)"><rect x="64" y="25" width="36" height="13" rx="2" fill="#fff1e8" stroke="#e0560f" stroke-width="2"/><rect x="69" y="30" width="26" height="3" rx="1.5" fill="#e0560f"/></g>',
    list: '<rect x="29" y="20" width="68" height="88" rx="3" fill="#0b0d12" opacity=".12"/><rect x="26" y="16" width="68" height="88" rx="3" fill="#fff"/><rect x="46" y="11" width="28" height="11" rx="3" fill="#0b0d12"/>'
      + [0, 1, 2, 3].map(i => { const y = 32 + i * 17, on = i !== 2; return `<rect x="34" y="${y}" width="11" height="11" rx="2.5" fill="${on ? '#0f7b3f' : '#fff'}" stroke="${on ? '#0f7b3f' : '#f26a1b'}" stroke-width="2"/>${on ? `<path d="M36.5 ${y + 5.8}l2.4 2.4 4-4.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}<rect x="51" y="${y + 4}" width="${[34, 28, 36, 24][i]}" height="3" rx="1.5" fill="${on ? '#c9d2e3' : '#f26a1b'}"/>`; }).join(''),
    envelope: '<rect x="19" y="37" width="88" height="60" rx="4" fill="#0b0d12" opacity=".12"/><rect x="16" y="33" width="88" height="60" rx="4" fill="#fff"/><path d="M16 37l44 31 44-31" fill="none" stroke="#c9d2e3" stroke-width="2.5"/><circle cx="60" cy="68" r="11" fill="#e0560f"/><circle cx="60" cy="68" r="6.5" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.6"/><rect x="24" y="80" width="22" height="3" rx="1.5" fill="#c9d2e3"/><rect x="74" y="41" width="22" height="9" rx="1.5" fill="none" stroke="#1f5fd6" stroke-width="1.6"/><rect x="78" y="44.5" width="14" height="2" rx="1" fill="#1f5fd6"/>',
    helix: '<path d="M46 26h28M50 54h20M50 66h20M46 94h28" stroke="#c9d2e3" stroke-width="3.5" stroke-linecap="round"/><path d="M42 18c0 21 36 21 36 42s-36 21-36 42" fill="none" stroke="#1f5fd6" stroke-width="5.5" stroke-linecap="round"/><path d="M78 18c0 21-36 21-36 42s36 21 36 42" fill="none" stroke="#f26a1b" stroke-width="5.5" stroke-linecap="round"/>'
  };
  const art = (k, n) => `<svg width="${n}" height="${n}" viewBox="0 0 120 120" aria-hidden="true">${ART[k] || ART.casefile}</svg>`;
  const PROMO = '<svg width="92" height="92" viewBox="0 0 96 96" aria-hidden="true"><rect x="18" y="16" width="56" height="68" rx="4" fill="#174aa8"/><rect x="24" y="10" width="56" height="68" rx="4" fill="#fff"/><rect x="24" y="10" width="56" height="12" rx="4" fill="#0b0d12"/><rect x="31" y="30" width="34" height="4" rx="2" fill="#c9d2e3"/><rect x="31" y="39" width="42" height="4" rx="2" fill="#c9d2e3"/><rect x="31" y="48" width="26" height="4" rx="2" fill="#f26a1b"/><circle cx="68" cy="68" r="12" fill="#f26a1b"/><path d="M62.5 68l4 4 7-8" fill="none" stroke="#0b0d12" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  /* the same made-up rating for a file every time */
  const hsh = v => { let h = 7; for (const ch of String(v)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  const rating = it => { const h = hsh(it.id + it.seller), r = 4.3 + (h % 7) / 10; return { r: r.toFixed(1), str: r >= 4.7 ? '★★★★★' : '★★★★☆', n: 40 + h % 290 }; };
  const starLine = (it, word) => { const st = rating(it); return `<span class="oz-stars" aria-label="${st.r} out of 5 stars, ${st.n} ratings"><i aria-hidden="true">${st.str}</i>${st.n}${word ? ' ratings' : ''}</span>`; };
  /** "$150,000" with a small raised dollar sign (and cents when asked for, or when there are some) */
  const price = (n, big) => { const v = Math.abs(cents(n)), w = Math.floor(v), c = Math.round((v - w) * 100); return `<span class="oz-price${big ? ' oz-bigprice' : ''}" aria-label="${money(v)}"><sup>$</sup>${w.toLocaleString('en-US')}${big || c ? `<sup>${String(c).padStart(2, '0')}</sup>` : ''}</span>`; };
  const searchText = it => (it.title + ' ' + it.seller + ' ' + DEPT[kindOf(it)] + ' ' + (it.teaser || '')).toLowerCase();
  const FOOT = '<p class="oz-foot"><b>Omnizon</b>, a Nightwire company · Conditions of Use · Privacy Notice<br>Your session is encrypted and wiped at 23:59. No order history is kept.</p>';

  /* the dark band under the header: search (shop only), who you're shopping as, and the departments */
  function band(s, me, ui, w) {
    const sale = N(s).sale, bids = Object.keys(N(s).bids || {}).length, offers = loans(s).filter(l => l.to === w && l.status === 'offer').length;
    const list = [['market', 'Shop', IC.shop, ''], ['wallet', 'Wallet', IC.wallet, offers ? `<span class="oz-n">${offers}</span>` : '']]
      .concat(me.group === 'crew' ? [['sale', 'Sell', IC.sell, sale && !sale.sold && bids ? `<span class="oz-n">${bids}</span>` : ''], ['burner', 'Messages', IC.msg, '']] : [])
      .concat(typeof Casino !== 'undefined' && Casino.allowed(me) ? [['casino', 'Casino', IC.casino, casinoOn(s) ? '<i class="oz-live" title="Tables open"></i>' : '']] : []);
    const search = ui.sub === 'market' && ui.view === 'home'
      ? `<form class="oz-search" data-nw-form="search" role="search"><label><input data-nw="q" type="search" value="${esc(ui.q)}" placeholder="Search Omnizon" aria-label="Search Omnizon" autocomplete="off" enterkeyhint="search"></label><button type="submit" aria-label="Search">${IC.search}</button></form>` : '';
    return `<div class="oz-band">${search}
      <div class="oz-as"><span><i class="oz-dot"></i>Shopping as <b>${esc(wname(w))}</b></span><span>Wallet <b data-count="${balance(s, w)}" data-count-k="band">${money(balance(s, w))}</b></span></div>
      <nav class="oz-depts" aria-label="Departments">${list.map(([k, l, ic, x]) => `<button type="button" data-nw-sub="${k}" aria-current="${ui.sub === k}">${ic}${l}${x}</button>`).join('')}</nav></div>`;
  }
  const holdBox = (s, me, why) => `<div class="oz-hold">${IC.lock}<div><b>${isOut(s, me.id) ? 'Your account has been closed' : 'Your wallet is on hold'}</b><span>${esc(why)}</span></div></div>`;
  const backBtn = label => `<button type="button" class="oz-back" data-nw-back>${IC.back}${label}</button>`;

  /* ----- Shop: the market ----- */
  function shopView(s, me, ui, w) {
    const items = marketFor(me), vis = items.filter(it => available(s, it)), soon = items.length - vis.length;
    const mineN = vis.filter(it => owns(s, w, it.id)).length;
    const cats = [...new Set(vis.map(it => DEPT[kindOf(it)]))];
    if (ui.cat !== 'all' && !(cats.includes(ui.cat) || (ui.cat === 'mine' && mineN))) ui.cat = 'all';
    const inCat = vis.filter(it => ui.cat === 'all' || (ui.cat === 'mine' ? owns(s, w, it.id) : DEPT[kindOf(it)] === ui.cat));
    const q = ui.q.trim().toLowerCase(), hit = it => !q || searchText(it).includes(q), shown = inCat.filter(hit).length;
    const drop = vis.find(it => it.from && !owns(s, w, it.id) && !soldTo(s, it.id));
    const promo = drop
      ? `<section class="oz-promo"><div><small>Just dropped</small><b>${esc(drop.title)}</b><span>New from ${esc(drop.seller)}. One copy. The first buyer gets it.</span><button type="button" class="oz-btn go" data-nw-item="${drop.id}" style="align-self:flex-start;margin-top:4px">See the listing</button></div>${PROMO}</section>`
      : `<section class="oz-promo"><div><small>Tonight only</small><b>Files from verified sellers</b><span>Every file sells once. Paid through Omnizon Escrow and delivered in seconds.</span></div>${PROMO}</section>`;
    const pills = `<div class="oz-pills" role="toolbar" aria-label="Categories">${['all'].concat(cats).map(c => `<button type="button" class="oz-pill" data-nw-cat="${esc(c)}" aria-pressed="${ui.cat === c}">${c === 'all' ? 'All' : esc(c)}</button>`).join('')}${mineN ? `<button type="button" class="oz-pill" data-nw-cat="mine" aria-pressed="${ui.cat === 'mine'}">Your library <small>${mineN}</small></button>` : ''}</div>`;
    const card = it => {
      const k = kindOf(it), mine = owns(s, w, it.id), gone = !mine && !!soldTo(s, it.id);
      return `<button type="button" class="oz-card${gone ? ' gone' : ''}" data-nw-item="${it.id}" data-oz-q="${esc(searchText(it))}"${hit(it) ? '' : ' hidden'}>
        <span class="oz-thumb oz-t-${TINT[k]}">${mine ? '<span class="oz-tag own">In your library</span>' : gone ? '<span class="oz-tag sold">Sold</span>' : it.from ? '<span class="oz-tag">New</span>' : ''}${art(k, 92)}</span>
        <span class="oz-cb"><span class="oz-ct">${esc(it.title)}</span>${starLine(it)}${price(it.price)}
          ${mine ? `<span class="oz-meta ok">${IC.check}Delivered · tap to open</span>` : gone ? '<span class="oz-meta no">Sold to another buyer</span>' : `<span class="oz-meta">${IC.shield}Escrow · Instant</span>`}</span></button>`;
    };
    const title = ui.cat === 'all' ? (me.group === 'crew' ? 'Picked for your crew' : 'Picked for you') : ui.cat === 'mine' ? 'Your library' : ui.cat;
    return `${promo}${pills}
      <div class="oz-h"><h2>${esc(title)}</h2><span data-oz-count>${shown} ${shown === 1 ? 'result' : 'results'}</span></div>
      <div class="oz-grid">${inCat.map(card).join('')}</div>
      <div class="oz-none" data-oz-none${shown ? ' hidden' : ''}><b>No results${q ? ' for "' + esc(ui.q.trim()) + '"' : ''}</b>Try another word, or browse All.</div>
      ${soon ? `<div class="oz-soon">${IC.clock}<div><b>${soon} more ${soon === 1 ? 'listing' : 'listings'} coming later tonight</b>Sellers are still uploading. Check back after the next part of the night.</div></div>` : ''}
      ${errBox(ui, 'buy')}`;
  }
  const findItem = (s, me, id) => { const it = (C().market || []).find(x => x.id === id); return it && it.for.includes(me.group) && available(s, it) ? it : null; };

  /* ----- an owned file, opened like the real thing (Nov 25) ----------
     story.js gives each market item a `doc` = { type, org, title, ref, rows, table, paras, hops,
     mails, checks, score, stamp, foot }. Every type shares one paper sheet; the type changes
     the look (blueprint, bank statement, trace report, email headers, ledger, memo, ID check,
     certificate, lab report). The footer licenses the copy to the buyer's account. */
  function docView(it, w) {
    const d = it.doc, T = d.type || 'memo';
    const kv = (d.rows || []).length ? `<dl class="od-kv">${d.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : '';
    const tb = d.table ? `<table class="od-t"><thead><tr>${d.table.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${d.table.rows.map(r => `<tr>${r.map((c, i) => `<td${T === 'statement' && i === r.length - 1 ? ` class="${/^−|^-/.test(c) ? 'neg' : 'pos'}"` : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '';
    const ps = (d.paras || []).map(p => `<p class="od-p">${esc(p)}</p>`).join('');
    let special = '';
    if (T === 'blueprint') special = `<svg class="od-plan" viewBox="0 0 320 150" aria-hidden="true"><rect x="6" y="6" width="308" height="138" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 60h120M126 6v138M126 96h188M230 96v48" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="240" y="104" width="62" height="34" fill="none" stroke="#f26a1b" stroke-width="2.4"/><circle cx="271" cy="121" r="8" fill="none" stroke="#f26a1b" stroke-width="2"/><path d="M30 60v84M40 60v84M50 60v84M60 60v84M70 60v84" stroke="currentColor" stroke-width=".8" opacity=".7"/><text x="16" y="34">EAST HALL</text><text x="16" y="120">STAIRS</text><text x="140" y="50">GALLERY STORAGE</text><text x="246" y="99">VAULT</text><text x="140" y="126">CORRIDOR</text></svg>`;
    if (T === 'trace') special = `<ol class="od-hops">${(d.hops || []).map((h, i, a) => `<li class="${i === a.length - 1 ? 'end' : ''}"><i></i><span>${esc(h)}</span></li>`).join('')}</ol>`;
    if (T === 'email') special = (d.mails || []).map(m => `<div class="od-mail"><div class="od-mail-h"><b>${esc(m.subject)}</b><small>${esc(m.when)}</small></div><dl class="od-kv"><dt>Sent from</dt><dd>${esc(m.from)}</dd><dt>Route</dt><dd>${esc(m.path)}</dd></dl><p class="od-p">${esc(m.note)}</p></div>`).join('');
    if (T === 'kyc') special = `<ul class="od-checks">${(d.checks || []).map(([k, ok, v]) => `<li class="${ok ? 'ok' : 'bad'}"><b>${ok ? '✓' : '✕'}</b><span>${esc(k)}</span><em>${esc(v)}</em></li>`).join('')}</ul>`;
    if (T === 'lab') special = `<div class="od-score"><small>Probability of paternity</small><b>${esc(d.score || '')}</b></div><div class="od-bars" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<span><i style="height:${30 + (i * 53 % 60)}%"></i><i style="height:${30 + (i * 53 % 60) - (i % 4 === 0 ? 8 : 0)}%"></i></span>`).join('')}</div>`;
    return `<article class="od od-${T}">
      <header class="od-h"><div><small>${esc(d.org || '')}</small><b>${esc(d.title || it.title)}</b></div>${d.ref ? `<span class="od-ref">${esc(d.ref)}</span>` : ''}</header>
      ${special}${kv}${tb}${ps}
      ${d.stamp ? `<span class="od-stamp">${esc(d.stamp)}</span>` : ''}
      <footer class="od-f"><span>${esc(d.foot || '')}</span><span>Licensed to ${esc(wname(w))} · Omnizon digital file · do not redistribute</span></footer></article>`;
  }

  /* ----- the product page (an owned file opens here) ----- */
  function itemView(s, me, ui, w) {
    const it = findItem(s, me, ui.item); if (!it) { ui.view = 'home'; return shopView(s, me, ui, w); }
    const k = kindOf(it), mine = owns(s, w, it.id), gone = !mine && !!soldTo(s, it.id), why = blockedWhy(s, me, w);
    const got = mine ? N(s).bought[w][it.id] : null, placing = !mine && ui.bought === it.id;
    const left = `<div class="oz-pg">
        <div class="oz-store"><b>Visit the ${esc(it.seller)} store</b>${starLine(it, true)}</div>
        <h1>${esc(it.title)}</h1>
        <div class="oz-hero oz-t-${TINT[k]}">${art(k, 196)}<span class="oz-cap">${mine ? 'In your library' : gone ? 'No longer available' : 'Full file unlocks after purchase'}</span></div>
        ${mine ? `<div class="oz-teaser"><b>About this file</b>${esc(it.teaser)}</div>` : ''}</div>`;
    let right;
    if (placing) right = `<div class="oz-track" role="status"><b>Placing your order…</b><div class="oz-track-bar"><i></i></div><div class="oz-track-steps"><span>Paid</span><span>In escrow</span><span>Delivering</span></div></div>`;
    else if (mine) right = `${ui.bought === it.id ? `<div class="oz-done oz-pop">${IC.done}<div><b>Order placed</b><span>Paid from ${esc(wname(w))}. Your file is below.</span></div></div>` : ''}
        <div class="oz-file"><div class="oz-file-h">${IC.check}Delivered to your library<span>${esc(wallTime(got.at))}${got.by && got.by !== me.id ? ' · bought by ' + esc(first(got.by)) : ''}</span></div>
        ${it.doc ? `<div class="oz-doc-wrap${ui.fresh === it.id ? ' fresh' : ''}">${docView(it, w)}</div>` : `<div class="oz-file-b${ui.fresh === it.id ? ' fresh' : ''}">${esc(it.body)}</div>`}</div>`;
    else right = `<div class="oz-pg">
        ${price(it.price, true)}
        <div class="oz-lines"><span><b>Instant digital delivery</b> to your Omnizon library</span>${gone ? '<span class="oz-low">Sold. Another buyer got this file first.</span>' : '<span class="oz-low">Only 1 left. Sells once.</span>'}</div>
        <div class="oz-teaser"><b>About this file</b>${esc(it.teaser)}</div>
        ${gone ? '' : `<div class="oz-payfrom"><span>Pay from</span><b>${esc(wname(w))} · ${money(balance(s, w))}</b></div>
        <button type="button" class="oz-buy" data-nw-checkout="${it.id}"${why ? ' disabled' : ''}>Buy now</button>
        <div class="oz-escrow">${IC.shieldOk}<span><b>Omnizon Escrow.</b> The seller is paid only after your file is delivered.</span></div>`}
        ${errBox(ui, 'buy')}</div>`;
    return `${backBtn(ui.cat === 'mine' ? 'Back to your library' : 'Back to results')}<div class="oz-cols"><div>${left}</div><div>${right}</div></div>`;
  }

  /* ----- checkout: "Place your order" buys it ----- */
  function checkoutView(s, me, ui, w) {
    const it = findItem(s, me, ui.item); if (!it || owns(s, w, it.id) || soldTo(s, it.id)) { ui.view = 'item'; return itemView(s, me, ui, w); }
    const k = kindOf(it), b = balance(s, w), short = b < it.price, why = blockedWhy(s, me, w), others = membersOf(w).length - 1;
    const step = (n, t) => `<div class="oz-step"><i>${n}</i><span>${t}</span></div>`;
    return `${backBtn('Back to item')}<div class="oz-co oz-cols"><div>
        <h1>Review your order</h1>
        <section class="oz-sec"><div class="oz-co-item"><span class="oz-thumb oz-t-${TINT[k]}">${art(k, 50)}</span><div><b>${esc(it.title)}</b><span>Sold by ${esc(it.seller)} · Digital file</span></div><strong>${money(it.price)}</strong></div></section>
        <section class="oz-sec"><span class="oz-sec-h">Pay from</span><div class="oz-wl"><span>${IC.ring}</span><span><b>${esc(wname(w))} wallet</b>Available ${money(b)}${others > 0 ? ` · shared with ${others} ${others === 1 ? 'other' : 'others'}` : ''}</span></div></section>
        <section class="oz-sec"><span class="oz-sec-h">How Omnizon Escrow works</span>
          ${step(1, '<b>You pay now.</b> The money leaves your wallet and is held by Omnizon.')}${step(2, '<b>The file arrives</b> in your library within seconds.')}${step(3, '<b>The seller is paid.</b> Nothing traces back to you.')}</section>
      </div><div>
        <section class="oz-sec oz-sum"><div><span>Item</span><span>${money(it.price)}</span></div><div><span>Relay fee</span><span>$0</span></div>
          <div class="tot"><span>Order total</span><span>${money(it.price)}</span></div>
          ${short ? `<div class="short"><span>You're short by</span><span>${money(it.price - b)}</span></div>` : `<div><span>Left in your wallet after</span><span>${money(b - it.price)}</span></div>`}</section>
        ${why ? holdBox(s, me, why) : ''}
        <div class="oz-place"><button type="button" class="oz-buy" data-nw-buy="${it.id}" data-nw-now="1"${short || why ? ' disabled' : ''}>${short ? 'Not enough in your wallet' : 'Place your order'}</button>
          <small>By placing your order you agree to Omnizon's Conditions of Use. All sales final.</small>${errBox(ui, 'buy')}</div>
      </div></div>`;
  }

  /* ----- Wallet ----- */
  function walletCard(s, w) {
    const p = pendingState(s, w), e = escrowed(s, w), others = membersOf(w).length - 1;
    return `<div class="oz-wcard"><div class="oz-wcard-top">${MARK(26)}<span class="oz-word"><b>Omnizon Wallet</b><small>${esc(wname(w))}${others > 0 ? ' · shared with ' + others : ''}</small></span><em>•••• ${last4(w)}</em></div>
      <div><small>Available balance</small><span data-count="${balance(s, w)}" data-count-k="wcard" data-count-html="1">${price(balance(s, w), true)}</span></div>
      ${e ? `<div class="oz-wcard-row"><span>In escrow · released ${esc(releaseAt())}</span><b class="warn">${money(e)}</b></div>` : ''}
      ${p ? `<div class="oz-wcard-row"><span>${esc(p.label)}</span><b class="${p.void ? 'void' : 'warn'}">${p.void ? 'Void' : money(p.amount)}</b></div><p class="${p.void ? 'void' : ''}">${p.void ? 'Your client is gone. That money is never coming.' : 'If the client goes dark, this delivery payment is void.'}</p>` : ''}</div>`;
  }
  function loansBox(s, me, w, ui) {
    const mine = loans(s).filter(l => l.to === w && (l.status === 'offer' || l.status === 'active'));
    if (!mine.length) return '';
    return `<section class="oz-sec"><span class="oz-sec-h">Loans from ${esc(wname(LC().lender))}</span>${mine.map(l => l.status === 'offer'
      ? `<div class="oz-loan"><div><b>${money(l.amt)} offered</b><small>${l.rate}% interest · you'd repay ${money(l.owed)} within ${l.term} minutes of accepting</small></div><div class="oz-btns"><button type="button" class="oz-btn go" data-nw-loanok="${l.id}">Accept</button><button type="button" class="oz-btn" data-nw-loanno="${l.id}">Decline</button></div></div>`
      : `<div class="oz-loan${isLate(s, l) ? ' late' : ''}"><div><b>You owe ${money(l.owed)}</b><small>${isLate(s, l) ? 'Overdue' + (l.court ? ' · wallet frozen by court order' : '') : esc(dueLabel(s, l))}</small></div><div class="oz-btns"><button type="button" class="oz-btn go" data-nw-repay="${l.id}">Repay ${money(l.owed)}</button></div></div>`).join('')}${errBox(ui, 'loan')}</section>`;
  }
  /* Jules: unfreeze one account, once */
  function unfreezeTool(s, me, ui) {
    if (!(C().unfreezers || []).includes(me.id)) return '';
    const used = (N(s).unfroze || {})[me.id], list = Object.keys(N(s).frozen || {});
    return `<form class="oz-sec oz-form" data-nw-form="unfreeze"><span class="oz-sec-h">Account recovery <span class="oz-badge ${used ? '' : 'hot'}">${used ? 'Used' : '1 use'}</span></span>
      ${used ? `<span class="oz-hint">You unfroze ${esc(wname(used.w))} at ${esc(wallTime(used.at))}. It only works once.</span>`
        : `<span class="oz-hint">Lift a freeze on any wallet on the network. Works once.</span>${list.length ? `<select class="field" data-nw="unf" aria-label="Wallet to unfreeze"><option value="">Choose a frozen wallet…</option>${list.map(x => `<option value="${x}" ${ui.unf === x ? 'selected' : ''}>${esc(wname(x))}</option>`).join('')}</select><button class="oz-btn dark" type="submit">Unfreeze it</button>` : '<span class="oz-hint"><b>No frozen wallets right now.</b></span>'}`}
      ${errBox(ui, 'unfreeze')}</form>`;
  }
  const payeeOptions = (me, w, ui) => `<option value="">Choose someone…</option>${payees(me, w).map(c => `<option value="${c.id}" ${ui.send.to === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}<option value="__handle" ${ui.send.to === '__handle' ? 'selected' : ''}>Another account (enter its handle)</option>`;
  function sendForm(s, me, ui, w) {
    return `<form class="oz-sec oz-form" data-nw-form="send"><span class="oz-sec-h">Send money</span>
      <label>To<select class="field" data-nw="to" aria-label="Send to">${payeeOptions(me, w, ui)}</select></label>
      ${ui.send.to === '__handle' ? `<label>Account handle<input class="field" data-nw="handle" placeholder="their account handle" value="${esc(ui.send.handle)}" autocapitalize="off" spellcheck="false"></label>` : ''}
      <label>Amount<span class="oz-amt"><span>$</span><input class="field" data-nw="amt" inputmode="decimal" placeholder="0" value="${esc(ui.send.amt)}" aria-label="Amount" autocomplete="off"></span></label>
      <label><span>Note <i>(optional)</i></span><input class="field" data-nw="memo" maxlength="80" placeholder="What's it for?" value="${esc(ui.send.memo)}"></label>
      <button class="oz-buy" type="submit">Send</button><span class="oz-hint">Tip: type amounts like 250K or 1.5M.</span>
      ${ui.sent ? `<div class="oz-ok">✓ Sent ${esc(ui.sent)}</div>` : ''}${errBox(ui, 'send')}</form>`;
  }
  function activity(s, w) {
    const all = txs(s).filter(t => t.from === w || t.to === w), plain = all.filter(t => !isCasinoTx(t)), play = all.filter(isCasinoTx);
    const net = play.reduce((n, t) => n + (t.to === w ? t.amt : -t.amt), 0);
    const row = (av, cls, who, sub, amt, out) => `<div class="oz-tx"><span class="oz-av ${cls}">${av}</span><div><b>${esc(who)}</b><small>${esc(sub)}</small></div><strong class="${out ? '' : 'pos'}">${out ? '−' : '+'}${money(amt)}</strong></div>`;
    const rows = (play.length ? row('♠', 'buy', 'Charity casino', `${play.length} plays · last ${wallTime(play[0].at)}`, Math.abs(net), net < 0) : '')
      + plain.map(t => { const out = t.from === w, buy = t.to === 'market', who = buy ? 'Omnizon order' : out ? (t.toName || wname(t.to)) : wname(t.from);
        return row(buy ? IC.shop : esc(ini(who)), buy ? 'buy' : out ? '' : 'in', who, (t.memo ? t.memo + ' · ' : '') + wallTime(t.at) + (held(s, t) ? ' · in escrow' : ''), t.amt, out); }).join('');
    return `<section class="oz-sec"><span class="oz-sec-h">Activity <span class="oz-badge">${plain.length + (play.length ? 1 : 0)}</span></span>${rows || '<div class="oz-empty">No activity yet. Orders and transfers show up here.</div>'}</section>`;
  }
  function walletView(s, me, ui, w) {
    return `<div class="oz-cols"><div>${walletCard(s, w)}${loansBox(s, me, w, ui)}${loanAd(s, me, ui, w, true)}${unfreezeTool(s, me, ui)}</div><div>${sendForm(s, me, ui, w)}${activity(s, w)}</div></div>`;
  }

  /* ----- Sell: Seller Central (the crew's private sale of the painting) ----- */
  function saleView(s, me, ui) {
    const sale = N(s).sale, bids = Object.entries(N(s).bids || {}).map(([id, b]) => Object.assign({ id }, b)).sort((a, b) => b.amt - a.amt);
    const goal = C().goal || 0, got = sale && sale.sold ? sale.sold.amt : 0;
    const head = `<section class="oz-sec"><div class="oz-sc"><span>${IC.sell}</span><div><b>Seller Central</b><small>Private listing · ${esc(C().saleItem)}</small></div></div>
      <div class="oz-goal"><div class="oz-goal-n">${price(got)}<span>of your ${money(goal)} goal</span></div><div class="oz-bar"><i style="width:${(goal ? Math.min(100, got / goal * 100) : 0).toFixed(1)}%"></i></div></div></section>`;
    if (!sale) return head + `<form class="oz-sec oz-form" data-nw-form="list"><span class="oz-sec-h">Create a private listing</span><span class="oz-hint">Only the buyers you pick can see it. They bid from their own bank app, and the money waits in escrow.</span>
        <label>Asking price<span class="oz-amt"><span>$</span><input class="field" data-nw="ask" inputmode="decimal" placeholder="e.g. 25M" value="${esc(ui.ask)}" aria-label="Asking price" autocomplete="off"></span></label>
        <span class="oz-sec-h" style="font-size:13px">Offer it to</span>${(C().buyers || []).map(b => `<label class="oz-check"><input type="checkbox" data-nw-pitch="${b}" ${ui.pitch.includes(b) ? 'checked' : ''}>${esc(wname(b))}</label>`).join('')}
        <button class="oz-buy" type="submit">Publish listing</button>${errBox(ui, 'list')}</form>`;
    if (sale.sold) return head + `<section class="oz-sec"><span class="oz-badge ok" style="align-self:flex-start">Sold</span><b style="font-size:16px">Sold to ${esc(wname(sale.sold.to))} for ${money(sale.sold.amt)}</b><span class="oz-hint">${escrowed(s, 'crew') ? `The money is in escrow until ${esc(releaseAt())}. ` : ''}Now get it out of the building.</span></section>`;
    const more = (C().buyers || []).filter(b => !sale.pitched.includes(b));
    return head + `<section class="oz-sec"><span class="oz-sec-h">Your listing <span class="oz-badge hot">Live</span></span>
        <div class="oz-sum"><div><span>Asking</span><span><b>${money(sale.ask)}</b></span></div><div><span>Offered to</span><span>${sale.pitched.map(b => esc(wname(b))).join(', ')}</span></div></div>
        ${more.length ? `<div class="oz-btns">${more.map(b => `<button type="button" class="oz-btn" data-nw-addpitch="${b}">+ Offer to ${esc(wname(b))}</button>`).join('')}</div>` : ''}</section>
      <section class="oz-sec"><span class="oz-sec-h">Offers <span class="oz-badge">${bids.length}</span></span>
        ${bids.map((b, i) => `<div class="oz-bid${i === 0 ? ' top' : ''}"><div><b>${esc(wname(b.from))}</b><small>${esc(wallTime(b.at))}${i === 0 && bids.length > 1 ? ' · highest' : ''}</small></div><strong>${money(b.amt)}</strong><button type="button" class="oz-btn go" data-nw-accept="${b.id}">Accept</button></div>`).join('') || '<div class="oz-empty">No offers yet. Buyers see your listing in their bank app.</div>'}</section>
      <button type="button" class="oz-buy line" data-nw-close>Close the listing</button><div class="err" role="alert">${esc(ui.err)}</div>`;
  }
  /* ----- Messages: the crew's burner chat ----- */
  function burnerView(s, me, ui) {
    const msgs = Object.values(N(s).chat || {}).sort((a, b) => a.at - b.at).slice(-60);
    return `<div class="oz-msgs"><div class="oz-msgs-h"><span>${MARK(20)}</span><div><b>Crew chat</b><small>Only your crew can see this. Wiped at 23:59.</small></div></div>
      ${msgs.map(m => { const mine = m.by === me.id; return `<div class="oz-m${mine ? ' me' : ''}">${mine ? '' : `<small>${esc(first(m.by))} · ${esc(wallTime(m.at))}</small>`}<p>${esc(m.text)}</p>${mine ? `<small>${esc(wallTime(m.at))}</small>` : ''}</div>`; }).join('') || '<div class="oz-empty" style="margin:auto;text-align:center">No messages yet. Say something to your crew.</div>'}</div>
      <form class="oz-compose" data-nw-form="chat"><input data-nw="chat" value="${esc(ui.chat)}" maxlength="240" placeholder="Message your crew" aria-label="Message your crew" autocomplete="off"><button type="submit">Send</button></form>`;
  }
  function render(s, me, ui) {
    const w = walletOf(me); if (!w) return '<div class="oz nw"><div class="oz-sec">No Omnizon account.</div></div>';
    const crew = me.group === 'crew', casinoOK = typeof Casino !== 'undefined' && Casino.allowed(me);
    if (!['market', 'wallet', 'sale', 'burner', 'casino'].includes(ui.sub) || (!crew && (ui.sub === 'sale' || ui.sub === 'burner')) || (ui.sub === 'casino' && !casinoOK)) ui.sub = 'market';
    const why = blockedWhy(s, me, w), hold = why ? holdBox(s, me, why) : '';
    /* the crew and Vivienne bet from their own wallet; the casino keeps its own look */
    if (ui.sub === 'casino') return `<div class="oz nw">${band(s, me, ui, w)}${hold}</div><div class="nb nb-casino nw-casino">${Casino.render(s, me, ui, w)}</div>`;
    const body = ui.sub === 'wallet' ? walletView(s, me, ui, w) : ui.sub === 'sale' ? saleView(s, me, ui) : ui.sub === 'burner' ? burnerView(s, me, ui)
      : ui.view === 'checkout' ? checkoutView(s, me, ui, w) : ui.view === 'item' ? itemView(s, me, ui, w) : shopView(s, me, ui, w);
    /* a new page slides in once: the class stays for 0.8s, so a redraw in between doesn't restart or cut it */
    const vk = ui.sub + '/' + ui.view + '/' + ui.item; if (ui.lastView !== vk) { ui.lastView = vk; ui.inUntil = Date.now() + 800; }
    const fresh = Date.now() < (ui.inUntil || 0);
    return `<div class="oz nw${fresh ? ' oz-in' : ''}">${band(s, me, ui, w)}${hold}${body}${ui.sub === 'market' || ui.sub === 'wallet' ? FOOT : ''}</div>`;
  }
  /** live search: show and hide the product cards without redrawing under the typing */
  function filterShop(q) {
    const k = q.trim().toLowerCase(); let n = 0;
    $$('[data-oz-q]').forEach(c => { const hit = !k || c.dataset.ozQ.includes(k); c.hidden = !hit; if (hit) n++; });
    const cnt = $('[data-oz-count]'); if (cnt) cnt.textContent = n + (n === 1 ? ' result' : ' results');
    const none = $('[data-oz-none]'); if (none) { none.hidden = n > 0; const b = none.querySelector('b'); if (b) b.textContent = 'No results' + (k ? ' for "' + q.trim() + '"' : ''); }
  }

  /* ---------- Thorne Capital: Cameron's loans, advertised (Nov 25) ----------
     Every bank app (not Cameron's own) shows an ad with an "Ask for a loan" form.
     nw/loanreq/{id} = { from, w, amt, note, at, status: open|offered|declined } goes to the
     asker and to Cameron only (see Route in core.js). Cameron answers from his lending desk. */
  const reqs = s => Object.entries(N(s).loanreq || {}).map(([id, r]) => Object.assign({ id }, r)).sort((a, b) => b.at - a.at);
  function loanAd(s, me, ui, w, oz) {
    const L = LC(); if (!L.lender || isLender(me) || !G.byId(L.lender)) return '';
    const lw = walletOf(G.byId(L.lender)); if (!lw || w === lw) return '';
    const open = loans(s).find(l => l.to === w && l.lender === lw && (l.status === 'offer' || l.status === 'active'));
    const mine = reqs(s).find(r => r.from === me.id && r.status === 'open');
    const quick = [5000, 25000, 50000, 100000].filter(v => v >= L.min && v <= L.max);
    const body = open ? `<p class="tc-p">You have ${open.status === 'offer' ? 'an offer' : 'a loan'} from Thorne Capital. See it above.</p>`
      : mine ? `<p class="tc-p">✓ You asked for <b>${money(mine.amt)}</b>${mine.note ? ` ("${esc(mine.note)}")` : ''}. Cameron Thorne will send an offer if he likes it.</p>`
      : `<form class="tc-form" data-nw-form="loanreq"><div class="tc-quick">${quick.map(v => `<button type="button" class="tc-pill${ui.lreq === String(v) ? ' on' : ''}" data-nw-lreq="${v}">${'$' + (v / 1000) + 'K'}</button>`).join('')}</div>
          <input class="field" data-nw="lreqamt" inputmode="decimal" placeholder="Or type an amount (${money(L.min)} to ${money(L.max)})" value="${esc(ui.lreq || '')}" aria-label="Loan amount to ask for" autocomplete="off">
          <input class="field" data-nw="lreqnote" maxlength="60" placeholder="What's it for? (optional)" value="${esc(ui.lreqNote || '')}" aria-label="What it's for">
          <button class="tc-go" type="submit">Ask for a loan</button>${errBox(ui, 'loanreq')}</form>`;
    return `<section class="tc-ad${oz ? ' tc-oz' : ''}" aria-label="Advertisement"><span class="tc-sp">Sponsored</span>
      <div class="tc-top"><span class="tc-mark">TC</span><div><b>Thorne Capital</b><small>Private lending · tonight only</small></div></div>
      <p class="tc-head">Short on cash? Get <b>${money(L.min)} to ${money(L.max)}</b> in minutes.</p>
      <p class="tc-fine">No paperwork. No questions. Rates set by the lender. Repay on time.</p>${body}</section>`;
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

  /* the bank's look in each world (Nov 24): Bebbit Banking for guests and staff, the Federal Credit
     Union for the FBI. Same bank underneath; Names.say() in core.js swaps the name in every line. */
  function bankLogo(me) {
    const b = Names.bank(me);
    if (b === 'Bebbit Banking') return '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#5b3fd6"/><text x="16" y="22.5" text-anchor="middle" font-family="Plus Jakarta Sans, Inter, sans-serif" font-weight="800" font-size="19" fill="#fff">b</text><circle cx="24.5" cy="8" r="3" fill="#7ee0b5"/></svg>';
    if (b === 'Federal Credit Union') return '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#0e2240"/><path d="M16 6.5l9.5 5H6.5z" fill="#d4b25c"/><path d="M9 13.5h2.6v7.5H9zM14.7 13.5h2.6v7.5h-2.6zM20.4 13.5H23v7.5h-2.6zM7 22.5h18V25H7z" fill="#d4b25c"/></svg>';
    return '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="nbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8f7bff"/><stop offset="1" stop-color="#36d1c4"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#nbg)"/><path d="M19.5 8.5a8 8 0 1 0 4 14.6A9.5 9.5 0 0 1 19.5 8.5z" fill="#fff"/></svg>';
  }
  const bankTag = me => ({ 'Bebbit Banking': 'Banking by bebbit', 'Federal Credit Union': 'Members only · Since 1935' })[Names.bank(me)] || 'Private Banking';
  function renderBank(s, me, ui) {
    const w = walletOf(me); if (!w) return '<div class="nb"><div class="nb-panel">No NightBank account.</div></div>';
    const tabs = [['acct', 'Account']].concat(typeof Casino !== 'undefined' && Casino.allowed(me) ? [['casino', 'Casino']] : [], isLender(me) ? [['lend', 'Lending']] : []);
    if (!tabs.some(t => t[0] === ui.bsub)) ui.bsub = 'acct';
    const why = blockedWhy(s, me, w), out = isOut(s, me.id), cs = ui.bsub === 'casino';
    const body = cs ? (typeof Casino !== 'undefined' ? Casino.render(s, me, ui, w) : '') : ui.bsub === 'lend' ? lendView(s, me, ui, w) : acctView(s, me, ui, w);
    return `<div class="nb${cs ? ' nb-casino' : ''}">
      <div class="nb-top"><div class="nb-brand">${bankLogo(me)}<div><b>${esc(Names.bank(me))}</b><small>${esc(bankTag(me))}${cs ? ' · Casino floor' : ''}</small></div></div>
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
    const step = fuStep(s, f), got = fuCleared(s, f), pct = step / FU_STEPS * 100;
    return `<div class="nb-panel nb-fu"><div class="nb-h">Freeing up money <span class="nb-tag hot">Clearing</span></div>
      <div class="nb-fu-amt">${money(got)} <small>of ${money(f.amt)} in your balance</small></div>
      <div class="nb-bar nb-steps">${Array.from({ length: FU_STEPS }, (_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('')}</div>
      <div class="nb-row nb-sub"><span>Next ${money(f.amt / FU_STEPS)} at ${hmm(fuNextAt(s, f))}</span><span>all of it by ${hmm(f.ready)} · ${minsLeft(f.ready - now)} min left</span></div></div>`;
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
    const all = txs(s).filter(t => t.from === w || t.to === w), f = fuOf(s, w), freed = fuCleared(s, f);
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
      freed ? row('Your investments', fuReady(s, f) ? 'Freed up' : `Freed up so far (${fuStep(s, f)} of ${FU_STEPS} transfers)`, fuReady(s, f) ? 'cleared ' + hmm(f.now ? f.start : f.ready) : 'clearing', freed, false) : '',
      ...plain.map(t => { const out = t.from === w, who = out ? (t.toName || wname(t.to)) : wname(t.from); return row(who, t.memo, wallTime(t.at), t.amt, out); })
    ].join('') || '<div class="nb-empty">No activity yet. Money you send or receive tonight shows up here.</div>';
    const count = plain.length + (play.length ? 1 : 0) + (house.length ? 1 : 0) + (freed ? 1 : 0);
    return `<div class="nb-grid"><div class="nb-a">
        <div class="nb-card t-${tier(b).toLowerCase()}"><div class="nb-shine" aria-hidden="true"></div>
          <div class="nb-row"><span class="nb-holder">${esc(me.name)}</span><svg class="nb-cl" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7c2.5 3 2.5 7 0 10M12 5c3.5 4 3.5 10 0 14M16 3c4.5 5 4.5 13 0 18"/></svg></div>
          <span class="nb-chip" aria-hidden="true"></span>
          <div class="nb-bal"><small>Available balance</small><b data-count="${b}" data-count-k="nb">${money(b)}</b></div>
          <div class="nb-row"><span class="nb-num">•••• •••• •••• ${last4(w)}</span><span class="nb-tier">${tier(b)}</span></div></div>
        <div class="nb-stats"><div><small>Money in tonight</small><b class="pos">+${money(inSum)}</b></div><div><small>Money out tonight</small><b class="neg">−${money(outSum)}</b></div></div>
        ${loanPanel(s, me, w, ui)}${offer}${freeUpPanel(s, me, w, ui)}${loanAd(s, me, ui, w)}
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
      <p class="nb-fine">${esc(Names.bank(me))} · Accounts are confidential. Only you can see your balance. Tip: type amounts like 250K or 1.5M.</p>`;
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
          <label class="nb-l">Interest <b class="nb-rate" data-nw-rateout>${x.rate}%</b><input type="range" class="nb-range" data-nw="lrate" min="${L.rateMin}" max="${L.rateMax}" step="10" value="${x.rate}" aria-label="Interest rate"></label>
          <label class="nb-l">Due<select class="field" data-nw="lterm" aria-label="Due in">${(L.terms || [30]).map(t => `<option value="${t}" ${Number(x.term) === t ? 'selected' : ''}>${t} minutes after they accept</option>`).join('')}</select></label>
          <div class="nb-sum">They'd repay <b data-nw-owe>${owe ? money(owe) : '—'}</b></div>
          <button class="btn primary nb-go" type="submit">Send loan offer</button>
          ${errBox(ui, 'lend')}</form>
      </div><div class="nb-b">
        ${(() => { const rq = reqs(s).filter(r => r.status === 'open'); return `<div class="nb-panel nb-reqs"><div class="nb-h">Asking for a loan <span class="nb-count">${rq.length}</span></div>${rq.map(r => `<div class="nb-li"><div><b>${esc((G.byId(r.from) || {}).name || r.from)} wants ${money(r.amt)}</b><small>${r.note ? '"' + esc(r.note) + '" · ' : ''}${esc(wallTime(r.at))} · they have ${money(balance(s, r.w))}</small></div><div class="nb-li-a"><button type="button" class="btn small primary" data-nw-reqoffer="${r.id}">Make an offer</button><button type="button" class="btn small ghost" data-nw-reqno="${r.id}">Turn down</button></div></div>`).join('') || '<div class="nb-empty">Nobody has asked yet. Your ad runs in every bank app tonight.</div>'}</div>`; })()}
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
    return Number.isFinite(n) ? cents(n) : 0;
  };
  /** Run by the host page with the clock: freed-up money arriving, loans going overdue. */
  function tick(s, u) {
    Object.entries(N(s).freeup || {}).forEach(([w, f]) => {
      /* one notice per transfer as it lands (toldStep counts them); the last one says it's all in */
      const step = fuStep(s, f), told = f.told ? FU_STEPS : (f.toldStep || 0);
      if (step <= told) return;
      u['nw/freeup/' + w + '/toldStep'] = step;
      if (step >= FU_STEPS) {
        u['nw/freeup/' + w + '/told'] = true;
        alertWallet(u, w, 'NightBank', `The last ${money(f.amt / FU_STEPS)} from your investments has cleared. All ${money(f.amt)} is in your balance now.`);
        Clock.log(u, 'nightwire', `${wname(w)}: all ${money(f.amt)} freed up and cleared.`);
      } else alertWallet(u, w, 'NightBank', `${money(f.amt * (step - told) / FU_STEPS)} from your investments has cleared (${step} of ${FU_STEPS}). The next part arrives at ${hmm(fuNextAt(s, f))}.`);
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
    if ((el = q('[data-nw-sub]'))) { ui.sub = el.dataset.nwSub; ui.err = ''; if (ui.sub === 'market') { ui.view = 'home'; ui.bought = null; } window.scrollTo(0, 0); return done(); }
    /* Omnizon: categories, the product page, the checkout, back */
    if ((el = q('[data-nw-cat]'))) { ui.cat = el.dataset.nwCat; return done(); }
    if ((el = q('[data-nw-item]'))) { ui.view = 'item'; ui.item = el.dataset.nwItem; ui.bought = null; ui.err = ''; window.scrollTo(0, 0); return done(); }
    if ((el = q('[data-nw-checkout]'))) { ui.view = 'checkout'; ui.item = el.dataset.nwCheckout; ui.err = ''; window.scrollTo(0, 0); return done(); }
    if (q('[data-nw-back]')) { ui.view = ui.view === 'checkout' ? 'item' : 'home'; ui.bought = null; ui.err = ''; window.scrollTo(0, 0); return done(); }
    if ((el = q('[data-nb-sub]'))) { ui.bsub = el.dataset.nbSub; ui.err = ''; window.scrollTo(0, 0); return done(); }
    if (typeof Casino !== 'undefined' && (ui.bsub === 'casino' || ui.sub === 'casino') && Casino.onClick(e, ctx)) return true;
    if ((el = q('[data-nw-lq]'))) { ui.lend.amt = Number(el.dataset.nwLq).toLocaleString('en-US'); return done(); }
    if ((el = q('[data-nw-lreq]'))) { ui.lreq = el.dataset.nwLreq; return done(); }
    if ((el = q('[data-nw-reqoffer]'))) {
      const r = (N(DB.fresh()).loanreq || {})[el.dataset.nwReqoffer]; if (!r || !isLender(me)) return true;
      ui.lend.to = r.from; ui.lend.amt = Number(r.amt).toLocaleString('en-US'); ui.bsub = 'lend'; window.scrollTo(0, 0); return done();
    }
    if ((el = q('[data-nw-reqno]'))) {
      const s = DB.fresh(), id = el.dataset.nwReqno, r = (N(s).loanreq || {})[id]; if (!r || !isLender(me)) return true;
      const u = { ['nw/loanreq/' + id + '/status']: 'declined' }; const bw = walletOf(G.byId(r.from)); if (bw) alertWallet(u, bw, 'Thorne Capital', 'Thorne Capital has turned down your loan request.');
      DB.update(u); return done();
    }
    if (q('[data-nw-freeup]')) {
      const s = DB.fresh(), w = walletOf(me), cfg = fuCfg(w);
      if (!cfg || fuOf(s, w)) return true;
      const why = blockedWhy(s, me, w); if (why) return err('freeup', why);
      if (!Ask.sure(`Free up ${money(cfg.amt)}? It takes ${waitLabel(cfg.wait)} on the game clock to clear, and you can only do this once tonight.`, () => onClick(e, ctx))) return true;
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
      if (!Ask.sure(`Accept ${money(l.amt)} from ${wname(l.lender)}? You'll owe ${money(l.owed)} by ${hmm(due)} on the game clock.`, () => onClick(e, ctx))) return true;
      spend(l.lender, l.amt, s2 => {
        const l2 = loanById(s2, l.id); if (!l2 || l2.status !== 'offer') return null;
        const u = { ['nw/loans/' + l.id + '/status']: 'active', ['nw/loans/' + l.id + '/due']: due, ['nw/loans/' + l.id + '/acceptedBy']: me.id };
        transfer(u, l.lender, w, l.amt, 'Loan', me.id, null);
        alertWallet(u, l.lender, 'Loan accepted', `${me.name} accepted your loan of ${money(l.amt)}. ${money(l.owed)} is due at ${hmm(due)}.`);
        return u;
      }).then(ok => { if (!ok) { say(ui, 'loan', `${wname(l.lender)} can't fund this loan right now.`); ctx.redraw(true); } });
      ui.err = ''; return done();
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
      if (!Ask.sure(`Repay ${money(l.owed)} to ${wname(l.lender)}?`, () => onClick(e, ctx))) return true;
      spend(w, l.owed, s2 => {
        const l2 = loanById(s2, l.id); if (!l2 || l2.status !== 'active') return null;
        const u = { ['nw/loans/' + l.id + '/status']: 'paid', ['nw/loans/' + l.id + '/paidAt']: Date.now() };
        transfer(u, w, l.lender, l.owed, 'Loan repaid', me.id, null);
        /* paying it off lifts a court freeze, unless another loan is still overdue */
        const f = frozen(s2, w);
        if (f && f.by === 'court' && !loans(s2).some(x => x.id !== l.id && x.to === w && isLate(s2, x))) unfreeze(u, w, l.lender);
        return u;
      }).then(ok => { if (!ok) { say(ui, 'loan', `That didn't go through: ${wname(w)} doesn't have ${money(l.owed)} any more.`); ctx.redraw(true); } });
      ui.err = ''; return done();
    }
    if ((el = q('[data-nw-court]'))) {
      const s = DB.fresh(), l = loanById(s, el.dataset.nwCourt);
      if (!l || !isLender(me) || !isLate(s, l) || l.court) return true;
      if (isOut(s, me.id)) return err('loan', blockedWhy(s, me, l.lender));
      if (!Ask.sure(`Get a court order to freeze ${bname(l)}'s account? They won't be able to move money until they repay.`, () => onClick(e, ctx))) return true;
      const u = { ['nw/loans/' + l.id + '/court']: Date.now() };
      if (!frozen(s, l.to)) freeze(u, l.to, 'court', me.id, l.id);
      DB.update(u); return done();
    }
    if ((el = q('[data-nw-name]'))) {
      const s = DB.fresh(), l = loanById(s, el.dataset.nwName);
      if (!l || !isLender(me) || !isLate(s, l) || l.named) return true;
      if (isOut(s, me.id)) return err('loan', blockedWhy(s, me, l.lender));
      if (!Ask.sure(`Name ${bname(l)} publicly? Every phone in the room will see that they defaulted.`, () => onClick(e, ctx))) return true;
      const u = { ['nw/loans/' + l.id + '/named']: Date.now() };
      u['feed/' + uid('w')] = { to: ['all'], title: wname(l.lender) + ' · public notice', text: `${bname(l)} has defaulted on a loan and owes ${money(l.owed)}.`, at: Date.now(), kind: 'nw' };
      Clock.log(u, 'nightwire', `${me.name} publicly named ${bname(l)} for an unpaid loan. Throw them out? (People tab)`);
      DB.update(u); return done();
    }
    if ((el = q('[data-nw-open]'))) { ui.open = ui.open === el.dataset.nwOpen ? null : el.dataset.nwOpen; fresh(ui, ui.open); return done(); }
    if ((el = q('[data-nw-buy]'))) {
      const it = (C().market || []).find(x => x.id === el.dataset.nwBuy), s = DB.fresh(), w = walletOf(me);
      if (!it || owns(s, w, it.id)) return true;
      const why = blockedWhy(s, me, w); if (why) return err('buy', why);
      if (soldTo(s, it.id)) return err('buy', 'Sold. Someone else bought that file first.');
      if (balance(s, w) < it.price) return err('buy', `Not enough in your wallet. You have ${money(balance(s, w))}.`);
      /* the checkout's "Place your order" is the confirmation; anywhere else, ask first */
      if (!el.dataset.nwNow && !Ask.sure(`Buy "${it.title}" for ${money(it.price)}?`, () => onClick(e, ctx))) return true;
      spend(w, it.price, s2 => {
        if (owns(s2, w, it.id) || soldTo(s2, it.id)) return null;
        const u = { ['nw/tx/' + uid('t')]: { from: w, to: 'market', amt: it.price, memo: it.title, by: me.id, at: Date.now(), item: it.id }, ['nw/bought/' + w + '/' + it.id]: { by: me.id, at: Date.now() } };
        Clock.log(u, 'nightwire', `${me.name} bought "${it.title}" for ${money(it.price)} (${wname(w)}).`);
        if (it.clue && !(s2.clues && s2.clues[it.clue])) { u['clues/' + it.clue] = { at: Date.now(), by: 'NIGHTWIRE' }; Clock.log(u, 'nightwire', `Evidence ${it.clue} bought on NIGHTWIRE.`); }
        alertWallet(u, w, 'NIGHTWIRE', `${me.name.split(' ')[0]} bought "${it.title}". It's in the market tab.`, me.id);
        return u;
      }).then(ok => { if (!ok) { say(ui, 'buy', soldTo(DB.get(), it.id) ? 'Sold. Someone else bought that file first.' : 'Not enough in your wallet any more (someone on your account spent first).'); ui.open = null; ui.bought = null; ctx.redraw(true); } });
      ui.open = it.id; ui.item = it.id; ui.view = 'item'; ui.bought = it.id; fresh(ui, it.id); ui.err = ''; window.scrollTo(0, 0); return done();
    }
    if ((el = q('[data-nw-addpitch]'))) {
      const s = DB.fresh(), sale = N(s).sale; if (!sale) return true;
      if (isOut(s, me.id)) { ui.err = blockedWhy(s, me, walletOf(me)); return done(); }
      const u = { 'nw/sale/pitched': sale.pitched.concat([el.dataset.nwAddpitch]) }; alertWallet(u, el.dataset.nwAddpitch, 'Private offer', 'A private seller has something you\'ll want. Check your NightBank tab.'); DB.update(u); return true;
    }
    if ((el = q('[data-nw-accept]'))) {
      const s = DB.fresh(), b = (N(s).bids || {})[el.dataset.nwAccept];
      if (!b || !N(s).sale || N(s).sale.sold) return true;
      if (isOut(s, me.id)) { ui.err = blockedWhy(s, me, walletOf(me)); return done(); }
      if (balance(s, b.from) < b.amt) { ui.err = `${wname(b.from)} can't cover that bid anymore.`; return done(); }
      if (frozen(s, b.from) || isOut(s, b.by)) { ui.err = `${wname(b.from)}'s account is locked. That bid can't be paid.`; return done(); }
      if (!Ask.sure(`Sell to ${wname(b.from)} for ${money(b.amt)}?`, () => onClick(e, ctx))) return true;
      spend(b.from, b.amt, s2 => {
        const sale2 = N(s2).sale; if (!sale2 || sale2.sold) return null;
        const u = { 'nw/sale/sold': { to: b.from, amt: b.amt, at: Date.now() } };
        transfer(u, b.from, 'crew', b.amt, 'Private sale', me.id, null, C().escrowUntil || null);
        alertWallet(u, b.from, 'You won', `Your bid of ${money(b.amt)} was accepted. The seller will arrange collection.`);
        Clock.log(u, 'nightwire', `SOLD: the painting to ${wname(b.from)} for ${money(b.amt)}.`);
        return u;
      }).then(ok => { if (!ok) { ui.err = `${wname(b.from)} can't cover that bid anymore.`; ctx.redraw(true); } });
      return true;
    }
    if (q('[data-nw-close]')) { if (!Ask.sure('Close the sale? Bids are cleared.', () => onClick(e, ctx))) return true; const u = { 'nw/sale': null, 'nw/bids': null }; Clock.log(u, 'nightwire', `${me.name} closed the sale.`); DB.update(u); return true; }
    return false;
  }
  function onInput(e, ctx) {
    const el = e.target, ui = ctx.ui, k = el.dataset && el.dataset.nw;
    if (typeof Casino !== 'undefined' && (ui.bsub === 'casino' || ui.sub === 'casino') && Casino.onInput(e, ctx)) return true;
    if (!k) return false;
    if (k === 'q') { ui.q = el.value; filterShop(ui.q); return true; }
    if (k === 'lreqamt') { ui.lreq = el.value; return true; }
    if (k === 'lreqnote') { ui.lreqNote = el.value; return true; }
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
    if (kind === 'search') { if (document.activeElement) document.activeElement.blur(); return true; }
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
      if (!Ask.sure(`Send ${money(amt)} to ${tname}?`, () => onSubmit(e, ctx))) return true;
      const memo = ui.send.memo.trim();
      spend(w, amt, () => { const u = {}; transfer(u, w, tw, amt, memo, me.id, tname); return u; })
        .then(ok => { if (!ok) { ui.sent = null; say(ui, 'send', `That didn't go through: ${wname(w)} doesn't have ${money(amt)} any more (someone else on the account spent first).`); ctx.redraw(true); } });
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
      ui.pitch.forEach(b => alertWallet(u, b, 'Private offer', 'A private seller has something you\'ll want. Check your NightBank tab.'));
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
    if (kind === 'loanreq') {
      const L = LC(), amt = amount(ui.lreq), lender = G.byId(L.lender);
      if (!lender || isLender(me)) return true;
      if (amt < L.min || amt > L.max) return fail(`Thorne Capital lends ${money(L.min)} to ${money(L.max)}.`);
      if (isOut(s, me.id)) return fail(blockedWhy(s, me, w));
      if (reqs(s).some(r => r.from === me.id && r.status === 'open')) return fail('You already have a request waiting.');
      const note = (ui.lreqNote || '').trim();
      const u = { ['nw/loanreq/' + uid('q')]: { from: me.id, w, amt, note: note || null, at: Date.now(), status: 'open' } };
      alertWallet(u, walletOf(lender), 'Loan request', `${me.name} is asking Thorne Capital for ${money(amt)}${note ? ': "' + note + '"' : ''}. Answer from your lending desk.`);
      Clock.log(u, 'nightwire', `${me.name} asked Thorne Capital for a ${money(amt)} loan.`);
      DB.update(u); ui.lreq = ''; ui.lreqNote = ''; return ok();
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
      /* answering a request closes it */
      reqs(s).filter(r => r.from === c.id && r.status === 'open').forEach(r => { u['nw/loanreq/' + r.id + '/status'] = 'offered'; });
      DB.update(u); ui.lend = { to: '', amt: '', rate: x.rate, term }; return ok();
    }
    if (kind === 'unfreeze') {
      if (!(C().unfreezers || []).includes(me.id) || (N(s).unfroze || {})[me.id]) return true;
      const t = ui.unf; if (!t || !frozen(s, t)) return fail('Choose a frozen wallet.');
      if (!Ask.sure(`Unfreeze ${wname(t)}? You can only do this once tonight.`, () => onSubmit(e, ctx))) return true;
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

  return { newUI, render, renderBank, onClick, onInput, onChange, onSubmit, walletOf, wname, balance, spend, publish, sees, txs, money, amount, pendingState, wallets: W, membersOf,
    tick, arriveNow, freeze, unfreeze, frozen, isOut, blockedWhy, fuCfg, fuOf, fuReady, fuCleared, fuStep, loans, isLate, nightNow, bname, FROZE, phaseIdx, cfg: C,
    brand: { mark: MARK, word: WORD } };
})();
