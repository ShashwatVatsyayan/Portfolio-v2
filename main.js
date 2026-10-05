/* ═══════════════════════════════════════════════════════════
   SHASHWAT VATSYAYAN — CINEMATIC PORTFOLIO ENGINE
   HTML5 Canvas Frame-Scrubbed Hero + Dual-Eye Hover Tracking
   + Black Dissolve Silhouette Dispersal + Ambient Systems
   ═══════════════════════════════════════════════════════════ */

import { projects } from './06_SRC/data/projects.js';
import { CircularCarousel } from './06_SRC/components/CircularCarousel/CircularCarousel.js';
import { ProjectDetails } from './06_SRC/components/ProjectDetails/ProjectDetails.js';
import { TargetCursor } from './06_SRC/components/TargetCursor/TargetCursor.js';
import { LogoLoop } from './06_SRC/components/LogoLoop/LogoLoop.js';
import { techLogos } from './06_SRC/components/LogoLoop/TechLogos.js';
import { PixelSwap } from './06_SRC/components/PixelSwap/PixelSwap.js';
import { FlipCard } from './06_SRC/components/FlipCard/FlipCard.js';
import { ScrollVelocity } from './06_SRC/components/ScrollVelocity/ScrollVelocity.js';
import { ScrollReveal, initScrollReveal } from './06_SRC/components/ScrollReveal/ScrollReveal.js';
import { DecryptedText, initDecryptedText } from './06_SRC/components/DecryptedText/DecryptedText.js';
import { FallingText, initFallingText } from './06_SRC/components/FallingText/FallingText.js';
import { ShinyText, initShinyText } from './06_SRC/components/ShinyText/ShinyText.js';
import { Lanyard, initLanyard } from './06_SRC/components/Lanyard/Lanyard.js';
import { ClickSpark, initClickSpark } from './06_SRC/components/ClickSpark/ClickSpark.js';

// Explicitly lock scroll position to absolute top on load & clear hash
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
if (window.location.hash) {
  history.replaceState(null, document.title, window.location.pathname);
}
window.scrollTo(0, 0);

const MAIN_COUNT = 240;
const pad = n => String(n).padStart(4, '0');

const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* Fade in over [a,b], hold over [b,c], fade out over [c,d] */
const window4 = (p, a, b, c, d) =>
  p < a || p > d ? 0 : p < b ? (p - a) / (b - a) : p > c ? 1 - (p - c) / (d - c) : 1;

/* ───────────────────────── PRELOAD HERO FRAMES ───────────────────────── */
const mainFrames = [];
let loaded = 0;
const total = MAIN_COUNT;

const loaderEl   = document.getElementById('loader');
if (loaderEl) {
  loaderEl.style.display = 'none';
}
const loaderFill = document.getElementById('loaderFill');
const loaderPct  = document.getElementById('loaderPct');
let appReady = false;

function markReady() {
  if (appReady) return;
  appReady = true;
  if (loaderEl) loaderEl.classList.add('done');
  document.body.classList.add('ready');
  resizeAll();
  setTimeout(() => {
    if (loaderEl) loaderEl.style.display = 'none';
  }, 800);
}

function load(src, bucket, index) {
  return new Promise(res => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      bucket[index] = img;
      loaded++;
      const pct = loaded / total;
      if (loaderFill) loaderFill.style.width = (pct * 100).toFixed(1) + '%';
      if (loaderPct)  loaderPct.textContent  = String(Math.round(pct * 100)).padStart(2, '0');
      // If first frame loaded, render immediately
      if (index === 0 && mainCanvas && mainCtx) {
        drawHeroComposite(mainCtx, img, mainCanvas.width, mainCanvas.height, ex, ey, 0);
      }
      // Progressive ready state: unlock as soon as first 24 frames (~10%) load
      if (loaded >= 24) {
        markReady();
      }
      res(img);
    };
    img.onerror = () => {
      loaded++;
      res(null);
    };
    img.src = src;
  });
}

// Priority load first 24 frames immediately
for (let i = 1; i <= 24; i++) {
  load(`frames/main/${pad(i)}.jpg`, mainFrames, i - 1);
}

// Stagger remaining frames in background so initial render is instantaneous
setTimeout(() => {
  for (let i = 25; i <= MAIN_COUNT; i++) {
    load(`frames/main/${pad(i)}.jpg`, mainFrames, i - 1);
  }
}, 100);

// Safety timeout: unlock UI after 1.5s regardless of network speed
setTimeout(markReady, 1500);

function getNearestFrame(targetIdx) {
  if (mainFrames[targetIdx] && mainFrames[targetIdx].complete && mainFrames[targetIdx].naturalWidth) {
    return mainFrames[targetIdx];
  }
  for (let offset = 1; offset < MAIN_COUNT; offset++) {
    const prev = targetIdx - offset;
    if (prev >= 0 && mainFrames[prev] && mainFrames[prev].complete && mainFrames[prev].naturalWidth) {
      return mainFrames[prev];
    }
    const next = targetIdx + offset;
    if (next < MAIN_COUNT && mainFrames[next] && mainFrames[next].complete && mainFrames[next].naturalWidth) {
      return mainFrames[next];
    }
  }
  return mainFrames[0] || null;
}

/* ─────────────────── CANVAS FIT & RESIZING ─────────────────── */
function fitCanvas(canvas) {
  if (!canvas) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(canvas.offsetWidth  * dpr);
  const h = Math.round(canvas.offsetHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return canvas.getContext('2d');
}

function syncSize(canvas) {
  if (!canvas) return false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(canvas.offsetWidth  * dpr);
  const h = Math.round(canvas.offsetHeight * dpr);
  return canvas.width !== w || canvas.height !== h;
}

/* ═══════════════════════════════════════════════════════════
   HERO CANVAS COMPOSITOR:
   1. Preserves 100% of the cinematic camera movement without cropping!
      (Full Body -> Fast Push-in -> Close-up Face -> Eye Transformation
       -> Sharingan -> Rotation -> Mangekyō -> Hold -> Camera Pulls Back -> Full Final)
   2. Zero artificial dark eye overlays; 100% authentic video eye frames.
   3. Subtle micro-parallax on pointer motion for organic responsiveness.
   ═══════════════════════════════════════════════════════════ */
function drawHeroComposite(ctx, frame, cw, ch, pointerX, pointerY, scrubP) {
  if (!frame || !frame.naturalWidth || !ctx || cw <= 0 || ch <= 0) return false;

  const imgRatio = frame.naturalWidth / frame.naturalHeight; // 720 / 1280 = 0.5625
  const canvasRatio = cw / ch;
  let drawW, drawH, drawX, drawY;

  // Preserve complete frame aspect ratio with contain-style calculation
  if (canvasRatio > imgRatio) {
    drawH = ch;
    drawW = ch * imgRatio;
    drawX = (cw - drawW) * 0.5;
    drawY = 0;
  } else {
    drawW = cw;
    drawH = cw / imgRatio;
    drawX = 0;
    drawY = (ch - drawH) * 0.5;
  }

  // Subtle interactive parallax from cursor hover
  const microParallaxX = (pointerX - 0.5) * Math.min(10, cw * 0.008);
  const microParallaxY = (pointerY - 0.5) * Math.min(8, ch * 0.006);

  const fx = drawX + microParallaxX;
  const fy = drawY + microParallaxY;

  // Solid background fill matching near-black canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, cw, ch);

  // Draw full uncropped source frame
  ctx.drawImage(frame, fx, fy, drawW, drawH);

  // Controlled soft background blending at drawn borders to eliminate harsh side cropping
  const featherW = Math.min(48, drawW * 0.08);
  if (featherW > 2 && drawX > 0) {
    // Soft left edge blend into black
    const gL = ctx.createLinearGradient(fx, 0, fx + featherW, 0);
    gL.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gL.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gL;
    ctx.fillRect(fx - 2, fy, featherW + 2, drawH);

    // Soft right edge blend into black
    const gR = ctx.createLinearGradient(fx + drawW - featherW, 0, fx + drawW, 0);
    gR.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gR.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = gR;
    ctx.fillRect(fx + drawW - featherW, fy, featherW + 2, drawH);
  }

  if (drawY > 0) {
    const featherH = Math.min(36, drawH * 0.06);
    // Soft top edge blend into black
    const gT = ctx.createLinearGradient(0, fy, 0, fy + featherH);
    gT.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gT.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gT;
    ctx.fillRect(fx, fy - 2, drawW, featherH + 2);

    // Soft bottom edge blend into black
    const gB = ctx.createLinearGradient(0, fy + drawH - featherH, 0, fy + drawH);
    gB.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gB.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = gB;
    ctx.fillRect(fx, fy + drawH - featherH, drawW, featherH + 2);
  }

  return true;
}

/* ═══════════════════ ACT I — HERO SCROLL SCRUB ═══════════════════ */
const scrubSection = document.getElementById('scrub');
const mainCanvas   = document.getElementById('mainCanvas');
const scrubGlow    = document.getElementById('scrubGlow');
const titleblock   = document.getElementById('titleblock');
const phases       = [...document.querySelectorAll('.phase')];
let mainCtx = fitCanvas(mainCanvas);

let frameTarget = 0, frameShown = 0, lastDrawn = -1;
let scrubProgress = 0;

let mx = 0.5, my = 0.5;
let ex = 0.5, ey = 0.5;
let lastDrawnEx = -999, lastDrawnEy = -999;

window.addEventListener('pointermove', e => {
  mx = e.clientX / window.innerWidth;
  my = e.clientY / window.innerHeight;
  cursorX = e.clientX;
  cursorY = e.clientY;
}, { passive: true });

function readScrub() {
  if (!scrubSection) return;
  const rect = scrubSection.getBoundingClientRect();
  const dist = scrubSection.offsetHeight - window.innerHeight;
  scrubProgress = clamp(-rect.top / (dist || 1));
  frameTarget = scrubProgress * (MAIN_COUNT - 1);
}

/* Phase choreography mapped to the 240-frame sequence */
const PHASE_WINDOWS = [
  [0.05, 0.10, 0.18, 0.24],   // SILENCE
  [0.26, 0.32, 0.42, 0.48],   // AWAKENING
  [0.50, 0.56, 0.64, 0.70],   // SHARINGAN
  [0.68, 0.72, 0.77, 0.81],   // MANGEKYŌ
  [0.78, 0.82, 0.88, 0.93],   // DISSOLVE & ILLUSION
];

function paintOverlays(p) {
  phases.forEach((el, i) => {
    if (!PHASE_WINDOWS[i]) return;
    const o = window4(p, ...PHASE_WINDOWS[i]);
    el.style.opacity = o.toFixed(3);
    el.style.setProperty('--y', `${((1 - o) * 34).toFixed(1)}px`);
    el.style.filter = `blur(${((1 - o) * 6).toFixed(2)}px)`;
  });

  if (titleblock) {
    const t = window4(p, -0.10, -0.05, 0.08, 0.14);
    titleblock.style.opacity = t.toFixed(3);
    titleblock.style.transform = `translateX(-50%) translateY(${((1 - t) * 40).toFixed(1)}px) scale(${(0.97 + t * 0.03).toFixed(3)})`;
    titleblock.style.letterSpacing = `${((1 - t) * 0.10).toFixed(3)}em`;
  }

  if (scrubGlow) {
    scrubGlow.style.opacity = (clamp((p - 0.40) / 0.18) * 0.8).toFixed(3);
  }
}

/* ═════════════════ AMBIENT PARTICLES ═════════════════ */
const featherCanvas = document.getElementById('featherCanvas');
let fCtx = fitCanvas(featherCanvas);
const feathers = [];

function seedFeathers() {
  feathers.length = 0;
  const n = window.innerWidth < 820 ? 24 : 48;
  for (let i = 0; i < n; i++) {
    feathers.push({
      x: Math.random(),
      y: Math.random(),
      s: 0.35 + Math.random() * 1.1,
      vx: 0.16 + Math.random() * 0.45,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.02,
      sway: Math.random() * Math.PI * 2,
      a: 0.15 + Math.random() * 0.45,
    });
  }
}
seedFeathers();

function drawFeather(ctx, f, w, h, dir, intensity) {
  const x = f.x * w, y = f.y * h;
  const len = 20 * f.s * (w / 1280 + 0.5);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(f.rot + Math.sin(f.sway) * 0.35 + (dir < 0 ? Math.PI : 0));
  ctx.globalAlpha = f.a * intensity;
  ctx.fillStyle = '#0d0d10';
  ctx.strokeStyle = 'rgba(255,43,43,.5)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.quadraticCurveTo(-len * 0.15, -len * 0.4, len, 0);
  ctx.quadraticCurveTo(-len * 0.15,  len * 0.4, -len, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/* ═════════════════ AMATERASU — BLACK FLAME HEM ═════════════════ */
const amaCanvas = document.getElementById('amaterasuCanvas');
let amaCtx = fitCanvas(amaCanvas);
const flames = [];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let amaPainted = false;

function seedFlames() {
  flames.length = 0;
  const n = Math.max(22, Math.round(window.innerWidth / 28));
  for (let i = 0; i < n; i++) {
    const depth = Math.random();
    flames.push({
      x: (i + Math.random() * 1.1) / n,
      depth,
      drift: (Math.random() - 0.5) * 0.05,
      h: (0.42 + Math.random() * 0.5) * (1.15 - depth * 0.35),
      w: (0.34 + Math.random() * 0.6) * (0.7 + depth * 0.7),
      speed: 0.7 + Math.random() * 1.25,
      lean: (Math.random() - 0.5) * 0.5,
      phase: Math.random() * Math.PI * 2,
      seed: Math.random() * 100,
    });
  }
  flames.sort((a, b) => a.depth - b.depth);
}
seedFlames();

function flameBlob(f, i, BLOBS, w, h, p, tall, wide) {
  const u = i / (BLOBS - 1);
  const baseX = (f.x + Math.sin(p * 0.4 + f.seed) * f.drift) * w;
  return {
    u,
    x: baseX + (f.lean * u + Math.sin(p * 1.7 + u * 3.4 + f.seed) * 0.6 * u) * wide,
    y: h - Math.pow(u, 0.82) * tall,
    r: wide * (1 - u * 0.78) + wide * 0.06,
  };
}

function drawFlame(ctx, f, w, h, t) {
  const p = f.phase + t * f.speed;
  const lick = 0.74 + Math.sin(p) * 0.18 + Math.sin(p * 2.9 + f.seed) * 0.08;
  const tall = h * f.h * lick;
  const wide = h * 0.24 * f.w;
  const near = 0.55 + f.depth * 0.45;
  const BLOBS = 9;

  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < BLOBS; i++) {
    const b = flameBlob(f, i, BLOBS, w, h, p, tall, wide);
    const r = b.r * 1.28;
    const heat = Math.pow(1 - b.u, 1.6) * 0.9 + 0.06;
    const g = ctx.createRadialGradient(b.x, b.y, r * 0.45, b.x, b.y, r);
    g.addColorStop(0,    `rgba(214,32,44,${0.4 * heat * near})`);
    g.addColorStop(0.55, `rgba(126,12,30,${0.2 * heat * near})`);
    g.addColorStop(1,    'rgba(46,0,14,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < BLOBS; i++) {
    const b = flameBlob(f, i, BLOBS, w, h, p, tall, wide);
    const a = (0.97 - b.u * 0.42) * near;
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0,    `rgba(3,2,4,${a})`);
    g.addColorStop(0.62, `rgba(6,3,8,${a * 0.8})`);
    g.addColorStop(1,    'rgba(9,5,11,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEmbers(ctx, w, h, t) {
  ctx.globalCompositeOperation = 'lighter';
  const n = 14;
  for (let i = 0; i < n; i++) {
    const s = i * 12.9898;
    const life = (t * (0.22 + (i % 5) * 0.05) + i / n) % 1;
    const x = ((Math.sin(s) * 0.5 + 0.5) + Math.sin(t * 0.6 + s) * 0.02) * w;
    const y = h - life * h * 0.95;
    const a = Math.sin(life * Math.PI) * 0.5;
    const r = h * 0.018 * (1.4 - life * 0.6);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,74,60,${a})`);
    g.addColorStop(1, 'rgba(120,10,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function paintAmaterasu(t) {
  if (!amaCanvas || !amaCtx) return;
  const w = amaCanvas.width, h = amaCanvas.height;
  amaCtx.clearRect(0, 0, w, h);
  for (const f of flames) drawFlame(amaCtx, f, w, h, t);
  drawEmbers(amaCtx, w, h, t);
}

/* ═════════════════════ CUSTOM CURSOR ═════════════════════ */
const cursorEl = document.getElementById('cursor');
let cursorX = window.innerWidth / 2, cursorY = window.innerHeight / 2;
let cx = cursorX, cy = cursorY;

document.querySelectorAll('a, button, .project-card, .skill-card, .creative-card, .exp-card, .contact-card').forEach(el => {
  el.addEventListener('pointerenter', () => cursorEl && cursorEl.classList.add('hot'));
  el.addEventListener('pointerleave', () => cursorEl && cursorEl.classList.remove('hot'));
});

/* ═════════════════════ SCROLL CHROME ═════════════════════ */
const hint       = document.getElementById('hint');
const railScroll = document.getElementById('railScroll');
let lastScrollY  = window.scrollY;
let scrollDir = 1, scrollVel = 0;

function readScroll() {
  const y = window.scrollY;
  const d = y - lastScrollY;
  if (Math.abs(d) > 0.4) scrollDir = d > 0 ? 1 : -1;
  scrollVel = lerp(scrollVel, Math.min(Math.abs(d) / 42, 1), 0.12);
  lastScrollY = y;

  const doc = document.documentElement.scrollHeight - window.innerHeight;
  const pct = Math.round((y / (doc || 1)) * 100);
  if (railScroll) railScroll.textContent = `SCROLL ${String(pct).padStart(3, '0')}%`;
  if (hint) hint.classList.toggle('hide', y > window.innerHeight * 0.35);
}

/* ═══════════════════════════════════════════════════════════
   STORM — LIGHTNING FLASHES + SYNTHESIZED THUNDER
   ═══════════════════════════════════════════════════════════ */
const STRIKE_GAP   = 500;
const STRIKE_EVERY = [3500, 7500];

const stormFlash = document.getElementById('stormFlash');
const stormBolt  = document.getElementById('stormBolt');
const boltPath   = document.getElementById('boltPath');
const boltGlow   = document.getElementById('boltGlow');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let audioCtx = null, thunderOn = false;

function initAudio() {
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  audioCtx = new AC();
  return audioCtx;
}

function playThunder(power = 1) {
  if (!thunderOn) return;
  const ctx = initAudio();
  if (!ctx || ctx.state === 'suspended') return;

  const now = ctx.currentTime;
  const dur = 2.2 + Math.random() * 2.2 * power;

  const frames = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < frames; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    d[i] = last * 3.2;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1400 * power, now);
  lp.frequency.exponentialRampToValueAtTime(90, now + dur);

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 28;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.55 * power, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.16 * power, now + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(58, now);
  sub.frequency.exponentialRampToValueAtTime(24, now + dur * 0.8);
  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.0001, now);
  subGain.gain.exponentialRampToValueAtTime(0.32 * power, now + 0.12);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.85);

  src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
  sub.connect(subGain); subGain.connect(ctx.destination);

  src.start(now); src.stop(now + dur);
  sub.start(now); sub.stop(now + dur);
}

function makeBolt() {
  const x0 = 80 + Math.random() * 840;
  let x = x0, y = 0;
  let dPath = `M ${x.toFixed(0)} 0`;
  const steps = 14 + Math.floor(Math.random() * 8);
  const forks = [];
  const drift = (Math.random() - 0.5) * 40;

  for (let i = 1; i <= steps; i++) {
    y = (i / steps) * (620 + Math.random() * 300);
    x += drift + (Math.random() - 0.5) * 130;
    x = Math.max(20, Math.min(980, x));
    dPath += ` L ${x.toFixed(0)} ${y.toFixed(0)}`;
    if (Math.random() < 0.30 && i > 3) {
      let fx = x, fy = y, f = `M ${x.toFixed(0)} ${y.toFixed(0)}`;
      const fs = 2 + Math.floor(Math.random() * 4);
      for (let k = 0; k < fs; k++) {
        fx += (Math.random() - 0.5) * 150;
        fy += 40 + Math.random() * 80;
        f += ` L ${fx.toFixed(0)} ${fy.toFixed(0)}`;
      }
      forks.push(f);
    }
  }
  return { d: dPath + ' ' + forks.join(' '), x: x0 / 1000 };
}

let stormTimer = null;

function flicker(el, peak, ms) {
  if (!el) return;
  el.style.transition = 'none';
  el.style.opacity = String(peak);
  requestAnimationFrame(() => {
    el.style.transition = `opacity ${ms}ms cubic-bezier(.22,1,.36,1)`;
    el.style.opacity = '0';
  });
}

function strike() {
  const heavy = Math.random() < 0.55;
  const power = heavy ? 1 : 0.55 + Math.random() * 0.25;

  if (heavy && stormBolt && boltPath && boltGlow) {
    const b = makeBolt();
    boltPath.setAttribute('d', b.d);
    boltGlow.setAttribute('d', b.d);
    if (stormFlash) stormFlash.style.setProperty('--bx', (b.x * 100).toFixed(0) + '%');
    flicker(stormBolt, 1, 190);
  } else if (stormFlash) {
    stormFlash.style.setProperty('--bx', (15 + Math.random() * 70).toFixed(0) + '%');
  }

  if (stormFlash) flicker(stormFlash, heavy ? 0.9 : 0.42, heavy ? 380 : 300);

  const beats = heavy ? 1 + Math.floor(Math.random() * 2) : 1;
  for (let i = 1; i <= beats; i++) {
    setTimeout(() => {
      if (stormFlash) flicker(stormFlash, (heavy ? 0.7 : 0.3) * (1 - i * 0.2), 260);
      if (heavy && i === 1 && stormBolt) flicker(stormBolt, 0.75, 140);
    }, STRIKE_GAP * i);
  }

  setTimeout(() => playThunder(power), heavy ? 260 : 620);

  const [lo, hi] = STRIKE_EVERY;
  stormTimer = setTimeout(strike, lo + Math.random() * (hi - lo));
}

if (!reducedMotion) stormTimer = setTimeout(strike, 2200);

const soundToggle = document.getElementById('soundToggle');
const soundState  = document.getElementById('soundState');
if (soundToggle) {
  soundToggle.addEventListener('click', async () => {
    thunderOn = !thunderOn;
    soundToggle.setAttribute('aria-pressed', String(thunderOn));
    if (soundState) soundState.textContent = thunderOn ? 'ON' : 'OFF';
    if (thunderOn) {
      const ctx = initAudio();
      if (ctx && ctx.state === 'suspended') await ctx.resume();
      playThunder(0.7);
    }
  });
}

/* ═════════════════════ RESIZE ═════════════════════ */
function resizeAll() {
  mainCtx = fitCanvas(mainCanvas);
  fCtx    = fitCanvas(featherCanvas);
  amaCtx  = fitCanvas(amaCanvas);
  lastDrawn = -1;
  lastDrawnEx = -999;
  lastDrawnEy = -999;
  seedFeathers();
  seedFlames();
  amaPainted = false;

  // Repaint current frame with dual-eye composite
  if (mainCanvas && mainCtx) {
    const frame = getNearestFrame(Math.round(clamp(frameShown, 0, MAIN_COUNT - 1)));
    if (frame) {
      drawHeroComposite(mainCtx, frame, mainCanvas.width, mainCanvas.height, ex, ey, scrubProgress);
    }
  }
}

let rt;
window.addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(resizeAll, 140);
});

/* ═════════════════════ MAIN ANIMATION LOOP ═════════════════════ */
function tick() {
  readScroll();
  readScrub();

  if (syncSize(mainCanvas) || syncSize(featherCanvas) || syncSize(amaCanvas)) {
    resizeAll();
  }

  /* — Amaterasu bottom fire — */
  if (!reduceMotion) {
    paintAmaterasu(performance.now() / 1000);
  } else if (!amaPainted) {
    paintAmaterasu(0);
    amaPainted = true;
  }

  /* — Smooth Easing for Dual Eyes & Cursor — */
  ex = lerp(ex, mx, 0.08);
  ey = lerp(ey, my, 0.08);

  /* — Hero frame scrub: lerped interpolation — */
  frameShown = lerp(frameShown, frameTarget, 0.14);
  const idx = Math.round(clamp(frameShown, 0, MAIN_COUNT - 1));

  // Redraw when either scroll frame advances OR cursor moves over eyes
  const frameChanged = idx !== lastDrawn;
  const eyeMoved = Math.abs(ex - lastDrawnEx) > 0.001 || Math.abs(ey - lastDrawnEy) > 0.001;

  if ((frameChanged || eyeMoved) && mainCanvas && mainCtx) {
    const w = mainCanvas.width, h = mainCanvas.height;
    const frame = getNearestFrame(idx);
    if (frame) {
      mainCtx.clearRect(0, 0, w, h);
      if (drawHeroComposite(mainCtx, frame, w, h, ex, ey, scrubProgress)) {
        lastDrawn = idx;
        lastDrawnEx = ex;
        lastDrawnEy = ey;
      }
    }
  }
  paintOverlays(scrubProgress);

  /* — Ambient particles (intensify during Black Dissolve) — */
  if (featherCanvas && fCtx) {
    const fw = featherCanvas.width, fh = featherCanvas.height;
    const dissolveIntensity = window4(scrubProgress, 0.68, 0.76, 0.82, 0.88);
    const intensity = Math.max(
      clamp((scrubProgress - 0.70) / 0.14) * (0.45 + scrollVel * 0.55),
      dissolveIntensity * 0.95
    );
    fCtx.clearRect(0, 0, fw, fh);
    if (intensity > 0.01) {
      const speed = (0.001 + scrollVel * 0.006 + dissolveIntensity * 0.003) * scrollDir;
      for (const f of feathers) {
        f.x += f.vx * speed;
        f.y += Math.sin(f.sway) * 0.0006 + f.vx * speed * 0.18;
        f.sway += 0.02 + f.vx * 0.01;
        f.rot  += f.spin * (0.3 + scrollVel + dissolveIntensity * 0.5);
        if (f.x > 1.15) f.x = -0.15;
        if (f.x < -0.15) f.x = 1.15;
        if (f.y > 1.15) f.y = -0.15;
        if (f.y < -0.15) f.y = 1.15;
        drawFeather(fCtx, f, fw, fh, scrollDir, intensity);
      }
    }
  }

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* ═════════════════════ SCROLL REVEALS ═════════════════════ */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.14 });

document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

/* ═════════════════════ 1. TECH STACK LOGO LOOP ═════════════════════ */
const logoLoopContainer = document.getElementById('techLogoLoop');
if (logoLoopContainer) {
  new LogoLoop(logoLoopContainer, {
    logos: techLogos,
    speed: 120,
    direction: 'left',
    gap: 36,
    hoverSpeed: 0,
    scaleOnHover: true,
    fadeOut: true
  });
}

/* ═════════════════════ 3. EXPERIENCE FLIPCARD + LOOPING CYBER SECURITY ═════════════════════ */
const expFlipCardEl = document.getElementById('experienceFlipCard');
const cyberSecEl = document.getElementById('cyberSecurityDecrypted');
let cyberSecurityDecrypted = null;

if (cyberSecEl) {
  cyberSecurityDecrypted = new DecryptedText(cyberSecEl, {
    text: 'CYBER SECURITY',
    speed: 55,
    maxIterations: 18,
    characters: 'ABCD1234!?#$&%*<>[]',
    animateOn: 'manual',
    revealDirection: 'center',
    loop: false,
    loopHoldTime: 1600
  });
}

if (expFlipCardEl) {
  new FlipCard(expFlipCardEl, {
    axis: 'y',
    flipOnClick: true,
    draggable: true,
    dragDistance: 0,
    tilt: true,
    tiltMax: 12,
    glare: true,
    glareOpacity: 0.22,
    hoverScale: 1.03,
    perspective: 1100,
    stiffness: 170,
    damping: 20,
    onFlipChange: (isFlipped) => {
      if (cyberSecurityDecrypted) {
        if (isFlipped) {
          // Card flipped to reveal BACK: start looping Cyber Security decryption
          cyberSecurityDecrypted.startLoop();
        } else {
          // Card flipped back to FRONT: stop looping
          cyberSecurityDecrypted.stopLoop();
        }
      }
    }
  });
}

// PixelSwap on Front Face of FlipCard
const pixelSwapContainer = document.getElementById('pixelSwapRole');
if (pixelSwapContainer) {
  new PixelSwap(pixelSwapContainer, {
    trigger: 'hover',
    pixelColumns: 12,
    pixelRows: 4
  });
}

/* ═════════════════════ 4. INITIATE COLLABORATION (SCROLL VELOCITY) ═════════════════════ */
const collabVelocityContainer = document.getElementById('collabVelocity');
if (collabVelocityContainer) {
  new ScrollVelocity(collabVelocityContainer, {
    texts: [
      'INITIATE COLLABORATION',
      'LETS BUILD SOMETHING',
      'GET IN TOUCH'
    ],
    baseVelocity: 16,
    velocityFactor: 2.2
  });
}

/* ═════════════════════ 5. CIRCULAR CAROUSEL INITIALIZATION ═════════════════════ */
const carouselSectionEl = document.getElementById('work');
const projectDetailsPanelEl = document.getElementById('projectDetailsPanel');
const carouselCounterCurrEl = document.getElementById('carouselCounterCurr');
const carouselPrevBtnEl = document.getElementById('carouselPrevBtn');
const carouselNextBtnEl = document.getElementById('carouselNextBtn');

if (carouselSectionEl && projectDetailsPanelEl) {
  // Initialize Detail Panel
  const projectDetails = new ProjectDetails(projectDetailsPanelEl, projects[0]);

  // Initialize 3D Circular Carousel
  const circularCarousel = new CircularCarousel(carouselSectionEl, {
    items: projects,
    tilt: -4,
    speed: 14,
    momentum: 0.65,
    depthFade: 0.55,
    innerShade: 0.62,
    parallax: 0.35,
    onActiveChange: (activeProject, activeIndex) => {
      // Update Counter
      if (carouselCounterCurrEl) {
        carouselCounterCurrEl.textContent = activeProject.number;
      }
      // Update Detail Panel with Crossfade
      projectDetails.update(activeProject);
    }
  });

  // Wire up Prev & Next Buttons
  if (carouselPrevBtnEl) {
    carouselPrevBtnEl.addEventListener('click', () => circularCarousel.prev());
  }
  if (carouselNextBtnEl) {
    carouselNextBtnEl.addEventListener('click', () => circularCarousel.next());
  }
}

/* ═════════════════════ 6. EDITORIAL SCROLL REVEALS ═════════════════════ */
initScrollReveal();

/* ═════════════════════ 7. DECRYPTED TEXT (CYBER SECURITY) ═════════════════════ */
initDecryptedText();

/* ═════════════════════ 8. FALLING TEXT (PHILOSOPHY PLAYGROUND) ═════════════════════ */
initFallingText();

/* ═════════════════════ 9. SHINY TEXT IDENTITY ═════════════════════ */
initShinyText();

/* ═════════════════════ 10. DYNAMIC YEAR ═════════════════════ */
const yearEl = document.getElementById('currentYear');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

/* ═════════════════════ 10. LANYARD INTRO GATEWAY ═════════════════════ */
initLanyard(() => {
  // Activated strictly after visitor deliberately enters the portfolio
  window.scrollTo(0, 0);

  // Explicitly reset hero animation state to frame 0
  frameTarget = 0;
  frameShown = 0;
  lastDrawn = -1;
  scrubProgress = 0;
  if (mainCanvas && mainCtx) {
    const frame0 = getNearestFrame(0);
    if (frame0) {
      drawHeroComposite(mainCtx, frame0, mainCanvas.width, mainCanvas.height, 0.5, 0.5, 0);
      lastDrawn = 0;
    }
  }

  // Activate TargetCursor and ClickSpark ONLY after entering the portfolio
  new TargetCursor({
    spinDuration: 2,
    hideDefaultCursor: true,
    parallaxOn: true
  });
  initClickSpark();
});



