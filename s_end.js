'use strict';
// ======================================================================== S12 finale · S13 彩蛋 AIDD401

// ---- S12: beat-cut montage of everything so far → title card
const MONT = [[2, 7], [2, 19.5], [3, 8], [3, 14], [4, 9], [5, 7.5], [5, 14], [6, 5],
  [6, 10.5], [7, 3.5], [8, 6], [8, 10], [9, 5.5], [9, 10], [10, 8.5], [11, 11]];
const MWORDS = ['从分子', '到函数', '从函数', '到新药'];
const MONT_END = 16 * BEAT;
scene({ start: 75, len: 7, fi: .01, fo: .6, mb: 2,
  subs: [[11, 14.5, '从函数的视角，重新理解药物设计。', 'Rethinking drug design through the lens of functions.'],
    [14.6, 18.3, 'AIDD101 · 201 · 301，我们课上见。', 'AIDD 101 · 201 · 301 — see you in class.']],
  sfx: [...MONT.map((_, i) => [i * BEAT, i % 4 ? 'tick' : 'hit', i % 4 ? {} : { k: .45 }]), ...MWORDS.map((_, i) => [i * BAR + .05, 'stamp']),
    [8.4, 'swell', { dur: 2.2 }], [10.35, 'suck'], [10.667, 'boom'], [10.667, 'shimmer'], [10.9, 'sparkle', { dur: 2.6 }],
    [13.2, 'chime', { midi: 86 }], [14.7, 'ding', { midi: 93 }], [16, 'glass']],
  cam: (lt, d) => ({ z: lt < MONT_END ? 1 : 1 + .04 * (lt - MONT_END) / (d - MONT_END) }),
  shot: lt => lt < MONT_END ? Math.floor(lt / BEAT) : 99,
  draw(lt) {
    if (lt < MONT_END) {
      const bi = Math.floor(lt / BEAT), f = lt / BEAT - bi, [si, t0] = MONT[bi], s = SC[si];
      ctx.save(); const z = 1.08 - .08 * eout(clamp(f * 1.3)); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = .5; s.draw(t0 + f * BEAT, s.d); ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(255,255,255,${.05 * (1 - clamp(f * 5))})`; ctx.fillRect(0, 0, W, H);
      const wi = Math.floor(lt / BAR), wt = wi * BAR, wa = 1 - sstep(BAR - .25, BAR, lt - wt);
      titleWord(MWORDS[wi], W / 2, H / 2 - 10, 170, lt, wt, .07, 40, wa, .35);
      text(['FROM MOLECULES', 'TO FUNCTIONS', 'FROM FUNCTIONS', 'TO NEW MEDICINES'][wi], W / 2, H / 2 + 115, { font: F_EN, size: 22, ls: 14, color: SILVER, alpha: wa * sstep(wt + .2, wt + .6, lt) });
      return;
    }
    const k = lt - MONT_END, m = MOL.osimertinib;
    starfield(lt, sstep(0, 2, k) * .7, 4);
    add(() => glowDot(W / 2, 470, 760, [110, 140, 190], .1 * sstep(0, 1.5, k)));
    drawMol3D(m.p3, m, { yaw: .4 + k * .18, pitch: .35, cx: W / 2, cy: 480, F: 1500, D: 30 }, { a: .2 * sstep(0, 2, k), r: .34 });
    flare(W / 2, 430, Math.exp(-k * 1.6) * .9, 1100);
    titleWord('AI 药物设计', W / 2, 430, 150, lt, MONT_END + .05, .08, 26, 1, .4);
    text('AI-DRIVEN  DRUG  DESIGN', W / 2, 560, { font: F_EN, size: 30, ls: 18, color: SILVER, alpha: sstep(.9, 1.8, k) });
    const lw = 520 * eout(clamp((k - 1.2) / 1.2)); ctx.fillStyle = rgba(RGB.S, .45); ctx.fillRect(W / 2 - lw / 2, 612, lw, 1);
    ctx.fillStyle = ACC; ctx.fillRect(W / 2 - 22 * eout(clamp((k - 1.6) / .8)), 611, 44 * eout(clamp((k - 1.6) / .8)), 3);
    ['AIDD 101', 'AIDD 201', 'AIDD 301'].forEach((s, i) => {
      const a = sstep(2.2 + i * .3, 2.8 + i * .3, k);
      text(s, W / 2 + (i - 1) * 260, 672 + 14 * (1 - eout(a)), { font: F_EN, size: 34, ls: 6, color: WHITE, alpha: a });
      if (i) text('·', W / 2 + (i - 1.5) * 260, 672, { font: F_EN, size: 34, color: GRAY, alpha: a });
    });
    text('小闪电  ·  XIAO SHANDIAN', W / 2, 752, { font: F_SANS, size: 22, ls: 6, color: GRAY, alpha: sstep(3.6, 4.4, k) });
  } });

// ---- S13 helpers: three little mathematical worlds, reusable at any size
const LA_A = [[1.5, .5], [.5, 1]], LA_EIG = [[1.809, [.851, .526]], [.691, [-.526, .851]]];
function drawLinAlg(cx, cy, s, e, a, ea, clip, N = 9) {
  if (a <= 0) return;
  const M = [[1 + e * (LA_A[0][0] - 1), e * LA_A[0][1]], [e * LA_A[1][0], 1 + e * (LA_A[1][1] - 1)]];
  const T = (x, y) => [cx + s * (M[0][0] * x + M[0][1] * y), cy - s * (M[1][0] * x + M[1][1] * y)];
  ctx.save(); ctx.beginPath(); ctx.rect(...clip); ctx.clip(); ctx.lineCap = 'round';
  for (let i = -N; i <= N; i++) {                                  // reference grid, then the transformed one
    line(cx + i * s, cy - N * s, cx + i * s, cy + N * s, RGB.G, a * .16, 1); line(cx - N * s, cy + i * s, cx + N * s, cy + i * s, RGB.G, a * .16, 1);
    const w = i ? 1.1 : 1.8, c = i ? .3 : .6;
    let p = T(i, -N), q = T(i, N); line(p[0], p[1], q[0], q[1], RGB.S, a * c, w);
    p = T(-N, i); q = T(N, i); line(p[0], p[1], q[0], q[1], RGB.S, a * c, w);
  }
  const circ = []; for (let j = 0; j <= 96; j++) { const u = j / 96 * TAU; circ.push(T(Math.cos(u), Math.sin(u))); }
  poly(circ, RGB.W, a * .8, 2);
  if (ea > 0) LA_EIG.forEach(([lam, v]) => {                     // eigen-directions only stretch
    ctx.save(); ctx.setLineDash([6, 8]); line(cx - v[0] * s * 12, cy + v[1] * s * 12, cx + v[0] * s * 12, cy - v[1] * s * 12, RGB.A, a * ea * .45, 1.4); ctx.restore();
    const L = 1 + e * (lam - 1), x1 = cx + v[0] * s * 2 * L, y1 = cy - v[1] * s * 2 * L;
    arrow(cx, cy, x1, y1, RGB.A, a * ea, 3, 14);
    add(() => glowDot(x1, y1, 26, RGB.A, .5 * a * ea));
  });
  const [ix, iy] = T(1, 0), [jx, jy] = T(0, 1);
  arrow(cx, cy, ix, iy, RGB.W, a, 2.6, 12); arrow(cx, cy, jx, jy, RGB.W, a, 2.6, 12);
  ctx.restore();
  return { ix, iy, jx, jy };
}
const PROB = (() => { const r = mulberry(401); return Array.from({ length: 420 }, (_, i) => ({ x: gauss(r), t: 2.6 * i / 420 + .04 * r() })); })();
function drawProb(cx, cy, w, h, k, a, curve) {
  if (a <= 0) return 0;
  const nb = 29, lo = -3.2, hi = 3.2, bw = w / nb, base = cy + h / 2, cnt = new Array(nb).fill(0);
  const unit = h * .78 / (PROB.length * (hi - lo) / nb * .3989), bx = x => clamp(Math.floor((x - lo) / (hi - lo) * nb), 0, nb - 1);
  let landed = 0; const falling = [];
  for (const p of PROB) {
    const u = (k - p.t) / .45; if (u < 0) continue;
    const b = bx(p.x);
    if (u >= 1) { cnt[b]++; landed++; } else falling.push([cx - w / 2 + (b + .5) * bw, lerp(cy - h / 2 - 20, base - cnt[b] * unit, u * u)]);
  }
  line(cx - w / 2, base, cx + w / 2, base, RGB.G, a * .7, 1.2);
  cnt.forEach((c, b) => { if (!c) return; ctx.fillStyle = rgba(RGB.S, a * .45); ctx.fillRect(cx - w / 2 + b * bw + 1.5, base - c * unit, bw - 3, c * unit); ctx.fillStyle = rgba(RGB.W, a * .9); ctx.fillRect(cx - w / 2 + b * bw + 1.5, base - c * unit, bw - 3, 2); });
  add(() => falling.forEach(([x, y]) => glowDot(x, y, 10, RGB.W, a * .9)));
  if (curve > 0) plotFn(x => Math.exp(-x * x / 2), cx - w / 2, base, w, h * .78 * (landed / PROB.length), lo, hi, 0, 1, RGB.A, a * curve, 2.6, curve, true, 240);
  return landed;
}
const OPT = (() => {
  const th = .45, L1 = 1, L2 = .12, eta = 1.72, c = Math.cos(th), s = Math.sin(th);
  let u = 2.3, v = -3.6; const path = [];
  for (let i = 0; i <= 30; i++) { path.push([c * u - s * v, s * u + c * v, .5 * (L1 * u * u + L2 * v * v)]); u -= eta * L1 * u; v -= eta * L2 * v; }
  return { th, L1, L2, path };
})();
function drawOpt(cx, cy, s, k, a) {
  if (a <= 0) return 0;
  const { th, L1, L2, path } = OPT, c = Math.cos(th), sn = Math.sin(th), P = p => [cx + p[0] * s, cy - p[1] * s];
  for (let j = 0; j < 9; j++) {                                   // level sets of the loss
    const lv = .03 * 1.75 ** j, ru = Math.sqrt(2 * lv / L1), rv = Math.sqrt(2 * lv / L2), pts = [];
    for (let q = 0; q <= 90; q++) { const t = q / 90 * TAU, u = ru * Math.cos(t), v = rv * Math.sin(t); pts.push(P([c * u - sn * v, sn * u + c * v])); }
    poly(pts, mixc(RGB.A, RGB.G, j / 8), a * (.75 - j * .06), 1.3, true);
  }
  add(() => glowDot(cx, cy, 34, RGB.A, .5 * a));
  const n = clamp(k * 9, 0, path.length - 1), ni = Math.floor(n), fr = n - ni, pts = path.slice(0, ni + 1).map(P);
  if (ni < path.length - 1) { const A = P(path[ni]), B = P(path[ni + 1]); pts.push([lerp(A[0], B[0], fr), lerp(A[1], B[1], fr)]); }
  ctx.save(); ctx.lineJoin = 'round'; poly(pts, RGB.W, a * .9, 2.2); ctx.restore();
  pts.forEach((p, i) => { if (i <= ni) { ctx.fillStyle = rgba(RGB.W, a); ctx.beginPath(); ctx.arc(p[0], p[1], 3.5, 0, TAU); ctx.fill(); } });
  const hd = pts[pts.length - 1]; add(() => glowDot(hd[0], hd[1], 24, RGB.W, .8 * a));
  return ni;
}
const FLOAT = (() => { const r = mulberry(88), G = '∇∑∫∂λπ∞θμσ∏≈'; return Array.from({ length: 34 }, () => ({ c: G[Math.floor(r() * G.length)], x: r() * W, y: r() * H, z: .3 + r() * .7, p: r() * TAU })); })();
function floaters(lt, a) {
  if (a <= 0) return;
  for (const f of FLOAT) {
    const y = ((f.y - lt * 14 * f.z) % H + H) % H, x = f.x + 18 * Math.sin(lt * .3 + f.p);
    text(f.c, x, y, { font: F_MATH, style: 'italic', size: 18 + 46 * f.z, color: SILVER, alpha: a * (.05 + .13 * f.z) * (.6 + .4 * Math.sin(lt + f.p)) });
  }
}
function mathPanel(lt, t0, t1, idx, zh, en) {                    // right-hand header for each math world
  const a = win(lt, t0 + .2, t1, .5, .4);
  text(`0${idx} / 03`, 1440, 230, { font: F_MONO, size: 16, ls: 4, color: ACC, alpha: a });
  text(zh, 1440, 285, { font: F_ZH, weight: 700, size: 46, ls: 8, color: WHITE, alpha: a });
  text(en, 1440, 338, { font: F_EN, size: 16, ls: 8, color: GRAY, alpha: a });
  return a;
}

// ---- S13: easter egg — AIDD401, the mathematics behind it all
const EGG = { la: 5.333, pr: 9.333, op: 13.333, fin: 17.333 };
scene({ start: 82, len: 8 + 4 / BAR, fi: .01, fo: 2.5, mb: 2,
  subs: [[1.6, 5.2, '彩蛋：在 AIDD401 中，我们将讲解 AIDD 背后的数学原理。', 'Easter egg: in AIDD401, we unpack the mathematics behind AIDD.'],
    [5.4, 9.2, '线性代数：矩阵如何变换空间。', 'Linear algebra: how matrices transform space.'],
    [9.4, 13.2, '概率论：如何描述不确定性。', 'Probability: how to describe uncertainty.'],
    [13.4, 17.2, '优化：模型如何一步步学会。', 'Optimization: how a model learns, step by step.'],
    [17.5, 21, 'AIDD401，敬请期待。', 'AIDD401 — coming soon.']],
  sfx: [[.02, 'glitch'], [.35, 'glitch'], [.8, 'zap'], [1.2, 'glitch'], [1.6, 'ring'], [1.7, 'quill', { dur: 2 }], [2.8, 'shimmer'],
    [5.2, 'whoosh', { dur: .8 }], [5.9, 'glide', { dur: 1.6 }], [7.5, 'crystal'], [8, 'ding', { midi: 81 }],
    [9.2, 'whoosh', { dur: .8 }], [9.4, 'data', { dur: 2.8 }], [11.3, 'chime', { midi: 84 }],
    [13.2, 'whoosh', { dur: .8 }], ...Array.from({ length: 8 }, (_, i) => [13.5 + i * .111 * 2.2, 'tick', { gain: .7 - i * .06 }]), [16, 'solved'],
    [16.6, 'swell', { dur: .8 }], [17.1, 'suck'], [17.333, 'boom'], [17.333, 'shimmer'], [17.6, 'sparkle', { dur: 3 }], [19.2, 'chime', { midi: 86 }], [20.5, 'ring', { dur: 4 }]],
  cam: (lt, d) => ({ z: 1 + .025 * Math.sin(PI * clamp(lt / d)) }),
  draw(lt) {
    // glitch card
    if (lt < 1.7) {
      const fl = lt < 1.1 ? (hash1(Math.floor(lt * 20) * 1.3) > .3 ? 1 : .15) : 1 - sstep(1.35, 1.65, lt);
      glitchText('彩蛋  ·  EASTER EGG', W / 2, H / 2, 72, fl * sstep(0, .05, lt), F_ZH, Math.floor(lt * 14));
      for (let i = 0; i < 5; i++) { const h = hash1(Math.floor(lt * 18) * 3.7 + i); if (h > .55) { ctx.fillStyle = `rgba(255,255,255,${.05 + .06 * h})`; ctx.fillRect(0, h * H, W, 2 + 10 * hash1(i + lt)); } }
    }
    floaters(lt, (sstep(1.8, 3, lt) * (1 - sstep(4.8, 5.3, lt)) * .8) + sstep(17.3, 18.5, lt));
    // intro
    const ia = win(lt, 1.6, 5.25, .2, .45);
    if (ia > 0) {
      titleWord('在 AIDD401 中', W / 2, 420, 100, lt, 1.65, .05, 14, ia, .3, F_ZH, 700);
      text('我们将讲解 AIDD 背后的数学原理', W / 2, 560, { font: F_ZH, weight: 700, size: 46, ls: 10, color: SILVER, alpha: ia * sstep(2.5, 3.2, lt) });
      text('THE MATHEMATICS BEHIND AIDD', W / 2, 622, { font: F_EN, size: 18, ls: 12, color: GRAY, alpha: ia * sstep(2.9, 3.6, lt) });
    }
    // 01 linear algebra
    const la = win(lt, EGG.la, EGG.pr, .5, .4);
    if (la > 0) {
      const u = lt - EGG.la, e = eio(clamp((u - .8) / 1.5)), ea = sstep(2.3, 2.8, u);
      const g = sstep(0, .7, u), cl = [120, 150, 1000, 780];
      drawLinAlg(640, 540, 64, e, la * g, ea, cl);
      ctx.save(); const gr = ctx.createRadialGradient(640, 540, 250, 640, 540, 560); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); ctx.fillStyle = gr; ctx.fillRect(...cl); ctx.restore();
      const pa = mathPanel(lt, EGG.la, EGG.pr, 1, '线性代数', 'LINEAR ALGEBRA');
      tex('matA', 1440, 460, 30, pa * sstep(.6, 1.2, u));
      tex('eig', 1440, 590, 46, pa * sstep(2.3, 2.9, u), 'center', .3);
      text(`λ₁ = ${rollNum(1.809, (u - 2.6) / .8, 3)}     λ₂ = ${rollNum(.691, (u - 2.6) / .8, 3)}`, 1440, 680, { font: F_MATH, style: 'italic', size: 28, color: rgba(RGB.A, 1), alpha: pa * sstep(2.6, 3, u) });
      text('特征向量：只被拉伸，不被旋转', 1440, 736, { font: F_SANS, size: 20, color: GRAY, alpha: pa * sstep(2.8, 3.2, u) });
    }
    // 02 probability
    const pa2 = win(lt, EGG.pr, EGG.op, .5, .4);
    if (pa2 > 0) {
      const u = lt - EGG.pr, landed = drawProb(640, 520, 860, 460, u - .3, pa2, sstep(2.4, 3.2, u));
      text(`n = ${landed}`, 240, 290, { font: F_MONO, size: 22, color: SILVER, alpha: pa2 * sstep(.4, .8, u), align: 'left' });
      text('p(x)', 1040, 290, { font: F_MATH, style: 'italic', size: 30, color: rgba(RGB.A, 1), alpha: pa2 * sstep(2.6, 3.2, u), align: 'right' });
      const pa = mathPanel(lt, EGG.pr, EGG.op, 2, '概率论', 'PROBABILITY');
      tex('bayes', 1440, 470, 28, pa * sstep(.6, 1.2, u));
      tex('gauss', 1440, 620, 28, pa * sstep(2.3, 2.9, u), 'center', .3);
      text('从样本到分布，从先验到后验', 1440, 720, { font: F_SANS, size: 20, color: GRAY, alpha: pa * sstep(2.6, 3.1, u) });
    }
    // 03 optimization
    const oa = win(lt, EGG.op, EGG.fin, .5, .3);
    if (oa > 0) {
      const u = lt - EGG.op, n = drawOpt(640, 540, 78, u - .5, oa * sstep(0, .6, u)), st = OPT.path[n];
      const pa = mathPanel(lt, EGG.op, EGG.fin, 3, '优化', 'OPTIMIZATION');
      tex('gd', 1440, 470, 40, pa * sstep(.5, 1.1, u), 'center', .3);
      text(`step ${String(n).padStart(2, '0')}`, 1300, 580, { font: F_MONO, size: 22, color: GRAY, alpha: pa * sstep(.6, 1, u), align: 'left' });
      text(`L = ${st[2].toFixed(4)}`, 1580, 580, { font: F_MONO, size: 22, color: rgba(RGB.A, 1), alpha: pa * sstep(.6, 1, u), align: 'right' });
      const lx = 1290, ly = 700, lw = 300, lh = 80, curve = OPT.path.slice(0, n + 1).map((p, i) => [lx + i / 30 * lw, ly - lh * Math.sqrt(p[2] / OPT.path[0][2])]);
      line(lx, ly, lx + lw, ly, RGB.G, pa * .6, 1); poly(curve, RGB.S, pa * sstep(.6, 1, u), 1.8);
      text('沿负梯度方向，一步步走向最低点', 1440, 760, { font: F_SANS, size: 20, color: GRAY, alpha: pa * sstep(1, 1.5, u) });
    }
    // finale: triptych + AIDD401
    if (lt > EGG.fin - .05) {
      const k = lt - EGG.fin, fa = sstep(0, .3, k);
      const PAN = [[380, '线性代数', 'LINEAR ALGEBRA'], [960, '概率论', 'PROBABILITY'], [1540, '优化', 'OPTIMIZATION']];
      PAN.forEach(([x, zh, en], i) => {
        const a = fa * sstep(i * .15, .4 + i * .15, k), y = 330, w = 480, h = 270, cl = [x - w / 2, y - h / 2, w, h];
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(180,188,200,.28)'; ctx.lineWidth = 1.2; rrect(...cl, 6); ctx.stroke();
        ctx.fillStyle = ACC; ctx.fillRect(x - w / 2 + 24, y - h / 2 - 1, 40, 2); ctx.restore();
        ctx.save(); rrect(...cl, 6); ctx.clip();
        if (i === 0) drawLinAlg(x, y, 34, .5 - .5 * Math.cos(k * 1.4), a, 1, cl, 8);
        if (i === 1) drawProb(x, y + 10, 400, 210, 3 + k, a, 1);
        if (i === 2) drawOpt(x, y, 34, ((k * .9) % 4.2), a);
        ctx.restore();
        text(zh, x, y + h / 2 + 34, { font: F_SANS, size: 20, ls: 4, color: SILVER, alpha: a });
        text(en, x, y + h / 2 + 62, { font: F_EN, size: 12, ls: 6, color: GRAY, alpha: a });
      });
      [['svd', 250, 700, 22], ['score', 1670, 700, 24], ['kl', 270, 830, 16], ['fourier', 1650, 830, 16]].forEach(([n, x, y, s], i) => tex(n, x, y, s, fa * .22 * sstep(1 + i * .3, 2 + i * .3, k)));
      flare(W / 2, 700, Math.exp(-k * 1.5) * .85, 1000);
      add(() => glowDot(W / 2, 700, 520, [110, 140, 190], .08 * fa));
      titleWord('AIDD401', W / 2, 700, 150, lt, EGG.fin + .05, .07, 22, 1, .35, F_EN, 400);
      text('COMING  SOON  ·  敬请期待', W / 2, 810, { font: F_SANS, size: 22, ls: 10, color: SILVER, alpha: sstep(1.2, 2, k) });
      const lw = 360 * eout(clamp((k - 1) / 1.2)); ctx.fillStyle = rgba(RGB.S, .4); ctx.fillRect(W / 2 - lw / 2, 770, lw, 1);
    }
  } });
