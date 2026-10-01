'use strict';
// ======================================================================== S0 cold open · S1 小闪电 + course cards

// ---- S0: heartbeat → flash-cut teasers → a molecule → it dissolves into y = f(x)
const TEASE = [[2, 7.2], [3, 14.5], [4, 11], [5, 7], [6, 5.5], [9, 3.2], [10, 8.5], [11, 10.5]];
const TWORDS = ['y = f(x)', 'σ(Wx + b)', 'Σ ReLU', 'message passing', 'Attention', '∇ log p(x)', 'dx/dt = v', 'p(θ | y)'];
const YFX = { x: W / 2, y: 520, size: 150 };
let S0P = null;
function yfxPts() {
  return textPts('yfx', x => { const w = texW('yfx', YFX.size), h = window.TEX.yfx.h * YFX.size / 10; x.drawImage(TEXIMG.yfx, YFX.x - w / 2, YFX.y - h / 2, w, h); }, 3, 1500, 11);
}
function caffCam(lt) { return { yaw: .5 + lt * .32, pitch: .35 + .1 * Math.sin(lt * .4), cx: W / 2, cy: 500, F: 12 * 72, D: 12 }; }
scene({ start: 0, len: 5, fi: .2, fo: .3, mb: 2,
  subs: [[6.8, 10.3, '一个分子，能不能成为一颗药？', 'Can a molecule become a medicine?'], [10.5, 13.1, '答案，藏在一个函数里。', 'The answer hides inside a function.']],
  sfx: [[.05, 'heart'], [.72, 'heart'], ...TEASE.map((_, i) => [1.333 + i * BEAT, i % 2 ? 'tick' : 'glitch']), [6.67, 'swell', { dur: 2.5 }], [10.4, 'suck'], [10.67, 'sparkle', { dur: 2.2 }], [12.4, 'ding', { midi: 81 }]],
  cam: (lt) => ({ z: lt < 1.33 ? 1 : lt < 6.67 ? 1 : 1 + .05 * (lt - 6.67) / 6.7 }),
  shot: lt => lt < 1.333 ? -1 : lt < 6.667 ? Math.floor((lt - 1.333) / BEAT) : 99,
  init() {
    const m = MOL.caffeine, cam = caffCam(10.67), Q = m.p3.map(p => proj(p, cam.yaw, cam.pitch, cam.cx, cam.cy, cam.F, cam.D)), r = mulberry(3);
    S0P = yfxPts().map((p, i) => { const q = Q[i % Q.length]; return { tx: p[0], ty: p[1], sx: q[0] + gauss(r) * 14, sy: q[1] + gauss(r) * 14, d: r() * .5, z: .5 + r() * .5 }; });
  },
  draw(lt) {
    if (lt < 1.333) {                                          // two heartbeats in the dark
      for (const tb of [.05, .72]) {
        const u = lt - tb; if (u < 0) continue;
        add(() => glowDot(W / 2, H / 2, 40 + 30 * Math.exp(-u * 8), RGB.W, .9 * Math.exp(-u * 3.5) + .15));
        ctx.strokeStyle = `rgba(230,236,245,${.5 * Math.exp(-u * 2.5)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(W / 2, H / 2, 20 + u * 420, 0, TAU); ctx.stroke();
      }
      return;
    }
    if (lt < 6.667) {                                          // flash cuts on the beat
      const bi = Math.min(7, Math.floor((lt - 1.333) / BEAT)), f = (lt - 1.333) / BEAT - bi, [si, t0] = TEASE[bi];
      ctx.save(); const z = 1.1 - .1 * eout(clamp(f * 1.4)); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = .55; SC[si].draw(t0 + f * BEAT, SC[si].d); ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H);
      glitchText(TWORDS[bi], W / 2, H / 2, bi === 3 ? 96 : 120, sstep(0, .06, f) * (1 - sstep(.85, 1, f)), F_MATH, bi + Math.floor(f * 6));
      ctx.fillStyle = `rgba(255,255,255,${.12 * (1 - clamp(f * 6))})`; ctx.fillRect(0, 0, W, H);
      return;
    }
    const m = MOL.caffeine, cam = caffCam(Math.min(lt, 10.67));
    const ma = sstep(6.7, 7.6, lt) * (1 - sstep(10.55, 10.75, lt));
    if (ma > 0) {
      add(() => glowDot(W / 2, 500, 420, [120, 140, 170], .12 * ma));
      drawMol3D(m.p3, m, cam, { a: ma, r: .36 });
      text('C₈H₁₀N₄O₂', W / 2, 800, { font: F_MATH, size: 30, ls: 6, color: GRAY, alpha: ma * sstep(7.4, 8.4, lt) });
    }
    if (lt > 10.55 && S0P) {                                   // atoms burst into particles that write y = f(x)
      const k = lt - 10.6;
      add(() => {
        ctx.fillStyle = '#fff';
        for (const p of S0P) {
          const e = eexpo(clamp((k - p.d * .6) / 1.3)), sw = Math.sin(PI * e) * 90 * (p.z - .75);
          const x = lerp(p.sx, p.tx, e) + sw, y = lerp(p.sy, p.ty, e) - sw * .5;
          ctx.globalAlpha = (.35 + .5 * p.z) * clamp(k * 4) * (1 - sstep(2.2, 2.7, k) * .85);
          const r = 1.5 + 1.8 * (1 - e); ctx.fillRect(x - r / 2, y - r / 2, r, r);
        }
      });
      tex('yfx', YFX.x, YFX.y, YFX.size, sstep(1.9, 2.6, k), 'center', .5);
    }
  } });

// ---- S1: lightning → 我是小闪电 → AIDD101 / 201 / 301
const BOLT = (() => {
  const r = mulberry(77); let pts = [[1150, -40], [870, 640]];
  for (let it = 0; it < 6; it++) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); out.push([(a[0] + b[0]) / 2 + (r() - .5) * L * .45, (a[1] + b[1]) / 2 + (r() - .5) * L * .12], b); }
    pts = out;
  }
  return pts;
})();
const CARDS = [
  { code: 'AIDD101', zh: '基础', en: 'FOUNDATIONS', items: ['万物皆函数', 'MLP → DNN', '万能逼近定理'] },
  { code: 'AIDD201', zh: '表示', en: 'REPRESENTATION', items: ['图神经网络 GNN', 'Transformer', '注意力机制'] },
  { code: 'AIDD301', zh: '生成', en: 'GENERATION', items: ['VAE · Diffusion', 'Flow Matching', '贝叶斯流 BFN'] },
];
function courseCard(c, x, y, a, lt, hl = 0) {
  if (a <= 0) return;
  const w = 440, h = 330, e = eout(clamp(a));
  ctx.save(); ctx.globalAlpha = clamp(a);
  ctx.translate(x, y + 40 * (1 - e));
  ctx.fillStyle = 'rgba(255,255,255,.025)'; rrect(-w / 2, -h / 2, w, h, 6); ctx.fill();
  ctx.strokeStyle = `rgba(180,188,200,${.28 + .3 * hl})`; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = ACC; ctx.fillRect(-w / 2 + 34, -h / 2 - 1, 60 * e, 2);
  ctx.restore();
  const A = clamp(a), yy = y + 40 * (1 - e);
  const cw = textW(c.code, 56, F_EN, 400, 4);
  ctx.save(); ctx.font = `400 56px ${F_EN}`; ctx.letterSpacing = '4px'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.globalAlpha = A;
  const cx0 = x - w / 2 + 34; ctx.fillStyle = silverGrad(cx0, 0, cx0 + cw, 0, ((lt * .35) % 1.6) - .3); ctx.fillText(c.code, cx0, yy - 92); ctx.restore();
  text(c.zh, x - w / 2 + 36, yy - 28, { font: F_ZH, weight: 700, size: 32, color: WHITE, alpha: A, align: 'left' });
  text(c.en, x - w / 2 + 36 + 76, yy - 26, { font: F_EN, size: 15, ls: 5, color: GRAY, alpha: A, align: 'left' });
  c.items.forEach((s, i) => {
    const ia = A * sstep(.5 + i * .15, .9 + i * .15, a * 1.6);
    ctx.fillStyle = rgba(RGB.S, ia * .8); ctx.fillRect(x - w / 2 + 38, yy + 30 + i * 44 - 1, 10, 2);
    text(s, x - w / 2 + 62, yy + 30 + i * 44, { font: F_SANS, size: 24, color: SILVER, alpha: ia, align: 'left' });
  });
}
scene({ start: 5, len: 6, fi: .01, fo: .6, mb: 2,
  subs: [[.9, 5, '我是小闪电。', "I'm Xiao Shandian."], [5.4, 10.4, '在我的 AIDD101、AIDD201、AIDD301 中，', 'In my courses AIDD101, AIDD201 and AIDD301,'], [10.6, 15.3, '我们会学到以下知识。', 'here is what we will learn.']],
  sfx: [[0, 'boom'], [0, 'zap'], [.35, 'shimmer'], [5.333, 'stamp'], [6.667, 'stamp'], [8, 'stamp'], [10.67, 'chime', { midi: 86 }]],
  cam: (lt, d) => ({ z: 1 + .03 * lt / d }),
  draw(lt) {
    const ba = (lt < .05 ? 1 : Math.exp(-(lt - .05) * 3)) * (1 - sstep(1.2, 1.6, lt));
    if (ba > .01) {
      const n = Math.floor(BOLT.length * clamp(lt / .12 + .2)), flick = .7 + .3 * Math.sin(lt * 120);
      add(() => glowPoly(BOLT.slice(0, n), RGB.A, ba * flick, 3.2));
      add(() => glowDot(870, 640, 260, RGB.A, ba * .5));
    }
    const ta = 1 - sstep(4.9, 5.4, lt);
    if (ta > 0) {
      add(() => glowDot(W / 2, 470, 700, [120, 150, 200], .07 * ta * sstep(.3, 1.5, lt)));
      titleWord('我是小闪电', W / 2, 470, 170, lt, .35, .11, 34, ta, .5);
      text('XIAO  SHANDIAN', W / 2, 610, { font: F_EN, size: 30, ls: 18, color: SILVER, alpha: sstep(1.3, 2.2, lt) * ta });
      const lw = 380 * eout(clamp((lt - 1.1) / 1.2)); ctx.fillStyle = rgba(RGB.S, .5 * ta); ctx.fillRect(W / 2 - lw / 2, 660, lw, 1);
    }
    const ha = sstep(5.1, 5.8, lt) * (1 - sstep(10.2, 10.7, lt));
    text('在我的课程中', W / 2, 250, { font: F_ZH, weight: 700, size: 46, ls: 10, color: WHITE, alpha: ha });
    text('IN MY COURSES', W / 2, 308, { font: F_EN, size: 18, ls: 10, color: GRAY, alpha: ha });
    const la = sstep(10.6, 11.4, lt);
    titleWord('我们会学到以下知识', W / 2, 270, 58, lt, 10.6, .06, 14, la * (1 - sstep(14.8, 15.6, lt)), .2, F_ZH, 700);
    const out = 1 - sstep(14.6, 15.6, lt);
    CARDS.forEach((c, i) => {
      const a = clamp((lt - 5.333 - i * BAR / 2) / .7) * out;
      const hl = Math.exp(-Math.max(0, lt - 5.333 - i * BAR / 2) * 2);
      courseCard(c, W / 2 + (i - 1) * 500, 610, a, lt, hl);
    });
  } });
