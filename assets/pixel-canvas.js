/* ============================================================
   <pixel-canvas> — framework-agnostic Web Component
   Vanilla port of the 21st.dev PixelCanvas (originally React/TS).
   Pixels animate in on parent hover/focus ("appear") and out on
   leave/blur ("disappear"). Respects prefers-reduced-motion.

   Usage:
     <div class="card">                  <!-- relative, overflow:hidden -->
       <pixel-canvas data-gap="14" data-speed="35"
                     data-colors="#d7ece5,#bce0d7,#6eb39f,#0b6854"
                     data-variant="default"></pixel-canvas>
       <div class="card__content"> ... </div>   <!-- positioned above -->
     </div>

   Attributes (all optional):
     data-gap      pixel spacing in device px      (4-50, default 5)
     data-speed    shimmer speed                   (0-100, default 35)
     data-colors   comma-separated hex list
     data-variant  "default" (sweep from bottom-left) | "icon" (radial)
     data-no-focus present = ignore focus/blur triggers
   ============================================================ */
(function () {
  "use strict";

  if (typeof window === "undefined" || !("customElements" in window)) return;
  if (customElements.get("pixel-canvas")) return;

  class Pixel {
    constructor(canvas, context, x, y, color, speed, delay, reveal) {
      this.width = canvas.width;
      this.height = canvas.height;
      this.ctx = context;
      this.x = x;
      this.y = y;
      this.color = color;
      this.speed = this.getRandomValue(0.1, 0.9) * speed;
      this.size = 0;
      this.sizeStep = Math.random() * 0.4;
      this.minSize = 0.5;
      this.maxSizeInteger = 2;
      this.maxSize = this.getRandomValue(this.minSize, this.maxSizeInteger);
      this.delay = delay;
      this.counter = 0;
      // counterStep is how fast a pixel reaches its delay → controls how
      // quickly the reveal wavefront propagates. `reveal` < 1 slows it down.
      this.counterStep =
        (Math.random() * 4 + (this.width + this.height) * 0.01) * (reveal || 1);
      this.isIdle = false;
      this.isReverse = false;
      this.isShimmer = false;
    }

    getRandomValue(min, max) {
      return Math.random() * (max - min) + min;
    }

    draw() {
      const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5;
      this.ctx.fillStyle = this.color;
      this.ctx.fillRect(
        this.x + centerOffset,
        this.y + centerOffset,
        this.size,
        this.size
      );
    }

    appear() {
      this.isIdle = false;
      if (this.counter <= this.delay) {
        this.counter += this.counterStep;
        return;
      }
      if (this.size >= this.maxSize) {
        this.isShimmer = true;
      }
      if (this.isShimmer) {
        this.shimmer();
      } else {
        this.size += this.sizeStep;
      }
      this.draw();
    }

    disappear() {
      this.isShimmer = false;
      this.counter = 0;
      if (this.size <= 0) {
        this.isIdle = true;
        return;
      } else {
        this.size -= 0.1;
      }
      this.draw();
    }

    shimmer() {
      if (this.size >= this.maxSize) {
        this.isReverse = true;
      } else if (this.size <= this.minSize) {
        this.isReverse = false;
      }
      if (this.isReverse) {
        this.size -= this.speed;
      } else {
        this.size += this.speed;
      }
    }
  }

  class PixelCanvasElement extends HTMLElement {
    constructor() {
      super();
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.pixels = [];
      this.animation = null;
      this.timeInterval = 1000 / 60;
      this.timePrevious = performance.now();
      this.reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      this._initialized = false;
      this._resizeObserver = null;
      this._parent = null;

      // Bind handlers once so add/removeEventListener match.
      this._onAppear = () => this.handleAnimation("appear");
      this._onDisappear = () => this.handleAnimation("disappear");

      const shadow = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = `
        :host {
          display: grid;
          position: absolute;   /* overlay that fills a positioned parent */
          inset: 0;
          inline-size: 100%;
          block-size: 100%;
          overflow: hidden;
          pointer-events: none; /* never intercept hover/clicks */
        }
      `;
      shadow.appendChild(style);
      shadow.appendChild(this.canvas);
    }

    get colors() {
      const raw = this.dataset.colors;
      return raw ? raw.split(",") : ["#f8fafc", "#f1f5f9", "#cbd5e1"];
    }

    get gap() {
      const value = Number(this.dataset.gap) || 5;
      return Math.max(4, Math.min(50, value));
    }

    get speed() {
      const value = Number(this.dataset.speed) || 35;
      return this.reducedMotion ? 0 : Math.max(0, Math.min(100, value)) * 0.001;
    }

    get noFocus() {
      return this.hasAttribute("data-no-focus");
    }

    get variant() {
      return this.dataset.variant || "default";
    }

    get revealSpeed() {
      // < 1 = slower spread, > 1 = faster. Clamped to a sane range.
      const value = Number(this.dataset.reveal);
      if (!value || value <= 0) return 1;
      return Math.max(0.15, Math.min(3, value));
    }

    connectedCallback() {
      if (this._initialized) return;
      this._initialized = true;
      this._parent = this.parentElement;

      requestAnimationFrame(() => {
        this.handleResize();
        const ro = new ResizeObserver((entries) => {
          if (!entries.length) return;
          requestAnimationFrame(() => this.handleResize());
        });
        ro.observe(this);
        this._resizeObserver = ro;
      });

      if (this._parent) {
        this._parent.addEventListener("mouseenter", this._onAppear);
        this._parent.addEventListener("mouseleave", this._onDisappear);
        if (!this.noFocus) {
          this._parent.addEventListener("focus", this._onAppear, { capture: true });
          this._parent.addEventListener("blur", this._onDisappear, { capture: true });
        }
      }
    }

    disconnectedCallback() {
      this._initialized = false;
      if (this._resizeObserver) this._resizeObserver.disconnect();

      if (this._parent) {
        this._parent.removeEventListener("mouseenter", this._onAppear);
        this._parent.removeEventListener("mouseleave", this._onDisappear);
        if (!this.noFocus) {
          this._parent.removeEventListener("focus", this._onAppear, { capture: true });
          this._parent.removeEventListener("blur", this._onDisappear, { capture: true });
        }
      }

      if (this.animation) {
        cancelAnimationFrame(this.animation);
        this.animation = null;
      }
      this._parent = null;
    }

    handleResize() {
      if (!this.ctx || !this._initialized) return;

      const rect = this.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);

      this.createPixels();
    }

    getDistanceToCenter(x, y) {
      const dx = x - this.canvas.width / 2;
      const dy = y - this.canvas.height / 2;
      return Math.sqrt(dx * dx + dy * dy);
    }

    getDistanceToBottomLeft(x, y) {
      const dx = x;
      const dy = this.canvas.height - y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    createPixels() {
      if (!this.ctx) return;
      this.pixels = [];

      // Step in CSS px so density is DPR-independent (avoids huge pixel
      // counts on hi-DPI screens). Coordinates stay in device px to match
      // the scaled context.
      const dpr = window.devicePixelRatio || 1;
      const step = this.gap * dpr;

      for (let x = 0; x < this.canvas.width; x += step) {
        for (let y = 0; y < this.canvas.height; y += step) {
          const color = this.colors[Math.floor(Math.random() * this.colors.length)];
          let delay = 0;

          if (this.variant === "icon") {
            delay = this.reducedMotion ? 0 : this.getDistanceToCenter(x, y);
          } else {
            delay = this.reducedMotion ? 0 : this.getDistanceToBottomLeft(x, y);
          }

          this.pixels.push(
            new Pixel(this.canvas, this.ctx, x / dpr, y / dpr, color, this.speed, delay, this.revealSpeed)
          );
        }
      }
    }

    handleAnimation(name) {
      if (this.animation) {
        cancelAnimationFrame(this.animation);
      }

      const animate = () => {
        this.animation = requestAnimationFrame(animate);

        const timeNow = performance.now();
        const timePassed = timeNow - this.timePrevious;
        if (timePassed < this.timeInterval) return;
        this.timePrevious = timeNow - (timePassed % this.timeInterval);

        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        let allIdle = true;
        for (const pixel of this.pixels) {
          pixel[name]();
          if (!pixel.isIdle) allIdle = false;
        }

        if (allIdle) {
          cancelAnimationFrame(this.animation);
          this.animation = null;
        }
      };

      animate();
    }
  }

  customElements.define("pixel-canvas", PixelCanvasElement);
})();
