"""Score and sound design for the promo: D minor, 90 BPM, locked to promo.html's bar timeline.

    node export.mjs --cues cues.json     (the page's sound-effect cue sheet)
    python music.py                      -> music.wav, music.mp3

A "cosmic organ" hybrid score (pipe organ, formant choir, strings, piano, celesta, taiko) plus
synthesized foley placed from the cue sheet, mixed on separate stems with convolution reverb,
kick sidechain, glue compression and a look-ahead limiter; ffmpeg normalizes to -14 LUFS.
"""
import json
import subprocess
import wave
import numpy as np
from scipy.signal import butter, sosfilt, sosfiltfilt, fftconvolve, lfilter
from scipy.ndimage import maximum_filter1d

SR = 44100
BPM = 90
BEAT = 60 / BPM
BAR = 4 * BEAT
EIGHTH = BEAT / 2
NBARS = 90
TOTAL = NBARS * BAR + 4.0
N = int((TOTAL + 1) * SR)
F32 = np.float32
TAU = 2 * np.pi
rng = np.random.default_rng(11)
BUS = {k: np.zeros((2, N), F32) for k in ('mus', 'pad', 'drm', 'sfx', 'hall', 'plate', 'room', 'sfxwet')}
KICKS = []                                                  # (time, depth) for the pad sidechain


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def b(x):
    return x * BAR


def tv(dur):
    return np.arange(max(1, int(dur * SR))) / SR


def noise(n):
    return rng.standard_normal(n).astype(F32)


def put(sig, t0, bus, gain=1.0, pan=0.0, hall=0.0, plate=0.0, room=0.0, wet=0.0):
    """Mix a mono (panned) or stereo signal into a bus at t0 seconds, with reverb sends."""
    if gain == 0:
        return
    sig = np.asarray(sig, F32)
    if sig.ndim == 1:
        a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
        sig = np.stack([sig * np.cos(a), sig * np.sin(a)]) * 1.4142
    i = int(round(t0 * SR))
    if i < 0:
        sig = sig[:, -i:]
        i = 0
    n = min(sig.shape[1], N - i)
    if n <= 0:
        return
    seg = sig[:, :n] * gain
    BUS[bus][:, i:i + n] += seg
    for k, g in (('hall', hall), ('plate', plate), ('room', room), ('sfxwet', wet)):
        if g:
            BUS[k][:, i:i + n] += seg * g


def adsr(n, a, d, s, r, hold):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    return (e * (1 - np.clip((t - hold) / max(r, 1e-4), 0, 1))).astype(F32)


def lp(x, f, o=2):
    return sosfilt(butter(o, min(f, SR * .45), 'low', fs=SR, output='sos'), x).astype(F32)


def hp(x, f, o=2):
    return sosfilt(butter(o, max(f, 10), 'high', fs=SR, output='sos'), x).astype(F32)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [max(lo, 10), min(hi, SR * .45)], 'band', fs=SR, output='sos'), x).astype(F32)


def saw(f, t, det=0.0, vib=0.0, vr=5.5, ph=0.0):
    """Band-limited (polyBLEP) sawtooth, optionally with vibrato."""
    inst = f * (1 + det) * (1 + vib * np.sin(TAU * vr * t + ph)) if vib else np.full(t.shape, f * (1 + det), F32)
    phase = (np.cumsum(inst, dtype=np.float64) / SR + ph / TAU) % 1.0
    dt = inst / SR
    y = 2 * phase - 1
    m = phase < dt
    x = phase[m] / dt[m]
    y[m] -= x + x - x * x - 1
    m = phase > 1 - dt
    x = (phase[m] - 1) / dt[m]
    y[m] -= x * x + x + x + 1
    return y.astype(F32)


def sweep_sine(f0, f1, dur, curve='exp'):
    t = tv(dur)
    x = t / dur
    f = f0 * (f1 / f0) ** x if curve == 'exp' else f0 + (f1 - f0) * x
    return np.sin(TAU * np.cumsum(f, dtype=np.float64) / SR).astype(F32), t


# ================================================================== instruments
STOPS = {'full': [(1, 1), (2, .6), (3, .3), (4, .32), (6, .14), (8, .1)], 'flute': [(1, 1), (2, .25), (3, .06)], 'pedal': [(1, 1), (2, .5), (3, .22)]}


def organ(t0, notes, dur, gain=.06, att=.4, rel=1.4, stops='full', hall=1.0, spread=.6, bus='pad'):
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    e = adsr(n, att, .5, .92, rel, dur) * (1 + .02 * np.sin(TAU * 5.6 * t)).astype(F32)
    st = STOPS[stops]
    for i, m in enumerate(notes):
        f = midi(m)
        s = np.zeros(n, F32)
        for h, a in st:
            if f * h > 8000:
                continue
            for dv in (-.0011, .0012):
                s += (a * np.sin(TAU * f * h * (1 + dv) * t + rng.random() * TAU)).astype(F32)
        ch = int(.07 * SR)
        s[:ch] += bp(noise(ch), f * 1.5, f * 6) * np.exp(-np.arange(ch) / SR / .018).astype(F32) * .4
        put(s * e / (2 * len(st)), t0, bus, gain, ((i / max(1, len(notes) - 1)) - .5) * spread, hall=hall)


FORMANT = {'a': [(800, 1.0), (1150, .5), (2900, .22), (3900, .1)], 'o': [(450, 1.0), (800, .45), (2830, .12)]}


def choir(t0, notes, dur, gain=.05, att=1.0, rel=1.8, vowel='a', hall=1.3):
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    e = adsr(n, att, 1.0, .9, rel, dur)
    for i, m in enumerate(notes):
        f = midi(m)
        src = sum(saw(f, t, det=(v - 1) * .005, vib=.0045, vr=4.8 + v * .7, ph=rng.random() * 6) for v in range(3)) + noise(n) * .25
        out = sum(a * bp(src, fc * .86, fc * 1.14) for fc, a in FORMANT[vowel])
        put(out * e, t0, 'pad', gain, ((i / max(1, len(notes) - 1)) - .5) * .8, hall=hall)


def strings(t0, notes, dur, gain=.04, att=.5, rel=1.0, cut=3500, hall=.8, bus='pad'):
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    e = adsr(n, att, .8, .9, rel, dur)
    for i, m in enumerate(notes):
        f = midi(m)
        s = sum(saw(f, t, det=(v - 1.5) * .0035, vib=.0035, vr=5.2 + v * .4, ph=rng.random() * 6) for v in range(4))
        put(lp(s, cut) * e / 4, t0, bus, gain, ((i / max(1, len(notes) - 1)) - .5) * .9, hall=hall)


def spic(t0, m, gain=.05, dur=.16, pan=0.0):
    t = tv(dur + .25)
    s = sum(saw(midi(m), t, det=d) for d in (-.004, 0, .004)) / 3
    put(lp(s, 2800) * adsr(len(t), .006, .08, .35, .12, dur), t0, 'mus', gain, pan, hall=.35)


def piano(t0, m, gain=.1, vel=.8, pan=0.0):
    f = midi(m)
    t = tv(5.0)
    B = .00015 * 2 ** ((m - 48) / 12)
    s = np.zeros(len(t), F32)
    for h in range(1, 11):
        fh = f * h * np.sqrt(1 + B * h * h)
        if fh > 12000:
            break
        a = vel ** (1 + .25 * (h - 1)) / h ** .85
        tau = max(.25, 3.2 - (m - 60) * .04) / (1 + .45 * (h - 1))
        dec = np.exp(-t / tau).astype(F32)
        for dc in (-.0006, 0, .0007):
            s += (a / 3 * np.sin(TAU * fh * (1 + dc) * t + rng.random() * 6)).astype(F32) * dec
    hn = int(.012 * SR)
    s[:hn] += lp(noise(hn), 1500 + 3000 * vel) * np.exp(-np.arange(hn) / SR / .003).astype(F32) * .3 * vel
    put(s * np.minimum(1, t / .002), t0, 'mus', gain, pan, hall=.55)


def bell(t0, m, gain=.05, dec=1.4, pan=0.0, ratio=3.5, index=1.8, bus='mus', hall=.8, plate=0.0, wet=0.0):
    f = midi(m)
    t = tv(dec * 5)
    s = np.sin(TAU * f * t + index * np.exp(-t / .3) * np.sin(TAU * f * ratio * t)) * np.exp(-t / dec)
    s += .3 * np.sin(TAU * f * 2.01 * t) * np.exp(-t / (dec * .4))
    put(s * np.minimum(1, t / .0015), t0, bus, gain, pan, hall=hall, plate=plate, wet=wet)


def celesta(t0, m, gain=.04, dec=1.0, pan=0.0, bus='mus', wet=0.0):
    bell(t0, m, gain, dec, pan, ratio=4.0, index=.9, bus=bus, hall=.7, plate=.25, wet=wet)


def pluck(t0, m, gain=.04, dur=.2, pan=0.0):
    t = tv(dur + .3)
    s = saw(midi(m), t, det=.003) + saw(midi(m), t, det=-.003)
    k = np.exp(-t / .07).astype(F32)
    s = (lp(s, 6000) * k + lp(s, 900) * (1 - k)) * adsr(len(t), .003, .15, .3, .12, dur)
    put(s, t0, 'mus', gain, pan, hall=.3, plate=.3)


def sub(t0, m, dur, gain=.16):
    f = midi(m)
    t = tv(dur + .3)
    s = np.tanh(1.5 * (np.sin(TAU * f * t) + .2 * np.sin(TAU * 2 * f * t))) * adsr(len(t), .02, .3, .9, .25, dur)
    put(s, t0, 'pad', gain)


def bass8(t0, m, gain=.1, dur=EIGHTH * .9):
    f = midi(m)
    t = tv(dur + .15)
    s = (lp(saw(f, t), 700) + .6 * np.sin(TAU * f * t).astype(F32)) * adsr(len(t), .004, .12, .6, .08, dur)
    put(s, t0, 'mus', gain)


def braam(t0, root, dur, gain):
    t = tv(dur + .5)
    for m in (root, root + 12, root + 19, root + 24):
        s = saw(midi(m), t, det=.004) + saw(midi(m), t, det=-.005)
        k = np.exp(-t / 1.0).astype(F32)
        s = np.tanh(2.2 * (lp(s, 2600) * k + lp(s, 380) * (1 - k))) * adsr(len(t), .04, 1.5, .5, .5, dur)
        put(s, t0, 'mus', gain / 4, hall=.7)


def growl(t0, dur, gain=.08):
    t = tv(dur)
    s = saw(midi(26), t, det=.003) + saw(midi(26), t, det=-.004) + .5 * saw(midi(33), t)
    open_ = (t / dur) ** 1.5
    s = np.tanh(3 * (lp(s, 180) * (1 - open_) + lp(s, 900) * open_))
    s *= np.minimum(1, t / 2) * np.minimum(1, (dur - t) / .5) * (1 + .25 * np.sin(TAU * 1.5 * t))
    put(s.astype(F32), t0, 'mus', gain, hall=.4)


# ---- drums
def kick(t0, gain=.45, long=False, duck=.6):
    t = tv(1.4 if long else .55)
    f = 44 + 130 * np.exp(-t / .03)
    s = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / (.8 if long else .26)) + .35 * hp(noise(len(t)), 2000) * np.exp(-t / .004)
    put(np.tanh(1.6 * s), t0, 'drm', gain, room=.15)
    KICKS.append((t0, duck))


def taiko(t0, gain=.35, pitch=1.0, pan=0.0):
    t = tv(1.6)
    f = (58 + 70 * np.exp(-t / .045)) * pitch
    body = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / .55) + .35 * np.sin(TAU * np.cumsum(f * 1.58) / SR) * np.exp(-t / .25)
    s = body + bp(noise(len(t)), 150, 900) * np.exp(-t / .07) * .6 + hp(noise(len(t)), 2500) * np.exp(-t / .004) * .4
    put(np.tanh(1.3 * s), t0, 'drm', gain, pan, room=.3, hall=.35)
    KICKS.append((t0, .4))


def snare(t0, gain=.18, pan=0.0, big=False):
    t = tv(.7)
    s = bp(noise(len(t)), 900, 8000) * np.exp(-t / (.22 if big else .14))
    s += .6 * np.sin(TAU * 185 * t) * np.exp(-t / .06) + .3 * np.sin(TAU * 330 * t) * np.exp(-t / .04)
    put(s, t0, 'drm', gain, pan, room=.35, hall=.4 if big else .15)


def clap(t0, gain=.13):
    n = int(.5 * SR)
    s = np.zeros(n, F32)
    for k, d in enumerate((0, .011, .023)):
        i = int(d * SR)
        s[i:] += bp(noise(n - i), 1000, 5000) * np.exp(-np.arange(n - i) / SR / (.012 if k < 2 else .12)).astype(F32)
    put(s, t0, 'drm', gain, room=.4, plate=.3)


def hat(t0, gain=.035, open_=False, pan=.25):
    t = tv(.3 if open_ else .07)
    put(hp(noise(len(t)), 7000) * np.exp(-t / (.1 if open_ else .018)), t0, 'drm', gain, pan, room=.1)


def shaker(t0, gain=.025, pan=-.2):
    t = tv(.12)
    put(bp(noise(len(t)), 4000, 11000) * np.sin(np.pi * t / .12) ** 2, t0, 'drm', gain, pan)


def crash(t0, gain=.1, dur=2.6, rev=False):
    t = tv(dur)
    s = hp(noise(len(t)), 4500) * np.exp(-t / (dur * .35))
    for r in (3.1, 4.7, 6.9, 9.4):
        s += .08 * np.sin(TAU * 410 * r * t) * np.exp(-t / (dur * .25))
    if rev:
        put(s[::-1].copy(), t0 - dur, 'drm', gain, hall=.5)
    else:
        put(s, t0, 'drm', gain, hall=.5)


def tom(t0, m, gain=.22, pan=0.0):
    t = tv(.8)
    f = midi(m) * (1 + .5 * np.exp(-t / .05))
    put(np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / .25), t0, 'drm', gain, pan, room=.3, hall=.3)


def impact(t0, lvl=1.0, root=26):
    t = tv(6)
    f = 28 + 60 * np.exp(-t / .3)
    put(np.tanh(2 * np.sin(TAU * np.cumsum(f) / SR)) * np.exp(-t / 1.6), t0, 'drm', .5 * lvl)
    taiko(t0, .45 * lvl, .8)
    taiko(t0 + .012, .3 * lvl, 1.3, -.3)
    put(lp(noise(len(t)), 2500) * np.exp(-t / .45), t0, 'drm', .1 * lvl, hall=1.2)
    crash(t0, .09 * lvl)
    braam(t0, root, 4.5, .11 * lvl)
    KICKS.append((t0, 1.0))


def riser(t_end, dur, gain=.14):
    t = tv(dur)
    x = t / dur
    s = hp(noise(len(t)), 1200) * x ** 2.2 * .7
    for o in range(3):
        f = 180 * 2 ** o * 2 ** (x * 2)
        s += (np.sin(TAU * np.cumsum(f) / SR) * x ** 2 * .12 * np.sin(np.pi * np.clip(x * 1.2 - o * .1, 0, 1))).astype(F32)
    put(s.astype(F32), t_end - dur, 'mus', gain, hall=.6)


# ================================================================== harmony + arrangement helpers
CH = {'Dm': [50, 53, 57, 62], 'Bb': [46, 53, 58, 62], 'F': [48, 53, 57, 60], 'C': [48, 52, 55, 60], 'Gm': [50, 55, 58, 62],
      'A': [49, 52, 57, 61], 'D': [50, 54, 57, 62], 'Eb': [51, 55, 58, 63], 'Dm9': [50, 53, 57, 64], 'Asus': [50, 52, 57, 62], 'D5': [50, 57, 62]}
ROOT = {'Dm': 38, 'Bb': 34, 'F': 41, 'C': 36, 'Gm': 43, 'A': 33, 'D': 38, 'Eb': 39, 'Dm9': 38, 'Asus': 33, 'D5': 38}
ARP = {k: sorted(set(v + [x + 12 for x in v])) for k, v in CH.items()}


def pads(start, chords, kind='organ', **kw):
    for i, c in enumerate(chords):
        if not c:
            continue
        if kind == 'organ':
            organ(b(start + i), CH[c], BAR, **kw)
        elif kind == 'strings':
            strings(b(start + i), CH[c], BAR, **kw)
        else:
            choir(b(start + i), [x + 12 for x in CH[c][1:]], BAR, **kw)


def bass_hold(start, chords, gain=.14):
    for i, c in enumerate(chords):
        sub(b(start + i), ROOT[c], BAR, gain)


def bass_8(start, chords, gain=.1):
    for i, c in enumerate(chords):
        for k in range(8):
            bass8(b(start + i) + k * EIGHTH, ROOT[c] + (12 if k % 4 == 3 else 0), gain)
        sub(b(start + i), ROOT[c], BAR, .09)


def arps(start, chords, inst='celesta', div=2, oct_=12, gain=.03, pat=(0, 2, 1, 3, 2, 4, 3, 5)):
    step = BEAT / div
    for i, c in enumerate(chords):
        notes = ARP[c]
        for k in range(4 * div):
            m = notes[pat[k % len(pat)] % len(notes)] + oct_
            t, g, pan = b(start + i) + k * step, gain * (1 if k % div == 0 else .75), np.sin(k * 1.3) * .5
            if inst == 'celesta':
                celesta(t, m, g, dec=.7, pan=pan)
            else:
                pluck(t, m, g, dur=step * .9, pan=pan)


def drums(start, bars, kick_=(0, 2), snare_=(), clap_=(), hats=0, taikos=(), kg=.45, sg=.18, fill=False, shak=0):
    for i in range(bars):
        t = b(start + i)
        for k in kick_:
            kick(t + k * BEAT, kg)
        for s in snare_:
            snare(t + s * BEAT, sg, big=True)
        for c in clap_:
            clap(t + c * BEAT)
        for k in taikos:
            taiko(t + k * BEAT, .28, 1.0, pan=.2 * np.sin(k))
        for h in range(hats):
            hat(t + h * BAR / hats, .035 if h % 2 == 0 else .024)
        for h in range(shak):
            shaker(t + h * BAR / shak, .022 if h % 2 else .03)
        if fill and i == bars - 1:
            for k, m in enumerate([50, 47, 45, 43, 41, 38, 36, 33]):
                tom(t + 2 * BEAT + k * BEAT / 4, m, .2, pan=.6 - k * .17)


def sparkle_notes(t0, dur, count, lo=86, gain=.025, seed=0):
    r = np.random.default_rng(seed)
    pent = [62, 64, 65, 69, 72]
    for _ in range(count):
        m = pent[r.integers(5)] + 12 * r.integers(1, 3)
        if m < lo:
            m += 12
        celesta(t0 + r.random() * dur, int(m), gain * (.5 + .5 * r.random()), dec=1.2, pan=r.random() * 1.6 - .8)


# ================================================================== the score
# bar map (promo.html): S0 0 · S1 5 · S2 11 · S3 20 · S4 27 · S5 34 · S6 41 · S7 47 · S8 51 · S9 57 · S10 63 · S11 69 · S12 75 · S13 82-90 (+4 s)
# ---- 0-5  cold open: heartbeats, the beat-cut teaser, the hard cut, the question, y = f(x)
organ(0.0, [38, 45], 6.55, gain=.07, att=1.5, rel=.06, stops='pedal')
strings(1.0, [50, 57, 62, 69], 5.55, gain=.03, att=4.5, rel=.06, cut=1600)
for k in range(8):
    kick(1.333 + k * BEAT, .3 + .02 * k, duck=.3)
riser(6.62, 4.5, .07)
organ(7.35, [62, 69, 76], 3.2, gain=.02, att=1.6, rel=1.6, stops='flute')
organ(b(4), CH['Dm'], BAR - .25, gain=.05, att=1.6, rel=.5)
choir(b(4) + .8, [62, 65, 69], BAR - 1.1, gain=.03, att=1.4, rel=.5)
sparkle_notes(b(4), BAR - .5, 14, seed=1)
riser(b(5), b(1), .16)
crash(b(5), .08, 2.2, rev=True)
# ---- 5-11  我是小闪电 → course cards
impact(b(5), 1.0)
organ(b(5), CH['Dm'] + [38, 45], b(2) - .3, gain=.075, att=.08, rel=1.6)
choir(b(5), [62, 65, 69, 74], b(2) - .3, gain=.055, att=.5)
sub(b(5), 38, b(2) - .5, .16)
for k, m in enumerate([74, 77, 81, 86, 81, 77, 74, 69, 74, 77, 81, 86]):
    celesta(b(5.75) + k * EIGHTH, m, .035, dec=1.4, pan=(k % 4 - 1.5) * .3)
CD = ['Bb', 'F', 'C', 'A']
pads(7, CD, 'strings', gain=.03)
pads(7, CD, 'organ', gain=.03, stops='flute')
arps(7, CD, 'pluck', div=4, gain=.022, pat=(0, 2, 4, 2, 1, 3, 5, 3))
bass_hold(7, CD, .1)
for i in (7, 7.5, 8):
    taiko(b(i), .22, 1.0)
drums(9, 2, kick_=(0, 2), hats=8, kg=.3)
riser(b(11), b(1), .12)
# ---- 11-20  I 万物皆函数
impact(b(11), .4)
EV = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A', 'Dm']
pads(11, EV, 'organ', gain=.04, stops='flute', att=.8)
pads(11, EV, 'strings', gain=.028, att=.9)
bass_hold(11, EV, .12)
arps(13, EV[2:5], 'celesta', gain=.026)
arps(16, EV[5:9], 'celesta', div=4, oct_=24, gain=.02, pat=(0, 3, 1, 4, 2, 5, 3, 6))
for i in range(13, 16):
    kick(b(i), .22, duck=.3)
    kick(b(i) + 2 * BEAT, .18, duck=.2)
drums(17, 3, kick_=(0, 2), hats=8, kg=.3)
choir(b(18), [69, 74, 77], b(2), gain=.035, att=1.2)
# ---- 20-27  II neuron → MLP → DNN
impact(b(20), .3)
NN = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Bb', 'A']
pads(20, NN, 'strings', gain=.03, cut=2500)
for k in range(16):
    pluck(b(20) + k * BEAT / 2, [62, 69, 65, 69][k % 4], .028, dur=.18)
bass_hold(20, NN[:2], .1)
arps(22, NN[2:4], 'pluck', div=4, gain=.024, pat=(0, 2, 4, 2, 1, 3, 5, 3))
bass_8(22, NN[2:], .09)
drums(22, 2, kick_=(0, 2), hats=8, kg=.34)
drums(24, 3, kick_=(0, 1.5, 2, 3.5), snare_=(1, 3), hats=16, kg=.4, sg=.14, fill=True)
arps(24, NN[4:], 'celesta', div=4, oct_=24, gain=.02)
riser(b(27), b(1), .13)
# ---- 27-34  III universal approximation
impact(b(27), .45)
UA = ['Dm', 'C', 'Bb', 'A', 'Bb', 'C', 'Dm']
pads(27, UA, 'strings', gain=.028, cut=2500)
bass_hold(27, UA[:2], .1)
for i, c in enumerate(UA[2:], start=2):
    r = ROOT[c] + 24
    for k in range(8):
        spic(b(27 + i) + k * EIGHTH, [r, r + 7, r + 12, r + 7][k % 4], .04 + .005 * i, pan=(k % 2 - .5) * .4)
bass_8(29, UA[2:], .1)
drums(29, 2, kick_=(0, 2), hats=16, kg=.32)
drums(31, 3, kick_=(0, 1.75, 2, 3.5), snare_=(1, 3), hats=16, taikos=(0,), kg=.42, sg=.16, fill=True)
choir(b(31), [62, 65, 69, 74], b(2), gain=.035, att=.8)
crash(b(34), .08, 2.0, rev=True)
# ---- 34-41  IV GNN: message passing
impact(b(34), .35)
GN = ['Bb', 'F', 'Gm', 'Dm', 'Bb', 'C', 'Dm']
pads(34, GN, 'organ', gain=.036, stops='flute', att=1.0)
pads(34, GN, 'choir', gain=.022, att=1.2)
bass_hold(34, GN, .1)
arps(35, GN[1:4], 'celesta', div=4, oct_=24, gain=.02, pat=(0, 3, 1, 4, 2, 5, 3, 6))
for i in range(35, 38):
    taiko(b(i), .18, .9)
drums(38, 3, kick_=(0, 2.5), clap_=(1, 3), hats=16, kg=.36)
arps(38, GN[4:], 'pluck', div=4, gain=.022)
# ---- 41-47  V Transformer: attention
impact(b(41), .3)
TF = ['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'A']
pads(41, TF, 'strings', gain=.028, cut=1600)
for i, c in enumerate(TF):
    for k in range(16):
        bass8(b(41 + i) + k * EIGHTH / 2, ROOT[c] + (12 if k % 8 in (3, 6) else 0), .07, dur=EIGHTH / 2 * .8)
    sub(b(41 + i), ROOT[c], BAR, .08)
drums(42, 5, kick_=(0, 2.5), clap_=(1, 3), hats=16, kg=.38)
arps(44, TF[3:], 'pluck', div=4, gain=.024)
riser(b(47), b(1.5), .15)
# ---- 47-51  VI generation: 10^60, the inverse question
impact(b(47), .6)
organ(b(47), [26, 33, 38], b(2), gain=.06, att=.5, stops='pedal')
choir(b(47), [62, 65, 69], b(2), gain=.04, att=1.0)
growl(b(47), b(2), .05)
sparkle_notes(b(47), b(2), 20, seed=4)
riser(b(49), b(.9), .15)
impact(b(49), .75)
GE = ['Bb', 'C']
pads(49, GE, 'organ', gain=.045)
pads(49, GE, 'strings', gain=.03)
bass_8(49, GE, .1)
for i in range(49, 51):
    taiko(b(i), .26, 1.0)
    taiko(b(i) + 2 * BEAT, .2, 1.05)
# ---- 51-57  VII VAE: encoder → latent → decoder
VA = ['Dm', 'F', 'Bb', 'C', 'Gm', 'A']
pads(51, VA, 'organ', gain=.034, stops='flute', att=.8)
pads(51, VA, 'strings', gain=.024)
bass_hold(51, VA, .1)
for bt, m in [(0, 74), (1.5, 72), (2, 69), (4, 70), (5.5, 69), (6, 67), (8, 69), (9.5, 72), (10, 74), (12, 73)]:
    piano(b(51) + bt * BEAT, m, .08, .65, .1)
    piano(b(51) + bt * BEAT, m - 12, .04, .55, -.1)
arps(53, VA[2:], 'celesta', gain=.022)
drums(53, 4, kick_=(0, 2), shak=16, kg=.28)
# ---- 57-63  VIII diffusion: noise in, noise out
impact(b(57), .3)
DF = ['Dm', 'Dm', 'Bb', 'Gm', 'A', 'A']
pads(57, DF, 'strings', gain=.028, cut=1300, att=1.0)
t = tv(b(2))
put(hp(noise(len(t)), 1500) * (rng.random(len(t)) > .9994).astype(F32) * 3 + lp(noise(len(t)), 300) * .05, b(57), 'mus', .05)
organ(b(57), [38, 45], b(2), gain=.035, att=1.2, stops='pedal')
bass_8(59, DF[2:], .1)
arps(59, DF[2:], 'pluck', div=4, gain=.024, pat=(5, 3, 4, 2, 3, 1, 2, 0))
drums(59, 4, kick_=(0, 2), snare_=(3,), hats=16, kg=.36, sg=.12)
choir(b(61), [61, 64, 69], b(2), gain=.035, att=.8)
riser(b(63), b(1), .12)
# ---- 63-69  IX flow matching: straight paths
impact(b(63), .35)
FM_ = ['F', 'C', 'Dm', 'Bb', 'F', 'C']
pads(63, FM_, 'organ', gain=.036)
pads(63, FM_, 'strings', gain=.026)
arps(63, FM_, 'pluck', div=4, gain=.022)
arps(65, FM_[2:], 'celesta', div=2, oct_=24, gain=.018)
bass_hold(63, FM_, .11)
drums(64, 5, kick_=(0, 1, 2, 3), kg=.26, shak=16)
# ---- 69-75  X Bayesian flow: beliefs sharpen
BF = ['Gm', 'Dm', 'Bb', 'F', 'Gm', 'A']
pads(69, BF, 'strings', gain=.03)
pads(69, BF, 'choir', gain=.024, att=1.0)
bass_hold(69, BF, .1)
for k in range(5):
    bell(b(69) + 1.33 + k, [74, 77, 81, 84, 86][k], .04, dec=1.8)
arps(71, BF[2:], 'celesta', div=4, oct_=24, gain=.02, pat=(0, 3, 1, 4, 2, 5, 3, 6))
drums(71, 4, kick_=(0, 2), hats=8, taikos=(0,), kg=.32)
riser(b(75), b(1.5), .18)
for k in range(16):
    snare(b(74) + k * BEAT / 4, .02 + .01 * k)
# ---- 75-82  finale: beat-cut montage → AI 药物设计
impact(b(75), .8)
MO = ['Dm', 'Bb', 'Gm', 'A']
pads(75, MO, 'organ', gain=.05)
pads(75, MO, 'strings', gain=.03)
for i, c in enumerate(MO):
    braam(b(75 + i), ROOT[c] - 12, BAR * .9, .04)
arps(75, MO, 'celesta', div=4, oct_=24, gain=.02)
bass_8(75, MO, .11)
drums(75, 4, kick_=(0, 1.5, 2, 3.5), snare_=(1, 3), hats=16, taikos=(0, 2), kg=.46, sg=.2, fill=True)
impact(b(79), 1.0)
TI = ['Bb', 'C', 'D']
pads(79, TI, 'organ', gain=.06)
pads(79, TI, 'choir', gain=.05)
pads(79, TI, 'strings', gain=.032)
bass_hold(79, TI, .12)
drums(79, 2, kick_=(0, 2), snare_=(2,), hats=8, taikos=(0,), kg=.42)
for k, m in enumerate([74, 78, 81, 86, 90, 93]):
    celesta(b(81) + .4 + k * .22, m, .03, dec=2.0, pan=(k - 2.5) * .25)
# ---- 82-90  easter egg: AIDD401 — the mathematics
strings(b(82) + 1.5, [38, 50, 53, 57, 64], b(1.35), gain=.03, att=1.2, rel=.4, cut=1400)
organ(b(82) + 1.5, [26, 38], b(1.35), gain=.04, att=1.0, stops='pedal')
EG = ['Dm9', 'Bb', 'Gm', 'Eb', 'Asus', 'A']
for i, c in enumerate(EG):
    t0 = b(84) + i * BAR * .75
    strings(t0, CH[c], BAR * .75, gain=.028, cut=1800)
    sub(t0, ROOT[c], BAR * .75, .09)
    for k in range(6):
        piano(t0 + k * EIGHTH, ARP[c][[0, 2, 4, 5, 4, 2][k]] + 12, .045, .55, np.sin(k) * .3)
for k in range(8):
    kick(b(85.5) + k * BEAT, .2 + .015 * k, duck=.25)
drums(87, 1, kick_=(0, 1, 2, 3), hats=16, kg=.34)
riser(b(88.5), b(1.5), .18)
for k in range(24):
    snare(b(87.75) + k * BEAT / 8, .01 + .004 * k)
impact(b(88.5), .9)
END = TOTAL - b(88.5)
organ(b(88.5), CH['D'] + [38, 45, 66, 69], END, gain=.07, att=.1, rel=2.6)
choir(b(88.5), [66, 69, 74, 78], END, gain=.05, att=.4, rel=2.6)
strings(b(88.5), [50, 57, 62, 66], END, gain=.03, att=.5, rel=2.6)
sub(b(88.5), 38, END, .12)
drums(88.5, 1, kick_=(0, 2), taikos=(0,), kg=.4)
for k, m in enumerate([74, 78, 81, 86, 90, 93]):
    celesta(b(88.5) + 1.2 + k * .22, m, .035, dec=2.4, pan=(k - 2.5) * .25)
sparkle_notes(b(89.5), 4, 14, seed=7)



# ================================================================== sound effects from the cue sheet
def env_ad(t, a, d):
    return (np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)).astype(F32)


def whoosh_sig(dur, lo=300, hi=3000, rev=False):
    t = tv(dur)
    x = t / dur
    n = noise(len(t))
    k = np.sin(np.pi * x).astype(F32)
    s = bp(n, lo, lo * 3) * (1 - k) + bp(n, hi / 3, hi) * k
    s *= np.sin(np.pi * x) ** 1.5
    return (s[::-1].copy() if rev else s).astype(F32)


def fx_thump(t, **o):
    for d, g in ((0, 1), (.28, .6)):
        s, tt = sweep_sine(62, 38, .35)
        put(s * np.exp(-tt / .12), t + d, 'sfx', .5 * g, wet=.2)


def fx_heart(t, **o):
    for d, g in ((0, 1), (.26, .65)):
        s, tt = sweep_sine(58, 40, .3)
        put(s * np.exp(-tt / .1), t + d, 'sfx', .33 * g, wet=.25)


def fx_hit(t, k=.6, **o):
    s, tt = sweep_sine(80, 34, 1.2)
    put(np.tanh(2 * s * np.exp(-tt / .35)), t, 'sfx', .42 * k, wet=.3)
    n = len(tv(.5))
    put(bp(noise(n), 1800, 9000) * np.exp(-tv(.5) / .025), t, 'sfx', .22 * k, wet=.4)
    tt = tv(1.2)
    met = sum(np.sin(TAU * f * tt) * np.exp(-tt / d) for f, d in ((1390, .3), (2310, .2), (3710, .12)))
    put(met, t, 'sfx', .05 * k, wet=.6)
    put(whoosh_sig(.22, 800, 6000, rev=True), t - .22, 'sfx', .1 * k)


def fx_suck(t, dur=.45, **o):
    tt = tv(dur)
    s = hp(noise(len(tt)), 3000) * (tt / dur) ** 3
    put(s, t, 'sfx', .22, wet=.2)


def fx_ring(t, dur=2.5, **o):
    tt = tv(dur)
    e = np.minimum(1, tt / .05) * np.exp(-tt / (dur * .45))
    put((np.sin(TAU * 3150 * tt) + .5 * np.sin(TAU * 4270 * tt)) * e, t, 'sfx', .02, wet=.4)
    put(lp(noise(len(tt)), 90) * np.exp(-tt / (dur * .5)), t, 'sfx', .25)


def fx_sparkle(t, dur=2.0, **o):
    r = np.random.default_rng(int(t * 100))
    cnt = int(dur * 26)
    for i in range(cnt):
        u = r.random()
        f = midi([86, 88, 89, 93, 96, 98, 100, 101][r.integers(8)])
        tt = tv(.35)
        s = np.sin(TAU * f * tt) * np.exp(-tt / (.08 + .2 * r.random()))
        put(s, t + u * dur, 'sfx', .012 * np.sin(np.pi * u) ** .5, r.random() * 1.6 - .8, wet=.8)


def fx_swell(t, dur=1.5, **o):
    tt = tv(dur)
    x = tt / dur
    put(lp(noise(len(tt)), 2500) * x ** 3, t, 'sfx', .12, wet=.7)
    for m in (62, 69, 74):
        put(np.sin(TAU * midi(m) * tt) * x ** 2.5, t, 'sfx', .02, wet=1.0)


def fx_whoosh(t, dur=1.0, rev=0, **o):
    s = whoosh_sig(dur, 250, 3500, bool(rev))
    pan = np.linspace(-.6, .6, len(s))
    a = (pan + 1) * np.pi / 4
    put(np.stack([s * np.cos(a), s * np.sin(a)]) * 1.41, t, 'sfx', .2, wet=.35)


def fx_swish(t, pitch=1.0, **o):
    put(whoosh_sig(.38, 900 * pitch, 7000 * pitch), t - .05, 'sfx', .12, .3, wet=.3)


def fx_shimmer(t, **o):
    tt = tv(3.0)
    s = sum(np.sin(TAU * 1480 * r * tt * (1 + .002 * np.sin(TAU * 5 * tt))) * np.exp(-tt / d) for r, d in ((1, 2.2), (2.76, 1.4), (5.4, .9), (8.93, .5)))
    put(s * np.minimum(1, tt / .01), t, 'sfx', .035, wet=.9)
    fx_sparkle(t, 1.2)


def fx_chime(t, midi_=81, **o):
    bell(t, midi_, .06, dec=2.4, bus='sfx', hall=0, wet=.8)


def fx_ding(t, midi_=81, **o):
    bell(t, midi_, .055, dec=1.6, index=2.4, bus='sfx', hall=0, wet=.6)


def fx_note(t, midi_=72, **o):
    celesta(t, midi_, .07, dec=1.6, bus='sfx', wet=.6)


def fx_tick(t, hi=True, gain=1.0, pitch=1.0, **o):
    tt = tv(.05)
    s = np.sin(TAU * (3200 if hi else 2400) * pitch * tt) * np.exp(-tt / .006) + .5 * hp(noise(len(tt)), 4000) * np.exp(-tt / .003)
    put(s, t, 'sfx', .09 * gain, .1 if hi else -.1, wet=.25)


def fx_boom(t, **o):
    s, tt = sweep_sine(70, 30, 2.5)
    put(np.tanh(1.8 * s) * np.exp(-tt / .9), t, 'sfx', .38, wet=.4)
    put(lp(noise(len(tt)), 400) * np.exp(-tt / .4), t, 'sfx', .15, wet=.6)


def fx_glide(t, dur=8.0, **o):
    tt = tv(dur)
    x = tt / dur
    s = np.zeros(len(tt), F32)
    for f0 in (660, 990, 1320):
        f = f0 * 2 ** x * (1 + .004 * np.sin(TAU * 5.5 * tt))
        s += np.sin(TAU * np.cumsum(f) / SR).astype(F32)
    put(s * np.sin(np.pi * x) ** 2, t, 'sfx', .012, wet=1.0)


def fx_click(t, pan=0.0, pitch=0, **o):
    n = int(.09 * SR)
    tt = np.arange(n) / SR
    f = (1.0, 1.12, .9)[int(pitch) % 3]
    s = np.zeros(n, F32)
    for d, g in ((0, 1), (.026, .7)):
        i = int(d * SR)
        s[i:] += g * bp(noise(n - i), 1800 * f, 4200 * f) * np.exp(-tt[:n - i] / .007)
    s += .5 * np.sin(TAU * 170 * f * tt) * np.exp(-tt / .025)
    put(s, t, 'sfx', .16, pan, wet=.15)


def fx_roll(t, dur=2.2, **o):
    tk, rate = 0.0, 28.0
    while tk < dur:
        tt = tv(.03)
        put(hp(noise(len(tt)), 3000) * np.exp(-tt / .004) + .3 * np.sin(TAU * 2600 * tt) * np.exp(-tt / .006), t + tk, 'sfx', .05, np.sin(tk * 9) * .3, wet=.1)
        rate = 28 - 20 * tk / dur
        tk += 1 / rate


def fx_solved(t, **o):
    for k, m in enumerate([74, 78, 81, 86, 90]):
        bell(t + k * .045, m, .045, dec=1.8, pan=(k - 2) * .3, bus='sfx', hall=0, wet=.8)
    fx_sparkle(t, .8)


def fx_glass(t, midi_=86, **o):
    f = midi(midi_)
    tt = tv(3.0)
    s = sum(a * np.sin(TAU * f * r * tt + ph) * np.exp(-tt / d) for r, d, a, ph in ((1, 2.2, 1, 0), (2.32, 1.2, .5, 1), (4.25, .7, .3, 2), (6.63, .4, .2, 3), (1.003, 2.2, .6, 4)))
    put(s * np.minimum(1, tt / .002), t, 'sfx', .03, np.sin(midi_) * .4, wet=.9)


def fx_crystal(t, **o):
    for k, m in enumerate([88, 91, 95, 98, 100, 103]):
        fx_glass(t + k * .05, m)
    fx_swell(t - 1.0, 1.0)


def fx_quill(t, dur=1.0, **o):
    tt = tv(dur)
    r = np.random.default_rng(int(t * 10))
    rate = 10 + 3 * np.sin(TAU * .7 * tt + r.random() * 6)
    strokes = np.abs(np.sin(np.pi * np.cumsum(rate) / SR)) ** 3
    s = bp(noise(len(tt)), 2500, 7500) * strokes * (.6 + .4 * r.random(len(tt)).astype(F32))
    s += hp(noise(len(tt)), 5000) * (r.random(len(tt)) > .9985).astype(F32) * 2
    put(s * np.minimum(1, tt / .05) * np.minimum(1, (dur - tt) / .08), t, 'sfx', .05, .25, wet=.2)


def fx_puff(t, **o):
    tt = tv(.6)
    put(bp(noise(len(tt)), 300, 2500) * env_ad(tt, .03, .18), t, 'sfx', .18, -.4, wet=.3)


def fx_stamp(t, **o):
    s, tt = sweep_sine(95, 55, .5)
    put(s * np.exp(-tt / .12) + bp(noise(len(tt)), 200, 900) * np.exp(-tt / .05) + .5 * hp(noise(len(tt)), 2000) * np.exp(-tt / .02), t, 'sfx', .32, .3, wet=.35)


def fx_perm(t, **o):
    put(whoosh_sig(.6, 200, 1800), t, 'sfx', .08, wet=.4)
    celesta(t + .3, [74, 77, 81, 69, 72][int(t * 3) % 5], .03, dec=1.0, bus='sfx', wet=.5)


def fx_chisel(t, k=0, **o):
    f = 1 + .035 * (int(k) % 3)
    tt = tv(.5)
    met = sum(np.sin(TAU * 2450 * f * r * tt) * np.exp(-tt / d) for r, d in ((1, .12), (1.62, .09), (2.5, .06), (3.39, .04)))
    put(met + .8 * bp(noise(len(tt)), 600, 3500) * np.exp(-tt / .04) + .6 * np.sin(TAU * 140 * tt) * np.exp(-tt / .035), t, 'sfx', .11, -.2 + .08 * k, wet=.35)


def fx_spark(t, dur=3.0, **o):
    tt = tv(dur)
    r = np.random.default_rng(int(t * 7))
    s = hp(noise(len(tt)), 3000) * (r.random(len(tt)) > .9975).astype(F32) * 4 * r.random(len(tt)).astype(F32)
    put(s, t, 'sfx', .06, wet=.3)


def fx_blip(t, midi_=84, **o):
    f = midi(midi_)
    tt = tv(.25)
    fr = f * (1 + .5 * np.exp(-tt / .02))
    put(np.tanh(2.5 * np.sin(TAU * np.cumsum(fr) / SR)) * np.exp(-tt / .1), t, 'sfx', .045, np.sin(midi_) * .4, wet=.3)


def fx_zap(t, **o):
    s, tt = sweep_sine(2400, 180, .3)
    put(s * np.exp(-tt / .12), t, 'sfx', .06, wet=.3)


def fx_whoop(t, **o):
    s, tt = sweep_sine(350, 1400, .35)
    put(s * np.sin(np.pi * tt / .35), t, 'sfx', .05, wet=.3)


def fx_data(t, dur=6.0, **o):
    r = np.random.default_rng(int(t))
    k = 0
    while k * EIGHTH / 2 < dur:
        if r.random() < .55:
            tt = tv(.05)
            f = 800 + 2200 * r.random()
            put(np.sign(np.sin(TAU * f * tt)) * np.exp(-tt / .012), t + k * EIGHTH / 2, 'sfx', .015, r.random() - .5, wet=.2)
        k += 1


def fx_glitch(t, **o):
    tt = tv(.24)
    s = np.round(noise(len(tt)) * 3) / 3 * (np.sin(TAU * 38 * tt) > 0).astype(F32)
    put(bp(s, 500, 6000), t, 'sfx', .08, wet=.2)


def fx_rip(t, **o):
    tt = tv(.6)
    r = np.random.default_rng(3)
    bursts = lp((r.random(len(tt)) > .96).astype(F32) * r.random(len(tt)).astype(F32), 300) * 40
    s = bp(noise(len(tt)), 1000, 6000) * (.3 + bursts) * np.sin(np.pi * tt / .6) ** .7
    put(s, t, 'sfx', .15, .35, wet=.25)


def fx_scan(t, dur=2.0, **o):
    tt = tv(dur)
    s = np.sin(TAU * 1150 * tt + 2 * np.sin(TAU * 7 * tt)) * .4 + bp(noise(len(tt)), 2000, 4000)
    put(s * np.minimum(1, tt / .1) * np.minimum(1, (dur - tt) / .15), t, 'sfx', .025, wet=.3)


def fx_success(t, **o):
    bell(t, 88, .05, dec=1.4, index=1.0, bus='sfx', hall=0, wet=.7)
    bell(t + .12, 95, .05, dec=1.8, index=1.0, bus='sfx', hall=0, wet=.7)


def fx_pop(t, midi_=76, **o):
    f = midi(midi_)
    tt = tv(.18)
    fr = f * (1 + 1.0 * np.exp(-tt / .015))
    put(np.sin(TAU * np.cumsum(fr) / SR) * np.exp(-tt / .06), t, 'sfx', .04, np.sin(midi_ * 1.7) * .5, wet=.4)


def fx_tracks(t, dur=2.5, **o):
    fx_spark(t, dur)
    put(whoosh_sig(dur, 150, 1500), t, 'sfx', .06, wet=.4)


def fx_rattle(t, dur=2.0, **o):
    r = np.random.default_rng(9)
    for _ in range(60):
        u = r.random() ** 1.5
        tt = tv(.03)
        put(bp(noise(len(tt)), 1500, 5000) * np.exp(-tt / .005), t + .3 + u * dur, 'sfx', .03, r.random() * 1.6 - .8, wet=.2)
    put(whoosh_sig(dur, 200, 2500), t, 'sfx', .08, wet=.3)


FX = {k[3:]: v for k, v in globals().items() if k.startswith('fx_')}
cues = json.load(open('cues.json', encoding='utf-8'))
missing = sorted({c['name'] for c in cues} - FX.keys())
if missing:
    raise SystemExit(f'no sound for cues: {missing}')
for c in cues:
    o = {('midi_' if k == 'midi' else k): v for k, v in c.items() if k not in ('t', 'name')}
    FX[c['name']](c['t'], **o)
print(f'placed {len(cues)} sound effects')


# ================================================================== mix + master
def ir(tau_bands, dur, pre=.02, seed=0, er=8):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = []
    for ch in range(2):
        x = r.standard_normal(n).astype(F32)
        y = np.zeros(n, F32)
        for (lo, hi), tau in tau_bands:
            y += (bp(x, lo, hi) if lo else lp(x, hi)) * np.exp(-t / tau)
        y *= np.minimum(1, t / .008)
        for k in range(er):
            y[int((pre + r.random() * .06) * SR)] += (.6 - k * .05) * (1 if r.random() < .5 else -1)
        y = np.concatenate([np.zeros(int(pre * SR), F32), y])
        out.append(y / np.sqrt(np.sum(y ** 2)))
    return out


HALL = ir([((0, 300), 1.2), ((300, 1500), 1.0), ((1500, 5000), .7), ((5000, 16000), .35)], 3.6, .025, 1)
PLATE = ir([((0, 500), .55), ((500, 4000), .6), ((4000, 16000), .45)], 1.8, .008, 2)
ROOM = ir([((0, 400), .18), ((400, 6000), .16), ((6000, 16000), .08)], .7, .004, 3)


def conv(bus, h):
    return np.stack([fftconvolve(BUS[bus][c], h[c])[:N].astype(F32) for c in range(2)])


print('reverbs…')
wet_music = conv('hall', HALL) * .55 + conv('plate', PLATE) * .5 + conv('room', ROOM) * .6
wet_sfx = conv('sfxwet', PLATE) * .6

# sidechain: kicks and impacts duck the sustained pad bus
duck = np.zeros(N, F32)
for tk, depth in KICKS:
    i = int(tk * SR)
    L = min(int(.45 * SR), N - i)
    if L > 0:
        duck[i:i + L] = np.maximum(duck[i:i + L], depth * np.exp(-np.arange(L) / SR / .16))
pad = BUS['pad'] * (1 - .5 * duck)

music = BUS['mus'] + pad + BUS['drm'] * .9 + wet_music
sfx = BUS['sfx'] + wet_sfx

# arrangement automation: the hard cut to silence after the teaser, and the hush before the easter egg
tt = np.arange(N, dtype=F32) / SR
gate = np.ones(N, F32)
gate *= np.clip((6.66 - tt) / .05, 0, 1) + np.clip((tt - 7.2) / .6, 0, 1)
d0 = b(82)                                               # hard cut into the easter-egg glitch card
gate *= 1 - .9 * np.clip((tt - d0 + .03) / .05, 0, 1) * np.clip((d0 + 1.9 - tt) / .5, 0, 1)
music *= np.minimum(gate, 1)

mix = music * .92 + sfx
# the sine subs / taiko sit 8-10 dB above the rest: zero-phase low shelf, about -8 dB at 60 Hz, -3 dB at 120 Hz
mix = np.stack([hp(mix[c], 30) for c in range(2)])
mix -= .62 * sosfiltfilt(butter(2, 120, 'low', fs=SR, output='sos'), mix, axis=1).astype(F32)
# and the noise-based hats / risers turn fizzy once the lows are down: about -3.5 dB above 8 kHz
mix -= .33 * sosfiltfilt(butter(2, 7000, 'high', fs=SR, output='sos'), mix, axis=1).astype(F32)

# glue compression, then a look-ahead limiter
mono = np.sqrt((mix[0] ** 2 + mix[1] ** 2) / 2)
a = np.exp(-1 / (.12 * SR))
env = np.sqrt(lfilter([1 - a], [1, -a], mono ** 2) + 1e-12)
lvl = 20 * np.log10(env / (np.max(env) + 1e-9) + 1e-9)
g = 10 ** (-np.maximum(0, lvl + 12) * (1 - 1 / 2.2) / 20)
mix *= g.astype(F32)
mix /= np.max(np.abs(mix)) + 1e-9
L = int(.004 * SR)
pk = maximum_filter1d(np.max(np.abs(mix), axis=0), size=2 * L + 1)
g = np.minimum(1, .5 / np.maximum(pk, 1e-9))
a = np.exp(-1 / (.09 * SR))
gs = lfilter([1 - a], [1, -a], g)
mix *= np.minimum(g, gs).astype(F32)
end = int(TOTAL * SR)
mix = mix[:, :end]
mix *= np.minimum(1, (end - np.arange(end)) / (2.5 * SR)).astype(F32)
mix /= np.max(np.abs(mix)) + 1e-9
pcm = (mix.T * 32000).astype(np.int16)
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
# two-pass loudnorm (the single pass overshoots the true-peak ceiling)
LN = 'loudnorm=I=-14:TP=-1.5:LRA=11'
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', 'music.wav', '-af', LN + ':print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
m = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
LN += f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'music.wav', '-af', LN + ',alimiter=limit=-1.8dB:level=false', '-ar', '44100', '-b:a', '192k', 'music.mp3'], check=True)
print(f'music: {TOTAL:.2f}s')
