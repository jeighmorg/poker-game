import { useEffect, useRef, useCallback } from 'react';
import { SoundEffect } from '../types';

export function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const playSound = useCallback((sound: SoundEffect) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;

    // Filtered noise burst — used for card rustles and chip transients
    const noise = (
      at: number,
      dur: number,
      filter: BiquadFilterType,
      freq: number,
      q: number,
      vol: number,
      attack = 0.003,
    ) => {
      const len = Math.ceil(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      const src = ctx.createBufferSource();
      src.buffer = buf;

      const flt = ctx.createBiquadFilter();
      flt.type = filter;
      flt.frequency.value = freq;
      flt.Q.value = q;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(vol, at + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

      src.connect(flt);
      flt.connect(gain);
      gain.connect(ctx.destination);
      src.start(at);
      src.stop(at + dur);
    };

    // Decaying oscillator — used for chip ring and table knock body
    const tone = (
      at: number,
      dur: number,
      freq: number,
      type: OscillatorType,
      vol: number,
      freqEnd?: number,
      attack = 0.004,
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, at);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, at + dur);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(vol, at + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + dur);
    };

    // Single chip clack: noise transient + metallic ring decay
    const chipClack = (at: number, vol = 0.35, pitch = 2800) => {
      noise(at, 0.05, 'bandpass', pitch, 4, vol * 0.9, 0.001);
      tone(at, 0.06, pitch, 'sine', vol * 0.45, pitch * 0.55, 0.001);
    };

    // Card rustle: layered highpass + bandpass noise
    const cardRustle = (at: number, dur: number, vol: number) => {
      noise(at, dur, 'highpass', 3200, 0.7, vol, 0.006);
      noise(at, dur * 0.55, 'bandpass', 1400, 1.5, vol * 0.3, 0.004);
    };

    // Felt knock: pitch-dropping sine (the "thud") + short transient noise
    const tableKnock = (at: number, vol: number) => {
      tone(at, 0.075, 165, 'sine', vol, 52, 0.001);
      noise(at, 0.028, 'bandpass', 850, 2, vol * 0.5, 0.001);
    };

    switch (sound) {
      case 'card-deal':
        // Quick whoosh with a crisp snap at the start
        cardRustle(t, 0.12, 0.28);
        noise(t, 0.022, 'bandpass', 5800, 7, 0.28, 0.001);
        break;

      case 'fold':
        // Softer, slightly longer slide — card being pushed away
        cardRustle(t, 0.19, 0.2);
        break;

      case 'chip-bet':
        // Small stack of 3 chips placed down
        chipClack(t,        0.38, 2900);
        chipClack(t + 0.055, 0.32, 2650);
        chipClack(t + 0.1,  0.28, 3050);
        break;

      case 'chip-win':
        // Chips cascading as they're raked in — 9 clacks, building in energy
        for (let i = 0; i < 9; i++) {
          chipClack(
            t + i * 0.052,
            0.28 + i * 0.022,
            2500 + Math.random() * 700,
          );
        }
        break;

      case 'check':
        // Two gentle knuckle-raps on the felt
        tableKnock(t,      0.38);
        tableKnock(t + 0.12, 0.30);
        break;

      case 'all-in':
        // Big dramatic chip shove — 14 chips cascading with a low thump underneath
        for (let i = 0; i < 14; i++) {
          chipClack(
            t + i * 0.038,
            0.28 + Math.min(i * 0.028, 0.34),
            2400 + Math.random() * 900,
          );
        }
        tone(t, 0.38, 90, 'sine', 0.38, 36); // low dramatic thump
        break;

      case 'your-turn':
        // Soft two-note chime (major third: A5 → C#6)
        tone(t,       0.5, 880,  'sine', 0.13);
        tone(t,       0.5, 1760, 'sine', 0.045); // octave harmonic
        tone(t + 0.26, 0.5, 1109, 'sine', 0.11); // C#6
        tone(t + 0.26, 0.5, 2218, 'sine', 0.038);
        break;
    }
  }, []);

  return { playSound };
}
