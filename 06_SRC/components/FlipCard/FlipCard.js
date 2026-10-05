/**
 * FlipCard — 3D Interactive Spring-Physics Dual-Sided Card Component.
 * Supports cursor tilt, realistic glare reflection, hover scale, and flip on click.
 */

export class FlipCard {
  constructor(containerEl, options = {}) {
    this.container = typeof containerEl === 'string' ? document.querySelector(containerEl) : containerEl;
    if (!this.container) return;

    this.axis = options.axis || 'y';
    this.flipOnClick = options.flipOnClick !== false;
    this.draggable = options.draggable !== false;
    this.dragDistance = options.dragDistance ?? 0;
    this.tilt = options.tilt !== false;
    this.tiltMax = options.tiltMax ?? 12;
    this.glare = options.glare !== false;
    this.glareOpacity = options.glareOpacity ?? 0.22;
    this.hoverScale = options.hoverScale ?? 1.03;
    this.perspective = options.perspective ?? 1100;
    this.stiffness = options.stiffness ?? 170;
    this.damping = options.damping ?? 20;
    this.onFlipChange = options.onFlipChange || null;

    this.isFlipped = false;
    this.isHovered = false;
    this.isPointerDown = false;
    this.startX = 0;
    this.startY = 0;
    this.lastPointer = { x: 0, y: 0 };
    this.totalDragDist = 0;

    this.targetTiltX = 0;
    this.targetTiltY = 0;
    this.currentTiltX = 0;
    this.currentTiltY = 0;
    this.targetScale = 1;
    this.currentScale = 1;
    this.rafId = null;

    this.initDOM();
    this.bindEvents();
    this.startLoop();
  }

  initDOM() {
    this.container.classList.add('flip-card-wrapper');
    this.container.style.perspective = `${this.perspective}px`;

    this.inner = this.container.querySelector('.flip-card-inner');
    if (!this.inner) {
      // If wrapper contains front & back directly, wrap them in inner
      this.inner = document.createElement('div');
      this.inner.className = 'flip-card-inner';
      while (this.container.firstChild) {
        this.inner.appendChild(this.container.firstChild);
      }
      this.container.appendChild(this.inner);
    }

    this.front = this.inner.querySelector('.flip-card-front');
    this.back = this.inner.querySelector('.flip-card-back');

    // Create glare overlays if enabled
    if (this.glare) {
      this.frontGlare = document.createElement('div');
      this.frontGlare.className = 'flip-card-glare';
      if (this.front) this.front.appendChild(this.frontGlare);

      this.backGlare = document.createElement('div');
      this.backGlare.className = 'flip-card-glare';
      if (this.back) this.back.appendChild(this.backGlare);
    }
  }

  bindEvents() {
    this.container.addEventListener('pointerenter', () => {
      this.isHovered = true;
      this.targetScale = this.hoverScale;
    });

    this.container.addEventListener('pointerleave', () => {
      this.isHovered = false;
      this.targetTiltX = 0;
      this.targetTiltY = 0;
      this.targetScale = 1;
      this.isPointerDown = false;
    });

    this.container.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      this.totalDragDist = 0;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isHovered && !this.isPointerDown) return;

      const rect = this.container.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;

        if (this.tilt) {
          this.targetTiltX = -ny * this.tiltMax;
          // Invert horizontal tilt when flipped so card always tilts toward pointer
          this.targetTiltY = this.isFlipped ? -nx * this.tiltMax : nx * this.tiltMax;
        }

        if (this.glare) {
          const gx = ((e.clientX - rect.left) / rect.width) * 100;
          const gy = ((e.clientY - rect.top) / rect.height) * 100;
          const glareGrad = `radial-gradient(circle 380px at ${gx}% ${gy}%, rgba(255, 255, 255, ${this.glareOpacity}), transparent 75%)`;
          if (this.frontGlare) this.frontGlare.style.background = glareGrad;
          if (this.backGlare) this.backGlare.style.background = glareGrad;
        }
      }

      if (this.isPointerDown) {
        const dx = e.clientX - this.lastPointer.x;
        const dy = e.clientY - this.lastPointer.y;
        this.totalDragDist += Math.hypot(dx, dy);
        this.lastPointer = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;

      // Click detected if total drag distance is under threshold
      if (this.flipOnClick && this.totalDragDist < 12) {
        // Check if click was inside container bounds
        const rect = this.container.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          this.toggle();
        }
      }
    });
  }

  toggle() {
    this.setFlipped(!this.isFlipped);
  }

  setFlipped(toBack) {
    if (this.isFlipped === toBack) return;
    this.isFlipped = toBack;
    this.container.classList.toggle('is-flipped', this.isFlipped);

    // Swap target tilt Y direction immediately for smooth continuation
    this.targetTiltY = -this.targetTiltY;

    if (typeof this.onFlipChange === 'function') {
      this.onFlipChange(this.isFlipped);
    }
  }

  startLoop() {
    const update = () => {
      // Smooth spring interpolation
      const lerpFactor = 0.12;
      this.currentTiltX += (this.targetTiltX - this.currentTiltX) * lerpFactor;
      this.currentTiltY += (this.targetTiltY - this.currentTiltY) * lerpFactor;
      this.currentScale += (this.targetScale - this.currentScale) * lerpFactor;

      const baseRotY = this.isFlipped ? 180 : 0;
      const rotY = baseRotY + this.currentTiltY;
      const rotX = this.currentTiltX;

      if (this.inner) {
        this.inner.style.transform = `rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg) scale3d(${this.currentScale.toFixed(3)}, ${this.currentScale.toFixed(3)}, 1)`;
      }

      this.rafId = requestAnimationFrame(update);
    };

    this.rafId = requestAnimationFrame(update);
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
