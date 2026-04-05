#!/usr/bin/env node
/**
 * Generate simple procedural WAV sound effects.
 * Replaces silence placeholders with audible tones.
 * Run: node scripts/gen-audio.mjs
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = join(__dirname, '..', 'public', 'assets', 'audio');

const SAMPLE_RATE = 22050;

/** Write a mono 16-bit PCM WAV file. */
function writeWav(path, samples) {
    const numSamples = samples.length;
    const dataSize = numSamples * 2;
    const buf = Buffer.alloc(44 + dataSize);

    // RIFF header
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + dataSize, 4);
    buf.write('WAVE', 8);

    // fmt chunk
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);       // chunk size
    buf.writeUInt16LE(1, 20);        // PCM
    buf.writeUInt16LE(1, 22);        // mono
    buf.writeUInt32LE(SAMPLE_RATE, 24);
    buf.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
    buf.writeUInt16LE(2, 32);        // block align
    buf.writeUInt16LE(16, 34);       // bits per sample

    // data chunk
    buf.write('data', 36);
    buf.writeUInt32LE(dataSize, 40);

    for (let i = 0; i < numSamples; i++) {
        const val = Math.max(-1, Math.min(1, samples[i]));
        buf.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
    }

    writeFileSync(path, buf);
}

/** Generate N samples of white noise with decay envelope. */
function noise(duration, volume = 0.5, decay = 3) {
    const n = Math.round(SAMPLE_RATE * duration);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const t = i / SAMPLE_RATE;
        const env = Math.exp(-decay * t) * volume;
        out[i] = (Math.random() * 2 - 1) * env;
    }
    return out;
}

/** Generate a sine tone with optional decay. */
function sine(freq, duration, volume = 0.5, decay = 0) {
    const n = Math.round(SAMPLE_RATE * duration);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const t = i / SAMPLE_RATE;
        const env = decay > 0 ? Math.exp(-decay * t) * volume : volume;
        out[i] = Math.sin(2 * Math.PI * freq * t) * env;
    }
    return out;
}

/** Mix multiple sample arrays together. */
function mix(...arrays) {
    const maxLen = Math.max(...arrays.map(a => a.length));
    const out = new Float64Array(maxLen);
    for (const arr of arrays) {
        for (let i = 0; i < arr.length; i++) {
            out[i] += arr[i];
        }
    }
    return out;
}

/** Concatenate sample arrays. */
function concat(...arrays) {
    const totalLen = arrays.reduce((sum, a) => sum + a.length, 0);
    const out = new Float64Array(totalLen);
    let offset = 0;
    for (const arr of arrays) {
        out.set(arr, offset);
        offset += arr.length;
    }
    return out;
}

// ── Sound effects ──────────────────────────────────────────────

// hit_light: short punchy noise burst
writeWav(join(AUDIO_DIR, 'hit_light.wav'),
    mix(noise(0.08, 0.7, 20), sine(300, 0.08, 0.4, 15)));

// hit_heavy: deeper impact with longer tail
writeWav(join(AUDIO_DIR, 'hit_heavy.wav'),
    mix(noise(0.15, 0.8, 10), sine(150, 0.15, 0.5, 8), sine(80, 0.2, 0.3, 5)));

// block: metallic clang (high sine + noise)
writeWav(join(AUDIO_DIR, 'block.wav'),
    mix(sine(800, 0.12, 0.4, 12), sine(1200, 0.1, 0.3, 15), noise(0.06, 0.3, 25)));

// ko: dramatic descending tone
writeWav(join(AUDIO_DIR, 'ko.wav'), (() => {
    const n = Math.round(SAMPLE_RATE * 0.6);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const t = i / SAMPLE_RATE;
        const freq = 400 * Math.exp(-2 * t);
        const env = Math.exp(-1.5 * t) * 0.6;
        out[i] = Math.sin(2 * Math.PI * freq * t) * env;
    }
    return mix(out, noise(0.3, 0.2, 5));
})());

// fight: announcement "ding" chord
writeWav(join(AUDIO_DIR, 'fight.wav'),
    mix(sine(523, 0.3, 0.3, 3), sine(659, 0.3, 0.3, 3), sine(784, 0.3, 0.3, 3)));

// special: swoosh + impact
writeWav(join(AUDIO_DIR, 'special.wav'), (() => {
    const n = Math.round(SAMPLE_RATE * 0.25);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const t = i / SAMPLE_RATE;
        const freq = 200 + 600 * t; // rising frequency
        const env = Math.sin(Math.PI * t / 0.25) * 0.5;
        out[i] = Math.sin(2 * Math.PI * freq * t) * env;
    }
    return mix(out, noise(0.15, 0.3, 10));
})());

// round_start: short bell
writeWav(join(AUDIO_DIR, 'round_start.wav'),
    mix(sine(880, 0.2, 0.4, 5), sine(1760, 0.15, 0.2, 8)));

// ui_select: soft click
writeWav(join(AUDIO_DIR, 'ui_select.wav'),
    mix(sine(600, 0.05, 0.3, 20), noise(0.03, 0.2, 30)));

// ui_confirm: two-tone confirm
writeWav(join(AUDIO_DIR, 'ui_confirm.wav'),
    concat(sine(500, 0.06, 0.3, 10), sine(700, 0.08, 0.3, 8)));

// bgm_menu: ambient drone loop (2 seconds)
writeWav(join(AUDIO_DIR, 'bgm_menu.wav'), (() => {
    const dur = 2.0;
    return mix(
        sine(110, dur, 0.15, 0),
        sine(165, dur, 0.1, 0),
        sine(220, dur, 0.08, 0),
    );
})());

// bgm_fight: rhythmic beat loop (2 seconds)
writeWav(join(AUDIO_DIR, 'bgm_fight.wav'), (() => {
    const dur = 2.0;
    const n = Math.round(SAMPLE_RATE * dur);
    const out = new Float64Array(n);
    const bpm = 140;
    const beatInterval = 60 / bpm;
    for (let i = 0; i < n; i++) {
        const t = i / SAMPLE_RATE;
        const beatPhase = (t % beatInterval) / beatInterval;
        // Kick-like thump on each beat
        const kick = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-beatPhase * 15) * 0.3;
        // Hi-hat noise on offbeats
        const offbeat = ((t + beatInterval / 2) % beatInterval) / beatInterval;
        const hat = (Math.random() * 2 - 1) * Math.exp(-offbeat * 30) * 0.1;
        // Bass drone
        const bass = Math.sin(2 * Math.PI * 55 * t) * 0.08;
        out[i] = kick + hat + bass;
    }
    return out;
})());

console.log('✓ Generated 11 audio files in public/assets/audio/');
