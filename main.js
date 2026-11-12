import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { CELL, GW, GH, grid, SPAWN, EXTRACT, ZOMBIE_SPAWNS, AMMO_SPAWNS, BOOST_SPAWNS, ROOM_LABELS, PROPS } from './level.js';

const CFG = {
  cell: 5,
  wallH: 4.5,
  eyeHeight: 1.7,
  playerRadius: 0.4,
  playerSpeed: 5.0,
  boostMult: 1.55,
  boostTime: 8,

  zombieHP: 2,
  zombieDetect: 14,
  zombieSpeed: 2.4,
  runnerSpeed: 3.7,
  zombieRadius: 0.4,
  catchDist: 0.95,
  zombieHeight: 1.85,

  shotRange: 60,
  switchTime: 0.40,

  weapons: [

    { name: 'ARMA 1', file: 'models/arma1.glb', ammo: 12, max: 48, pick: 5, cooldown: 0.18,
      rotY: -Math.PI / 2, length: 0.32, rear: 0.10, muzzleDrop: 0.22, pos: [0.17, -0.17, -0.30] },
    { name: 'AK-74',  file: 'models/ak74.glb',  ammo: 20, max: 60, pick: 8, cooldown: 0.12,
      rotY: Math.PI / 2,  length: 0.70, rear: 0.16, muzzleDrop: 0.30, pos: [0.19, -0.19, -0.30] },
  ],

  zombieTypes: [
    { id: 'hazmat', file: 'models/zombie_hazmat.glb', height: 1.85, idle: 'Zombie_Idle', walk: 'Zombie_Walk_Root', walkRate: 1.3 },
    { id: 'rotted', file: 'models/zombie_1.glb', height: 1.85, idle: 'Take 01', walk: 'Take 01', idleRate: 0.5, walkRate: 2.2,
      arms: [/^upper_arm.?L/, /^upper_arm.?R/] },
    { id: 'ragged', file: 'models/zombie_3.glb', height: 1.8,
      arms: [/^LeftArm_/, /^RightArm_/], legs: [/^LeftUpLeg_/, /^RightUpLeg_/], spine: /^Spine_/ },
  ],
  boostSeconds: 8,
};

const cs = CFG.cell;
if (cs !== CELL) console.warn('CFG.cell debe coincidir con CELL de level.js');
const cellOf = v => Math.floor(v / cs);
const cellCenter = (c, r) => ({ x: c * cs + cs / 2, z: r * cs + cs / 2 });
const solidAt = (x, z) => {
  const c = cellOf(x), r = cellOf(z);
  if (c < 0 || r < 0 || c >= GW || r >= GH) return true;
  return grid[r][c] === 1;
};

const $ = id => document.getElementById(id);
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e11);
scene.fog = new THREE.Fog(0x0a0e11, 8, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.02, 200);
camera.rotation.order = 'YXZ';
scene.add(camera);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function addNoise(ctx, w, h, amt) {
  const id = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < id.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amt;
    id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n;
  }
  ctx.putImageData(id, 0, 0);
}
function blood(ctx, x, y, r, a) {
  ctx.fillStyle = `rgba(90,8,8,${a})`;
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(x + (Math.random() - 0.5) * r, y + (Math.random() - 0.5) * r, r * (0.25 + Math.random() * 0.5), 0, 7); ctx.fill(); }
}

const floorTex = canvasTex(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#9aa7a3'; ctx.fillRect(0, 0, w, h);
  const t = w / 4;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const v = ((i + j) % 2 ? 6 : -6) + (Math.random() - 0.5) * 8;
    ctx.fillStyle = `rgb(${154 + v},${167 + v},${163 + v})`; ctx.fillRect(i * t, j * t, t, t);
  }
  ctx.strokeStyle = '#6d7a76'; ctx.lineWidth = 2;
  for (let k = 0; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(k * t, 0); ctx.lineTo(k * t, h); ctx.moveTo(0, k * t); ctx.lineTo(w, k * t); ctx.stroke(); }
  addNoise(ctx, w, h, 22);
  for (let i = 0; i < 3; i++) blood(ctx, Math.random() * w, Math.random() * h, 40 + Math.random() * 50, 0.35);
}, GW, GH);

const wallTex = canvasTex(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#c4cbc4'; ctx.fillRect(0, 0, w, h);
  const split = h * 0.42;
  ctx.fillStyle = '#6f9487'; ctx.fillRect(0, split, w, h - split);
  ctx.strokeStyle = '#4f6f64'; ctx.lineWidth = 2;
  for (let x = 0; x <= w; x += 64) { ctx.beginPath(); ctx.moveTo(x, split); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = split; y <= h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.fillStyle = '#2f4f46'; ctx.fillRect(0, split - 6, w, 8);
  ctx.fillStyle = '#d8b13a'; ctx.fillRect(0, h * 0.30, w, 6);
  addNoise(ctx, w, h, 26);
  for (let i = 0; i < 2; i++) blood(ctx, 60 + Math.random() * (w - 120), split + Math.random() * (h - split) * 0.8, 50, 0.45);
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.2, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
});
const ceilTex = canvasTex(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#b9c0c2'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#8b9395'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, w, h);
  ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  addNoise(ctx, w, h, 18);
}, GW * 2, GH * 2);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(GW * cs, GH * cs), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 }));
floor.rotation.x = -Math.PI / 2; floor.position.set(GW * cs / 2, 0, GH * cs / 2); scene.add(floor);
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(GW * cs, GH * cs), new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 1 }));
ceil.rotation.x = Math.PI / 2; ceil.position.set(GW * cs / 2, CFG.wallH, GH * cs / 2); scene.add(ceil);

let wallCount = 0;
grid.forEach(row => row.forEach(v => { if (v) wallCount++; }));
const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(cs, CFG.wallH, cs), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 }), wallCount);
{
  const m = new THREE.Matrix4(); let i = 0;
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) if (grid[r][c]) {
    const p = cellCenter(c, r); m.setPosition(p.x, CFG.wallH / 2, p.z); walls.setMatrixAt(i++, m);
  }
  scene.add(walls);
}

const PROP_STYLE = {
  desk: { h: 1.0, color: 0x6b5a45 }, bench: { h: 0.5, color: 0x4a5560 }, cabinet: { h: 2.1, color: 0x8e979e },
  table: { h: 0.9, color: 0x9aa5ab }, bed: { h: 0.55, color: 0xdfe6ea, blanket: 0x2e6f9e }, optable: { h: 0.9, color: 0xc9d1d6, blanket: 0x1f8a6a },
  gurney: { h: 0.8, color: 0xc9d1d6, blanket: 0x9a2a2a }, cart: { h: 0.9, color: 0xb0b8bd }, crate: { h: 1.1, color: 0x6d5a3a },
};
for (const p of PROPS) {
  const st = PROP_STYLE[p.kind], g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(p.sx, st.h, p.sz), new THREE.MeshStandardMaterial({ color: st.color, roughness: 0.6, metalness: p.kind === 'cabinet' ? 0.4 : 0.1 }));
  base.position.y = st.h / 2; g.add(base);
  if (st.blanket) {
    const long = p.sx >= p.sz;
    const bl = new THREE.Mesh(new THREE.BoxGeometry(long ? p.sx * 0.7 : p.sx * 0.92, 0.08, long ? p.sz * 0.92 : p.sz * 0.7), new THREE.MeshStandardMaterial({ color: st.blanket, roughness: 0.9 }));
    bl.position.set(long ? p.sx * 0.12 : 0, st.h + 0.04, long ? 0 : p.sz * 0.12); g.add(bl);
  }
  g.position.set(p.x, 0, p.z); scene.add(g);
}

scene.add(new THREE.AmbientLight(0x9aa8b8, 0.85));
scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x2a2222, 0.6));
const flashlight = new THREE.PointLight(0xfff0d0, 34, 24, 2);
camera.add(flashlight);
const muzzleLight = new THREE.PointLight(0xffa040, 0, 12, 2);
camera.add(muzzleLight);
const flicker = [];
[[25, 12], [95, 30], [150, 45], [75, 65], [30, 65], [75, 85], [118, 85]].forEach(([x, z], i) => {
  const l = new THREE.PointLight(0xdff0ff, 55, 42, 2); l.position.set(x, CFG.wallH - 0.6, z); scene.add(l);
  flicker.push({ l, base: 55, seed: i * 7.3 });
});
function updateFlicker(t) {
  for (const f of flicker) {
    const n = Math.sin(t * 13 + f.seed) * Math.sin(t * 5.1 + f.seed * 2);
    const out = Math.sin(t * 0.7 + f.seed) > 0.93;
    f.l.intensity = out ? f.base * 0.08 : f.base * (0.88 + 0.12 * n);
  }
}

{
  const free = [];
  for (let r = 1; r < GH - 1; r++) for (let c = 1; c < GW - 1; c++) if (!grid[r][c] && (c + r) % 2 === 0 && Math.random() > 0.22) free.push([c, r]);
  const panels = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.06, 0.7), new THREE.MeshBasicMaterial({ color: 0xeaf6ff }), free.length);
  const m = new THREE.Matrix4();
  free.forEach(([c, r], i) => { const p = cellCenter(c, r); m.setPosition(p.x, CFG.wallH - 0.04, p.z); panels.setMatrixAt(i, m); });
  scene.add(panels);
}

function makeLabel(text, color, w = 8) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const ctx = c.getContext('2d'); ctx.font = 'bold 60px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 16; ctx.fillText(text, 256, 84);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false }));
  s.scale.set(w, w / 4, 1); return s;
}
for (const [text, c, r, color] of ROOM_LABELS) {
  const l = makeLabel(text, color); l.position.set((c + 0.5) * cs, 3.7, (r + 0.5) * cs); scene.add(l);
}
const spawnPos = cellCenter(SPAWN.c, SPAWN.r);
{
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.6, 32), new THREE.MeshBasicMaterial({ color: 0x40a0ff, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(spawnPos.x, 0.02, spawnPos.z); scene.add(ring);
  const l = makeLabel('INICIO', '#40a0ff', 5); l.position.set(spawnPos.x, 2.9, spawnPos.z); scene.add(l);
}
const exW = (EXTRACT.c1 - EXTRACT.c0 + 1) * cs, exD = (EXTRACT.r1 - EXTRACT.r0 + 1) * cs;
const exCx = (EXTRACT.c0 * cs) + exW / 2, exCz = (EXTRACT.r0 * cs) + exD / 2;
{
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(exW, exD), new THREE.MeshBasicMaterial({ color: 0x1faa44, transparent: true, opacity: 0.45 }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(exCx, 0.03, exCz); scene.add(pad);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(exW, CFG.wallH, exD), new THREE.MeshBasicMaterial({ color: 0x2bff6a, transparent: true, opacity: 0.08, depthWrite: false }));
  beam.position.set(exCx, CFG.wallH / 2, exCz); scene.add(beam);
  const gl = new THREE.PointLight(0x33ff77, 60, 30, 2); gl.position.set(exCx, 3, exCz); scene.add(gl);
  const l = makeLabel('EXTRACCIÓN', '#33ff77'); l.position.set(exCx, 3.6, exCz); scene.add(l);
}

function collides(x, z, rad) {
  for (let r = cellOf(z - rad); r <= cellOf(z + rad); r++) {
    for (let c = cellOf(x - rad); c <= cellOf(x + rad); c++) {
      if (c < 0 || r < 0 || c >= GW || r >= GH || grid[r][c] === 1) {
        const nx = Math.max(c * cs, Math.min(x, (c + 1) * cs));
        const nz = Math.max(r * cs, Math.min(z, (r + 1) * cs));
        if ((x - nx) ** 2 + (z - nz) ** 2 < rad * rad) return true;
      }
    }
  }
  for (const p of PROPS) {
    const nx = Math.max(p.x - p.sx / 2, Math.min(x, p.x + p.sx / 2));
    const nz = Math.max(p.z - p.sz / 2, Math.min(z, p.z + p.sz / 2));
    if ((x - nx) ** 2 + (z - nz) ** 2 < rad * rad) return true;
  }
  return false;
}

function moveWithCollision(o, dx, dz, rad) {
  if (!collides(o.x + dx, o.z, rad)) o.x += dx;
  if (!collides(o.x, o.z + dz, rad)) o.z += dz;
}
function hasLOS(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
  if (d < 0.001) return true;
  const nx = -dz / d * 0.35, nz = dx / d * 0.35, steps = Math.ceil(d / 0.5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps, x = ax + dx * t, z = az + dz * t;
    if (solidAt(x, z) || solidAt(x + nx, z + nz) || solidAt(x - nx, z - nz)) return false;
  }
  return true;
}

const field = new Int16Array(GW * GH);
let lastPlayerCell = -1;
function computeField(pc, pr) {
  field.fill(-1);
  const q = [pr * GW + pc]; field[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const cur = q[h], c = cur % GW, r = (cur / GW) | 0;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= GW || nr >= GH || grid[nr][nc] || field[nr * GW + nc] >= 0) continue;
      field[nr * GW + nc] = field[cur] + 1; q.push(nr * GW + nc);
    }
  }
}

let actx = null;
const audio = () => (actx ||= new (window.AudioContext || window.webkitAudioContext)());
function noiseBurst(dur, freq, gain) {
  const a = audio(), n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
  const s = a.createBufferSource(); s.buffer = b;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = a.createGain(); g.gain.value = gain;
  s.connect(f); f.connect(g); g.connect(a.destination); s.start();
}
function tone(type, f0, f1, dur, gain) {
  const a = audio(), o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), a.currentTime + dur);
  g.gain.setValueAtTime(gain, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + dur);
}
const sfx = {
  shot: i => { noiseBurst(i ? 0.14 : 0.2, i ? 3500 : 2500, 0.5); tone('square', i ? 140 : 110, 40, 0.1, 0.12); },
  empty: () => tone('square', 900, 700, 0.05, 0.08),
  hit: () => noiseBurst(0.08, 1200, 0.5),
  die: () => tone('sawtooth', 160, 40, 0.6, 0.15),
  groan: () => tone('sawtooth', 90, 55, 0.7, 0.07),
  pickup: () => { tone('sine', 520, 520, 0.1, 0.15); setTimeout(() => tone('sine', 780, 780, 0.15, 0.15), 90); },
  over: () => tone('sawtooth', 220, 30, 1.2, 0.25),
  win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone('triangle', f, f, 0.3, 0.2), i * 140)),
};

let msgTimer = 0;
function showMsg(text, secs = 1.8) {
  const m = $('msg'); m.textContent = text; m.classList.add('show'); msgTimer = secs;
}
function updateHUD() {
  $('weapons').innerHTML = weapons.map((w, i) =>
    `<div class="slot ${i === cur ? 'active' : ''} ${w.ammo === 0 ? 'empty' : ''}">[${i + 1}] ${w.name}<span class="ammo">${w.ammo}</span></div>`).join('');
  $('zcount').textContent = zombies.filter(z => z.state !== 'dead').length;
  $('boost').textContent = P.boost > 0 ? `⚡ VELOCIDAD x${CFG.boostMult} (${P.boost.toFixed(1)}s)` : '';
}
const overlay = $('overlay'), ovTitle = $('ov-title'), ovText = $('ov-text'), ovBtn = $('ov-btn');
function showOverlay(title, text, btn, cls = '') {
  ovTitle.textContent = title; ovTitle.className = cls; ovText.textContent = text;
  ovBtn.textContent = btn; ovBtn.style.display = 'inline-block'; overlay.classList.remove('hidden');
  overlay.classList.toggle('start', title === 'OPERACIÓN EXTRACCIÓN');
}
const hideOverlay = () => overlay.classList.add('hidden');
const INTRO = 'Una infección tomó el Hospital San Lázaro. Cruza pasillos, habitaciones y el laboratorio hasta la bahía de extracción (verde).\n\nTu munición es limitada: recoge las cajas de munición que encuentres en el mapa.';

const P = { x: spawnPos.x, z: spawnPos.z, yaw: SPAWN.yaw, pitch: 0, boost: 0, bob: 0, moving: false };
let state = 'loading';
let cur = 0, switching = null, recoil = 0, lastShot = -1, flashT = 0;
const weapons = [];
const zombies = [];
const hitboxes = [];
const pickups = [];

function buildWeapons(gltfs) {
  CFG.weapons.forEach((cfg, i) => {

    const holder = new THREE.Group();
    const pivot = new THREE.Group();
    pivot.add(gltfs[i].scene);
    pivot.rotation.y = cfg.rotY || 0;
    holder.add(pivot);
    const box = new THREE.Box3();
    box.setFromObject(pivot);
    pivot.scale.setScalar(cfg.length / (box.max.z - box.min.z));
    box.setFromObject(pivot);
    const c = box.getCenter(new THREE.Vector3());
    pivot.position.set(-c.x, -c.y, cfg.rear - box.max.z);
    box.setFromObject(pivot);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, box.max.y - cfg.muzzleDrop * (box.max.y - box.min.y), box.min.z);
    holder.add(muzzle);
    holder.position.set(...cfg.pos);
    holder.visible = false;
    camera.add(holder);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
        const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#ffd060'); g.addColorStop(1, 'rgba(255,120,0,0)');
        x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })(),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    }));
    flash.scale.setScalar(0.22); flash.visible = false; muzzle.add(flash);
    weapons.push({ cfg, name: cfg.name, ammo: cfg.ammo, holder, flash });
  });
  weapons[0].holder.visible = true;
}

function selectWeapon(i) {
  if (state !== 'playing' || i === cur || switching) return;
  switching = { t: 0, to: i, done: false };
}

function updateWeaponView(dt) {
  recoil = Math.max(0, recoil - dt * 9);
  let drop = 0;
  if (switching) {
    switching.t += dt;
    const T = CFG.switchTime, half = T / 2;
    if (switching.t >= half && !switching.done) {
      weapons[cur].holder.visible = false; cur = switching.to; weapons[cur].holder.visible = true;
      switching.done = true; updateHUD();
    }
    drop = switching.t < half ? switching.t / half : Math.max(0, 1 - (switching.t - half) / half);
    if (switching.t >= T) switching = null;
  }
  const w = weapons[cur], b = P.moving ? Math.sin(P.bob) : 0;
  w.holder.position.set(
    w.cfg.pos[0] + (P.moving ? Math.cos(P.bob * 0.5) * 0.008 : 0),
    w.cfg.pos[1] + b * 0.008 - drop * 0.35,
    w.cfg.pos[2] + recoil * 0.07);
  w.holder.rotation.x = recoil * 0.12 - drop * 0.4;
  if (flashT > 0) { flashT -= dt; if (flashT <= 0) { w.flash.visible = false; muzzleLight.intensity = 0; } }
}

function shoot() {
  if (state !== 'playing' || switching) return;
  const w = weapons[cur], now = performance.now() / 1000;
  if (now - lastShot < w.cfg.cooldown) return;
  if (w.ammo <= 0) { sfx.empty(); showMsg('¡SIN MUNICIÓN! Busca una caja de munición', 1.4); return; }
  lastShot = now;
  w.ammo--;
  recoil = 1; flashT = 0.05; w.flash.visible = true; muzzleLight.intensity = 28;
  sfx.shot(cur);
  updateHUD();

  raycaster.setFromCamera(CENTER, camera);
  raycaster.far = CFG.shotRange;
  const hits = raycaster.intersectObjects(hitboxes, false);
  if (hits.length) {
    const h = hits[0];
    if (!wallBetween(h.distance)) hitZombie(h.object.userData.zombie);
  }
}
const raycaster = new THREE.Raycaster();
const CENTER = new THREE.Vector2(0, 0);
const _o = new THREE.Vector3(), _d = new THREE.Vector3();
function wallBetween(dist) {
  camera.getWorldPosition(_o); camera.getWorldDirection(_d);
  for (let t = 0.2; t < dist; t += 0.1) if (solidAt(_o.x + _d.x * t, _o.z + _d.z * t)) return true;
  return false;
}

function buildPickups() {
  AMMO_SPAWNS.forEach(([c, r]) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.38, 0.4), new THREE.MeshStandardMaterial({ color: 0x4b5d2a, roughness: 0.7 }));
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.42), new THREE.MeshStandardMaterial({ color: 0xffc400, emissive: 0x553f00 }));
    g.add(body, strip);
    const glow = new THREE.PointLight(0xffc400, 6, 5, 2); glow.position.y = 0.4; g.add(glow);
    const p = cellCenter(c, r); g.position.set(p.x, 0.9, p.z); scene.add(g);
    pickups.push({ type: 'ammo', mesh: g, x: p.x, z: p.z, taken: false });
  });
  BOOST_SPAWNS.forEach(([c, r]) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3), new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x007c8a, roughness: 0.3 }));
    const glow = new THREE.PointLight(0x00e5ff, 6, 5, 2); m.add(glow);
    const p = cellCenter(c, r); m.position.set(p.x, 1.0, p.z); scene.add(m);
    pickups.push({ type: 'boost', mesh: m, x: p.x, z: p.z, taken: false });
  });
}
function updatePickups(dt, t) {
  for (const p of pickups) {
    if (p.taken) continue;
    p.mesh.rotation.y += dt * 1.6; p.mesh.position.y = (p.type === 'ammo' ? 0.9 : 1.0) + Math.sin(t * 2 + p.x) * 0.08;
    if (Math.hypot(p.x - P.x, p.z - P.z) < 1.3) {
      p.taken = true; p.mesh.visible = false; sfx.pickup();
      if (p.type === 'ammo') {
        weapons.forEach(w => { w.ammo = Math.min(w.cfg.max, w.ammo + w.cfg.pick); });
        showMsg(`+${weapons[0].cfg.pick} balas pistola · +${weapons[1].cfg.pick} balas fusil`);
      } else { P.boost = CFG.boostSeconds; showMsg('¡POTENCIADOR DE VELOCIDAD!'); }
      updateHUD();
    }
  }
}

const zombieTypes = [];
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
const _Rm = new THREE.Quaternion(), _qb = new THREE.Quaternion();
const FLASH_COLOR = new THREE.Color(1, 0.15, 0.15);

function stripRootMotion(clip) {

  const c = clip.clone();
  c.tracks.forEach(tr => {
    if (!tr.name.endsWith('.position') || !/(Hips|Root|root)/.test(tr.name)) return;
    const v = tr.values, x0 = v[0], z0 = v[2];
    for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
  });
  return c;
}
function prepareZombieType(cfg, gltf) {
  const root = gltf.scene;
  root.traverse(o => {
    if (o.isMesh && o.material.isMeshBasicMaterial) {
      const m = o.material;
      o.material = new THREE.MeshStandardMaterial({ map: m.map, color: m.color.clone(), roughness: 0.9, metalness: 0,
        side: m.side, transparent: m.transparent, alphaTest: m.alphaTest });
    }
  });
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true);
  const h = box.max.y - box.min.y;
  const s = isFinite(h) && h > 0.01 ? cfg.height / h : 1;
  const yOff = isFinite(box.min.y) ? -box.min.y * s : 0;
  const find = name => gltf.animations.find(a => a.name === name) || gltf.animations[0];
  const idleClip = gltf.animations.length ? stripRootMotion(find(cfg.idle)) : null;
  const walkClip = gltf.animations.length ? stripRootMotion(find(cfg.walk)) : null;
  zombieTypes.push({ cfg, root, s, yOff, idleClip, walkClip });
}
const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };

function boneCtl(model, re) {
  if (!re) return null;
  let bone = null;
  model.traverse(o => { if (!bone && o.isBone && re.test(o.name)) bone = o; });
  if (!bone || !bone.parent) return null;
  const mqInv = model.getWorldQuaternion(new THREE.Quaternion()).invert();
  const bq = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(mqInv);
  const pqInv = bone.parent.getWorldQuaternion(new THREE.Quaternion()).premultiply(mqInv).invert();
  return { bone, bq, pqInv };
}
const setBone = (c, Rm) => { if (c) c.bone.quaternion.copy(c.pqInv).multiply(Rm).multiply(c.bq); };

function applyProcedural(z, moving, t) {
  const b = z.bones; if (!b) return;
  const ph = z.phase;
  if (b.armL || b.armR) {
    const droop = moving ? 0.12 : 0.35, sw = moving ? Math.sin(ph * 0.5) * 0.1 : Math.sin(t * 1.3 + z.phase) * 0.05;
    if (b.armL) { _Rm.setFromAxisAngle(AX, droop + sw); _qb.setFromAxisAngle(AY, -Math.PI / 2); setBone(b.armL, _Rm.multiply(_qb)); }
    if (b.armR) { _Rm.setFromAxisAngle(AX, droop - sw); _qb.setFromAxisAngle(AY, Math.PI / 2); setBone(b.armR, _Rm.multiply(_qb)); }
  }
  if (b.legL || b.legR) {
    const a = moving ? Math.sin(ph) * 0.6 : 0;
    if (b.legL) { _Rm.setFromAxisAngle(AX, a); setBone(b.legL, _Rm); }
    if (b.legR) { _Rm.setFromAxisAngle(AX, -a); setBone(b.legR, _Rm); }
  }
  if (b.spine) { _Rm.setFromAxisAngle(AX, moving ? 0.22 : 0.1); setBone(b.spine, _Rm); }
}

function spawnZombie(c, r, kind, typeIdx = 0) {
  const T = zombieTypes[typeIdx % zombieTypes.length], cfg = T.cfg;
  const p = cellCenter(c, r);
  const group = new THREE.Group(), fall = new THREE.Group();
  const model = cloneSkinned(T.root);
  model.scale.setScalar(T.s); model.position.y = T.yOff;
  const mats = [];
  model.traverse(o => {
    if (o.isMesh) {
      o.frustumCulled = false;
      o.material = o.material.clone();
      if (kind === 'r') o.material.color.multiply(new THREE.Color(1.0, 0.55, 0.5));
      o.material.userData.c0 = o.material.color.clone();
      mats.push(o.material);
    }
  });
  fall.add(model); group.add(fall);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(0.85, CFG.zombieHeight, 0.7), new THREE.MeshBasicMaterial({ visible: false }));
  hb.position.y = CFG.zombieHeight / 2; group.add(hb);
  group.position.set(p.x, 0, p.z);
  group.rotation.y = Math.random() * Math.PI * 2;
  scene.add(group);
  group.updateMatrixWorld(true);

  const bones = (cfg.arms || cfg.legs || cfg.spine) ? {
    armL: boneCtl(model, cfg.arms?.[0]), armR: boneCtl(model, cfg.arms?.[1]),
    legL: boneCtl(model, cfg.legs?.[0]), legR: boneCtl(model, cfg.legs?.[1]), spine: boneCtl(model, cfg.spine),
  } : null;

  let mixer = null, idleAct = null, walkAct = null;
  if (T.idleClip) {
    mixer = new THREE.AnimationMixer(model);
    idleAct = mixer.clipAction(T.idleClip); walkAct = mixer.clipAction(T.walkClip);
    idleAct.timeScale = cfg.idleRate || 1;
    idleAct.play(); idleAct.time = Math.random() * T.idleClip.duration;
  }
  const z = {
    group, fall, model, mats, hitbox: hb, x: p.x, z: p.z, hp: CFG.zombieHP, state: 'idle', T,
    speed: kind === 'r' ? CFG.runnerSpeed : CFG.zombieSpeed, detect: CFG.zombieDetect,
    phase: Math.random() * 6, deadT: 0, flash: 0, flashOn: false, yaw: group.rotation.y,
    bones, mixer, idleAct, walkAct,
  };
  hb.userData.zombie = z;
  zombies.push(z); hitboxes.push(hb);
  return z;
}

function startChase(z) {
  z.state = 'chasing'; sfx.groan();
  if (!z.mixer) return;
  const rate = (z.T.cfg.walkRate || 1) * z.speed / CFG.zombieSpeed;
  if (z.walkAct === z.idleAct) { z.idleAct.timeScale = rate; return; }
  z.idleAct.fadeOut(0.25);
  z.walkAct.reset().fadeIn(0.25).play();
  z.walkAct.timeScale = rate;
}

function animateZombie(z, dt, t, moving) {
  z.phase += moving ? dt * z.speed * 2.6 : dt * 1.3;
  if (z.mixer) z.mixer.update(dt);
  applyProcedural(z, moving, t);
  z.fall.position.y = !z.mixer && moving ? Math.abs(Math.sin(z.phase)) * 0.04 : 0;
}

function updateZombies(dt, t) {
  const pc = cellOf(P.x), pr = cellOf(P.z);
  if (pr * GW + pc !== lastPlayerCell) { lastPlayerCell = pr * GW + pc; computeField(pc, pr); }

  for (const z of zombies) {

    z.flash = Math.max(0, z.flash - dt);
    const on = z.flash > 0;
    if (on !== z.flashOn) { z.flashOn = on; for (const m of z.mats) m.color.copy(on ? FLASH_COLOR : m.userData.c0); }

    const dx = P.x - z.x, dz = P.z - z.z, dist = Math.hypot(dx, dz);
    z.group.visible = dist < 60;

    if (z.state === 'dead') {
      z.deadT += dt; const k = Math.min(1, z.deadT / 0.7);
      z.fall.rotation.x = -k * Math.PI / 2 * 0.98; z.fall.position.y = 0.17 * k;
      continue;
    }

    if (z.state === 'idle') {

      const steps = field[cellOf(z.z) * GW + cellOf(z.x)];
      if (dist < z.detect && steps >= 0 && steps * cs <= z.detect * 1.6) {
        startChase(z);
      } else {
        if (z.group.visible) animateZombie(z, dt, t, false);
        continue;
      }
    }

    let tx = P.x, tz = P.z;
    if (!hasLOS(z.x, z.z, P.x, P.z)) {
      const zc = cellOf(z.x), zr = cellOf(z.z), cur = field[zr * GW + zc];
      if (cur > 0) {
        let best = null, bv = cur;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nc = zc + dc, nr = zr + dr;
          if (nc < 0 || nr < 0 || nc >= GW || nr >= GH) continue;
          const v = field[nr * GW + nc];
          if (v >= 0 && v < bv) { bv = v; best = [nc, nr]; }
        }
        if (best) { const cc = cellCenter(best[0], best[1]); tx = cc.x; tz = cc.z; }
      }
    }
    let mx = tx - z.x, mz = tz - z.z; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;

    for (const o of zombies) {
      if (o === z || o.state !== 'chasing') continue;
      const ox = z.x - o.x, oz = z.z - o.z, od = Math.hypot(ox, oz);
      if (od > 0 && od < 0.8) { mx += ox / od * 0.6; mz += oz / od * 0.6; }
    }
    const l2 = Math.hypot(mx, mz) || 1;
    moveWithCollision(z, mx / l2 * z.speed * dt, mz / l2 * z.speed * dt, CFG.zombieRadius);
    z.yaw = angLerp(z.yaw, Math.atan2(mx, mz) + (z.T.cfg.yaw || 0), Math.min(1, dt * 8));
    z.group.rotation.y = z.yaw; z.group.position.set(z.x, 0, z.z);

    if (z.group.visible) animateZombie(z, dt, t, true);

    if (Math.hypot(P.x - z.x, P.z - z.z) < CFG.catchDist) { endGame('over'); return; }
  }
}

function hitZombie(z) {
  if (z.state === 'dead') return;
  z.hp -= 1;
  z.flash = 0.12;
  sfx.hit();
  const ch = $('crosshair'); ch.classList.add('hit'); setTimeout(() => ch.classList.remove('hit'), 120);
  if (z.hp <= 0) killZombie(z);
}
function killZombie(z) {
  z.state = 'dead'; z.deadT = 0;
  const i = hitboxes.indexOf(z.hitbox); if (i >= 0) hitboxes.splice(i, 1);
  sfx.die(); updateHUD();
}

function endGame(kind) {
  state = kind; document.exitPointerLock();
  if (kind === 'over') {
    sfx.over();
    showOverlay('GAME OVER', 'Un zombi te atrapó.\nLa partida ha terminado.', 'REINICIAR', 'bad');
  } else {
    sfx.win();
    showOverlay('¡MISIÓN COMPLETADA!', 'Has llegado a la zona de extracción', 'JUGAR DE NUEVO', 'good');
  }
}

function resetGame() {
  zombies.forEach(z => scene.remove(z.group)); zombies.length = 0; hitboxes.length = 0;
  ZOMBIE_SPAWNS.forEach(([c, r, k], i) => spawnZombie(c, r, k, i % zombieTypes.length));
  pickups.forEach(p => { p.taken = false; p.mesh.visible = true; });
  weapons.forEach(w => { w.ammo = w.cfg.ammo; w.holder.visible = false; w.flash.visible = false; });
  cur = 0; switching = null; recoil = 0; flashT = 0; muzzleLight.intensity = 0;
  weapons[0].holder.visible = true;
  Object.assign(P, { x: spawnPos.x, z: spawnPos.z, yaw: SPAWN.yaw, pitch: 0, boost: 0, bob: 0, moving: false });
  lastPlayerCell = -1; keys = {};
  state = 'ready';
  updateHUD();
}

let keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Digit1' || e.code === 'Numpad1') selectWeapon(0);
  if (e.code === 'Digit2' || e.code === 'Numpad2') selectWeapon(1);
  if (e.code === 'KeyR' && (state === 'over' || state === 'won')) {
    resetGame(); showOverlay('OPERACIÓN EXTRACCIÓN', INTRO, 'JUGAR');
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas || state !== 'playing') return;
  P.yaw -= e.movementX * 0.0022;
  P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - e.movementY * 0.0022));
});
document.addEventListener('mousedown', e => {
  if (e.button === 0 && document.pointerLockElement === canvas) shoot();
});
ovBtn.addEventListener('click', () => {
  if (state === 'over' || state === 'won') resetGame();
  if (state === 'ready' || state === 'paused') { try { audio().resume(); } catch (_) {} canvas.requestPointerLock(); }
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    if (state === 'ready' || state === 'paused') { state = 'playing'; hideOverlay(); }
  } else if (state === 'playing') {
    state = 'paused'; showOverlay('PAUSA', 'Haz clic para continuar', 'CONTINUAR');
  }
});

const mm = $('minimap'), mctx = mm.getContext('2d'), MS = 5;
const mmStatic = document.createElement('canvas'); mmStatic.width = GW * MS; mmStatic.height = GH * MS;
{
  const x = mmStatic.getContext('2d'); x.fillStyle = '#10141a'; x.fillRect(0, 0, mmStatic.width, mmStatic.height);
  x.fillStyle = '#6b7280';
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) if (grid[r][c]) x.fillRect(c * MS, r * MS, MS, MS);
  x.fillStyle = 'rgba(51,255,119,.7)';
  x.fillRect(EXTRACT.c0 * MS, EXTRACT.r0 * MS, (EXTRACT.c1 - EXTRACT.c0 + 1) * MS, (EXTRACT.r1 - EXTRACT.r0 + 1) * MS);
}
function drawMinimap() {
  mctx.drawImage(mmStatic, 0, 0);
  const px = P.x / cs * MS, pz = P.z / cs * MS;
  mctx.fillStyle = '#ffb300'; mctx.beginPath(); mctx.arc(px, pz, 3, 0, Math.PI * 2); mctx.fill();
  mctx.strokeStyle = '#ffb300'; mctx.beginPath(); mctx.moveTo(px, pz);
  mctx.lineTo(px - Math.sin(P.yaw) * 8, pz - Math.cos(P.yaw) * 8); mctx.stroke();
}

const clock = new THREE.Clock();
function update(dt, t) {

  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  let vx = -sy * f + cy * s, vz = -cy * f - sy * s;
  const len = Math.hypot(vx, vz); P.moving = len > 0;
  if (P.moving) {
    vx /= len; vz /= len;
    const sp = CFG.playerSpeed * (P.boost > 0 ? CFG.boostMult : 1);
    moveWithCollision(P, vx * sp * dt, vz * sp * dt, CFG.playerRadius);
    P.bob += dt * 10 * (P.boost > 0 ? 1.4 : 1);
  }
  if (P.boost > 0) { P.boost = Math.max(0, P.boost - dt); if (P.boost === 0) updateHUD(); }
  camera.position.set(P.x, CFG.eyeHeight + (P.moving ? Math.sin(P.bob) * 0.035 : 0), P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);

  updateWeaponView(dt);
  updatePickups(dt, t);
  updateZombies(dt, t);
  if (state !== 'playing') return;

  const c = cellOf(P.x), r = cellOf(P.z);
  if (c >= EXTRACT.c0 && c <= EXTRACT.c1 && r >= EXTRACT.r0 && r <= EXTRACT.r1) { endGame('won'); return; }
  if (Math.floor(t * 4) % 2 === 0) $('boost').textContent = P.boost > 0 ? `⚡ VELOCIDAD x${CFG.boostMult} (${P.boost.toFixed(1)}s)` : '';
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  updateFlicker(t);
  if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) $('msg').classList.remove('show'); }
  if (state === 'playing') update(dt, t);
  renderer.render(scene, camera);
  drawMinimap();
}

(async function init() {
  try {
    const loader = new GLTFLoader();
    const [g0, g1, ...gz] = await Promise.all([
      loader.loadAsync(CFG.weapons[0].file), loader.loadAsync(CFG.weapons[1].file),
      ...CFG.zombieTypes.map(t => loader.loadAsync(t.file)),
    ]);
    buildWeapons([g0, g1]);
    CFG.zombieTypes.forEach((cfg, i) => prepareZombieType(cfg, gz[i]));
    buildPickups();
    resetGame();
    camera.position.set(P.x, CFG.eyeHeight, P.z); camera.rotation.set(0, P.yaw, 0);
    showOverlay('OPERACIÓN EXTRACCIÓN', INTRO, 'JUGAR');
  } catch (err) {
    console.error(err);
    ovText.textContent = 'No se pudieron cargar los modelos GLB.\nAbre el juego desde un servidor local (no con doble clic en index.html).\n' +
      'Ejemplo:  python -m http.server 8000   →   http://localhost:8000\n\nDetalle: ' + err.message;
  }
  frame();
})();