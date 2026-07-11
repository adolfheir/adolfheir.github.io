/* ============================================================================
   聽 · 山水 — a generative ink-wash score for the endless walk.
   Pure Web Audio API. No audio files, no dependencies. Every note is a plucked
   古琴 tone drawn from a 五聲音階 (pentatonic), scheduled live and never repeating.

   It listens to the world via `opts.getState()`:
     · light (日照 0..1)  → 白昼奏宫调、明亮；入夜转羽调、低幽（昼夜循环联动）
     · speed / baseSpeed  → W 疾行则音密，S 缓步则疏落
     · t / control        → 入世 6.2s 过场里乐音随之渐起

   `initInkMusic(root, { getState })` wires the #soundBtn toggle, auto-starts on
   the first user gesture (browser autoplay policy), and returns { dispose, ... }.
   ========================================================================== */

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

const SCALES = {
  day:   { root: 261.63, scale: [0, 2, 4, 7, 9],  octs: [-1, 0, 1], amb: 520,  ambGain: 0.045 }, // 宫 · 明
  night: { root: 174.61, scale: [0, 3, 5, 7, 10], octs: [-1, 0],    amb: 300,  ambGain: 0.06  }, // 羽 · 幽
};

export function initInkMusic(root, opts = {}) {
  const getState = typeof opts.getState === "function" ? opts.getState : () => ({});

  let ctx = null;
  let master, comp, dryBus, wetBus, convolver;
  let pad = null, ambience = null;
  let running = false;
  let muted = false;
  try { muted = localStorage.getItem("ink.music.muted") === "1"; } catch (e) {}

  let kind = "day";        // 当前调性（昼/夜），带滞回，不频繁跳变
  let transpose = 0;       // 换气韵时的移调（半音）
  let notePool = [];
  let noteCount = 0;
  let schedTimer = null;
  let nextNoteTime = 0;
  const LOOKAHEAD = 0.1, TICK = 25;

  // ---- graph ----------------------------------------------------------------
  function buildGraph() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.0001;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3.2;
    comp.attack.value = 0.01; comp.release.value = 0.25;
    master.connect(comp); comp.connect(ctx.destination);

    dryBus = ctx.createGain(); dryBus.gain.value = 0.9;
    wetBus = ctx.createGain(); wetBus.gain.value = 0.85;
    convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(3.6, 2.6);
    dryBus.connect(master);
    wetBus.connect(convolver); convolver.connect(master);
  }

  function makeImpulse(seconds, decay) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return buf;
  }

  // ---- voices ---------------------------------------------------------------
  function buildNotePool() {
    const s = SCALES[kind];
    const r0 = s.root * Math.pow(2, transpose / 12);
    notePool = [];
    for (const o of s.octs) for (const semi of s.scale) notePool.push(r0 * Math.pow(2, o + semi / 12));
    notePool.sort((a, b) => a - b);
  }

  // 一声古琴散音：基频 + 泛音 + 拨弦噪声瞬态，经渐闭低通
  function pluck(freq, time, velocity, bright) {
    const out = ctx.createGain(); out.gain.value = velocity;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.Q.value = 0.6;
    lp.frequency.setValueAtTime(bright + freq * 1.5, time);
    lp.frequency.exponentialRampToValueAtTime(Math.max(180, freq * 1.1), time + 2.4);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(1.0, time + 0.006);
    env.gain.exponentialRampToValueAtTime(0.26, time + 0.5);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 3.6);

    const partials = [[1, 1.0, "sine"], [2, 0.32, "sine"], [3, 0.11, "triangle"]];
    const oscs = [];
    for (const [mult, g, type] of partials) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq * mult;
      const pg = ctx.createGain(); pg.gain.value = g;
      o.connect(pg); pg.connect(lp);
      o.start(time); o.stop(time + 3.8);
      oscs.push(o);
    }
    const nb = ctx.createBufferSource();
    const nbuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length);
    nb.buffer = nbuf;
    const ng = ctx.createGain(); ng.gain.value = 0.055;
    nb.connect(ng); ng.connect(lp); nb.start(time);

    lp.connect(env); env.connect(out);
    out.connect(dryBus); out.connect(wetBus);
    oscs[0].onended = () => { try { out.disconnect(); } catch (e) {} };
  }

  function startPad() {
    const s = SCALES[kind];
    const r0 = s.root * Math.pow(2, transpose / 12);
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.setTargetAtTime(kind === "night" ? 0.06 : 0.045, ctx.currentTime, 6);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = kind === "night" ? 380 : 540; lp.Q.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
    const lfoG = ctx.createGain(); lfoG.gain.value = 150;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
    const oscs = [];
    for (const f of [r0 / 2, (r0 / 2) * Math.pow(2, 7 / 12)]) {
      const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = f;
      const d = ctx.createOscillator(); d.type = "sine"; d.frequency.value = f * 1.003;
      o.connect(lp); d.connect(lp); o.start(); d.start();
      oscs.push(o, d);
    }
    lp.connect(g); g.connect(dryBus); g.connect(wetBus);
    pad = { g, oscs, lfo };
  }
  function stopPad(fast) {
    if (!pad) return;
    const p = pad; pad = null;
    p.g.gain.setTargetAtTime(0.0001, ctx.currentTime, fast ? 0.4 : 1.5);
    const nodes = [...p.oscs, p.lfo];
    setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch (e) {} }), fast ? 900 : 3000);
  }

  function startAmbience() {
    const s = SCALES[kind];
    const src = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = s.amb; bp.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.setTargetAtTime(s.ambGain, ctx.currentTime, 4);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lfoG = ctx.createGain(); lfoG.gain.value = s.ambGain * 0.7;
    lfo.connect(lfoG); lfoG.connect(g.gain); lfo.start();
    src.connect(bp); bp.connect(g); g.connect(dryBus);
    src.start();
    ambience = { src, g, lfo };
  }
  function stopAmbience(fast) {
    if (!ambience) return;
    const a = ambience; ambience = null;
    a.g.gain.setTargetAtTime(0.0001, ctx.currentTime, fast ? 0.4 : 1.2);
    setTimeout(() => { try { a.src.stop(); } catch (e) {} try { a.lfo.stop(); } catch (e) {} }, fast ? 800 : 2000);
  }

  function applyKind(next) {
    kind = next;
    buildNotePool();
    if (running) { stopPad(true); startPad(); stopAmbience(true); startAmbience(); }
  }

  // ---- scheduler ------------------------------------------------------------
  function biased() { return (Math.random() + Math.random()) / 2; } // 偏中音区

  function scheduler() {
    const st = getState() || {};
    const light = clamp(st.light == null ? 1 : st.light, 0, 1);
    const spd = st.speed && st.baseSpeed ? st.speed / st.baseSpeed : 1; // ~0.45..1.7
    const introK = st.control ? 1 : clamp((st.t || 0) / (st.introDur || 6.2), 0, 1);

    // 昼夜切换（滞回，避免抖动）
    if (kind === "day" && light < 0.42) applyKind("night");
    else if (kind === "night" && light > 0.58) applyKind("day");

    // 主音量：入世渐起 · 夜里稍敛
    const vol = 0.9 * (0.32 + 0.68 * introK) * (0.72 + 0.28 * light);
    master.gain.setTargetAtTime(muted ? 0.0001 : vol * vol, ctx.currentTime, 0.1);

    const bright = 850 + light * 1900 + (spd - 1) * 320;   // 明暗
    const activity = 0.55 + light * 0.55 + (spd - 1) * 0.5; // 疏密

    while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
      if (Math.random() > 0.12) {
        let idx = Math.floor(biased() * notePool.length);
        idx = clamp(idx, 0, notePool.length - 1);
        const vel = (0.26 + Math.random() * 0.32) * (0.8 + 0.2 * light);
        pluck(notePool[idx], nextNoteTime, vel, bright);
        if (Math.random() < 0.2 + light * 0.1) {
          const j = clamp(idx + 1 + (Math.random() < 0.5 ? 1 : 0), 0, notePool.length - 1);
          pluck(notePool[j], nextNoteTime + 0.04, vel * 0.68, bright);
        }
        if (++noteCount % 52 === 0) reseed();
      }
      const beat = kind === "night" ? 1.05 : 0.9;
      const gap = (2 + Math.random() * 3) / clamp(activity, 0.5, 2.2);
      nextNoteTime += gap * beat;
    }
    schedTimer = setTimeout(scheduler, TICK);
  }

  function reseed() {
    const steps = [0, 2, 4, 7, 9, -3, 12];
    transpose = steps[Math.floor(Math.random() * steps.length)];
    buildNotePool();
    if (running) { stopPad(true); startPad(); }
  }

  // ---- lifecycle ------------------------------------------------------------
  async function ensureAudio() {
    if (!ctx) buildGraph();
    if (ctx.state === "suspended") { try { await ctx.resume(); } catch (e) {} }
  }
  async function start() {
    await ensureAudio();
    if (running) return;
    const st = getState() || {};
    kind = (st.light == null ? 1 : st.light) > 0.5 ? "day" : "night";
    buildNotePool();
    startPad(); startAmbience();
    nextNoteTime = ctx.currentTime + 0.25;
    running = true;
    scheduler();
  }
  function stop() {
    running = false;
    clearTimeout(schedTimer);
    if (ctx) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
    stopPad(); stopAmbience();
  }

  // ---- UI (#soundBtn) + autostart ------------------------------------------
  const btn = root && root.querySelector("#soundBtn");
  function syncBtn() {
    if (!btn) return;
    btn.textContent = muted ? "靜默" : "奏樂";
    btn.setAttribute("aria-pressed", String(!muted));
  }
  syncBtn();

  async function unmute() {
    muted = false;
    try { localStorage.setItem("ink.music.muted", "0"); } catch (e) {}
    syncBtn();
    await start();
  }
  function mute() {
    muted = true;
    try { localStorage.setItem("ink.music.muted", "1"); } catch (e) {}
    syncBtn();
    stop();
  }
  const toggle = () => (muted ? unmute() : mute());
  if (btn) btn.addEventListener("click", toggle);

  // 首个用户手势起乐（满足浏览器自动播放策略）
  const kick = () => { if (!muted) unmute(); removeKick(); };
  function removeKick() {
    window.removeEventListener("pointerdown", kick);
    window.removeEventListener("keydown", kick);
  }
  window.addEventListener("pointerdown", kick);
  window.addEventListener("keydown", kick);

  return {
    toggle,
    isMuted: () => muted,
    dispose() {
      removeKick();
      if (btn) btn.removeEventListener("click", toggle);
      clearTimeout(schedTimer);
      running = false;
      if (ctx) { try { ctx.close(); } catch (e) {} }
    },
  };
}
