/* PluginHub: an ordered collection, a constellation, and a flowing signal chain. */
(() => {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    const TAU = Math.PI * 2;
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const number = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
    const fixed = value => number(value).toFixed(3);

    window.ProjectArtRenderers ||= {};
    window.ProjectArtRenderers.hub = function createHubArt(svg) {
        svg.replaceChildren();
        svg.setAttribute('viewBox', '0 0 440 400');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('aria-hidden', 'true');

        function node(tag, attributes, parent = svg) {
            const element = document.createElementNS(NS, tag);
            Object.entries(attributes || {}).forEach(([name, value]) => element.setAttribute(name, String(value)));
            parent.appendChild(element);
            return element;
        }

        const guides = node('g', { stroke: 'currentColor', 'stroke-width': '.7', opacity: '.16' });
        for (let i = 0; i < 5; i += 1) {
            const offset = 68 + i * 76;
            node('path', { d: `M${offset} 36V364M30 ${48 + i * 76}H410`, 'stroke-dasharray': '1 7' }, guides);
        }
        const planes = [0, 1].map(index => node('rect', {
            x: 64 + index * 14, y: 63 + index * 13, width: 300, height: 270,
            rx: 2, stroke: 'currentColor', 'stroke-width': '.8', opacity: '.12'
        }));
        const orbit = node('g', { stroke: 'currentColor', 'stroke-width': '.8', opacity: '.1' });
        node('ellipse', { cx: 220, cy: 200, rx: 159, ry: 141, 'stroke-dasharray': '1 7' }, orbit);
        node('ellipse', { cx: 220, cy: 200, rx: 159, ry: 141, transform: 'rotate(28 220 200)' }, orbit);

        const linkLayer = node('g', { stroke: 'currentColor', 'stroke-width': '.85', fill: 'none' });
        const pairs = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 3], [1, 4], [2, 5]];
        const links = pairs.map(() => ({
            line: node('path', { opacity: '.2' }, linkLayer),
            signal: node('circle', { r: 2.2, fill: 'currentColor', stroke: 'none' }, linkLayer)
        }));

        const cards = [];
        for (let index = 0; index < 6; index += 1) {
            const group = node('g', { stroke: 'currentColor', 'stroke-width': '1.15' });
            const shadow = node('rect', { x: -33, y: -38, width: 76, height: 86, rx: 3, fill: 'currentColor', opacity: '.055', stroke: 'none' }, group);
            node('rect', { x: -38, y: -43, width: 76, height: 86, rx: 3, fill: 'var(--paper, #f3f2ee)' }, group);
            node('path', { d: 'M-38-23H38', opacity: '.55' }, group);
            node('circle', { cx: -26, cy: -33, r: 1.9, fill: 'currentColor', stroke: 'none' }, group);
            node('path', { d: 'M-17-33H4', opacity: '.35' }, group);
            node('path', { d: 'M-22 32H22', opacity: '.24' }, group);
            const icon = node('g', {}, group);
            const animated = [];
            if (index === 0) {
                node('circle', { cx: 0, cy: 4, r: 18, opacity: '.3' }, icon);
                node('path', { d: 'M-12.73 16.73A18 18 0 1 1 12.73 16.73', 'stroke-width': '2' }, icon);
                animated.push(node('path', { d: 'M0 4V-9', 'stroke-width': '1.8' }, icon));
                node('circle', { cx: 0, cy: 4, r: 2, fill: 'currentColor', stroke: 'none' }, icon);
            } else if (index === 1) {
                animated.push(node('path', { d: '', 'stroke-width': '1.5' }, icon));
                node('path', { d: 'M-24 4H24', opacity: '.2' }, icon);
            } else if (index === 2) {
                [-16, 0, 16].forEach(x => {
                    node('path', { d: `M${x}-14V22`, opacity: '.3' }, icon);
                    animated.push(node('rect', { x: x - 4, y: 0, width: 8, height: 5, rx: '.8', fill: 'var(--paper, #f3f2ee)' }, icon));
                });
            } else if (index === 3) {
                for (let i = 0; i < 7; i += 1) {
                    animated.push(node('path', { d: '', 'stroke-width': '2.5', 'stroke-linecap': 'round' }, icon));
                }
            } else if (index === 4) {
                node('circle', { cx: 0, cy: 4, r: 19, opacity: '.25' }, icon);
                node('circle', { cx: 0, cy: 4, r: 11, opacity: '.6' }, icon);
                animated.push(node('circle', { cx: 0, cy: -15, r: 3, fill: 'currentColor', stroke: 'none' }, icon));
                node('circle', { cx: 0, cy: 4, r: 2, fill: 'currentColor', stroke: 'none' }, icon);
            } else {
                node('path', { d: 'M-19-12H19V20H-19Z', opacity: '.3', 'stroke-dasharray': '2 3' }, icon);
                animated.push(node('path', { d: 'M-13 4H13M0-9V17', 'stroke-width': '1.6' }, icon));
            }
            cards.push({ group, shadow, animated });
        }

        const registration = node('g', { stroke: 'currentColor', 'stroke-width': '.8', opacity: '.48' });
        node('path', { d: 'M20 27H34M27 20V34M406 373H420M413 366V380' }, registration);
        node('path', { d: 'M180 380H199M207 380H233M241 380H260', opacity: '.45' }, registration);

        function render(state = {}) {
            const time = number(state.time) % 100000;
            const input = Array.isArray(state.weights) ? state.weights : [1, 0, 0];
            let weights = [0, 1, 2].map(i => clamp(number(input[i]), 0, 1));
            const sum = weights.reduce((a, b) => a + b, 0);
            weights = sum > 0 ? weights.map(weight => weight / sum) : [1, 0, 0];
            const [arrange, connect, flow] = weights;
            const pointer = state.pointer || {};
            const strength = clamp(number(pointer.strength), 0, 1);
            const px = clamp(number(pointer.x), -1, 1);
            const py = clamp(number(pointer.y), -1, 1);
            const pointerX = 220 + px * 170;
            const pointerY = 200 + py * 150;

            planes.forEach((plane, i) => {
                const angle = Math.sin(time * .2 + i) * 2.5 + px * strength * 2;
                plane.setAttribute('transform', `rotate(${fixed(angle)} 220 200)`);
                plane.setAttribute('opacity', fixed(.05 + arrange * .12 + flow * .02));
            });
            orbit.setAttribute('opacity', fixed(.045 + connect * .2));
            orbit.setAttribute('transform', `rotate(${fixed(Math.sin(time * .13) * 16 + px * strength * 3)} 220 200)`);

            const positions = cards.map((card, i) => {
                const phase = time * .46 + i * 1.12;
                const gridX = 108 + (i % 3) * 112 + Math.cos(phase) * 6;
                const gridY = 126 + Math.floor(i / 3) * 148 + Math.sin(phase) * 5;
                const angle = -Math.PI / 2 + i * TAU / 6 + time * .07;
                const radius = 133 + Math.sin(time * .39 + i * .8) * 5;
                const radialX = 220 + Math.cos(angle) * radius;
                const radialY = 200 + Math.sin(angle) * radius;
                const streamPhase = i * .88 - time * .43;
                const streamX = 64 + i * 62 + Math.sin(time * .23 + i) * 3;
                const streamY = 200 + Math.sin(streamPhase) * 100;
                let x = gridX * arrange + radialX * connect + streamX * flow;
                let y = gridY * arrange + radialY * connect + streamY * flow;
                const dx = x - pointerX;
                const dy = y - pointerY;
                const distance = Math.hypot(dx, dy);
                const influence = strength * Math.pow(Math.max(0, 1 - distance / 205), 2);
                const divisor = Math.max(distance, 24);
                x += dx / divisor * influence * 25 + px * strength * 5;
                y += dy / divisor * influence * 25 + py * strength * 5;
                x = clamp(x, 47, 393);
                y = clamp(y, 53, 347);
                const rotation = Math.sin(phase) * 1.6 * arrange
                    + Math.sin(angle + .5) * 8 * connect
                    + Math.cos(streamPhase) * 12 * flow
                    + dx / divisor * influence * 7;
                const scale = 1 + influence * .035 - connect * .04 - flow * .09;
                card.group.setAttribute('transform', `translate(${fixed(x)} ${fixed(y)}) rotate(${fixed(rotation)}) scale(${fixed(scale)})`);
                card.shadow.setAttribute('opacity', fixed(.045 + influence * .06));

                if (i === 0) {
                    card.animated[0].setAttribute('transform', `rotate(${fixed(Math.sin(time * .7) * 105 + influence * 35)} 0 4)`);
                } else if (i === 1) {
                    let d = '';
                    for (let point = 0; point <= 24; point += 1) {
                        const waveX = -24 + point * 2;
                        const waveY = 4 + Math.sin(point * .38 - time * 1.2) * (10 + influence * 5);
                        d += `${point ? 'L' : 'M'}${waveX} ${fixed(waveY)}`;
                    }
                    card.animated[0].setAttribute('d', d);
                } else if (i === 2) {
                    card.animated.forEach((slider, j) => slider.setAttribute('y', fixed(1.5 + Math.sin(time * .7 + j * 2) * 12)));
                } else if (i === 3) {
                    card.animated.forEach((bar, j) => {
                        const height = 5 + (Math.sin(time * .94 + j * .75) + 1) * 6;
                        const x = -21 + j * 7;
                        bar.setAttribute('d', `M${x} ${fixed(4 - height)}V${fixed(4 + height)}`);
                    });
                } else if (i === 4) {
                    card.animated[0].setAttribute('transform', `rotate(${fixed((time * 31) % 360)} 0 4)`);
                } else {
                    card.animated[0].setAttribute('transform', `rotate(${fixed(Math.sin(time * .35) * 45)} 0 4)`);
                }
                return { x, y };
            });

            links.forEach(({ line, signal }, index) => {
                const [from, to] = pairs[index];
                const a = positions[from];
                const b = positions[to];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const bend = (index % 2 ? -1 : 1) * (.08 + flow * .18);
                const control = { x: (a.x + b.x) / 2 - dy * bend, y: (a.y + b.y) / 2 + dx * bend };
                line.setAttribute('d', `M${fixed(a.x)} ${fixed(a.y)}Q${fixed(control.x)} ${fixed(control.y)} ${fixed(b.x)} ${fixed(b.y)}`);
                const chain = index < 5 ? 1 : .12;
                const opacity = .035 * arrange + .25 * connect + .23 * flow * chain;
                line.setAttribute('opacity', fixed(opacity));
                const fraction = ((time * .14 + index * .163) % 1 + 1) % 1;
                const inverse = 1 - fraction;
                const x = inverse * inverse * a.x + 2 * inverse * fraction * control.x + fraction * fraction * b.x;
                const y = inverse * inverse * a.y + 2 * inverse * fraction * control.y + fraction * fraction * b.y;
                signal.setAttribute('cx', fixed(x));
                signal.setAttribute('cy', fixed(y));
                signal.setAttribute('opacity', fixed((.12 * arrange + .8 * connect + .7 * flow * chain) * Math.sin(fraction * Math.PI)));
            });
        }

        render();
        return { render };
    };
})();
