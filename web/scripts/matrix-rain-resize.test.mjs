// Run with: node --test scripts/matrix-rain-resize.test.mjs
// Executes the component with deterministic hooks, RAF, and a pixel-backed
// canvas double. This checks image copies and lifecycle behavior, not browser
// font rasterization, compositing, or React's scheduling implementation.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const compiled = ts.transpileModule(
  readFileSync(new URL("../src/components/MatrixRain3DBackground/MatrixRain3DBackground.tsx", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }
).outputText;
const backgroundPixel = 0xff050506;
const sameDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

class PixelCanvas {
  constructor() {
    this._width = 0;
    this._height = 0;
    this.style = {};
    this.pixels = new Uint32Array();
    this.operations = [];
    this.context = {
      setTransform: (...values) => { this.transform = values; },
      fillRect: (x, y, width, height) => {
        const style = this.context.fillStyle;
        this.operations.push({ kind: "fill", x, y, width, height, style });
        const channels = style.startsWith("#")
          ? [parseInt(style.slice(1, 3), 16), parseInt(style.slice(3, 5), 16), parseInt(style.slice(5, 7), 16), 1]
          : style.match(/[\d.]+/g).map(Number);
        const [r, g, b, alpha] = channels;
        const [sx, , , sy] = this.transform;
        for (let row = Math.max(0, Math.floor(y * sy)); row < Math.min(this.height, Math.ceil((y + height) * sy)); row++) {
          for (let col = Math.max(0, Math.floor(x * sx)); col < Math.min(this.width, Math.ceil((x + width) * sx)); col++) {
            const i = row * this.width + col;
            const old = this.pixels[i];
            const blend = (value, shift) => Math.round(value * alpha + ((old >>> shift) & 255) * (1 - alpha));
            this.pixels[i] = (255 << 24) | (blend(r, 16) << 16) | (blend(g, 8) << 8) | blend(b, 0);
          }
        }
      },
      drawImage: (source, ...args) => {
        // A resize must copy existing device pixels without resampling them.
        assert.deepEqual(args, [0, 0]);
        assert.deepEqual(this.transform, [1, 0, 0, 1, 0, 0]);
        this.operations.push({ kind: "copy", width: source.width, height: source.height });
        const width = Math.min(source.width, this.width);
        for (let row = 0; row < Math.min(source.height, this.height); row++) {
          this.pixels.set(source.pixels.subarray(row * source.width, row * source.width + width), row * this.width);
        }
      },
      fillText: (glyph, x, y) => {
        this.operations.push({ kind: "glyph", glyph, x, y });
        // Represent each glyph by one pixel to exercise buffer clipping without
        // pretending to reproduce a browser's font rasterizer.
        const col = Math.floor(x * this.transform[0]);
        const row = Math.floor(y * this.transform[3]);
        if (col >= 0 && col < this.width && row >= 0 && row < this.height) {
          this.pixels[row * this.width + col] = 0xff66ff88;
        }
      },
    };
    this.reset();
  }
  reset() {
    this.pixels = new Uint32Array(this.width * this.height);
    this.transform = [1, 0, 0, 1, 0, 0];
    if (this.context) this.context.fillStyle = "#000000";
  }
  get width() { return this._width; }
  set width(value) { this._width = value; this.reset(); }
  get height() { return this._height; }
  set height(value) { this._height = value; this.reset(); }
  getContext() { return this.context; }
  seed() {
    // Distinct opaque pixels stand in for the accumulated glyph/trail image.
    for (let i = 0; i < this.pixels.length; i++) this.pixels[i] = (0xff000000 | ((i * 7919) & 0xffffff)) >>> 0;
  }
}

function harness({ width = 390, height = 700, dpr = 1, paused = false, reducedMotion = false } = {}) {
  const slots = [], effects = [], frames = new Map(), events = new Map();
  const canvas = new PixelCanvas();
  let cursor = 0, nextId = 0, cancelled = 0, seed = 42;
  let props = { theme: "dark", motionSpeed: 1, paused, reducedMotion };
  const hooks = {
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) {
      const i = cursor++;
      slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
      return [slots[i].value, value => { slots[i].value = value; }];
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!sameDeps(slots[i]?.deps, deps)) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!sameDeps(slots[i]?.deps, deps)) {
        const old = slots[i];
        slots[i] = { deps };
        effects.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); });
      }
    },
  };
  const window = {
    innerWidth: width, innerHeight: height, devicePixelRatio: dpr,
    addEventListener: (name, fn) => events.set(name, fn),
    removeEventListener: name => events.delete(name),
  };
  const document = {
    hidden: false,
    createElement: tag => { assert.equal(tag, "canvas"); return new PixelCanvas(); },
    addEventListener: (name, fn) => events.set(name, fn),
    removeEventListener: name => events.delete(name),
  };
  const math = Object.create(Math);
  math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
  const module = { exports: {} };
  new Function("require", "module", "exports", "window", "document", "requestAnimationFrame", "cancelAnimationFrame", "Math", compiled)(
    name => {
      if (name === "react") return hooks;
      if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }) };
      if (name.endsWith(".css")) return {};
      throw new Error(`Unexpected import: ${name}`);
    },
    module, module.exports, window, document,
    fn => { frames.set(++nextId, fn); return nextId; },
    id => { cancelled++; frames.delete(id); }, math
  );
  const render = (nextProps = {}) => {
    props = { ...props, ...nextProps };
    cursor = 0;
    const element = module.exports.default(props);
    element.props.ref.current = canvas;
    effects.splice(0).forEach(effect => effect());
  };
  const run = (id, time) => { const fn = frames.get(id); frames.delete(id); fn(time); };
  render();
  return {
    canvas, frames, window, events, render,
    get cancelled() { return cancelled; },
    get streams() { return slots.find(slot => Array.isArray(slot?.current) && slot.current[0]?.glyphs)?.current; },
    frame(time) { [...frames.keys()].forEach(id => run(id, time)); },
    resize(height, width = window.innerWidth) {
      const existing = new Set(frames.keys());
      window.innerWidth = width;
      window.innerHeight = height;
      events.get("resize")();
      // Run the resize callback alone, allowing exact before/after comparison
      // without advancing an unrelated animation frame in between.
      const resizeId = [...frames.keys()].find(id => !existing.has(id));
      run(resizeId, 50);
    },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

for (const width of [320, 390, 430]) {
  for (const dpr of [1, 1.35]) {
    for (const mode of ["active", "paused", "reduced motion"]) {
      test(`${width}px / DPR ${dpr} / ${mode}: height resizes preserve pixels, coordinates, and loop`, () => {
        const h = harness({ width, dpr, paused: mode === "paused", reducedMotion: mode === "reduced motion" });
        if (mode === "active") { h.frame(0); h.frame(16.67); }
        for (const height of [780, 700, 701, 724, 725, 1000, 700, 700]) {
          h.canvas.seed();
          const pixels = h.canvas.pixels.slice();
          const oldHeight = h.canvas.height;
          const streams = structuredClone(h.streams);
          const activeFrames = [...h.frames];
          const cancellations = h.cancelled;
          h.canvas.operations.length = 0;
          h.resize(height);
          assert.equal(h.canvas.width, Math.floor(width * dpr));
          assert.equal(h.canvas.height, Math.floor(height * dpr));
          assert.equal(h.canvas.style.width, `${width}px`);
          assert.equal(h.canvas.style.height, `${height}px`);
          const overlap = Math.min(oldHeight, h.canvas.height) * h.canvas.width;
          assert.deepEqual(h.canvas.pixels.subarray(0, overlap), pixels.subarray(0, overlap));
          assert.ok(h.canvas.pixels.subarray(overlap).every(pixel => pixel === backgroundPixel));
          assert.deepEqual(h.streams, streams, "resize must not move streams or advance glyph timers");
          assert.deepEqual([...h.frames], activeFrames, "preserve the exact pending animation callback");
          assert.equal(h.cancelled, cancellations);
          assert.ok(h.canvas.operations.every(op => op.kind === "copy" || (op.kind === "fill" && op.y >= oldHeight)), "no static redraw or fill over the retained image");
          assert.deepEqual(h.canvas.transform, [dpr, 0, 0, dpr, 0, 0]);
        }
        if (mode === "active") {
          const previousY = h.streams[0].y;
          h.canvas.operations.length = 0;
          h.frame(33.34);
          assert.ok(h.streams[0].y > previousY);
          assert.equal(h.frames.size, 1);
          const fill = h.canvas.operations.find(op => op.kind === "fill");
          assert.equal(fill.width, width);
          assert.equal(fill.height, 700);
          assert.ok(h.canvas.operations.some(op => op.kind === "glyph"));
        } else assert.equal(h.frames.size, 0);
        h.unmount();
        assert.equal(h.frames.size, 0);
      });
    }
  }
}

test("animation uses new logical height after growth; speed changes preserve trails and timing", () => {
  const h = harness();
  h.frame(0); h.frame(16.67);
  h.resize(780);
  h.streams[0].y = 740;
  h.canvas.operations.length = 0;
  h.frame(33.34);
  assert.equal(h.canvas.operations.find(op => op.kind === "fill").height, 780);
  const stream = h.streams[0];
  assert.equal(h.canvas.pixels[Math.floor(stream.y) * h.canvas.width + Math.floor(stream.x)], 0xff66ff88, "glyphs can draw into the newly exposed area below the old 700px buffer");
  const before = stream.y;
  h.frame(50.01);
  const normalStep = stream.y - before;
  const frames = [...h.frames], cancelled = h.cancelled;
  h.canvas.seed();
  const pixels = h.canvas.pixels.slice();
  h.canvas.operations.length = 0;
  h.render({ motionSpeed: 2 });
  assert.deepEqual([...h.frames], frames);
  assert.equal(h.cancelled, cancelled);
  assert.equal(h.canvas.operations.length, 0);
  assert.deepEqual(h.canvas.pixels, pixels);
  const fastStart = stream.y;
  h.frame(66.68);
  assert.ok(Math.abs(stream.y - fastStart - normalStep * 2) < 1e-10, "speed applies on the next frame without resetting elapsed time");
  h.render({ paused: true });
  h.resize(700);
  h.canvas.seed();
  const pausedPixels = h.canvas.pixels.slice(), pausedStreams = structuredClone(h.streams);
  h.canvas.operations.length = 0;
  h.render({ motionSpeed: 0.5 });
  assert.equal(h.frames.size, 0);
  assert.equal(h.canvas.operations.length, 0);
  assert.deepEqual(h.canvas.pixels, pausedPixels);
  assert.deepEqual(h.streams, pausedStreams);
  h.render({ paused: false });
  assert.equal(h.frames.size, 1);
  h.frame(100); h.frame(116.67);
  assert.ok(h.streams[0].y > pausedStreams[0].y);
  h.unmount();
});

test("coalesced resize events keep the active frame and apply the latest height", () => {
  const h = harness();
  const [animationId, animationCallback] = [...h.frames][0];
  for (const height of [710, 730, 780]) {
    h.window.innerHeight = height;
    h.events.get("resize")();
  }
  assert.equal(h.frames.size, 2);
  assert.equal(h.frames.get(animationId), animationCallback);
  assert.equal(h.cancelled, 2, "only superseded resize callbacks are cancelled");
  h.frame(0);
  assert.equal(h.canvas.height, 780);
  assert.equal(h.frames.size, 1);
  h.unmount();
});

test("desktop and mobile width changes retain the existing full-resize path", () => {
  for (const [initialWidth, nextWidth] of [[1200, 1200], [390, 430]]) {
    const h = harness({ width: initialWidth });
    const frames = [...h.frames];
    h.canvas.operations.length = 0;
    h.resize(780, nextWidth);
    assert.equal(h.canvas.height, 780);
    assert.equal(h.canvas.width, nextWidth);
    assert.ok(h.canvas.operations.some(op => op.kind === "fill" && op.style === "#050506" && op.y === 0));
    assert.ok(!h.canvas.operations.some(op => op.kind === "copy"));
    assert.deepEqual([...h.frames], frames);
    h.unmount();
  }
});

test("a DPR change uses full resize rather than restoring pixels at the wrong scale", () => {
  const h = harness();
  const frames = [...h.frames];
  h.window.devicePixelRatio = 2;
  h.canvas.operations.length = 0;
  h.resize(700);
  assert.equal(h.canvas.width, Math.floor(390 * 1.35));
  assert.equal(h.canvas.height, Math.floor(700 * 1.35));
  assert.ok(!h.canvas.operations.some(op => op.kind === "copy"));
  assert.deepEqual([...h.frames], frames);
  h.unmount();
});
