/* =====================================================================
   THE VANISHING HOUR — the first-visit walkthrough (Nov 25, Jacob: "skippable, a walkthrough").
   The first time a player opens the app, a spotlight moves from tab to tab with a short note,
   written for their world. Skip any time; replay it from "My file". Remembered per character
   on this phone (localStorage vh:tour:<id>).
   ===================================================================== */
const Tour = (() => {
  const ME = Session.player();
  const KEY = ME ? 'vh:tour:' + ME.id : null;
  const seen = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return true; } };
  const mark = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { } };
  let steps = [], i = 0, el = null;

  function build() {
    const W = G.door(ME), first = ME.name.split(' ')[0];
    const world = {
      fbi: ['Records', 'FBI Headquarters: look people up, read statements, build the case. Your team shares about ten lookups, so choose them well.'],
      bebbit: ['Your feed', 'Bebbit: the gala\'s social feed. Post, comment, vote, follow people. Everyone reads it; five downvotes hide a post.'],
      nightwire: ['Omnizon', 'Omnizon looks like a normal store. It isn\'t. Buy secret files, check your wallet, and talk privately with your crew.']
    }[W] || ['Your world', 'Your main screen for tonight.'];
    const has = t => !!document.querySelector(`#navin [data-tab="${t}"]`);
    steps = [
      { t: `Welcome, ${first}`, b: 'This is your phone for the night. A 30-second tour shows you where everything is. You can skip it any time.' },
      { sel: '[data-tab="now"]', t: 'Now', b: 'The clock for the night, and private messages meant only for you. Your phone buzzes when one arrives.' },
      { sel: '[data-tab="world"]', t: world[0], b: world[1] },
      has('beb') && { sel: '[data-tab="beb"]', t: 'Bebbit', b: 'The gala\'s social feed. Everyone is talking. Gossip is cheap; not all of it is true.' },
      has('bank') && { sel: '[data-tab="bank"]', t: 'Banking', b: 'Your money: send it, borrow it, bet it at the charity casino. Some people here will want it.' },
      has('tasks') && { sel: '[data-tab="tasks"]', t: 'Puzzles', b: 'Mini-games open during the night. Solve them to unlock things nobody else knows.' },
      { sel: '[data-tab="people"]', t: 'People', b: 'Everyone at the gala, as the room knows them. Tap a name to read what everyone knows about them.' },
      { sel: '[data-tab="me"]', t: 'My file', b: 'Your secret file: backstory, secrets, goals and who to find. Read it first, and never show it to anyone.' },
      { t: 'That\'s it', b: 'Start with your file. When the doors open, the night runs itself: just follow your phone.', end: true }
    ].filter(Boolean);
  }
  function place() {
    if (!el) return;
    const s = steps[i], hole = el.querySelector('.tr-hole'), tip = el.querySelector('.tr-tip');
    const target = s.sel && document.querySelector('#navin ' + s.sel);
    if (target) {
      const r = target.getBoundingClientRect(), pad = 6;
      Object.assign(hole.style, { display: 'block', left: (r.left - pad) + 'px', top: (r.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
      const below = r.top < innerHeight / 2, tw = Math.min(320, innerWidth - 24);
      tip.style.width = tw + 'px';
      tip.style.left = Math.max(12, Math.min(innerWidth - tw - 12, r.left + r.width / 2 - tw / 2)) + 'px';
      tip.style.top = below ? (r.bottom + 14) + 'px' : ''; tip.style.bottom = below ? '' : (innerHeight - r.top + 14) + 'px';
      tip.classList.toggle('up', !below);
    } else {
      hole.style.display = 'none'; const tw = Math.min(340, innerWidth - 24);
      Object.assign(tip.style, { width: tw + 'px', left: (innerWidth - tw) / 2 + 'px', top: '30%', bottom: '' });
    }
  }
  function show() {
    const s = steps[i];
    el.querySelector('.tr-tip').innerHTML = `<small>${i + 1} of ${steps.length}</small><b>${esc(s.t)}</b><p>${esc(s.b)}</p>
      <div class="tr-dots">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="tr-btns">${s.end ? '<button type="button" class="tr-go" data-tr="file">Open my file</button><button type="button" class="tr-skip" data-tr="done">Done</button>'
        : `${i > 0 ? '<button type="button" class="tr-back" data-tr="back">Back</button>' : ''}<button type="button" class="tr-go" data-tr="next">${i === 0 ? 'Show me' : 'Next'}</button><button type="button" class="tr-skip" data-tr="done">Skip tour</button>`}</div>`;
    el.querySelector('.tr-tip').classList.remove('in'); void el.offsetWidth; el.querySelector('.tr-tip').classList.add('in');
    place(); const go = el.querySelector('.tr-go'); if (go) go.focus();
  }
  function close(openFile) {
    mark(); if (el) { el.classList.add('out'); const x = el; setTimeout(() => x.remove(), 250); el = null; }
    removeEventListener('resize', place);
    if (openFile) { const b = document.querySelector('#navin [data-tab="me"]'); if (b) b.click(); }
  }
  function start(force) {
    if (!ME || (!force && seen()) || el) return;
    if (!document.querySelector('#navin [data-tab]')) { setTimeout(() => start(force), 400); return; }
    build(); i = 0;
    el = document.createElement('div'); el.className = 'tr'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'A quick tour');
    el.innerHTML = '<div class="tr-hole" aria-hidden="true"></div><div class="tr-tip" aria-live="polite"></div>';
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-tr]'); if (!b) return;
      const a = b.dataset.tr; if (a === 'next') { i = Math.min(steps.length - 1, i + 1); show(); } else if (a === 'back') { i = Math.max(0, i - 1); show(); } else close(a === 'file');
    });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight' && !steps[i].end) { i++; show(); } else if (e.key === 'ArrowLeft' && i > 0) { i--; show(); } });
    document.body.appendChild(el); addEventListener('resize', place); show();
  }
  /* first visit: start once the app has drawn its tabs (not for the host watching a phone) */
  if (ME && !/[?&]watch=/.test(location.search)) setTimeout(() => start(false), 900);
  document.addEventListener('click', e => { if (e.target.closest('[data-tour]')) start(true); });
  return { start };
})();
