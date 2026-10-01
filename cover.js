'use strict';
// ======================================================================== 4:3 cover: drawn in the centre 1440×1080 of the 16:9 frame, then cropped
const CW = 1440, CX = CW / 2, OX = (W - CW) / 2;
function drawCover() {
  ctx.setTransform(PX, 0, 0, PX, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  starfield(3, .45, 0);
  ctx.save(); ctx.translate(OX, 70);              // no course row any more: shift everything down to re-centre
  // molecule floating above the title
  const m = MOL.osimertinib;
  add(() => glowDot(CX, 400, 600, [110, 140, 190], .13));
  drawMol3D(m.p3, m, { yaw: .5, pitch: .42, cx: CX, cy: 395, F: 1300, D: 30 }, { a: .45, r: .34 });
  ctx.save(); const g = ctx.createLinearGradient(0, 380, 0, 630); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.92)'); ctx.fillStyle = g; ctx.fillRect(-OX, 380, W, 260); ctx.restore();
  // faint formulas at the edges
  [['yfx', 150, 330, 22], ['attn', 1270, 330, 14], ['fmode', 170, 560, 14], ['elbo', 1270, 560, 11]].forEach(([n, x, y, s]) => tex(n, x, y, s, .16));
  // header: 小闪电, big, with a lightning bolt
  const hx = CX + 30, hy = 128, bx = hx - 225, B = [[18, -52], [-14, 6], [4, 6], [-12, 54], [22, -10], [4, -10], [18, -52]].map(([x, y]) => [bx + x, hy + y]);
  add(() => glowDot(hx - 40, hy, 360, RGB.A, .16));
  add(() => { ctx.save(); ctx.shadowColor = 'rgba(127,180,255,.9)'; ctx.shadowBlur = 26; ctx.fillStyle = ACC; ctx.beginPath(); B.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.restore(); });
  flare(hx, hy, .22, 520);
  titleWord('小闪电', hx, hy, 104, 2.4, 0, .08, 24, 1, .45);
  text('XIAO  SHANDIAN   ·   AIDD 系列课程', CX, 214, { font: F_SANS, size: 20, ls: 8, color: SILVER });
  ctx.fillStyle = ACC; ctx.fillRect(CX - 18, 246, 36, 2);
  // title
  flare(CX, 598, .35, 760);
  titleWord('AI 药物设计', CX, 598, 176, 2.4, 0, .08, 30, 1, .4);
  text('AI-DRIVEN  DRUG  DESIGN', CX, 722, { font: F_EN, size: 30, ls: 18, color: SILVER });
  ctx.fillStyle = rgba(RGB.S, .4); ctx.fillRect(CX - 280, 772, 560, 1);
  ctx.fillStyle = ACC; ctx.fillRect(CX - 24, 771, 48, 3);
  text('从分子到函数，从函数到新药', CX, 826, { font: F_ZH, weight: 700, size: 34, ls: 10, color: WHITE });
  ctx.restore();
}
function renderCover() {
  drawCover(); accumulate(0, 1); post(0, { ...GRADE, grain: .02 });
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(glc, 0, 0); ctx.globalCompositeOperation = 'source-over';
  const out = document.createElement('canvas'); out.width = CW * PX; out.height = H * PX;
  out.getContext('2d').drawImage(cv, OX * PX, 0, CW * PX, H * PX, 0, 0, CW * PX, H * PX);
  return out;
}
const FONTS = [`900 40px "Songti SC"`, `700 40px "Songti SC"`, `500 40px "PingFang SC"`, `400 40px "Didot"`];
Promise.all([texReady, ...FONTS.map(f => document.fonts.load(f, '药物设计ABC'))]).catch(() => {}).then(() => document.fonts.ready).then(() => { fontsReady = true; renderCover(); });
window.__ready = () => fontsReady;
window.__duration = 1;
window.__frame = () => renderCover().toDataURL('image/png');
