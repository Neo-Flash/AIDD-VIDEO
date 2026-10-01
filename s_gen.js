'use strict';
// ======================================================================== S7 生成 · S8 VAE · S9 扩散 · S10 流匹配 · S11 贝叶斯流

// italic math with real subscripts: parts = [[text, isSub], ...]
function mtext(parts, x, y, size, color = WHITE, alpha = 1, align = 'center') {
  if (alpha <= 0) return;
  const f = (sub) => ({ font: F_MATH, style: 'italic', size: sub ? size * .62 : size, color, alpha, align: 'left', glow: 'rgba(0,0,0,1)', blur: 8 });
  const ws = parts.map(([t, sub]) => textW(t, sub ? size * .62 : size, F_MATH) * 1.02 + (sub ? 2 : 0)), tw = ws.reduce((a, b) => a + b, 0);
  let cx = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  parts.forEach(([t, sub], i) => { text(t, cx, y + (sub ? size * .28 : 0), f(sub)); cx += ws[i]; });
}

// ---- S7: chemical space is 10^60 wide → invert the function
let SPACE = null;
const METHODS = [['VAE', '变分自编码器'], ['Diffusion', '扩散模型'], ['Flow Matching', '流匹配'], ['BFN', '贝叶斯流网络']];
scene({ start: 47, len: 4, fi: .01, ch: ['VI', '分子生成', 'GENERATING MOLECULES'],
  subs: [[.4, 3.4, '可能的类药分子，多达 10⁶⁰ 个。', 'There may be 10⁶⁰ drug-like molecules.'],
    [3.5, 5.9, '而我们找到的，只是沧海一粟。', 'We have found only a drop in the ocean.'],
    [6.0, 10.4, '能不能反过来：给定想要的性质，直接生成分子？', 'Can we invert it: given the properties, generate the molecule?']],
  sfx: [[0, 'boom'], [.5, 'swell', { dur: 2.5 }], [3.5, 'ring'], [4.6, 'whoosh', { dur: .8, rev: 1 }], [5.33, 'hit'], [5.35, 'glitch'], [6.8, 'data', { dur: 1.4 }], ...METHODS.map((_, i) => [8.6 + i * .3, 'blip', { midi: 76 + i * 3 }]), [9.9, 'shimmer']],
  cam: (lt, d) => ({ z: 1 + .06 * lt / d }),
  init() {
    const r = mulberry(47), C = Array.from({ length: 16 }, () => { const u = r() * TAU, v = Math.acos(2 * r() - 1), R = 1.4 + 2.2 * r(); return [R * Math.sin(v) * Math.cos(u), R * Math.cos(v) * .7, R * Math.sin(v) * Math.sin(u), .25 + .6 * r()]; });
    const pts = Array.from({ length: 2600 }, () => { const c = C[Math.floor(r() * C.length)]; return [c[0] + gauss(r) * c[3], c[1] + gauss(r) * c[3], c[2] + gauss(r) * c[3], r()]; });
    const k = [2.3, -1.3, 1.2], known = Array.from({ length: 70 }, () => [k[0] + gauss(r) * .12, k[1] + gauss(r) * .12, k[2] + gauss(r) * .12]);
    SPACE = { pts, known, kc: k };
  },
  draw(lt) {
    const yaw = .3 + lt * .12, cam = [yaw, .25, W / 2, 520, 900, 11];
    const ca = sstep(0, 1.2, lt) * (1 - .7 * sstep(5, 6, lt));
    add(() => {
      ctx.fillStyle = '#fff';
      for (const p of SPACE.pts) {
        const q = proj(p, ...cam); ctx.globalAlpha = ca * clamp(.15 + .05 * q[2] + .25 * p[3], .05, .6);
        const s = q[3] * .018 + .6; ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s);
      }
    });
    const ka = sstep(3.4, 4, lt) * (1 - sstep(4.9, 5.4, lt)), kq = proj(SPACE.kc, ...cam);
    if (ka > 0) {
      add(() => { for (const p of SPACE.known) { const q = proj(p, ...cam); glowDot(q[0], q[1], 6, RGB.A, ka * .8); } });
      const u = (lt * .7) % 1;
      ctx.strokeStyle = rgba(RGB.A, ka * (1 - u) * .7); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(kq[0], kq[1], 20 + u * 60, 0, TAU); ctx.stroke();
      line(kq[0] + 30, kq[1] - 30, kq[0] + 120, kq[1] - 110, RGB.S, ka * .7, 1);
      text('已知药物', kq[0] + 130, kq[1] - 124, { font: F_SANS, size: 24, color: WHITE, alpha: ka, align: 'left' });
      text('KNOWN DRUGS', kq[0] + 130, kq[1] - 94, { font: F_EN, size: 13, ls: 4, color: GRAY, alpha: ka, align: 'left' });
    }
    const ta = win(lt, .5, 4.5, .6, .5);
    tex('tenpow', W / 2, 470, 240, ta, 'center', .5 * ta);
    text('类药化学空间', W / 2, 650, { font: F_ZH, weight: 700, size: 34, ls: 10, color: WHITE, alpha: ta * sstep(1, 1.6, lt) });
    text('DRUG-LIKE CHEMICAL SPACE', W / 2, 698, { font: F_EN, size: 16, ls: 8, color: GRAY, alpha: ta * sstep(1, 1.6, lt) });
    // y = f(x) flips into x = f⁻¹(y)
    if (lt > 4.6) {
      const u = clamp((lt - 5) / .66), sy = Math.cos(PI * eio(u)), mv = eio(clamp((lt - 6.1) / .8));
      const y = lerp(470, 300, mv), sz = lerp(130, 92, mv), a = sstep(4.6, 5, lt);
      ctx.save(); ctx.translate(W / 2, y); ctx.scale(1, Math.max(.02, Math.abs(sy))); ctx.translate(-W / 2, -y);
      tex(u < .5 ? 'yfx' : 'xinv', W / 2, y, sz, a, 'center', .5);
      ctx.restore();
      const la = sstep(5.7, 6.3, lt);
      text('逆向设计', W / 2, lerp(620, 410, mv), { font: F_ZH, weight: 700, size: 34, ls: 12, color: WHITE, alpha: la });
      text('INVERSE DESIGN', W / 2, lerp(666, 452, mv), { font: F_EN, size: 16, ls: 10, color: GRAY, alpha: la });
    }
    // wanted properties → ? molecule
    const pa = sstep(6.8, 7.3, lt);
    if (pa > 0) {
      [['QED  >  0.8', '类药性高'], ['logP  ∈  [1, 3]', '脂溶性适中'], ['IC₅₀  <  10 nM', '活性强 · 毒性低']].forEach(([m, z], i) => {
        const a = sstep(6.8 + i * .25, 7.2 + i * .25, lt), y = 560 + i * 64;
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(180,188,200,.35)'; ctx.lineWidth = 1.2; rrect(450, y - 24, 400, 48, 24); ctx.stroke(); ctx.restore();
        text(m, 480, y, { font: F_MONO, size: 22, color: WHITE, alpha: a, align: 'left' });
        text(z, 830, y, { font: F_SANS, size: 19, color: SILVER, alpha: a, align: 'right' });
      });
      arrow(890, 624, 1180, 624, RGB.S, pa * sstep(7.4, 7.9, lt), 1.8, 14);
      const qa = sstep(7.8, 8.3, lt), cx = 1330, cy = 624;
      add(() => { for (let i = 0; i < 40; i++) { const an = hash1(i) * TAU + lt * (.6 + hash1(i + 9)), rr = 60 + 40 * hash1(i * 3); glowDot(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * .8, 7, i % 5 ? RGB.W : RGB.A, qa * .6); } });
      text('?', cx, cy + 4, { font: F_EN, size: 110, color: WHITE, alpha: qa, glow: 'rgba(127,180,255,.6)', blur: 30 });
      text('新分子', cx, cy + 120, { font: F_SANS, size: 21, color: SILVER, alpha: qa });
      METHODS.forEach(([en, zh], i) => {
        const a = sstep(8.6 + i * .3, 8.9 + i * .3, lt), x = W / 2 + (i - 1.5) * 330;
        text(en, x, 820, { font: F_EN, size: 34, ls: 2, color: i % 2 ? SILVER : WHITE, alpha: a });
        if (i) text('·', x - 165, 818, { font: F_EN, size: 30, color: GRAY, alpha: a });
      });
    }
  } });

// ---- S8: VAE — encode to a latent point, decode back, walk the latent space
const VAE = { ix: 250, cy: 480, lx: 960, ox: 1680 };
const VAE_WALK = [['phenol', '苯酚', 'Phenol', [-95, 45]], ['cresol', '对甲酚', 'p-Cresol', [-50, -30]], ['paracetamol', '对乙酰氨基酚', 'Paracetamol', [0, 12]], ['methacetin', '美沙西丁', 'Methacetin', [48, -38]], ['phenacetin', '非那西丁', 'Phenacetin', [96, 28]]];
let VAES = null;
function trap(x0, x1, h0, h1, cy, a, label) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(x0, cy - h0 / 2); ctx.lineTo(x1, cy - h1 / 2); ctx.lineTo(x1, cy + h1 / 2); ctx.lineTo(x0, cy + h0 / 2); ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fill(); ctx.strokeStyle = 'rgba(190,198,210,.7)'; ctx.lineWidth = 1.6; ctx.stroke();
  for (let k = 1; k < 4; k++) { const x = lerp(x0, x1, k / 4), h = lerp(h0, h1, k / 4); line(x, cy - h / 2 + 8, x, cy + h / 2 - 8, RGB.G, .35, 1); }
  ctx.restore();
  mtext(label, (x0 + x1) / 2, cy, 30, WHITE, a);
}
function walkPos(u) {                                           // piecewise-smooth path through the anchors
  const k = clamp(u, 0, .9999) * 4, i = Math.floor(k), f = eio(k - i), A = VAE_WALK[i][3], B = VAE_WALK[i + 1][3];
  return [lerp(A[0], B[0], f), lerp(A[1], B[1], f) - 18 * Math.sin(PI * f)];
}
scene({ start: 51, len: 6, ch: ['VII', '变分自编码器', 'VARIATIONAL AUTOENCODER'],
  subs: [[.4, 4, 'VAE 把分子压缩成隐空间里的一个点，', 'A VAE compresses a molecule into a point in latent space,'],
    [4.1, 7.6, '再从这个点，解码回一个分子。', 'then decodes that point back into a molecule.'],
    [7.8, 12, '在隐空间里走一走，就得到一串相似的新分子。', 'Walk through latent space, and similar new molecules appear.'],
    [12.2, 15.7, '训练目标：重建要准，隐空间要规整。', 'The objective: accurate reconstruction, a well-ordered latent space.']],
  sfx: [[.3, 'quill', { dur: 1 }], [1.6, 'suck'], [3.4, 'ding', { midi: 81 }], [4.2, 'whoosh', { dur: 1 }], [5.2, 'sparkle', { dur: 1.2 }], [6.5, 'glide'],
    ...[7.3, 8.47, 9.63, 10.8].map((t, i) => [t + 1.17 * .5, 'blip', { midi: 76 + i * 3 }]), [12.2, 'chime', { midi: 86 }]],
  cam: camPush(.03),
  init() { const r = mulberry(51); VAES = { cloud: Array.from({ length: 480 }, () => [gauss(r) * 52, gauss(r) * 52, r()]) }; },
  draw(lt) {
    const { ix, cy, lx, ox } = VAE, P = MOL.paracetamol;
    const inA = sstep(0, .8, lt) * (1 - .55 * sstep(6.5, 7.2, lt));
    drawMol2D(P, ix, cy, 34, { a: inA, rev: clamp(lt / 1.1) });
    text('输入分子 x', ix, cy + 150, { font: F_SANS, size: 20, color: GRAY, alpha: inA });
    trap(450, 720, 300, 110, cy, sstep(.8, 1.6, lt), [['q'], ['φ', 1], ['(z | x)']]);
    trap(1470, 1200, 300, 110, cy, sstep(2.2, 3, lt), [['p'], ['θ', 1], ['(x | z)']]);
    text('编码器', 585, cy + 205, { font: F_ZH, weight: 700, size: 26, color: WHITE, alpha: sstep(1.2, 1.8, lt) });
    text('ENCODER', 585, cy + 240, { font: F_EN, size: 13, ls: 5, color: GRAY, alpha: sstep(1.2, 1.8, lt) });
    text('解码器', 1335, cy + 205, { font: F_ZH, weight: 700, size: 26, color: WHITE, alpha: sstep(2.6, 3.2, lt) });
    text('DECODER', 1335, cy + 240, { font: F_EN, size: 13, ls: 5, color: GRAY, alpha: sstep(2.6, 3.2, lt) });
    // latent space: standard-normal cloud + σ contours
    const la = sstep(1.5, 2.5, lt);
    if (la > 0) {
      add(() => { ctx.fillStyle = '#fff'; for (const [x, y, v] of VAES.cloud) { if (x * x + y * y > 150 * 150) continue; ctx.globalAlpha = la * (.12 + .25 * v); ctx.fillRect(lx + x - 1, cy + y - 1, 2.2, 2.2); } });
      ctx.save(); ctx.setLineDash([4, 7]); [52, 104].forEach(r => { ctx.strokeStyle = rgba(RGB.G, la * .7); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(lx, cy, r, 0, TAU); ctx.stroke(); }); ctx.restore();
      text('隐空间  z', lx, cy + 205, { font: F_ZH, weight: 700, size: 26, color: WHITE, alpha: la });
      text('LATENT SPACE', lx, cy + 240, { font: F_EN, size: 13, ls: 5, color: GRAY, alpha: la });
    }
    // encode flow
    const flow = (x0, x1, t0, dur, y0, y1, n, col) => add(() => { for (let i = 0; i < n; i++) {
      const u = (lt - t0 - i * dur / n * .5) / (dur * .5); if (u <= 0 || u >= 1) continue;
      const e = eio(u), sp = (hash1(i * 2.3) - .5) * 160 * (1 - e);
      glowDot(lerp(x0, x1, e), lerp(y0 + sp, y1, e), 10, col, .8 * Math.sin(PI * u));
    } });
    const z0 = VAE_WALK[2][3];
    flow(ix + 120, lx + z0[0], 1.8, 1.8, cy, cy + z0[1], 30, RGB.W);
    // latent point z (reparameterised), then walking
    let z = z0;
    if (lt > 6.5) z = lt < 7.3 ? (() => { const e = eio(clamp((lt - 6.5) / .8)), B = VAE_WALK[0][3]; return [lerp(z0[0], B[0], e), lerp(z0[1], B[1], e)]; })() : walkPos((lt - 7.3) / 4.7);
    const za = sstep(3.3, 3.6, lt);
    if (za > 0) {
      if (lt > 6.5) {
        const tr = []; for (let s = 7.3; s <= Math.min(lt, 12); s += .05) { const p = walkPos((s - 7.3) / 4.7); tr.push([lx + p[0], cy + p[1]]); }
        add(() => glowPoly(tr, RGB.A, .6, 1.6));
        VAE_WALK.forEach(([, zh], i) => { const [x, y] = VAE_WALK[i][3]; ctx.fillStyle = rgba(RGB.S, .8 * sstep(6.6, 7.2, lt)); ctx.beginPath(); ctx.arc(lx + x, cy + y, 3.5, 0, TAU); ctx.fill(); });
      }
      const sa = win(lt, 3.6, 6.4, .4, .4), pu = 1 + .06 * Math.sin(lt * 6);
      ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = rgba(RGB.A, sa * .8); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(lx + z[0], cy + z[1], 34 * pu, 26 * pu, 0, 0, TAU); ctx.stroke(); ctx.restore();
      text('μ', lx + z[0] + 44, cy + z[1] - 32, { font: F_MATH, style: 'italic', size: 22, color: SILVER, alpha: sa });
      text('σ', lx + z[0] + 44, cy + z[1] + 30, { font: F_MATH, style: 'italic', size: 22, color: SILVER, alpha: sa });
      add(() => glowDot(lx + z[0], cy + z[1], 34, RGB.A, za * (.9 + .3 * Math.exp(-(lt - 3.4) * 4))));
      text('z', lx + z[0] - 28, cy + z[1] - 26, { font: F_MATH, style: 'italic', size: 28, color: WHITE, alpha: za });
    }
    tex('reparam', lx, 736, 40, win(lt, 3.6, 7.4, .5, .5), 'center', .3);
    // decode flow → output molecule
    flow(lx + z0[0], ox - 110, 4.1, 1.6, cy + z0[1], cy, 26, RGB.A);
    const oa = sstep(5.1, 5.6, lt);
    if (oa > 0) {
      let wi = 2, wf = 1;
      if (lt > 6.5 && lt < 7.3) { wi = lt < 6.9 ? 2 : 0; wf = lt < 6.9 ? 1 - sstep(6.5, 6.9, lt) : sstep(6.9, 7.3, lt); }
      else if (lt >= 7.3) { const u = clamp((lt - 7.3) / 4.7) * 4; wi = Math.round(u); wf = 1 - sstep(.3, .5, Math.abs(u - wi)); }
      const [key, zh, en] = VAE_WALK[wi], m = MOL[key], s = molFit(m, 260, 250, 30), a = oa * clamp(wf);
      drawMol2D(m, ox, cy, s, { a, rev: lt < 6.5 ? clamp((lt - 5.1) / .7) : 1 });
      text(zh, ox, cy + 150, { font: F_SANS, size: 22, color: WHITE, alpha: a });
      text(`${en}  ·  QED ${m.props.qed.toFixed(2)}`, ox, cy + 182, { font: F_EN, size: 15, ls: 2, color: GRAY, alpha: a });
      text(lt < 6.5 ? '重建  x̂' : '新分子', ox, cy - 160, { font: F_SANS, size: 20, color: lt < 6.5 ? GRAY : ACC, alpha: oa });
    }
    const ea = sstep(7.6, 8.4, lt), hi = sstep(12.2, 12.8, lt);
    tex('elbo', lx, 830, 34, ea, 'center', .45 * hi);
    [['重建误差 · 要准', -200], ['KL 正则 · 要规整', 220]].forEach(([s, dx]) => text(s, lx + dx, 880, { font: F_SANS, size: 19, color: ACC, alpha: hi * .9 }));
  } });

// ---- S9: diffusion — noise a 3D molecule away, then denoise it back
const DMIX = [[-1.6, .3, .3], [.2, .25, .4], [1.5, .35, .3]];
const DTAGS = [['DiffDock', '分子对接', 'MOLECULAR DOCKING'], ['RFdiffusion', '蛋白设计', 'PROTEIN DESIGN'], ['AlphaFold 3', '复合物结构', 'COMPLEX STRUCTURE']];
let DIFF = null;
const abar = t => Math.cos(PI / 2 * clamp(t) * .985) ** 2;
function diffT(lt) { return lt < 6.35 ? sstep(.8, 6.2, lt) : 1 - Math.round(sstep(6.5, 12.2, lt) * 50) / 50; }
scene({ start: 57, len: 6, ch: ['VIII', '扩散模型', 'DIFFUSION MODELS'],
  subs: [[.4, 3.4, '扩散模型：先一点点加噪声，', 'Diffusion models first add noise, bit by bit,'],
    [3.5, 6.3, '直到分子变成一团随机的点。', 'until the molecule is just a cloud of random points.'],
    [6.5, 12.2, '再训练网络预测噪声，一步步把它去掉，新分子就浮现出来。', 'A network learns to predict the noise and removes it step by step — a molecule emerges.'],
    [12.4, 15.7, 'DiffDock、RFdiffusion、AlphaFold 3，都建立在扩散之上。', 'DiffDock, RFdiffusion, AlphaFold 3 — all built on diffusion.']],
  sfx: [[.8, 'swell', { dur: 5.2 }], [.9, 'rattle'], [6.2, 'suck'], [6.5, 'whoosh', { dur: 1.5, rev: 1 }], [7, 'scan', { dur: 5 }], [12.2, 'sparkle', { dur: 1.6 }], [12.25, 'ding', { midi: 88 }], ...DTAGS.map((_, i) => [12.5 + i * .4, 'pop', { midi: 74 + i * 3 }])],
  cam: camPush(.03),
  init() {
    const m = MOL.imatinib, r = mulberry(57), n = m.atoms.length, c = [0, 1, 2].map(k => m.p3.reduce((s, p) => s + p[k], 0) / n);
    const P0 = m.p3.map(p => [p[0] - c[0], p[1] - c[1], p[2] - c[2]]), G = () => [gauss(r), gauss(r), gauss(r)];
    DIFF = { m, P0, E1: P0.map(G), E2: P0.map(G), J: Array.from({ length: 64 }, () => P0.map(G)) };
  },
  draw(lt) {
    const { m, P0, E1, E2, J } = DIFF, t = diffT(lt), ab = abar(t), s = Math.sqrt(ab), nz = Math.sqrt(1 - ab), rev = lt > 6.35;
    const th = rev ? (1 - t) * PI / 2 : 0, step = Math.floor(lt * 8) % 64;
    const P = P0.map((p, i) => p.map((v, k) => s * v + nz * 5 * (E1[i][k] * Math.cos(th) + E2[i][k] * Math.sin(th)) + (rev ? nz * .35 * J[step][i][k] : 0)));
    const cam = { yaw: .4 + lt * .22, pitch: .3, cx: 640, cy: 520, F: 1200, D: 40 };
    const cols = m.atoms.map(e => mixc(ELEM[e] || RGB.W, RGB.G, clamp((1 - ab) * 1.3)));
    add(() => glowDot(640, 520, 460, [110, 140, 190], .06 + .05 * (1 - ab)));
    const Q = drawMol3D(P, m, cam, { a: sstep(0, .6, lt), cols, ba: clamp(ab * ab * 1.2), r: .36 + .1 * (1 - ab) });
    if (rev && lt < 11.6) {                                      // predicted noise ε̂ points each atom home
      const ea = sstep(6.6, 7.2, lt) * (1 - sstep(11, 11.6, lt)) * nz;
      const T = P0.map(p => proj(p, cam.yaw, cam.pitch, cam.cx, cam.cy, cam.F, cam.D));
      ctx.save(); ctx.lineCap = 'round';
      Q.forEach((q, i) => { const dx = T[i][0] - q[0], dy = T[i][1] - q[1], L = Math.hypot(dx, dy); if (L < 8) return; const k = Math.min(46, L * .45) / L; arrow(q[0], q[1], q[0] + dx * k, q[1] + dy * k, RGB.A, ea * .8, 1.6, 7); });
      ctx.restore();
    }
    // t slider
    const ba = sstep(.4, 1, lt) * (1 - sstep(12.2, 12.8, lt)), bx0 = 340, bx1 = 940, by = 870;
    if (ba > 0) {
      line(bx0, by, bx1, by, RGB.G, ba * .7, 2); line(bx0, by, lerp(bx0, bx1, t), by, rev ? RGB.A : RGB.W, ba, 2.5);
      add(() => glowDot(lerp(bx0, bx1, t), by, 20, rev ? RGB.A : RGB.W, ba));
      text('x₀  分子', bx0 - 20, by, { font: F_MATH, size: 22, color: SILVER, alpha: ba, align: 'right' });
      text('噪声', bx1 + 20, by, { font: F_SANS, size: 20, color: SILVER, alpha: ba, align: 'left' }); mtext([['x'], ['T', 1]], bx1 + 82, by, 22, SILVER, ba, 'left');
      text(`t = ${Math.round(t * 1000)}`, lerp(bx0, bx1, t), by - 30, { font: F_MONO, size: 18, color: WHITE, alpha: ba });
      text(rev ? '去噪  ←' : '加噪  →', (bx0 + bx1) / 2, by + 36, { font: F_SANS, size: 19, color: rev ? ACC : GRAY, alpha: ba });
    }
    // formulas + 1D density p_t(x)
    const fa = sstep(.8, 1.5, lt) * (1 - sstep(12, 12.5, lt));
    tex('qfwd', 1440, 330, 30, fa * (1 - sstep(6.3, 6.8, lt)));
    tex('dloss', 1440, 330, 30, fa * sstep(6.5, 7.1, lt), 'center', .3);
    if (fa > 0) {
      const x0 = 1180, w = 520, y0 = 720, h = 230, pt = x => DMIX.reduce((a, [mu, sd, wt]) => { const v = ab * sd * sd + (1 - ab); return a + wt * Math.exp(-((x - s * mu) ** 2) / (2 * v)) / Math.sqrt(TAU * v); }, 0);
      line(x0, y0, x0 + w, y0, RGB.G, fa * .8, 1.4);
      plotFn(pt, x0, y0, w, h, -3.5, 3.5, 0, .75, rev ? RGB.A : RGB.W, fa, 2.4, 1, true, 240);
      text('p', x0, y0 - h - 10, { font: F_MATH, style: 'italic', size: 26, color: SILVER, alpha: fa, align: 'left' });
      text('t', x0 + 14, y0 - h - 2, { font: F_MATH, style: 'italic', size: 16, color: SILVER, alpha: fa, align: 'left' });
      text('(x)', x0 + 22, y0 - h - 10, { font: F_MATH, size: 26, color: SILVER, alpha: fa, align: 'left' });
      text(t > .9 ? '≈ 𝒩(0, I)' : '数据分布', x0 + w, y0 - h - 10, { font: F_SANS, size: 19, color: GRAY, alpha: fa, align: 'right' });
    }
    DTAGS.forEach(([n, zh, en], i) => {
      const a = sstep(12.5 + i * .4, 12.9 + i * .4, lt), y = 380 + i * 140, dx = 30 * (1 - eout(a));
      ctx.fillStyle = rgba(RGB.A, a); ctx.fillRect(1240 + dx, y - 34, 2, 70);
      text(n, 1270 + dx, y - 12, { font: F_EN, size: 42, ls: 1, color: WHITE, alpha: a, align: 'left' });
      text(`${zh}  ·  ${en}`, 1272 + dx, y + 26, { font: F_SANS, size: 18, ls: 2, color: GRAY, alpha: a, align: 'left' });
    });
  } });

// ---- S10: flow matching — straight paths, a learned velocity field, an ODE
const FM = { cx: 640, cy: 520, s: 64, sd: 150, K: 80 };
let FMS = null;
function fmVel(x, y, t, Y) {
  const s2 = 2 * ((1 - t) * FM.sd) ** 2; let wx = 0, wy = 0, z = 0, mx = -1e18;
  const L = new Float64Array(Y.length);
  for (let j = 0; j < Y.length; j++) { const dx = x - t * Y[j][0] - (1 - t) * FM.cx, dy = y - t * Y[j][1] - (1 - t) * FM.cy; L[j] = -(dx * dx + dy * dy) / s2; if (L[j] > mx) mx = L[j]; }
  for (let j = 0; j < Y.length; j++) { const w = Math.exp(L[j] - mx); z += w; wx += w * Y[j][0]; wy += w * Y[j][1]; }
  return [(wx / z - x) / (1 - t), (wy / z - y) / (1 - t)];
}
scene({ start: 63, len: 6, ch: ['IX', '流匹配', 'FLOW MATCHING'],
  subs: [[.4, 3.5, '流匹配：在噪声和分子之间，连一条直线路径。', 'Flow matching draws a straight path between noise and molecule.'],
    [3.6, 7.5, '网络学习一个速度场，告诉每个点往哪里走。', 'A network learns a velocity field: where each point should go.'],
    [7.6, 11, '顺着速度场解一个常微分方程，噪声就流成了分子。', 'Integrate the ODE along the field, and noise flows into a molecule.'],
    [11.2, 15.7, '路径更直，步数更少，生成更快。', 'Straighter paths, fewer steps, faster generation.']],
  sfx: [[.3, 'puff'], [1, 'quill', { dur: 2.4 }], [3.6, 'shimmer'], [5, 'swell', { dur: 5.5 }], [5.1, 'tracks', { dur: 5 }], [10.5, 'solved'], [11.3, 'swish'], [12.4, 'ding', { midi: 88 }]],
  cam: camPush(.03),
  init() {
    const m = MOL.paracetamol, r = mulberry(63), Y = [];
    const A = m.p2.map(([x, y]) => [FM.cx + x * FM.s, FM.cy - y * FM.s]);
    A.forEach(p => { for (let k = 0; k < 22; k++) Y.push([p[0] + gauss(r) * 5, p[1] + gauss(r) * 5]); });
    m.kb.forEach(([i, j]) => { for (let k = 1; k < 10; k++) Y.push([lerp(A[i][0], A[j][0], k / 10), lerp(A[i][1], A[j][1], k / 10)]); });
    const N = 520, K = FM.K, TR = [Array.from({ length: N }, () => [FM.cx + gauss(r) * FM.sd, FM.cy + gauss(r) * FM.sd])];
    for (let k = 0; k < K; k++) { const t = k / K; TR.push(TR[k].map(([x, y]) => { const v = fmVel(x, y, t, Y); return [x + v[0] / K, y + v[1] / K]; })); }
    const pairs = Array.from({ length: 60 }, (_, i) => [i * 7 % N, Math.floor(r() * Y.length)]);
    FMS = { Y, TR, pairs, N };
  },
  draw(lt) {
    const { Y, TR, pairs } = FMS, K = FM.K, ft = eio(clamp((lt - 5) / 5.5));
    const at = f => { const k = clamp(f, 0, 1) * K, i = Math.min(K - 1, Math.floor(k)), e = k - i; return TR[i].map((p, n) => [lerp(p[0], TR[i + 1][n][0], e), lerp(p[1], TR[i + 1][n][1], e)]); };
    // target ghost
    const ga = sstep(.5, 1.5, lt) * (1 - sstep(4.5, 6, lt));
    if (ga > 0) { ctx.fillStyle = rgba(RGB.S, .22 * ga); for (const [x, y] of Y) ctx.fillRect(x - 1, y - 1, 2, 2); text('目标分布  x₁', FM.cx, FM.cy + 200, { font: F_MATH, size: 22, color: GRAY, alpha: ga }); }
    // conditional straight paths
    const ca = sstep(1, 1.5, lt) * (1 - sstep(4.2, 5, lt));
    if (ca > 0) {
      ctx.save(); ctx.setLineDash([5, 7]);
      pairs.forEach(([i, j], k) => { const p = TR[0][i], q = Y[j], u = eout(clamp((lt - 1 - k * .02) / 1.2)); line(p[0], p[1], lerp(p[0], q[0], u), lerp(p[1], q[1], u), RGB.S, ca * .45, 1); });
      ctx.restore();
      add(() => pairs.forEach(([i, j], k) => { const u = ((lt - 1.5 + k * .09) % 1.6) / 1.6, p = TR[0][i], q = Y[j]; if (lt > 1.5) glowDot(lerp(p[0], q[0], u), lerp(p[1], q[1], u), 8, RGB.A, ca * Math.sin(PI * u) * .8); }));
    }
    // velocity field
    const va = sstep(3.5, 4.2, lt) * (1 - sstep(10.4, 11.2, lt));
    if (va > 0) {
      const tv = Math.min(.93, ft);
      ctx.save(); ctx.lineCap = 'round';
      for (let gx = 290; gx <= 990; gx += 50) for (let gy = 230; gy <= 810; gy += 50) {
        const [vx, vy] = fmVel(gx, gy, tv, Y), L = Math.hypot(vx, vy) + 1e-6, len = Math.min(26, L * .09);
        arrow(gx - vx / L * len / 2, gy - vy / L * len / 2, gx + vx / L * len / 2, gy + vy / L * len / 2, RGB.G, va * (.25 + .35 * clamp(L / 300)), 1.2, 6);
      }
      ctx.restore();
    }
    // particles riding the ODE, with short trails
    const pa = sstep(0, .8, lt) * (1 - .6 * sstep(10.5, 11.5, lt)), X = at(ft);
    if (lt > 5 && lt < 11) { const Xp = at(ft - .06); ctx.save(); ctx.lineCap = 'round'; X.forEach((p, i) => line(Xp[i][0], Xp[i][1], p[0], p[1], RGB.A, pa * .35, 1.4)); ctx.restore(); }
    add(() => { ctx.fillStyle = '#fff'; X.forEach(([x, y], i) => { ctx.globalAlpha = pa * (.55 + .35 * hash1(i)); const s = 2.6; ctx.fillRect(x - s / 2, y - s / 2, s, s); }); });
    drawMol2D(MOL.paracetamol, FM.cx, FM.cy, FM.s, { a: sstep(10.5, 11.5, lt) * .9 });
    text(`t = ${ft.toFixed(2)}`, FM.cx, 860, { font: F_MONO, size: 20, color: SILVER, alpha: sstep(4.6, 5, lt) * (1 - sstep(11.5, 12, lt)) });
    // right: equations, then straight vs curved paths
    const ra = 1 - sstep(11, 11.6, lt);
    tex('fmpath', 1440, 330, 40, sstep(1.2, 2, lt) * ra);
    tex('fmode', 1440, 490, 40, sstep(3.8, 4.6, lt) * ra, 'center', .3 * sstep(7.6, 8.4, lt));
    tex('fmloss', 1440, 680, 30, sstep(6, 6.8, lt), 'center', .2);
    const ka = sstep(11.3, 11.9, lt);
    if (ka > 0) {
      const a0 = [1200, 440], a1 = [1690, 440], pr = eout(clamp((lt - 11.4) / 1.6));
      const curve = u => [lerp(a0[0], a1[0], u), a0[1] - 90 * Math.sin(PI * u) + 40 * Math.sin(3 * PI * u)];
      const cp = []; for (let i = 0; i <= 80 * pr; i++) cp.push(curve(i / 80)); poly(cp, RGB.G, ka * .9, 2);
      for (let i = 0; i <= 30 * pr; i++) { const [x, y] = curve(i / 30); ctx.fillStyle = rgba(RGB.S, ka * .8); ctx.fillRect(x - 1.5, y - 1.5, 3, 3); }
      const sa = sstep(12.3, 12.9, lt), sp = eout(clamp((lt - 12.4) / .9));
      add(() => glowPoly([[a0[0], a0[1] + 70], [lerp(a0[0], a1[0], sp), a0[1] + 70]], RGB.A, sa, 2.2));
      for (let i = 0; i <= 5 * sp; i++) add(() => glowDot(lerp(a0[0], a1[0], i / 5), a0[1] + 70, 12, RGB.A, sa));
      text('扩散  ·  弯曲路径，成百上千步', (a0[0] + a1[0]) / 2, a0[1] - 150, { font: F_SANS, size: 21, color: SILVER, alpha: ka });
      text('流匹配  ·  直线路径，几步即可', (a0[0] + a1[0]) / 2, a0[1] + 120, { font: F_SANS, size: 21, color: ACC, alpha: sa });
    }
  } });

// ---- S11: Bayesian flow networks — update beliefs, not samples
const BFN = { x0: 200, y0: 780, w: 900, h: 460, xa: -3, xb: 3, ym: 2.3, xt: 1.1, mu0: -.8, rho0: .8, al: [.9, 1.8, 3.5, 7, 14], z: [.9, -1.2, .5, -.3, .2] };
const CATS = ['C', 'N', 'O', 'S', 'F'];
let BFNS = null;
const npdf = (x, m, v) => Math.exp(-((x - m) ** 2) / (2 * v)) / Math.sqrt(TAU * v);
scene({ start: 69, len: 6, ch: ['X', '贝叶斯流网络', 'BAYESIAN FLOW NETWORKS'],
  subs: [[.4, 3.8, '贝叶斯流网络，更新的不是样本，而是“信念”。', 'Bayesian flow networks update beliefs, not samples.'],
    [3.9, 7.4, '每收到一个带噪的观测，信念就更确定一点。', 'Each noisy observation makes the belief a little more certain.'],
    [7.6, 11.6, '坐标是连续的，原子类型是离散的——同一个框架全部搞定。', 'Continuous coordinates, discrete atom types — one framework for both.'],
    [11.8, 15.7, 'VAE、扩散、流匹配、BFN：四条路，通向新分子。', 'VAE, diffusion, flow matching, BFN: four roads to new molecules.']],
  sfx: [[.3, 'glide'], ...BFN.al.map((_, k) => [1.33 + k, 'ding', { midi: 76 + k * 2 }]), [7.4, 'whoosh', { dur: 1 }], [7.8, 'swell', { dur: 4.5 }], [12.4, 'solved'], ...METHODS.map((_, i) => [12.2 + i * .35, 'pop', { midi: 72 + i * 4 }])],
  cam: camPush(.03),
  init() {
    const st = [[BFN.mu0, BFN.rho0]];
    BFN.al.forEach((a, k) => { const [mu, rho] = st[k], y = BFN.xt + BFN.z[k] / Math.sqrt(a); st.push([(rho * mu + a * y) / (rho + a), rho + a]); });
    const m = MOL.celecoxib, n = m.atoms.length, c = [0, 1, 2].map(k => m.p3.reduce((s, p) => s + p[k], 0) / n), r = mulberry(69);
    const P0 = m.p3.map(p => [p[0] - c[0], p[1] - c[1], p[2] - c[2]]);
    const E1 = P0.map(() => [gauss(r), gauss(r), gauss(r)]), E2 = P0.map(() => CATS.map(() => gauss(r))), EC = P0.map(() => Array.from({ length: 10 }, () => [gauss(r), gauss(r), gauss(r)]));
    const xi = m.atoms.map(a => CATS.indexOf(a)), sel = [m.atoms.indexOf('S'), m.atoms.indexOf('F'), m.atoms.indexOf('N'), m.atoms.indexOf('O')];
    BFNS = { st, ys: BFN.al.map((a, k) => BFN.xt + BFN.z[k] / Math.sqrt(a)), m, P0, E1, E2, EC, xi, sel };
  },
  draw(lt) {
    const { st, ys } = BFNS, { x0, y0, w, h, xa, xb, ym } = BFN;
    const pa = sstep(.2, .8, lt) * (1 - sstep(7, 7.6, lt));
    if (pa > 0) {
      axes(x0, y0, w, h, pa, { xl: 'x' });
      const X = v => x0 + (v - xa) / (xb - xa) * w;
      ctx.save(); ctx.setLineDash([4, 6]); line(X(BFN.xt), y0, X(BFN.xt), y0 - h, RGB.S, pa * .5, 1.2); ctx.restore();
      text('真值', X(BFN.xt), y0 + 30, { font: F_SANS, size: 19, color: SILVER, alpha: pa });
      // belief state (interpolated in log-precision)
      let mu = st[0][0], lr = Math.log(st[0][1]);
      BFN.al.forEach((_, k) => { const e = eio(clamp((lt - 1.33 - k - .3) / .5)); if (e > 0) { mu = lerp(mu, st[k + 1][0], e); lr = lerp(lr, Math.log(st[k + 1][1]), e); } });
      const rho = Math.exp(lr);
      BFN.al.forEach((a, k) => {                                  // each noisy observation drops in with its likelihood
        const tk = 1.33 + k, u = lt - tk; if (u < 0) return;
        const yy = lerp(y0 - h - 40, y0, eout(clamp(u / .35))), oa = pa * (1 - .6 * sstep(.9, 1.3, u));
        line(X(ys[k]), yy - 18, X(ys[k]), yy, RGB.A, oa, 2.5);
        add(() => glowDot(X(ys[k]), yy, 16, RGB.A, oa * .8));
        const la = pa * win(u, .1, 1.1, .2, .4);
        if (la > 0) { ctx.save(); ctx.setLineDash([3, 5]); plotFn(x => npdf(x, ys[k], 1 / a) * .5, x0, y0, w, h, xa, xb, 0, ym, RGB.G, la, 1.4, 1, false, 240); ctx.restore(); }
      });
      plotFn(x => npdf(x, mu, 1 / rho), x0, y0, w, h, xa, xb, 0, ym, RGB.W, pa * sstep(.3, 1, lt), 3, 1, true, 360);
      text(`μ = ${mu.toFixed(2)}`, x0 + 30, y0 - h - 20, { font: F_MONO, size: 22, color: WHITE, alpha: pa, align: 'left' });
      text(`ρ = ${rho.toFixed(1)}`, x0 + 230, y0 - h - 20, { font: F_MONO, size: 22, color: ACC, alpha: pa, align: 'left' });
      text('信念  p(θ)', X(mu) + 40, y0 - npdf(mu, mu, 1 / rho) / ym * h - 10, { font: F_SANS, size: 19, color: SILVER, alpha: pa * sstep(.6, 1.2, lt), align: 'left' });
      tex('bfny', 1440, 340, 36, pa * sstep(1.2, 1.9, lt));
      tex('bfnrho', 1440, 460, 40, pa * sstep(2.2, 2.9, lt), 'center', .3);
      tex('bfnmu', 1440, 600, 36, pa * sstep(3, 3.7, lt));
    }
    // molecule: coordinate clouds sharpen, atom-type distributions collapse
    const ma = sstep(7.5, 8.2, lt);
    if (ma <= 0) return;
    const { m, P0, E1, E2, EC, xi, sel } = BFNS, t = sstep(7.9, 12.3, lt), K = CATS.length;
    const beta = 400 ** t - 1, g = beta / (1 + beta), sig = Math.sqrt(1 / (1 + beta)) * 3.2, bd = 6 * t * t;
    const mu = P0.map((p, i) => p.map((v, k) => g * v + Math.sqrt(g * (1 - g) + 1e-9) * E1[i][k] * 3));
    const TH = xi.map((x, i) => { const l = CATS.map((_, c) => bd * (K * (c === x) - 1) + Math.sqrt(bd * K + 1e-9) * E2[i][c]), mx = Math.max(...l), e = l.map(v => Math.exp(v - mx)), z = e.reduce((s, v) => s + v, 0); return e.map(v => v / z); });
    const CC = CATS.map(c => ELEM[c]), cols = TH.map(th => [0, 1, 2].map(k => th.reduce((s, p, c) => s + p * CC[c][k], 0)));
    const cam = { yaw: .3 + lt * .2, pitch: .25, cx: 680, cy: 520, F: 1500, D: 30 };
    add(() => { mu.forEach((p, i) => EC[i].forEach(e => { const q = proj(p.map((v, k) => v + e[k] * sig * .5), cam.yaw, cam.pitch, cam.cx, cam.cy, cam.F, cam.D); glowDot(q[0], q[1], 9 + 14 * sig / 3.2, cols[i], ma * .22 * (1 - t) ** .7); })); });
    const Q = drawMol3D(mu, m, cam, { a: ma, cols, ba: clamp((t - .55) / .35), r: .3 });
    const ba = ma * (1 - sstep(11.6, 12.2, lt));
    sel.forEach((ai, r) => { const q = Q[ai]; if (q) text(`${r + 1}`, q[0] + 18, q[1] - 18, { font: F_MONO, size: 16, color: ACC, alpha: ba }); });
    text(`t = ${t.toFixed(2)}`, 680, 880, { font: F_MONO, size: 20, color: SILVER, alpha: ba });
    text('坐标（连续） + 原子类型（离散）', 1470, 250, { font: F_ZH, weight: 700, size: 28, color: WHITE, alpha: ba });
    text('CONTINUOUS COORDINATES + DISCRETE TYPES', 1470, 290, { font: F_EN, size: 12, ls: 4, color: GRAY, alpha: ba });
    sel.forEach((ai, r) => {
      const y = 420 + r * 120, a = ba * sstep(8 + r * .2, 8.4 + r * .2, lt);
      text(`原子 ${r + 1}`, 1210, y - 12, { font: F_SANS, size: 20, color: SILVER, alpha: a, align: 'left' });
      CATS.forEach((c, k) => {
        const bx = 1340 + k * 72, v = TH[ai][k], hh = 70 * v;
        ctx.fillStyle = rgba(RGB.G, .3 * a); ctx.fillRect(bx, y + 20, 48, 2);
        ctx.fillStyle = rgba(k === xi[ai] ? mixc(RGB.W, RGB.A, t) : RGB.S, a * (.35 + .6 * v)); ctx.fillRect(bx, y + 20 - hh, 48, hh);
        text(c, bx + 24, y + 40, { font: F_SANS, weight: 500, size: 17, color: k === xi[ai] && t > .8 ? WHITE : GRAY, alpha: a });
      });
    });
    METHODS.forEach(([en, zh], i) => {
      const a = sstep(12.2 + i * .35, 12.6 + i * .35, lt), y = 360 + i * 110, dx = 30 * (1 - eout(a)), last = i === 3;
      ctx.fillStyle = rgba(last ? RGB.A : RGB.S, a); ctx.fillRect(1240 + dx, y - 30, 2, 60);
      text(en, 1270 + dx, y - 8, { font: F_EN, size: 40, ls: 1, color: WHITE, alpha: a, align: 'left' });
      text(zh, 1272 + dx, y + 26, { font: F_SANS, size: 19, color: last ? ACC : GRAY, alpha: a, align: 'left' });
    });
  } });
