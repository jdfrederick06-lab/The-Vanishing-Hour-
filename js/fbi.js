/* =====================================================================
   THE VANISHING HOUR — FBI Headquarters.
   Records lookups (a shared team pool), sealed and restricted sections,
   warrants and detentions (lead agent only), the statement log, the
   case board and the team. Rules and records live in story.js
   (STORY.fbi and STORY.records).

   Data lives under state.fbi:
     lookups/{id}     { by, q, rec, at }       rec = record id, or null for "no match"
     warrants/{who}   { by, at }
     detained/{who}   { by, at }
     statements/{id}  { subject, text, sworn, by, at, edits:[{at,text}], withdrawn, public }
     suspects/{who}   'poi' | 'cleared'
     notes/{id}       { by, text, at }
     bonus            extra lookups the host has granted
   ===================================================================== */
const FBI = (() => {
  const C = () => STORY.fbi || {};
  const F = s => s.fbi || {};
  const byName = (a, b) => a.name.localeCompare(b.name);
  const first = id => { const c = G.byId(id); return c ? c.name.split(' ')[0] : id; };
  const agents = () => STORY.characters.filter(c => c.group === 'fbi');
  const isLead = me => me.id === C().lead;
  const ago = ts => { const m = Math.floor((Date.now() - ts) / 60000); return m < 1 ? 'just now' : m + ' min ago'; };

  /* ---------- records ---------- */
  const surnameFirst = n => { const p = n.replace(/^Dr\.\s+/, '').split(' '); return (p.slice(1).join(' ') + ', ' + p[0]).toUpperCase(); };
  let _all = null;
  function records() {
    if (_all) return _all;
    const out = (STORY.records || []).slice(), have = new Set(out.map(r => r.who).filter(Boolean));
    STORY.characters.forEach(c => {
      if (!have.has(c.id)) out.push({ id: 'auto_' + c.id, who: c.id, names: [c.name], title: surnameFirst(c.name), fields: [['Born', String(2027 - c.age)], ['Occupation', c.role], ['Criminal record', 'None on file']], notes: [c.profile] });
    });
    return (_all = out);
  }
  const rec = id => records().find(r => r.id === id);
  const norm = t => String(t).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const search = q => { const n = norm(q); return n.length < 3 ? [] : records().filter(r => r.names.some(x => norm(x).includes(n))); };

  /* ---------- the lookup pool ---------- */
  const lookups = s => Object.entries(F(s).lookups || {}).map(([id, l]) => Object.assign({ id }, l)).sort((a, b) => b.at - a.at);
  const total = s => (C().lookups || 0) + (F(s).bonus || 0);
  const usedN = s => lookups(s).length;
  const leftN = s => Math.max(0, total(s) - usedN(s));
  const opened = (s, id) => lookups(s).some(l => l.rec === id);

  function secState(s, me, r, sec) {
    if (!sec.needs) return 'open';
    if (sec.needs === 'warrant') return r.who && (F(s).warrants || {})[r.who] ? 'open' : 'warrant';
    if (sec.needs === 'clearance') return me && (C().cleared || []).includes(me.id) ? 'open' : 'clearance';
    return 'open';
  }
  /** Mark evidence found on the host's board for any clue section this agent can now see. */
  function markClues(u, s, me, r) {
    (r.sections || []).forEach(sec => {
      if (sec.clue && secState(s, me, r, sec) === 'open' && !(s.clues && s.clues[sec.clue])) {
        u['clues/' + sec.clue] = { at: Date.now(), by: 'FBI lookup' };
        Clock.log(u, 'fbi', `Evidence ${sec.clue} surfaced in a records lookup (${r.title}).`);
      }
    });
  }

  /* ---------- the case header ---------- */
  function caseChips(s) {
    const r = Clock.read(s), idx = id => STORY.phases.findIndex(p => p.id === id);
    const dead = r.i < 0 ? 0 : (C().homicides || []).filter(id => r.i >= idx(id)).length;
    const held = Object.keys(F(s).detained || {}).length;
    return `<div class="fb-case"><span class="mono">CASE ${esc(C().caseNo || '')}</span><span class="fb-tag ok">OPEN</span>${dead ? `<span class="fb-tag red">${dead} ${dead === 1 ? 'HOMICIDE' : 'HOMICIDES'}</span>` : ''}${held ? `<span class="fb-tag">${held} IN CUSTODY</span>` : ''}</div>`;
  }

  /* ---------- screens ---------- */
  const newUI = () => ({ sub: 'records', q: '', matches: null, view: null, stmt: { subject: '', text: '', sworn: false }, edit: null, editText: '', note: '', poi: '', warrant: '', err: '' });
  const subnav = ui => `<div class="fb-sub" role="tablist">${[['records', 'Records'], ['statements', 'Statements'], ['board', 'Case board'], ['team', 'Team']].map(([k, l]) => `<button data-fb-sub="${k}" aria-current="${ui.sub === k}">${l}</button>`).join('')}</div>`;

  function shields(s) {
    const n = total(s), l = leftN(s), icon = full => `<svg width="14" height="16" viewBox="0 0 16 18" aria-hidden="true"><path d="M8 1 L15 4 V9 C15 13 12 16 8 17 C4 16 1 13 1 9 V4 Z" fill="${full ? '#d4b25c' : 'none'}" stroke="${full ? '#d4b25c' : '#3a5a82'}" stroke-width="1.5"/></svg>`;
    return `<div class="fb-shields" aria-label="${l} of ${n} lookups left">${Array.from({ length: n }, (_, i) => icon(i < l)).join('')}<span class="mono">${l} left</span></div>`;
  }
  /* ---------- the record file ----------
     A lookup opens a full federal file, not a summary. The story's facts (story.js fields,
     notes and sections) sit among pages of routine administrative detail, so agents have to
     read it and decide what matters. The routine detail is generated the same way every time
     from the record id, and is written to be harmless: indexes, queries, filings and dates,
     never new facts about anyone's life. Nothing in the file is marked as evidence. */
  const seeded = key => { let h = 2166136261; for (const ch of String(key)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return (h % 100000) / 100000; }; };
  const REDACT = n => `<span class="rx" aria-label="redacted">${'█'.repeat(n)}</span>`;
  const CITIES = ['Ridgeport', 'Halston', 'Marrow Bay', 'East Lyle', 'Carver Falls', 'Port Ansel', 'Westbrook', 'New Sallow', 'Brightwater', 'Kessler Park'];
  const STREETS = ['Calder Ave', 'Wexford Ct', 'Linnet St', 'Old Mill Rd', 'Harrow Ln', 'Juniper Way', 'Quarry Rd', 'Bellmont Ave', 'Saltmarsh Dr', 'Pierce St', 'Fennimore Pl', 'Orchard Row'];
  const CARS = ['Subaru Outback, gray', 'Toyota Camry, white', 'Honda Civic, blue', 'Ford F-150, black', 'Volvo XC60, silver', 'Kia Soul, green', 'Mazda 3, red', 'Jeep Wrangler, tan', 'Tesla Model 3, white', 'Audi A6, black'];
  const PORTS = ['JFK ← LHR', 'EWR ← CDG', 'BOS ← DUB', 'MIA ← MEX', 'JFK ← FCO', 'ORD ← FRA', 'IAD ← AMS', 'SFO ← NRT', 'LAX ← YVR', 'ATL ← CUN'];
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  function fileHTML(s, me, r) {
    const rnd = seeded(r.id), R = (a, b) => a + Math.floor(rnd() * (b - a + 1)), P = arr => arr[Math.floor(rnd() * arr.length)];
    const F = {}; (r.fields || []).forEach(([k, v]) => { F[k] = v; });
    const c = r.who ? G.byId(r.who) : null, used = new Set();
    const take = (...keys) => keys.filter(k => F[k] != null && !used.has(k)).map(k => { used.add(k); return [k, esc(F[k])]; });
    const kind = r.kind || (/deceased/i.test(r.title) ? 'deceased' : 'person');
    const yrRaw = F.Born || (c ? String(2027 - c.age) : ''), yr = parseInt((String(yrRaw).match(/\d{4}/) || [])[0], 10) || 1990;
    used.add('Born');
    const d = (y, m) => `${String(R(1, 28)).padStart(2, '0')} ${m || P(MON)} ${y}`;
    const fileNo = `${C().caseNo || '27-0000'}-${(r.id.toUpperCase().replace(/[^A-Z]/g, '') + 'XXX').slice(0, 3)}-${R(1000, 9999)}`;
    const name = esc(r.title.split(' · ')[0]);
    const aka = r.names.filter(n => n.includes(' ') && !r.title.toLowerCase().includes(n.split(' ')[0].toLowerCase())).map(esc);
    const addr = n => Array.from({ length: n }, (_, i) => { const y2 = 2026 - i * R(2, 5), y1 = y2 - R(1, 4); return [`${y1}–${i ? y2 : 'present'}`, `${R(12, 4980)} ${P(STREETS)}${rnd() < .4 ? ', Unit ' + REDACT(2) : ''}, ${P(CITIES)}`]; });
    const sec = (no, title, rows, extra) => `<section class="fbf-s"><h4><span>${String(no).padStart(2, '0')}</span>${title}</h4>${rows.length ? `<dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}${extra || ''}</section>`;
    const out = []; let n = 1;
    if (kind === 'company') {
      out.push(sec(n++, 'Registration', [['Entity', name], ...take('Registered', 'Business', 'History'), ['Registry no.', `${R(10, 99)}-${R(100000, 999999)}`], ['Status', F.History && /dissolved/i.test(F.History) ? 'Dissolved' : 'Active'], ['Registered agent', REDACT(14)]]));
      out.push(sec(n++, 'Officers and ownership', [...take('Owners', 'Managing partner', 'Beneficial owner'), ['Directors listed', String(R(1, 4))], ['Nominee directors', rnd() < .5 ? 'Suspected (see analyst note)' : 'None indicated']]));
      out.push(sec(n++, 'Filings', [['Annual report', `Filed ${d(2026)}`], ['Annual report', `Filed ${d(2025)}`], ['Amendment', `Change of address, ${d(R(2019, 2024))}`], ['Tax ID', `${R(10, 99)}-${REDACT(7)}`]]));
      out.push(sec(n++, 'Banking indicators', [['Correspondent accounts', `${R(1, 3)} (jurisdiction withheld)`], ['Wire activity, 24 mo.', `${R(3, 40)} transfers on index`], ['FinCEN query', 'Not run (requires written justification)']]));
    } else if (kind === 'personnel') {
      out.push(sec(n++, 'Employee identification', [['Name', name], ['Year of birth', esc(yrRaw || String(yr))], ['Employee no.', `${R(1000000, 9999999)}`], ['Home address', `${REDACT(18)} (withheld, employee privacy)`], ['Emergency contact', REDACT(16)]]));
      out.push(sec(n++, 'Service record', [...take('Position', 'Joined', 'Service', 'Assignment', 'Prior', 'Status'), ['Training', `FBI Academy, Quantico, class ${R(18, 25)}-${String(R(1, 9)).padStart(2, '0')}`], ['Clearance', (C().cleared || []).includes(r.who) ? 'TOP SECRET // SCI' : 'SECRET'], ['Last background reinvestigation', d(R(2024, 2026))]]));
      out.push(sec(n++, 'Qualifications', [['Firearms', `Qualified, ${R(86, 99)}%, last ${P(MON)} 2026`], ['Defensive tactics', 'Current'], ['Vehicle (pool)', `${R(2021, 2025)} ${P(CARS)}, assigned`], ['Language', rnd() < .35 ? 'French (2+)' : 'None tested'], ...take('Commendations')]));
      out.push(sec(n++, 'Administrative', [['Performance (last cycle)', P(['Fully successful', 'Exceeds', 'Fully successful', 'Outstanding'])], ['Leave balance', `${R(4, 31)} days`], ['Travel vouchers open', String(R(0, 3))], ['Ethics filing', `OGE 450, filed ${d(2026)}`]]));
    } else if (kind === 'deceased') {
      out.push(sec(n++, 'Identification', [['Name', name], ['Year of birth', esc(yrRaw)], ...take('Died', 'Occupation'), ['Death certificate', `County registrar, no. ${R(100, 999)}-${R(1000, 9999)}`], ['SSN', `***-**-${R(1000, 9999)} (retired)`]]));
      out.push(sec(n++, 'Last known address', addr(1).map(([a, b]) => ['2000–2001', b])));
      out.push(sec(n++, 'Next of kin', [['Spouse', 'None on file'], ['Children', `1, minor (name withheld, state care)`], ['Estate', 'No probate filing located']]));
    } else {
      out.push(sec(n++, 'Identification', [['Name', name], ...(aka.length ? [['Also known as', aka.join('; ')]] : []), ['Year of birth', esc(yrRaw || String(yr))], ['Place of birth', `${P(CITIES)} (per state record)`], ['SSN', `***-**-${R(1000, 9999)}`], ['FBI no.', `${R(100, 999)} ${R(100, 999)} ${String.fromCharCode(65 + R(0, 25))}${R(1, 9)}`], ['State ID', `${REDACT(4)}${R(1000, 9999)}`], ['Citizenship', 'United States']]));
      out.push(sec(n++, 'Address history', addr(R(2, 4))));
      out.push(sec(n++, 'Employment and affiliations', [...take('Occupation', 'Prior', 'Position', 'Childhood'), ['W-2 index', `${R(1, 6)} employers reported, ${Math.max(yr + 18, 2000)}–2026`], ['Professional licenses', P(['None on file', 'None on file', 'One (lapsed)', 'One (active)'])], ['Corporate filings', `${R(0, 5)} entities list subject as officer`]]));
      out.push(sec(n++, 'Financial indicators', [...take('Financial', 'Insurance'), ['Credit header', `${R(2, 14)} tradelines, ${R(0, 3)} inquiries (90 days)`], ['Liens / judgments', F.Civil ? 'See civil history' : P(['None located', 'None located', `1 satisfied (${R(2010, 2022)})`])], ['FinCEN query', 'Not run (requires written justification)']]));
      out.push(sec(n++, 'Criminal and civil history', [...take('Criminal record', 'Arresting officer', 'Civil', 'Regulatory'), ['NCIC wants / warrants', 'No active entries under this name'], ['Interstate index (III)', F['Criminal record'] && !/^none/i.test(F['Criminal record']) ? '1 record (above)' : 'No record'], ['Traffic', rnd() < .5 ? 'No violations' : `1 citation (speeding), ${R(2015, 2025)}, paid`]]));
      out.push(sec(n++, 'Travel (CBP / TSA)', yr > 2006 && rnd() < .5 ? [['International travel', 'None on file']] : Array.from({ length: R(1, 4) }, () => [d(R(2022, 2026)), `Entry · ${P(PORTS)}`])));
      out.push(sec(n++, 'Vehicles and property', [['Registered vehicle', rnd() < .2 ? 'None' : `${R(2012, 2026)} ${P(CARS)} · plate ${REDACT(3)}-${R(100, 999)}`], ['Real property', P(['None on file', 'None on file', '1 parcel (residential)', '2 parcels'])], ['Firearms (state registry)', 'None']]));
      out.push(sec(n++, 'Communications', [['Phone (subscriber)', `(${REDACT(3)}) ${REDACT(3)}-${R(1000, 9999)}`], ['Carrier records', 'Not requested'], ['Email (on index)', `${R(1, 3)} addresses, withheld`]]));
    }
    const rest = (r.fields || []).filter(([k]) => !used.has(k)).map(([k, v]) => [k, esc(v)]);
    if (rest.length) out.push(sec(n++, 'Other indices', rest));
    if ((r.notes || []).length) out.push(sec(n++, 'Analyst notes', [], r.notes.map((t, i) => `<p class="fbf-note"><b>${d(R(2024, 2026))} · NOTE ${i + 1}</b> ${esc(t)}</p>`).join('')));
    if ((r.sections || []).length) out.push(sec(n++, 'Supplemental attachments', [], r.sections.map((x, i) => {
      const st = secState(s, me, r, x), lab = `ATTACHMENT ${String.fromCharCode(65 + i)}`;
      if (st === 'warrant') return `<div class="fbf-att sealed"><b>${lab} · SEALED</b><p>${REDACT(22)} ${REDACT(9)}<br>${REDACT(15)} ${REDACT(19)}</p><small>Release requires a warrant signed by the Special Agent in Charge.</small></div>`;
      if (st === 'clearance') return `<div class="fbf-att sealed"><b>${lab} · RESTRICTED</b><p>${REDACT(18)} ${REDACT(12)}<br>${REDACT(24)}</p><small>Counterintelligence Division. Access by clearance only.</small></div>`;
      return `<div class="fbf-att"><b>${lab} · ${esc(x.title)}</b><p>${esc(x.body).replace(/\n/g, '<br>')}</p></div>`;
    }).join('')));
    out.push(sec(n++, 'Routing', [['Generated', `RMS query, terminal ACT-0${R(1, 9)}, case ${esc(C().caseNo || '')}`], ['Copies', 'SAC · case file · ' + REDACT(8)], ['Retention', 'Per schedule N1-065-' + R(10, 99)]]));
    return { fileNo, kind, sections: out, opened: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace(',', '') };
  }
  const TYPE = { person: 'Subject record', personnel: 'Personnel file', company: 'Entity record', deceased: 'Decedent record' };
  const CLIP = '<svg class="fbf-clip" viewBox="0 0 24 64" aria-hidden="true"><path d="M8 18 V48 a6 6 0 0 0 12 0 V12 a9 9 0 0 0 -18 0 V50" fill="none" stroke="#8d96a6" stroke-width="2.6" stroke-linecap="round"/></svg>';
  const FOOT = 'This document contains neither recommendations nor conclusions of the FBI. It is the property of the FBI and is loaned to your agency; it and its contents are not to be distributed outside your agency.';
  function recordCard(s, me, r) {
    if (r.noMatch) return `<div class="fbf none${r._anim ? ' opening' : ''}"><div class="fbf-paper"><div class="fbf-ban">FEDERAL RECORDS SEARCH · ALL INDICES</div><div class="fbf-nm">NO MATCH</div><p class="fbf-note">No person, alias or company by this name appears in federal, state or international indices (NCIC, III, CBP, state DMV, corporate registries). Query logged.</p><button class="fbf-close" data-fb-close>Close</button></div></div>`;
    const f = fileHTML(s, me, r), type = TYPE[f.kind] || 'Record';
    const firstBy = (lookups(s).slice().reverse().find(l => l.rec === r.id) || {}).by;
    /* page 1 carries the subject block and two sections; later pages three each */
    const chunks = [f.sections.slice(0, 2)]; for (let i = 2; i < f.sections.length; i += 3) chunks.push(f.sections.slice(i, i + 3));
    const N = chunks.length;
    const photo = f.kind === 'company' ? '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 40V18l16-9 16 9v22M14 40V24h6v16M28 40V24h6v16M6 40h36" fill="none" stroke="#8a8270" stroke-width="2"/></svg><small>Entity</small>'
      : `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="18" r="8" fill="#c9c0aa"/><path d="M9 44c1-9 7-14 15-14s14 5 15 14z" fill="#c9c0aa"/></svg><small>${f.kind === 'deceased' ? 'Deceased' : 'Photo on file'}</small>`;
    const sheet = (i, inner) => `<div class="fbf-paper" style="--i:${i}">${i === 0 ? CLIP : ''}
        <div class="fbf-ban">CONFIDENTIAL // LAW ENFORCEMENT SENSITIVE</div>
        <div class="fbf-meta"><span>FILE ${esc(f.fileNo)}</span><span>${esc(type.toUpperCase())}</span><span>PG ${i + 1} OF ${N}</span></div>
        ${inner}
        <div class="fbf-foot"><span>${FOOT}</span><span class="fbf-pg">${i + 1} / ${N}</span></div></div>`;
    const subj = `<div class="fbf-subj"><div class="fbf-photo">${photo}</div><div class="fbf-boxes">
        <div class="w2"><small>Subject</small><b>${esc(r.title)}</b></div>
        <div><small>File no.</small><b>${esc(f.fileNo)}</b></div><div><small>Record type</small><b>${esc(type)}</b></div>
        <div><small>Retrieved</small><b>${esc(f.opened)}</b></div><div><small>Requested by</small><b>${esc(firstBy ? 'SA ' + first(firstBy).toUpperCase() : 'ART CRIME TEAM')}</b></div>
        <div><small>Classification</small><b class="red">Confidential</b></div><div><small>Pages</small><b>${N}</b></div></div></div>`;
    return `<div class="fbf${r._anim ? ' opening' : ''}">
      <div class="fbf-tabrow"><div class="fbf-tab"><span>${esc(r.title.split(' · ')[0])}</span><span class="mono">${esc(f.fileNo)}</span></div><button class="fbf-close" data-fb-close aria-label="Close the file">Close file ✕</button></div>
      <div class="fbf-stack">${chunks.map((ch, i) => sheet(i, (i === 0 ? subj : '') + `<div class="fbf-cols">${ch.join('')}</div>`)).join('')}</div>
      ${r._anim ? '<span class="fbf-stamp" aria-hidden="true">RECEIVED · ART CRIME TEAM</span>' : ''}</div>`;
  }
  function recordsView(s, me, ui) {
    let result = '';
    if (ui.view === '__none') result = recordCard(s, me, { noMatch: true, _anim: ui.anim === '__none' });
    else if (ui.view) { const r = rec(ui.view); if (r) result = recordCard(s, me, Object.assign({}, r, { _anim: ui.anim === r.id })); }
    else if (ui.matches) result = `<div class="card"><div class="fb-k">${ui.matches.length} ${ui.matches.length === 1 ? 'record matches' : 'records match'}. Opening a record the team hasn't opened uses 1 lookup.</div>${ui.matches.map(id => { const r = rec(id); return `<button class="fb-match" data-fb-open="${id}"><span>${esc(r.title)}</span><span class="mono">${opened(s, id) ? 'OPENED · FREE' : '1 LOOKUP'}</span></button>`; }).join('')}</div>`;
    const hist = lookups(s);
    return `<div class="fb-search">${shields(s)}
        <form class="fb-q" data-fb-form="q"><input class="field" data-fb="q" value="${esc(ui.q)}" placeholder="Name, alias or company" aria-label="Search records" autocapitalize="words"><button class="btn primary" type="submit">Run</button></form>
        <div class="err" role="alert">${esc(ui.err)}</div></div>
      ${result}
      <div class="sec-title">Team lookups · ${hist.length} of ${total(s)} used</div>
      <div class="card fb-list">${hist.map(l => l.kind === 'extract' ? `<div class="fb-hist"><span><b>${esc(l.q)}</b><small>${esc(first(l.by))} ran it (Tasks tab)</small></span><span class="mono">${esc(wallTime(l.at))}</span></div>` : `<button class="fb-hist" data-fb-open="${l.rec || '__none'}"><span><b>${esc(l.rec ? rec(l.rec).title : 'NO MATCH: ' + l.q)}</b><small>${esc(first(l.by))} searched "${esc(l.q)}"</small></span><span class="mono">${esc(wallTime(l.at))}</span></button>`).join('') || '<div class="empty">No lookups yet. They\'re shared by the whole team, so spend them well.</div>'}</div>`;
  }

  function statementsView(s, me, ui) {
    const all = Object.entries(F(s).statements || {}).map(([id, x]) => Object.assign({ id }, x)).filter(x => !x.withdrawn).sort((a, b) => b.at - a.at);
    const ppl = STORY.characters.filter(c => c.id !== me.id).sort(byName);
    return `<form class="card fb-form" data-fb-form="stmt">
        <div class="fb-k">Log a statement</div>
        <select class="field" data-fb="subject" aria-label="Who gave the statement"><option value="">Who gave it?</option>${ppl.map(c => `<option value="${c.id}" ${ui.stmt.subject === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <textarea class="field" data-fb="stext" rows="3" maxlength="600" placeholder="What did they say? Write it the way they said it." aria-label="Statement">${esc(ui.stmt.text)}</textarea>
        <label class="check"><input type="checkbox" data-fb="sworn" ${ui.stmt.sworn ? 'checked' : ''}>Asked directly (a sworn answer)</label>
        <button class="btn primary" type="submit">Log statement</button><div class="err" role="alert">${esc(ui.err)}</div></form>
      <div class="sec-title">Statement log · ${all.length}</div>
      ${all.map(x => {
        const subj = G.byId(x.subject), mine = x.by === me.id, editing = ui.edit === x.id;
        return `<div class="card fb-st"><div class="row between"><b>${esc(subj ? subj.name : 'Unknown')}</b><span class="mono mute" style="font-size:11px">${esc(wallTime(x.at))}</span></div>
          <div class="row" style="gap:6px;flex-wrap:wrap">${x.sworn ? '<span class="fb-tag gold">SWORN</span>' : ''}${x.public ? '<span class="fb-tag ok">RELEASED</span>' : ''}${(x.edits || []).length ? '<span class="fb-tag">EDITED</span>' : ''}<span class="mute" style="font-size:12px">Logged by ${esc(first(x.by))}</span></div>
          ${editing ? `<form data-fb-form="edit" data-id="${x.id}" class="fb-form"><textarea class="field" data-fb="etext" rows="3">${esc(ui.editText)}</textarea><div class="row"><button class="btn small primary" type="submit">Save</button><button type="button" class="btn small ghost" data-fb-cancel>Cancel</button></div></form>` : `<p class="fb-quote">${esc(x.text)}</p>`}
          <div class="row" style="gap:6px;flex-wrap:wrap">${mine && !editing ? `<button class="btn small ghost" data-fb-edit="${x.id}">Edit</button><button class="btn small ghost" data-fb-withdraw="${x.id}">Withdraw</button>` : ''}${isLead(me) ? `<button class="btn small ghost" data-fb-public="${x.id}">${x.public ? 'Unrelease' : 'Release to the room'}</button>` : ''}</div></div>`;
      }).join('') || '<div class="card empty">No statements yet. Every interview you log here is shared with the whole team.</div>'}`;
  }

  function boardView(s, me, ui) {
    const found = STORY.clues.concat(STORY.herrings).filter(c => s.clues && s.clues[c[0]]);
    const sus = Object.entries(F(s).suspects || {}), det = F(s).detained || {};
    const notes = Object.entries(F(s).notes || {}).map(([id, n]) => Object.assign({ id }, n)).sort((a, b) => b.at - a.at);
    const ppl = STORY.characters.filter(c => c.group !== 'fbi' && !(F(s).suspects || {})[c.id]).sort(byName);
    return `<div class="sec-title">Evidence · ${found.length}</div>
      <div class="card">${found.map(c => `<div class="fb-ev"><span class="mono">${esc(c[0])}</span>${esc(c[1])}</div>`).join('') || '<div class="empty" style="padding:8px">Nothing logged yet. Evidence appears here as it\'s found.</div>'}</div>
      <div class="sec-title">Persons of interest</div>
      <div class="card">${sus.map(([id, st]) => `<div class="fb-poi"><div><b>${esc(G.byId(id).name)}</b><small>${esc(G.byId(id).role)}</small></div>
          <div class="row" style="gap:6px;flex-wrap:wrap">${det[id] ? '<span class="fb-tag red">DETAINED</span>' : st === 'cleared' ? '<span class="fb-tag ok">CLEARED</span>' : '<span class="fb-tag">INTEREST</span>'}
          <button class="btn small ghost" data-fb-clear="${id}">${st === 'cleared' ? 'Reopen' : 'Clear'}</button>
          ${isLead(me) ? `<button class="btn small ${det[id] ? '' : 'danger'}" data-fb-detain="${id}">${det[id] ? 'Release' : 'Detain'}</button>` : ''}
          <button class="btn small ghost" data-fb-unpoi="${id}" aria-label="Take off the board">×</button></div></div>`).join('') || '<div class="empty" style="padding:8px">No one on the board yet.</div>'}
        <form class="fb-q" data-fb-form="poi" style="margin-top:10px"><select class="field" data-fb="poi" aria-label="Add a person of interest"><option value="">Add a person of interest…</option>${ppl.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><button class="btn" type="submit">Add</button></form></div>
      <div class="sec-title">Team notes</div>
      <form class="fb-q" data-fb-form="note"><input class="field" data-fb="note" value="${esc(ui.note)}" maxlength="300" placeholder="A note for the whole team" aria-label="Add a note"><button class="btn" type="submit">Pin</button></form>
      ${notes.map(n => `<div class="card fb-st"><div class="row between"><b>${esc(first(n.by))}</b><span class="mono mute" style="font-size:11px">${esc(wallTime(n.at))}</span></div><p>${esc(n.text)}</p></div>`).join('')}`;
  }

  function teamView(s, me, ui) {
    const w = F(s).warrants || {}, wl = Math.max(0, (C().warrants || 0) - Object.keys(w).length);
    const mine = id => lookups(s).filter(l => l.by === id).length;
    const ppl = STORY.characters.filter(c => !w[c.id]).sort(byName);
    return `<div class="card">${agents().map(a => `<div class="fb-agent"><span class="dot ${G.online(s, a.id) ? 'on' : ''}"></span><div style="flex:1;min-width:0"><b>${esc(a.name)}${a.id === me.id ? ' <span class="chip">you</span>' : ''}</b><small>${esc(a.role)}</small></div><span class="mono mute" style="font-size:12px">${mine(a.id)} lookups</span></div>`).join('')}</div>
      <div class="sec-title">Warrants · ${wl} of ${C().warrants || 0} left</div>
      <div class="card">${Object.entries(w).map(([id, x]) => {
        /* a warrant also lets the lead freeze that person's NightBank account */
        const acct = typeof NW !== 'undefined' ? NW.walletOf(G.byId(id)) : null, fz = acct && NW.frozen(s, acct);
        const btn = isLead(me) && acct ? (fz ? (fz.by === 'fbi' ? `<button class="btn small" data-fb-freeze="${id}">Unfreeze account</button>` : '<span class="chip">account frozen</span>') : `<button class="btn small danger" data-fb-freeze="${id}">Freeze account</button>`) : fz ? '<span class="chip bad">account frozen</span>' : '';
        return `<div class="fb-ev fb-wr"><span class="mono">${esc(wallTime(x.at))}</span><span style="flex:1;min-width:0">${esc(G.byId(id).name)}</span>${btn}</div>`;
      }).join('') || '<div class="empty" style="padding:8px">No warrants issued.</div>'}
        ${isLead(me) ? `<form class="fb-q" data-fb-form="warrant" style="margin-top:10px"><select class="field" data-fb="warrant" aria-label="Issue a warrant for"><option value="">Issue a warrant for…</option>${ppl.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><button class="btn primary" type="submit" ${wl ? '' : 'disabled'}>Issue</button></form>
          <p class="mute" style="font-size:12px;margin-top:8px">A warrant unseals that person's sealed records and tells them to show agents what they're carrying. It also lets you freeze their NightBank account, so they can't move money.</p>` :'<p class="mute" style="font-size:12px;margin-top:8px">Only the Special Agent in Charge can issue warrants.</p>'}</div>`;
  }

  function render(s, me, ui) {
    const body = ui.sub === 'statements' ? statementsView(s, me, ui) : ui.sub === 'board' ? boardView(s, me, ui) : ui.sub === 'team' ? teamView(s, me, ui) : recordsView(s, me, ui);
    return `<div class="fb">${caseChips(s)}${subnav(ui)}${body}</div>`;
  }

  /* ---------- actions ---------- */
  function openRecord(me, id, q) {
    const s = DB.fresh(), r = rec(id);
    if (!r) return 'That record no longer exists.';
    if (opened(s, id)) return null;                              // already opened by the team: free
    if (!leftN(s)) return 'The team is out of lookups.';
    const u = { ['fbi/lookups/' + uid('q')]: { by: me.id, q, rec: id, at: Date.now() } };
    Clock.log(u, 'fbi', `${me.name} ran a lookup: ${r.title}.`);
    markClues(u, s, me, r); DB.update(u); return null;
  }
  function alert(u, to, title, text) { u['feed/' + uid('f')] = { to: [to], title, text, at: Date.now(), kind: 'fbi' }; }

  /* play the "record opens" animation once for this record */
  function anim(ui, id) { ui.anim = id; clearTimeout(anim.t); anim.t = setTimeout(() => { ui.anim = null; }, 2600); }
  function onClick(e, ctx) {
    const { me, ui } = ctx, q = sel => e.target.closest(sel); let el;
    const done = () => { ctx.redraw(true); return true; };
    if ((el = q('[data-fb-open]'))) anim(ui, el.dataset.fbOpen);
    if ((el = q('[data-fb-sub]'))) { ui.sub = el.dataset.fbSub; ui.err = ''; return done(); }
    if (q('[data-fb-close]')) { ui.view = null; ui.anim = null; return done(); }
    if ((el = q('[data-fb-open]'))) {
      const id = el.dataset.fbOpen; ui.err = '';
      if (id === '__none') { ui.view = '__none'; return done(); }
      const s = DB.get();
      if (!opened(s, id) && !Ask.sure(`Open this record? It uses 1 of the team's ${leftN(s)} remaining lookups.`, () => onClick(e, ctx))) return true;
      const err = openRecord(me, id, ui.q || rec(id).names[0]);
      if (err) ui.err = err; else { ui.view = id; ui.matches = null; }
      window.scrollTo(0, 0); return done();
    }
    if ((el = q('[data-fb-edit]'))) { const x = F(DB.get()).statements[el.dataset.fbEdit]; ui.edit = el.dataset.fbEdit; ui.editText = x.text; return done(); }
    if ((el = q('[data-fb-cancel]'))) { ui.edit = null; return done(); }
    if ((el = q('[data-fb-withdraw]'))) {
      if (!Ask.sure('Withdraw this statement from the log?', () => onClick(e, ctx))) return true;
      const id = el.dataset.fbWithdraw, x = F(DB.get()).statements[id], u = { ['fbi/statements/' + id + '/withdrawn']: Date.now() };
      Clock.log(u, 'fbi', `${me.name} withdrew a statement from ${G.byId(x.subject).name}.`); DB.update(u); return true;
    }
    if ((el = q('[data-fb-public]'))) {
      const id = el.dataset.fbPublic, x = F(DB.get()).statements[id], u = { ['fbi/statements/' + id + '/public']: x.public ? null : Date.now() };
      Clock.log(u, 'fbi', `${me.name} ${x.public ? 'pulled back' : 'released'} a statement from ${G.byId(x.subject).name}.`); DB.update(u); return true;
    }
    if ((el = q('[data-fb-clear]'))) { const id = el.dataset.fbClear, st = (F(DB.get()).suspects || {})[id]; DB.update({ ['fbi/suspects/' + id]: st === 'cleared' ? 'poi' : 'cleared' }); return true; }
    if ((el = q('[data-fb-unpoi]'))) { DB.update({ ['fbi/suspects/' + el.dataset.fbUnpoi]: null }); return true; }
    if ((el = q('[data-fb-freeze]'))) {
      const id = el.dataset.fbFreeze, s = DB.fresh(), c = G.byId(id), acct = NW.walletOf(c);
      if (!isLead(me) || !(F(s).warrants || {})[id] || !acct) return true;
      const fz = NW.frozen(s, acct), u = {};
      if (fz && fz.by !== 'fbi') return true;
      if (!fz && !Ask.sure(`Freeze ${c.name}'s NightBank account (${NW.wname(acct)})? They won't be able to move money until you unfreeze it.`, () => onClick(e, ctx))) return true;
      if (fz) NW.unfreeze(u, acct, me.id); else NW.freeze(u, acct, 'fbi', me.id);
      DB.update(u); return true;
    }
    if ((el = q('[data-fb-detain]'))) {
      if (!isLead(me)) return true;
      const id = el.dataset.fbDetain, on = !(F(DB.get()).detained || {})[id], c = G.byId(id), u = {};
      if (on && !Ask.sure(`Detain ${c.name}?`, () => onClick(e, ctx))) return true;
      u['fbi/detained/' + id] = on ? { by: me.id, at: Date.now() } : null;
      alert(u, id, on ? 'Detained' : 'Released', on ? 'You have been detained by the FBI. Stay with the agents until you are released.' : 'The FBI has released you.');
      Clock.log(u, 'fbi', `${me.name} ${on ? 'detained' : 'released'} ${c.name}.`); DB.update(u); return true;
    }
    return false;
  }
  function onInput(e, ctx) {
    const el = e.target, ui = ctx.ui;
    if (el.matches('[data-fb="q"]')) { ui.q = el.value; ui.err = ''; return true; }
    if (el.matches('[data-fb="stext"]')) { ui.stmt.text = el.value; return true; }
    if (el.matches('[data-fb="etext"]')) { ui.editText = el.value; return true; }
    if (el.matches('[data-fb="note"]')) { ui.note = el.value; return true; }
    return false;
  }
  function onChange(e, ctx) {
    const el = e.target, ui = ctx.ui;
    if (el.matches('[data-fb="subject"]')) { ui.stmt.subject = el.value; return true; }
    if (el.matches('[data-fb="sworn"]')) { ui.stmt.sworn = el.checked; return true; }
    return false;
  }
  function onSubmit(e, ctx) {
    const f = e.target.closest('[data-fb-form]'); if (!f) return false;
    e.preventDefault();
    const { me, ui } = ctx, kind = f.dataset.fbForm, fail = m => { ui.err = m; ctx.redraw(true); return true; };
    const blur = () => { if (document.activeElement) document.activeElement.blur(); };
    if (kind === 'q') {
      const q = ui.q.trim(); ui.view = null; ui.matches = null;
      if (norm(q).length < 3) return fail('Type at least three letters.');
      const hits = search(q), real = hits.filter(r => !r.noMatch);
      if (real.length) { ui.matches = real.map(r => r.id); ui.err = ''; blur(); ctx.redraw(true); return true; }
      const s = DB.fresh();
      if (!leftN(s)) return fail('The team is out of lookups.');
      if (!Ask.sure(`Run a full records search for "${q}"? It uses 1 of the team's ${leftN(s)} remaining lookups.`, () => onSubmit(e, ctx))) return true;
      const u = { ['fbi/lookups/' + uid('q')]: { by: me.id, q, rec: null, at: Date.now() } };
      Clock.log(u, 'fbi', `${me.name} ran a lookup: "${q}" (no match).`); DB.update(u);
      ui.view = '__none'; anim(ui, '__none'); ui.err = ''; blur(); ctx.redraw(true); return true;
    }
    if (kind === 'stmt') {
      const x = ui.stmt, text = x.text.trim();
      if (!x.subject) return fail('Choose who gave the statement.');
      if (!text) return fail('Write down what they said.');
      const u = { ['fbi/statements/' + uid('s')]: { subject: x.subject, text, sworn: x.sworn || null, by: me.id, at: Date.now() } };
      Clock.log(u, 'fbi', `${me.name} logged a ${x.sworn ? 'sworn ' : ''}statement from ${G.byId(x.subject).name}.`); DB.update(u);
      ui.stmt = { subject: '', text: '', sworn: false }; ui.err = ''; blur(); ctx.redraw(true); return true;
    }
    if (kind === 'edit') {
      const id = f.dataset.id, s = DB.fresh(), x = F(s).statements[id], text = ui.editText.trim();
      if (!text) return fail('A statement can\'t be empty. Withdraw it instead.');
      const u = { ['fbi/statements/' + id + '/text']: text, ['fbi/statements/' + id + '/edits']: (x.edits || []).concat([{ at: Date.now(), text: x.text }]) };
      Clock.log(u, 'fbi', `${me.name} edited a statement from ${G.byId(x.subject).name}.`); DB.update(u);
      ui.edit = null; blur(); ctx.redraw(true); return true;
    }
    if (kind === 'note') {
      const text = ui.note.trim(); if (!text) return true;
      DB.update({ ['fbi/notes/' + uid('n')]: { by: me.id, text, at: Date.now() } }); ui.note = ''; blur(); ctx.redraw(true); return true;
    }
    if (kind === 'poi') {
      const id = f.querySelector('[data-fb="poi"]').value; if (!id) return true;
      const u = { ['fbi/suspects/' + id]: 'poi' }; Clock.log(u, 'fbi', `${me.name} added ${G.byId(id).name} to the case board.`); DB.update(u); return true;
    }
    if (kind === 'warrant') {
      if (!isLead(me)) return true;
      const id = f.querySelector('[data-fb="warrant"]').value, s = DB.fresh(); if (!id) return true;
      if (Object.keys(F(s).warrants || {}).length >= (C().warrants || 0)) return fail('No warrants left.');
      const c = G.byId(id); if (!Ask.sure(`Issue a warrant for ${c.name}? You can't take it back.`, () => onSubmit(e, ctx))) return true;
      const u = { ['fbi/warrants/' + id]: { by: me.id, at: Date.now() } };
      alert(u, id, 'FBI warrant', 'Agents have a warrant to search you. Show them what you are carrying.');
      Clock.log(u, 'fbi', `${me.name} issued a warrant for ${c.name}.`);
      /* sections that open now: mark their evidence if the team has already opened the record */
      const s2 = JSON.parse(JSON.stringify(s)); setPath(s2, 'fbi/warrants/' + id, { by: me.id, at: Date.now() });
      records().filter(r => r.who === id && opened(s, r.id)).forEach(r => markClues(u, s2, me, r));
      DB.update(u); ui.err = ''; ctx.redraw(true); return true;
    }
    return true;
  }

  /** Statements the lead released to the room (everyone sees these). */
  const released = s => Object.values(F(s).statements || {}).filter(x => x.public && !x.withdrawn).sort((a, b) => b.public - a.public);

  return { newUI, render, onClick, onInput, onChange, onSubmit, records, rec, lookups, total, usedN, leftN, released, first };
})();
