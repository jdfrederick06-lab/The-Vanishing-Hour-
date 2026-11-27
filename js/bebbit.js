/* =====================================================================
   THE VANISHING HOUR — Bebbit, the guests' social feed.
   Feed, posts with photos, tags, comments, votes, profiles and search.
   Special powers (Drew's removals and traces, Jules's hacked posts) and
   who is read-only (the FBI) come from STORY.bebbit in story.js.

   Data lives under state.beb:
     posts/{id}    { by, real, text, photo, tags, at, hacked, plant, deleted }
                   by = who it LOOKS like posted it; real = who actually did.
     votes/{id}/{characterId}, comments/{id}/{cid}, used/{characterId}/{power},
     traces/{id}   { by, at }
   ===================================================================== */
const Bebbit = (() => {
  const C = () => STORY.bebbit || {};
  const B = s => s.beb || {};
  const byName = (a, b) => a.name.localeCompare(b.name);

  /* ---------- reading ---------- */
  function who(id) {
    const a = (C().accounts || {})[id];
    if (a) return { id, name: a.name, role: a.role, profile: a.profile || '', sys: true };
    return G.byId(id) || { id, name: 'deleted user', role: '', profile: '' };
  }
  const shown = a => a.sys ? '@' + a.name : a.name;
  /* everyone's profile (story.js > bebbit.profiles): handle, base follower numbers, bio, joined, verified, private */
  function prof(id) {
    const a = who(id), p = (C().profiles || {})[id] || [];
    return { handle: p[0] || (a.sys ? a.name : String(a.name || id).toLowerCase().replace(/[^a-z0-9]+/g, '.')), followers: p[1] || 0, following: p[2] || 0, bio: p[3] || '', joined: p[4] || 2026, verified: /v/.test(p[5] || ''), priv: /p/.test(p[5] || '') };
  }
  const follows = (s, id) => Object.keys((B(s).follows || {})[id] || {});
  const amFollowing = (s, id, me) => !!(((B(s).follows || {})[id] || {})[me]);
  const followingNow = (s, me) => Object.keys(B(s).follows || {}).filter(id => amFollowing(s, id, me)).length;
  const big = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K' : n.toLocaleString('en-US');
  const tick = id => prof(id).verified ? '<svg class="bb-tick" viewBox="0 0 24 24" aria-label="Verified"><path d="M12 1.8l2.6 1.9 3.2-.2 1 3 2.6 1.9-1 3.1 1 3-2.6 1.9-1 3-3.2-.1L12 22.2l-2.6-1.9-3.2.2-1-3-2.6-1.9 1-3.1-1-3 2.6-1.9 1-3 3.2.1z" fill="currentColor"/><path d="M7.6 12.2l3 3 5.8-6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '';
  const list = s => Object.entries(B(s).posts || {}).map(([id, p]) => Object.assign({ id }, p));
  /* votes/{post}/{character} = true (up) or 'down' (Nov 24). The score is ups minus downs.
     At DOWN_HIDE downvotes a post is hidden from players ("removed by the community"); hosts still
     see it in full in Host > Bebbit, marked, and can show it again (posts/{id}/keep = true). */
  const DOWN_HIDE = () => C().downvoteHide || 5;
  const votesOf = (s, id) => Object.values((B(s).votes || {})[id] || {});
  const ups = (s, id) => votesOf(s, id).filter(v => v !== 'down').length;
  const downs = (s, id) => votesOf(s, id).filter(v => v === 'down').length;
  const nVotes = (s, id) => ups(s, id) - downs(s, id);
  const myVote = (s, id, me) => { const v = (((B(s).votes || {})[id] || {})[me]); return v === 'down' ? 'down' : v ? 'up' : null; };
  const voted = (s, id, me) => myVote(s, id, me) === 'up';
  const buried = (s, p) => !p.keep && downs(s, p.id) >= DOWN_HIDE();
  const comments = (s, id) => Object.entries((B(s).comments || {})[id] || {}).map(([cid, c]) => Object.assign({ id: cid }, c)).sort((a, b) => a.at - b.at);
  /* the first to find Cliff's coat earns one extra power (STORY.coat.first.perk, Nov 26) */
  const perk = (s, me, power) => s && ((((s.hunt || {}).prize || {})[me.id]) || {}).perk === power ? 1 : 0;
  const limit = (me, power, s) => ((((C().powers || {})[me.id]) || {})[power] || 0) + perk(s || DB.get(), me, power);
  const used = (s, id, power) => (((B(s).used || {})[id]) || {})[power] || 0;
  const left = (s, me, power) => Math.max(0, limit(me, power, s) - used(s, me.id, power));
  const canWrite = me => !(C().readOnly || []).includes(me.group);
  const ago = ts => { const m = Math.floor((Date.now() - ts) / 60000); return m < 1 ? 'now' : m < 60 ? m + 'm' : Math.floor(m / 60) + 'h'; };
  /** Only our own shrunk photos (data:image) or files shipped with the site are shown. */
  const safeImg = src => typeof src === 'string' && (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src) || /^[\w\-./]+\.(jpe?g|png|webp)$/i.test(src)) ? src : '';
  const hot = (s, p) => p.deleted || buried(s, p) ? -1 : (Math.max(0, nVotes(s, p.id)) + comments(s, p.id).length * 0.5 + 1) / Math.pow((Date.now() - p.at) / 60000 + 8, 0.9);
  function photoCount(s) {
    const id = C().photoCount; if (!id) return 0;
    const set = new Set(); list(s).filter(p => p.real === id && p.photo && !p.deleted).forEach(p => (p.tags || []).forEach(t => t !== id && set.add(t)));
    return set.size;
  }

  /* ---------- writing ---------- */
  /** Add a post to an update. f = { by, real, text, photo, tags, hacked, plant } */
  function post(u, f) {
    const id = uid('p'), real = f.real || f.by, a = who(f.by), tags = (f.tags || []).filter(t => G.byId(t));
    u['beb/posts/' + id] = { by: f.by, real, text: f.text || '', photo: safeImg(f.photo) || null, tags: tags.length ? tags : null, at: Date.now(), hacked: f.hacked ? true : null, plant: f.plant ? true : null };
    const what = (f.text || '[photo]').slice(0, 90);
    Clock.log(u, 'bebbit', f.hacked ? `HACKED post by ${who(real).name}, posing as ${a.name}: ${what}` : f.plant ? `Planted post as ${shown(a)}: ${what}` : `${a.name} posted: ${what}`);
    tags.forEach(t => { if (t !== f.by) u['feed/' + uid('t')] = { to: [t], title: 'Tagged on Bebbit', text: `${shown(a)} tagged you in a post${f.photo ? ' with a photo' : ''}.`, at: Date.now(), kind: 'beb' }; });
    return id;
  }
  function shrink(file, max = 720, quality = 0.72) {
    return new Promise((res, rej) => {
      if (!file || !/^image\//.test(file.type)) return rej(new Error('Choose a photo (JPG or PNG).'));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
        res(cv.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("That photo couldn't be read. Try a JPG or PNG.")); };
      img.src = url;
    });
  }

  /* ---------- screens ---------- */
  const freshDraft = () => ({ text: '', photo: null, tags: [], hack: false, as: '' });
  const newUI = () => ({ view: 'feed', sort: 'hot', profile: null, from: 'feed', open: {}, compose: false, draft: freshDraft(), cdraft: {}, q: '', err: '' });
  /* every account gets its own colour, worked out from its name so it never changes */
  const TINTS = [['#7a5cff', '#a84dff'], ['#ff6fa8', '#ff9a6b'], ['#2fbf8f', '#7ee0b5'], ['#ff9f43', '#ffc46b'], ['#3b8bff', '#8fd3ff'], ['#e0457b', '#a84dff'], ['#12a5a5', '#5fd0c8'], ['#6a5cff', '#3b8bff']];
  const tint = n => { let h = 0; for (const ch of String(n || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const t = TINTS[h % TINTS.length]; return `background:linear-gradient(135deg,${t[0]},${t[1]})`; };
  const avatar = (a, lg) => `<span class="avatar${lg ? ' lg' : ''}${a.sys ? ' bb-sys' : ''}"${a.sys ? '' : ` style="${tint(a.name)}"`}>${a.sys ? 'b' : esc(initials(a.name))}</span>`;

  function community(s) {
    const here = STORY.characters.filter(c => G.online(s, c.id)).length;
    return `<div class="bb-top"><div class="bb-banner" aria-hidden="true"><i style="left:5%;width:14%;height:52%;top:20%;background:#b8452f"></i><i style="left:24%;width:10%;height:70%;top:10%;background:#3f6fb5"></i><i style="left:40%;width:20%;height:46%;top:24%;background:#2f8a6e"></i><i style="left:66%;width:11%;height:64%;top:13%;background:#e7dcc4"></i><i style="left:83%;width:13%;height:46%;top:24%;background:#7a3f8f"></i></div>
      <div class="bb-comm"><div class="bb-comm-ic"><svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="5" width="22" height="18" fill="none" stroke="#d9b45a" stroke-width="2.4"/><rect x="8" y="10" width="12" height="8" fill="#d9b45a"/></svg></div>
      <div style="min-width:0"><div class="bb-comm-n">b/thegala</div><div class="bb-comm-s"><span class="dot on"></span>${here} here now · tonight only</div></div></div></div>`;
  }
  function tabs(ui) {
    const cur = ui.view === 'people' ? 'people' : ui.sort;
    return `<div class="bb-sort" role="tablist">${[['hot', 'Hot'], ['new', 'New'], ['people', 'People']].map(([k, l]) => `<button data-bb-sort="${k}" aria-current="${cur === k}">${l}</button>`).join('')}</div>`;
  }
  function composer(s, me, ui) {
    if (!canWrite(me)) return `<div class="bb-ro"><b>Monitoring only.</b> FBI accounts can read b/thegala but can't post, vote or comment.</div>`;
    if (!ui.compose) return `<button class="bb-start" data-bb="compose">${avatar(me)}<span>What's happening at the gala?</span><span class="bb-start-ic" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M21 16l-5-5-8 8"/></svg></span></button>`;
    const d = ui.draft, others = STORY.characters.filter(c => c.id !== me.id && !G.noshow(s, c.id)).sort(byName);
    const hl = limit(me, 'hack') ? `<div class="bb-hack"><label class="check"><input type="checkbox" data-bb="hack" ${d.hack ? 'checked' : ''} ${left(s, me, 'hack') || d.hack ? '' : 'disabled'}>Make it look like someone else posted this <span class="mute">(${left(s, me, 'hack')} left)</span></label>
      ${d.hack ? `<select class="field" data-bb="as" aria-label="Who it should look like"><option value="">Choose who it looks like…</option>${others.map(c => `<option value="${c.id}" ${d.as === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>` : ''}</div>` : '';
    return `<form class="card bb-compose" data-bb-form="post">
      <textarea class="field" data-bb="text" placeholder="What's happening at the gala?" maxlength="500" rows="3" aria-label="Your post">${esc(d.text)}</textarea>
      ${d.photo ? `<div class="bb-prev"><img src="${esc(d.photo)}" alt="Your photo"><button type="button" class="btn small" data-bb="unphoto">Remove photo</button></div>` : ''}
      ${d.tags.length ? `<div class="bb-chips">${d.tags.map(t => `<button type="button" class="bb-chip" data-bb-untag="${t}" aria-label="Remove tag ${esc(G.byId(t).name)}">${esc(G.byId(t).name)} <span aria-hidden="true">×</span></button>`).join('')}</div>` : ''}
      <div class="bb-tools"><label class="btn small">Add photo<input type="file" accept="image/*" data-bb="photo" class="hide"></label>
        <select class="field bb-tagsel" data-bb="tag" aria-label="Tag someone"><option value="">Tag someone…</option>${others.filter(c => !d.tags.includes(c.id)).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
      ${hl}
      <div class="row between"><button type="button" class="btn small ghost" data-bb="cancel">Cancel</button><button class="btn primary" type="submit">Post</button></div>
      <div class="err" role="alert">${esc(ui.err || '')}</div></form>`;
  }
  function card(s, me, ui, p) {
    if (p.deleted) return `<article class="bb-post bb-removed">[removed by Bebbit] <span>· ${ago(p.at)}</span></article>`;
    if (buried(s, p)) return `<article class="bb-post bb-removed">[removed by the community · ${downs(s, p.id)} downvotes] <span>· ${ago(p.at)}</span></article>`;
    const a = who(p.by), n = nVotes(s, p.id), cs = comments(s, p.id), ro = !canWrite(me), img = safeImg(p.photo);
    const tr = (B(s).traces || {})[p.id], mineTrace = tr && tr.by === me.id;
    const pow = (limit(me, 'trace', s) && !mineTrace && (p.real || (((C().powers || {})[me.id]) || {}).trace) ? `<button class="btn small ghost" data-bb-trace="${p.id}" ${left(s, me, 'trace') ? '' : 'disabled'}>Trace · ${left(s, me, 'trace')}</button>` : '')
      + (limit(me, 'delete') ? `<button class="btn small ghost" data-bb-del="${p.id}" ${left(s, me, 'delete') ? '' : 'disabled'}>Remove · ${left(s, me, 'delete')}</button>` : '');
    const traceBox = mineTrace ? `<div class="bb-trace"><b>Trace result.</b> ${p.real !== p.by ? `This post came from <b>${esc(who(p.real).name)}</b>'s phone, not ${esc(shown(a))}'s.` : `Posted from ${esc(shown(a))}'s own phone. Nothing unusual.`}</div>` : '';
    const tags = (p.tags || []).filter(t => G.byId(t));
    return `<article class="bb-post${ui.fresh === p.id ? ' fresh' : ''}">
      <header class="bb-ph"><button class="bb-who" data-bb-profile="${a.id}">${avatar(a)}<span><span class="bb-name">${esc(shown(a))}${tick(a.id)}</span><span class="bb-meta">${esc(a.role)} · ${ago(p.at)}${p.hacked ? ' · <span class="bb-relay">via relay</span>' : ''}</span></span></button></header>
      ${p.text ? `<div class="bb-text">${esc(p.text)}</div>` : ''}
      ${img ? `<img class="bb-img" src="${esc(img)}" alt="Photo posted by ${esc(shown(a))}" loading="lazy">` : ''}
      ${tags.length ? `<div class="bb-with">with ${tags.map(t => `<button class="bb-link" data-bb-profile="${t}">${esc(G.byId(t).name)}</button>`).join(', ')}</div>` : ''}
      ${traceBox}
      <footer class="bb-acts">
        <span class="bb-votes"><button class="bb-act" data-bb-vote="${p.id}" aria-pressed="${myVote(s, p.id, me.id) === 'up'}" ${ro ? 'disabled' : ''} aria-label="Upvote"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 5l7 8h-4v6H9v-6H5z"/></svg></button><b class="bb-score">${n}</b><button class="bb-act bb-down" data-bb-down="${p.id}" aria-pressed="${myVote(s, p.id, me.id) === 'down'}" ${ro ? 'disabled' : ''} aria-label="Downvote"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 19l-7-8h4V5h6v6h4z"/></svg></button></span>
        <button class="bb-act" data-bb-open="${p.id}" aria-expanded="${!!ui.open[p.id]}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>${cs.length}</button>
        ${pow ? `<span class="bb-pow">${pow}</span>` : ''}
      </footer>
      ${ui.open[p.id] ? `<div class="bb-cs">${cs.map(c => { const ca = who(c.by); return `<div class="bb-c">${avatar(ca)}<div><button class="bb-link bb-cn" data-bb-profile="${ca.id}">${esc(shown(ca))}</button> <span class="bb-meta">${ago(c.at)}</span><div>${esc(c.text)}</div></div></div>`; }).join('') || '<div class="bb-meta">No comments yet.</div>'}
        ${ro ? '' : `<form class="bb-cf" data-bb-form="c" data-pid="${p.id}"><input class="field" data-bb-c="${p.id}" value="${esc(ui.cdraft[p.id] || '')}" placeholder="Add a comment" maxlength="300" aria-label="Add a comment"><button class="btn small primary" type="submit">Reply</button></form>`}</div>` : ''}
    </article>`;
  }
  function feed(s, me, ui) {
    const ps = list(s).sort(ui.sort === 'new' ? (a, b) => b.at - a.at : (a, b) => hot(s, b) - hot(s, a));
    return `<div class="bb">${community(s)}${composer(s, me, ui)}${tabs(ui)}${ps.map(p => card(s, me, ui, p)).join('') || '<div class="card empty">No posts yet. Be the first.</div>'}</div>`;
  }
  function peopleList(s, me, ui) {
    const q = ui.q.trim().toLowerCase();
    const ekey = 'search:' + q.replace(/[^a-z]/g, '');
    if (typeof Eggs !== 'undefined' && Eggs.has(ekey)) { Eggs.unlockOnce(me, ekey); return `<div class="bb-egg">${esc(Eggs.list()[ekey][1])}</div>`; }
    /* an oddity: searching for yourself (your full name, or your first name) */
    if (typeof Eggs !== 'undefined' && q.length > 2 && (q === me.name.toLowerCase() || q === me.name.toLowerCase().split(' ')[0])) Eggs.unlockOnce(me, 'vanity');
    const all = STORY.characters.filter(c => !G.noshow(s, c.id) && (!q || (c.name + ' ' + c.role).toLowerCase().includes(q))).sort(byName);
    return all.map(c => { const pr = prof(c.id), n = pr.followers + follows(s, c.id).length; return `<div class="person" data-bb-profile="${c.id}" role="button" tabindex="0">${avatar(c)}<div style="min-width:0;flex:1"><div class="nm">${esc(c.name)}${tick(c.id)}${c.id === me.id ? ' <span class="chip">you</span>' : ''}</div><div class="rl">@${esc(pr.handle)} · ${esc(c.role)}</div></div><span class="bb-fc"><b>${big(n)}</b>followers</span></div>`; }).join('') || '<div class="empty">No one matches.</div>';
  }
  function people(s, me, ui) {
    return `<div class="bb">${community(s)}${tabs(ui)}<input class="field" data-bb="q" placeholder="Search everyone at the gala" value="${esc(ui.q)}" aria-label="Search people"><div class="card" style="padding:4px 16px" id="bb-plist">${peopleList(s, me, ui)}</div></div>`;
  }
  function profile(s, me, ui) {
    const a = who(ui.profile), pr = prof(a.id), ps = list(s).filter(p => p.by === a.id).sort((x, y) => y.at - x.at);
    const tagged = list(s).filter(p => !p.deleted && (p.tags || []).includes(a.id)).length, live = ps.filter(p => !p.deleted).length;
    const fans = pr.followers + follows(s, a.id).length, fol = pr.following + (a.id === me.id ? followingNow(s, me.id) : 0);
    const mine = a.id === me.id, on = amFollowing(s, a.id, me.id);
    const E = typeof Eggs !== 'undefined' ? Eggs.cfg() : {}, bots = E.bots === a.id, pin = (E.pinned || {})[a.id], L = E.list || {}, gone = ui.deleted === a.id && L['deleted:' + a.id];
    const btn = mine ? '<span class="bb-you">This is you</span>' : canWrite(me) ? `<button class="btn ${on ? '' : 'primary'} bb-follow" data-bb-follow="${a.id}" aria-pressed="${on}">${on ? 'Following' : pr.priv ? 'Request to follow' : 'Follow'}</button>` : '';
    return `<div class="bb"><button class="btn small ghost bb-back" data-bb="back">‹ Back</button>
      <div class="card bb-pro"><div class="bb-cover" style="${a.sys ? 'background:linear-gradient(135deg,#18122b,#3a2a6b)' : tint(a.name)}" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="bb-pro-top">${avatar(a, true)}${btn}</div>
        <div class="bb-pn">${esc(a.sys ? a.role : a.name)}${tick(a.id)}${a.sys ? "" : Pron.tag(a.id, s)}</div>
        <div class="bb-handle">@${esc(pr.handle)}${a.role && !a.sys ? ` · ${esc(a.role)}` : ''}</div>
        ${pr.bio ? `<p class="bb-bio">${esc(pr.bio)}</p>` : ''}
        <div class="bb-meta2">${pr.priv ? '<span>🔒 Private account</span>' : ''}<span data-bb-joined="${a.id}">Joined ${pr.joined}</span>${a.sys ? '' : '<span>At the Ashgrove Gala tonight</span>'}</div>
        <div class="bb-stats2">${bots ? `<button class="bb-fans" data-bb-fans aria-expanded="${!!ui.fans}">` : '<span>'}<b>${big(fans)}</b> followers${bots ? '</button>' : '</span>'}<span><b>${big(fol)}</b> following</span><span><b>${live}</b> ${live === 1 ? 'post' : 'posts'}</span><span><b>${tagged}</b> tagged in</span></div></div>
      ${bots && ui.fans ? `<div class="card bb-about bb-botlist"><small>Followers</small>${esc((L.bots || [])[1] || '')}</div>` : ''}${a.profile && !a.sys ? `<div class="card bb-about"><small>About</small>${esc(a.profile)}</div>` : ''}${gone ? `<article class="bb-post bb-pin bb-gone"><div class="bb-meta">Recovered · a deleted post</div><div class="bb-text">${esc(gone[1])}</div></article>` : ''}${pin && L.pinned ? `<article class="bb-post bb-pin"><div class="bb-meta">📌 Pinned · from the archive, ${esc(pin)}</div><div class="bb-text">${esc(L.pinned[1])}</div></article>` : ''}
      ${pr.priv && !mine && !on ? '<div class="card empty">This account is private. Follow to see posts.</div>' : ps.map(p => card(s, me, ui, p)).join('') || '<div class="card empty">No posts yet.</div>'}</div>`;
  }  function render(s, me, ui) { return ui.view === 'profile' && ui.profile ? profile(s, me, ui) : ui.view === 'people' ? people(s, me, ui) : feed(s, me, ui); }

  /* ---------- events (the app passes them in; true = handled) ---------- */
  function onClick(e, ctx) {
    const { me, ui } = ctx, q = sel => e.target.closest(sel); let el;
    if ((el = q('[data-bb-sort]'))) { const k = el.dataset.bbSort; if (k === 'people') ui.view = 'people'; else { ui.view = 'feed'; ui.sort = k; } ctx.redraw(true); return true; }
    if ((el = q('[data-bb-profile]'))) { if (ui.view !== 'profile') ui.from = ui.view; ui.view = 'profile'; ui.profile = el.dataset.bbProfile; ui.fans = false; ui.deleted = null; ui.joinN = 0; if (typeof Eggs !== 'undefined' && (Eggs.cfg().pinned || {})[ui.profile]) setTimeout(() => Eggs.unlockOnce(me, 'pinned'), 400); ctx.redraw(true); window.scrollTo(0, 0); return true; }
    if ((el = q('[data-bb-follow]'))) {
      const id = el.dataset.bbFollow, s = DB.fresh(); if (!canWrite(me) || id === me.id) return true;
      const on = amFollowing(s, id, me.id), u = { ['beb/follows/' + id + '/' + me.id]: on ? null : Date.now() };
      if (!on && G.byId(id)) u['feed/' + uid('f')] = { to: [id], title: 'Bebbit', text: `@${prof(me.id).handle} started following you.`, at: Date.now(), kind: 'beb' };
      DB.update(u); ctx.redraw(true); return true;
    }
    if ((el = q('[data-bb-fans]'))) { ui.fans = !ui.fans; if (ui.fans) Eggs.unlockOnce(me, 'bots'); ctx.redraw(true); return true; }
    /* an oddity: tap "Joined ..." on a profile 5 times to recover a deleted post (only some people have one) */
    if ((el = q('[data-bb-joined]'))) { const id = el.dataset.bbJoined; ui.joinN = (ui.joinN || 0) + 1; if (ui.joinN >= 5 && typeof Eggs !== 'undefined' && Eggs.has('deleted:' + id)) { ui.joinN = 0; ui.deleted = id; Eggs.unlock(me, 'deleted:' + id); ctx.redraw(true); } return true; }
    if ((el = q('[data-bb="back"]'))) { ui.view = ui.from || 'feed'; ui.profile = null; ctx.redraw(true); return true; }
    if ((el = q('[data-bb="compose"]'))) { ui.compose = true; ctx.redraw(true); setTimeout(() => { const t = $('[data-bb="text"]'); if (t) t.focus(); }, 0); return true; }
    if ((el = q('[data-bb="cancel"]'))) { ui.compose = false; ui.draft = freshDraft(); ui.err = ''; ctx.redraw(true); return true; }
    if ((el = q('[data-bb="unphoto"]'))) { ui.draft.photo = null; ctx.redraw(true); return true; }
    if ((el = q('[data-bb-untag]'))) { ui.draft.tags = ui.draft.tags.filter(t => t !== el.dataset.bbUntag); ctx.redraw(true); return true; }
    if ((el = q('[data-bb-open]'))) { const id = el.dataset.bbOpen; ui.open[id] = !ui.open[id]; ctx.redraw(true); return true; }
    if ((el = q('[data-bb-vote], [data-bb-down]'))) {
      if (!canWrite(me)) return true;
      const down = el.hasAttribute('data-bb-down'), id = down ? el.dataset.bbDown : el.dataset.bbVote, s = DB.fresh(), cur = myVote(s, id, me.id);
      const want = down ? (cur === 'down' ? null : 'down') : (cur === 'up' ? null : true);
      const u = { ['beb/votes/' + id + '/' + me.id]: want };
      /* the vote that hides a post goes in the host log, so it can be checked and brought back */
      const p = (B(s).posts || {})[id];
      if (p && want === 'down' && !p.keep && downs(s, id) + (cur === 'down' ? 0 : 1) === DOWN_HIDE()) Clock.log(u, 'bebbit', `A post by ${shown(who(p.by))} was hidden after ${DOWN_HIDE()} downvotes: ${(p.text || '[photo]').slice(0, 60)} (Host > Bebbit can show it again)`);
      DB.update(u);
      /* an oddity: downvoting your own post */
      if (want === 'down' && p && p.real === me.id && typeof Eggs !== 'undefined') setTimeout(() => Eggs.unlockOnce(me, 'selfdown'), 300);
      return true;
    }
    if ((el = q('[data-bb-del]'))) {
      const id = el.dataset.bbDel, s = DB.fresh(), p = (B(s).posts || {})[id], n = left(s, me, 'delete');
      if (!p || p.deleted || !n) return true;
      if (!Ask.sure(`Remove this post for everyone? You have ${n} ${n === 1 ? 'removal' : 'removals'} left.`, () => onClick(e, ctx))) return true;
      const u = { ['beb/posts/' + id + '/deleted']: { by: me.id, at: Date.now() }, ['beb/used/' + me.id + '/delete']: used(s, me.id, 'delete') + 1 };
      Clock.log(u, 'bebbit', `${me.name} removed a post by ${shown(who(p.by))}: ${(p.text || '[photo]').slice(0, 60)}`); DB.update(u); return true;
    }
    if ((el = q('[data-bb-trace]'))) {
      const id = el.dataset.bbTrace, s = DB.fresh(), p = (B(s).posts || {})[id];
      if (!p || !left(s, me, 'trace')) return true;
      if (!Ask.sure('Use your trace on this post? It shows whose phone it really came from.', () => onClick(e, ctx))) return true;
      const u = { ['beb/traces/' + id]: { by: me.id, at: Date.now() }, ['beb/used/' + me.id + '/trace']: used(s, me.id, 'trace') + 1 };
      Clock.log(u, 'bebbit', `${me.name} traced a post shown as ${shown(who(p.by))}. Real poster: ${who(p.real).name}.`); DB.update(u); return true;
    }
    return false;
  }
  function onInput(e, ctx) {
    const el = e.target, ui = ctx.ui;
    if (el.matches('[data-bb="text"]')) { ui.draft.text = el.value; if (ui.err) { ui.err = ''; const x = $('.bb-compose .err'); if (x) x.textContent = ''; } return true; }
    if (el.matches('[data-bb-c]')) { ui.cdraft[el.dataset.bbC] = el.value; return true; }
    if (el.matches('[data-bb="q"]')) { ui.q = el.value; const box = $('#bb-plist'); if (box) box.innerHTML = peopleList(DB.get(), ctx.me, ui); return true; }
    return false;
  }
  function onChange(e, ctx) {
    const el = e.target, ui = ctx.ui;
    if (el.matches('[data-bb="photo"]')) {
      const f = el.files && el.files[0]; if (!f) return true;
      shrink(f).then(src => { ui.draft.photo = src; ui.err = ''; }).catch(err => { ui.err = err.message; }).then(() => ctx.redraw(true));
      return true;
    }
    if (el.matches('[data-bb="tag"]')) { if (el.value && !ui.draft.tags.includes(el.value)) ui.draft.tags.push(el.value); ctx.redraw(true); return true; }
    if (el.matches('[data-bb="hack"]')) { ui.draft.hack = el.checked; if (!el.checked) ui.draft.as = ''; ctx.redraw(true); return true; }
    if (el.matches('[data-bb="as"]')) { ui.draft.as = el.value; return true; }
    return false;
  }
  function onSubmit(e, ctx) {
    const f = e.target.closest('[data-bb-form]'); if (!f) return false;
    e.preventDefault();
    const { me, ui } = ctx; if (!canWrite(me)) return true;
    if (f.dataset.bbForm === 'post') {
      const d = ui.draft, text = d.text.trim(), s = DB.fresh();
      const fail = m => { ui.err = m; ctx.redraw(true); return true; };
      if (!text && !d.photo) return fail('Write something or add a photo first.');
      if (d.hack && !d.as) return fail('Choose who the post should look like it came from.');
      if (d.hack && !left(s, me, 'hack')) return fail('You have no disguised posts left.');
      const u = {}, pid = post(u, { by: d.hack ? d.as : me.id, real: me.id, text, photo: d.photo, tags: d.tags, hacked: d.hack });
      /* an oddity: a post that just says "first" gets a reply from the moderator */
      const E = typeof Eggs !== 'undefined' ? Eggs.cfg() : {};
      if ((E.list || {}).first && text.toLowerCase().replace(/[^a-z]/g, '') === 'first') { u['beb/comments/' + pid + '/' + uid('c')] = { by: 'mod', text: E.list.first[1], at: Date.now() + 1500 }; ui.open[pid] = true; setTimeout(() => Eggs.unlockOnce(me, 'first'), 700); }
      ui.fresh = pid; setTimeout(() => { if (ui.fresh === pid) { ui.fresh = null; } }, 1400);
      if (d.hack) u['beb/used/' + me.id + '/hack'] = used(s, me.id, 'hack') + 1;
      if (!DB.update(u)) return fail("Couldn't save the post. The photo may be too large for this test computer.");
      ui.compose = false; ui.draft = freshDraft(); ui.err = ''; ui.view = 'feed'; ui.sort = 'new';
      if (document.activeElement) document.activeElement.blur(); ctx.redraw(true); window.scrollTo(0, 0); return true;
    }
    if (f.dataset.bbForm === 'c') {
      const pid = f.dataset.pid, text = (ui.cdraft[pid] || '').trim(); if (!text) return true;
      const s = DB.fresh(), p = (B(s).posts || {})[pid]; if (!p || p.deleted) return true;
      const u = { ['beb/comments/' + pid + '/' + uid('c')]: { by: me.id, text, at: Date.now() } };
      if (p.by !== me.id && G.byId(p.by)) u['feed/' + uid('k')] = { to: [p.by], title: 'New comment on Bebbit', text: `${me.name} commented on your post: "${text.slice(0, 80)}"`, at: Date.now(), kind: 'beb' };
      Clock.log(u, 'bebbit', `${me.name} commented: ${text.slice(0, 70)}`);
      DB.update(u); ui.cdraft[pid] = ''; if (document.activeElement) document.activeElement.blur(); ctx.redraw(true); return true;
    }
    return true;
  }

  return { newUI, render, onClick, onInput, onChange, onSubmit, post, shrink, who, shown, list, nVotes, ups, downs, buried, comments, used, photoCount, safeImg, ago, tint, prof, follows, big };
})();
