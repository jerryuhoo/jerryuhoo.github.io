/* Animation lifecycle and accessible controls shared by the three SVG studies. */
(() => {
    'use strict';
    const root = document.querySelector('.product-emblem');
    const original = root?.querySelector('svg');
    const project = document.body.dataset.project;
    const createRenderer = window.ProjectArtRenderers?.[project];
    if (!root || !original || !createRenderer) return;

    const studies = {
        fire: { modes: ['Distortion', 'Phaser', 'Chorus', 'Reverb', 'Lo-fi', 'Granular'], figure: '01', zh: '持续变化的声音雕塑，使用方向键或移动指针改变形态', en: 'An evolving sound sculpture. Use arrow keys or move your pointer to shape it.', hintZh: '移动鼠标，塑造声音', hintEn: 'MOVE TO SHAPE THE SOUND' },
        atmos: { modes: ['Orbit', 'Field', 'Compare'], figure: '02', zh: '持续变化的空间声场，使用方向键或移动指针改变视角', en: 'An evolving spatial field. Use arrow keys or move your pointer to change its perspective.', hintZh: '移动鼠标，探索声场', hintEn: 'MOVE TO EXPLORE THE FIELD' },
        hub: { modes: ['Arrange', 'Connect', 'Flow'], figure: '03', zh: '持续变化的插件编排，使用方向键或移动指针改变排列', en: 'An evolving plugin arrangement. Use arrow keys or move your pointer to rearrange it.', hintZh: '移动鼠标，发现新的秩序', hintEn: 'MOVE TO FIND A NEW ORDER' }
    };
    const study = studies[project];
    if (!study) return;
    const svg = original.cloneNode(true);
    let renderer;
    const state = {
        time: 0,
        pointer: { x: 0, y: 0, strength: 0 },
        weights: study.modes.map((_, index) => index === 0 ? 1 : 0)
    };
    // Build off-DOM; leave the original illustration intact if SVG setup fails.
    try {
        renderer = createRenderer(svg);
        renderer.render(state);
    } catch { return; }
    svg.setAttribute('aria-hidden', 'true');
    const element = (tag, className, text) => {
        const node = document.createElement(tag);
        node.className = className;
        if (text) node.textContent = text;
        return node;
    };
    const stage = element('div', 'project-art-stage');
    stage.tabIndex = 0;
    stage.setAttribute('role', 'img');
    stage.append(svg);
    const controls = element('div', 'project-art-controls');
    const caption = element('span', 'project-art-caption mono');
    const playState = element('span', 'project-art-state mono');
    const toggle = element('button', 'project-art-toggle');
    toggle.type = 'button';
    controls.append(caption, playState, toggle);
    const modeGroup = element('div', 'project-art-modes');
    modeGroup.setAttribute('role', 'group');
    const modeButtons = study.modes.map((name, index) => {
        const button = element('button', 'project-art-mode', name);
        button.type = 'button';
        button.dataset.artMode = name.toLowerCase();
        button.addEventListener('click', () => selectMode(index));
        modeGroup.append(button);
        return button;
    });
    const hint = element('p', 'project-art-hint');
    root.replaceChildren(stage, controls, modeGroup, hint);
    root.removeAttribute('aria-hidden');
    root.classList.add('is-interactive');

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused = preference.matches;
    let visible = true;
    let pageActive = true;
    let selected = 0;
    let cycleTime = 0;
    let frame = 0;
    let lastTime = null;
    const target = { x: 0, y: 0, strength: 0 };
    const canRun = () => !paused && visible && pageActive && !document.hidden;
    const isEnglish = () => document.documentElement.lang === 'en';
    const clamp = value => Math.max(-1, Math.min(1, value));

    function updateControls() {
        const english = isEnglish();
        caption.textContent = `FIG. ${study.figure} / ${study.modes[selected].toUpperCase()}`;
        playState.textContent = paused ? 'STILL' : 'EVOLVING';
        toggle.textContent = paused ? '▷' : 'Ⅱ';
        toggle.setAttribute('aria-pressed', String(paused));
        toggle.setAttribute('aria-label', english ? (paused ? 'Play animation' : 'Pause animation') : (paused ? '播放动画' : '暂停动画'));
        stage.setAttribute('aria-label', english ? study.en : study.zh);
        modeGroup.setAttribute('aria-label', english ? 'Visual studies; selection continues evolving automatically' : '视觉形态，选择后仍会继续自动演化');
        hint.textContent = english ? study.hintEn : study.hintZh;
        modeButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === selected)));
    }
    function selectMode(index) {
        selected = index;
        cycleTime = 0;
        updateControls();
        if (!canRun()) {
            state.weights = state.weights.map((_, position) => Number(position === selected));
            renderer.render(state);
        }
    }
    function tick(timestamp) {
        frame = 0;
        if (!canRun()) return;
        if (lastTime === null) lastTime = timestamp - 1000 / 30;
        const elapsed = timestamp - lastTime;
        if (elapsed >= 1000 / 30) {
            const delta = Math.min(elapsed / 1000, .1);
            lastTime = timestamp;
            state.time += delta;
            cycleTime += delta;
            if (cycleTime >= 6.5) selectMode((selected + 1) % study.modes.length);
            const morph = 1 - Math.exp(-delta * 2.4);
            const follow = 1 - Math.exp(-delta * 5);
            state.weights.forEach((weight, index) => { state.weights[index] += (Number(index === selected) - weight) * morph; });
            for (const key of ['x', 'y', 'strength']) state.pointer[key] += (target[key] - state.pointer[key]) * follow;
            renderer.render(state);
        }
        frame = requestAnimationFrame(tick);
    }
    function syncMotion() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        lastTime = null;
        if (canRun()) frame = requestAnimationFrame(tick);
    }
    function setPointer(x, y, strength = 1) {
        target.x = clamp(x);
        target.y = clamp(y);
        target.strength = strength;
        // Explicit input remains available with automatic motion disabled.
        if (paused) {
            Object.assign(state.pointer, target);
            renderer.render(state);
        }
    }
    stage.addEventListener('pointermove', event => {
        const bounds = stage.getBoundingClientRect();
        if (bounds.width && bounds.height) setPointer((event.clientX - bounds.left) / bounds.width * 2 - 1, (event.clientY - bounds.top) / bounds.height * 2 - 1);
    }, { passive: true });
    const releasePointer = () => setPointer(0, 0, 0);
    stage.addEventListener('pointerleave', releasePointer);
    stage.addEventListener('pointercancel', releasePointer);
    stage.addEventListener('blur', releasePointer);
    stage.addEventListener('keydown', event => {
        const moves = { ArrowLeft: [-.25, 0], ArrowRight: [.25, 0], ArrowUp: [0, -.25], ArrowDown: [0, .25] };
        if (!moves[event.key] || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        const [x, y] = moves[event.key];
        setPointer(target.x + x, target.y + y);
    });
    toggle.addEventListener('click', () => {
        paused = !paused;
        updateControls();
        syncMotion();
    });
    preference.addEventListener('change', event => {
        paused = event.matches;
        updateControls();
        syncMotion();
    });
    document.addEventListener('visibilitychange', syncMotion);
    window.addEventListener('pagehide', () => { pageActive = false; syncMotion(); });
    window.addEventListener('pageshow', () => { pageActive = true; syncMotion(); });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting;
            syncMotion();
        }, { threshold: .01 }).observe(root);
    }
    new MutationObserver(updateControls).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    updateControls();
    syncMotion();
})();
