/* =====================================================================
   THE VANISHING HOUR — original artwork, drawn in code (nothing borrowed).
     Art.painting()        June Ellery's "Mother and Child" (2001), to print and frame (clue 13)
     Art.photo()           the December 2000 snapshot: Victor and J. E— at the Harbor gallery (clue 3)
     Art.harbor(copy)      "Harbor at Dusk", a small landscape from the Ashgrove Collection.
                           copy = true draws Indigo Hart's copy, with seven differences (Art.DIFFS)
     Art.uri(svg)          an SVG string as a data: URL (for <img> and CSS backgrounds)
   ===================================================================== */
const Art = (() => {
  /* a seeded random, so the same picture comes out every time */
  const rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  /* quotes and brackets encoded too, so the URL is safe inside url('…') in CSS */
  const uri = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');

  /* short brush strokes over a region, in a palette */
  function strokes(r, n, box, cols, len, w, op) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = box[0] + r() * box[2], y = box[1] + r() * box[3], a = (r() - .5) * 1.4 + (box[4] || 0), l = len * (.5 + r());
      s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(a) * l).toFixed(1)} ${(Math.sin(a) * l).toFixed(1)}" stroke="${cols[Math.floor(r() * cols.length)]}" stroke-width="${(w * (.6 + r() * .8)).toFixed(1)}" opacity="${(op * (.5 + r() * .5)).toFixed(2)}"/>`;
    }
    return `<g fill="none" stroke-linecap="round">${s}</g>`;
  }

  /* ---------- June Ellery, "Mother and Child", 2001 ----------
     Painted in the manner of the Dutch masters: a dark room, light from a window on the left,
     a young mother in a white headscarf and an ultramarine mantle, in profile, bowed over the
     swaddled baby in her arms. Soft modelling, raised brushwork, canvas weave, fine cracks and
     an old varnish. Portrait, 600 x 780. */
  function painting() {
    const r = rng(2001);
    /* fine cracks in the paint */
    let cracks = '';
    for (let i = 0; i < 120; i++) { let x = r() * 600, y = r() * 780, d = `M${x.toFixed(1)} ${y.toFixed(1)}`; for (let k = 0; k < 4; k++) { x += (r() - .5) * 26; y += (r() - .5) * 26; d += `L${x.toFixed(1)} ${y.toFixed(1)}`; } cracks += `<path d="${d}"/>`; }
    const soft = (b, inner) => `<g filter="url(#b${b})">${inner}</g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 780" width="600" height="780">
  <defs>
    <filter id="b1" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.2"/></filter>
    <filter id="b3" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="b8" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
    <filter id="b20" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20"/></filter>
    <!-- the oil: painterly edges, then raised brushwork lit from the window side -->
    <filter id="oil" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".022 .045" numOctaves="3" seed="11" result="w"/>
      <feDisplacementMap in="SourceGraphic" in2="w" scale="7" xChannelSelector="R" yChannelSelector="G" result="p"/>
      <feTurbulence type="fractalNoise" baseFrequency=".16 .26" numOctaves="3" seed="4" result="t"/>
      <feDiffuseLighting in="t" surfaceScale="1.05" lighting-color="#fff6e4" result="l"><feDistantLight azimuth="225" elevation="52"/></feDiffuseLighting>
      <feBlend in="p" in2="l" mode="multiply"/>
    </filter>
    <pattern id="weave" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 1h4M1 0v4" stroke="#000" stroke-opacity=".07" stroke-width=".8"/></pattern>
    <radialGradient id="room" cx=".18" cy=".2" r="1"><stop offset="0" stop-color="#b48a52"/><stop offset=".28" stop-color="#6b4a2a"/><stop offset=".62" stop-color="#2c1d11"/><stop offset="1" stop-color="#120b06"/></radialGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf3dc"/><stop offset=".55" stop-color="#d8d0b4"/><stop offset="1" stop-color="#8e8a72"/></linearGradient>
    <linearGradient id="shaft" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2cf" stop-opacity=".42"/><stop offset="1" stop-color="#fff2cf" stop-opacity="0"/></linearGradient>
    <linearGradient id="face" x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stop-color="#f7e1c4"/><stop offset=".45" stop-color="#e3bc94"/><stop offset="1" stop-color="#8e6142"/></linearGradient>
    <linearGradient id="linen" x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stop-color="#fbf5e6"/><stop offset=".5" stop-color="#e2d6bc"/><stop offset="1" stop-color="#7f725c"/></linearGradient>
    <linearGradient id="mantle" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="#4f71ad"/><stop offset=".4" stop-color="#2a4682"/><stop offset=".8" stop-color="#16264a"/><stop offset="1" stop-color="#0d1630"/></linearGradient>
    <linearGradient id="bodice" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9a64e"/><stop offset=".6" stop-color="#9a6a26"/><stop offset="1" stop-color="#4f3412"/></linearGradient>
    <radialGradient id="babyface" cx=".35" cy=".4" r=".7"><stop offset="0" stop-color="#fbe6cf"/><stop offset=".7" stop-color="#e8c3a0"/><stop offset="1" stop-color="#b98a66"/></radialGradient>
    <radialGradient id="vig" cx=".42" cy=".45" r=".72"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></radialGradient>
  </defs>
  <g filter="url(#oil)">
    <rect width="600" height="780" fill="url(#room)"/>
    <!-- the window, high on the left, and the light it lets in -->
    ${soft(3, `<rect x="34" y="70" width="150" height="250" fill="url(#glass)"/><path d="M109 70v250M34 158h150M34 240h150" stroke="#4a3520" stroke-width="6"/><rect x="28" y="64" width="162" height="262" fill="none" stroke="#2a1b10" stroke-width="10"/>`)}
    ${soft(20, `<path d="M70 300 L520 560 L470 780 L110 780 Z" fill="url(#shaft)"/>`)}
    ${soft(20, `<ellipse cx="250" cy="420" rx="230" ry="260" fill="#c79a5c" opacity=".22"/>`)}
    <!-- a dark table edge, lower left, with a cloth -->
    ${soft(3, `<path d="M0 640 L210 610 L240 780 L0 780 Z" fill="#2a1a10"/><path d="M0 652 C60 640 140 632 214 624 L224 680 C150 690 70 700 0 712 Z" fill="#7a2e22" opacity=".85"/>`)}
    <g transform="translate(-92 -78) scale(1.24)">
    <!-- the mantle: deep ultramarine, falling from her shoulders over her lap -->
    ${soft(3, `<path d="M330 360 C400 360 470 400 500 470 C540 560 560 680 570 780 L170 780 C190 700 230 640 270 600 C300 560 300 460 330 360 Z" fill="url(#mantle)"/>`)}
    ${soft(8, `<path d="M372 420 C420 470 440 560 450 700" stroke="#6d8fcb" stroke-width="16" fill="none" opacity=".55"/><path d="M430 450 C470 520 492 620 500 760" stroke="#0b1226" stroke-width="22" fill="none" opacity=".6"/><path d="M300 620 C340 650 380 700 400 780" stroke="#5a7cbb" stroke-width="12" fill="none" opacity=".45"/>`)}
    <!-- an ochre bodice glimpsed at her chest -->
    ${soft(3, `<path d="M326 400 C352 392 386 398 404 424 C398 452 388 474 370 488 C350 490 330 480 318 462 Z" fill="url(#bodice)" opacity=".8"/>`)}
    <!-- the white headscarf, over her head and down her back -->
    ${soft(3, `<path d="M300 246 C318 206 380 196 420 226 C452 250 462 300 452 352 C446 392 430 430 404 452 C420 400 422 350 404 312 C392 290 370 280 352 282 C330 284 314 268 300 246 Z" fill="url(#linen)"/>`)}
    ${soft(8, `<path d="M392 236 C430 262 444 320 430 392" stroke="#8b7e66" stroke-width="10" fill="none" opacity=".5"/>`)}
    <!-- her face in profile, bowed toward the child, lit from the window -->
    ${soft(1, `<path d="M306 252 C300 262 296 272 294 284 C292 292 286 300 282 310 C278 318 276 324 280 328 C284 330 288 330 288 334 C286 338 288 342 292 344 C290 348 292 352 296 356 C300 364 306 370 316 372 C326 374 338 370 346 362 C352 340 356 316 352 296 C346 280 330 264 306 252 Z" fill="url(#face)"/>`)}
    ${soft(3, `<path d="M300 300 q8 4 16 2" stroke="#6b3f2a" stroke-width="2.4" fill="none"/><ellipse cx="318" cy="322" rx="14" ry="9" fill="#d68a72" opacity=".28"/><path d="M292 344 q5 2 9 0" stroke="#8a4a3a" stroke-width="2" fill="none" opacity=".8"/>`)}
    ${soft(8, `<path d="M330 372 C344 392 352 410 350 430" stroke="#5a3a26" stroke-width="16" fill="none" opacity=".45"/>`)}
    <!-- the neck and a sliver of hair under the scarf -->
    ${soft(1, `<path d="M320 366 C330 384 336 404 334 424 L366 424 C362 400 354 380 348 362 Z" fill="#c99a72"/><path d="M304 254 C318 246 336 250 344 262 C330 260 316 262 306 268 Z" fill="#3a2214"/>`)}
    <!-- the child, swaddled in linen, cradled in her arms -->
    ${soft(3, `<path d="M170 548 C176 500 236 470 300 478 C360 486 400 520 402 560 C404 600 360 624 300 624 C232 626 166 600 170 548 Z" fill="url(#linen)"/>`)}
    ${soft(8, `<path d="M196 590 C250 604 330 604 384 580" stroke="#7f725c" stroke-width="12" fill="none" opacity=".5"/><path d="M230 500 C270 520 330 528 380 520" stroke="#fffaf0" stroke-width="10" fill="none" opacity=".6"/>`)}
    ${soft(1, `<ellipse cx="240" cy="512" rx="34" ry="30" fill="url(#babyface)"/>`)}
    ${soft(3, `<path d="M226 508 q6 2 11 0M248 506 q6 2 11 0" stroke="#8a5a40" stroke-width="2" fill="none" opacity=".75"/><path d="M236 528 q5 2 9 0" stroke="#a5604a" stroke-width="2" fill="none" opacity=".7"/><ellipse cx="226" cy="520" rx="8" ry="5" fill="#e09a84" opacity=".3"/>`)}
    ${soft(3, `<path d="M206 494 C220 474 262 470 280 488 C264 482 236 482 216 498 Z" fill="#f4ecdc"/>`)}
    <!-- her hands: one under him, one resting on the linen -->
    ${soft(1, `<path d="M346 540 C366 528 396 532 404 548 C398 562 372 566 350 560 Z" fill="url(#face)"/><path d="M180 590 C196 582 220 586 230 600 C218 610 194 610 180 604 Z" fill="#c99a72"/>`)}
    <!-- the highlights: where the window light lands -->
    ${soft(3, `<path d="M290 296 C286 306 282 314 282 322" stroke="#fff3df" stroke-width="3" fill="none" opacity=".7"/><path d="M196 530 C210 512 240 500 262 498" stroke="#fffaf0" stroke-width="5" fill="none" opacity=".55"/><path d="M308 236 C330 214 370 208 400 222" stroke="#fffaf2" stroke-width="5" fill="none" opacity=".5"/>`)}
    </g>
    ${strokes(r, 140, [0, 0, 600, 360, -.6], ['#6b4a2a', '#4a3220', '#8a6238'], 26, 7, .14)}
    ${strokes(r, 90, [180, 620, 380, 160, 1.3], ['#2a4682', '#16264a', '#4f71ad'], 30, 7, .22)}
  </g>
  <rect width="600" height="780" fill="url(#weave)"/>
  <g fill="none" stroke="#1a0f06" stroke-opacity=".16" stroke-width=".6">${cracks}</g>
  <rect width="600" height="780" fill="#8a5a1c" opacity=".14" style="mix-blend-mode:multiply"/>
  <rect width="600" height="780" fill="url(#vig)"/>
  <text x="30" y="756" font-family="'Homemade Apple','Caveat',cursive" font-size="17" fill="#d9b88a" opacity=".55" transform="rotate(-2 30 756)">J. Ellery 2001</text>
</svg>`;
  }
  function paintingOld() {
    const r = rng(2001);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 780" width="600" height="780">
  <defs>
    <filter id="pt" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".018 .03" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="cv"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .42  0 0 0 0 .3  0 0 0 .22 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <radialGradient id="wl" cx=".22" cy=".26" r=".9"><stop offset="0" stop-color="#f3dfb2"/><stop offset=".35" stop-color="#d9a965"/><stop offset=".75" stop-color="#8a5a32"/><stop offset="1" stop-color="#4a2e1c"/></radialGradient>
    <linearGradient id="win" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf6e6"/><stop offset=".6" stop-color="#dfe4d6"/><stop offset="1" stop-color="#b9c4b8"/></linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4d6" stop-opacity=".55"/><stop offset="1" stop-color="#fff4d6" stop-opacity="0"/></linearGradient>
    <radialGradient id="shawl" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#5b7fb8"/><stop offset=".45" stop-color="#2e4f86"/><stop offset="1" stop-color="#162847"/></radialGradient>
    <radialGradient id="skin" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#f6dcc0"/><stop offset=".6" stop-color="#e2b48e"/><stop offset="1" stop-color="#b98762"/></radialGradient>
    <radialGradient id="blank" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fffaf0"/><stop offset=".6" stop-color="#efe2c6"/><stop offset="1" stop-color="#cdb88f"/></radialGradient>
  </defs>
  <rect width="600" height="780" fill="url(#wl)"/>
  <g filter="url(#pt)">
    <!-- the window and its light -->
    <rect x="46" y="70" width="190" height="270" fill="url(#win)"/>
    <path d="M141 70v270M46 205h190" stroke="#7b5a3c" stroke-width="7"/>
    <rect x="38" y="62" width="206" height="286" fill="none" stroke="#5a3a24" stroke-width="12"/>
    <path d="M60 340 L600 640 L600 780 L230 780 Z" fill="url(#beam)"/>
    <!-- a chair back, deep red -->
    <path d="M430 300 Q520 290 540 360 L560 780 L470 780 Z" fill="#6e2424"/>
    <path d="M445 320 Q505 312 522 360 L536 700" stroke="#9a3a32" stroke-width="10" fill="none"/>
    <!-- the mother: shawl, shoulders, bent head -->
    <path d="M150 780 C150 600 190 470 270 420 C320 390 390 392 440 430 C500 480 520 600 520 780 Z" fill="url(#shawl)"/>
    <path d="M232 470 C250 430 300 410 340 418" stroke="#7f9fd2" stroke-width="14" fill="none" opacity=".7"/>
    <path d="M300 230 C352 214 402 246 410 300 C418 352 392 400 350 410 C312 418 280 392 272 350 C264 300 268 244 300 230 Z" fill="url(#skin)"/>
    <path d="M286 232 C312 196 380 198 412 240 C428 262 430 300 420 330 C414 290 398 262 368 252 C338 244 308 258 292 290 C282 268 280 248 286 232 Z" fill="#3a2214"/>
    <path d="M404 262 C440 280 446 330 420 372 C430 330 424 300 404 282 Z" fill="#2b190f"/>
    <ellipse cx="362" cy="332" rx="22" ry="14" fill="#d98a72" opacity=".35"/>
    <path d="M296 304 q11 6 22 1M336 306 q10 5 20 0" stroke="#5a3424" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <path d="M298 292 q12 -6 24 -1M338 294 q10 -4 20 0" stroke="#4a2a1a" stroke-width="2.6" fill="none" opacity=".7" stroke-linecap="round"/>
    <path d="M330 308 q-6 12 -2 20 q5 3 10 0" stroke="#a8684c" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M318 346 q13 7 26 1" stroke="#9a4a3a" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M262 400 C300 440 360 448 410 420 C420 470 360 500 300 486 C270 478 254 440 262 400 Z" fill="#244273"/>
    <!-- the baby, swaddled -->
    <path d="M232 520 C252 470 330 452 392 470 C452 488 470 540 444 580 C412 628 312 636 262 606 C232 588 222 552 232 520 Z" fill="url(#blank)"/>
    <path d="M258 540 C300 520 360 518 420 540" stroke="#d9c7a0" stroke-width="8" fill="none"/>
    <circle cx="300" cy="512" r="38" fill="url(#skin)"/>
    <path d="M276 500 q8 -4 14 0M304 498 q8 -4 14 0" stroke="#8a5038" stroke-width="2.5" fill="none"/>
    <path d="M292 528 q6 4 12 0" stroke="#a5604a" stroke-width="2.5" fill="none"/>
    <path d="M262 488 C276 466 318 462 334 482" stroke="#f0e2c4" stroke-width="12" fill="none"/>
    <!-- her hands, holding him -->
    <path d="M396 560 C430 548 462 560 466 584 C452 596 420 596 396 584 Z" fill="url(#skin)"/>
    <path d="M226 560 C246 546 278 548 288 566 C276 580 246 584 228 576 Z" fill="url(#skin)"/>
  </g>
  <!-- brushwork: kept to the wall, the window, the chair and the folds of the shawl, never the faces -->
  ${strokes(r, 150, [250, 0, 350, 190, -.7], ['#f3dfb2', '#d9a965', '#b77b45', '#e9c68e'], 20, 5, .22)}
  ${strokes(r, 70, [0, 360, 150, 300, -.5], ['#d9a965', '#b77b45', '#8a5a32'], 18, 5, .2)}
  ${strokes(r, 90, [50, 75, 180, 260, .2], ['#ffffff', '#eef2e6', '#cdd8cc'], 14, 4, .28)}
  ${strokes(r, 110, [170, 640, 330, 140, 1.25], ['#5b7fb8', '#2e4f86', '#1d3561', '#7f9fd2'], 26, 6, .3)}
  ${strokes(r, 40, [440, 420, 70, 200, 1.3], ['#5b7fb8', '#2e4f86', '#7f9fd2'], 22, 5, .28)}
  ${strokes(r, 70, [455, 320, 110, 460, 1.5], ['#6e2424', '#9a3a32', '#4d1717'], 22, 6, .3)}
  ${strokes(r, 60, [0, 690, 600, 90, 0], ['#4a2e1c', '#6b4229', '#8a5a32'], 24, 7, .25)}
  <rect width="600" height="780" filter="url(#cv)" fill="#fff"/>
  <text x="34" y="756" font-family="'Homemade Apple','Caveat',cursive" font-size="21" fill="#2a140c" opacity=".85">J. Ellery 2001</text>
</svg>`;
  }

  /* ---------- the December 2000 snapshot (sepia, 400 x 300) ---------- */
  function photo() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>
    <filter id="sep"><feColorMatrix values=".42 .74 .18 0 0  .35 .66 .15 0 0  .27 .52 .12 0 0  0 0 0 1 0"/></filter>
    <filter id="gr"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .22  0 0 0 0 .12  0 0 0 .35 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <radialGradient id="flash" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
  </defs>
  <g filter="url(#sep)">
    <rect width="400" height="300" fill="#cfc6b4"/>
    <rect y="210" width="400" height="90" fill="#8c7a62"/>
    <!-- framed pictures on the gallery wall -->
    <rect x="22" y="40" width="74" height="96" fill="#5d4b36"/><rect x="29" y="47" width="60" height="82" fill="#a8b8c4"/><path d="M29 110 Q55 84 89 104 V129 H29Z" fill="#6b7f62"/>
    <rect x="300" y="34" width="84" height="64" fill="#5d4b36"/><rect x="307" y="41" width="70" height="50" fill="#d9a96a"/><circle cx="355" cy="58" r="9" fill="#f2e3b4"/>
    <rect x="312" y="118" width="58" height="74" fill="#5d4b36"/><rect x="318" y="124" width="46" height="62" fill="#7d4e55"/>
    <!-- a small card on the wall: "Student Show" -->
    <rect x="112" y="150" width="34" height="14" fill="#efe9dc"/>
    <!-- Victor: dark suit, in his thirties, smiling at the camera -->
    <path d="M150 300 C150 240 160 196 196 182 C214 176 232 176 250 182 C282 194 292 240 292 300 Z" fill="#2c2a2c"/>
    <path d="M206 182 L222 222 L238 182 Z" fill="#e8e2d6"/><path d="M219 190 L222 222 L226 190 Z" fill="#6b2a2a"/>
    <ellipse cx="222" cy="140" rx="30" ry="36" fill="#d6b394"/>
    <path d="M192 128 C194 98 252 96 254 128 C246 112 204 112 192 128 Z" fill="#3a2e26"/>
    <path d="M208 154 q14 9 28 0" stroke="#7a5442" stroke-width="2.5" fill="none"/>
    <!-- J. E—: a young woman, long dark hair, holding a glass, half turned toward him -->
    <path d="M86 300 C88 248 98 214 124 200 C140 192 158 194 170 204 C188 220 192 260 190 300 Z" fill="#7a2f3a"/>
    <path d="M110 120 C112 92 160 88 166 122 C172 160 168 200 156 214 C150 186 146 166 140 156 C132 170 120 186 104 196 C104 170 106 140 110 120 Z" fill="#2a201a"/>
    <ellipse cx="138" cy="138" rx="24" ry="30" fill="#e0bf9f"/>
    <path d="M128 152 q9 6 18 0" stroke="#8a5c48" stroke-width="2" fill="none"/>
    <path d="M168 238 l10 -26 h10 l4 26" fill="#e9e5da" opacity=".85"/><rect x="178" y="238" width="4" height="22" fill="#e9e5da"/>
    <rect width="400" height="300" fill="url(#flash)"/>
  </g>
  <rect width="400" height="300" fill="#fff" filter="url(#gr)"/>
  <text x="384" y="288" text-anchor="end" font-family="'Courier New',monospace" font-size="13" fill="#e2803a" opacity=".9">12 '00</text>
</svg>`;
  }

  /* ---------- "Harbor at Dusk": the original, and Indigo's copy with seven differences ---------- */
  /* Seven differences, as circles in the picture's own coordinates (viewBox 480 x 340) */
  const DIFFS = [
    { x: 404, y: 68, r: 24, what: 'The sun sits a little lower and smaller in the copy.' },
    { x: 140, y: 110, r: 16, what: 'Only two gulls in the copy (the original has three).' },
    { x: 331, y: 152, r: 24, what: 'The lighthouse has two red bands in the copy, three in the original.' },
    { x: 216, y: 176, r: 16, what: 'The flag on the big boat is blue in the copy, red in the original.' },
    { x: 403, y: 240, r: 18, what: 'One line of light on the water is missing in the copy.' },
    { x: 106, y: 276, r: 18, what: 'The small boat\'s sail has no dark stripe in the copy.' },
    { x: 462, y: 330, r: 18, what: 'Under the edge of the frame: a dot of indigo blue and the initials I.H.' }
  ];
  function harbor(copy) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 340" width="480" height="340">
  <defs>
    <linearGradient id="sky${copy ? 'c' : 'o'}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3a66"/><stop offset=".55" stop-color="#c46a4a"/><stop offset="1" stop-color="#f0b46a"/></linearGradient>
    <linearGradient id="sea${copy ? 'c' : 'o'}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d98c5a"/><stop offset=".3" stop-color="#4a5f7e"/><stop offset="1" stop-color="#1c2840"/></linearGradient>
  </defs>
  <rect width="480" height="200" fill="url(#sky${copy ? 'c' : 'o'})"/>
  ${copy ? '<circle cx="404" cy="70" r="18" fill="#ffe2a8"/>' : '<circle cx="404" cy="64" r="21" fill="#ffe2a8"/>'}
  <path d="M40 60 q40 -16 80 0 q30 -10 56 4" stroke="#f5c9a0" stroke-width="7" fill="none" opacity=".6" stroke-linecap="round"/>
  <path d="M250 40 q36 -12 70 2" stroke="#f5c9a0" stroke-width="6" fill="none" opacity=".5" stroke-linecap="round"/>
  <g stroke="#1d1d2b" stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M84 120 q8 -7 14 0 q6 -7 14 0"/><path d="M110 138 q7 -6 12 0 q6 -6 12 0"/>${copy ? '' : '<path d="M128 112 q6 -5 10 0 q5 -5 10 0"/>'}</g>
  <path d="M0 200 Q60 168 140 186 Q220 160 300 182 L300 200 Z" fill="#3a3348"/>
  <rect y="196" width="480" height="144" fill="url(#sea${copy ? 'c' : 'o'})"/>
  <g stroke="#f3c98e" stroke-width="2" opacity=".5" stroke-linecap="round"><path d="M360 214h60M372 226h44${copy ? '' : 'M388 240h30'}M352 252h50"/></g>
  <!-- the lighthouse -->
  <path d="M318 196 L324 112 L338 112 L344 196 Z" fill="#efe6d6"/>
  <rect x="320" y="104" width="22" height="10" fill="#2a2a36"/><rect x="324" y="96" width="14" height="9" fill="#ffd98a"/>
  <g fill="#b33a36">${copy ? '<rect x="322" y="134" width="20" height="9"/><rect x="320" y="168" width="24" height="9"/>' : '<rect x="322" y="128" width="20" height="8"/><rect x="321" y="150" width="22" height="8"/><rect x="320" y="172" width="24" height="8"/>'}</g>
  <!-- boats -->
  <path d="M150 262 h120 l-16 20 h-88 z" fill="#2a1e18"/><path d="M206 262 V170 L262 252 Z" fill="#efe1c4"/><path d="M204 262 V176 L160 250 Z" fill="#d8c8a8"/>
  <path d="M206 170 l20 6 l-20 6 z" fill="${copy ? '#3a6fb0' : '#c43b2e'}"/>
  <path d="M60 300 h70 l-10 12 h-50 z" fill="#2a1e18"/><path d="M94 300 V246 L124 296 Z" fill="#e9dcbf"/>${copy ? '' : '<path d="M94 270 L109 271 L112 278 L94 277 Z" fill="#5a4a3e" opacity=".85"/>'}
  <!-- signature, and (on the copy only) the hidden mark under the frame's edge -->
  <text x="20" y="328" font-family="'Homemade Apple','Caveat',cursive" font-size="13" fill="#e9d2a6" opacity=".8">H. Valcourt</text>
  ${copy ? '<circle cx="468" cy="336" r="2.6" fill="#3d3fb8" opacity=".8"/><text x="462" y="338" text-anchor="end" font-family="Georgia,serif" font-size="5.5" fill="#aeb0d8" opacity=".45">I.H.</text>' : ''}
</svg>`;
  }

  return { painting, photo, harbor, DIFFS, uri, rng };
})();
