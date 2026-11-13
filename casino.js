/* =====================================================================
   THE VANISHING HOUR — the Saint-Clair Foundation Casino.
   Lives inside NightBank (the Casino tab). Three tables: Roulette, Blackjack
   and Lucky dice. Chips are real NightBank money.

   THE HOUSE ALWAYS HAS THE EDGE (Jacob, Nov 12):
     Roulette   American wheel (0 and 00): every bet loses 5.26% on average.
     Blackjack  6-deck shoe, blackjack pays 6 to 5, dealer hits soft 17,
                no splits, no insurance: about 2-3%.
     Lucky dice every bet pays below its true odds: 11% to 17%.
   Whatever the house wins on a round goes to Dominique's foundation, less
   Harper's event fee (story.js > nightwire.casino). No sound.

   Money: the stake leaves the player's account when the round starts (like
   putting chips down). When it ends the casino pays out any winnings, and
   passes what it kept to the foundation.
     nw/rounds/{id} = { w, by, game, stake, payout, result, bets, at, status: open|done, net, doneAt }
     nw/casinoMode  = 'open' | 'closed' | null (null = follow the clock)
   ===================================================================== */
const Casino = (() => {
  const CFG = () => (NW.cfg().casino) || {};
  const N = s => s.nw || {};
  const money = n => NW.money(n);
  const chipTxt = v => v >= 1e6 ? (v / 1e6) + 'M' : v >= 1e3 ? (v / 1e3) + 'K' : String(v);
  const short = v => '$' + (v >= 1e6 ? +(v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? +(v / 1e3).toFixed(1) + 'K' : v);
  const sum = o => Object.values(o || {}).reduce((n, v) => n + v, 0);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rounds = s => Object.entries(N(s).rounds || {}).map(([id, r]) => Object.assign({ id }, r)).sort((a, b) => b.at - a.at);

  /** Who may play (story.js > casino.groups). The FBI may not. */
  const allowed = me => !!me && (CFG().groups || ['guest', 'staff', 'crew', 'thief']).includes(me.group);
  function isOpen(s) {
    const m = N(s).casinoMode; if (m === 'open') return true; if (m === 'closed') return false;
    const r = Clock.read(s), c = CFG(); if (r.state === 'before' || r.state === 'over') return false;
    const a = NW.phaseIdx(c.opens), b = NW.phaseIdx(c.closes);
    return (a < 0 || r.i >= a) && (b < 0 || r.i < b);
  }
  const opensLabel = () => (STORY.phases.find(p => p.id === CFG().opens) || {}).name || 'the gala';

  /* No sound (Jacob, Nov 12). The calls stay so the tables keep their timing; they do nothing. */
  const SFX = { on: () => false, set() { }, chip() { }, card() { }, spin() { }, dice() { }, win() { }, lose() { } };
  const buzz = p => { try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(p); } catch (e) { } };

  /* ---------- roulette (American: 0 and 00; 37 stands for 00) ---------- */
  const AM = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, 37, 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2];
  const SEG = 360 / AM.length;
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const col = n => n === 0 || n === 37 ? 'green' : REDS.has(n) ? 'red' : 'black';
  const lab = n => n === 37 ? '00' : String(n);
  /* every bet's payout ("to 1") and whether it wins */
  const RB = {
    red: [1, n => col(n) === 'red', 'Red'], black: [1, n => col(n) === 'black', 'Black'],
    odd: [1, n => n > 0 && n < 37 && n % 2 === 1, 'Odd'], even: [1, n => n > 0 && n < 37 && n % 2 === 0, 'Even'],
    low: [1, n => n >= 1 && n <= 18, '1 to 18'], high: [1, n => n >= 19 && n <= 36, '19 to 36'],
    d1: [2, n => n >= 1 && n <= 12, '1st dozen'], d2: [2, n => n >= 13 && n <= 24, '2nd dozen'], d3: [2, n => n >= 25 && n <= 36, '3rd dozen'],
    c1: [2, n => n > 0 && n < 37 && n % 3 === 1, '1st column'], c2: [2, n => n > 0 && n < 37 && n % 3 === 2, '2nd column'], c3: [2, n => n > 0 && n < 37 && n % 3 === 0, '3rd column']
  };
  const rbet = spot => spot[0] === 'n' ? [35, n => n === Number(spot.slice(1)), 'Straight ' + lab(Number(spot.slice(1)))] : RB[spot];
  const FILL = { red: '#b3192b', black: '#141418', green: '#0b7d4f' };
  let WHEEL = null;
  function wheelSVG() {
    if (WHEEL) return WHEEL;
    const P = (r, a) => { const t = a * Math.PI / 180; return (r * Math.sin(t)).toFixed(2) + ' ' + (-r * Math.cos(t)).toFixed(2); };
    let pk = '', tx = '', fr = '';
    AM.forEach((n, i) => {
      const a0 = i * SEG - SEG / 2, a1 = i * SEG + SEG / 2;
      pk += `<path d="M${P(86, a0)}A86 86 0 0 1 ${P(86, a1)}L${P(58, a1)}A58 58 0 0 0 ${P(58, a0)}Z" fill="${FILL[col(n)]}"/>`;
      tx += `<text transform="rotate(${(i * SEG).toFixed(2)}) translate(0 -77)">${lab(n)}</text>`;
      fr += `<path d="M${P(58, a0)}L${P(86, a0)}"/>`;
    });
    const diamonds = Array.from({ length: 8 }, (_, i) => `<path transform="rotate(${i * 45 + 22.5})" d="M0 -95L2.6 -91.5L0 -88L-2.6 -91.5Z"/>`).join('');
    WHEEL = `<svg viewBox="-100 -100 200 200" aria-hidden="true">
      <defs><radialGradient id="csWood" cx="35%" cy="30%"><stop offset="0" stop-color="#8a5a2b"/><stop offset=".7" stop-color="#4a2a10"/><stop offset="1" stop-color="#2a1607"/></radialGradient>
        <radialGradient id="csCone" cx="40%" cy="35%"><stop offset="0" stop-color="#7a4a20"/><stop offset=".6" stop-color="#4b2a10"/><stop offset="1" stop-color="#2b1708"/></radialGradient>
        <radialGradient id="csGold" cx="35%" cy="30%"><stop offset="0" stop-color="#fff1c4"/><stop offset=".5" stop-color="#d9b05c"/><stop offset="1" stop-color="#8a6420"/></radialGradient></defs>
      <circle r="99" fill="url(#csWood)"/><circle r="99" fill="none" stroke="#d9b05c" stroke-width="1.2" opacity=".7"/>
      <circle r="90" fill="#1d1208"/><g fill="url(#csGold)">${diamonds}</g>
      <g>${pk}</g><g stroke="#e3c27a" stroke-width=".7" opacity=".9">${fr}</g>
      <circle r="86" fill="none" stroke="#e3c27a" stroke-width="1"/><circle r="68" fill="none" stroke="#e3c27a" stroke-width=".8"/><circle r="58" fill="none" stroke="#e3c27a" stroke-width="1"/>
      <g class="w-n">${tx}</g>
      <circle r="57" fill="url(#csCone)"/><circle r="40" fill="none" stroke="rgba(255,220,150,.15)" stroke-width="6"/>
      <g fill="url(#csGold)"><circle r="11"/><rect x="-2.2" y="-34" width="4.4" height="68" rx="2.2"/><rect x="-34" y="-2.2" width="68" height="4.4" rx="2.2"/><circle cx="0" cy="-34" r="4"/><circle cx="0" cy="34" r="4"/><circle cx="-34" cy="0" r="4"/><circle cx="34" cy="0" r="4"/><circle r="5" fill="#fff6d8"/></g>
    </svg>`;
    return WHEEL;
  }

  /* ---------- the persistent stage pieces ----------
     The wheel and the dice are real DOM nodes kept across redraws and moved into their slot after
     each render, so a spin in progress never restarts when someone else's bet updates the page. */
  let wheelNode = null, diceNode = null, wheelRot = 0;
  function getWheel() {
    if (!wheelNode) {
      wheelNode = document.createElement('div'); wheelNode.className = 'cs-wheel-box';
      wheelNode.innerHTML = `<span class="cs-ptr"></span><div class="cs-wheel">${wheelSVG()}</div><div class="cs-orbit"><i class="cs-ball"></i></div><div class="cs-glass"></div>`;
    }
    return wheelNode;
  }
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const pips = n => Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[n].includes(i) ? 'on' : ''}"></i>`).join('');
  function getDice() {
    if (!diceNode) {
      diceNode = document.createElement('div'); diceNode.className = 'cs-dice-box';
      diceNode.innerHTML = `<span class="cs-die">${pips(5)}</span><span class="cs-die">${pips(2)}</span>`;
    }
    return diceNode;
  }
  /** Called by the app after every redraw. */
  function mount() {
    const ws = document.querySelector('.cs-slot-wheel'); if (ws && !ws.contains(getWheel())) ws.appendChild(getWheel());
    const ds = document.querySelector('.cs-slot-dice'); if (ds && !ds.contains(getDice())) ds.appendChild(getDice());
  }
  function spinWheel(n, ms) {
    const box = getWheel(), wheel = box.querySelector('.cs-wheel'), orbit = box.querySelector('.cs-orbit'), ball = box.querySelector('.cs-ball');
    const i = AM.indexOf(n), from = wheelRot, target = ((-i * SEG) % 360 + 360) % 360;
    const to = from + 360 * 4 + ((target - from % 360) % 360 + 360) % 360;
    wheelRot = to % 360;
    if (reduced() || ms < 400) { wheel.style.transform = `rotate(${to}deg)`; orbit.style.transform = 'rotate(0deg)'; ball.style.top = '18%'; return; }
    wheel.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${to}deg)` }], { duration: ms, easing: 'cubic-bezier(.12,.62,.16,1)', fill: 'forwards' });
    orbit.animate([{ transform: 'rotate(1440deg)' }, { transform: 'rotate(0deg)' }], { duration: ms, easing: 'cubic-bezier(.2,.55,.25,1)', fill: 'forwards' });
    ball.animate([{ top: '3.5%', offset: 0 }, { top: '3.5%', offset: .66 }, { top: '13%', offset: .74 }, { top: '8%', offset: .8 }, { top: '16%', offset: .87 }, { top: '14%', offset: .92 }, { top: '18%', offset: 1 }], { duration: ms, easing: 'linear', fill: 'forwards' });
  }
  function rollDice(a, b, ms) {
    const box = getDice(), dice = box.querySelectorAll('.cs-die');
    if (reduced() || ms < 400) { dice[0].innerHTML = pips(a); dice[1].innerHTML = pips(b); return; }
    dice.forEach((d, k) => {
      d.animate([
        { transform: `translate(${160 + k * 40}%, -120%) rotate(${-540 - k * 90}deg) scale(.85)`, offset: 0 },
        { transform: `translate(${40 - k * 10}%, 20%) rotate(${-180 + k * 40}deg) scale(1)`, offset: .55 },
        { transform: `translate(${-8 + k * 4}%, -18%) rotate(${-40 + k * 20}deg)`, offset: .72 },
        { transform: 'translate(0, 0) rotate(0deg)', offset: .88 },
        { transform: 'translate(0, -3%) rotate(0deg)', offset: .94 },
        { transform: 'translate(0, 0) rotate(0deg)', offset: 1 }
      ], { duration: ms, easing: 'cubic-bezier(.3,.6,.4,1)' });
    });
    /* the faces tumble, then land on the result */
    let k = 0; const iv = setInterval(() => { dice[0].innerHTML = pips(1 + Math.floor(Math.random() * 6)); dice[1].innerHTML = pips(1 + Math.floor(Math.random() * 6)); if (++k > ms / 90 * .8) { clearInterval(iv); dice[0].innerHTML = pips(a); dice[1].innerHTML = pips(b); } }, 90);
  }

  /* ---------- blackjack ---------- */
  const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  function newShoe() { const d = []; for (let k = 0; k < 6; k++) SUITS.forEach(su => RANKS.forEach(r => d.push(r + su))); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
  const rankOf = c => c.slice(0, -1), suitOf = c => c.slice(-1);
  const val = c => { const r = rankOf(c); return r === 'A' ? 11 : ['J', 'Q', 'K'].includes(r) ? 10 : Number(r); };
  function total(cards) { let t = 0, a = 0; cards.forEach(c => { t += val(c); if (rankOf(c) === 'A') a++; }); while (t > 21 && a) { t -= 10; a--; } return { t, soft: a > 0 && t <= 21 }; }
  const isBJ = cards => cards.length === 2 && total(cards).t === 21;
  const tLabel = cards => { const x = total(cards); return isBJ(cards) ? 'Blackjack' : x.t > 21 ? 'Bust · ' + x.t : (x.soft && x.t < 21 ? 'Soft ' : '') + x.t; };

  /* ---------- lucky dice ---------- */
  const DB_ = {
    under: [1, (a, b) => a + b < 7, 'Under 7', '2 to 6'], seven: [4, (a, b) => a + b === 7, 'Lucky 7', 'exactly 7'], over: [1, (a, b) => a + b > 7, 'Over 7', '8 to 12'],
    doubles: [4, (a, b) => a === b, 'Doubles', 'any pair'], ends: [15, (a, b) => a + b === 2 || a + b === 12, 'Snake eyes or boxcars', '2 or 12']
  };

  /* ---------- per-player table state (kept in the NightBank ui) ---------- */
  const newCS = () => ({ game: 'roulette', chip: 0, bets: { roulette: {}, dice: {}, blackjack: {} }, hist: { roulette: [], dice: [], blackjack: [] }, last: {}, busy: false, res: null, bj: null, shoe: null, rules: false, err: '', active: null });
  const S = ui => ui.cs || (ui.cs = newCS());
  const chipsFor = () => (CFG().chips || [1000, 10000, 100000, 1000000, 5000000]);
  const chipClass = v => 'v' + chipsFor().indexOf(chipsFor().filter(c => c <= v).pop() || chipsFor()[0]);
  const chipEl = (v, extra) => `<span class="ch ${chipClass(v)}${extra ? ' ' + extra : ''}"><span>${chipTxt(v)}</span></span>`;

  /* ---------- money ---------- */
  function startRound(me, w, game, stake, extra) {
    const id = uid('r'), at = Date.now(), u = {};
    u['nw/tx/' + uid('t')] = { from: w, to: 'casino', amt: stake, memo: { roulette: 'Roulette', dice: 'Lucky dice', blackjack: 'Blackjack' }[game], by: me.id, at, cs: true };
    u['nw/rounds/' + id] = Object.assign({ w, by: me.id, game, stake, at, status: 'open' }, extra || {});
    DB.update(u); return id;
  }
  function addStake(id, me, w, amt) {
    const s = DB.fresh(), r = (N(s).rounds || {})[id]; if (!r) return;
    DB.update({ ['nw/tx/' + uid('t')]: { from: w, to: 'casino', amt, memo: 'Blackjack · double', by: me.id, at: Date.now(), cs: true }, ['nw/rounds/' + id + '/stake']: r.stake + amt });
  }
  /** End a round: pay the player, and pass what the house kept to the foundation (less Harper's fee). */
  function settle(id, payout, result, memo) {
    const s = DB.fresh(), r = (N(s).rounds || {})[id]; if (!r || r.status !== 'open') return null;
    const c = CFG(), at = Date.now(), u = {}, kept = r.stake - payout;
    if (payout > 0) u['nw/tx/' + uid('t')] = { from: 'casino', to: r.w, amt: payout, memo: memo || 'Casino payout', by: r.by, at, cs: true };
    if (kept > 0) {
      const cut = Math.round(kept * (c.harperCut || 0)), ws = NW.wallets();
      if (c.beneficiary && ws[c.beneficiary]) u['nw/tx/' + uid('t')] = { from: 'casino', to: c.beneficiary, amt: kept - cut, memo: 'Charity casino proceeds', by: 'casino', at, house: true };
      if (cut && c.feeTo && ws[c.feeTo]) u['nw/tx/' + uid('t')] = { from: 'casino', to: c.feeTo, amt: cut, memo: 'Casino event fee', by: 'casino', at, house: true };
    }
    const net = payout - r.stake;
    Object.assign(u, { ['nw/rounds/' + id + '/status']: 'done', ['nw/rounds/' + id + '/payout']: payout, ['nw/rounds/' + id + '/net']: net, ['nw/rounds/' + id + '/result']: result || null, ['nw/rounds/' + id + '/doneAt']: at });
    const who = G.byId(r.by) ? G.byId(r.by).name : r.by, game = { roulette: 'roulette', dice: 'Lucky dice', blackjack: 'blackjack' }[r.game];
    if (Math.abs(net) >= 1000000) Clock.log(u, 'nightwire', `${who} ${net > 0 ? 'won' : 'lost'} ${money(Math.abs(net))} at ${game}.`);
    DB.update(u); return net;
  }
  /* a round left open (the phone closed mid-spin): spins settle as dealt, an abandoned blackjack hand is forfeited */
  const recovering = new Set();
  function recover(s, me, c) {
    rounds(s).filter(r => r.status === 'open' && r.by === me.id && r.id !== c.active && !recovering.has(r.id)).forEach(r => {
      const age = Date.now() - r.at;
      if (r.game === 'blackjack' ? age > 10 * 60000 : age > 9000) {
        recovering.add(r.id);
        setTimeout(() => settle(r.id, r.game === 'blackjack' ? 0 : (r.payout || 0), r.result || null, r.game === 'blackjack' ? 'Blackjack · hand forfeited' : 'Casino payout'), 0);
      }
    });
  }

  /* ---------- screens ---------- */
  const ICON = {
    rules: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/></svg>'
  };
  const fresh = (at, ms) => at && Date.now() - at < ms;
  const dealerLine = (c, open) => {
    if (!open) return `The tables open at ${opensLabel()}.`;
    const r = c.res && c.res.game === c.game ? c.res : null;
    const pays = (wins, name) => wins.length ? `${wins.map(name).join(' and ')} ${wins.length > 1 ? 'pay' : 'pays'}.` : 'The house takes the table.';
    if (c.game === 'roulette') return c.busy ? 'No more bets.' : r ? `${lab(r.n)} ${col(r.n)}. ${pays(r.wins, k => rbet(k)[2])}` : sum(c.bets.roulette) ? 'Bets are down. Spin when ready.' : 'Place your bets.';
    if (c.game === 'dice') return c.busy ? 'Dice are out…' : r ? `${r.a + r.b}${r.a === r.b ? ', a pair' : ''}. ${pays(r.wins, k => DB_[k][2])}` : sum(c.bets.dice) ? 'Bets are down. Roll when ready.' : 'Place your bets on the felt.';
    const h = c.bj; if (!h || h.phase === 'bet') return 'Place your bet in the circle.';
    if (h.phase === 'play') return 'Hit or stand?';
    if (h.phase === 'dealer') return 'Dealer plays…';
    return h.msg || 'Thank you.';
  };
  function rulesCard(game) {
    const R = {
      roulette: ['American roulette: 38 pockets, 1 to 36 plus 0 and 00.', 'Straight number pays 35 to 1. Dozens and columns pay 2 to 1. Red, black, odd, even, 1–18 and 19–36 pay even money.', '0 and 00 beat every outside bet.', 'House edge: 5.26% on every bet.'],
      blackjack: ['Six decks. Get closer to 21 than the dealer without going over.', 'Blackjack pays 6 to 5. Other wins pay even money. Ties push.', 'Dealer hits soft 17. Double down on your first two cards. No splits, no insurance.', 'House edge: about 2 to 3%.'],
      dice: ['Two dice. Bet on the felt, then roll.', 'Under 7 or Over 7 pays even money. Lucky 7 pays 4 to 1. Doubles pays 4 to 1. Snake eyes or boxcars (2 or 12) pays 15 to 1.', 'House edge: 16.7% on most bets, 11.1% on 2 or 12.']
    }[game];
    return `<div class="cs-rules"><b>House rules</b>${R.map(x => `<p>${esc(x)}</p>`).join('')}<p class="cs-rules-f">The odds always favor the house. Tonight, everything the house wins goes to the Saint-Clair Foundation.</p></div>`;
  }
  function ticker(s) {
    const c = CFG(), big = rounds(s).filter(r => r.status === 'done' && r.net >= (c.bigWin || 250000)).slice(0, 6);
    const raised = NW.txs(s).filter(t => t.house && t.to === c.beneficiary).reduce((n, t) => n + t.amt, 0);
    const items = big.map(r => `<span><b>${esc((G.byId(r.by) || { name: '?' }).name.split(' ')[0])}</b> won ${short(r.net)} at ${r.game === 'dice' ? 'Lucky dice' : r.game}</span>`);
    return `<div class="cs-ticker"><span class="cs-live"><i></i>Live</span><div class="cs-tick"><div class="cs-tick-in">${items.length ? items.concat(items).join('') : '<span>The tables are waiting for their first big winner.</span>'}</div></div><span class="cs-raised"><small>Raised for the foundation</small><b>${money(raised)}</b></span></div>`;
  }
  function history(s) {
    const list = rounds(s).filter(r => r.game === 'roulette' && r.status === 'done' && r.result).slice(0, 14);
    return `<div class="cs-hist" aria-label="Recent numbers">${list.map((r, i) => `<span class="${col(r.result.n)}${i === 0 ? ' first' : ''}">${lab(r.result.n)}</span>`).join('') || '<em>No spins yet tonight</em>'}</div>`;
  }
  function resultPlaque(c) {
    const r = c.res; if (!r || r.game !== c.game || c.busy) return '';
    const pop = fresh(r.at, 1200) ? ' pop' : '';
    const head = r.game === 'roulette' ? `<span class="cs-ballnum ${col(r.n)}">${lab(r.n)}</span>` : r.game === 'dice' ? `<span class="cs-ballnum dice">${r.a + r.b}</span>` : `<span class="cs-ballnum bj">${r.out === 'bj' ? 'BJ' : r.out === 'push' ? '=' : r.net > 0 ? 'W' : 'L'}</span>`;
    const what = r.net > 0 ? 'You win' : r.net === 0 ? (r.game === 'blackjack' ? 'Push' : 'Even') : 'The house wins';
    return `<div class="cs-res ${r.net > 0 ? 'win' : r.net < 0 ? 'lose' : 'push'}${pop}">${head}<div><small>${what}</small><b>${r.net > 0 ? '+' : r.net < 0 ? '−' : ''}${money(Math.abs(r.net))}</b>${r.note ? `<em>${esc(r.note)}</em>` : ''}</div></div>`;
  }

  function rouletteTable(c, dis) {
    const bets = c.bets.roulette, r = c.res && c.res.game === 'roulette' && !c.busy ? c.res : null, wins = new Set(r ? r.wins : []);
    const cell = (spot, row, colStart, colSpan, rowSpan, label, cls, aria) => `<button type="button" class="rb-c ${cls || ''}${wins.has(spot) ? ' win' : ''}${r && spot === 'n' + r.n ? ' hit' : ''}" data-cs-spot="${spot}" style="grid-row:${row}/span ${rowSpan};grid-column:${colStart}/span ${colSpan}" ${dis ? 'disabled' : ''} aria-label="${aria || label}${bets[spot] ? ', ' + money(bets[spot]) + ' bet' : ''}"><span class="rb-l">${label}</span>${bets[spot] ? chipEl(bets[spot], 'on') : ''}</button>`;
    let h = cell('n0', 1, 3, 3, 1, '0', 'g') + cell('n37', 1, 6, 3, 1, '00', 'g');
    [['low', '1–18'], ['even', 'EVEN'], ['red', '<i class="dia r"></i>', 'Red'], ['black', '<i class="dia b"></i>', 'Black'], ['odd', 'ODD'], ['high', '19–36']].forEach(([k, l, a], i) => { h += cell(k, 2 + i * 2, 1, 1, 2, l, 'out v', a); });
    [['d1', '1st 12'], ['d2', '2nd 12'], ['d3', '3rd 12']].forEach(([k, l], i) => { h += cell(k, 2 + i * 4, 2, 1, 4, l, 'out v'); });
    for (let k = 0; k < 12; k++) for (let j = 0; j < 3; j++) { const n = 3 * k + j + 1; h += cell('n' + n, 2 + k, 3 + j * 2, 2, 1, n, col(n)); }
    for (let j = 0; j < 3; j++) h += cell('c' + (j + 1), 14, 3 + j * 2, 2, 1, '2:1', 'out', `Column ${j + 1}, pays 2 to 1`);
    return `<div class="rb">${h}</div>`;
  }
  function diceTable(c, dis) {
    const bets = c.bets.dice, r = c.res && c.res.game === 'dice' && !c.busy ? c.res : null, wins = new Set(r ? r.wins : []);
    const box = k => { const [m, , l, sub] = DB_[k]; return `<button type="button" class="dz dz-${k}${wins.has(k) ? ' win' : ''}" data-cs-spot="${k}" ${dis ? 'disabled' : ''}><b>${l}</b><small>${sub} · pays ${m} to 1</small>${bets[k] ? chipEl(bets[k], 'on') : ''}</button>`; };
    return `<div class="dzs">${box('under')}${box('seven')}${box('over')}${box('doubles')}${box('ends')}</div>`;
  }
  const card = (cd, at, flip) => {
    if (!cd) return `<span class="pc back${fresh(at, 700) ? ' deal' : ''}" style="${fresh(at, 700) ? `animation-delay:${at - Date.now()}ms` : ''}"></span>`;
    const r = rankOf(cd), su = suitOf(cd), red = su === '♥' || su === '♦';
    const anim = fresh(at, 700) ? (flip ? ' flip' : ' deal') : '';
    return `<span class="pc ${red ? 'red' : 'blk'}${anim}" style="${anim ? `animation-delay:${at - Date.now()}ms` : ''}"><span class="pc-c">${r}<i>${su}</i></span><span class="pc-m">${['J', 'Q', 'K'].includes(r) ? `<b>${r}</b>` : su}</span><span class="pc-c b">${r}<i>${su}</i></span></span>`;
  };
  function bjTable(c, dis) {
    const h = c.bj || { phase: 'bet' }, bet = sum(c.bets.blackjack);
    const showHole = h.phase === 'done' || h.phase === 'dealer' && h.reveal;
    const dCards = (h.d || []).map((cd, i) => i === 1 && !showHole ? card(null, h.dAt[i]) : card(cd, i === 1 && h.revealAt ? h.revealAt : h.dAt[i], i === 1 && !!h.revealAt));
    const pCards = (h.p || []).map((cd, i) => card(cd, h.pAt[i]));
    const dTot = h.d ? (showHole ? tLabel(h.d) : String(val(h.d[0]))) : '';
    const out = '';
    return `<div class="bj">
      <svg class="bj-arc" viewBox="0 0 400 70" aria-hidden="true"><path id="bjArc" d="M6 66 Q200 -10 394 66" fill="none"/><text><textPath href="#bjArc" startOffset="50%" text-anchor="middle">BLACKJACK PAYS 6 TO 5 · DEALER HITS SOFT 17</textPath></text></svg>
      <div class="bj-hand"><small class="bj-tot">${h.d ? 'Dealer · ' + esc(dTot) : 'Dealer'}</small><div class="bj-cards">${dCards.join('') || '<span class="pc ghost"></span><span class="pc ghost"></span>'}</div></div>
      <div class="bj-rule">Insurance not offered · No splits</div>
      <div class="bj-hand you"><div class="bj-cards">${pCards.join('') || '<span class="pc ghost"></span><span class="pc ghost"></span>'}</div><small class="bj-tot">${h.p ? 'You · ' + esc(tLabel(h.p)) : 'You'}</small></div>
      ${out}
      <button type="button" class="bj-spot${bet ? ' has' : ''}" data-cs-spot="main" ${dis || (h.phase !== 'bet' && h.phase !== 'done') ? 'disabled' : ''} aria-label="Betting circle${bet ? ', ' + money(bet) : ''}">${bet ? chipEl(bet, 'on') : h.phase === 'play' || h.phase === 'dealer' ? chipEl(h.stake, 'on') : '<span>Bet</span>'}</button>
      <div class="bj-shoe" title="Cards left in the shoe">${c.shoe ? c.shoe.length : 312}</div>
    </div>`;
  }

  function render(s, me, ui, w) {
    if (!allowed(me)) return '<div class="cs"><div class="cs-rules"><b>Members only</b><p>The casino isn\'t open to you tonight.</p></div></div>';
    const c = S(ui), cfg = CFG(), open = isOpen(s), bal = NW.balance(s, w), blocked = NW.blockedWhy(s, me, w);
    if (!c.chip) c.chip = chipsFor()[1] || chipsFor()[0];
    recover(s, me, c);
    const lock = !open || !!blocked || c.busy;
    const mine = rounds(s).filter(r => r.by === me.id && r.status === 'done'), myNet = mine.reduce((n, r) => n + (r.net || 0), 0);
    const g = c.game, onTable = g === 'blackjack' ? (c.bj && (c.bj.phase === 'play' || c.bj.phase === 'dealer') ? c.bj.stake : sum(c.bets.blackjack)) : sum(c.bets[g]);
    const h = c.bj || { phase: 'bet' };
    let main;
    if (g === 'blackjack') {
      main = h.phase === 'play' ? `<div class="cs-acts3"><button type="button" class="cs-act" data-cs-bj="hit" ${c.busy ? 'disabled' : ''}>Hit</button><button type="button" class="cs-act" data-cs-bj="stand" ${c.busy ? 'disabled' : ''}>Stand</button><button type="button" class="cs-act" data-cs-bj="double" ${c.busy || h.p.length !== 2 || bal < h.stake ? 'disabled' : ''}>Double</button></div>`
        : h.phase === 'dealer' ? '<button type="button" class="cs-go" disabled>Dealer plays…</button>'
          : `<button type="button" class="cs-go" data-cs-go ${lock || !onTable ? 'disabled' : ''}>Deal${onTable ? ' · ' + money(onTable) : ''}</button>`;
    } else main = `<button type="button" class="cs-go" data-cs-go ${lock || !onTable ? 'disabled' : ''}>${g === 'dice' ? 'Roll' : 'Spin'}${onTable ? ' · ' + money(onTable) : ''}</button>`;
    const canEdit = !lock && (g !== 'blackjack' || h.phase === 'bet' || h.phase === 'done');
    const stage = g === 'roulette' ? `<div class="cs-slot-wheel"></div>${history(s)}` : g === 'dice' ? '<div class="cs-slot-dice"></div><div class="cs-dice-rail"></div>' : '';
    return `<div class="cs cs-g-${g}">
      <div class="cs-bar"><div class="cs-brand"><span class="cs-crest">SC</span><div><small>The Saint-Clair Foundation</small><b>Casino</b></div></div>
        <div class="cs-bal"><small>Your chips</small><b>${money(bal)}</b><em class="${myNet > 0 ? 'up' : myNet < 0 ? 'down' : ''}">${mine.length ? `tonight ${myNet >= 0 ? '+' : '−'}${short(Math.abs(myNet))}` : 'no bets yet'}</em></div>
        <div class="cs-icons"><button type="button" class="cs-ico" data-cs-rules aria-label="House rules" aria-pressed="${c.rules}">${ICON.rules}</button></div></div>
      ${ticker(s)}
      <div class="cs-games" role="tablist">${[['roulette', 'Roulette', '0 · 00'], ['blackjack', 'Blackjack', '6 to 5'], ['dice', 'Lucky dice', 'up to 15:1']].map(([k, l, sub]) => `<button type="button" role="tab" data-cs-game="${k}" aria-selected="${g === k}" ${c.busy || (c.bj && (c.bj.phase === 'play' || c.bj.phase === 'dealer')) ? 'disabled' : ''}><b>${l}</b><small>${sub}</small></button>`).join('')}</div>
      ${c.rules ? rulesCard(g) : ''}
      <div class="cs-table">
        <div class="cs-felt cs-felt-${g}">
          <div class="cs-dealer"><span class="cs-dealer-av" aria-hidden="true">♠</span><span>${esc(dealerLine(c, open))}</span></div>
          ${g === 'blackjack' ? bjTable(c, !canEdit) : stage}
          ${resultPlaque(c)}
          ${!open ? `<div class="cs-closed"><b>Tables closed</b><span>The casino opens at ${esc(opensLabel())} and closes for the vote.</span></div>` : ''}
        </div>
        <div class="cs-side">
          ${g === 'roulette' ? rouletteTable(c, !canEdit) : g === 'dice' ? diceTable(c, !canEdit) : ''}
          <div class="cs-tray">
            <div class="cs-chips" role="radiogroup" aria-label="Chip value">${chipsFor().map(v => `<button type="button" role="radio" aria-checked="${c.chip === v}" class="cs-chip-btn${c.chip === v ? ' sel' : ''}" data-cs-chip="${v}" ${v > bal ? 'data-poor="1"' : ''}>${chipEl(v)}</button>`).join('')}</div>
            <div class="cs-tools"><button type="button" class="cs-tool" data-cs-undo ${canEdit && c.hist[g].length ? '' : 'disabled'}>Undo</button><button type="button" class="cs-tool" data-cs-clear ${canEdit && onTable && !(g === 'blackjack' && h.phase === 'play') ? '' : 'disabled'}>Clear</button><button type="button" class="cs-tool" data-cs-rebet ${canEdit && c.last[g] && !sum(c.bets[g]) ? '' : 'disabled'}>Rebet</button><button type="button" class="cs-tool" data-cs-x2 ${canEdit && sum(c.bets[g]) ? '' : 'disabled'}>×2</button></div>
            <div class="cs-main"><div class="cs-on"><small>On the table</small><b>${money(onTable)}</b><span>limit ${short(cfg.maxBet || 0)}</span></div>${main}</div>
            <div class="cs-err" role="alert">${esc(c.err || '')}</div>
          </div>
        </div>
      </div>
      <p class="cs-fine">The odds always favor the house. Every dollar it wins tonight goes to the Saint-Clair Foundation, less a ${Math.round((cfg.harperCut || 0) * 100)}% event fee to Harper Quill. Rounds from ${money(cfg.minBet || 1)} to ${money(cfg.maxBet || 0)}.</p>
    </div>`;
  }

  /* ---------- playing ---------- */
  function celebrate(net, label) {
    if (!(net > 0)) { SFX.lose(); buzz(25); return; }
    const big = net >= (CFG().bigWin || 250000);
    SFX.win(big); buzz(big ? [40, 50, 40, 50, 80] : [30, 40, 30]);
    if (reduced()) return;
    const ov = document.createElement('div'); ov.className = 'cs-party' + (big ? ' big' : ''); ov.setAttribute('aria-hidden', 'true');
    const vals = chipsFor();
    ov.innerHTML = `<div class="cs-party-amt"><small>${esc(label || 'Winner')}</small><b>+${money(net)}</b></div>` + Array.from({ length: big ? 26 : 14 }, (_, i) => `<span class="ch ${'v' + (i % vals.length)} fall" style="left:${Math.random() * 96}%;animation-delay:${Math.random() * .5}s;animation-duration:${1.4 + Math.random() * .9}s;--rot:${Math.random() * 720 - 360}deg"><span></span></span>`).join('');
    document.body.appendChild(ov); setTimeout(() => ov.remove(), 2600);
  }
  /* on a phone the Spin button sits under the board: bring the wheel (or dice) into view */
  function showStage() {
    const f = document.querySelector('.cs-felt'); if (!f) return;
    const top = f.getBoundingClientRect().top, head = (document.querySelector('#head') || {}).offsetHeight || 64;
    if (top < head || top > innerHeight * .35) window.scrollBy({ top: top - head - 8, behavior: reduced() ? 'auto' : 'smooth' });
  }
  function check(ctx, stake) {
    const { me, ui } = ctx, c = S(ui), s = DB.fresh(), w = NW.walletOf(me), cfg = CFG();
    const why = NW.blockedWhy(s, me, w); if (why) return why;
    if (!isOpen(s)) return 'The tables are closed right now.';
    if (stake < (cfg.minBet || 1)) return `The minimum is ${money(cfg.minBet || 1)} a round.`;
    if (cfg.maxBet && stake > cfg.maxBet) return `The table limit is ${money(cfg.maxBet)} a round.`;
    if (NW.balance(s, w) < stake) return `You only have ${money(NW.balance(s, w))} in chips.`;
    return null;
  }
  function placeChip(ctx, spot) {
    const { me, ui } = ctx, c = S(ui), g = c.game, s = DB.get(), w = NW.walletOf(me), cfg = CFG();
    if (g === 'blackjack' && c.bj && c.bj.phase === 'done') { c.bj = null; c.res = null; }
    const cur = sum(c.bets[g]), add = c.chip;
    if (cfg.maxBet && cur + add > cfg.maxBet) { c.err = `The table limit is ${money(cfg.maxBet)} a round.`; return; }
    if (cur + add > NW.balance(s, w)) { c.err = `You only have ${money(NW.balance(s, w))} in chips.`; return; }
    c.bets[g][spot] = (c.bets[g][spot] || 0) + add; c.hist[g].push([spot, add]); c.err = '';
    if (c.res && c.res.game === g) c.res = null;
    SFX.chip();
  }
  function goRoulette(ctx) {
    const { me, ui } = ctx, c = S(ui), bets = Object.assign({}, c.bets.roulette), stake = sum(bets);
    const bad = check(ctx, stake); if (bad) { c.err = bad; return; }
    const n = AM[Math.floor(Math.random() * AM.length)];
    const wins = Object.keys(bets).filter(k => rbet(k)[1](n)), payout = wins.reduce((t, k) => t + bets[k] * (rbet(k)[0] + 1), 0);
    const w = NW.walletOf(me), id = startRound(me, w, 'roulette', stake, { payout, result: { n }, bets });
    const ms = reduced() ? 200 : 4600;
    c.busy = true; c.active = id; c.res = null; c.err = ''; c.last.roulette = bets;
    ctx.redraw(true); mount(); showStage(); spinWheel(n, ms); SFX.spin(ms);
    setTimeout(() => {
      const net = settle(id, payout, { n }, `Roulette · ${lab(n)} ${col(n)}`);
      c.busy = false; c.active = null; c.bets.roulette = {}; c.hist.roulette = [];
      c.res = { game: 'roulette', n, wins, net: net == null ? payout - stake : net, at: Date.now(), note: wins.length ? 'Winning: ' + wins.map(k => rbet(k)[2]).join(', ') : `No bets on ${lab(n)} ${col(n)}` };
      celebrate(c.res.net, `${lab(n)} ${col(n)}`); ctx.redraw(true);
    }, ms + 150);
  }
  function goDice(ctx) {
    const { me, ui } = ctx, c = S(ui), bets = Object.assign({}, c.bets.dice), stake = sum(bets);
    const bad = check(ctx, stake); if (bad) { c.err = bad; return; }
    const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
    const wins = Object.keys(bets).filter(k => DB_[k][1](a, b)), payout = wins.reduce((t, k) => t + bets[k] * (DB_[k][0] + 1), 0);
    const w = NW.walletOf(me), id = startRound(me, w, 'dice', stake, { payout, result: { a, b }, bets });
    const ms = reduced() ? 200 : 1700;
    c.busy = true; c.active = id; c.res = null; c.err = ''; c.last.dice = bets;
    ctx.redraw(true); mount(); showStage(); rollDice(a, b, ms); SFX.dice(ms);
    setTimeout(() => {
      const net = settle(id, payout, { a, b }, `Lucky dice · rolled ${a + b}`);
      c.busy = false; c.active = null; c.bets.dice = {}; c.hist.dice = [];
      c.res = { game: 'dice', a, b, wins, net: net == null ? payout - stake : net, at: Date.now(), note: wins.length ? 'Winning: ' + wins.map(k => DB_[k][2]).join(', ') : `Rolled ${a} and ${b}` };
      celebrate(c.res.net, `Rolled ${a + b}`); ctx.redraw(true);
    }, ms + 150);
  }
  /* blackjack: deal → hit / stand / double → dealer → settle */
  const draw = c => { if (!c.shoe || c.shoe.length < 78) c.shoe = newShoe(); return c.shoe.pop(); };
  function bjDeal(ctx) {
    const { me, ui } = ctx, c = S(ui), stake = sum(c.bets.blackjack);
    const bad = check(ctx, stake); if (bad) { c.err = bad; return; }
    const w = NW.walletOf(me), id = startRound(me, w, 'blackjack', stake), t = Date.now(), gap = reduced() ? 0 : 320;
    const p = [draw(c)], d = [draw(c)]; p.push(draw(c)); d.push(draw(c));
    c.bj = { id, stake, p, d, pAt: [t, t + gap * 2], dAt: [t + gap, t + gap * 3], phase: 'play' };
    c.active = id; c.last.blackjack = Object.assign({}, c.bets.blackjack); c.bets.blackjack = {}; c.hist.blackjack = []; c.res = null; c.err = ''; c.busy = true;
    [0, 1, 2, 3].forEach(k => SFX.card(k * gap));
    ctx.redraw(true);
    setTimeout(() => {
      c.busy = false;
      const up = val(d[0]);
      if (isBJ(p) || ((up === 11 || up === 10) && isBJ(d))) return bjFinish(ctx);
      ctx.redraw(true);
    }, gap * 4 + 150);
  }
  function bjHit(ctx, then) {
    const c = S(ctx.ui), h = c.bj; if (!h || h.phase !== 'play') return;
    h.p.push(draw(c)); h.pAt.push(Date.now()); SFX.card();
    if (total(h.p).t > 21) { c.busy = true; ctx.redraw(true); setTimeout(() => { c.busy = false; bjFinish(ctx); }, 500); return; }
    if (then) then(); else ctx.redraw(true);
  }
  function bjStand(ctx) {
    const c = S(ctx.ui), h = c.bj; if (!h || h.phase !== 'play') return;
    h.phase = 'dealer'; h.reveal = true; h.revealAt = Date.now(); c.busy = true; SFX.card(); ctx.redraw(true);
    const gap = reduced() ? 0 : 650;
    const step = () => {
      const x = total(h.d);
      /* the dealer hits below 17, and on a soft 17 */
      if (x.t < 17 || (x.t === 17 && x.soft)) { h.d.push(draw(c)); h.dAt.push(Date.now()); SFX.card(); ctx.redraw(true); setTimeout(step, gap); }
      else setTimeout(() => { c.busy = false; bjFinish(ctx); }, gap / 2);
    };
    setTimeout(step, gap);
  }
  function bjDouble(ctx) {
    const { me, ui } = ctx, c = S(ui), h = c.bj; if (!h || h.phase !== 'play' || h.p.length !== 2) return;
    const s = DB.fresh(), w = NW.walletOf(me), why = NW.blockedWhy(s, me, w);
    if (why) { c.err = why; return; }
    if (NW.balance(s, w) < h.stake) { c.err = `Doubling needs another ${money(h.stake)}.`; return; }
    addStake(h.id, me, w, h.stake); h.stake *= 2; SFX.chip();
    bjHit(ctx, () => { ctx.redraw(true); setTimeout(() => bjStand(ctx), reduced() ? 0 : 500); });
  }
  function bjFinish(ctx) {
    const c = S(ctx.ui), h = c.bj; if (!h || h.phase === 'done') return;
    const pt = total(h.p).t, dt = total(h.d).t, pbj = isBJ(h.p), dbj = isBJ(h.d);
    let out, pay;
    if (pt > 21) { out = 'bust'; pay = 0; }
    else if (pbj && dbj) { out = 'push'; pay = h.stake; }
    else if (pbj) { out = 'bj'; pay = Math.round(h.stake * 2.2); }
    else if (dbj) { out = 'dbj'; pay = 0; }
    else if (dt > 21) { out = 'dbust'; pay = h.stake * 2; }
    else if (pt > dt) { out = 'win'; pay = h.stake * 2; }
    else if (pt === dt) { out = 'push'; pay = h.stake; }
    else { out = 'lose'; pay = 0; }
    if (!h.revealAt) h.revealAt = Date.now();
    const net = settle(h.id, pay, { p: h.p, d: h.d, out }, 'Blackjack · ' + ({ bj: 'blackjack', win: 'win', push: 'push', dbust: 'dealer bust' }[out] || 'loss'));
    h.phase = 'done'; h.out = out; h.net = net == null ? pay - h.stake : net; h.doneAt = Date.now();
    h.msg = { bj: 'Blackjack! Pays six to five.', win: 'You win.', push: 'Push. Your bet comes back.', lose: 'Dealer wins.', bust: 'Bust. Dealer wins.', dbj: 'Dealer has blackjack.', dbust: 'Dealer busts. You win.' }[out];
    c.active = null; c.res = { game: 'blackjack', out, net: h.net, at: Date.now(), note: `You ${pt > 21 ? 'bust with ' + pt : pt} · dealer ${dt > 21 ? 'busts with ' + dt : dt}` };
    celebrate(h.net, out === 'bj' ? 'Blackjack!' : 'You win');
    ctx.redraw(true);
  }

  /* ---------- events (NightBank hands them over while the Casino tab is open) ---------- */
  function onClick(e, ctx) {
    const { ui } = ctx, c = S(ui), q = sel => e.target.closest(sel); let el;
    const done = () => { ctx.redraw(true); return true; };
    if (!allowed(ctx.me)) return false;
    if (q('[data-cs-rules]')) { c.rules = !c.rules; return done(); }
    if ((el = q('[data-cs-game]'))) { if (c.busy || (c.bj && (c.bj.phase === 'play' || c.bj.phase === 'dealer'))) return true; c.game = el.dataset.csGame; c.err = ''; c.res = null; return done(); }
    if ((el = q('[data-cs-chip]'))) { c.chip = Number(el.dataset.csChip); c.err = ''; SFX.chip(); return done(); }
    if ((el = q('[data-cs-spot]'))) { if (el.disabled || c.busy) return true; placeChip(ctx, el.dataset.csSpot); return done(); }
    if (q('[data-cs-undo]')) { const x = c.hist[c.game].pop(); if (x) { c.bets[c.game][x[0]] -= x[1]; if (c.bets[c.game][x[0]] <= 0) delete c.bets[c.game][x[0]]; SFX.chip(); } c.err = ''; return done(); }
    if (q('[data-cs-clear]')) { c.bets[c.game] = {}; c.hist[c.game] = []; c.err = ''; return done(); }
    if (q('[data-cs-rebet]')) { const L = c.last[c.game]; if (L) { c.bets[c.game] = Object.assign({}, L); c.hist[c.game] = Object.entries(L); if (c.game === 'blackjack' && c.bj && c.bj.phase === 'done') { c.bj = null; c.res = null; } SFX.chip(); } return done(); }
    if (q('[data-cs-x2]')) {
      const s = DB.get(), w = NW.walletOf(ctx.me), cur = sum(c.bets[c.game]), cap = Math.min(CFG().maxBet || Infinity, NW.balance(s, w));
      if (cur * 2 > cap) { c.err = cur * 2 > (CFG().maxBet || Infinity) ? `That would pass the ${money(CFG().maxBet)} table limit.` : `You only have ${money(NW.balance(s, w))} in chips.`; return done(); }
      Object.keys(c.bets[c.game]).forEach(k => { c.hist[c.game].push([k, c.bets[c.game][k]]); c.bets[c.game][k] *= 2; }); SFX.chip(); return done();
    }
    if (q('[data-cs-go]')) {
      if (c.busy) return true;
      if (c.game === 'roulette') goRoulette(ctx); else if (c.game === 'dice') goDice(ctx); else bjDeal(ctx);
      return done();
    }
    if ((el = q('[data-cs-bj]'))) {
      if (c.busy) return true;
      const a = el.dataset.csBj; if (a === 'hit') bjHit(ctx); else if (a === 'stand') bjStand(ctx); else bjDouble(ctx);
      return done();
    }
    return false;
  }
  const onInput = () => false;

  /* ---------- host ---------- */
  function stats(s) {
    const c = CFG(), rs = rounds(s).filter(r => r.status === 'done');
    const by = g => rs.filter(r => r.game === g);
    const tx = NW.txs(s).filter(t => t.house);
    return {
      rounds: rs.length, open: rounds(s).filter(r => r.status === 'open').length,
      houseNet: -rs.reduce((n, r) => n + (r.net || 0), 0),
      wagered: rs.reduce((n, r) => n + r.stake, 0),
      foundation: tx.filter(t => t.to === c.beneficiary).reduce((n, t) => n + t.amt, 0),
      fee: tx.filter(t => t.to === c.feeTo).reduce((n, t) => n + t.amt, 0),
      games: ['roulette', 'blackjack', 'dice'].map(g => ({ g, n: by(g).length, house: -by(g).reduce((n, r) => n + (r.net || 0), 0) })),
      best: rs.slice().sort((a, b) => (b.net || 0) - (a.net || 0))[0] || null
    };
  }

  return { render, mount, onClick, onInput, isOpen, allowed, rounds, stats, SFX };
})();
