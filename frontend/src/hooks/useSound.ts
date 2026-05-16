'use client';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Resume if suspended (browsers suspend until user gesture)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * 融合成功「咔哒」声 — 两块拼图片咬合的感觉
 * 音色：快速上升后急速下降 + 轻微噪声底，模拟塑料拼图片嵌入
 */
export function playClickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 主音：高频快速衰减的方波 → 咔哒感
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(1800, now + 0.02);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
  oscGain.gain.setValueAtTime(0.18, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.12);

  // 副音：略低的正弦衬托，增加厚重感
  const osc2 = ctx.createOscillator();
  const osc2Gain = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(600, now);
  osc2.frequency.exponentialRampToValueAtTime(300, now + 0.08);
  osc2Gain.gain.setValueAtTime(0.1, now);
  osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc2.connect(osc2Gain);
  osc2Gain.connect(ctx.destination);
  osc2.start(now);
  osc2.stop(now + 0.1);
}

/**
 * 融合火花声 — 灵感碰撞的「噼啪」电火花感
 * 音色：上升音阶扫频 + 白噪声底，模拟能量爆发
 */
export function playFusionSparkSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 主扫频：从低沉快速上升到高频，然后碎成火花
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
  osc.frequency.exponentialRampToValueAtTime(2400, now + 0.2);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.45);
  oscGain.gain.setValueAtTime(0.12, now);
  oscGain.gain.linearRampToValueAtTime(0.15, now + 0.08);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);

  // 副扫频：高八度叠加，产生丰富谐波
  const osc2 = ctx.createOscillator();
  const osc2Gain = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(400, now + 0.03);
  osc2.frequency.exponentialRampToValueAtTime(1600, now + 0.12);
  osc2.frequency.exponentialRampToValueAtTime(3200, now + 0.25);
  osc2.frequency.exponentialRampToValueAtTime(800, now + 0.4);
  osc2Gain.gain.setValueAtTime(0.06, now + 0.03);
  osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
  osc2.connect(osc2Gain);
  osc2Gain.connect(ctx.destination);
  osc2.start(now + 0.03);
  osc2.stop(now + 0.42);

  // 白噪声底 → 模拟火花飞溅的「嘶嘶」感
  const bufferSize = ctx.sampleRate * 0.3;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(2000, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(4000, now + 0.1);
  noiseFilter.frequency.exponentialRampToValueAtTime(1000, now + 0.3);
  noiseGain.gain.setValueAtTime(0.04, now);
  noiseGain.gain.linearRampToValueAtTime(0.06, now + 0.06);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  noise.buffer = noiseBuffer;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.3);
}

/**
 * 拼图片放置声 — 轻快的短促音，选中/取消选中时播放
 * 音色：清脆的正弦波短音，左右声场略有变化
 */
export function playPiecePlaceSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 左右声场分离的立体声效果
  const merger = ctx.createChannelMerger(2);

  for (let ch = 0; ch < 2; ch++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 + ch * 100, now);
    osc.frequency.exponentialRampToValueAtTime(1200 + ch * 100, now + 0.02);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);
    gain.gain.setValueAtTime(ch === 0 ? 0.08 : 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(merger, 0, ch);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  merger.connect(ctx.destination);
}