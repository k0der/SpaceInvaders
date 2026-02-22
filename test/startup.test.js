// @vitest-environment happy-dom
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startApp } from '../src/main.js';

/**
 * Create a mock canvas 2D context with all methods stubbed.
 * Properties (fillStyle, strokeStyle, etc.) are plain writable fields.
 */
function createMockCtx() {
  return {
    // Transform
    setTransform: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    // Drawing
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    // Line style
    setLineDash: vi.fn(),
    // Properties (writable, no-op)
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    lineDashOffset: 0,
  };
}

/**
 * Set up the minimal DOM and stubs needed for startApp() to run.
 * Returns { canvas, mockCtx, rafCallback } for assertions.
 */
function setupDOM() {
  const canvas = document.createElement('canvas');
  canvas.id = 'canvas';
  document.body.appendChild(canvas);

  const mockCtx = createMockCtx();
  canvas.getContext = vi.fn(() => mockCtx);

  window.innerWidth = 800;
  window.innerHeight = 600;

  let rafCallback = null;
  window.requestAnimationFrame = vi.fn((cb) => {
    rafCallback = cb;
    return 1;
  });

  return { canvas, mockCtx, getRafCallback: () => rafCallback };
}

describe('E2E Startup — ES module', () => {
  let canvas;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    if (canvas?.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  });

  it('startApp() completes without throwing', () => {
    const dom = setupDOM();
    canvas = dom.canvas;
    expect(() => startApp()).not.toThrow();
  });

  it('startApp() obtains a 2d rendering context', () => {
    const dom = setupDOM();
    canvas = dom.canvas;
    startApp();
    expect(dom.canvas.getContext).toHaveBeenCalledWith('2d');
  });

  it('startApp() sets up HiDPI canvas (calls setTransform)', () => {
    const dom = setupDOM();
    canvas = dom.canvas;
    startApp();
    expect(dom.mockCtx.setTransform).toHaveBeenCalled();
  });

  it('startApp() schedules a render frame via requestAnimationFrame', () => {
    const dom = setupDOM();
    canvas = dom.canvas;
    startApp();
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('one render frame completes without throwing', () => {
    const dom = setupDOM();
    canvas = dom.canvas;
    startApp();

    const frameCallback = dom.getRafCallback();
    expect(frameCallback).toBeDefined();
    expect(() => frameCallback(16)).not.toThrow();
  });
});

describe('E2E Startup — production build', () => {
  let canvas;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    if (canvas?.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  });

  it('bundled script executes without throwing (catches TDZ and missing-symbol errors)', () => {
    execSync('node build.js', { cwd: process.cwd() });
    const html = fs.readFileSync('./index.html', 'utf-8');
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    const scriptContent = scriptMatch[1];

    const dom = setupDOM();
    canvas = dom.canvas;

    expect(() => new Function(scriptContent)()).not.toThrow();
  });
});
