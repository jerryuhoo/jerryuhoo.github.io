/* Original synthetic audio for the Sidechain Pro browser demonstration.
 *
 * This is a simplified, offline, mono model, not the production plugin DSP.
 * The source pitches and kick onsets are known analytically: there is no pitch
 * detector, Learn optimizer, host routing, or Spectral Duck implementation here.
 * Phase interpolation and boundary blending follow the quintic-Hermite approach
 * in Sidechain/Source/PhaseBridge.h. The graph and playback must use these same
 * samples. No recording, third-party sample, or independently normalized stem is
 * used. A player should ramp its output gain on start/stop; the buffers loop as-is.
 */
(() => {
    'use strict';
    const TAU = 2 * Math.PI;
    const BEAT_MS = 500;
    const BEATS = 4;
    const ATTACK_SECONDS = .002;
    const COMMON_GAIN = .64;
    const KICK_AMPLITUDE = .78;
    const BASS_AMPLITUDE = .34;
    const BASS_PHASE = Math.PI * .37;
    const KICK_START_HZ = 140;
    const KICK_END_HZ = 52;
    const KICK_PITCH_DECAY = .023;
    const KICK_AMPLITUDE_DECAY = .080;
    const defaults = Object.freeze({ handoffMs: 90, durationMs: 100, bassHz: 49, sampleRate: 24000 });
    const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
    const finite = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    const smooth = value => {
        const x = clamp(value, 0, 1);
        return x * x * x * (10 + x * (-15 + 6 * x));
    };
    const evaluate = (c, u) => c[0] + u * (c[1] + u * (c[2] + u * (c[3] + u * (c[4] + u * c[5]))));
    const derivative = (c, u) => c[1] + u * (2 * c[2] + u * (3 * c[3] + u * (4 * c[4] + u * 5 * c[5])));

    // Endpoint derivatives are with respect to normalized time u, not seconds.
    function hermite(p0, v0, a0, p1, v1, a1) {
        const c2 = a0 * .5;
        const d = p1 - p0 - v0 - c2;
        const e = v1 - v0 - 2 * c2;
        const f = a1 - 2 * c2;
        return [p0, v0, c2, 10 * d - 4 * e + .5 * f, -15 * d + 7 * e - f, 6 * d - 3 * e + .5 * f];
    }
    const principalAngle = angle => ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
    const kickFrequency = t => KICK_END_HZ + (KICK_START_HZ - KICK_END_HZ) * Math.exp(-t / KICK_PITCH_DECAY);
    const kickAcceleration = t => -TAU * (KICK_START_HZ - KICK_END_HZ) / KICK_PITCH_DECAY * Math.exp(-t / KICK_PITCH_DECAY);
    const kickPhase = t => TAU * (KICK_END_HZ * t + (KICK_START_HZ - KICK_END_HZ) * KICK_PITCH_DECAY * (1 - Math.exp(-t / KICK_PITCH_DECAY)));
    const kickEnvelope = t => KICK_AMPLITUDE * smooth(t / .001) * Math.exp(-t / KICK_AMPLITUDE_DECAY) * (1 - smooth((t - .44) / .06));
    function kickAt(t) {
        const body = kickEnvelope(t) * Math.sin(kickPhase(t));
        // A tiny deterministic high-frequency onset, synthesized from three sines.
        const transient = .022 * smooth(t / .0004) * Math.exp(-t / .0015)
            * (Math.sin(TAU * 1717 * t) + .5 * Math.sin(TAU * 3893 * t) + .25 * Math.sin(TAU * 6557 * t)) / 1.75;
        return body + transient;
    }

    // One private source cache only. Time-slider edits reuse the original audio;
    // changing pitch replaces this entry, and a sample-rate change replaces all
    // of it. Returned buffers are copies, so a player cannot mutate the cache.
    let sourceCache = null;
    function sourcesAt(sampleRate, bassHz) {
        if (sourceCache && sourceCache.sampleRate === sampleRate && sourceCache.bassHz === bassHz) return sourceCache;
        const beatLength = sampleRate / 2;
        const length = beatLength * BEATS;
        let kick = sourceCache?.sampleRate === sampleRate ? sourceCache.kick : null;
        if (!kick) {
            kick = new Float32Array(length);
            for (let n = 0; n < beatLength; n++) kick[n] = kickAt(n / sampleRate) * COMMON_GAIN;
            const oneBeat = kick.subarray(0, beatLength);
            for (let beat = 1; beat < BEATS; beat++) kick.set(oneBeat, beat * beatLength);
        }
        const rawBass = new Float64Array(length);
        const bass = new Float32Array(length);
        const dry = new Float32Array(length);
        for (let n = 0; n < length; n++) {
            rawBass[n] = BASS_AMPLITUDE * Math.sin(BASS_PHASE + TAU * bassHz * n / sampleRate);
            bass[n] = rawBass[n] * COMMON_GAIN;
            dry[n] = kick[n] + bass[n];
        }
        sourceCache = { sampleRate, bassHz, kick, rawBass, bass, dry };
        return sourceCache;
    }

    function create(options = {}) {
        if (!options || typeof options !== 'object') options = {};
        const handoff = Math.round(clamp(finite(options.handoffMs, defaults.handoffMs), 20, 160));
        const duration = Math.round(clamp(finite(options.durationMs, defaults.durationMs), 30, 180));
        // Integer hertz gives an integral number of bass cycles in the 2-second loop.
        const bassHz = Math.round(clamp(finite(options.bassHz, defaults.bassHz), 35, 80));
        // Even sample rates make every half-second beat an exact sample boundary.
        const sampleRate = Math.round(clamp(finite(options.sampleRate, defaults.sampleRate), 16000, 96000) / 2) * 2;
        const samplesPerBeat = sampleRate / 2;
        const length = samplesPerBeat * BEATS;
        const handoffSamples = Math.round(handoff * sampleRate / 1000);
        const transitionSamples = Math.round(duration * sampleRate / 1000);
        const handoffSeconds = handoffSamples / sampleRate;
        const transitionSeconds = transitionSamples / sampleRate;
        const endSamples = handoffSamples + transitionSamples;
        const attackSamples = Math.max(1, Math.round(ATTACK_SECONDS * sampleRate));
        const edge = clamp(.004 / transitionSeconds, .05, .25);
        const sources = sourcesAt(sampleRate, bassHz);
        const kick = new Float32Array(sources.kick);
        const bass = new Float32Array(sources.bass);
        const dry = new Float32Array(sources.dry);
        // The post-transition region is already exact original bass.
        const processed = new Float32Array(sources.bass);
        const mix = new Float32Array(length);
        // Color weights describe transition stages, not measured source energies.
        const roles = { kick: new Float32Array(length), bridge: new Float32Array(length), bass: new Float32Array(length) };

        const bridges = Array.from({ length: BEATS }, (_, beat) => {
            const startPhase = kickPhase(handoffSeconds);
            const startHz = kickFrequency(handoffSeconds);
            const startAcceleration = kickAcceleration(handoffSeconds);
            const endTime = (beat * samplesPerBeat + endSamples) / sampleRate;
            const bassEndPhase = BASS_PHASE + TAU * bassHz * endTime;
            const expectedPhase = startPhase + .5 * TAU * (startHz + bassHz) * transitionSeconds;
            const endPhase = expectedPhase + principalAngle(bassEndPhase - expectedPhase);
            // This synthetic chirp has a known frequency slope, so match it too.
            const phaseCoefficients = hermite(startPhase, TAU * startHz * transitionSeconds,
                startAcceleration * transitionSeconds * transitionSeconds,
                endPhase, TAU * bassHz * transitionSeconds, 0);
            let minHz = Infinity, maxHz = -Infinity;
            for (let step = 0; step <= 256; step++) {
                const frequency = derivative(phaseCoefficients, step / 256) / (transitionSeconds * TAU);
                minHz = Math.min(minHz, frequency);
                maxHz = Math.max(maxHz, frequency);
            }
            const active = minHz >= .5 * Math.min(startHz, bassHz) && maxHz <= 2 * Math.max(startHz, bassHz);
            return {
                active, phaseCoefficients, startPhase, endPhase, startHz, endHz: bassHz,
                startAcceleration, endAcceleration: 0,
                startAmplitude: kickEnvelope(handoffSeconds), endAmplitude: BASS_AMPLITUDE,
                minHz, maxHz, startSample: beat * samplesPerBeat + handoffSamples,
                endSample: beat * samplesPerBeat + endSamples
            };
        });

        // Every beat uses the same envelope and color weights, with a separate
        // phase trajectory to meet the continuously running bass at its endpoint.
        const blends = new Float64Array(transitionSamples);
        const bridgeWeights = new Float64Array(transitionSamples);
        const amplitudes = new Float64Array(transitionSamples);
        const transitionRoles = {
            kick: new Float32Array(transitionSamples),
            bridge: new Float32Array(transitionSamples),
            bass: new Float32Array(transitionSamples)
        };
        for (let offset = 0; offset < transitionSamples; offset++) {
            const u = offset / transitionSamples;
            const blend = smooth(u);
            blends[offset] = blend;
            bridgeWeights[offset] = smooth(u / edge) * smooth((1 - u) / edge);
            amplitudes[offset] = bridges[0].startAmplitude + (BASS_AMPLITUDE - bridges[0].startAmplitude) * blend;
            const bridgeRole = 4 * blend * (1 - blend);
            transitionRoles.kick[offset] = (1 - blend) * (1 - bridgeRole);
            transitionRoles.bridge[offset] = bridgeRole;
            transitionRoles.bass[offset] = blend * (1 - bridgeRole);
        }
        const attacks = new Float64Array(attackSamples);
        for (let offset = 0; offset < attackSamples; offset++) attacks[offset] = smooth(offset / attackSamples);
        for (let beat = 0; beat < BEATS; beat++) {
            const first = beat * samplesPerBeat;
            const start = first + handoffSamples;
            const end = first + endSamples;
            const bridge = bridges[beat];
            processed.fill(0, first + attackSamples, start);
            roles.kick.fill(1, first + attackSamples, start);
            roles.bass.fill(1, end, first + samplesPerBeat);
            // The previous beat ends on unmodified bass. Duck it over 2 ms,
            // including at the loop boundary, rather than resetting abruptly.
            for (let offset = 0; offset < attackSamples; offset++) {
                const index = first + offset;
                const attack = attacks[offset];
                processed[index] = sources.rawBass[index] * (1 - attack) * COMMON_GAIN;
                roles.kick[index] = attack;
                roles.bass[index] = 1 - attack;
            }
            for (let offset = 0; offset < transitionSamples; offset++) {
                const index = start + offset;
                const u = offset / transitionSamples;
                const blend = blends[offset];
                const weight = bridge.active ? bridgeWeights[offset] : 0;
                const synthesized = amplitudes[offset] * Math.sin(evaluate(bridge.phaseCoefficients, u));
                // Native default Drum Mute removes only the raw drum contribution:
                // original = S*bass, wet = (1-W)*original + W*synthesized.
                // Adding ONE external kick below preserves the normal mix routing.
                // S and W have zero first/second derivatives at both boundaries.
                const processedBass = (1 - weight) * blend * sources.rawBass[index] + weight * synthesized;
                processed[index] = processedBass * COMMON_GAIN;
            }
            roles.kick.set(transitionRoles.kick, start);
            roles.bridge.set(transitionRoles.bridge, start);
            roles.bass.set(transitionRoles.bass, start);
        }
        // Sum the stored Float32 stems so rendered and audible identities agree.
        for (let index = 0; index < length; index++) mix[index] = kick[index] + processed[index];
        return {
            sampleRate, beatMs: BEAT_MS, length, kick, bass, dry, processed, mix, roles,
            meta: {
                synthetic: true,
                model: 'Simplified analytic browser bridge; not the production plugin DSP',
                durationMs: transitionSamples * 1000 / sampleRate,
                handoffMs: handoffSamples * 1000 / sampleRate,
                bassHz, beatMs: BEAT_MS, beats: BEATS, renderMs: length * 1000 / sampleRate,
                samplesPerBeat, handoffSamples, transitionSamples, attackSamples,
                commonGain: COMMON_GAIN, bassPhase: BASS_PHASE,
                kickStartHz: KICK_START_HZ, kickEndHz: KICK_END_HZ,
                fallbackBeats: bridges.filter(bridge => !bridge.active).length,
                bridges
            }
        };
    }
    window.SidechainDemoDSP = { create, defaults };
})();
