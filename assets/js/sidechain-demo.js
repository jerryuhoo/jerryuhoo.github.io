/* Sample-driven Sidechain study. Audio starts only from the listener's button. */
(() => {
    'use strict';
    const root = document.querySelector('.theme-sidechain .product-emblem');
    const DSP = window.SidechainDemoDSP;
    if (!root || !DSP) return;
    let parameters = { ...DSP.defaults };
    let data;
    try { data = DSP.create(parameters); } catch { return; }
    const NS = 'http://www.w3.org/2000/svg';
    const LEFT = 28, RIGHT = 612, TOP = 62, BOTTOM = 274, CENTER = 168, SCALE = 124;
    const width = RIGHT - LEFT;
    const svgNode = (tag, attributes, parent) => {
        const node = document.createElementNS(NS, tag);
        Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
        parent.append(node);
        return node;
    };
    root.classList.add('sidechain-demo');
    root.removeAttribute('aria-hidden');
    root.innerHTML = `
        <div class="sc-demo-heading"><span class="mono">SIGNAL STUDY / 04</span><span class="sc-demo-rate">120 BPM · 500 ms</span></div>
        <div class="sc-demo-legend"><span><i></i>Kick</span><span><i></i><span data-demo-text="bridge">过渡</span></span><span><i></i>Sine bass</span></div>
        <div class="sc-demo-chart"></div>
        <div class="sc-demo-transport">
            <div class="sc-demo-views" role="group"><button class="sc-demo-view" type="button" data-demo-view="mix" aria-pressed="true" data-demo-text="after">桥接后</button><button class="sc-demo-view" type="button" data-demo-view="dry" aria-pressed="false" data-demo-text="before">原始叠加</button></div>
            <button class="sc-demo-audio" type="button" aria-pressed="false"></button>
            <button class="sc-demo-motion" type="button" aria-pressed="false"></button>
        </div>
        <div class="sc-demo-controls">
            <label class="sc-demo-param"><span class="sc-demo-param-title">Handoff</span><output data-demo-value="handoffMs">90 ms</output><input data-demo-param="handoffMs" type="range" min="20" max="160" step="1" value="90"></label>
            <label class="sc-demo-param"><span class="sc-demo-param-title">Duration</span><output data-demo-value="durationMs">100 ms</output><input data-demo-param="durationMs" type="range" min="30" max="180" step="1" value="100"></label>
            <label class="sc-demo-param sc-demo-param-wide"><span class="sc-demo-param-title">Sine bass</span><output data-demo-value="bassHz">49 Hz</output><input data-demo-param="bassHz" type="range" min="35" max="80" step="1" value="49"></label>
        </div>
        <p class="sc-demo-note" data-demo-text="note"></p><p class="sc-demo-status" role="status" aria-live="polite"></p>`;

    const svg = svgNode('svg', { class: 'sc-demo-plot', viewBox: '0 0 640 360', role: 'img' }, root.querySelector('.sc-demo-chart'));
    const defs = svgNode('defs', {}, svg);
    const gradient = svgNode('linearGradient', { id: 'sc-signal-gradient', gradientUnits: 'userSpaceOnUse', x1: LEFT, x2: RIGHT, y1: 0, y2: 0 }, defs);
    const stops = Array.from({ length: 15 }, () => svgNode('stop', {}, gradient));
    const transition = svgNode('rect', { y: TOP, height: BOTTOM - TOP, fill: 'url(#sc-signal-gradient)', opacity: '.085' }, svg);
    svgNode('path', { d: `M${LEFT} ${CENTER}H${RIGHT}`, stroke: 'currentColor', opacity: '.22', 'stroke-width': '.8' }, svg);
    for (let time = 0; time <= 500; time += 100) {
        const x = LEFT + time / 500 * width;
        svgNode('path', { d: `M${x} ${TOP}V${BOTTOM}`, stroke: 'currentColor', opacity: '.1', 'stroke-dasharray': '2 7' }, svg);
        const text = svgNode('text', { x, y: 326, fill: 'currentColor', opacity: '.7', 'font-family': 'monospace', 'font-size': 12, 'text-anchor': time === 0 ? 'start' : time === 500 ? 'end' : 'middle' }, svg);
        text.textContent = time === 500 ? '500 ms' : String(time);
    }
    const kickPath = svgNode('path', { fill: 'none', stroke: 'var(--sc-kick)', opacity: '.2', 'stroke-width': 1 }, svg);
    const bassPath = svgNode('path', { fill: 'none', stroke: 'var(--sc-bass)', opacity: '.18', 'stroke-width': 1 }, svg);
    const mixPath = svgNode('path', { fill: 'none', stroke: 'url(#sc-signal-gradient)', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    const markers = ['handoff', 'bass'].map((name, index) => {
        const group = svgNode('g', { 'data-handle': name }, svg);
        const line = svgNode('line', { y1: TOP - 4, y2: BOTTOM, stroke: index ? 'var(--sc-bass)' : 'var(--sc-kick)', 'stroke-width': 1, 'stroke-dasharray': '4 4', opacity: '.8' }, group);
        const dot = svgNode('circle', { cy: TOP - 5, r: 4, fill: index ? 'var(--sc-bass)' : 'var(--sc-kick)' }, group);
        const hit = svgNode('rect', { y: 18, width: 32, height: 278, fill: 'transparent', 'pointer-events': 'all' }, group);
        const label = svgNode('text', { y: index ? 47 : 29, fill: 'currentColor', 'font-family': 'monospace', 'font-size': 11, 'text-anchor': 'middle', 'pointer-events': 'none' }, group);
        label.textContent = index ? 'BASS' : 'HANDOFF';
        return { group, line, dot, hit, label };
    });
    const playhead = svgNode('line', { y1: TOP, y2: BOTTOM, stroke: 'currentColor', opacity: '.25', 'stroke-width': 1, 'pointer-events': 'none' }, svg);
    const playDot = svgNode('circle', { r: 4, stroke: 'var(--paper)', 'stroke-width': 1.5, 'pointer-events': 'none' }, svg);
    const audioButton = root.querySelector('.sc-demo-audio');
    const motionButton = root.querySelector('.sc-demo-motion');
    const status = root.querySelector('.sc-demo-status');
    const inputs = [...root.querySelectorAll('[data-demo-param]')];
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = preference.matches, visible = true, pageActive = true;
    let visualTime = .5, lastTick = null, frame = 0, renderedBeat = -1, view = 'mix';
    let palette = [], paths = [], pendingUpdate = null, drag = null;
    let context = null, voice = null, wantedAudio = false, requestId = 0, suspendTimer = null;
    const voices = new Set();
    let errorKey = '';
    const words = () => document.documentElement.lang === 'en' ? {
        bridge: 'Bridge', after: 'Bridged', before: 'Before', listen: '▷ Listen', stop: '■ Stop',
        pause: 'Pause demonstration', play: 'Animate demonstration', comparison: 'Audio and waveform comparison',
        plot: 'Kick, bridge and sine bass sampled waveforms. Drag the two markers or use the sliders below.',
        handoffMs: 'Handoff time in milliseconds', durationMs: 'Transition duration in milliseconds', bassHz: 'Sine bass frequency in hertz',
        note: 'Drag the markers to shape the transition. Original synthesized kick + sine bass; a simplified browser bridge model. The mix contains one kick plus the processed bass.',
        unavailable: 'Audio playback is unavailable in this browser. The waveform controls still work.', failed: 'Playback could not start. Try Listen again.'
    } : {
        bridge: '过渡', after: '桥接后', before: '原始叠加', listen: '▷ 试听', stop: '■ 停止',
        pause: '暂停演示', play: '播放演示动画', comparison: '试听与波形对比',
        plot: 'Kick、过渡与正弦 bass 的采样波形。可拖动两条竖线，或使用下方滑杆调整。',
        handoffMs: '交接位置，单位毫秒', durationMs: '过渡时长，单位毫秒', bassHz: '正弦 bass 频率，单位赫兹',
        note: '拖动竖线，调整中间的过渡。原创合成 kick + 正弦 bass，使用简化的网页桥接模型；混合试听包含一份 kick 与处理后的 bass。',
        unavailable: '此浏览器暂不支持试听，仍可调整和查看波形。', failed: '试听未能启动，请再次点击试听。'
    };
    function updateText() {
        const text = words();
        root.querySelectorAll('[data-demo-text]').forEach(node => { node.textContent = text[node.dataset.demoText]; });
        inputs.forEach(input => input.setAttribute('aria-label', text[input.dataset.demoParam]));
        root.querySelector('.sc-demo-views').setAttribute('aria-label', text.comparison);
        svg.setAttribute('aria-label', text.plot);
        audioButton.textContent = wantedAudio ? text.stop : text.listen;
        audioButton.setAttribute('aria-pressed', String(wantedAudio));
        motionButton.textContent = paused ? '▷' : 'Ⅱ';
        motionButton.setAttribute('aria-pressed', String(paused));
        motionButton.setAttribute('aria-label', paused ? text.play : text.pause);
        status.textContent = errorKey ? text[errorKey] : '';
        root.querySelectorAll('[data-demo-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.demoView === view)));
    }
    function colors() {
        const style = getComputedStyle(root);
        palette = ['--sc-kick', '--sc-bridge', '--sc-bass'].map(name => {
            const value = style.getPropertyValue(name).trim();
            const hex = value.replace('#', '');
            return hex.length === 6 ? [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)) : [80, 120, 125];
        });
    }
    function roleColor(index) {
        const weights = [data.roles.kick[index], data.roles.bridge[index], data.roles.bass[index]];
        return `rgb(${[0, 1, 2].map(channel => Math.round(weights.reduce((sum, weight, i) => sum + weight * palette[i][channel], 0))).join(',')})`;
    }
    function updateMarkers() {
        const first = parameters.handoffMs / data.beatMs;
        const last = (parameters.handoffMs + parameters.durationMs) / data.beatMs;
        transition.setAttribute('x', LEFT + first * width);
        transition.setAttribute('width', (last - first) * width);
        [first, last].forEach((part, index) => {
            const x = LEFT + part * width, marker = markers[index];
            marker.line.setAttribute('x1', x); marker.line.setAttribute('x2', x);
            marker.dot.setAttribute('cx', x); marker.hit.setAttribute('x', x - 16);
            marker.label.setAttribute('x', Math.max(58, Math.min(RIGHT - 23, x)));
        });
        stops.forEach((stop, i) => {
            const part = i === 0 ? 0 : i === stops.length - 1 ? 1 : first + (last - first) * (i - 1) / (stops.length - 3);
            const index = data.meta.samplesPerBeat + Math.min(data.meta.samplesPerBeat - 1, Math.round(part * data.meta.samplesPerBeat));
            stop.setAttribute('offset', part);
            stop.setAttribute('stop-color', i === 0 ? `rgb(${palette[0].join(',')})` : roleColor(index));
        });
        inputs.forEach(input => {
            input.value = parameters[input.dataset.demoParam];
            const unit = input.dataset.demoParam === 'bassHz' ? ' Hz' : ' ms';
            root.querySelector(`[data-demo-value="${input.dataset.demoParam}"]`).textContent = input.value + unit;
        });
    }
    function makePath(samples, beat) {
        const start = beat * data.meta.samplesPerBeat;
        const commands = [];
        for (let i = 0; i <= 960; i++) {
            const index = start + Math.min(data.meta.samplesPerBeat - 1, Math.round(i / 960 * data.meta.samplesPerBeat));
            commands.push(`${i ? 'L' : 'M'}${(LEFT + i / 960 * width).toFixed(2)},${(CENTER - samples[index] * SCALE).toFixed(2)}`);
        }
        return commands.join('');
    }
    function cachePaths() {
        paths = Array.from({ length: 4 }, (_, beat) => ({
            kick: makePath(data.kick, beat), bass: makePath(data.bass, beat), mix: makePath(data.mix, beat), dry: makePath(data.dry, beat)
        }));
        renderedBeat = -1;
    }
    function position() {
        const time = voice && wantedAudio ? Math.max(0, context.currentTime - voice.startedAt) + voice.offset : visualTime;
        const sample = Math.floor((time % (data.length / data.sampleRate)) * data.sampleRate);
        return { sample, beat: Math.floor(sample / data.meta.samplesPerBeat), part: (sample % data.meta.samplesPerBeat) / data.meta.samplesPerBeat };
    }
    function draw() {
        const now = position();
        if (now.beat !== renderedBeat) {
            const path = paths[now.beat];
            kickPath.setAttribute('d', path.kick); bassPath.setAttribute('d', path.bass); mixPath.setAttribute('d', path[view]);
            mixPath.setAttribute('stroke', view === 'mix' ? 'url(#sc-signal-gradient)' : 'var(--muted)');
            renderedBeat = now.beat;
        }
        const x = LEFT + now.part * width;
        playhead.setAttribute('x1', x); playhead.setAttribute('x2', x);
        playDot.setAttribute('cx', x); playDot.setAttribute('cy', CENTER - data[view][now.sample] * SCALE);
        playDot.setAttribute('fill', view === 'mix' ? roleColor(now.sample) : 'var(--muted)');
    }
    const canAnimate = () => !paused && visible && pageActive && !document.hidden;
    function tick(timestamp) {
        frame = 0;
        if (!canAnimate()) return;
        if (lastTick === null) lastTick = timestamp;
        const elapsed = timestamp - lastTick;
        if (elapsed >= 1000 / 30) {
            if (!wantedAudio) visualTime += Math.min(elapsed / 1000, .1);
            lastTick = timestamp;
            draw();
        }
        frame = requestAnimationFrame(tick);
    }
    function syncAnimation() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0; lastTick = null;
        if (canAnimate()) frame = requestAnimationFrame(tick);
    }
    function fadeVoice(item, fadeAt = context.currentTime) {
        const now = context.currentTime;
        const gain = item.gain.gain;
        const level = gain.value;
        if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
        else { gain.cancelScheduledValues(now); gain.setValueAtTime(level, now); }
        if (fadeAt > now) gain.setValueAtTime(level, fadeAt);
        gain.linearRampToValueAtTime(0, fadeAt + .035);
        try { item.source.stop(fadeAt + .04); } catch { /* Already stopped. */ }
    }
    function replaceVoice() {
        const now = context.currentTime;
        const startedAt = now + .008;
        const timeline = voice ? startedAt - voice.startedAt + voice.offset : visualTime + (startedAt - now);
        const offset = (timeline % 2 + 2) % 2;
        if (voice) fadeVoice(voice, startedAt);
        const source = context.createBufferSource();
        const gain = context.createGain();
        const buffer = context.createBuffer(1, data.length, data.sampleRate);
        buffer.copyToChannel(data[view], 0);
        source.buffer = buffer; source.loop = true;
        source.connect(gain); gain.connect(context.destination);
        gain.gain.value = 0;
        gain.gain.setValueAtTime(0, startedAt);
        gain.gain.linearRampToValueAtTime(.42, startedAt + .035);
        voice = { source, gain, startedAt, offset };
        const item = voice;
        voices.add(item);
        source.onended = () => { source.disconnect(); gain.disconnect(); voices.delete(item); };
        source.start(startedAt, offset);
    }
    function stopAudio() {
        requestId++;
        wantedAudio = false;
        if (voice) visualTime = Math.max(0, context.currentTime - voice.startedAt) + voice.offset;
        for (const item of voices) fadeVoice(item);
        voice = null;
        clearTimeout(suspendTimer);
        if (context) suspendTimer = setTimeout(() => { if (!wantedAudio) context.suspend().catch(() => {}); }, 60);
        updateText();
    }
    async function startAudio() {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) { errorKey = 'unavailable'; updateText(); return; }
        const token = ++requestId;
        wantedAudio = true; errorKey = ''; updateText();
        clearTimeout(suspendTimer);
        try {
            context ||= new Audio();
            await context.resume();
            if (token !== requestId || !wantedAudio || document.hidden || !visible || !pageActive) return;
            replaceVoice();
            if (!preference.matches) paused = false;
            updateText(); syncAnimation();
        } catch { if (token === requestId) { wantedAudio = false; errorKey = 'failed'; updateText(); } }
    }
    function rebuild() {
        clearTimeout(pendingUpdate); pendingUpdate = null;
        parameters = Object.fromEntries(inputs.map(input => [input.dataset.demoParam, Number(input.value)]));
        data = DSP.create(parameters);
        cachePaths(); updateMarkers();
        if (wantedAudio && context?.state === 'running') replaceVoice();
        draw();
    }
    function queueUpdate() {
        parameters = Object.fromEntries(inputs.map(input => [input.dataset.demoParam, Number(input.value)]));
        inputs.forEach(input => { root.querySelector(`[data-demo-value="${input.dataset.demoParam}"]`).textContent = input.value + (input.dataset.demoParam === 'bassHz' ? ' Hz' : ' ms'); });
        if (pendingUpdate === null) pendingUpdate = setTimeout(rebuild, 45);
    }
    inputs.forEach(input => input.addEventListener('input', queueUpdate));
    root.querySelectorAll('[data-demo-view]').forEach(button => button.addEventListener('click', () => {
        view = button.dataset.demoView; renderedBeat = -1; updateText();
        if (wantedAudio && context?.state === 'running') replaceVoice();
        draw();
    }));
    audioButton.addEventListener('click', () => wantedAudio ? stopAudio() : startAudio());
    motionButton.addEventListener('click', () => {
        paused = !paused;
        if (paused) stopAudio();
        updateText(); syncAnimation();
    });
    svg.addEventListener('pointerdown', event => {
        const target = event.target.closest('[data-handle]');
        if (!target || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        drag = { id: event.pointerId, handle: target.dataset.handle, original: { ...parameters } };
        svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener('pointermove', event => {
        if (!drag || drag.id !== event.pointerId) return;
        const rect = svg.getBoundingClientRect();
        const milliseconds = ((event.clientX - rect.left) / rect.width * 640 - LEFT) / width * data.beatMs;
        const key = drag.handle === 'handoff' ? 'handoffMs' : 'durationMs';
        const input = inputs.find(item => item.dataset.demoParam === key);
        const value = drag.handle === 'handoff' ? milliseconds : milliseconds - parameters.handoffMs;
        input.value = Math.round(Math.max(Number(input.min), Math.min(Number(input.max), value)));
        queueUpdate();
    });
    const finishDrag = event => {
        if (!drag || (event && drag.id !== event.pointerId)) return;
        if (svg.hasPointerCapture(drag.id)) svg.releasePointerCapture(drag.id);
        drag = null;
        if (pendingUpdate !== null) rebuild();
    };
    svg.addEventListener('pointerup', finishDrag);
    svg.addEventListener('pointercancel', finishDrag);
    svg.addEventListener('lostpointercapture', finishDrag);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && drag) {
            event.preventDefault();
            inputs.forEach(input => { input.value = drag.original[input.dataset.demoParam]; });
            finishDrag(); rebuild();
        }
    });
    const suspend = () => { stopAudio(); syncAnimation(); };
    document.addEventListener('visibilitychange', () => document.hidden ? suspend() : syncAnimation());
    window.addEventListener('pagehide', () => { pageActive = false; suspend(); });
    window.addEventListener('pageshow', () => { pageActive = true; syncAnimation(); });
    preference.addEventListener('change', event => { paused = event.matches; if (paused) stopAudio(); updateText(); syncAnimation(); });
    window.addEventListener('site-theme-change', () => { colors(); updateMarkers(); draw(); });
    new MutationObserver(updateText).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (!visible) stopAudio();
        syncAnimation();
    }, { threshold: .05 }).observe(root);
    colors(); cachePaths(); updateMarkers(); updateText(); draw(); syncAnimation();
})();
