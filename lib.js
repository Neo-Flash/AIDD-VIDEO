'use strict';
// ======================================================================== core: 1920×1080 logical canvas rendered at 4K
const W = 1920, H = 1080, PX = 2, BPM = 90, BEAT = 60 / BPM, BAR = BEAT * 4, EIGHTH = BEAT / 2;
const EXPORT = /[?&]export=1/.test(location.search);
const cv = document.getElementById('c'); cv.width = W * PX; cv.height = H * PX;
const ctx = cv.getContext('2d');
const PI = Math.PI, TAU = PI * 2;
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eout = t => 1 - Math.pow(1 - t, 3);
const eexpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
const win = (t, a, b, fi = .5, fo = .5) => sstep(a, a + fi, t) * (1 - sstep(b - fo, b, t));
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash1 = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

// ---- palette: black, white, silver, gray + one cool accent
const WHITE = '#f3f5f8', SILVER = '#b3bac6', GRAY = '#6b7280', DIM = '#2e333b', ACC = '#7fb4ff';
const RGB = { W: [243, 245, 248], S: [179, 186, 198], G: [107, 114, 128], A: [127, 180, 255] };
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const ELEM = { C: [196, 202, 212], O: [255, 255, 255], N: RGB.A, S: [150, 156, 168], F: [150, 156, 168], Cl: [150, 156, 168] };

const F_ZH = '"Songti SC", "STSong", serif';
const F_SANS = '"PingFang SC", "Helvetica Neue", sans-serif';
const F_EN = '"Didot", "Bodoni 72", "Times New Roman", serif';
const F_IT = '"Baskerville", "Times New Roman", serif';
const F_MATH = '"STIX Two Text", "Times New Roman", serif';
const F_MONO = '"SF Mono", "Menlo", monospace';

function text(s, x, y, o = {}) {
  if ((o.alpha ?? 1) <= 0) return;
  ctx.save();
  ctx.font = `${o.style || ''} ${o.weight || 400} ${o.size || 40}px ${o.font || F_ZH}`;
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
  if (o.ls) { ctx.letterSpacing = o.ls + 'px'; if ((o.align || 'center') === 'center') x += o.ls / 2; }
  ctx.globalAlpha = o.alpha ?? 1;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = (o.blur || 24) * PX; }
  ctx.fillStyle = o.color || WHITE;
  ctx.fillText(s, x, y);
  ctx.restore();
}
function textW(s, size, font = F_ZH, weight = 400, ls = 0) { ctx.save(); ctx.font = `${weight} ${size}px ${font}`; ctx.letterSpacing = ls + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; }
function silverGrad(x0, y0, x1, y1, s) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#6d737d'); g.addColorStop(.35, '#d4d9e1');
  if (s > .05 && s < .95) { g.addColorStop(s - .05, '#e6eaf0'); g.addColorStop(s, '#ffffff'); g.addColorStop(s + .05, '#e6eaf0'); }
  g.addColorStop(.7, '#aeb5c1'); g.addColorStop(1, '#5d636c');
  return g;
}
function glowDot(x, y, r, c = RGB.W, a = 1) {
  if (a <= 0 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.18, rgba(c, a * .85)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}
function add(fn) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); }
function line(x0, y0, x1, y1, c, a, w = 2) { ctx.strokeStyle = rgba(c, a); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
function poly(pts, c, a, w = 2, close = false) {
  if (pts.length < 2) return; ctx.strokeStyle = rgba(c, a); ctx.lineWidth = w; ctx.beginPath();
  pts.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1])); if (close) ctx.closePath(); ctx.stroke();
}
function glowPoly(pts, c, a, w = 3) { ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; poly(pts, c, a * .08, w * 6); poly(pts, c, a * .2, w * 2.6); poly(pts, [255, 255, 255], a * .95, w); ctx.restore(); }
function arrow(x0, y0, x1, y1, c, a, w = 2.5, hs = 14) {
  if (a <= 0) return; line(x0, y0, x1, y1, c, a, w);
  const an = Math.atan2(y1 - y0, x1 - x0); ctx.fillStyle = rgba(c, a); ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - Math.cos(an - .42) * hs, y1 - Math.sin(an - .42) * hs); ctx.lineTo(x1 - Math.cos(an + .42) * hs, y1 - Math.sin(an + .42) * hs); ctx.fill();
}
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// ---- LaTeX formulas (tex.js): size = px per em
const TEXIMG = {};
const texReady = Promise.all(Object.entries(window.TEX || {}).map(([k, v]) => new Promise(res => { const im = new Image(); im.onload = res; im.onerror = res; im.src = v.src; TEXIMG[k] = im; })));
function tex(name, x, y, size = 48, a = 1, align = 'center', glow = 0) {
  const T = window.TEX[name], im = TEXIMG[name]; if (!T || !im || a <= 0) return 0;
  const k = size / 10, w = T.w * k, h = T.h * k, x0 = align === 'center' ? x - w / 2 : align === 'left' ? x : x - w;
  ctx.save(); ctx.globalAlpha = a;
  if (glow) { ctx.shadowColor = `rgba(200,220,255,${glow})`; ctx.shadowBlur = 18 * PX; }
  ctx.drawImage(im, x0, y - h / 2, w, h); ctx.restore();
  return w;
}
const texW = (name, size) => window.TEX[name].w * size / 10;

// ======================================================================== WebGL: film post-processing (bloom, grain, vignette)
const GW = W * PX, GH = H * PX;
const glc = document.createElement('canvas'); glc.width = GW; glc.height = GH;
const gl = glc.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: false, premultipliedAlpha: false });
gl.getExtension('EXT_color_buffer_float'); gl.getExtension('OES_texture_float_linear');
const VS = `#version 300 es
in vec2 p; out vec2 vUv; void main() { vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
const HEAD = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform vec2 uRes;
float hash(vec2 p){ uvec2 q=uvec2(ivec2(floor(p))+ivec2(4096))*uvec2(1597334673u,3812015801u); uint n=(q.x^q.y)*1597334673u; n^=n>>16; n*=2246822519u; n^=n>>13; return float(n)*(1./4294967295.); }
`;
const FS_ACC = HEAD + `uniform sampler2D uT; uniform float uW; void main(){ o = vec4(texture(uT, vUv).rgb * uW, 1.); }`;
const FS_DOWN = HEAD + `uniform sampler2D uT; uniform vec2 uTexel; uniform float uThresh;
vec3 pre(vec3 c){ if(uThresh<=0.) return c; float l=max(c.r,max(c.g,c.b)); float k=clamp(l-uThresh+.12,0.,.24); k=k*k/.48; return c*max(k,l-uThresh)/max(l,1e-4); }
void main(){ vec2 h=uTexel*.5;
  vec3 s=pre(texture(uT,vUv).rgb)*4.+pre(texture(uT,vUv-h).rgb)+pre(texture(uT,vUv+h).rgb)+pre(texture(uT,vUv+vec2(h.x,-h.y)).rgb)+pre(texture(uT,vUv-vec2(h.x,-h.y)).rgb);
  o=vec4(s/8.,1.); }`;
const FS_UP = HEAD + `uniform sampler2D uT; uniform vec2 uTexel;
void main(){ vec2 h=uTexel*.5; vec3 s=vec3(0.);
  s+=texture(uT,vUv+vec2(-h.x*2.,0.)).rgb; s+=texture(uT,vUv+vec2(-h.x,h.y)).rgb*2.; s+=texture(uT,vUv+vec2(0.,h.y*2.)).rgb; s+=texture(uT,vUv+vec2(h.x,h.y)).rgb*2.;
  s+=texture(uT,vUv+vec2(h.x*2.,0.)).rgb; s+=texture(uT,vUv+vec2(h.x,-h.y)).rgb*2.; s+=texture(uT,vUv+vec2(0.,-h.y*2.)).rgb; s+=texture(uT,vUv+vec2(-h.x,-h.y)).rgb*2.;
  o=vec4(s/12.,1.); }`;
const FS_FINAL = HEAD + `uniform sampler2D uScene; uniform sampler2D uBloom; uniform float uBloomAmt; uniform float uCA; uniform float uVig; uniform float uGrain; uniform float uSeed;
void main(){
  vec2 d=vUv-.5;
  vec3 c=vec3(texture(uScene,vUv-d*uCA).r, texture(uScene,vUv).g, texture(uScene,vUv+d*uCA).b);
  c+=texture(uBloom,vUv).rgb*uBloomAmt;
  vec3 k=max(c-.82,0.); c=min(c,.82)+k/(1.+k*4.);
  float l=dot(c,vec3(.2126,.7152,.0722));
  c*=1.-uVig*smoothstep(.35,1.1,length(d*vec2(1.,.62))*1.5);
  c+=(hash(gl_FragCoord.xy/2.+vec2(uSeed*37.,uSeed*17.))-.5)*uGrain*(.4+.6*(1.-l));
  o=vec4(max(c,0.),1.);
}`;
function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; }
function program(fs, names) {
  const pr = gl.createProgram(); gl.attachShader(pr, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, compile(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(pr));
  const u = {}; for (const n of ['uRes', ...names]) u[n] = gl.getUniformLocation(pr, n); return { pr, u };
}
const P_ACC = program(FS_ACC, ['uT', 'uW']);
const P_DOWN = program(FS_DOWN, ['uT', 'uTexel', 'uThresh']);
const P_UP = program(FS_UP, ['uT', 'uTexel']);
const P_FIN = program(FS_FINAL, ['uScene', 'uBloom', 'uBloomAmt', 'uCA', 'uVig', 'uGrain', 'uSeed']);
const VAO = gl.createVertexArray(); gl.bindVertexArray(VAO);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
function makeTex(w, h, float) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, float ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  return t;
}
function makeFbo(w, h) { const t = makeTex(w, h, true), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f, w, h }; }
const SCENE_TEX = makeTex(GW, GH, false);
const ACC_FB = makeFbo(GW, GH), MIPS = [1, 2, 3, 4, 5, 6].map(k => makeFbo(Math.ceil(GW / 2 ** k), Math.ceil(GH / 2 ** k)));
function tri(target, w, h) { gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.viewport(0, 0, w, h); gl.drawArrays(gl.TRIANGLES, 0, 3); }
function bindTex(unit, t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); }
function accumulate(k, K) {
  bindTex(0, SCENE_TEX); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  gl.useProgram(P_ACC.pr); gl.uniform1i(P_ACC.u.uT, 0); gl.uniform1f(P_ACC.u.uW, 1 / K);
  if (k === 0) gl.disable(gl.BLEND); else { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); }
  tri(ACC_FB.f, GW, GH); gl.disable(gl.BLEND);
}
const GRADE = { bloom: .75, ca: .0009, vig: .5, grain: .035 };
function post(T, g) {
  let src = ACC_FB;
  gl.useProgram(P_DOWN.pr); gl.uniform1i(P_DOWN.u.uT, 0);
  MIPS.forEach((dst, i) => { bindTex(0, src.t); gl.uniform2f(P_DOWN.u.uTexel, 1 / src.w, 1 / src.h); gl.uniform1f(P_DOWN.u.uThresh, i ? 0 : .45); tri(dst.f, dst.w, dst.h); src = dst; });
  gl.useProgram(P_UP.pr); gl.uniform1i(P_UP.u.uT, 0); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  for (let i = MIPS.length - 1; i > 0; i--) { const s = MIPS[i], d = MIPS[i - 1]; bindTex(0, s.t); gl.uniform2f(P_UP.u.uTexel, 1 / s.w, 1 / s.h); tri(d.f, d.w, d.h); }
  gl.disable(gl.BLEND);
  const P = P_FIN; gl.useProgram(P.pr); bindTex(0, ACC_FB.t); bindTex(1, MIPS[0].t);
  gl.uniform1i(P.u.uScene, 0); gl.uniform1i(P.u.uBloom, 1); gl.uniform2f(P.u.uRes, GW, GH);
  gl.uniform1f(P.u.uBloomAmt, g.bloom); gl.uniform1f(P.u.uCA, g.ca); gl.uniform1f(P.u.uVig, g.vig); gl.uniform1f(P.u.uGrain, g.grain);
  gl.uniform1f(P.u.uSeed, Math.floor(T * 30) % 97);
  tri(null, GW, GH); bindTex(1, null); bindTex(0, null);
}

// ======================================================================== shared visual assets
const rnd = mulberry(20260930);
const STARS = Array.from({ length: 260 }, () => ({ x: rnd() * W, y: rnd() * H, z: .2 + rnd() * .8, p: rnd() * TAU }));
function starfield(t, a = 1, vx = 5, vy = 0) {
  if (a <= 0) return;
  ctx.save(); ctx.fillStyle = '#fff';
  for (const s of STARS) {
    const x = ((s.x + t * vx * s.z) % W + W) % W, y = ((s.y + t * vy * s.z) % H + H) % H;
    ctx.globalAlpha = a * .4 * s.z * (.55 + .45 * Math.sin(t * 1.6 + s.p));
    const r = s.z * 1.6; ctx.fillRect(x, y, r, r);
  }
  ctx.restore();
}
// perspective projection: yaw about y, then pitch about x; returns [sx, sy, depth, scale]
function proj(v, yaw, pitch, cx, cy, F, D = 7) {
  const c1 = Math.cos(yaw), s1 = Math.sin(yaw), c2 = Math.cos(pitch), s2 = Math.sin(pitch);
  const x = v[0] * c1 + v[2] * s1, z = -v[0] * s1 + v[2] * c1, y = v[1];
  const y2 = y * c2 - z * s2, z2 = y * s2 + z * c2, d = D - z2;
  return [cx + F * x / d, cy - F * y2 / d, z2, F / d];
}
function flare(x, y, a, len = 900) {         // anamorphic streak, neutral white
  if (a <= 0) return;
  add(() => {
    const g = ctx.createLinearGradient(x - len, 0, x + len, 0);
    g.addColorStop(0, 'rgba(160,190,255,0)'); g.addColorStop(.5, `rgba(255,255,255,${.85 * a})`); g.addColorStop(1, 'rgba(160,190,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - len, y - 1.5, len * 2, 3);
    ctx.globalAlpha = .3 * a; ctx.fillRect(x - len * .6, y - 7, len * 1.2, 14);
    ctx.globalAlpha = 1; ctx.translate(x, y); ctx.scale(4, 1); glowDot(0, 0, 50, RGB.W, a * .8);
  });
}
function titleLayout(str, cx, size, ls, font = F_ZH, weight = 900) {
  ctx.save(); ctx.font = `${weight} ${size}px ${font}`; const ws = [...str].map(c => ctx.measureText(c).width); ctx.restore();
  const total = ws.reduce((a, b) => a + b, 0) + ls * (ws.length - 1); let x = cx - total / 2;
  return ws.map(w => { const r = { x: x + w / 2, w, total }; x += w + ls; return r; });
}
// letter-by-letter silver title with a moving sheen
function titleWord(str, cx, cy, size, lt, t0, stagger, ls, a = 1, grow = .5, font = F_ZH, weight = 900) {
  if (a <= 0) return;
  const L = titleLayout(str, cx, size, ls, font, weight), total = L[0].total, sheenX = cx - total / 2 + (((lt * .3) % 1.8) - .3) * total;
  ctx.save(); ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  [...str].forEach((ch, i) => {
    const { x, w } = L[i], k = clamp((lt - t0 - i * stagger) / 1.0);
    if (k <= 0) return;
    const e = eexpo(k), sc = 1 + grow * (1 - e);
    ctx.save(); ctx.translate(x, cy); ctx.scale(sc, sc); ctx.globalAlpha = clamp(k * 2.5) * a;
    ctx.shadowColor = 'rgba(210,225,255,.35)'; ctx.shadowBlur = 40 * PX;
    ctx.fillStyle = silverGrad(-w / 2, -size / 2, w / 2, size / 2, (sheenX - (x - w / 2)) / w); ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}
function glitchText(s, x, y, size, a, font = F_EN, seed = 0) {
  if (a <= 0) return;
  const j = (hash1(seed * 7.1) - .5) * 12;
  add(() => {
    text(s, x - 4 + j, y, { font, size, color: 'rgba(140,170,255,1)', alpha: a * .35 });
    text(s, x + 4 - j, y, { font, size, color: 'rgba(255,255,255,1)', alpha: a * .25 });
  });
  text(s, x, y, { font, size, color: '#fff', alpha: a, glow: 'rgba(255,255,255,.5)', blur: 18 });
}
// points sampled from rendered text (for particles that assemble into words)
const _ptsCache = {};
function textPts(key, draw, step = 3, n = 2000, seed = 5) {
  if (_ptsCache[key]) return _ptsCache[key];
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#fff'; draw(x);
  const d = x.getImageData(0, 0, W, H).data, pts = [];
  for (let y = 0; y < H; y += step) for (let X = 0; X < W; X += step) if (d[(y * W + X) * 4 + 3] > 140) pts.push([X, y]);
  const r = mulberry(seed); for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  const out = Array.from({ length: n }, (_, i) => pts.length ? pts[i % pts.length] : [W / 2, H / 2]);
  if (fontsReady) _ptsCache[key] = out;
  return out;
}

// ======================================================================== chemistry drawing
const MOL = window.DATA.mols;
// skeletal formula; rev = 0..1 progressive reveal (by atom index order), o.cols per-atom rgb override
function drawMol2D(m, cx, cy, s, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  const rot = o.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot), n = m.atoms.length, rev = o.rev ?? 1;
  const P = m.p2.map(([x, y]) => [cx + (x * cr - y * sr) * s, cy - (x * sr + y * cr) * s]);
  const vis = i => clamp(rev * (n + 3) - i * 1.0);           // per-atom reveal 0..1
  ctx.save(); ctx.lineCap = 'round';
  const lw = o.lw || Math.max(1.6, s * .075), col = o.col || RGB.W;
  for (const [i, j, ord, side] of m.kb) {
    const v = Math.min(vis(i), vis(j)) * a; if (v <= 0) continue;
    let [x0, y0] = P[i], [x1, y1] = P[j];
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const c0 = m.lab[i] ? s * .32 : 0, c1 = m.lab[j] ? s * .32 : 0;
    x0 += ux * c0; y0 += uy * c0; x1 -= ux * c1; y1 -= uy * c1;
    const bc = o.bondCol ? o.bondCol(i, j) : col;
    ctx.strokeStyle = rgba(bc, v); ctx.lineWidth = lw;
    const nx = -uy, ny = ux;
    if (ord === 2 && side) {
      line(x0, y0, x1, y1, bc, v, lw);
      const d = s * .17 * -side, sh = .15 * L;         // canvas y is flipped, so the ring side flips too
      line(x0 + nx * d + ux * sh, y0 + ny * d + uy * sh, x1 + nx * d - ux * sh, y1 + ny * d - uy * sh, bc, v, lw);
    } else if (ord === 2) {
      const d = s * .085; line(x0 + nx * d, y0 + ny * d, x1 + nx * d, y1 + ny * d, bc, v, lw); line(x0 - nx * d, y0 - ny * d, x1 - nx * d, y1 - ny * d, bc, v, lw);
    } else if (ord === 3) {
      const d = s * .13; line(x0, y0, x1, y1, bc, v, lw); line(x0 + nx * d, y0 + ny * d, x1 + nx * d, y1 + ny * d, bc, v, lw); line(x0 - nx * d, y0 - ny * d, x1 - nx * d, y1 - ny * d, bc, v, lw);
    } else line(x0, y0, x1, y1, bc, v, lw);
  }
  const la = o.labels ?? 1;
  m.lab.forEach((L, i) => {
    if (!L || la <= 0) return; const v = vis(i) * a * la; if (v <= 0) return;
    const c = o.cols ? o.cols[i] : ELEM[m.atoms[i]] || RGB.W;
    text(L, P[i][0] + (L.length > 1 ? s * .12 : 0), P[i][1], { font: F_SANS, weight: 500, size: s * .42, color: rgba(c, 1), alpha: v });
  });
  if (o.dots) m.atoms.forEach((_, i) => { const v = vis(i) * a * o.dots; if (v > 0) add(() => glowDot(P[i][0], P[i][1], s * .5, o.cols ? o.cols[i] : RGB.W, v * .6)); });
  ctx.restore();
  return P;
}
// 3D ball-and-stick with depth sort; P = [[x,y,z]], cols = [[r,g,b]], ra = per-atom alpha, ba = bond alpha (scalar)
function drawMol3D(P, m, cam, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return [];
  const Q = P.map(p => proj(p, cam.yaw, cam.pitch, cam.cx, cam.cy, cam.F, cam.D || 12));
  const cols = o.cols || m.atoms.map(e => ELEM[e] || RGB.W), R = o.r || .38, ba = (o.ba ?? 1) * a;
  ctx.save(); ctx.lineCap = 'round';
  if (ba > 0) for (const [i, j, ord] of m.kb) {
    const A = Q[i], B = Q[j], dep = clamp(.55 + .08 * (A[2] + B[2]) / 2, .25, 1);
    const w = Math.max(1.2, (A[3] + B[3]) * .5 * .09);
    line(A[0], A[1], B[0], B[1], mixc(cols[i], cols[j], .5), ba * dep * .8, w);
    if (ord === 2) { const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) + 1e-6, d = w * 1.6; line(A[0] - dy / L * d, A[1] + dx / L * d, B[0] - dy / L * d, B[1] + dx / L * d, mixc(cols[i], cols[j], .5), ba * dep * .5, w * .6); }
  }
  const order = Q.map((q, i) => i).sort((i, j) => Q[i][2] - Q[j][2]);
  for (const i of order) {
    const [x, y, z, f] = Q[i], rr = R * f * (o.rs ? o.rs[i] : 1), al = a * (o.ra ? o.ra[i] : 1); if (al <= 0 || rr <= .3) continue;
    const c = cols[i], dep = clamp(.6 + .07 * z, .35, 1.1);
    const g = ctx.createRadialGradient(x - rr * .35, y - rr * .35, rr * .05, x, y, rr);
    g.addColorStop(0, rgba(mixc(c, [255, 255, 255], .7), al)); g.addColorStop(.45, rgba(c.map(v => v * dep), al)); g.addColorStop(1, rgba(c.map(v => v * dep * .25), al));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
  }
  ctx.restore();
  return Q;
}

// ======================================================================== neural net drawing
function netLayout(sizes, cx, cy, w, h) {
  return sizes.map((n, l) => Array.from({ length: n }, (_, i) => [cx - w / 2 + (sizes.length === 1 ? w / 2 : l * w / (sizes.length - 1)), cy + (n === 1 ? 0 : (i / (n - 1) - .5) * h * Math.min(1, n / 8 + .3))]));
}
// edges + nodes + travelling pulses (phase = time)
function drawNet(L, t, a = 1, o = {}) {
  if (a <= 0) return;
  const ea = (o.ea ?? .12) * a, speed = o.speed ?? 1.2, r = o.r ?? 9, grow = o.grow ?? 1;
  ctx.save();
  const nl = L.length, vis = l => clamp(grow * (nl + 1) - l);
  for (let l = 0; l + 1 < nl; l++) {
    const v = Math.min(vis(l), vis(l + 1)); if (v <= 0) continue;
    ctx.strokeStyle = `rgba(200,210,225,${ea * v})`; ctx.lineWidth = o.lw ?? 1.1; ctx.beginPath();
    for (const p of L[l]) for (const q of L[l + 1]) { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
    ctx.stroke();
  }
  if (o.pulses) add(() => {
    const K = o.pulses;
    for (let k = 0; k < K; k++) {
      const h = hash1(k * 3.7 + 1), ph = (t * speed + h * nl) % (nl - 1), l = Math.floor(ph), f = ph - l;
      if (l + 1 >= nl || Math.min(vis(l), vis(l + 1)) <= 0) continue;
      const p = L[l][Math.floor(hash1(k * 5.1 + l) * L[l].length)], q = L[l + 1][Math.floor(hash1(k * 9.3 + l * 2) * L[l + 1].length)];
      glowDot(lerp(p[0], q[0], f), lerp(p[1], q[1], f), o.pr ?? 16, k % 7 === 0 ? RGB.A : RGB.W, a * .9 * Math.sin(PI * f));
    }
  });
  L.forEach((layer, l) => {
    const v = vis(l) * a; if (v <= 0) return;
    for (const [i, p] of layer.entries()) {
      const act = o.act ? o.act(l, i, t) : .5;
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(230,236,245,${v})`; ctx.lineWidth = 1.6; ctx.stroke();
      if (act > 0) { ctx.fillStyle = rgba(mixc(RGB.S, [255, 255, 255], act), v * act); ctx.beginPath(); ctx.arc(p[0], p[1], r * .62, 0, TAU); ctx.fill(); }
    }
  });
  ctx.restore();
}

// ======================================================================== plots
function axes(x0, y0, w, h, a, o = {}) {
  if (a <= 0) return;
  ctx.save(); ctx.lineCap = 'round';
  arrow(x0 - 10, y0, x0 + w + 20, y0, RGB.G, a * .9, 1.6, 10); arrow(x0, y0 + 10, x0, y0 - h - 20, RGB.G, a * .9, 1.6, 10);
  if (o.xl) text(o.xl, x0 + w + 38, y0, { font: F_MATH, style: 'italic', size: 30, color: SILVER, alpha: a });
  if (o.yl) text(o.yl, x0, y0 - h - 44, { font: F_MATH, style: 'italic', size: 30, color: SILVER, alpha: a });
  ctx.restore();
}
function plotFn(fn, x0, y0, w, h, xa, xb, ya, yb, c, a, lw = 3, prog = 1, glow = true, n = 360) {
  if (a <= 0 || prog <= 0) return;
  const pts = []; const m = Math.max(2, Math.floor(n * prog));
  for (let i = 0; i <= m; i++) { const u = i / n, x = lerp(xa, xb, u), y = fn(x); pts.push([x0 + u * w, y0 - (y - ya) / (yb - ya) * h]); }
  if (glow) { add(() => { poly(pts, c, a * .12, lw * 5); poly(pts, c, a * .3, lw * 2.2); }); }
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; poly(pts, c, a, lw); ctx.restore();
  return pts[pts.length - 1];
}
// small linear solver (Gaussian elimination with partial pivoting)
function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / (r[i] || 1e-12));
}
function lstsq(X, y, lam = 1e-6) {
  const p = X[0].length, A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0);
  for (let i = 0; i < X.length; i++) for (let j = 0; j < p; j++) { b[j] += X[i][j] * y[i]; for (let k = 0; k < p; k++) A[j][k] += X[i][j] * X[i][k]; }
  for (let j = 0; j < p; j++) A[j][j] += lam;
  return solve(A, b);
}
// number that rolls to its value
function rollNum(v, k, dec = 1) { return (v * eout(clamp(k))).toFixed(dec); }

// ======================================================================== scene registry
const SC = [];
function scene(o) { SC.push(o); return o; }
const camPush = (amt = .04) => (lt, d) => ({ z: 1 + amt * lt / d, x: 8 * Math.sin(lt * .21), y: 5 * Math.sin(lt * .17 + 1) });
const camArc = (amt = .035) => (lt, d) => ({ z: 1 + amt * Math.sin(PI * clamp(lt / d)) });
let fontsReady = false;
