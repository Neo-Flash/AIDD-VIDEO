'use strict';
// ======================================================================== S5 图神经网络 · S6 Transformer

function molAdj(m) { const A = m.atoms.map(() => []); for (const [i, j] of m.kb) { A[i].push(j); A[j].push(i); } return A; }
function hops(A, s) { const d = A.map(() => 1e9); d[s] = 0; const q = [s]; while (q.length) { const u = q.shift(); for (const v of A[u]) if (d[v] > d[u] + 1) { d[v] = d[u] + 1; q.push(v); } } return d; }
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹', SUB = '₀₁₂₃₄₅₆₇₈₉';

// ---- S5: a molecule is a graph → message passing → pooled readout → properties
const GNN = { cx: 590, cy: 560, s: 62, focus: 8, R: [4, 6, 8], PV: [1120, 710] };
const GNN_OUT = [['毒性', 'TOXICITY', .12], ['活性', 'ACTIVITY', .87], ['结合亲和力', 'BINDING AFFINITY', .74]];
let GNNS = null;
scene({ start: 34, len: 7, ch: ['IV', '图神经网络', 'GRAPH NEURAL NETWORKS'],
  subs: [[.4, 3.8, '分子天然就是一张图：原子是节点，化学键是边。', 'A molecule is a graph: atoms are nodes, bonds are edges.'],
    [4, 8.2, '图神经网络让每个原子，向邻居传递消息。', 'A GNN lets every atom pass messages to its neighbours.'],
    [8.4, 12, '一轮又一轮，原子看到的化学环境越来越大。', 'Round after round, each atom sees more of its chemistry.'],
    [12.2, 18.3, '最后汇总成整张图的表示，预测毒性、活性、结合力。', 'Pooled into one vector, it predicts toxicity, activity, binding.']],
  sfx: [[.3, 'quill', { dur: 2 }], [2.5, 'glass'], [2.6, 'shimmer'], ...GNN.R.flatMap((r, k) => [[r, 'tracks', { dur: .9 }], [r + .9, 'blip', { midi: 74 + k * 4 }]]),
    [11.2, 'suck'], [12.3, 'ding', { midi: 86 }], ...GNN_OUT.map((_, i) => [13.3 + i * .5, 'pop', { midi: 72 + i * 4 }]), [15, 'success']],
  cam: camPush(.03),
  init() {
    const m = MOL.melatonin, A = molAdj(m), r = mulberry(41);
    const emb = { C: Array.from({ length: 8 }, () => .1 + .15 * r()), N: Array.from({ length: 8 }, () => .3 + .7 * r()), O: Array.from({ length: 8 }, () => .2 + .6 * r()) };
    const Hs = [m.atoms.map(e => emb[e].slice())];
    for (let k = 0; k < 3; k++) { const h = Hs[k]; Hs.push(h.map((v, i) => v.map((x, d) => .4 * x + .6 * A[i].reduce((s, j) => s + h[j][d], 0) / A[i].length))); }
    const pool = Hs[3][0].map((_, d) => Hs[3].reduce((s, v) => s + v[d], 0) / Hs[3].length);
    GNNS = { m, A, Hs, pool, D: hops(A, GNN.focus), P: m.p2.map(([x, y]) => [GNN.cx + x * GNN.s, GNN.cy - y * GNN.s]) };
  },
  draw(lt) {
    const { m, Hs, D, P } = GNNS, n = P.length, R = GNN.R;
    const g = sstep(2.5, 4, lt), pool = sstep(11, 12.4, lt), ga = 1 - .6 * pool;
    const hv = i => { let v = Hs[0][i]; for (let r = 0; r < 3; r++) { const e = sstep(R[r] + .8, R[r] + 1.3, lt); if (e > 0) v = v.map((x, d) => lerp(x, Hs[r + 1][i][d], e)); } return v; };
    const bright = i => clamp(hv(i).reduce((s, x) => s + x, 0) / 8 * 1.6);
    const rf = i => D[i] === 0 ? sstep(3.6, 4.3, lt) : D[i] <= 3 ? sstep(R[D[i] - 1] + .8, R[D[i] - 1] + 1.3, lt) : 0;
    const fa = sstep(3.8, 4.4, lt) * (1 - sstep(10.6, 11.2, lt));
    add(() => glowDot(GNN.cx, GNN.cy, 520, [110, 140, 190], .06 * sstep(0, 2, lt)));
    drawMol2D(m, GNN.cx, GNN.cy, GNN.s, { a: 1 - .82 * g, rev: clamp(lt / 2.2), labels: 1 - g });
    if (g <= 0) return;
    // edges (inside the receptive field they turn blue)
    ctx.save(); ctx.lineCap = 'round';
    for (const [i, j] of m.kb) {
      const f = Math.min(rf(i), rf(j)) * fa;
      line(P[i][0], P[i][1], P[j][0], P[j][1], mixc(RGB.S, RGB.A, f), g * ga * (.45 + .35 * f), 2.2);
    }
    ctx.restore();
    // messages along every edge, both ways
    R.forEach(r => {
      const u = (lt - r) / .9; if (u <= 0 || u >= 1) return;
      const e = eio(u), al = Math.sin(PI * u) * g;
      add(() => { for (const [i, j] of m.kb) { glowDot(lerp(P[i][0], P[j][0], e), lerp(P[i][1], P[j][1], e), 13, RGB.W, al * .9); glowDot(lerp(P[j][0], P[i][0], e), lerp(P[j][1], P[i][1], e), 13, RGB.W, al * .9); } });
    });
    // nodes
    for (let i = 0; i < n; i++) {
      const [x, y] = P[i], gr = eout(clamp((lt - 2.6 - i * .05) / .5)), rr = 17 * gr; if (rr <= .5) continue;
      const b = bright(i), f = rf(i) * fa, fl = R.reduce((s, r) => s + (lt > r + .9 ? Math.exp(-(lt - r - .9) * 4) : 0), 0);
      if (f > 0) add(() => glowDot(x, y, i === GNN.focus ? 70 : 42, RGB.A, (i === GNN.focus ? .45 : .22) * f));
      if (fl > .02) add(() => glowDot(x, y, 30, RGB.W, .4 * fl * g));
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(mixc(RGB.S, RGB.A, f), g * ga); ctx.lineWidth = i === GNN.focus ? 2.6 : 1.8; ctx.stroke();
      ctx.fillStyle = rgba(mixc(RGB.G, RGB.W, b), g * ga * (.35 + .65 * b)); ctx.beginPath(); ctx.arc(x, y, rr * .6, 0, TAU); ctx.fill();
      if (m.atoms[i] !== 'C') text(m.atoms[i], x + 22, y - 20, { font: F_SANS, weight: 500, size: 16, color: SILVER, alpha: g * ga * .8 });
    }
    if (fa > 0) {                                                 // focus ring pulse
      const [x, y] = P[GNN.focus], u = (lt * .75) % 1;
      ctx.strokeStyle = rgba(RGB.A, fa * .6 * (1 - u)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 20 + u * 40, 0, TAU); ctx.stroke();
    }
    // right panel: round counter, update rule, the focus atom's feature vector
    const PX0 = 1450, ra = sstep(4, 4.6, lt) * (1 - sstep(10.6, 11.2, lt));
    let k = 0; R.forEach((r, i) => { if (lt >= r) k = i + 1; });
    let kd = 0; R.forEach((r, i) => { if (lt >= r + 1.1) kd = i + 1; });
    text(`第 ${Math.max(1, k)} 轮消息传递`, PX0, 240, { font: F_ZH, weight: 700, size: 32, color: WHITE, alpha: ra });
    text(`MESSAGE PASSING · ROUND ${Math.max(1, k)} / 3`, PX0, 282, { font: F_EN, size: 15, ls: 5, color: GRAY, alpha: ra });
    tex('mp', PX0, 385, 34, sstep(4.5, 5.3, lt) * (1 - .5 * pool));
    const va = sstep(5, 5.6, lt) * (1 - sstep(10.6, 11.2, lt));
    if (va > 0) {
      const h = hv(GNN.focus), cw = 34, x0 = PX0 - (8 * cw + 7 * 6) / 2 + 40;
      text(`h${SUB[8]}⁽${SUP[kd]}⁾`, x0 - 60, 520, { font: F_MATH, style: 'italic', size: 34, color: WHITE, alpha: va });
      h.forEach((v, d) => {
        ctx.fillStyle = rgba(mixc(RGB.G, RGB.A, clamp(v)), va * (.25 + .75 * clamp(v))); ctx.fillRect(x0 + d * (cw + 6), 503, cw, cw);
        ctx.strokeStyle = rgba(RGB.S, va * .4); ctx.lineWidth = 1; ctx.strokeRect(x0 + d * (cw + 6), 503, cw, cw);
      });
      const nf = D.filter(d => d <= kd).length;
      text(`感受野  ${kd} 跳 · 覆盖 ${nf} / ${n} 个原子`, PX0, 590, { font: F_SANS, size: 21, color: SILVER, alpha: va });
      text(`RECEPTIVE FIELD · ${kd}-HOP`, PX0, 624, { font: F_EN, size: 13, ls: 4, color: GRAY, alpha: va });
    }
    // readout: every node flows into one graph vector, which feeds the property heads
    if (lt > 11) {
      const [px, py] = GNN.PV, ch = 18, top = py - (8 * ch + 7 * 2) / 2;
      add(() => { for (let i = 0; i < n; i++) {
        const u = eio(clamp((lt - 11.2 - i * .035) / 1.1)); if (u <= 0 || u >= 1) continue;
        const ty = top + (i % 8) * (ch + 2) + ch / 2, sw = Math.sin(PI * u) * 60;
        glowDot(lerp(P[i][0], px, u), lerp(P[i][1], ty, u) - sw, 12, RGB.W, .9 * Math.sin(PI * u) + .1);
      } });
      const pa = sstep(12.1, 12.5, lt);
      GNNS.pool.forEach((v, d) => { ctx.fillStyle = rgba(mixc(RGB.G, RGB.W, clamp(v * 1.4)), pa * (.3 + .7 * clamp(v * 1.4))); ctx.fillRect(px - 12, top + d * (ch + 2), 24, ch); });
      ctx.strokeStyle = rgba(RGB.S, pa * .7); ctx.lineWidth = 1.2; ctx.strokeRect(px - 16, top - 4, 32, 8 * ch + 7 * 2 + 8);
      text('h', px - 6, top - 30, { font: F_MATH, style: 'italic', size: 30, color: WHITE, alpha: pa });
      text('G', px + 10, top - 22, { font: F_MATH, style: 'italic', size: 18, color: WHITE, alpha: pa });
      tex('readout', PX0, 470, 34, sstep(11.4, 12.2, lt));
      GNN_OUT.forEach(([zh, en, v], i) => {
        const y = 640 + i * 70, oa = sstep(13.1 + i * .5, 13.5 + i * .5, lt), bx = 1440, bw = 280, pr = (lt - 13.2 - i * .5) / .8;
        arrow(px + 22, py, 1188, y, RGB.G, oa * .6, 1.2, 8);
        text(zh, 1200, y - 8, { font: F_SANS, size: 23, color: WHITE, alpha: oa, align: 'left' });
        text(en, 1200, y + 18, { font: F_EN, size: 11, ls: 3, color: GRAY, alpha: oa, align: 'left' });
        ctx.fillStyle = rgba(RGB.G, .35 * oa); ctx.fillRect(bx, y - 1, bw, 3);
        ctx.fillStyle = rgba(i === 1 ? RGB.A : RGB.W, .95 * oa); ctx.fillRect(bx, y - 1, bw * v * eout(clamp(pr)), 3);
        text(rollNum(v, pr, 2), 1790, y, { font: F_MONO, size: 22, color: WHITE, alpha: oa, align: 'right' });
      });
    }
  } });

// ---- S6: SMILES as tokens, attention between every pair
const SMI = 'CC(=O)Oc1ccccc1C(=O)O';
const TOK = { x0: 188, w: 64, gap: 10, y: 340 };
const tokX = i => TOK.x0 + TOK.w / 2 + i * (TOK.w + TOK.gap);
const T_Q = [8, 2, 16, 7, 1, 18, 4, 14];
const TMOL = { cx: 960, cy: 700, s: 52 };
const TAGS = [['ChemBERTa', '分子性质预测', 'PROPERTY PREDICTION'], ['MolGPT', '分子生成', 'MOLECULE GENERATION'], ['ESM', '蛋白质语言模型', 'PROTEIN LANGUAGE MODEL'], ['AlphaFold', '蛋白质结构预测', 'STRUCTURE PREDICTION']];
let TFM = null;
function drawTokens(lt, a, wn, q) {
  [...SMI].forEach((c, i) => {
    const x = tokX(i), y = TOK.y, ta = a * sstep(.3 + i * .05, .5 + i * .05, lt); if (ta <= 0) return;
    const w = wn ? wn[i] : 0, isq = i === q;
    ctx.save(); ctx.globalAlpha = ta;
    ctx.fillStyle = isq ? 'rgba(127,180,255,.2)' : `rgba(255,255,255,${.03 + .16 * w})`; rrect(x - TOK.w / 2, y - 36, TOK.w, 72, 6); ctx.fill();
    ctx.strokeStyle = isq ? ACC : rgba(mixc(RGB.G, RGB.W, w), .8); ctx.lineWidth = isq ? 2 : 1.2; ctx.stroke(); ctx.restore();
    text(c, x, y + 1, { font: F_MONO, size: 34, weight: 500, color: isq ? ACC : /[A-Za-z]/.test(c) ? WHITE : SILVER, alpha: ta });
  });
}
function drawArcs(q, wn, a) {
  if (a <= 0) return;
  ctx.save(); ctx.lineCap = 'round';
  wn.forEach((v, k) => {
    if (k === q) return;
    const x0 = tokX(q), x1 = tokX(k), y = TOK.y - 40, h = 26 + Math.min(Math.abs(x1 - x0) * .2, 170);
    ctx.strokeStyle = rgba(mixc(RGB.G, RGB.A, v), a * (.12 + .85 * v)); ctx.lineWidth = .8 + 6 * v;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo((x0 + x1) / 2, y - h * 2, x1, y); ctx.stroke();
  });
  ctx.restore();
}
scene({ start: 41, len: 6, ch: ['V', 'Transformer', 'ATTENTION IS ALL YOU NEED'],
  subs: [[.4, 3.6, '分子也可以写成一串字符：SMILES。', 'A molecule can also be written as text: SMILES.'],
    [3.8, 8, 'Transformer 用注意力，让每个字符看见所有其他字符。', 'A Transformer uses attention: every token sees every other.'],
    [8.2, 12, '成环、分支、官能团，远距离的关系一次抓住。', 'Rings, branches, functional groups — long-range links in one step.'],
    [12.2, 15.6, '蛋白质语言模型、AlphaFold，背后都是注意力。', 'Protein language models and AlphaFold run on attention.']],
  sfx: [[.3, 'data', { dur: 1.2 }], [1.4, 'glass'], ...T_Q.map((_, i) => [2.5 + i * BEAT, 'blip', { midi: [74, 77, 81, 79, 74, 77, 81, 86][i] }]),
    [8, 'whoosh', { dur: .8 }], [8.3, 'scan', { dur: 2.2 }], [10.4, 'ding', { midi: 86 }], ...TAGS.map((_, i) => [13 + i * .4, 'pop', { midi: 72 + i * 3 }]), [14.8, 'shimmer']],
  cam: camArc(.03),
  init() {
    const m = MOL.aspirin, ch = [...SMI]; let a = 0;
    const t2a = ch.map(c => /[A-Za-z]/.test(c) ? a++ : -1);
    const bonded = new Set(m.kb.flatMap(([i, j]) => [i + ',' + j, j + ',' + i]));
    const pairs = new Set(['8,14', '14,8', '2,5', '5,2', '16,19', '19,16']);
    const sc = (q, k) => {
      let s = 1.1 * Math.exp(-Math.abs(q - k) / 1.4) + (q === k ? .6 : 0);
      if (pairs.has(q + ',' + k)) s += 3.6;
      if (ch[q] === 'c' && ch[k] === 'c') s += .8;
      if (t2a[q] >= 0 && t2a[k] >= 0 && bonded.has(t2a[q] + ',' + t2a[k])) s += 1.6;
      if (/\d/.test(ch[q]) && (t2a[k] === 4 || t2a[k] === 9)) s += 1.4;
      if (ch[q] === 'O' && ch[k] === 'O') s += .9;
      return s;
    };
    const Wm = ch.map((_, q) => { const e = ch.map((_, k) => Math.exp(1.5 * sc(q, k))), z = e.reduce((s, v) => s + v, 0); return e.map(v => v / z); });
    const qAtoms = q => t2a[q] >= 0 ? [t2a[q]] : /\d/.test(ch[q]) ? [4, 9] : ch[q] === '(' ? [t2a[q - 1], t2a[q + 2]] : [];
    const P = m.p2.map(([x, y]) => [TMOL.cx + x * TMOL.s, TMOL.cy - y * TMOL.s]);
    TFM = { m, t2a, Wm, qAtoms, P };
  },
  draw(lt) {
    const { m, t2a, Wm, qAtoms, P } = TFM;
    const qi = clamp(Math.floor((lt - 2.5) / BEAT), 0, 7), f = (lt - 2.5) / BEAT - qi, att = lt > 2.5;
    const late = lt > 13 ? (Math.floor((lt - 13) / BEAT) * 5 + 3) % 21 : -1;
    const q = late >= 0 ? late : att ? T_Q[qi] : -1, wq = q >= 0 ? Wm[q] : null;
    const aa = (att ? sstep(0, .25, lt < 8 ? f : 1) : 0) * (lt < 8 ? 1 : lt < 13 ? .25 : .45);
    const mxw = wq ? Math.max(...wq.filter((_, k) => k !== q)) : 1, wn = wq ? wq.map((w, k) => k === q ? 0 : w / mxw) : null;
    if (wn) drawArcs(q, wn, aa);
    drawTokens(lt, 1, wn && lt < 8 ? wn : null, lt < 8 || lt > 13 ? q : -1);
    // molecule with token ↔ atom correspondence
    const ma = sstep(.6, 1.6, lt) * (1 - sstep(8, 8.7, lt));
    if (ma > 0) {
      const hl = new Array(m.atoms.length).fill(0), qa = att ? qAtoms(q) : [];
      if (wn) wn.forEach((w, k) => { if (t2a[k] >= 0) hl[t2a[k]] = Math.max(hl[t2a[k]], w); });
      drawMol2D(m, TMOL.cx, TMOL.cy, TMOL.s, { a: ma, rev: clamp((lt - .6) / 1.4) });
      add(() => {
        hl.forEach((w, i) => { if (w > .05) glowDot(P[i][0], P[i][1], 30, RGB.W, .5 * w * ma * aa); });
        qa.forEach(i => glowDot(P[i][0], P[i][1], 46, RGB.A, .75 * ma * sstep(0, .2, f)));
      });
      const la = ma * win(lt, 1.3, 2.9, .3, .4);
      if (la > 0) { ctx.save(); ctx.setLineDash([3, 6]); [...SMI].forEach((c, i) => { if (t2a[i] >= 0) line(tokX(i), TOK.y + 38, P[t2a[i]][0], P[t2a[i]][1], RGB.S, la * .35, 1); }); ctx.restore(); }
      if (att && lt < 8) {
        const c = SMI[q], kind = /\d/.test(c) ? '环闭合' : c === '(' || c === ')' ? '分支' : c === '=' ? '双键' : '原子';
        text(`查询  Query  “${c}”  ·  ${kind}`, TMOL.cx, 470, { font: F_SANS, size: 22, color: SILVER, alpha: ma * sstep(0, .2, f) });
      }
    }
    // attention matrix + formula
    const hm = sstep(8.3, 8.9, lt) * (1 - sstep(12.6, 13.2, lt));
    if (hm > 0) {
      const N = 21, cs = 17, x0 = 640 - N * cs / 2, y0 = 680 - N * cs / 2;
      for (let r = 0; r < N; r++) {
        const mx = Math.max(...Wm[r]);
        for (let c = 0; c < N; c++) {
          const v = Wm[r][c] / mx, e = hm * sstep(8.4 + (r + c) * .025, 8.7 + (r + c) * .025, lt);
          if (e <= 0) continue;
          ctx.fillStyle = rgba(mixc(RGB.G, v > .6 ? RGB.A : RGB.W, v), e * (.06 + .94 * v * v)); ctx.fillRect(x0 + c * cs + 1, y0 + r * cs + 1, cs - 2, cs - 2);
        }
        text(SMI[r], x0 - 14, y0 + r * cs + cs / 2, { font: F_MONO, size: 12, color: GRAY, alpha: hm });
        text(SMI[r], x0 + r * cs + cs / 2, y0 - 14, { font: F_MONO, size: 12, color: GRAY, alpha: hm });
      }
      text('Query', x0 - 44, 680, { font: F_EN, size: 13, ls: 3, color: GRAY, alpha: hm, align: 'right' });
      text('Key', 640, y0 - 38, { font: F_EN, size: 13, ls: 3, color: GRAY, alpha: hm });
      const pa = hm * sstep(10.4, 10.9, lt);
      [[8, 14], [14, 8], [2, 5], [5, 2], [16, 19], [19, 16]].forEach(([r, c], i) => {
        const pu = .6 + .4 * Math.sin(lt * 5 + i);
        ctx.strokeStyle = rgba(RGB.A, pa * pu); ctx.lineWidth = 2; ctx.strokeRect(x0 + c * cs - 2, y0 + r * cs - 2, cs + 4, cs + 4);
        add(() => glowDot(x0 + c * cs + cs / 2, y0 + r * cs + cs / 2, 20, RGB.A, pa * .5 * pu));
      });
      tex('attn', 1400, 540, 38, hm * sstep(8.6, 9.4, lt), 'center', .3);
      [['环闭合  ring closure', '1 ↔ 1'], ['分支  branch', '( ↔ )']].forEach(([s, e], i) => {
        const y = 690 + i * 50; ctx.fillStyle = rgba(RGB.A, pa); ctx.fillRect(1180, y - 7, 14, 14);
        text(s, 1212, y, { font: F_SANS, size: 22, color: SILVER, alpha: pa, align: 'left' });
        text(e, 1620, y, { font: F_MONO, size: 22, color: WHITE, alpha: pa, align: 'right' });
      });
    }
    // where attention lives
    TAGS.forEach(([name, zh, en], i) => {
      const ta = sstep(13 + i * .4, 13.5 + i * .4, lt), x = 330 + i * 420, y = 670, dy = 30 * (1 - eout(ta));
      if (ta <= 0) return;
      ctx.save(); ctx.globalAlpha = ta; ctx.strokeStyle = 'rgba(180,188,200,.3)'; ctx.lineWidth = 1.2; rrect(x - 180, y - 90 + dy, 360, 180, 6); ctx.stroke();
      ctx.fillStyle = ACC; ctx.fillRect(x - 150, y - 91 + dy, 44 * eout(ta), 2); ctx.restore();
      text(name, x, y - 22 + dy, { font: F_EN, size: 44, ls: 2, color: WHITE, alpha: ta });
      text(zh, x, y + 30 + dy, { font: F_SANS, size: 22, color: SILVER, alpha: ta });
      text(en, x, y + 62 + dy, { font: F_EN, size: 12, ls: 4, color: GRAY, alpha: ta });
    });
  } });
