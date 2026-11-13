/* =====================================================================
   THE VANISHING HOUR — the dossier reader ("My file").
   Each player's dossier is plain text in settings/dossiers.js
   (STORY.dossiers.<character id>), copied from the planning doc with the
   host-only parts left out. This turns it into a confidential file: a
   stamped cover, a row of jump links, and one card per section.
   Understands: ## and ### headings, paragraphs, **bold**, *italic*,
   - and 1. lists (indented sub-points), > quotes and | tables.
   ===================================================================== */
const Dossier = (() => {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<i>$2</i>');
  const slug = (t, i) => 'ds-' + i + '-' + t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /** markdown lines → HTML (one section's body) */
  function blocks(lines) {
    let out = '', i = 0;
    const isList = l => /^\s*([-*]|\d+\.)\s+/.test(l);
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) { i++; continue; }
      let m;
      if ((m = l.match(/^###\s+(.*)/))) { out += `<h4>${inline(m[1])}</h4>`; i++; continue; }
      if (/^>\s?/.test(l)) {
        const q = []; while (i < lines.length && /^>/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
        out += `<blockquote>${q.join('\n').split(/\n\s*\n/).map(p => `<p>${inline(p.replace(/\n/g, ' '))}</p>`).join('')}</blockquote>`; continue;
      }
      if (/^\|/.test(l)) {
        const rows = []; while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
        const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const body = rows.filter(r => !/^\|\s*:?-{2,}/.test(r)).map(cells);
        const head = body.shift() || [];
        out += `<div class="ds-tbl"><table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map((c, k) => `<td${k === 0 ? ' class="ds-who"' : ''}>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
        continue;
      }
      if (isList(l)) {
        /* nested lists by indent */
        const items = []; while (i < lines.length && (isList(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) { items.push(lines[i]); i++; }
        out += list(items, 0); continue;
      }
      const p = []; while (i < lines.length && lines[i].trim() && !/^(#|>|\||\s*([-*]|\d+\.)\s)/.test(lines[i])) { p.push(lines[i].trim()); i++; }
      out += `<p>${inline(p.join(' '))}</p>`;
    }
    return out;
  }
  function list(items, depth) {
    const ind = l => l.match(/^\s*/)[0].length;
    const base = Math.min(...items.map(ind)), ordered = /^\s*\d+\./.test(items[0]);
    let html = '', k = 0;
    while (k < items.length) {
      const text = items[k].replace(/^\s*([-*]|\d+\.)\s+/, ''); k++;
      const kids = []; while (k < items.length && ind(items[k]) > base) { kids.push(items[k]); k++; }
      html += `<li>${inline(text)}${kids.length ? list(kids, depth + 1) : ''}</li>`;
    }
    return ordered ? `<ol>${html}</ol>` : `<ul>${html}</ul>`;
  }

  /* a few sections get a mark of their own */
  const KIND = t => /secret/i.test(t) ? 'secret' : /goal/i.test(t) ? 'goal' : /last scene|your scene|cue/i.test(t) ? 'scene' : /what you know/i.test(t) ? 'know' : '';
  const STAMP = { fbi: 'FBI · EYES ONLY', nightwire: 'BURN AFTER READING', bebbit: 'PRIVATE & CONFIDENTIAL' };

  function render(md, me, world) {
    const lines = String(md || '').replace(/\r/g, '').split('\n');
    const secs = []; let cur = { title: null, lines: [] };
    lines.forEach(l => { const m = l.match(/^##\s+(.*)/); if (m) { secs.push(cur); cur = { title: m[1].trim(), lines: [] }; } else if (!/^#\s/.test(l)) cur.lines.push(l); });
    secs.push(cur);
    const intro = secs.shift();
    const parts = secs.filter(x => x.title);
    const nav = parts.map((x, i) => `<button type="button" class="ds-jump ${KIND(x.title)}" data-ds-jump="${slug(x.title, i)}">${esc(x.title.replace(/\s*\(.*?\)\s*$/, ''))}</button>`).join('');
    return `<article class="ds ds-${world}">
      <header class="ds-cover"><div class="ds-stamp" aria-hidden="true">${STAMP[world] || STAMP.bebbit}</div>
        <small>Dossier · for ${esc(me.name)} only</small><h2>${esc(me.name)}</h2><p>${esc(me.role)}</p>
        ${intro && intro.lines.join('').trim() ? `<div class="ds-intro">${blocks(intro.lines)}</div>` : ''}</header>
      <nav class="ds-nav" aria-label="Dossier sections">${nav}</nav>
      ${parts.map((x, i) => `<section class="ds-sec ${KIND(x.title)}" id="${slug(x.title, i)}"><h3>${inline(x.title)}</h3>${blocks(x.lines)}</section>`).join('')}
      <footer class="ds-foot">Never show this file to anyone. Tell people what you choose, in your own words.</footer></article>`;
  }
  /** jump links scroll to their section (called from the app's click handler) */
  function onClick(e) {
    const b = e.target.closest('[data-ds-jump]'); if (!b) return false;
    const el = document.getElementById(b.dataset.dsJump); if (!el) return true;
    const head = (document.querySelector('#head') || {}).offsetHeight || 0;
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - head - 12, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    return true;
  }
  return { render, onClick };
})();
