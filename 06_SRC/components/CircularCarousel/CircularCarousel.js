/**
 * CircularCarousel — Cinematic 3D Cylinder Project Archive Engine
 * 
 * Arranges project cards along a 3D cylindrical manifold with perspective,
 * depth shading, smooth inertia, momentum snapping, click-to-focus,
 * subtle parallax, and synchronized editorial detail transitions.
 */

import { getProjectVisualSvg } from './ProjectVisuals.js';

export class CircularCarousel {
  constructor(containerEl, options = {}) {
    this.container = typeof containerEl === 'string' ? document.querySelector(containerEl) : containerEl;
    if (!this.container) {
      console.error('[CircularCarousel] Container not found.');
      return;
    }

    this.items = options.items || [];
    this.numItems = this.items.length;
    if (this.numItems === 0) return;

    // Configuration Options
    this.stepAngle = 360 / this.numItems; // 72 deg for 5 items
    this.tilt = options.tilt ?? -4; // degrees
    this.perspective = options.perspective ?? 2500;
    this.autoplay = options.autoplay !== false;
    this.driftSpeed = options.speed ? options.speed * 0.0025 : 0.035; // deg per frame
    this.momentum = options.momentum ?? 0.62;
    this.depthFade = options.depthFade ?? 0.55;
    this.innerShade = options.innerShade ?? 0.65;
    this.pauseOnHover = options.pauseOnHover !== false;
    this.focusOnClick = options.focusOnClick !== false;
    this.draggable = options.draggable !== false;
    this.parallax = options.parallax ?? 0.3;
    this.onActiveChange = options.onActiveChange || null;

    // Physics & State
    this.rotation = 0; // Current angle in degrees
    this.targetRotation = 0; // Target angle for lerping
    this.velocity = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartAngle = 0;
    this.lastDragX = 0;
    this.isHovered = false;
    this.isInViewport = true;
    this.isTabActive = true;
    this.activeIndex = 0;
    this.prevActiveIndex = -1;

    // Mouse parallax offsets
    this.mouseOffset = { x: 0, y: 0 };
    this.smoothMouse = { x: 0, y: 0 };

    this.cardElements = [];
    this.cardShadeElements = [];

    this.initDOM();
    this.measureLayout();
    this.bindEvents();
    this.renderInitial();
    this.startLoop();
  }

  initDOM() {
    this.stageEl = this.container.querySelector('.cylinder-stage');
    this.trackEl = this.container.querySelector('.cylinder-track');

    if (!this.stageEl || !this.trackEl) {
      console.error('[CircularCarousel] .cylinder-stage or .cylinder-track missing.');
      return;
    }

    // Build the 3D cards
    this.trackEl.innerHTML = '';
    this.items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `cylinder-card ${index === 0 ? 'is-active' : ''}`;
      card.dataset.index = index;

      const visualSvg = getProjectVisualSvg(item.visualType, item.accentColor);

      card.innerHTML = `
        <div class="card-depth-shade"></div>
        <div class="card-surface">
          <div class="card-header">
            <span class="card-number">${item.number}</span>
            <span class="card-category-badge">${item.category}</span>
          </div>

          <div class="card-graphic" aria-hidden="true">
            ${visualSvg}
          </div>

          <div class="card-footer">
            <h3 class="card-title">${item.title}</h3>
            <p class="card-subtitle">${item.subtitle || item.category}</p>
          </div>

          <div class="card-focus-indicator"></div>
        </div>
      `;

      this.trackEl.appendChild(card);
      this.cardElements.push(card);
      this.cardShadeElements.push(card.querySelector('.card-depth-shade'));
    });
  }

  measureLayout() {
    const isSmallMobile = window.innerWidth < 480;
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    this.cardWidth = isSmallMobile 
      ? Math.min(250, Math.max(210, window.innerWidth - 56)) 
      : isMobile 
        ? Math.min(280, Math.max(240, window.innerWidth - 64)) 
        : isTablet ? 300 : 340;
    this.cardHeight = isSmallMobile ? 340 : isMobile ? 370 : isTablet ? 410 : 450;
    const gap = isSmallMobile ? 12 : isMobile ? 16 : 28;

    if (this.stageEl) {
      this.stageEl.style.setProperty('--card-w', `${this.cardWidth}px`);
      this.stageEl.style.setProperty('--card-h', `${this.cardHeight}px`);
      this.stageEl.style.perspective = isSmallMobile ? '1200px' : isMobile ? '1500px' : isTablet ? '1900px' : `${this.perspective}px`;
    }

    // Cylindrical radius R = (W + gap) / (2 * sin(pi / N))
    const angleRad = Math.PI / this.numItems;
    this.radius = Math.round((this.cardWidth + gap) / (2 * Math.sin(angleRad)));
    if (this.radius < 260) this.radius = 260;
  }

  bindEvents() {
    // Pointer Drag Handling
    if (this.draggable) {
      this.stageEl.addEventListener('pointerdown', this.onPointerDown.bind(this));
      window.addEventListener('pointermove', this.onPointerMove.bind(this), { passive: true });
      window.addEventListener('pointerup', this.onPointerUp.bind(this));
      window.addEventListener('pointercancel', this.onPointerUp.bind(this));
    }

    // Hover Pause
    if (this.pauseOnHover) {
      this.stageEl.addEventListener('pointerenter', () => { this.isHovered = true; });
      this.stageEl.addEventListener('pointerleave', () => { this.isHovered = false; });
    }

    // Mouse Parallax across Stage
    this.stageEl.addEventListener('mousemove', e => {
      const rect = this.stageEl.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      this.mouseOffset.x = nx;
      this.mouseOffset.y = ny;
    }, { passive: true });

    // Click to Focus / Open Active Project
    if (this.focusOnClick) {
      this.stageEl.addEventListener('click', e => {
        const card = e.target.closest('.cylinder-card');
        if (!card) return;
        const index = parseInt(card.dataset.index, 10);
        if (!isNaN(index)) {
          if (index !== this.activeIndex) {
            this.goToIndex(index);
          } else {
            const item = this.items[index];
            if (item && item.url && item.url !== '#') {
              window.open(item.url, '_blank', 'noopener,noreferrer');
            }
          }
        }
      });
    }

    // Keyboard Arrow Navigation
    window.addEventListener('keydown', e => {
      if (!this.isInViewport) return;
      if (e.key === 'ArrowLeft') {
        this.prev();
      } else if (e.key === 'ArrowRight') {
        this.next();
      }
    });

    // Viewport Intersection Observer
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        this.isInViewport = entry.isIntersecting;
      }, { threshold: 0.15 });
      observer.observe(this.container);
    }

    // Tab visibility
    document.addEventListener('visibilitychange', () => {
      this.isTabActive = !document.hidden;
    });

    // Resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.measureLayout();
      }, 120);
    });
  }

  onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.lastDragX = e.clientX;
    this.dragStartAngle = this.targetRotation;
    this.velocity = 0;
    this.stageEl.classList.add('is-dragging');
  }

  onPointerMove(e) {
    if (!this.isDragging) return;
    const currentX = e.clientX;
    const dx = currentX - this.dragStartX;
    const stepDx = currentX - this.lastDragX;

    // Convert pixel drag to angular rotation (inverted for natural drag)
    const pxToDeg = 0.22;
    this.targetRotation = this.dragStartAngle - dx * pxToDeg;
    this.velocity = -stepDx * pxToDeg;
    this.lastDragX = currentX;
  }

  onPointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.stageEl.classList.remove('is-dragging');

    // Add momentum & snap to nearest project slot
    this.targetRotation += this.velocity * this.momentum * 8;
    this.snapToNearest();
  }

  snapToNearest() {
    const snapSlot = Math.round(this.targetRotation / this.stepAngle);
    this.targetRotation = snapSlot * this.stepAngle;
  }

  goToIndex(targetIndex) {
    const currentNormalized = Math.round(this.targetRotation / this.stepAngle);
    const currentModulo = ((currentNormalized % this.numItems) + this.numItems) % this.numItems;
    let diff = targetIndex - currentModulo;

    // Shortest angular path around circular mod
    if (diff > this.numItems / 2) diff -= this.numItems;
    if (diff < -this.numItems / 2) diff += this.numItems;

    this.targetRotation = (currentNormalized + diff) * this.stepAngle;
  }

  next() {
    const currentSlot = Math.round(this.targetRotation / this.stepAngle);
    this.targetRotation = (currentSlot + 1) * this.stepAngle;
  }

  prev() {
    const currentSlot = Math.round(this.targetRotation / this.stepAngle);
    this.targetRotation = (currentSlot - 1) * this.stepAngle;
  }

  startLoop() {
    const tick = () => {
      this.updatePhysics();
      this.render();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  updatePhysics() {
    // Subtle automatic drift when idle
    if (this.autoplay && !this.isDragging && !this.isHovered && this.isInViewport && this.isTabActive) {
      this.targetRotation += this.driftSpeed;
    }

    // Smooth lerp toward target rotation
    const lerpFactor = this.isDragging ? 0.35 : 0.085;
    this.rotation += (this.targetRotation - this.rotation) * lerpFactor;

    // Mouse parallax smoothing
    this.smoothMouse.x += (this.mouseOffset.x - this.smoothMouse.x) * 0.06;
    this.smoothMouse.y += (this.mouseOffset.y - this.smoothMouse.y) * 0.06;

    // Determine currently active center item
    const rawSlot = Math.round(this.rotation / this.stepAngle);
    const currentActive = ((rawSlot % this.numItems) + this.numItems) % this.numItems;

    if (currentActive !== this.activeIndex) {
      this.prevActiveIndex = this.activeIndex;
      this.activeIndex = currentActive;

      // Update active card class
      this.cardElements.forEach((el, i) => {
        el.classList.toggle('is-active', i === this.activeIndex);
      });

      // Dispatch event to detail panel
      if (typeof this.onActiveChange === 'function') {
        this.onActiveChange(this.items[this.activeIndex], this.activeIndex);
      }
    }
  }

  render() {
    const tiltX = this.tilt + (this.smoothMouse.y * -5 * this.parallax);
    const panY = this.smoothMouse.x * 6 * this.parallax;

    this.cardElements.forEach((card, i) => {
      const baseAngle = i * this.stepAngle;
      // Relative angular offset from current viewport center in degrees [-180, 180]
      let relAngle = ((baseAngle - this.rotation) % 360 + 540) % 360 - 180;
      const relRad = (relAngle * Math.PI) / 180;

      // Exact 3D cylindrical coordinates
      const x = Math.sin(relRad) * this.radius;
      const z = Math.cos(relRad) * this.radius - this.radius; // 0 at front, negative in back

      // Depth calculations
      const absNormAngle = Math.abs(relAngle) / 180; // 0 front, 1 back
      const opacity = Math.max(0.18, 1 - absNormAngle * this.depthFade);
      const shadeOpacity = Math.min(0.72, absNormAngle * this.innerShade);
      const blurAmount = (absNormAngle * 3.5).toFixed(1);

      // Card scale & rotation
      const cardRotateY = relAngle * 0.85 + panY;
      const scale = Math.max(0.72, 1 + (z / (this.radius * 2.8)));

      // Apply transform
      card.style.transform = `
        translate3d(${x.toFixed(1)}px, 0px, ${z.toFixed(1)}px)
        rotateY(${cardRotateY.toFixed(2)}deg)
        rotateX(${tiltX.toFixed(2)}deg)
        scale(${scale.toFixed(3)})
      `;
      card.style.opacity = opacity.toFixed(3);
      card.style.zIndex = Math.round(1000 + z);
      card.style.filter = `blur(${blurAmount}px)`;

      // Inner depth shadow
      if (this.cardShadeElements[i]) {
        this.cardShadeElements[i].style.opacity = shadeOpacity.toFixed(3);
      }
    });
  }

  renderInitial() {
    this.updatePhysics();
    this.render();
  }
}
