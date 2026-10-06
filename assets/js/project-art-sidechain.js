/* A conceptual handoff study, not a measured or simulated plugin output. */
(() => {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    window.ProjectArtRenderers ||= {};
    window.ProjectArtRenderers.sidechain = svg => {
        svg.setAttribute('viewBox', '0 0 440 400');
        svg.replaceChildren();
        const make = (tag, attrs) => {
            const el = document.createElementNS(NS, tag);
            Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
            svg.append(el);
            return el;
        };
        make('path', { d: 'M28 200H412M145 60V340M295 60V340', fill: 'none', stroke: 'currentColor', 'stroke-dasharray': '1 7', opacity: '.18' });
        const band = make('rect', { x: '145', y: '65', width: '150', height: '270', fill: 'currentColor', opacity: '.035' });
        const paths = Array.from({ length: 5 }, (_, i) => make('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': i === 2 ? '1.7' : '.8', opacity: i === 2 ? '.85' : '.2' }));
        const dot = make('circle', { r: '3.5', fill: 'currentColor' });
        const label = make('text', { x: '30', y: '377', fill: 'currentColor', 'font-family': 'monospace', 'font-size': '8', 'letter-spacing': '1.5', opacity: '.7' });
        label.textContent = 'KICK / BRIDGE / BASS';
        const smooth = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
        function render(state = {}) {
            const time = Number.isFinite(state.time) ? state.time : 0;
            const px = Math.max(-1, Math.min(1, state.pointer?.x || 0)) * (state.pointer?.strength || 0);
            const py = Math.max(-1, Math.min(1, state.pointer?.y || 0)) * (state.pointer?.strength || 0);
            const weights = state.weights || [1, 0, 0];
            const start = .28 + px * .045, end = .69 + px * .035;
            band.setAttribute('x', String(30 + 380 * start));
            band.setAttribute('width', String(380 * (end - start)));
            const point = (u, layer) => {
                const blend = smooth((u - start) / (end - start));
                const phase = u * 6.8 * Math.PI * 2 + blend * (-3.4 + py * 2.2) - time * .65;
                const amplitude = (64 * Math.exp(-u * 1.1) * (1 - blend) + 42 * blend) * (1 + py * .2);
                const offset = (layer - 2) * (12 + (weights[1] || 0) * 9);
                const flow = (weights[2] || 0) * Math.sin(u * 7 - time * .4) * 14;
                return [30 + u * 380, 200 + offset + Math.sin(phase + (layer - 2) * .12) * amplitude + flow];
            };
            paths.forEach((path, layer) => {
                let d = '';
                for (let i = 0; i <= 220; ++i) {
                    const p = point(i / 220, layer);
                    d += `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
                }
                path.setAttribute('d', d);
            });
            const p = point((time * .05 + .5) % 1, 2);
            dot.setAttribute('cx', p[0].toFixed(2)); dot.setAttribute('cy', p[1].toFixed(2));
        }
        render();
        return { render };
    };
})();
