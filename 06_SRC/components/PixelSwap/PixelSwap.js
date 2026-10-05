/**
 * PixelSwap — Hover-Triggered Pixelated Role Transition Controller
 * 
 * Options:
 * - trigger: 'hover' | 'click' (default 'hover')
 * - pixelColumns: number of columns in pixel grid (default 12)
 * - pixelRows: number of rows in pixel grid (default 4)
 * - duration: ms (default 450)
 */

export class PixelSwap {
  constructor(containerEl, options = {}) {
    this.container = typeof containerEl === 'string' ? document.querySelector(containerEl) : containerEl;
    if (!this.container) return;

    this.trigger = options.trigger || 'hover';
    this.cols = options.pixelColumns || 12;
    this.rows = options.pixelRows || 4;
    this.totalPixels = this.cols * this.rows;

    this.isSwapped = false;
    this.isAnimating = false;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.container.classList.add('pixel-swap-container', 'cursor-target');

    // Create Pixel Overlay Grid
    this.grid = document.createElement('div');
    this.grid.className = 'pixel-swap-grid';
    this.grid.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
    this.grid.style.gridTemplateRows = `repeat(${this.rows}, 1fr)`;

    this.pixelEls = [];
    for (let i = 0; i < this.totalPixels; i++) {
      const pixel = document.createElement('div');
      pixel.className = 'pixel-block';
      this.grid.appendChild(pixel);
      this.pixelEls.push(pixel);
    }

    this.container.appendChild(this.grid);
  }

  bindEvents() {
    if (this.trigger === 'hover') {
      this.container.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        if (!this.isSwapped) this.swap(true);
      });

      this.container.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        if (this.isSwapped) this.swap(false);
      });

      // On touch devices, allow tapping the pill to toggle without flipping the parent card
      this.container.addEventListener('click', (e) => {
        if (window.matchMedia('(hover: none) or (pointer: coarse)').matches) {
          e.stopPropagation();
          this.swap(!this.isSwapped);
        }
      });
    } else {
      this.container.addEventListener('click', (e) => {
        e.stopPropagation();
        this.swap(!this.isSwapped);
      });
    }
  }

  swap(toSecond) {
    if (this.isAnimating && this.isSwapped === toSecond) return;
    this.isAnimating = true;
    this.container.classList.add('is-animating');

    // Randomize pixel animations
    const shuffled = [...this.pixelEls].sort(() => Math.random() - 0.5);
    shuffled.forEach((pixel, idx) => {
      const delay = (idx / this.totalPixels) * 160;
      setTimeout(() => {
        pixel.style.opacity = '1';
        pixel.style.transform = 'scale(1)';
      }, delay);
    });

    // Midway through, toggle the content
    setTimeout(() => {
      this.isSwapped = toSecond;
      this.container.classList.toggle('is-swapped', toSecond);

      // Dismiss pixels
      shuffled.forEach((pixel, idx) => {
        const delay = (idx / this.totalPixels) * 160;
        setTimeout(() => {
          pixel.style.opacity = '0';
          pixel.style.transform = 'scale(0)';
        }, delay);
      });

      setTimeout(() => {
        this.isAnimating = false;
        this.container.classList.remove('is-animating');
      }, 260);
    }, 180);
  }
}
