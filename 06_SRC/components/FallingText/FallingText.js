/**
 * FallingText — Interactive 2D physics typographic playground.
 * Simulates rigid word pills falling with gravity, bouncing off walls, and responding to cursor repulsion.
 */

export class FallingText {
  constructor(stageEl, options = {}) {
    this.stage = typeof stageEl === 'string' ? document.querySelector(stageEl) : stageEl;
    if (!this.stage) return;

    this.text = options.text || "Build technology. Create experiences. Tell stories. Turn ideas into products, visuals and meaningful digital experiences.";
    this.highlightWords = (options.highlightWords || ["technology", "experiences", "stories", "products", "visuals"]).map(w => w.toLowerCase());
    this.gravity = options.gravity ?? 0.52;
    this.trigger = options.trigger ?? 'hover'; // 'hover', 'scroll', 'click'
    this.mouseConstraintStiffness = options.mouseConstraintStiffness ?? 0.9;

    this.isFalling = false;
    this.isInViewport = false;
    this.pointer = { x: -9999, y: -9999, isDown: false };
    this.bodies = [];

    this.initDOM();
    this.bindEvents();
    this.startLoop();
  }

  initDOM() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'falling-text-canvas';
    this.stage.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Controls container
    this.controls = document.createElement('div');
    this.controls.className = 'falling-text-controls';
    this.resetBtn = document.createElement('button');
    this.resetBtn.className = 'falling-text-btn cursor-target';
    this.resetBtn.textContent = 'RESET WORDS ↺';
    this.controls.appendChild(this.resetBtn);
    this.stage.appendChild(this.controls);

    this.resize();
    this.buildBodies();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.stage.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;

    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!this.isFalling) {
      this.buildBodies();
    }
  }

  buildBodies() {
    this.bodies = [];
    const words = this.text.split(/\s+/);
    const isSmallMobile = window.innerWidth < 480;
    const isMobile = window.innerWidth < 768;
    const fontSize = isSmallMobile ? 14 : isMobile ? 18 : 24;
    const font = `600 ${fontSize}px "Shippori Mincho", serif`;

    this.ctx.font = font;

    // Arrange words initially in a clean multi-line layout
    const paddingX = 14;
    const paddingY = 8;
    const margin = 10;
    const maxLineWidth = Math.min(this.w - 60, 900);

    let curX = (this.w - maxLineWidth) / 2;
    let curY = Math.max(45, (this.h - (isMobile ? 180 : 150)) / 2);

    const lines = [[]];
    let curLineW = 0;

    words.forEach(word => {
      const cleanWord = word.replace(/[.,]/g, '').toLowerCase();
      const isHighlighted = this.highlightWords.includes(cleanWord);
      const metrics = this.ctx.measureText(word);
      const w = metrics.width + paddingX * 2;
      const h = fontSize + paddingY * 2;

      if (curLineW + w + margin > maxLineWidth && lines[lines.length - 1].length > 0) {
        lines.push([]);
        curLineW = 0;
      }

      lines[lines.length - 1].push({
        text: word,
        isHighlighted,
        w,
        h,
        origW: w,
        origH: h
      });
      curLineW += w + margin;
    });

    // Center each line horizontally
    const lineSpacing = fontSize * 1.8;
    lines.forEach((line, lineIdx) => {
      const totalW = line.reduce((acc, item) => acc + item.w, 0) + (line.length - 1) * margin;
      let startX = (this.w - totalW) / 2;
      const startY = curY + lineIdx * lineSpacing;

      line.forEach(item => {
        this.bodies.push({
          text: item.text,
          isHighlighted: item.isHighlighted,
          w: item.w,
          h: item.h,
          x: startX + item.w / 2,
          y: startY + item.h / 2,
          initX: startX + item.w / 2,
          initY: startY + item.h / 2,
          vx: (Math.random() - 0.5) * 1.2,
          vy: 0,
          angle: 0,
          vAngle: (Math.random() - 0.5) * 0.04,
          restitution: 0.62,
          friction: 0.985
        });
        startX += item.w + margin;
      });
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
    });

    if (this.trigger === 'hover') {
      this.stage.addEventListener('pointerenter', () => {
        if (!this.isFalling) {
          this.isFalling = true;
        }
      });
    }

    this.stage.addEventListener('pointermove', e => {
      const rect = this.stage.getBoundingClientRect();
      this.pointer.x = e.clientX - rect.left;
      this.pointer.y = e.clientY - rect.top;
      if (!this.isFalling) {
        this.isFalling = true;
      }
    });

    this.stage.addEventListener('pointerleave', () => {
      this.pointer.x = -9999;
      this.pointer.y = -9999;
    });

    this.stage.addEventListener('pointerdown', () => {
      this.pointer.isDown = true;
      if (!this.isFalling) {
        this.isFalling = true;
      }
    });

    window.addEventListener('pointerup', () => {
      this.pointer.isDown = false;
    });

    this.resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      this.reset();
    });

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(([entry]) => {
        this.isInViewport = entry.isIntersecting;
      }, { threshold: 0.1 });
      obs.observe(this.stage);
    }
  }

  reset() {
    this.isFalling = false;
    this.bodies.forEach(b => {
      b.x = b.initX;
      b.y = b.initY;
      b.vx = 0;
      b.vy = 0;
      b.angle = 0;
      b.vAngle = 0;
    });
  }

  startLoop() {
    const tick = () => {
      if (this.isInViewport) {
        this.updatePhysics();
        this.render();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  updatePhysics() {
    if (!this.isFalling) return;

    const floor = this.h - 16;
    const wallLeft = 16;
    const wallRight = this.w - 16;
    const ceiling = 16;

    this.bodies.forEach(b => {
      // Gravity
      b.vy += this.gravity;

      // Mouse repulsion
      const dx = b.x - this.pointer.x;
      const dy = b.y - this.pointer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const repelDist = 140;
      if (dist < repelDist && dist > 1) {
        const force = ((repelDist - dist) / repelDist) * (this.pointer.isDown ? 14 : 7);
        b.vx += (dx / dist) * force;
        b.vy += (dy / dist) * force - 1.5;
        b.vAngle += (dx / dist) * 0.05;
      }

      // Update position & rotation
      b.x += b.vx;
      b.y += b.vy;
      b.angle += b.vAngle;

      // Apply air friction
      b.vx *= b.friction;
      b.vy *= b.friction;
      b.vAngle *= 0.97;

      // Floor collision
      const halfH = b.h / 2;
      const halfW = b.w / 2;

      if (b.y + halfH > floor) {
        b.y = floor - halfH;
        b.vy = -b.vy * b.restitution;
        b.vx *= 0.88;
        b.vAngle *= 0.85;
      }

      // Ceiling collision
      if (b.y - halfH < ceiling) {
        b.y = ceiling + halfH;
        b.vy = -b.vy * b.restitution;
      }

      // Left wall collision
      if (b.x - halfW < wallLeft) {
        b.x = wallLeft + halfW;
        b.vx = -b.vx * b.restitution;
      }

      // Right wall collision
      if (b.x + halfW > wallRight) {
        b.x = wallRight - halfW;
        b.vx = -b.vx * b.restitution;
      }
    });

    // Simple inter-body soft collision
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const b1 = this.bodies[i];
        const b2 = this.bodies[j];
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const minDist = (b1.w + b2.w) * 0.38;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist && d > 0.01) {
          const overlap = minDist - d;
          const nx = dx / d;
          const ny = dy / d;
          b1.x -= nx * overlap * 0.45;
          b1.y -= ny * overlap * 0.45;
          b2.x += nx * overlap * 0.45;
          b2.y += ny * overlap * 0.45;
          const relVx = b2.vx - b1.vx;
          const relVy = b2.vy - b1.vy;
          const impulse = (relVx * nx + relVy * ny) * 0.35;
          b1.vx += nx * impulse;
          b1.vy += ny * impulse;
          b2.vx -= nx * impulse;
          b2.vy -= ny * impulse;
        }
      }
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.w, this.h);
    const isMobile = window.innerWidth < 768;
    const fontSize = isMobile ? 18 : 24;

    this.bodies.forEach(b => {
      this.ctx.save();
      this.ctx.translate(b.x, b.y);
      this.ctx.rotate(b.angle);

      const rw = b.w;
      const rh = b.h;
      const radius = 8;

      // Pill Background
      this.ctx.beginPath();
      this.ctx.roundRect(-rw / 2, -rh / 2, rw, rh, radius);

      if (b.isHighlighted) {
        this.ctx.fillStyle = 'rgba(214, 32, 44, 0.16)';
        this.ctx.strokeStyle = 'rgba(255, 43, 43, 0.75)';
        this.ctx.lineWidth = 1.5;
      } else {
        this.ctx.fillStyle = 'rgba(18, 18, 24, 0.85)';
        this.ctx.strokeStyle = 'rgba(232, 228, 220, 0.18)';
        this.ctx.lineWidth = 1;
      }

      this.ctx.fill();
      this.ctx.stroke();

      // Word Typography
      this.ctx.font = `600 ${fontSize}px "Shippori Mincho", serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      if (b.isHighlighted) {
        this.ctx.fillStyle = '#ff2b2b';
        this.ctx.shadowColor = 'rgba(255, 43, 43, 0.4)';
        this.ctx.shadowBlur = 8;
      } else {
        this.ctx.fillStyle = '#e8e4dc';
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
      }

      this.ctx.fillText(b.text, 0, 1);
      this.ctx.restore();
    });
  }
}

export function initFallingText() {
  const stage = document.querySelector('.falling-text-stage');
  if (stage) {
    return new FallingText(stage, {
      text: "Build technology. Create experiences. Tell stories. Turn ideas into products, visuals and meaningful digital experiences.",
      highlightWords: ["technology", "experiences", "stories", "products", "visuals"],
      gravity: 0.52,
      trigger: 'hover'
    });
  }
}
