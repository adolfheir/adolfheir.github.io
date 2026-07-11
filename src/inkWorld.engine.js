/* ============================================================================
   入世 · cyh — an ink-wash (水墨) endless-walk world, on Babylon.js.
   All art is procedural (DynamicTexture canvas painting). No external assets.
   `initInkWorld(canvas, root)` boots the engine and returns a dispose().
   ========================================================================== */
import * as BABYLON from "@babylonjs/core";

export function initInkWorld(canvas, root) {
  // ---- palette (rice paper + sumi ink + cinnabar seal) ----------------------
  const PAPER = "#ECE7D9";
  const C = {
    paper: BABYLON.Color3.FromHexString(PAPER),
    ink0: BABYLON.Color3.FromHexString("#20201b"), // 焦墨
    ink1: BABYLON.Color3.FromHexString("#33322c"), // 浓墨
    ink2: BABYLON.Color3.FromHexString("#565349"), // 中墨
    ink3: BABYLON.Color3.FromHexString("#8a877c"), // 淡墨
    mist: BABYLON.Color3.FromHexString("#b9b6a8"), // 远山
    seal: "#b0392c",
  };

  // ---- tunables -------------------------------------------------------------
  const CFG = {
    fog: 0.017, // steady-state fog density (the soul of 留白 depth)
    fogIntro: 0.075, // dense mist during 入世
    cell: 12, // world units per scatter cell
    view: 7, // cells radius kept alive around the traveler
    density: 0.34, // chance a cell holds a feature
    speed: 5.0, // base forward speed (u/s) — never fully stops
    turn: 1.5, // rad/s keyboard turn rate
    orbitSens: 0.006, // rad per px — drag orbits the camera around the traveler
    liftSens: 0.02, // units per px — drag Y raises / lowers the camera
    camDist: 9.2,
    camHeight: 4.3,
    camLook: 1.7,
    introDur: 6.2, // seconds of the cinematic before control unlocks
  };

  const reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: false,
    antialias: true,
    powerPreference: "high-performance",
  });
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(C.paper.r, C.paper.g, C.paper.b, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogColor = C.paper.clone();
  scene.fogDensity = CFG.fogIntro;
  scene.ambientColor = new BABYLON.Color3(1, 1, 1);

  const camera = new BABYLON.UniversalCamera("cam", new BABYLON.Vector3(0, 7, -97), scene);
  camera.fov = 0.82;
  camera.minZ = 0.1;
  camera.maxZ = 600;

  // =========================================================================
  //  texture helpers — everything is painted on a 2D canvas (ink brush)
  // =========================================================================
  let texId = 0;
  function newTex(w, h) {
    const dt = new BABYLON.DynamicTexture("t" + texId++, { width: w, height: h }, scene, true);
    dt.hasAlpha = true;
    return dt;
  }
  function stroke(ctx, x1, y1, x2, y2, w, col, alpha) {
    const steps = Math.max(6, Math.hypot(x2 - x1, y2 - y1) / 3);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * w * 0.35;
      const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * w * 0.35;
      const rr = w * (0.5 + 0.5 * Math.sin(Math.PI * t)) * (0.7 + Math.random() * 0.3);
      ctx.globalAlpha = alpha * (0.5 + Math.random() * 0.5);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function wash(ctx, x, y, rx, ry, col, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(rx, ry), 0, 7);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  const INK = ["#26251f", "#3b382f", "#524d42", "#726c5d"];

  // --- 松 pine ---------------------------------------------------------------
  function pineTex(seed) {
    const S = 256,
      dt = newTex(S, S),
      ctx = dt.getContext();
    ctx.clearRect(0, 0, S, S);
    const lean = (seed % 3 - 1) * 10;
    stroke(ctx, S / 2, S, S / 2 + lean, S * 0.42, 7, INK[1], 0.9);
    for (let b = 0; b < 3; b++) {
      const by = S * (0.5 + b * 0.14);
      const dir = b % 2 ? 1 : -1;
      stroke(ctx, S / 2 + lean * (1 - b * 0.2), by, S / 2 + dir * (60 - b * 8), by - 18, 4, INK[1], 0.8);
    }
    const layers = [
      [S / 2, S * 0.42, 72, 26],
      [S / 2 - 34, S * 0.34, 52, 20],
      [S / 2 + 30, S * 0.3, 48, 18],
      [S / 2, S * 0.2, 60, 22],
    ];
    layers.forEach((L, i) => {
      wash(ctx, L[0] + lean, L[1], L[2], L[3], INK[3], 0.5);
      for (let n = 0; n < 26; n++) {
        const a = Math.random() * Math.PI * 2,
          r = Math.random();
        const x = L[0] + lean + Math.cos(a) * L[2] * r;
        const y = L[1] + Math.sin(a) * L[3] * r;
        stroke(ctx, x, y, x + (Math.random() - 0.5) * 14, y - 8 - Math.random() * 8, 1.6, INK[i % 2], 0.55);
      }
    });
    dt.update(true);
    return dt;
  }

  // --- 山石 rock -------------------------------------------------------------
  function rockTex(seed) {
    const S = 256,
      dt = newTex(S, S),
      ctx = dt.getContext();
    ctx.clearRect(0, 0, S, S);
    const cx = S / 2,
      base = S * 0.92,
      w = 78 + (seed % 3) * 10;
    wash(ctx, cx, base - 30, w, 60, INK[3], 0.55);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = INK[2];
    ctx.beginPath();
    ctx.moveTo(cx - w, base);
    ctx.lineTo(cx - w * 0.7, base - 70);
    ctx.lineTo(cx - w * 0.1, base - 108 - (seed % 2) * 20);
    ctx.lineTo(cx + w * 0.6, base - 66);
    ctx.lineTo(cx + w, base);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    stroke(ctx, cx - w, base, cx + w, base, 6, INK[0], 0.85);
    for (let i = 0; i < 7; i++) {
      const x = cx - w * 0.7 + Math.random() * w * 1.4;
      stroke(ctx, x, base - 20 - Math.random() * 60, x + (Math.random() - 0.5) * 30, base - 4, 2, INK[0], 0.5);
    }
    dt.update(true);
    return dt;
  }

  // --- 竹 bamboo -------------------------------------------------------------
  function bambooTex(seed) {
    const S = 256,
      dt = newTex(S, S),
      ctx = dt.getContext();
    ctx.clearRect(0, 0, S, S);
    const n = 2 + (seed % 3);
    for (let s = 0; s < n; s++) {
      const x = S * (0.3 + s * 0.18) + (Math.random() - 0.5) * 20;
      const top = S * (0.12 + Math.random() * 0.1);
      stroke(ctx, x, S, x + (Math.random() - 0.5) * 10, top, 4.5, INK[1], 0.85);
      for (let k = 0; k < 6; k++) {
        const y = S - (S - top) * (k / 6);
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = INK[0];
        ctx.fillRect(x - 5, y, 10, 2.4);
        ctx.globalAlpha = 1;
      }
      for (let l = 0; l < 6; l++) {
        const ly = top + Math.random() * 60;
        stroke(ctx, x, ly, x + (Math.random() < 0.5 ? -1 : 1) * (26 + Math.random() * 20), ly - 10 + Math.random() * 20, 3, INK[2], 0.7);
      }
    }
    dt.update(true);
    return dt;
  }

  // --- 草 grass tuft ---------------------------------------------------------
  function grassTex() {
    const S = 128,
      dt = newTex(S, S),
      ctx = dt.getContext();
    ctx.clearRect(0, 0, S, S);
    for (let i = 0; i < 9; i++) {
      const x = 20 + Math.random() * (S - 40);
      stroke(ctx, x, S, x + (Math.random() - 0.5) * 40, 20 + Math.random() * 30, 2, INK[2], 0.7);
    }
    dt.update(true);
    return dt;
  }

  // --- 亭 pavilion (rare delight) -------------------------------------------
  function pavilionTex() {
    const S = 256,
      dt = newTex(S, S),
      ctx = dt.getContext();
    ctx.clearRect(0, 0, S, S);
    const cx = S / 2,
      base = S * 0.9;
    stroke(ctx, cx - 40, base, cx - 40, S * 0.45, 4, INK[1], 0.85);
    stroke(ctx, cx + 40, base, cx + 40, S * 0.45, 4, INK[1], 0.85);
    stroke(ctx, cx, base, cx, S * 0.45, 3, INK[1], 0.6);
    ctx.strokeStyle = INK[0];
    ctx.lineWidth = 6;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(cx - 78, S * 0.46);
    ctx.quadraticCurveTo(cx, S * 0.2, cx + 78, S * 0.46);
    ctx.moveTo(cx - 78, S * 0.46);
    ctx.quadraticCurveTo(cx - 92, S * 0.5, cx - 96, S * 0.42);
    ctx.moveTo(cx + 78, S * 0.46);
    ctx.quadraticCurveTo(cx + 92, S * 0.5, cx + 96, S * 0.42);
    ctx.stroke();
    stroke(ctx, cx, S * 0.2, cx, S * 0.12, 3, INK[0], 0.8);
    stroke(ctx, cx - 50, base, cx + 50, base, 4, INK[0], 0.7);
    ctx.globalAlpha = 1;
    dt.update(true);
    return dt;
  }

  // --- 飞鸟 bird stroke ------------------------------------------------------
  function birdTex() {
    const S = 128,
      dt = newTex(S, S),
      ctx = dt.getContext();
    ctx.clearRect(0, 0, S, S);
    ctx.strokeStyle = INK[0];
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(20, 70);
    ctx.quadraticCurveTo(50, 40, 64, 62);
    ctx.quadraticCurveTo(78, 40, 108, 70);
    ctx.stroke();
    ctx.globalAlpha = 1;
    dt.update(true);
    return dt;
  }

  // --- soft round ink mote (particles) --------------------------------------
  function moteTex() {
    const S = 64,
      dt = newTex(S, S),
      ctx = dt.getContext();
    wash(ctx, S / 2, S / 2, S / 2, S / 2, "#3a382f", 0.9);
    dt.update(true);
    return dt;
  }

  // --- soft shadow blob ------------------------------------------------------
  function shadowTex() {
    const S = 128,
      dt = newTex(S, S),
      ctx = dt.getContext();
    wash(ctx, S / 2, S / 2, S / 2, (S / 2) * 0.55, "#2a281f", 0.5);
    dt.update(true);
    return dt;
  }

  // --- 远山 ring panorama ----------------------------------------------------
  function ridgeTex() {
    const W = 2048,
      H = 512,
      dt = newTex(W, H),
      ctx = dt.getContext();
    ctx.clearRect(0, 0, W, H);
    const layers = [
      { base: H * 0.98, amp: 120, col: "rgba(120,116,104,0.9)", step: 210 },
      { base: H * 0.86, amp: 150, col: "rgba(150,146,134,0.8)", step: 330 },
      { base: H * 0.72, amp: 170, col: "rgba(178,174,162,0.7)", step: 470 },
    ];
    layers.forEach((L) => {
      ctx.fillStyle = L.col;
      ctx.beginPath();
      ctx.moveTo(0, H);
      let x = 0,
        up = true;
      ctx.lineTo(0, L.base);
      while (x < W) {
        const peak = L.base - L.amp * (0.5 + Math.random() * 0.5);
        const nx = x + L.step * (0.6 + Math.random() * 0.6);
        ctx.quadraticCurveTo((x + nx) / 2, up ? peak : L.base - 10, nx, L.base - Math.random() * 30);
        x = nx;
        up = !up;
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    });
    dt.update(true);
    return dt;
  }

  // material factories --------------------------------------------------------
  function billboardMat(tex, unlit) {
    const m = new BABYLON.StandardMaterial("m" + texId++, scene);
    m.diffuseTexture = tex;
    m.diffuseTexture.hasAlpha = true;
    m.useAlphaFromDiffuseTexture = true;
    m.emissiveTexture = tex;
    m.emissiveColor = new BABYLON.Color3(1, 1, 1);
    m.diffuseColor = new BABYLON.Color3(0, 0, 0);
    m.specularColor = new BABYLON.Color3(0, 0, 0);
    m.disableLighting = true;
    m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    m.backFaceCulling = false;
    if (unlit) m.fogEnabled = false;
    return m;
  }
  function inkMat(col) {
    const m = new BABYLON.StandardMaterial("i" + texId++, scene);
    m.emissiveColor = col.clone();
    m.diffuseColor = new BABYLON.Color3(0, 0, 0);
    m.specularColor = new BABYLON.Color3(0, 0, 0);
    m.disableLighting = true;
    return m;
  }

  // =========================================================================
  //  far mountains (远山 ring, follows the traveler, stays distant)
  // =========================================================================
  const ridge = BABYLON.MeshBuilder.CreateCylinder(
    "ridge",
    { diameterTop: 340, diameterBottom: 340, height: 120, tessellation: 72, sideOrientation: BABYLON.Mesh.BACKSIDE },
    scene
  );
  ridge.position.y = 34;
  const ridgeMat = billboardMat(ridgeTex(), true);
  ridgeMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
  ridge.material = ridgeMat;
  ridge.isPickable = false;

  // =========================================================================
  //  the traveler  (行者 / cyh — 墨首白瞳 + 长袍 + 行杖, ink silhouette)
  // =========================================================================
  const hero = new BABYLON.TransformNode("hero", scene);
  const body = new BABYLON.TransformNode("body", scene);
  body.parent = hero;

  const robe = BABYLON.MeshBuilder.CreateCylinder("robe", { height: 1.65, diameterTop: 0.62, diameterBottom: 1.15, tessellation: 16 }, scene);
  robe.position.y = 0.9;
  robe.parent = body;
  robe.material = inkMat(C.ink1);

  const torso = BABYLON.MeshBuilder.CreateCylinder("torso", { height: 0.7, diameterTop: 0.5, diameterBottom: 0.66, tessellation: 14 }, scene);
  torso.position.y = 1.9;
  torso.parent = body;
  torso.material = inkMat(C.ink0);

  const head = BABYLON.MeshBuilder.CreateSphere("head", { diameter: 0.56, segments: 18 }, scene);
  head.position.y = 2.3;
  head.parent = body;
  head.material = inkMat(C.ink0);

  // 容貌 · avatar — 墨首白瞳：two glowing white eyes on the FRONT (+Z) of the head
  const eyeMat = new BABYLON.StandardMaterial("eye", scene);
  eyeMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
  eyeMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  eyeMat.specularColor = new BABYLON.Color3(0, 0, 0);
  eyeMat.disableLighting = true;
  eyeMat.fogEnabled = false;
  function eye(side) {
    const e = BABYLON.MeshBuilder.CreateSphere("eye", { diameter: 0.16, segments: 12 }, scene);
    e.position.set(side * 0.13, 2.35, 0.23);
    e.parent = body;
    e.material = eyeMat;
    e.isPickable = false;
    return e;
  }
  eye(-1);
  eye(1);

  // 斗笠 — conical bamboo hat; brim sits above the eyes so the face still shows from the front
  const hat = BABYLON.MeshBuilder.CreateCylinder("hat", { height: 0.42, diameterTop: 0.05, diameterBottom: 1.16, tessellation: 26 }, scene);
  hat.position.y = 2.55;
  hat.parent = body;
  hat.material = inkMat(C.ink0);

  function leg(side) {
    const l = BABYLON.MeshBuilder.CreateCylinder("leg", { height: 0.9, diameterTop: 0.15, diameterBottom: 0.12, tessellation: 8 }, scene);
    l.setPivotPoint(new BABYLON.Vector3(0, 0.42, 0));
    l.position.set(side * 0.18, 0.62, 0);
    l.parent = body;
    l.material = inkMat(C.ink0);
    return l;
  }
  const legL = leg(-1),
    legR = leg(1);

  const staff = BABYLON.MeshBuilder.CreateCylinder("staff", { height: 2.5, diameter: 0.06, tessellation: 6 }, scene);
  staff.setPivotPoint(new BABYLON.Vector3(0, 1.0, 0));
  staff.position.set(0.5, 1.25, 0.15);
  staff.rotation.z = -0.12;
  staff.parent = body;
  staff.material = inkMat(C.ink1);

  const bundle = BABYLON.MeshBuilder.CreateSphere("bundle", { diameter: 0.3, segments: 8 }, scene);
  bundle.position.set(0.42, 2.35, 0.25);
  bundle.parent = body;
  bundle.material = inkMat(C.ink2);

  const shadow = BABYLON.MeshBuilder.CreateGround("sh", { width: 2.2, height: 1.4 }, scene);
  shadow.position.y = 0.02;
  shadow.parent = hero;
  shadow.material = billboardMat(shadowTex(), false);
  shadow.isPickable = false;

  // =========================================================================
  //  scenery pool (endless world via deterministic cell hashing)
  // =========================================================================
  const TYPES = [
    { key: "pine", w: [0, 0.42], variants: [pineTex(0), pineTex(1), pineTex(2)], size: [5, 8], y: 0 },
    { key: "rock", w: [0.42, 0.62], variants: [rockTex(0), rockTex(1), rockTex(2)], size: [2.4, 4], y: 0 },
    { key: "bamboo", w: [0.62, 0.8], variants: [bambooTex(0), bambooTex(1)], size: [4.5, 6.5], y: 0 },
    { key: "grass", w: [0.8, 0.95], variants: [grassTex(), grassTex()], size: [1.4, 2.4], y: 0 },
    { key: "pavi", w: [0.95, 1.0], variants: [pavilionTex()], size: [6, 8], y: 0 },
  ];
  TYPES.forEach((T) => {
    T.mats = T.variants.map((v) => billboardMat(v, false));
    T.free = [];
    T.made = 0;
  });

  function acquire(T) {
    let m = T.free.pop();
    if (!m) {
      m = BABYLON.MeshBuilder.CreatePlane("p_" + T.key + "_" + T.made++, { width: 1, height: 1 }, scene);
      m.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
      m.isPickable = false;
      m._T = T;
    }
    m.setEnabled(true);
    return m;
  }
  function release(m) {
    m.setEnabled(false);
    m._T.free.push(m);
  }

  function hash(i, j, s) {
    let h = (i | 0) * 374761393 + (j | 0) * 668265263 + s * 2246822519;
    h = (h ^ (h >>> 13)) >>> 0;
    h = (h * 1274126177) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return (h % 100000) / 100000;
  }
  const active = new Map();

  function pickType(r) {
    for (const T of TYPES) if (r >= T.w[0] && r < T.w[1]) return T;
    return TYPES[0];
  }
  function ensureCell(i, j) {
    const key = i + "_" + j;
    if (active.has(key)) return;
    if (hash(i, j, 1) > CFG.density) {
      active.set(key, null);
      return;
    }
    const T = pickType(hash(i, j, 2));
    const m = acquire(T);
    const vi = Math.floor(hash(i, j, 5) * T.mats.length);
    m.material = T.mats[vi];
    const sz = T.size[0] + hash(i, j, 6) * (T.size[1] - T.size[0]);
    const flip = hash(i, j, 7) < 0.5 ? 1 : -1;
    m.scaling.set(sz * flip, sz, 1);
    const ox = (hash(i, j, 3) - 0.5) * CFG.cell * 0.8;
    const oz = (hash(i, j, 4) - 0.5) * CFG.cell * 0.8;
    m.position.set(i * CFG.cell + ox, sz / 2 + T.y, j * CFG.cell + oz);
    active.set(key, m);
  }
  function updateWorld(px, pz) {
    const ci = Math.round(px / CFG.cell),
      cj = Math.round(pz / CFG.cell),
      V = CFG.view;
    for (let i = ci - V; i <= ci + V; i++) for (let j = cj - V; j <= cj + V; j++) ensureCell(i, j);
    for (const [key, m] of active) {
      const p = key.split("_"),
        i = +p[0],
        j = +p[1];
      if (i < ci - V - 1 || i > ci + V + 1 || j < cj - V - 1 || j > cj + V + 1) {
        if (m) release(m);
        active.delete(key);
      }
    }
  }

  // =========================================================================
  //  ambient — drifting ink motes (墨点 / 雾气)
  // =========================================================================
  let motes = null;
  if (!reduce) {
    motes = new BABYLON.ParticleSystem("motes", 260, scene);
    motes.particleTexture = moteTex();
    motes.emitter = hero;
    motes.minEmitBox = new BABYLON.Vector3(-32, 0.5, -32);
    motes.maxEmitBox = new BABYLON.Vector3(32, 16, 32);
    motes.color1 = new BABYLON.Color4(0.22, 0.21, 0.17, 0.22);
    motes.color2 = new BABYLON.Color4(0.3, 0.29, 0.24, 0.1);
    motes.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    motes.minSize = 0.15;
    motes.maxSize = 0.9;
    motes.minLifeTime = 4;
    motes.maxLifeTime = 9;
    motes.emitRate = 34;
    motes.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    motes.gravity = new BABYLON.Vector3(0, 0.05, 0);
    motes.direction1 = new BABYLON.Vector3(-0.4, 0.1, -0.4);
    motes.direction2 = new BABYLON.Vector3(0.4, 0.4, 0.4);
    motes.minEmitPower = 0.1;
    motes.maxEmitPower = 0.5;
    motes.start();
  }

  // =========================================================================
  //  飞鸟 birds — occasional ink strokes gliding across
  // =========================================================================
  const birdMat = billboardMat(birdTex(), false);
  const birds = [];
  for (let b = 0; b < (reduce ? 1 : 3); b++) {
    const m = BABYLON.MeshBuilder.CreatePlane("bird" + b, { size: 3 }, scene);
    m.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    m.material = birdMat;
    m.isPickable = false;
    m.setEnabled(false);
    birds.push({ m, t: -b * 6 - 3, dur: 0, sx: 0, sz: 0, dx: 0, dz: 0, y: 0 });
  }
  function flyBird(bd, px, pz) {
    const a = Math.random() * Math.PI * 2;
    bd.sx = px + Math.cos(a) * 60;
    bd.sz = pz + Math.sin(a) * 60;
    bd.dx = px + Math.cos(a + Math.PI + (Math.random() - 0.5)) * 60;
    bd.dz = pz + Math.sin(a + Math.PI + (Math.random() - 0.5)) * 60;
    bd.y = 22 + Math.random() * 16;
    bd.dur = 8 + Math.random() * 6;
    bd.t = 0;
    bd.m.setEnabled(true);
  }

  // =========================================================================
  //  input — auto-forward always; steer with keys / drag
  // =========================================================================
  const state = {
    px: 0,
    pz: -CFG.view * CFG.cell,
    heading: 0,
    speed: CFG.speed,
    phase: 0,
    t: 0,
    control: false,
    dragging: false,
    lastX: 0,
    lastY: 0,
    dragX: 0,
    dragY: 0,
    camYaw: 0, // camera orbit offset around the traveler (drag X)
    camLift: 0, // camera height offset (drag Y)
  };
  const keys = {};
  const onKeyDown = (e) => {
    keys[e.code] = true;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
  };
  const onKeyUp = (e) => {
    keys[e.code] = false;
  };
  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp);

  const onPointerDown = (e) => {
    if (!state.control) return;
    state.dragging = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!state.dragging) return;
    state.dragX += e.clientX - state.lastX; // drag → orbit the camera around the traveler
    state.dragY += e.clientY - state.lastY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
  };
  const endDrag = () => {
    state.dragging = false;
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // =========================================================================
  //  main loop
  // =========================================================================
  const fwd = new BABYLON.Vector3();
  const camTarget = new BABYLON.Vector3();
  const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    state.t += dt;

    // --- intro cinematic (入世) ---
    let introK = 1;
    if (!state.control) {
      const p = Math.min(state.t / CFG.introDur, 1);
      introK = p;
      scene.fogDensity = CFG.fogIntro + (CFG.fog - CFG.fogIntro) * easeInOut(Math.min(p * 1.2, 1));
      if (p >= 1) {
        state.control = true;
        root.classList.add("live");
      }
    } else {
      scene.fogDensity += (CFG.fog - scene.fogDensity) * 0.02;
    }

    // --- steering: A/D ← → turn the traveler; drag orbits the camera ---
    if (state.control) {
      let turn = 0;
      if (keys.ArrowLeft || keys.KeyA) turn -= 1;
      if (keys.ArrowRight || keys.KeyD) turn += 1;
      state.heading += turn * CFG.turn * dt;
      // drag → orbit the camera around the traveler (person-centered), no steering
      state.camYaw += state.dragX * CFG.orbitSens;
      state.camLift = Math.min(6, Math.max(-2.5, state.camLift - state.dragY * CFG.liftSens));
      state.dragX = 0;
      state.dragY = 0;
      let sp = CFG.speed;
      if (keys.ArrowUp || keys.KeyW) sp = CFG.speed * 1.7;
      if (keys.ArrowDown || keys.KeyS) sp = CFG.speed * 0.45;
      state.speed += (sp - state.speed) * 0.05;
    }

    // --- advance the traveler ---
    fwd.set(Math.sin(state.heading), 0, Math.cos(state.heading));
    // 入世编排: the traveler first faces you (avatar visible), then turns to set off.
    const turnK = state.control ? 1 : easeInOut(Math.min(Math.max((introK - 0.55) / 0.45, 0), 1));
    const walkSpeed = state.control ? state.speed : CFG.speed * turnK; // ramps 0→full, continuous at handoff
    state.px += fwd.x * walkSpeed * dt;
    state.pz += fwd.z * walkSpeed * dt;
    hero.position.set(state.px, 0, state.pz);
    hero.rotation.y = state.heading + Math.PI * (1 - turnK); // +π = facing the camera

    // --- walk cycle animation ---
    state.phase += 6.2 * (walkSpeed / CFG.speed) * dt;
    const stride = state.phase;
    const sw = Math.sin(stride),
      sw2 = Math.sin(stride * 2);
    body.position.y = Math.abs(sw2) * 0.06;
    body.rotation.z = sw * 0.03;
    body.rotation.x = 0.06;
    legL.rotation.x = -sw * 0.55;
    legR.rotation.x = sw * 0.55;
    robe.rotation.z = sw * 0.05;
    staff.rotation.x = -sw * 0.3 - 0.1;

    // --- far mountains follow (stay distant) ---
    ridge.position.x = state.px;
    ridge.position.z = state.pz;

    // --- endless world ---
    updateWorld(state.px, state.pz);

    // --- birds ---
    birds.forEach((bd) => {
      if (!bd.m.isEnabled()) {
        bd.t += dt;
        if (bd.t > 0 && state.control) flyBird(bd, state.px, state.pz);
        return;
      }
      bd.t += dt;
      const k = bd.t / bd.dur;
      if (k >= 1) {
        bd.m.setEnabled(false);
        bd.t = -(3 + Math.random() * 8);
        return;
      }
      bd.m.position.set(bd.sx + (bd.dx - bd.sx) * k, bd.y + Math.sin(k * 9) * 1.5, bd.sz + (bd.dz - bd.sz) * k);
      bd.m.scaling.setAll(1 + Math.sin(bd.t * 8) * 0.15);
    });

    // --- camera: orbits around the traveler (drag), eases in during 入世 ---
    const introEase = easeInOut(introK);
    const dist = 13 - (13 - CFG.camDist) * introEase;
    const hgt = 7 - (7 - CFG.camHeight) * introEase + state.camLift * introEase;
    const orbit = state.heading + Math.PI + state.camYaw; // 0 offset = directly behind
    const ox = Math.sin(orbit),
      oz = Math.cos(orbit);
    const desired = new BABYLON.Vector3(state.px + ox * dist, hgt, state.pz + oz * dist);
    const lerp = state.control ? 0.08 : 0.05;
    camera.position.x += (desired.x - camera.position.x) * lerp;
    camera.position.y += (desired.y - camera.position.y) * lerp;
    camera.position.z += (desired.z - camera.position.z) * lerp;
    camTarget.set(state.px, CFG.camLook + (1 - introEase) * 0.9, state.pz);
    camera.setTarget(camTarget);
  });

  // seed the world before first frame
  updateWorld(state.px, state.pz);

  engine.runRenderLoop(() => scene.render());
  const onResize = () => engine.resize();
  window.addEventListener("resize", onResize);

  // =========================================================================
  //  UI wiring (入世 skip, about panel)
  // =========================================================================
  const skip = root.querySelector("#skip");
  const aboutBtn = root.querySelector("#aboutBtn");
  const about = root.querySelector("#about");
  const aboutClose = root.querySelector("#aboutClose");

  const onSkip = () => {
    state.t = CFG.introDur;
    skip && skip.classList.add("gone");
  };
  skip && skip.addEventListener("click", onSkip);

  const onAboutBtn = () => about && about.classList.toggle("show");
  const onAboutClose = () => about && about.classList.remove("show");
  aboutBtn && aboutBtn.addEventListener("click", onAboutBtn);
  aboutClose && aboutClose.addEventListener("click", onAboutClose);

  const timers = [
    setTimeout(() => root.classList.add("veil-bleed"), 300),
    setTimeout(() => root.classList.add("veil-open"), 2200),
    setTimeout(() => {
      root.classList.add("veil-done");
      skip && skip.classList.add("gone");
    }, CFG.introDur * 1000),
  ];

  // =========================================================================
  //  dispose — tear everything down on unmount
  // =========================================================================
  return function dispose() {
    timers.forEach(clearTimeout);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", onResize);
    skip && skip.removeEventListener("click", onSkip);
    aboutBtn && aboutBtn.removeEventListener("click", onAboutBtn);
    aboutClose && aboutClose.removeEventListener("click", onAboutClose);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", endDrag);
    canvas.removeEventListener("pointercancel", endDrag);
    engine.stopRenderLoop();
    scene.dispose();
    engine.dispose();
  };
}
