'use strict';
// ======================================================================== S2 万物皆函数 · S3 神经网络 · S4 万能逼近定理

// ---- S2: y = f(x): molecule → properties, sequence → structure
const S2MOLS = [['caffeine', '咖啡因', 'Caffeine'], ['aspirin', '阿司匹林', 'Aspirin'], ['ibuprofen', '布洛芬', 'Ibuprofen'], ['paracetamol', '对乙酰氨基酚', 'Paracetamol'], ['melatonin', '褪黑素', 'Melatonin']];
const PROPROWS = [['分子量', 'MW', p => p.mw, v => v / 300, 1], ['脂水分配', 'logP', p => p.logp, v => (v + 2) / 6, 2], ['类药性', 'QED', p => p.qed, v => v, 2], ['极性表面积', 'TPSA', p => p.tpsa, v => v / 120, 1]];
const FBOX = { x: W / 2, y: 540, w: 250, h: 210 };
const SS_COL = { H: RGB.A, E: RGB.W, C: RGB.G };
let UBQ_EXT = null;
function molFit(m, w, h, smax = 60) {
  const xs = m.p2.map(p => p[0]), ys = m.p2.map(p => p[1]);
  return Math.min(smax, w / (Math.max(...xs) - Math.min(...xs) + 1.2), h / (Math.max(...ys) - Math.min(...ys) + 1.2));
}
function fBox(a, glow = 0, label = 'f') {
  if (a <= 0) return;
  const { x, y, w, h } = FBOX;
  if (glow > 0) add(() => glowDot(x, y, 260, RGB.A, .22 * glow * a));
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#000'; rrect(x - w / 2, y - h / 2, w, h, 10); ctx.fill();
  ctx.strokeStyle = rgba(mixc(RGB.S, RGB.A, glow), .8); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  text(label, x, y - 6, { font: F_MATH, style: 'italic', size: 120, color: WHITE, alpha: a, glow: glow > .1 ? 'rgba(127,180,255,.7)' : null, blur: 30 });
}
function stream(x0, x1, y, lt, a, n = 14, spread = 70, col = RGB.W) {    // particles flowing along the pipe
  if (a <= 0) return;
  add(() => { for (let i = 0; i < n; i++) { const u = (lt * .9 + hash1(i * 1.7)) % 1, yy = y + (hash1(i * 3.3) - .5) * spread * Math.sin(PI * u); glowDot(lerp(x0, x1, u), yy, 12, col, a * Math.sin(PI * u)); } });
}
scene({ start: 11, len: 9, fi: .01, ch: ['I', '万物皆函数', 'EVERYTHING IS A FUNCTION'],
  subs: [[.5, 4.8, '在 AI 的眼里，万物皆函数。', 'To AI, everything is a function.'], [5, 8.9, '输入分子结构，输出它的性质：', 'Feed in a molecular structure, get its properties:'],
    [9, 12.8, '分子量、脂溶性、类药性……', 'molecular weight, lipophilicity, drug-likeness...'], [13, 17.8, '输入一条氨基酸序列，', 'Feed in an amino-acid sequence,'],
    [18, 23.6, '输出它折叠成的三维结构——这正是 AlphaFold 做的事。', 'get its folded 3D structure — exactly what AlphaFold does.']],
  sfx: [[1.4, 'whoosh', { dur: .8 }], [3.2, 'click'], ...S2MOLS.map((_, i) => [5.2 + i * 1.6, 'blip', { midi: 76 + i * 2 }]), ...S2MOLS.map((_, i) => [6.1 + i * 1.6, 'data', { dur: .6 }]),
    [13, 'whoosh', { dur: 1.2 }], [14.2, 'scan', { dur: 3 }], [16, 'swell', { dur: 3.5 }], [19.6, 'chime', { midi: 88 }]],
  init() {
    const n = DATA.ubq.ca.length;
    UBQ_EXT = Array.from({ length: n }, (_, i) => [(i - n / 2) * 1.35, 3 * Math.sin(i * .55), 2.2 * Math.cos(i * .55)]);
  },
  draw(lt) {
    // header formula: arrives huge from the cold open, settles at the top
    const k = eio(clamp((lt - 1.2) / 1.3));
    tex('yfx', W / 2, lerp(YFX.y, 205, k), lerp(YFX.size, 72, k), 1, 'center', .4 * (1 - k));
    const ba = sstep(2.4, 3.3, lt);
    // pipeline arrows + box
    const phase2 = sstep(12.8, 13.6, lt);
    const glow = lt > 5 ? .5 + .5 * Math.sin(lt * 4) ** 2 : 0;
    arrow(620, 540, FBOX.x - FBOX.w / 2 - 20, 540, RGB.G, ba * .8, 1.6, 12);
    arrow(FBOX.x + FBOX.w / 2 + 20, 540, 1300, 540, RGB.G, ba * .8, 1.6, 12);
    text('x', 420, 330, { font: F_MATH, style: 'italic', size: 40, color: SILVER, alpha: ba * (1 - sstep(4.6, 5.2, lt)) });
    text('y', 1520, 330, { font: F_MATH, style: 'italic', size: 40, color: SILVER, alpha: ba * (1 - sstep(4.6, 5.2, lt)) });
    fBox(ba, glow * ba);
    // --- molecules → properties
    const ma = sstep(4.8, 5.3, lt) * (1 - phase2);
    if (ma > 0) {
      const i = clamp(Math.floor((lt - 5) / 1.6), 0, 4), u = lt - 5 - i * 1.6, [key, zh, en] = S2MOLS[i], m = MOL[key];
      const s = molFit(m, 380, 330, 46), inA = i === 4 ? 1 : 1 - sstep(1.35, 1.6, u);
      drawMol2D(m, 400, 540, s, { a: ma * inA, rev: clamp(u / .55) });
      text(zh, 400, 760, { font: F_ZH, weight: 700, size: 30, color: WHITE, alpha: ma * inA * sstep(.2, .5, u) });
      text(en, 400, 800, { font: F_EN, size: 18, ls: 5, color: GRAY, alpha: ma * inA * sstep(.2, .5, u) });
      stream(630, FBOX.x - 140, 540, lt, ma * sstep(.4, .7, u));
      stream(FBOX.x + 140, 1300, 540, lt + .5, ma * sstep(.8, 1.1, u), 10, 40, RGB.A);
      // property panel
      const px = 1340, ro = sstep(.8, 1.3, u);
      PROPROWS.forEach(([pz, pe, get, norm, dec], r) => {
        const y = 420 + r * 82, v = get(m.props), a = ma * sstep(0, .3, lt - 5);
        text(pz, px, y - 18, { font: F_SANS, size: 21, color: SILVER, alpha: a, align: 'left' });
        text(pe, px + textW(pz, 21, F_SANS) + 12, y - 17, { font: F_EN, size: 16, ls: 3, color: GRAY, alpha: a, align: 'left' });
        text(ro > 0 ? rollNum(v, ro, dec) : '—', px + 400, y - 18, { font: F_MONO, size: 24, color: WHITE, alpha: a, align: 'right' });
        ctx.fillStyle = rgba(RGB.G, .35 * a); ctx.fillRect(px, y + 8, 400, 3);
        ctx.fillStyle = rgba(r === 2 ? RGB.A : RGB.W, .9 * a); ctx.fillRect(px, y + 8, 400 * clamp(norm(v)) * eout(ro), 3);
      });
    }
    // --- sequence → structure
    if (phase2 > 0) {
      const U = DATA.ubq, n = U.seq.length, a = phase2 * (1 - sstep(23.2, 24, lt));
      // sequence ticker flowing into f
      ctx.save(); ctx.beginPath(); ctx.rect(60, 480, FBOX.x - FBOX.w / 2 - 70, 120); ctx.clip();
      const off = (lt - 13) * 110;
      for (let i = 0; i < n; i++) {
        const x = 700 - i * 34 + off; if (x < 40 || x > 900) continue;
        const c = SS_COL[U.ss[i]], near = sstep(FBOX.x - FBOX.w / 2 - 160, FBOX.x - FBOX.w / 2 - 20, x);
        text(U.seq[i], x, 540, { font: F_MONO, size: 30, weight: 500, color: rgba(c, 1), alpha: a * (1 - near) * sstep(40, 140, x) });
      }
      ctx.restore();
      text('泛素  Ubiquitin · 76 aa', 400, 650, { font: F_SANS, size: 22, color: GRAY, alpha: a });
      text('MQIFVKTLTGKTITLEVEPS…', 400, 430, { font: F_MONO, size: 22, color: SILVER, alpha: a * .8 });
      // folding CA trace
      const fk = eio(clamp((lt - 15.2) / 4.5)), yaw = (lt - 13) * .45, sc = lerp(5.2, 9.5, fk), cx = 1500, cy = 540;
      const P = U.ca.map((p, i) => { const q = UBQ_EXT[i]; return [lerp(q[0], p[0], fk), lerp(q[1], p[1], fk), lerp(q[2], p[2], fk)]; });
      const Q = P.map(p => proj(p, yaw, .35, cx, cy, sc * 80, 80));
      const ga = a * sstep(13.6, 14.4, lt);
      if (ga > 0) {
        add(() => glowDot(cx, cy, 380, [110, 140, 190], .09 * ga * fk));
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 0; i + 1 < n; i++) {
          const c = SS_COL[U.ss[i]], dz = clamp(.55 + .02 * (Q[i][2] + Q[i + 1][2]), .25, 1);
          const w = U.ss[i] === 'C' ? 2.5 : 5;
          line(Q[i][0], Q[i][1], Q[i + 1][0], Q[i + 1][1], c, ga * dz, w);
        }
        ctx.restore();
        add(() => { for (let i = 0; i < n; i += 1) glowDot(Q[i][0], Q[i][1], 7, SS_COL[U.ss[i]], ga * .6); });
      }
      const la = a * sstep(19.5, 20.3, lt);
      text('AlphaFold', cx, 850, { font: F_EN, size: 34, ls: 10, color: WHITE, alpha: la });
      [['α 螺旋', RGB.A], ['β 折叠', RGB.W], ['无规卷曲', RGB.G]].forEach(([s, c], i) => {
        const x = cx - 230 + i * 170; ctx.fillStyle = rgba(c, la * .9); ctx.fillRect(x - 40, 900, 22, 4);
        text(s, x - 10, 902, { font: F_SANS, size: 19, color: SILVER, alpha: la, align: 'left' });
      });
    }
  } });

// ---- S3: neuron → MLP → DNN
let NEURON = null;
scene({ start: 20, len: 7, ch: ['II', '神经网络', 'FROM MLP TO DEEP NETWORKS'],
  subs: [[.5, 2.9, '函数从哪里来？', 'Where does the function come from?'], [3, 5.5, '从一个神经元开始：加权求和，再非线性激活。', 'One neuron: a weighted sum, then a nonlinearity.'],
    [5.7, 10.8, '神经元连成层，层叠成网络——多层感知机 MLP。', 'Neurons form layers, layers form a network — the MLP.'], [11, 14.9, '再堆得更深，就是深度神经网络 DNN。', 'Stack it deeper, and you get a deep neural network.'],
    [15, 18.4, '每一层都是一个函数，网络就是函数的复合。', 'Each layer is a function; the network is their composition.']],
  sfx: [[.8, 'pop', { midi: 72 }], [1.3, 'pop', { midi: 76 }], [1.8, 'pop', { midi: 79 }], [2.8, 'ding', { midi: 84 }], [5.5, 'whoosh', { dur: 1 }], [6, 'tracks', { dur: 3 }], [11, 'swell', { dur: 2.5 }], [12, 'data', { dur: 5 }], [15, 'chime', { midi: 86 }]],
  cam: (lt, d) => ({ z: lt < 11 ? 1 + .02 * lt / 11 : 1.02 + .07 * eio(clamp((lt - 11) / 7.5)) }),
  init() { NEURON = { xs: [[560, 390], [560, 540], [560, 690]], c: [960, 540], out: [1330, 540] }; },
  draw(lt) {
    // neuron
    const na = sstep(.4, 1.0, lt) * (1 - sstep(5.2, 5.8, lt));
    if (na > 0) {
      const { xs, c, out } = NEURON;
      xs.forEach(([x, y], i) => {
        const a = na * sstep(.8 + i * .5, 1.2 + i * .5, lt);
        line(x + 30, y, c[0] - 72, c[1] + (y - c[1]) * .25, RGB.S, a * .5, 1.5);
        text(`w${'₁₂₃'[i]}`, (x + c[0]) / 2 - 20, lerp(y, c[1], .5) - 24, { font: F_MATH, style: 'italic', size: 28, color: SILVER, alpha: a });
        ctx.strokeStyle = `rgba(230,236,245,${a})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, 30, 0, TAU); ctx.stroke();
        text(`x${'₁₂₃'[i]}`, x, y, { font: F_MATH, style: 'italic', size: 30, color: WHITE, alpha: a });
        const u = ((lt - 2.2 - i * .12) % 1.333) / 1.333;
        if (lt > 2.2 && u > 0) add(() => glowDot(lerp(x + 30, c[0] - 72, u), lerp(y, c[1] + (y - c[1]) * .25, u), 16, RGB.W, a * Math.sin(PI * u)));
      });
      const ca = na * sstep(1.9, 2.6, lt), fire = lt > 2.8 ? Math.exp(-(((lt - 2.8) % 1.333)) * 3) : 0;
      add(() => glowDot(c[0], c[1], 200, RGB.A, ca * (.12 + .25 * fire)));
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(c[0], c[1], 72, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(mixc(RGB.W, RGB.A, fire), ca); ctx.lineWidth = 2; ctx.stroke();
      line(c[0], c[1] - 60, c[0], c[1] + 60, RGB.G, ca * .7, 1);
      text('Σ', c[0] - 34, c[1] + 2, { font: F_MATH, size: 52, color: WHITE, alpha: ca });
      const sp = []; for (let i = 0; i <= 30; i++) { const u = i / 30, z = (u - .5) * 10; sp.push([c[0] + 12 + u * 44, c[1] + 22 - 44 / (1 + Math.exp(-z))]); }
      poly(sp, RGB.A, ca, 2.5);
      arrow(c[0] + 76, c[1], out[0] - 40, out[1], RGB.S, ca * .8, 1.8, 12);
      text('y', out[0] - 10, out[1], { font: F_MATH, style: 'italic', size: 40, color: WHITE, alpha: ca });
      if (lt > 2.8 && fire > .02) add(() => glowDot(lerp(c[0] + 76, out[0] - 40, 1 - fire), c[1], 16, RGB.A, ca * fire));
      tex('neuron', W / 2, 820, 52, na * sstep(2.8, 3.6, lt));
    }
    // MLP
    const ma = sstep(5.5, 6.3, lt) * (1 - sstep(10.7, 11.4, lt));
    if (ma > 0) {
      const L = netLayout([4, 6, 6, 2], W / 2, 560, 860, 520);
      drawNet(L, lt, ma, { pulses: 26, grow: clamp((lt - 5.5) / 1.4), ea: .16, r: 14, act: (l, i, t) => .3 + .7 * Math.max(0, Math.sin(t * 2.2 + l * 1.3 + i * .9)) ** 3 });
      text('MLP', W / 2, 225, { font: F_EN, size: 44, ls: 16, color: WHITE, alpha: ma });
      text('多层感知机  ·  MULTI-LAYER PERCEPTRON', W / 2, 275, { font: F_SANS, size: 20, ls: 4, color: GRAY, alpha: ma });
      ['输入层', '隐藏层', '隐藏层', '输出层'].forEach((s, i) => text(s, L[i][0][0], 860, { font: F_SANS, size: 19, color: GRAY, alpha: ma * sstep(6.4 + i * .2, 7 + i * .2, lt) }));
    }
    // DNN
    const da = sstep(11, 11.8, lt);
    if (da > 0) {
      const L = netLayout([8, 12, 16, 16, 16, 16, 12, 4], W / 2, 545, 1400, 470);
      drawNet(L, lt, da, { pulses: 70, grow: clamp((lt - 11) / 1.6), ea: .07, r: 8, pr: 12, speed: 2, act: (l, i, t) => Math.max(0, Math.sin(t * 3 + l * .8 + i * 1.7)) ** 4 });
      text('DNN', W / 2, 150, { font: F_EN, size: 40, ls: 16, color: WHITE, alpha: da });
      text('深度神经网络  ·  DEEP NEURAL NETWORK', W / 2, 196, { font: F_SANS, size: 20, ls: 4, color: GRAY, alpha: da });
      ctx.fillStyle = `rgba(0,0,0,${.75 * da})`; ctx.fillRect(W / 2 - 360, 825, 720, 76);
      tex('compose', W / 2, 863, 50, da * sstep(15, 15.8, lt), 'center', .3);
    }
  } });

// ---- S4: universal approximation: a line fails, sums of ReLU hinges succeed
const UAT_F = x => .5 + .24 * Math.sin(TAU * 1.25 * x + .3) + .12 * Math.sin(TAU * 3.1 * x + .6) + .16 * Math.exp(-(((x - .72) / .05) ** 2));
const UAT_N = [2, 4, 8, 16, 64];
const PLOT = { x0: 200, y0: 830, w: 1000, h: 560 };
let UAT = null;
scene({ start: 27, len: 7, ch: ['III', '万能逼近定理', 'UNIVERSAL APPROXIMATION'],
  subs: [[.4, 2.4, '想拟合一条复杂的曲线？', 'Want to fit a complicated curve?'], [2.5, 5.2, '一条直线，再怎么调也弯不过来。', 'No straight line can ever bend to it.'],
    [5.4, 10, '把一个个 ReLU 折线叠起来：神经元越多，贴得越紧。', 'Add up ReLU hinges: the more neurons, the tighter the fit.'],
    [10.2, 14.5, '万能逼近定理：足够宽的网络，能逼近任意连续函数。', 'Universal approximation: a wide enough network can approximate any continuous function.'],
    [14.6, 18.3, '所以，性质预测、结构预测，都能交给神经网络来学。', 'So property and structure prediction can be learned by networks.']],
  sfx: [[.4, 'quill', { dur: 1.6 }], [2.5, 'swish'], [3.6, 'rip'], ...UAT_N.map((_, i) => [5.3 + i * 1.333, 'pop', { midi: 72 + i * 3 }]), [10.4, 'success'], [11, 'shimmer']],
  init() {
    const X = Array.from({ length: 400 }, (_, i) => i / 399), Y = X.map(UAT_F);
    const fit = feats => { const c = lstsq(X.map(feats), Y, 1e-7); const f = x => feats(x).reduce((s, v, j) => s + v * c[j], 0); return { f, mse: X.reduce((s, x, i) => s + (f(x) - Y[i]) ** 2, 0) / X.length }; };
    UAT = { lin: fit(x => [1, x]), fits: UAT_N.map(N => { const cs = Array.from({ length: N }, (_, k) => k / N); return { N, cs, ...fit(x => [1, ...cs.map(c => Math.max(0, x - c))]) }; }) };
  },
  draw(lt) {
    const { x0, y0, w, h } = PLOT, aa = sstep(.1, .7, lt);
    axes(x0, y0, w, h, aa, { xl: 'x', yl: 'y' });
    const tp = clamp((lt - .4) / 1.6);
    plotFn(UAT_F, x0, y0, w, h, 0, 1, 0, 1, RGB.S, .85 * aa, 2.4, tp, false);
    // sample dots
    for (let i = 0; i < 40; i++) { const x = (i + .5) / 40; if (x > tp) break; ctx.fillStyle = rgba(RGB.S, .7 * aa); ctx.beginPath(); ctx.arc(x0 + x * w, y0 - UAT_F(x) * h, 3, 0, TAU); ctx.fill(); }
    // linear fit
    const la = sstep(2.4, 2.9, lt) * (1 - .75 * sstep(5.2, 5.8, lt));
    plotFn(UAT.lin.f, x0, y0, w, h, 0, 1, 0, 1, RGB.G, la, 2.5, clamp((lt - 2.4) / .6), false);
    const lx = x0 + 40, ly = y0 - h + 10;
    if (lt < 5.4) {
      text('线性拟合', lx, ly, { font: F_SANS, size: 26, color: SILVER, alpha: la, align: 'left' });
      text(`MSE  ${rollNum(UAT.lin.mse, clamp((lt - 2.9) / .6), 4)}`, lx, ly + 44, { font: F_MONO, size: 24, color: GRAY, alpha: la, align: 'left' });
      text('✕', lx + 130, ly, { font: F_SANS, size: 26, color: SILVER, alpha: la * sstep(3.6, 3.8, lt), align: 'left' });
    }
    // ReLU sums
    if (lt > 5.3) {
      const k = clamp(Math.floor((lt - 5.3) / 1.333), 0, 4), u = (lt - 5.3) - k * 1.333, e = k ? eout(clamp(u / .45)) : 1, cur = UAT.fits[k], prev = UAT.fits[Math.max(0, k - 1)];
      const fa = sstep(5.3, 5.8, lt), f = x => lerp(prev.f(x), cur.f(x), e);
      plotFn(f, x0, y0, w, h, 0, 1, 0, 1, RGB.A, fa, 3, 1, true, 500);
      if (cur.N <= 16) add(() => cur.cs.forEach(c => glowDot(x0 + c * w, y0 - f(c) * h, 16, RGB.W, fa * .8)));
      text(`N = ${cur.N}`, lx, ly, { font: F_EN, size: 34, ls: 3, color: WHITE, alpha: fa, align: 'left' });
      text('个 ReLU 神经元', lx + textW(`N = ${cur.N}`, 34, F_EN, 400, 3) + 14, ly + 2, { font: F_SANS, size: 22, color: SILVER, alpha: fa, align: 'left' });
      const mse = lerp(prev.mse, cur.mse, e);
      text(`MSE  ${mse < 1e-3 ? mse.toExponential(1) : mse.toFixed(4)}`, lx, ly + 46, { font: F_MONO, size: 24, color: rgba(RGB.A, 1), alpha: fa, align: 'left' });
      // mini ReLU glyph
      const gx = 1380, gy = 260, ga = sstep(5.6, 6.2, lt);
      text('ReLU', gx + 150, gy - 20, { font: F_EN, size: 20, ls: 4, color: GRAY, alpha: ga, align: 'left' });
      poly([[gx, gy], [gx + 60, gy], [gx + 120, gy - 50]], RGB.W, ga, 2.5);
    }
    tex('relusum', 1540, 430, 38, sstep(6.2, 7, lt));
    tex('uat', 1540, 640, 30, sstep(10.3, 11.1, lt), 'center', .35 * sstep(10.3, 12, lt));
    text('万能逼近定理 · Cybenko 1989 / Hornik 1991', 1540, 720, { font: F_SANS, size: 19, color: GRAY, alpha: sstep(11, 11.8, lt) });
  } });
