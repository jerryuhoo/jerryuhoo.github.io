/* An imagined spatial field. The curves are artwork, not audio measurements. */
(() => {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    const TAU = Math.PI * 2;
    const RINGS = 8;
    const SAMPLES = 96;
    const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    window.ProjectArtRenderers ||= {};
    window.ProjectArtRenderers.atmos = function (svg) {
        svg.setAttribute('viewBox', '0 0 440 400');
        svg.setAttribute('fill', 'none');
        svg.replaceChildren();
        const make = (name, attributes, parent = svg) => {
            const element = document.createElementNS(NS, name);
            Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
            parent.appendChild(element);
            return element;
        };

        const guides = make('g', { stroke: 'currentColor', 'stroke-width': '.75', opacity: '.14' });
        make('path', { d: 'M220 23V377M43 200H397', 'stroke-dasharray': '1 7' }, guides);
        make('circle', { cx: '220', cy: '200', r: '170', 'stroke-dasharray': '1 9' }, guides);
        make('path', { d: 'M48 192v16M392 192v16M212 30h16M212 370h16' }, guides);
        const residualGroup = make('g', {
            stroke: 'currentColor', 'stroke-width': '.65', 'stroke-linecap': 'round'
        });
        const residuals = Array.from({ length: RINGS / 2 }, () => make('path', { opacity: '0' }, residualGroup));
        const lineGroup = make('g', {
            stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
        });
        const rings = Array.from({ length: RINGS }, (_, index) => ({
            line: make('path', { 'stroke-width': index % 2 ? '.85' : '1.1', opacity: '.5' }, lineGroup),
            trail: make('path', { 'stroke-width': '1.7', opacity: '.75' }, lineGroup)
        }));
        const dots = make('g', { fill: 'currentColor' });
        rings.forEach(ring => {
            ring.halo = make('circle', { r: '7', opacity: '.06' }, dots);
            ring.dot = make('circle', { r: '2.6', opacity: '.8' }, dots);
        });
        const center = make('circle', { cx: '220', cy: '200', r: '2', fill: 'currentColor', opacity: '.45' });

        function render(state = {}) {
            const time = finite(state.time);
            const pointer = state.pointer || {};
            const strength = clamp(finite(pointer.strength), 0, 1);
            const px = clamp(finite(pointer.x), -1, 1) * strength;
            const py = clamp(finite(pointer.y), -1, 1) * strength;
            const values = [0, 1, 2].map(index => Math.max(0, finite(state.weights?.[index], index === 0 ? 1 : 0)));
            const total = values.reduce((sum, value) => sum + value, 0);
            const weights = total > 0 && Number.isFinite(total) ? values.map(value => value / total) : [1, 0, 0];
            const [orbit, field, compare] = weights;
            const rotationX = -.27 + Math.sin(time * .19) * .12 + py * .46;
            const rotationY = Math.sin(time * .13) * .3 + px * .62;
            const rotationZ = -.16 + Math.sin(time * .11) * .09 + px * .1;
            const cx = Math.cos(rotationX), sx = Math.sin(rotationX);
            const cy = Math.cos(rotationY), sy = Math.sin(rotationY);
            const cz = Math.cos(rotationZ), sz = Math.sin(rotationZ);

            function project(point) {
                const [x, y, z] = point;
                const y1 = y * cx - z * sx;
                const z1 = y * sx + z * cx;
                const x2 = x * cy + z1 * sy;
                const z2 = -x * sy + z1 * cy;
                const x3 = x2 * cz - y1 * sz;
                const y3 = x2 * sz + y1 * cz;
                const perspective = 610 / (610 - z2);
                return [220 + x3 * perspective, 200 + y3 * perspective, z2];
            }

            // Corresponding points in all three forms give each mode a smooth morph.
            function point(index, u) {
                const angle = u * TAU;
                const ringPhase = index * Math.PI / RINGS;
                const radius = 130 + 8 * Math.sin(time * .43 + index * .72);
                const plane = ringPhase + time * (.065 + (index % 2 ? .019 : -.011));
                const planeTilt = .38 * Math.sin(index * .9 + time * .23);
                const ox = Math.cos(angle) * radius;
                const oy = Math.sin(angle) * radius;
                const orbitPoint = [
                    ox * Math.cos(plane),
                    oy * Math.cos(planeTilt) - ox * Math.sin(plane) * Math.sin(planeTilt),
                    oy * Math.sin(planeTilt) + ox * Math.sin(plane) * Math.cos(planeTilt)
                ];

                const latitude = (index / (RINGS - 1) - .5) * 2.35;
                const longitude = angle + time * .16;
                const ripple = Math.sin(angle * 3 + time * .82 + index * .5);
                const latitudeWave = latitude + .065 * Math.sin(angle * 2 - time * .55 + index * .65);
                const fieldRadius = 138 + ripple * (6 + strength * 4);
                const horizontalRadius = fieldRadius * Math.cos(latitudeWave);
                const fieldPoint = [
                    Math.cos(longitude) * horizontalRadius,
                    Math.sin(latitudeWave) * fieldRadius,
                    Math.sin(longitude) * horizontalRadius
                ];

                const pair = Math.floor(index / 2);
                const side = index % 2 ? 1 : -1;
                const wave = angle * 1.65 - time * .74 + pair * .44;
                const difference = Math.sin(angle * 3.2 + time * .48 + pair) * Math.sin(Math.PI * u);
                const comparePoint = [
                    (u - .5) * 296,
                    (pair - 1.5) * 39 + Math.sin(wave) * 15 + side * (5 + difference * 9),
                    Math.cos(angle * 1.2 - time * .3 + pair * .8) * 15 + side * 5
                ];
                const mixed = [0, 1, 2].map(axis => orbitPoint[axis] * orbit + fieldPoint[axis] * field + comparePoint[axis] * compare);
                // Nearby paths separate a little under the pointer, like an elastic field.
                const focusX = px * 120;
                const focusY = py * 110;
                const dx = mixed[0] - focusX;
                const dy = mixed[1] - focusY;
                const focus = Math.exp(-(dx * dx + dy * dy) / 11000) * strength;
                mixed[0] += dx * focus * .18;
                mixed[1] += dy * focus * .18;
                mixed[2] += focus * (12 + Math.sin(time * .9 + index) * 7);
                return project(mixed);
            }

            const command = (p, first) => `${first ? 'M' : 'L'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
            rings.forEach((ring, index) => {
                let path = '';
                let depth = 0;
                for (let step = 0; step <= SAMPLES; step++) {
                    const p = point(index, step / SAMPLES);
                    path += command(p, step === 0);
                    depth += p[2];
                }
                ring.line.setAttribute('d', path);
                const opacity = clamp(.46 + depth / ((SAMPLES + 1) * 660) + (index % 2 ? -.08 : .09), .2, .76);
                ring.line.setAttribute('opacity', opacity.toFixed(3));

                const phase = ((time * (.045 + index * .0025) + index * .137) % 1 + 1) % 1;
                const location = point(index, phase);
                const edgeFade = (1 - compare) + compare * clamp(Math.sin(Math.PI * phase) * 5, 0, 1);
                const size = 2.1 + (location[2] + 155) / 230;
                let trail = '';
                // A wrap starts a new segment so the open comparison paths never jump across.
                let previousU = -1;
                for (let step = 0; step <= 12; step++) {
                    const u = ((phase - .066 + step * .0055) % 1 + 1) % 1;
                    trail += command(point(index, u), step === 0 || u < previousU);
                    previousU = u;
                }
                ring.trail.setAttribute('d', trail);
                ring.trail.setAttribute('opacity', (.57 * edgeFade).toFixed(3));
                for (const node of [ring.dot, ring.halo]) {
                    node.setAttribute('cx', location[0].toFixed(2));
                    node.setAttribute('cy', location[1].toFixed(2));
                }
                ring.dot.setAttribute('r', size.toFixed(2));
                ring.dot.setAttribute('opacity', (.82 * edgeFade).toFixed(3));
                ring.halo.setAttribute('r', (size * 3.2).toFixed(2));
                ring.halo.setAttribute('opacity', (.07 * edgeFade).toFixed(3));
            });

            residuals.forEach((path, pair) => {
                let d = '';
                for (let step = 1; step < 15; step++) {
                    const u = step / 15;
                    d += command(point(pair * 2, u), true) + command(point(pair * 2 + 1, u), false);
                }
                path.setAttribute('d', d);
                path.setAttribute('opacity', (.32 * compare).toFixed(3));
            });
            center.setAttribute('opacity', ((1 - compare) * (.3 + Math.sin(time * .85) * .08)).toFixed(3));
            center.setAttribute('r', (2.1 + Math.sin(time * .72) * .45).toFixed(2));
        }
        render();
        return { render };
    };
})();
