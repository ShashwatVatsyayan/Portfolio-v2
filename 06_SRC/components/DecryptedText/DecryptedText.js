/**
 * DecryptedText — Monospace cryptographic character reveal component.
 * Deciphers text dynamically with randomized glyphs upon entering viewport.
 */

export class DecryptedText {
  constructor(containerEl, options = {}) {
    this.container = typeof containerEl === 'string' ? document.querySelector(containerEl) : containerEl;
    if (!this.container) return;

    this.text = options.text || this.container.dataset.text || this.container.textContent.trim();
    this.speed = options.speed ?? 45; // ms per tick
    this.maxIterations = options.maxIterations ?? 16;
    this.characters = options.characters || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*<>[]{}';
    this.animateOn = options.animateOn ?? 'view';
    this.revealDirection = options.revealDirection ?? 'center'; // 'center', 'left', 'right'

    this.loop = options.loop ?? false;
    this.loopHoldTime = options.loopHoldTime ?? 1400; // ms to pause while readable
    this.isLooping = this.loop;
    this.loopTimeout = null;

    this.hasAnimated = false;
    this.timer = null;

    this.setupDOM();
    if (this.animateOn === 'view') {
      this.initObserver();
    } else if (this.loop) {
      this.startLoop();
    } else {
      this.start();
    }
  }

  setupDOM() {
    this.container.classList.add('decrypted-text-container');
    this.container.innerHTML = '';
    this.charSpans = [];

    const chars = this.text.split('');
    chars.forEach((c) => {
      const span = document.createElement('span');
      span.className = 'decrypted-char encrypted';
      span.textContent = c === ' ' ? '\u00A0' : this.getRandomChar();
      this.container.appendChild(span);
      this.charSpans.push({
        el: span,
        targetChar: c,
        isSpace: c === ' ',
        revealed: false
      });
    });
  }

  getRandomChar() {
    return this.characters.charAt(Math.floor(Math.random() * this.characters.length));
  }

  initObserver() {
    if (!('IntersectionObserver' in window)) {
      this.start();
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !this.hasAnimated) {
        this.hasAnimated = true;
        this.start();
        observer.disconnect();
      }
    }, { threshold: 0.25 });

    observer.observe(this.container);
  }

  start() {
    if (this.timer) clearInterval(this.timer);

    const totalChars = this.charSpans.length;
    const centerIdx = Math.floor(totalChars / 2);
    let iteration = 0;

    // Determine reveal order based on revealDirection
    const revealOrder = [];
    if (this.revealDirection === 'center') {
      for (let i = 0; i <= centerIdx; i++) {
        if (centerIdx - i >= 0) revealOrder.push(centerIdx - i);
        if (centerIdx + i < totalChars && i !== 0) revealOrder.push(centerIdx + i);
      }
    } else if (this.revealDirection === 'right') {
      for (let i = totalChars - 1; i >= 0; i--) revealOrder.push(i);
    } else {
      // default left
      for (let i = 0; i < totalChars; i++) revealOrder.push(i);
    }

    this.timer = setInterval(() => {
      iteration++;

      // Progressively lock in characters according to revealOrder
      const numToReveal = Math.min(
        totalChars,
        Math.floor((iteration / this.maxIterations) * totalChars)
      );

      for (let i = 0; i < numToReveal; i++) {
        const charIdx = revealOrder[i];
        if (charIdx !== undefined && this.charSpans[charIdx]) {
          const item = this.charSpans[charIdx];
          if (!item.revealed) {
            item.revealed = true;
            item.el.textContent = item.isSpace ? '\u00A0' : item.targetChar;
            item.el.className = 'decrypted-char revealed';
          }
        }
      }

      // Scramble remaining unrevealed characters
      this.charSpans.forEach(item => {
        if (!item.revealed) {
          item.el.textContent = item.isSpace ? '\u00A0' : this.getRandomChar();
        }
      });

      if (iteration >= this.maxIterations && numToReveal >= totalChars) {
        clearInterval(this.timer);
        this.timer = null;
        this.charSpans.forEach(item => {
          item.el.textContent = item.isSpace ? '\u00A0' : item.targetChar;
          item.el.className = 'decrypted-char revealed';
        });

        // If configured to loop, hold readable for loopHoldTime, then scramble and cycle again
        if (this.isLooping) {
          this.loopTimeout = setTimeout(() => {
            if (this.isLooping) {
              this.reset();
              this.start();
            }
          }, this.loopHoldTime);
        }
      }
    }, this.speed);
  }

  reset() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.loopTimeout) {
      clearTimeout(this.loopTimeout);
      this.loopTimeout = null;
    }
    this.charSpans.forEach(item => {
      item.revealed = false;
      item.el.textContent = item.isSpace ? '\u00A0' : this.getRandomChar();
      item.el.className = 'decrypted-char encrypted';
    });
  }

  startLoop() {
    this.isLooping = true;
    this.reset();
    this.start();
  }

  stopLoop() {
    this.isLooping = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.loopTimeout) {
      clearTimeout(this.loopTimeout);
      this.loopTimeout = null;
    }
    // Settle to clear, readable state when paused
    this.charSpans.forEach(item => {
      item.revealed = true;
      item.el.textContent = item.isSpace ? '\u00A0' : item.targetChar;
      item.el.className = 'decrypted-char revealed';
    });
  }
}

export function initDecryptedText() {
  document.querySelectorAll('[data-decrypted-text]').forEach(el => {
    new DecryptedText(el, {
      text: el.dataset.decryptedText,
      animateOn: 'view',
      revealDirection: 'center',
      speed: 40,
      maxIterations: 18
    });
  });
}
