/**
 * Lanyard — Full-screen 3D interactive physics access badge gateway.
 * Simulates a physical identity card suspended from a flexible woven lanyard strap.
 * Card is physically constrained to the terminal hook pivot to prevent detachment.
 * Supports natural pointer dragging, controlled 3D rotation, and cinematic Japanese loading entry.
 */

import { JapaneseLoader } from '../JapaneseLoader/JapaneseLoader.js';

export class Lanyard {
  constructor(containerEl, options = {}) {
    this.container = typeof containerEl === 'string' ? document.querySelector(containerEl) : containerEl;
    if (!this.container) return;

    this.position = options.position || [0, 0, 20];
    this.gravity = options.gravity || [0, -40, 0];
    this.frontImage = options.frontImage || 'assets/lanyard/card-front.png';
    this.backImage = options.backImage || 'assets/lanyard/card-back.png';
    this.lanyardImage = options.lanyardImage || 'assets/lanyard/lanyard.png';
    this.lanyardWidth = options.lanyardWidth ?? 1;
    this.imageFit = options.imageFit || 'cover';
    this.onEnter = options.onEnter || null;

    // Single source of truth for entry transition state
    this.entryState = 'idle'; // 'idle' | 'loading' | 'entered'
    this.rafId = null;

    // Initialize Japanese Character Decryption Loader
    this.japaneseLoader = new JapaneseLoader({
      duration: 2150
    });

    // Physics Anchor & Card Dimensions
    this.anchor = { x: 0, y: 0 };
    this.card = {
      x: 0,
      y: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      vRotX: 0,
      vRotY: 0,
      width: 275,
      height: 407
    };

    // Strap Segments (Verlet chain)
    this.numSegments = 8;
    this.segments = [];
    this.segmentLength = 30;

    // Pointer Interaction
    this.isDragging = false;
    this.isPointerDownOnCard = false;
    this.dragStart = { x: 0, y: 0 };
    this.hookDragOffset = { x: 0, y: 0 };
    this.dragTargetHook = { x: 0, y: 0 };
    this.lastPointer = { x: 0, y: 0, time: 0 };
    this.totalDragDist = 0;

    // Hover velocity tracking
    this.mousePrev = { x: 0, y: 0, time: performance.now() };

    this.initDOM();
    this.loadTextures();
    this.lockScroll();
    this.bindEvents();
    this.startLoop();
  }

  initDOM() {
    this.stageEl = this.container.querySelector('.lanyard-stage');
    if (!this.stageEl) {
      this.stageEl = this.container;
    }

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'lanyard-canvas';
    this.stageEl.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.hintBox = this.container.querySelector('.lanyard-hint-box');

    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;

    // Render resolution
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);

    // Explicit CSS bounds matching viewport
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.canvas.style.display = 'block';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const isMobile = this.w < 768;
    const isTablet = this.w >= 768 && this.w < 1024;

    // Viewport-aware card sizing: prevent overflow on mobile or short screens
    let baseWidth = isMobile ? Math.min(210, Math.round(this.w * 0.58)) : isTablet ? 245 : 275;
    let baseHeight = Math.round(baseWidth * 1.48);

    // Height clamp: card must not exceed 45% of viewport height on short/landscape screens
    const maxHeight = Math.min(420, Math.round(this.h * 0.45));
    if (baseHeight > maxHeight) {
      baseHeight = Math.max(150, maxHeight);
      baseWidth = Math.round(baseHeight / 1.48);
    }

    this.card.width = baseWidth;
    this.card.height = baseHeight;

    // Anchor at top center of viewport (50% viewport width)
    this.anchor.x = this.w * 0.5;
    this.anchor.y = 0;

    // Card visual center is placed at 50% viewport height
    const targetCenterY = this.h * 0.5;
    // The top attachment hook hangs above the card center by half its height
    const restHookY = targetCenterY - this.card.height * 0.5;
    const strapSpan = Math.max(20, restHookY - this.anchor.y);
    this.segmentLength = strapSpan / this.numSegments;

    if (!this.isDragging) {
      this.initPhysics();
      this.card.rotX = 0;
      this.card.rotY = 0;
      this.card.rotZ = 0;
      this.card.vRotX = 0;
      this.card.vRotY = 0;
      this.updateCardCenterFromHook();
    }
  }

  loadTextures() {
    this.imgFront = new Image();
    this.imgFront.src = this.frontImage;

    this.imgBack = new Image();
    this.imgBack.src = this.backImage;

    this.imgLanyard = new Image();
    this.imgLanyard.src = this.lanyardImage;
  }

  initPhysics() {
    this.segments = [];
    const restHookY = this.h * 0.5 - this.card.height * 0.5;
    const totalSpan = Math.max(20, restHookY - this.anchor.y);

    for (let i = 0; i <= this.numSegments; i++) {
      const t = i / this.numSegments;
      const y = this.anchor.y + t * totalSpan;
      this.segments.push({
        x: this.anchor.x,
        y: y,
        oldX: this.anchor.x,
        oldY: y,
        vx: 0,
        vy: 0
      });
    }
  }

  getHook() {
    return this.segments[this.numSegments];
  }

  updateCardCenterFromHook() {
    const hook = this.getHook();
    if (!hook) return;
    const sinZ = Math.sin(this.card.rotZ);
    const cosZ = Math.cos(this.card.rotZ);
    // Card center is strictly locked to hook position + tilt offset
    this.card.x = hook.x + sinZ * (this.card.height * 0.5);
    this.card.y = hook.y + cosZ * (this.card.height * 0.5);
  }

  lockScroll() {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    this.preventScrollHandler = (e) => {
      if (this.entryState !== 'entered') {
        e.preventDefault();
      }
    };

    this.preventKeyHandler = (e) => {
      if (this.entryState !== 'entered') {
        const blockKeys = ['Space', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown'];
        if (blockKeys.includes(e.code)) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('wheel', this.preventScrollHandler, { passive: false });
    window.addEventListener('touchmove', this.preventScrollHandler, { passive: false });
    window.addEventListener('keydown', this.preventKeyHandler, { passive: false });
  }

  unlockScroll() {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    if (this.preventScrollHandler) {
      window.removeEventListener('wheel', this.preventScrollHandler);
      window.removeEventListener('touchmove', this.preventScrollHandler);
    }
    if (this.preventKeyHandler) {
      window.removeEventListener('keydown', this.preventKeyHandler);
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    // Pointer Drag & Hover on Stage
    this.stageEl.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this), { passive: false });
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('pointercancel', this.onPointerUp.bind(this));

    // Direct click on hint box
    if (this.hintBox) {
      this.hintBox.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handlePortfolioEntry();
      });
    }

    const fallbackEl = document.getElementById('lanyardFallback');
    if (fallbackEl) {
      fallbackEl.addEventListener('click', () => this.handlePortfolioEntry());
    }
  }

  onPointerDown(e) {
    if (this.entryState !== 'idle') return;

    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const hw = this.card.width * 0.5 + 24;
    const hh = this.card.height * 0.5 + 24;
    const hit = Math.abs(px - this.card.x) < hw && Math.abs(py - this.card.y) < hh;

    if (hit) {
      if (e.pointerId != null && this.stageEl.setPointerCapture) {
        try { this.stageEl.setPointerCapture(e.pointerId); } catch (_) {}
      }
      const hook = this.getHook();
      this.isDragging = true;
      this.isPointerDownOnCard = true;
      this.dragStart = { x: px, y: py };
      this.hookDragOffset = { x: hook.x - px, y: hook.y - py };
      this.dragTargetHook = { x: hook.x, y: hook.y };
      this.lastPointer = { x: px, y: py, time: performance.now() };
      this.totalDragDist = 0;
      this.stageEl.classList.add('is-dragging');
    }
  }

  onPointerMove(e) {
    if (this.entryState !== 'idle') return;

    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const now = performance.now();

    if (this.isDragging) {
      e.preventDefault();

      const dx = px - this.lastPointer.x;
      const dy = py - this.lastPointer.y;
      const dt = Math.max(1, now - this.lastPointer.time);

      this.totalDragDist += Math.sqrt(dx * dx + dy * dy);

      // Drag directly guides the terminal hook attachment, clamped to screen bounds
      const minX = this.card.width * 0.5 + 16;
      const maxX = this.w - this.card.width * 0.5 - 16;
      const targetX = px + this.hookDragOffset.x;
      const targetY = py + this.hookDragOffset.y;
      this.dragTargetHook.x = Math.max(minX, Math.min(maxX, targetX));
      this.dragTargetHook.y = Math.max(20, Math.min(this.h - 40, targetY));

      // Angular rotation response (scaled for device)
      const isMobile = this.w < 768;
      const rotFactor = isMobile ? 0.03 : 0.05;
      const angularSpeedY = (dx / dt) * rotFactor;
      this.card.vRotY += angularSpeedY;

      // Small secondary pitch (X rotation)
      const angularSpeedX = (dy / dt) * (isMobile ? 0.008 : 0.012);
      this.card.vRotX -= angularSpeedX;

      this.lastPointer = { x: px, y: py, time: now };
    } else {
      // ═══════════════ HOVER PHYSICAL INTERACTION ═══════════════
      // Proximity effect creates subtle air impulse & controlled swing
      const dt = Math.max(1, now - this.mousePrev.time);
      const mdx = px - this.mousePrev.x;
      const mdy = py - this.mousePrev.y;
      const mouseSpeed = Math.sqrt(mdx * mdx + mdy * mdy) / dt;

      const distCardX = px - this.card.x;
      const distCardY = py - this.card.y;
      const dist = Math.sqrt(distCardX * distCardX + distCardY * distCardY);

      const range = 360;
      if (dist < range) {
        const prox = Math.pow(1 - dist / range, 1.6);
        const impulse = Math.min(mouseSpeed * 18, 6.5) * prox;

        const hook = this.getHook();
        if (hook) {
          // Subtle lateral sway of the hook
          hook.vx += (mdx > 0 ? 1 : -1) * impulse * 0.22;
          hook.vy += (mdy > 0 ? 1 : -1) * impulse * 0.12;
        }

        // Controlled rotation around vertical axis (Y)
        this.card.vRotY += (distCardX > 0 ? -1 : 1) * impulse * 0.009;
        this.card.vRotX += (distCardY > 0 ? -1 : 1) * impulse * 0.004;
      }

      this.mousePrev = { x: px, y: py, time: now };
    }
  }

  onPointerUp(e) {
    if (e && e.pointerId != null && this.stageEl.releasePointerCapture) {
      try { this.stageEl.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    if (!this.isDragging) return;
    this.isDragging = false;
    this.stageEl.classList.remove('is-dragging');

    // ═══════════════ CLICK TO ENTER DETECTION ═══════════════
    // If movement was small (< 14px), trigger cinematic entry!
    // If intentional drag, release card to swing naturally!
    if (this.isPointerDownOnCard && this.totalDragDist < 14) {
      this.handlePortfolioEntry();
    }

    this.isPointerDownOnCard = false;
  }

  handlePortfolioEntry() {
    // Prevent double execution
    if (this.entryState !== 'idle') return;
    this.entryState = 'loading';

    // 0ms: Immediately lock further lanyard interactions
    this.isDragging = false;
    this.stageEl.classList.remove('is-dragging');
    this.stageEl.style.pointerEvents = 'none';

    // 150ms: Lanyard begins subtle fade and scale-down beneath the loader
    setTimeout(() => {
      this.container.classList.add('is-exiting');
    }, 150);

    // 250ms - 2150ms: Trigger Cinematic Japanese Character Decryption Transition
    this.japaneseLoader.start(() => {
      this.entryState = 'entered';

      // Remove lanyard-active from body so portfolio is revealed
      document.body.classList.remove('lanyard-active');
      document.body.classList.add('lanyard-entered');

      // Unlock scrolling
      this.unlockScroll();

      // Trigger portfolio activation (Hero frame 0 reset, cursor, sparks)
      if (typeof this.onEnter === 'function') {
        this.onEnter();
      }

      // Cleanup Lanyard intro component
      setTimeout(() => {
        this.destroy();
        this.container.classList.add('is-hidden');
      }, 500);
    });
  }

  startLoop() {
    const tick = () => {
      if (this.entryState !== 'entered') {
        this.updatePhysics();
        this.render();
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  updatePhysics() {
    const hook = this.getHook();
    if (!hook) return;

    const restHookX = this.anchor.x;
    const restHookY = this.h * 0.5 - this.card.height * 0.5;

    if (this.isDragging) {
      // Follow drag target with responsive spring damping
      hook.x += (this.dragTargetHook.x - hook.x) * 0.45;
      hook.y += (this.dragTargetHook.y - hook.y) * 0.45;
      hook.vx = (this.dragTargetHook.x - hook.x) * 0.22;
      hook.vy = (this.dragTargetHook.y - hook.y) * 0.22;
    } else {
      // Natural pendulum spring physics toward resting position
      const k = 0.045; // Spring tension
      const damping = 0.94; // Air resistance

      const fx = (restHookX - hook.x) * k;
      const fy = (restHookY - hook.y) * k;

      hook.vx = (hook.vx + fx) * damping;
      hook.vy = (hook.vy + fy) * damping;

      hook.x += hook.vx;
      hook.y += hook.vy;
    }

    // ═══════════════ CONTROLLED ROTATION CONSTRAINTS ═══════════════
    // 1. Z-Rotation (pendulum tilt): Derived strictly from strap swing angle
    const pendulumAngle = Math.atan2(hook.x - this.anchor.x, Math.max(30, hook.y - this.anchor.y));
    const targetRotZ = Math.max(-0.14, Math.min(0.14, pendulumAngle)); // Max 8 degrees tilt
    this.card.rotZ += (targetRotZ - this.card.rotZ) * 0.15;

    // 2. Y-Rotation (vertical axis): Dominant rotation freedom
    this.card.rotY += this.card.vRotY;
    this.card.vRotY *= 0.88;
    // Strict clamp: ~77 degrees (0.43 * PI) to view FRONT, SIDE, and subtle BACK peek
    const MAX_ROT_Y = 1.35;
    this.card.rotY = Math.max(-MAX_ROT_Y, Math.min(MAX_ROT_Y, this.card.rotY));

    // 3. X-Rotation (pitch): Strongly restrained secondary movement
    this.card.rotX += this.card.vRotX;
    this.card.vRotX *= 0.85;
    const MAX_ROT_X = 0.18; // Max 10 degrees pitch
    this.card.rotX = Math.max(-MAX_ROT_X, Math.min(MAX_ROT_X, this.card.rotX));

    // Return to facing front smoothly when not dragging
    if (!this.isDragging) {
      this.card.rotY += (0 - this.card.rotY) * 0.08;
      this.card.rotX += (0 - this.card.rotX) * 0.10;
    }

    // ═══════════════ VERLET ROPE CONSTRAINTS ═══════════════
    this.segments[0].x = this.anchor.x;
    this.segments[0].y = this.anchor.y;

    for (let i = 1; i < this.numSegments; i++) {
      const s = this.segments[i];
      const vx = (s.x - s.oldX) * 0.93;
      const vy = (s.y - s.oldY) * 0.93 + 0.35; // gentle gravity
      s.oldX = s.x;
      s.oldY = s.y;
      s.x += vx;
      s.y += vy;
    }

    // Relaxation iterations to preserve strap length
    for (let iter = 0; iter < 6; iter++) {
      this.segments[0].x = this.anchor.x;
      this.segments[0].y = this.anchor.y;

      for (let i = 0; i < this.numSegments; i++) {
        const s1 = this.segments[i];
        const s2 = this.segments[i + 1];
        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const diff = (dist - this.segmentLength) / dist;

        if (i !== 0) {
          s1.x += dx * 0.5 * diff;
          s1.y += dy * 0.5 * diff;
        }
        if (i + 1 !== this.numSegments) {
          s2.x -= dx * 0.5 * diff;
          s2.y -= dy * 0.5 * diff;
        }
      }
    }

    // Update derived card center from the hook attachment point
    this.updateCardCenterFromHook();
  }

  render() {
    this.ctx.clearRect(0, 0, this.w, this.h);

    const hook = this.getHook();
    if (!hook) return;

    // 1. Draw Woven Lanyard Strap
    this.drawLanyardStrap();

    // 2. Render Hook, Clip & Card as one continuous physical assembly
    // Canvas origin translates to the EXACT hook terminal point (zero detachment gap possible)
    this.ctx.save();
    this.ctx.translate(hook.x, hook.y);
    this.ctx.rotate(this.card.rotZ);

    this.drawClipAtOrigin();
    this.drawCardHangingFromOrigin();

    this.ctx.restore();
  }

  drawLanyardStrap() {
    if (this.segments.length < 2) return;

    this.ctx.save();
    this.ctx.lineWidth = 14 * this.lanyardWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Strap drop shadow
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    this.ctx.beginPath();
    this.ctx.moveTo(this.segments[0].x + 4, this.segments[0].y + 6);
    for (let i = 1; i < this.segments.length - 1; i++) {
      const xc = (this.segments[i].x + this.segments[i + 1].x) / 2 + 4;
      const yc = (this.segments[i].y + this.segments[i + 1].y) / 2 + 6;
      this.ctx.quadraticCurveTo(this.segments[i].x + 4, this.segments[i].y + 6, xc, yc);
    }
    this.ctx.stroke();

    // Main woven strap body
    this.ctx.strokeStyle = '#181820';
    this.ctx.beginPath();
    this.ctx.moveTo(this.segments[0].x, this.segments[0].y);
    for (let i = 1; i < this.segments.length - 1; i++) {
      const xc = (this.segments[i].x + this.segments[i + 1].x) / 2;
      const yc = (this.segments[i].y + this.segments[i + 1].y) / 2;
      this.ctx.quadraticCurveTo(this.segments[i].x, this.segments[i].y, xc, yc);
    }
    this.ctx.stroke();

    // Crimson Stitching along the strap borders
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = 'rgba(255, 43, 43, 0.85)';
    this.ctx.beginPath();
    this.ctx.moveTo(this.segments[0].x - 4, this.segments[0].y);
    for (let i = 1; i < this.segments.length - 1; i++) {
      const xc = (this.segments[i].x + this.segments[i + 1].x) / 2 - 4;
      const yc = (this.segments[i].y + this.segments[i + 1].y) / 2;
      this.ctx.quadraticCurveTo(this.segments[i].x - 4, this.segments[i].y, xc, yc);
    }
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(this.segments[0].x + 4, this.segments[0].y);
    for (let i = 1; i < this.segments.length - 1; i++) {
      const xc = (this.segments[i].x + this.segments[i + 1].x) / 2 + 4;
      const yc = (this.segments[i].y + this.segments[i + 1].y) / 2;
      this.ctx.quadraticCurveTo(this.segments[i].x + 4, this.segments[i].y, xc, yc);
    }
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawClipAtOrigin() {
    // Metal swivel ring connecting strap to clamp
    this.ctx.save();
    this.ctx.strokeStyle = '#8a8a95';
    this.ctx.lineWidth = 3.5;
    this.ctx.beginPath();
    this.ctx.arc(0, -10, 8, 0, Math.PI * 2);
    this.ctx.stroke();

    // Metallic clamp gripping the top of the card
    this.ctx.fillStyle = '#22222a';
    this.ctx.strokeStyle = '#9090a0';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.roundRect(-16, -4, 32, 18, 4);
    this.ctx.fill();
    this.ctx.stroke();

    // Clamp bolt accent
    this.ctx.fillStyle = '#ff2b2b';
    this.ctx.beginPath();
    this.ctx.arc(0, 5, 3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawCardHangingFromOrigin() {
    const cw = this.card.width;
    const ch = this.card.height;

    // 3D Perspective Scaling based on rotX & rotY
    const cosY = Math.cos(this.card.rotY);
    const cosX = Math.cos(this.card.rotX);
    const scaleX = cosY;
    const scaleY = cosX;

    const isFront = cosY >= 0;
    const activeImg = isFront ? this.imgFront : this.imgBack;

    this.ctx.save();

    // Pivot point is top attachment: translate 6px down so clamp overlaps the top slot
    this.ctx.translate(0, 6);

    // Drop shadow
    this.ctx.save();
    this.ctx.scale(Math.abs(scaleX), Math.abs(scaleY));
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    this.ctx.shadowBlur = 35;
    this.ctx.shadowOffsetX = (this.card.x - this.anchor.x) * 0.08;
    this.ctx.shadowOffsetY = 24;
    this.ctx.beginPath();
    this.ctx.roundRect(-cw / 2, 0, cw, ch, 14);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.fill();
    this.ctx.restore();

    // Apply 3D perspective scale around the top pivot point
    this.ctx.scale(isFront ? scaleX : -scaleX, scaleY);

    this.ctx.beginPath();
    this.ctx.roundRect(-cw / 2, 0, cw, ch, 14);
    this.ctx.clip();

    if (activeImg && activeImg.complete && activeImg.naturalWidth > 0) {
      this.ctx.drawImage(activeImg, -cw / 2, 0, cw, ch);
    } else {
      // Procedural fallback card
      this.ctx.fillStyle = '#0e0e14';
      this.ctx.fillRect(-cw / 2, 0, cw, ch);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '700 18px "Space Grotesk", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("SHASHWAT VATSYAYAN", 0, ch * 0.45);
      this.ctx.font = '12px "Space Grotesk", monospace';
      this.ctx.fillStyle = '#ff2b2b';
      this.ctx.fillText("PORTFOLIO ACCESS", 0, ch * 0.52);
    }

    // Specular lighting sheen across the card surface
    const sheenGrad = this.ctx.createLinearGradient(-cw / 2, 0, cw / 2, ch);
    const sheenAlpha = Math.abs(Math.sin(this.card.rotY)) * 0.35 + 0.08;
    sheenGrad.addColorStop(0, `rgba(255, 255, 255, ${sheenAlpha})`);
    sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    sheenGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    this.ctx.fillStyle = sheenGrad;
    this.ctx.fillRect(-cw / 2, 0, cw, ch);

    // Metallic rim border
    this.ctx.strokeStyle = isFront ? 'rgba(232, 228, 220, 0.22)' : 'rgba(255, 43, 43, 0.45)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.roundRect(-cw / 2, 0, cw, ch, 14);
    this.ctx.stroke();

    this.ctx.restore();
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.japaneseLoader) {
      this.japaneseLoader.destroy();
    }
    this.unlockScroll();
  }
}

export function initLanyard(onEnter) {
  const introEl = document.getElementById('lanyardIntro');
  if (introEl) {
    document.body.classList.add('lanyard-active');
    return new Lanyard(introEl, {
      position: [0, 0, 20],
      gravity: [0, -40, 0],
      frontImage: 'assets/lanyard/card-front.png',
      backImage: 'assets/lanyard/card-back.png',
      lanyardImage: 'assets/lanyard/lanyard.png',
      lanyardWidth: 1,
      imageFit: 'cover',
      onEnter: onEnter
    });
  }
}
