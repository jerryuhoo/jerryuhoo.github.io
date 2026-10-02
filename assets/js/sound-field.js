/* A small, dependency-free wire sculpture. All three studies share one mesh. */
(() => {
  'use strict';

  const canvas = document.getElementById('sound-field');
  const container = canvas && canvas.closest('.sound-art');
  if (!canvas || !container) return;

  let context;
  try { context = canvas.getContext('2d', { alpha: true }); } catch (_) { return; }
  if (!context) return;

  const TAU = Math.PI * 2;
  const ROWS = 88;
  const COLUMNS = 32;
  const STRIDE = COLUMNS + 1;
  const FRAME_INTERVAL = 1000 / 30;
  const modes = ['spatial', 'wave', 'drive'];
  const weights = [1, 0, 0];
  const points = new Float32Array((ROWS + 1) * STRIDE * 3);
  const depthPaths = Array.from({ length: 8 }, () => []);
  const strokePalette = new Array(depthPaths.length);
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let selectedMode = 0;
  let width = 0;
  let height = 0;
  let time = 0;
  let lastFrame = 0;
  let animationFrame = 0;
  let paused = motionPreference.matches;
  let visible = true;
  let rendered = false;

  const canAnimate = () => !paused && visible && !document.hidden;

  function colorRGB(value) {
    const hex = value.match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i);
    if (hex) {
      const digits = hex[1].length < 5 ? hex[1].split('').map(char => char + char).join('') : hex[1];
      return [0, 2, 4].map(index => parseInt(digits.slice(index, index + 2), 16));
    }
    const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
    if (!rgb) return null;
    const channels = rgb[1].trim().split(/[,\s/]+/).slice(0, 3).map(channel => {
      const number = parseFloat(channel);
      return Math.round(Math.max(0, Math.min(255, channel.endsWith('%') ? number * 2.55 : number)));
    });
    return channels.length === 3 && channels.every(Number.isFinite) ? channels : null;
  }

  // Resolve CSS only when the palette changes, including while motion is paused.
  function refreshPalette() {
    const dark = document.documentElement.dataset.theme === 'dark';
    let rgb = dark ? [145, 165, 255] : [41, 72, 220];
    const previousStroke = context.strokeStyle;
    try {
      const style = window.getComputedStyle(container);
      const color = style.getPropertyValue('--blue').trim() || style.color;
      context.strokeStyle = `rgb(${rgb.join(',')})`;
      context.strokeStyle = color;
      rgb = colorRGB(context.strokeStyle) || rgb;
    } catch (_) { /* A usable theme palette remains available without style resolution. */ }
    context.strokeStyle = previousStroke;
    for (let bucket = 0; bucket < strokePalette.length; bucket++) {
      const alpha = dark ? 0.18 + bucket * 0.087 : 0.12 + bucket * 0.077;
      strokePalette[bucket] = `rgba(${rgb.join(',')},${alpha.toFixed(3)})`;
    }
  }

  function render() {
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);

    const tilt = 0.82 + Math.cos(time * 0.12) * 0.06 + pointer.y * 0.12;
    const turn = 0.24 + Math.sin(time * 0.14) * 0.08 + pointer.x * 0.16;
    const spin = -0.27 + Math.sin(time * 0.08) * 0.13;
    const cosX = Math.cos(tilt), sinX = Math.sin(tilt);
    const cosY = Math.cos(turn), sinY = Math.sin(turn);
    const cosZ = Math.cos(spin), sinZ = Math.sin(spin);
    const scale = Math.min(width, height) * 0.385;
    let minDepth = Infinity;
    let maxDepth = -Infinity;

    for (let row = 0; row <= ROWS; row++) {
      const u = row / ROWS * TAU;
      const sinU = Math.sin(u), cosU = Math.cos(u);
      for (let column = 0; column <= COLUMNS; column++) {
        const v = column / COLUMNS * TAU;
        const sinV = Math.sin(v), cosV = Math.cos(v);

        // Spatial: a gently breathing torus, with an asymmetric tube.
        const radius = 0.80 + 0.042 * Math.sin(u * 3 + time * 0.15);
        const tube = 0.27 + 0.025 * Math.sin(u * 3 - time * 0.17);
        const spatialX = (radius + tube * cosV) * cosU;
        const spatialY = (radius + tube * cosV) * sinU;
        const spatialZ = tube * sinV + 0.055 * Math.sin(u * 2);

        // Wave: an open ribbon whose cross-section twists along the signal.
        const across = (column / COLUMNS - 0.5) * 0.72;
        const phase = u * 1.35 - 0.55 + time * 0.10;
        const waveX = (row / ROWS - 0.5) * 2.22;
        const waveY = Math.sin(phase) * 0.39 + across * Math.cos(u * 0.8);
        const waveZ = Math.cos(phase) * 0.22 + across * Math.sin(u * 0.8);

        // Drive: harmonics deform both the ring and the tube.
        const driveRadius = 0.75 + 0.105 * Math.cos(u * 3 + time * 0.13) + 0.055 * Math.sin(u * 7);
        const driveTube = 0.27 + 0.045 * Math.sin(u * 5 + v * 2 - time * 0.18);
        const driveX = (driveRadius + driveTube * cosV) * cosU;
        const driveY = (driveRadius + driveTube * cosV) * sinU;
        const driveZ = driveTube * sinV + 0.17 * Math.sin(u * 3 + time * 0.13);

        const x = spatialX * weights[0] + waveX * weights[1] + driveX * weights[2];
        const y = spatialY * weights[0] + waveY * weights[1] + driveY * weights[2];
        const z = spatialZ * weights[0] + waveZ * weights[1] + driveZ * weights[2];
        const tiltedY = y * cosX - z * sinX;
        const tiltedZ = y * sinX + z * cosX;
        const turnedX = x * cosY + tiltedZ * sinY;
        const depth = -x * sinY + tiltedZ * cosY;
        const perspective = 3.6 / (3.6 - depth);
        const index = (row * STRIDE + column) * 3;
        points[index] = width * 0.5 + (turnedX * cosZ - tiltedY * sinZ) * scale * perspective;
        points[index + 1] = height * 0.5 + (turnedX * sinZ + tiltedY * cosZ) * scale * perspective;
        points[index + 2] = depth;
        minDepth = Math.min(minDepth, depth);
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    // Batch short mesh edges by depth: fine, pale rear lines and cobalt foreground.
    for (const path of depthPaths) path.length = 0;
    const depthRange = maxDepth - minDepth || 1;
    function edge(first, second) {
      const depth = ((points[first + 2] + points[second + 2]) * 0.5 - minDepth) / depthRange;
      const bucket = Math.min(7, Math.max(0, Math.floor(depth * 8)));
      depthPaths[bucket].push(first, second);
    }
    for (let row = 0; row <= ROWS; row++) {
      for (let column = 0; column <= COLUMNS; column++) {
        const index = (row * STRIDE + column) * 3;
        if (column < COLUMNS) edge(index, index + 3);
        if (row < ROWS) edge(index, index + STRIDE * 3);
      }
    }
    context.lineCap = 'round';
    for (let bucket = 0; bucket < depthPaths.length; bucket++) {
      const path = depthPaths[bucket];
      context.beginPath();
      for (let edgeIndex = 0; edgeIndex < path.length; edgeIndex += 2) {
        const first = path[edgeIndex], second = path[edgeIndex + 1];
        context.moveTo(points[first], points[first + 1]);
        context.lineTo(points[second], points[second + 1]);
      }
      context.strokeStyle = strokePalette[bucket];
      context.lineWidth = (width < 440 ? 0.51 : 0.62) + bucket * 0.022;
      context.stroke();
    }

    if (!rendered) {
      rendered = true;
      container.classList.add('is-rendered');
    }
  }

  function tick(timestamp) {
    animationFrame = 0;
    if (!canAnimate()) return;
    if (!lastFrame) lastFrame = timestamp - FRAME_INTERVAL;
    const elapsed = timestamp - lastFrame;
    if (elapsed >= FRAME_INTERVAL) {
      const delta = Math.min(elapsed / 1000, 0.1);
      lastFrame = timestamp - (elapsed % FRAME_INTERVAL);
      time += delta;
      const easing = 1 - Math.exp(-delta * 3.8);
      weights.forEach((weight, index) => {
        weights[index] = weight + ((index === selectedMode ? 1 : 0) - weight) * easing;
      });
      pointer.x += (pointer.targetX - pointer.x) * easing;
      pointer.y += (pointer.targetY - pointer.y) * easing;
      render();
    }
    animationFrame = window.requestAnimationFrame(tick);
  }

  function syncMotion() {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    lastFrame = 0;
    if (canAnimate()) animationFrame = window.requestAnimationFrame(tick);
  }

  function resize() {
    const bounds = container.getBoundingClientRect();
    width = Math.max(0, bounds.width);
    height = Math.max(0, bounds.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  document.querySelectorAll('[data-sound-mode]').forEach(button => {
    button.addEventListener('click', () => {
      const nextMode = modes.indexOf(button.dataset.soundMode);
      if (nextMode < 0) return;
      selectedMode = nextMode;
      if (!canAnimate()) {
        weights.forEach((_, index) => { weights[index] = index === selectedMode ? 1 : 0; });
        render();
      }
    });
  });

  container.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const bounds = container.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointer.targetX = (event.clientX - bounds.left) / bounds.width - 0.5;
    pointer.targetY = (event.clientY - bounds.top) / bounds.height - 0.5;
  });
  container.addEventListener('pointerleave', () => {
    pointer.targetX = 0;
    pointer.targetY = 0;
  });
  window.addEventListener('sound-motion-change', event => {
    paused = Boolean(event.detail && event.detail.paused);
    syncMotion();
  });
  window.addEventListener('site-theme-change', () => {
    refreshPalette();
    render();
  });
  document.addEventListener('visibilitychange', syncMotion);
  function syncMotionPreference(event) {
    paused = event.matches;
    syncMotion();
  }
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', syncMotionPreference);
  else if (motionPreference.addListener) motionPreference.addListener(syncMotionPreference);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      syncMotion();
    }, { threshold: 0 }).observe(container);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(container);
  window.addEventListener('resize', resize, { passive: true });
  refreshPalette();
  resize();
  syncMotion();
})();
