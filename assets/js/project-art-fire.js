/* Six signal studies, expressed as one continuously morphing SVG mesh. */
(() => {
    'use strict';

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const TAU = Math.PI * 2;
    const LINE_COUNT = 12;
    const SAMPLE_COUNT = 96;
    const GRAINS_PER_LINE = 4;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    window.ProjectArtRenderers = window.ProjectArtRenderers || {};
    window.ProjectArtRenderers.fire = function (svg) {
        const document = svg.ownerDocument;
        const paths = [];
        const grains = [];
        const weights = new Float64Array(6);
        const commands = new Array(SAMPLE_COUNT);
        svg.setAttribute('viewBox', '0 0 420 360');
        while (svg.firstChild) svg.removeChild(svg.firstChild);

        function create(tag, attributes) {
            const node = document.createElementNS(SVG_NS, tag);
            for (const name in attributes) node.setAttribute(name, attributes[name]);
            svg.appendChild(node);
            return node;
        }

        for (let line = 0; line < LINE_COUNT; line++) {
            paths.push(create('path', {
                fill: 'none', stroke: 'currentColor', 'stroke-width': '0.95',
                'stroke-linecap': 'round', 'stroke-linejoin': 'round',
                'vector-effect': 'non-scaling-stroke'
            }));
        }
        for (let index = 0; index < LINE_COUNT * GRAINS_PER_LINE; index++) {
            grains.push(create('circle', { fill: 'currentColor', r: '1.4', opacity: '0' }));
        }

        // A stable coordinate buffer is shared by the fragmented ribbons and grains.
        const packet = new Float64Array(2);
        function packetPoint(line, position, time) {
            const angle = position * TAU;
            packet[0] = 82 + (line % 4) * 83 + (position - 0.5) * 54
                + Math.sin(time * 0.36 + line * 1.7) * 13;
            packet[1] = 92 + Math.floor(line / 4) * 82
                + Math.sin(angle * 1.1 + line * 0.72 + time * 0.55) * 13
                + (position - 0.5) * 27 + Math.cos(time * 0.27 + line) * 7;
        }

        function render(state) {
            const time = Number.isFinite(state.time) ? state.time : 0;
            const inputPointer = state.pointer || {};
            const pointerX = clamp(Number(inputPointer.x) || 0, -1, 1);
            const pointerY = clamp(Number(inputPointer.y) || 0, -1, 1);
            const strength = clamp(Number(inputPointer.strength) || 0, 0, 1);
            const focusX = 210 + pointerX * 165;
            const focusY = 180 + pointerY * 130;
            let total = 0;
            for (let effect = 0; effect < 6; effect++) {
                const value = state.weights && state.weights[effect];
                weights[effect] = Number.isFinite(value) ? Math.max(0, value) : 0;
                total += weights[effect];
            }
            if (!total) { weights[0] = 1; total = 1; }
            for (let effect = 0; effect < 6; effect++) weights[effect] /= total;

            const phase = time * 0.46 + pointerX * strength * 0.85;
            const granular = weights[5];
            for (let line = 0; line < LINE_COUNT; line++) {
                const layer = line / (LINE_COUNT - 1);
                const lane = layer * 2 - 1;
                for (let sample = 0; sample < SAMPLE_COUNT; sample++) {
                    const position = sample / (SAMPLE_COUNT - 1);
                    const angle = position * TAU;

                    // Distortion: a tightly folded ribbon with a saturated transfer shape.
                    const driven = angle * 2.45 + phase + lane * 0.18;
                    const distortionX = 45 + position * 330 + Math.sin(driven * 2) * 3;
                    const distortionY = 180 + Math.tanh(Math.sin(driven) * (2.6 + 0.5 * Math.sin(phase))) * 50
                        + Math.sin(driven * 3 + lane) * 6 + lane * 24;

                    // Phaser: moving notches travel around nested interference contours.
                    const sweep = angle + phase * 0.24 + lane * 0.07;
                    const notch = Math.pow((Math.cos(angle * 3 - phase) + 1) * 0.5, 5);
                    const phaserRadius = 86 + layer * 48 - notch * (23 + layer * 8);
                    const phaserX = 210 + Math.cos(sweep) * phaserRadius * 1.10;
                    const phaserY = 180 + Math.sin(sweep) * phaserRadius * 0.88
                        + Math.sin(angle * 2 + phase) * 7;

                    // Chorus: neighboring voices drift into and out of phase, forming a braid.
                    const chorusVoice = angle * (1.45 + lane * 0.085) + phase * (0.75 + layer * 0.15);
                    const chorusX = 45 + position * 330 + Math.sin(angle * 2 + phase + lane) * 5;
                    const chorusY = 180 + Math.sin(chorusVoice + lane * 0.9) * 47
                        + Math.sin(angle * 0.75 - phase * 0.7) * 17 + lane * 33;

                    // Reverb: echo rings recede through space, with progressively shorter tails.
                    const echoAngle = angle + phase * 0.18;
                    const echoPulse = 1 + Math.sin(phase * 0.8 - layer * 2) * 0.045;
                    const reverbX = 109 + layer * 193 + Math.cos(echoAngle) * (62 - layer * 26)
                        + Math.sin(echoAngle) * 15;
                    const reverbY = 180 + Math.sin(echoAngle) * (112 - layer * 69) * echoPulse
                        + Math.sin(layer * 4 - phase * 0.5) * 8;

                    // Lo-fi: duplicated endpoints form true sample-and-hold steps.
                    const step = Math.floor(sample / 4);
                    const stepEdge = sample % 4 >= 2 ? 1 : 0;
                    const heldSignal = Math.sin(step / 24 * TAU * 1.65 + phase * 0.7 + lane * 0.10);
                    const lofiX = 45 + (step + stepEdge) / 24 * 330 + Math.sin(phase * 0.4) * 3;
                    const lofiY = 180 + Math.round(heldSignal * 4) / 4 * 61 + lane * 25 + Math.cos(phase * 0.3) * 3;

                    // Granular: the signal separates into twelve drifting packets.
                    packetPoint(line, position, time);
                    let x = distortionX * weights[0] + phaserX * weights[1] + chorusX * weights[2]
                        + reverbX * weights[3] + lofiX * weights[4] + packet[0] * granular;
                    let y = distortionY * weights[0] + phaserY * weights[1] + chorusY * weights[2]
                        + reverbY * weights[3] + lofiY * weights[4] + packet[1] * granular;

                    // The pointer bends nearby strands without moving the whole composition.
                    const dx = x - focusX, dy = y - focusY;
                    const influence = Math.exp(-(dx * dx + dy * dy) / 11500) * strength;
                    x += (dx * 0.20 + pointerX * 9) * influence;
                    y += (dy * 0.22 + pointerY * 13 + Math.sin(angle * 2 + phase) * 9) * influence;
                    commands[sample] = `${sample ? 'L' : 'M'}${clamp(x, 23, 397).toFixed(2)},${clamp(y, 24, 336).toFixed(2)}`;
                }
                const path = paths[line];
                path.setAttribute('d', commands.join(''));
                const depth = 0.32 + (1 - Math.abs(lane)) * 0.43;
                const echoFade = 1 - weights[3] * layer * 0.66;
                path.setAttribute('opacity', (depth * echoFade * (1 - granular * 0.14)).toFixed(3));
                path.setAttribute('stroke-dasharray', granular > 0.001 ? `${13 - granular * 8} ${granular * 10}` : 'none');
                path.setAttribute('stroke-dashoffset', (-time * 7 * granular).toFixed(2));
            }

            for (let index = 0; index < grains.length; index++) {
                const line = Math.floor(index / GRAINS_PER_LINE);
                const seed = index % GRAINS_PER_LINE;
                const position = (seed / GRAINS_PER_LINE + time * (0.035 + line * 0.001)) % 1;
                packetPoint(line, position, time);
                const dx = packet[0] - focusX, dy = packet[1] - focusY;
                const distance = Math.hypot(dx, dy) || 1;
                const influence = Math.exp(-(distance * distance) / 10000) * strength;
                const breath = 0.6 + Math.sin(time * 0.8 + index * 1.7) * 0.4;
                const grain = grains[index];
                grain.setAttribute('cx', clamp(packet[0] + dx / distance * influence * 24, 23, 397).toFixed(2));
                grain.setAttribute('cy', clamp(packet[1] + dy / distance * influence * 24, 24, 336).toFixed(2));
                grain.setAttribute('r', (1.1 + breath * 1.2).toFixed(2));
                grain.setAttribute('opacity', (granular * (0.45 + breath * 0.45)).toFixed(3));
            }
        }

        return { render };
    };
})();
