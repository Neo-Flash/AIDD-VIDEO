// Render promo.html offline, frame by frame, and encode it with music.mp3 as an MP4.
//
//   node export.mjs [--workers 6] [--fps 30] [--from 0] [--to <end>] [--crf 18] [--out "抽象代数宣传片.mp4"]
//   node export.mjs --shots 5,20.5,60         (write single frames to shots/ for checking)
//   node export.mjs --cues cues.json          (dump the sound-effect cue sheet for music.py)
//
// Each worker is a separate headless Chrome that renders exact frame times (the page's ?export=1 mode).
// Frames are handed out one at a time and written to ffmpeg in order, so the video is identical for any
// worker count and does not depend on how fast this machine is. One page renders ~10 fps because every
// frame waits on a GPU readback and a JPEG encode; several pages overlap those waits.
// Needs Chrome or Edge, ffmpeg on PATH, and a network connection for the Google Fonts.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { EventEmitter, once } from 'node:events';
import { tmpdir, availableParallelism } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const FPS = +(args.fps || 30), CRF = +(args.crf || 18);
const WORKERS = args.shots || args.cues || args.srt ? 1 : Math.max(1, +(args.workers || Math.min(6, Math.floor(availableParallelism() / 2.5))));
const page = resolve(here, args.page || 'promo.html');
const mp3 = join(here, 'music.mp3');
const OUT = resolve(here, args.out || 'AIDD宣传片_4K.mp4');
const HAS_MUSIC = existsSync(mp3) && !args['no-music'];
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(p => p && existsSync(p));
if (!CHROME) throw new Error('Chrome / Edge not found (set CHROME=path)');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const browsers = [];
let ff = null, ffError = null;
const cleanup = () => {
  for (const b of browsers) try { b.proc.kill(); } catch {}
  try { ff && ff.exitCode === null && ff.kill(); } catch {}
  for (const b of browsers) try { rmSync(b.profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
};
process.on('exit', cleanup);                                   // no Chrome outlives this script
process.on('SIGINT', () => process.exit(130));
process.on('SIGTERM', () => process.exit(143));
process.on('uncaughtException', e => { console.error(`export failed: ${e.message}`); process.exit(1); });
process.on('unhandledRejection', e => { console.error(`export failed: ${e && e.message}`); process.exit(1); });

// ---- one headless Chrome, driven over the DevTools protocol ----
async function launch(id) {
  const profile = mkdtempSync(join(tmpdir(), 'promo-export-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`,
    '--window-size=1920,1080', '--force-device-scale-factor=1', '--hide-scrollbars', '--mute-audio', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--no-first-run',
    '--no-default-browser-check', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
  browsers.push({ proc, profile });
  let port = 0, target = null;                                  // port 0: Chrome picks a free one and writes it to DevToolsActivePort
  for (let i = 0; i < 120 && !port; i++) { try { port = +readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch {} if (!port) await sleep(250); }
  for (let i = 0; i < 80 && port && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {}
    if (!target) await sleep(250);
  }
  if (!target) throw new Error(`worker ${id}: Chrome did not start`);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0; const pending = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') console.error(`worker ${id} page error:`, m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.error(`worker ${id} console.error:`, m.params.args.map(a => a.value ?? a.description).join(' '));
    const p = pending.get(m.id); if (!p) return; pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
  };
  ws.onclose = () => { for (const p of pending.values()) p.rej(new Error(`worker ${id}: Chrome closed the connection`)); };
  const send = (method, params = {}) => new Promise((res, rej) => { const id2 = ++seq; pending.set(id2, { res, rej }); ws.send(JSON.stringify({ id: id2, method, params })); });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: pathToFileURL(page).href + '?export=1' });
  let ready = false;
  for (let i = 0; i < 240 && !ready; i++) { await sleep(500); try { ready = await evaluate("typeof window.__frame === 'function' && window.__ready()"); } catch {} }
  if (!ready) throw new Error(`worker ${id}: the page did not get ready (fonts / formulas failed to load?)`);
  const frame = async t => { const url = await evaluate(`__frame(${t}, ${FPS})`); return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'); };
  return { id, evaluate, frame };
}

const tLoad = Date.now();
const workers = await Promise.all(Array.from({ length: WORKERS }, (_, i) => launch(i)));
const gpu = await workers[0].evaluate(`(() => { const g = document.createElement('canvas').getContext('webgl2'), d = g && g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`);
console.log(`${WORKERS} worker${WORKERS > 1 ? 's' : ''} ready in ${((Date.now() - tLoad) / 1000).toFixed(1)}s   renderer: ${gpu}`);

if (args.cues) {                                                // the sound-effect cue sheet the music script reads
  writeFileSync(resolve(here, args.cues), JSON.stringify(await workers[0].evaluate('window.__cues()'), null, 1));
  console.log(`wrote ${args.cues}`);
  process.exit(0);
}
if (args.srt) {                                                 // bilingual subtitles for the voice-over edit
  writeFileSync(resolve(here, args.srt), await workers[0].evaluate('window.__srt()'));
  console.log(`wrote ${args.srt}`);
  process.exit(0);
}
if (args.shots) {
  const dir = join(here, 'shots'); mkdirSync(dir, { recursive: true });
  for (const t of args.shots.split(',').map(Number)) writeFileSync(join(dir, `t${t.toFixed(2).padStart(7, '0')}.jpg`), await workers[0].frame(t));
  console.log(`wrote ${args.shots.split(',').length} shots to ${dir}`);
  process.exit(0);
}

const DUR = await workers[0].evaluate('window.__duration');
const FROM = +(args.from || 0), TO = Math.min(+(args.to || DUR), DUR), N = Math.round((TO - FROM) * FPS);
console.log(`rendering ${N} frames (${FROM.toFixed(2)}s → ${TO.toFixed(2)}s @ ${FPS} fps) → ${OUT}`);
ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  ...(HAS_MUSIC ? ['-ss', String(FROM), '-t', String(TO - FROM), '-i', mp3, '-map', '0:v:0', '-map', '1:a:0'] : ['-map', '0:v:0']),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', String(CRF), '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '5.1', '-r', String(FPS),
  ...(HAS_MUSIC ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []), '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = once(ff, 'exit');
ff.stdin.on('error', e => { ffError = e; });
ff.on('exit', c => { if (c !== 0) ffError = ffError || new Error(`ffmpeg exited with ${c}`); });

// ---- frames are taken in order by whichever worker is free, and written in order ----
const AHEAD = 12 * WORKERS;                                     // how far rendering may run ahead of the encoder
const ev = new EventEmitter(); ev.setMaxListeners(0);
const ready = new Map();
let nextTake = 0, nextWrite = 0;
async function work(w) {
  while (nextTake < N) {
    if (nextTake >= nextWrite + AHEAD) { await once(ev, 'written'); continue; }
    const i = nextTake++;
    ready.set(i, await w.frame(FROM + i / FPS));
    ev.emit('rendered');
  }
}
const t0 = Date.now(); let lastLog = 0;
async function write() {
  while (nextWrite < N) {
    if (ffError) throw ffError;
    const buf = ready.get(nextWrite);
    if (!buf) { await once(ev, 'rendered'); continue; }
    ready.delete(nextWrite);
    if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
    nextWrite++; ev.emit('written');
    const now = Date.now();
    if (now - lastLog > 10000 || nextWrite === N) {
      lastLog = now; const rate = nextWrite / ((now - t0) / 1000);
      console.log(`frame ${nextWrite}/${N}  ${(100 * nextWrite / N).toFixed(1)}%  ${rate.toFixed(1)} fps  eta ${Math.round((N - nextWrite) / rate)}s`);
    }
  }
}
await Promise.all([write(), ...workers.map(work)]);
ff.stdin.end();
const [code] = await ffDone;
if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
console.log(`done: ${OUT}  (${(statSync(OUT).size / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 60000).toFixed(1)} min)`);
process.exit(0);                                                 // the Chrome children would otherwise keep Node alive
