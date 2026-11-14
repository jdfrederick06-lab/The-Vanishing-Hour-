/* =====================================================================
   THE VANISHING HOUR — the reveal: the slides read at the end of the night.
   Loaded by the host terminal and the big screen (reveal.html), never by phones.
   The host steps through the slides; each step also sends a plain copy of the
   slide to every phone (state reveal/slide), so the room can follow along.

   Who won is worked out from the vote, the arrest and the night's money,
   and the host can overrule any group (state reveal/override/{key}).
   ===================================================================== */
const Reveal = (() => {
  const R = () => STORY.reveal || { chapters: [] };
  const nm = id => (G.byId(id) || {}).name || '';

  /** The results, one row per side */
  function results(s) {
    const T = Vote.tally(s, 'thief'), K = Vote.tally(s, 'killer'), A = Vote.arrest(s);
    const killer = R().killer, arrested = A ? A.who : K.top;
    const crewNamed = !!(T.top && G.byId(T.top) && G.byId(T.top).group === R().thiefGroup);
    const sold = !!(s.nw && s.nw.sale && s.nw.sale.sold);
    const viv = (Vote.ballots(s)[R().diamondThief] || {}).killer === killer;
    const auto = {
      guests: { who: 'The guests and staff', win: K.top === killer, why: K.top === killer ? `The room named ${nm(killer)} as the killer.` : `The room named ${K.top ? nm(K.top) : 'nobody'}. The killer was ${nm(killer)}.` },
      fbi: { who: 'The FBI', win: crewNamed || !sold, why: crewNamed ? 'The room named the art crew, so the painting is recovered, and so is the Winter Star.' : !sold ? 'The painting never sold, so it\'s still in the building. The Winter Star is recovered too.' : 'The painting was sold and the crew was never named. Only the Winter Star comes home.' },
      crew: { who: 'The art crew', win: !crewNamed && sold, why: !sold ? 'The painting never sold, so nobody gets paid.' : crewNamed ? 'They sold it, but the room named them.' : 'They sold the painting, got paid and were never named.' },
      vivienne: { who: 'Vivienne Roux', win: viv, why: viv ? 'She recognized "Ro" and named the killer, so she\'s released for helping the investigation.' : 'She didn\'t name the killer, so she stays in custody for the Winter Star.' },
      rowan: { who: 'Rowan Hale', win: !!arrested && arrested !== killer, why: arrested === killer ? 'Arrested. He inherits nothing.' : `${arrested ? nm(arrested) : 'Nobody'} was arrested instead. Rowan walks away with everything.` }
    };
    const ov = (s.reveal && s.reveal.override) || {};
    return Object.entries(auto).map(([key, x]) => Object.assign({ key, auto: x.win, overruled: typeof ov[key] === 'boolean' }, x, typeof ov[key] === 'boolean' ? { win: ov[key] } : {}));
  }

  /** A few honours for the curtain */
  function awards(s) {
    const out = [], killer = R().killer;
    /* sharpest eyes: everyone who named a member of the crew AND the killer */
    const sharp = Object.entries(Vote.ballots(s)).filter(([id, b]) => G.byId(id) && Vote.canVote(s, G.byId(id)) && b.killer === killer && G.byId(b.thief) && G.byId(b.thief).group === R().thiefGroup).map(([id]) => nm(id));
    if (sharp.length) out.push({ title: 'Sharpest eyes', who: sharp.length > 4 ? `${sharp.slice(0, 4).join(', ')} and ${sharp.length - 4} more` : sharp.join(', '), why: 'Named both the thieves and the killer.' });
    /* the richest person at the end of the night */
    if (typeof NW !== 'undefined') {
      let best = null;
      STORY.characters.forEach(c => { const w = NW.walletOf(c); if (!w || NW.membersOf(w).length > 1) return; const b = NW.balance(s, w); if (!best || b > best.b) best = { c, b }; });
      if (best) out.push({ title: 'Richest in the room', who: best.c.name, why: `Ended the night with ${NW.money(best.b)}.` });
    }
    /* the Bebbit post with the most upvotes */
    if (typeof Bebbit !== 'undefined') {
      const top = Bebbit.list(s).filter(p => !p.deleted && G.byId(p.by)).map(p => ({ p, n: Bebbit.nVotes(s, p.id) })).sort((a, b) => b.n - a.n)[0];
      if (top && top.n) out.push({ title: 'Bebbit\'s favourite post', who: nm(top.p.by), why: `${top.n} upvote${top.n === 1 ? '' : 's'}: "${String(top.p.text || '').slice(0, 70)}${String(top.p.text || '').length > 70 ? '…' : ''}"` });
    }
    return out;
  }

  const barsOf = (s, q) => { const T = Vote.tally(s, q), top = T.list.slice(0, 5), hi = top.length ? top[0].n : 1; return top.map(x => ({ id: x.id, label: nm(x.id), n: x.n, pct: +(x.n / hi * 100).toFixed(1) })); };

  /** Every slide, in order. Built fresh each time, so the votes on it are always current. */
  function slides(s) {
    const A = Vote.arrest(s), qs = Vote.questions(), list = [];
    list.push({ id: 'open', kicker: CONFIG.TITLE, title: 'The accusation', body: [`${Vote.votedList(s).length} of ${Vote.voters(s).length} players voted. The FBI's votes count double.`], say: 'The votes are in. Let\'s see who you believe.' });
    qs.forEach(([k, label], i) => list.push({ id: 'q-' + k, kicker: `Question ${i + 1}`, title: label, bars: barsOf(s, k), say: `${label} Here's what the room said.` }));
    const boss = A && G.byId(A.by), who = A && G.byId(A.who);
    list.push({ id: 'arrest', kicker: 'The arrest', title: who ? `${boss ? boss.name : 'The FBI'} arrests` : 'No arrest was made', big: who ? who.name : '', body: who ? [`For the murders of Charlie Pruitt and Victor Ashgrove.`] : ['The FBI let the night end without an arrest.'], say: who ? `${boss ? boss.name.split(' ')[0] : 'The FBI'}, tell the room who you arrested, and why.` : 'Nobody was arrested.' });
    R().chapters.forEach(c => list.push(Object.assign({}, c)));
    list.push({ id: 'results', kicker: 'Tonight\'s results', title: 'Who won', results: results(s).map(x => ({ who: x.who, win: x.win, why: x.why })), say: 'Here is how each side did tonight.' });
    const aw = awards(s);
    if (aw.length) list.push({ id: 'awards', kicker: 'Curtain', title: 'The night\'s honours', awards: aw, say: 'And a few honours before we go.' });
    list.push({ id: 'end', kicker: CONFIG.EVENT, title: 'Thank you for playing', body: [CONFIG.TITLE], say: 'Thank you for coming. Goodnight.' });
    return list;
  }

  /** Move the reveal to a slide (or null to clear it). Phones get a copy without the host's script. */
  function go(i) {
    const s = DB.fresh(), all = slides(s);
    if (i === null || i < 0) { DB.update({ 'reveal/step': null, 'reveal/slide': null }); return; }
    i = Math.min(all.length - 1, i);
    const sl = Object.assign({}, all[i]); delete sl.say;
    const u = { 'reveal/step': i, 'reveal/slide': sl };
    if (i === 0 && (s.reveal || {}).step == null) Clock.log(u, 'host', 'The reveal started.');
    DB.update(u);
  }
  const step = s => (s.reveal && typeof s.reveal.step === 'number') ? s.reveal.step : -1;

  return { slides, results, awards, go, step };
})();
