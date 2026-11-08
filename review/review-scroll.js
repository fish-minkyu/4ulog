/* ── 1. 성균관 명륜당 캔버스 장면 (review/성균관 명륜당.js 를 섹션 안에 끼워 넣도록 수정) ── */
(() => {
const sceneEl = document.getElementById('mnd-scene');
if (!sceneEl) return;
const cvs = document.getElementById('mnd-canvas');
const ctx = cvs.getContext('2d');
const copyEl = document.getElementById('mnd-copy');
const hintEl = document.getElementById('mnd-hint');
const btn = document.getElementById('mnd-sound');
const btnLabel = document.getElementById('mnd-soundLabel');
const JAMO = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'.split('');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 성균관은 유교 건물이라 화려한 금단청 대신 뇌록·석간주 위주의 절제된 단청
const DC = { green:'#4a7f62', brown:'#8a3d2a', cream:'#e8dfc8', dark:'#2a2c2e', wood:'#5b3a26' };

let W = 0, H = 0, dpr = 1, T = {}, sprites = null, roofCanvas = null, strands = [], leaves = [];
let L = {};
let gs = 11, seg = 13;

/* ---------- tokens & sprites ---------- */
function readTokens(){
  const s = getComputedStyle(sceneEl);
  const g = n => s.getPropertyValue(n).trim();
  T = { strand:g('--mnd2-strand'), thread:g('--mnd2-thread'), shadow:g('--mnd2-shadow'), roofShadow:g('--mnd2-roof-shadow'),
        accent:g('--mnd2-gold'), leaf:g('--mnd2-leaf'), leafEdge:g('--mnd2-leaf-edge'), seal:g('--mnd2-seal'),
        tileA:g('--mnd2-tile-a'), tileB:g('--mnd2-tile-b'), tileLine:g('--mnd2-tile-line'), ridge:g('--mnd2-ridge') };
}
function makeSprite(ch, color){
  const c = document.createElement('canvas');
  const box = gs * 1.5, px = Math.ceil(box * dpr);
  c.width = c.height = px;
  const x = c.getContext('2d');
  x.scale(px / box, px / box);
  x.fillStyle = color;
  x.font = `700 ${gs}px "Nanum Myeongjo","Noto Serif KR",serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(ch, box / 2, box / 2);
  return c;
}
function buildSprites(){
  sprites = { ink:{}, acc:{}, sh:{} };
  for (const ch of JAMO){
    sprites.ink[ch] = makeSprite(ch, T.strand);
    sprites.acc[ch] = makeSprite(ch, T.accent);
    sprites.sh[ch]  = makeSprite(ch, T.shadow);
  }
}

/* ---------- layout ---------- */
function computeLayout(){
  const narrow = W < 720;
  // 전체 폭 = RW * 1.22 (중앙 강당 + 좌우 익헌)
  const RW = narrow ? Math.min((W - 28) / 1.22, 360) : Math.max(300, Math.min(540, W * 0.36));
  const cx = narrow ? W / 2 : W * 0.58;
  const ey = Math.max(H * (narrow ? 0.18 : 0.26), 60 + RW * 0.3);
  let bottom = narrow ? H * 0.70 : H * 0.94;
  if (narrow){
    const top = copyEl.getBoundingClientRect().top - sceneEl.getBoundingClientRect().top;
    if (top > ey + 160) bottom = Math.min(bottom, top - 44);
  }
  gs = narrow ? 10 : 11.5;
  seg = narrow ? 12 : 13.5;
  L = { narrow, RW, cx, ey, bottom };
}

/* ---------- roof: 맞배지붕 강당 + 낮은 좌우 익헌 ---------- */
function gable(g, cx, ey, w, h, opt){
  const half = w/2, lift = w*0.055, flat = w*0.22, topY = ey - h, rHalf = half*0.95;
  const eave = x => { const d = Math.min(1, Math.max(0, (Math.abs(x-cx) - flat) / (half - flat))); return ey - lift * Math.pow(d, 2); };
  const bandTop = w*0.004, bandH = opt.bandH;
  const span = half * 0.96;

  // 가칠단청: 뇌록 띠
  g.beginPath();
  for (let x = cx - span; x <= cx + span; x += 2) g.lineTo(x, eave(x) + bandTop);
  for (let x = cx + span; x >= cx - span; x -= 2) g.lineTo(x, eave(x) + bandTop + bandH);
  g.closePath(); g.fillStyle = DC.green; g.fill();
  // 석간주 띠
  g.beginPath();
  for (let x = cx - span; x <= cx + span; x += 2) g.lineTo(x, eave(x) + bandTop + bandH);
  for (let x = cx + span; x >= cx - span; x -= 2) g.lineTo(x, eave(x) + bandTop + bandH*1.45);
  g.closePath(); g.fillStyle = DC.brown; g.fill();
  // 서까래 마구리 (무늬 없이 단색)
  const step = Math.max(6, opt.unit * 0.026), r = bandH * 0.3;
  g.fillStyle = DC.brown;
  for (let x = cx - span + step/2; x < cx + span; x += step){
    g.beginPath(); g.arc(x, eave(x) + bandTop + bandH*0.5, r, 0, Math.PI*2); g.fill();
  }
  g.strokeStyle = DC.cream; g.lineWidth = Math.max(0.6, bandH*0.06);
  g.beginPath();
  for (let x = cx - span; x <= cx + span; x += 2) g.lineTo(x, eave(x) + bandTop + bandH*0.92);
  g.stroke();

  // 지붕면 (앞에서 본 맞배: 거의 수직인 박공 끝)
  const roofPath = () => {
    g.beginPath();
    g.moveTo(cx - half, eave(cx - half));
    g.lineTo(cx - rHalf, topY);
    g.lineTo(cx + rHalf, topY);
    g.lineTo(cx + half, eave(cx + half));
    for (let x = cx + half; x >= cx - half; x -= 2) g.lineTo(x, eave(x));
    g.closePath();
  };
  const grad = g.createLinearGradient(0, topY, 0, ey);
  grad.addColorStop(0, T.tileB); grad.addColorStop(1, T.tileA);
  roofPath(); g.fillStyle = grad; g.fill();
  g.save(); roofPath(); g.clip();
  g.strokeStyle = T.tileLine; g.lineWidth = 1;
  for (let x = cx - half; x <= cx + half; x += Math.max(3.5, opt.unit*0.009)){
    g.beginPath(); g.moveTo(x, topY); g.lineTo(x, ey + 2); g.stroke();
  }
  g.restore();
  // 박공 (목부재)
  g.strokeStyle = DC.wood; g.lineWidth = Math.max(1.5, w*0.012); g.lineCap = 'butt';
  for (const s of [-1, 1]){
    g.beginPath(); g.moveTo(cx + s*half, eave(cx + s*half)); g.lineTo(cx + s*rHalf, topY); g.stroke();
  }
  // 처마 끝선 + 막새
  g.beginPath();
  for (let x = cx - half; x <= cx + half; x += 2) g.lineTo(x, eave(x));
  g.strokeStyle = DC.dark; g.lineWidth = opt.unit*0.012; g.lineCap = 'round'; g.stroke();
  g.fillStyle = 'rgba(228,223,210,.4)';
  for (let x = cx - half*0.97; x <= cx + half*0.97; x += Math.max(3.5, opt.unit*0.009)){
    g.beginPath(); g.arc(x, eave(x), Math.max(0.8, opt.unit*0.0026), 0, Math.PI*2); g.fill();
  }
  // 용마루
  const rr = rHalf + opt.unit*0.008;
  g.lineCap = 'round';
  g.strokeStyle = DC.dark; g.lineWidth = opt.unit*opt.ridge;
  g.beginPath(); g.moveTo(cx - rr, topY); g.lineTo(cx + rr, topY); g.stroke();
  g.strokeStyle = T.ridge; g.lineWidth = opt.unit*opt.ridge*0.45;
  g.beginPath(); g.moveTo(cx - rr, topY - opt.unit*0.004); g.lineTo(cx + rr, topY - opt.unit*0.004); g.stroke();
  if (opt.chwidu){
    g.fillStyle = DC.dark;
    for (const s of [-1, 1]){
      const x0 = cx + s*(rr + opt.unit*0.004), y0 = topY, u = opt.unit;
      g.beginPath();
      g.moveTo(x0 - s*u*0.014, y0 + u*0.01);
      g.lineTo(x0 + s*u*0.006, y0 + u*0.01);
      g.quadraticCurveTo(x0 + s*u*0.013, y0 - u*0.01, x0 + s*u*0.003, y0 - u*0.03);
      g.quadraticCurveTo(x0 - s*u*0.01, y0 - u*0.022, x0 - s*u*0.014, y0 - u*0.01);
      g.closePath(); g.fill();
    }
  }
  return { half, under: x => eave(x) + bandTop + bandH*1.45 };
}

function renderRoof(){
  const { RW, cx, ey } = L;
  const flat = document.createElement('canvas');
  flat.width = Math.ceil(W*dpr); flat.height = Math.ceil(H*dpr);
  const g = flat.getContext('2d'); g.scale(dpr, dpr);

  const wingW = RW*0.4, wingOff = RW*0.42;
  const wings = [-1, 1].map(s => gable(g, cx + s*wingOff, ey, wingW, RW*0.11, { unit:RW, bandH:RW*0.03, ridge:0.018 }));
  const mainEy = ey - RW*0.055;
  const main = gable(g, cx, mainEy, RW*0.66, RW*0.17, { unit:RW, bandH:RW*0.036, ridge:0.026, chwidu:true });

  roofCanvas = document.createElement('canvas');
  roofCanvas.width = flat.width; roofCanvas.height = flat.height;
  const r = roofCanvas.getContext('2d');
  r.shadowColor = T.roofShadow; r.shadowBlur = RW*0.05*dpr;
  r.shadowOffsetX = RW*0.025*dpr; r.shadowOffsetY = RW*0.05*dpr;
  r.drawImage(flat, 0, 0);

  L.span = wingOff + wingW/2 * 0.9;
  L.anchor = x => Math.abs(x - cx) < main.half * 0.95 ? main.under(x) : wings[x < cx ? 0 : 1].under(x);
}

/* ---------- strands (verlet) ---------- */
function buildStrands(){
  const { cx, bottom } = L;
  const half = L.span;
  const gap = L.narrow ? 12 : 14;
  const n = Math.max(8, Math.floor(2*half/gap) + 1);
  strands = [];
  for (let i = 0; i < n; i++){
    const x = cx - half + i * (2*half/(n-1));
    const ay = L.anchor(x) + 2;
    const len = Math.max(80, (bottom - ay) * (0.86 + 0.14 * (0.5 + 0.5*Math.sin(i*0.37 + 1.2))));
    const count = Math.max(5, Math.round(len / seg));
    const pts = [];
    for (let k = 0; k < count; k++) pts.push({ x, y: ay + k*seg, px: x, py: ay + k*seg });
    const chars = pts.map(() => JAMO[Math.floor(Math.random()*JAMO.length)]);
    strands.push({ x, ay, pts, chars, note: Math.round(i/(n-1) * 12),
      pan: Math.max(-0.8, Math.min(0.8, (x - cx) / half)), cool: 0, glow: 0, phase: i*0.61 });
  }
}

/* ---------- 은행잎 ---------- */
function spawnLeaf(l, initial){
  l.x = Math.random() * W;
  l.y = initial ? Math.random() * H : -20 - Math.random()*H*0.3;
  l.vx = 0; l.vy = 0;
  l.rot = Math.random() * Math.PI * 2; l.vr = (Math.random() - 0.5) * 0.02;
  l.size = (L.narrow ? 7 : 9) * (0.75 + Math.random()*0.6);
  l.sw = Math.random() * 6.28; l.fall = 0.35 + Math.random()*0.35;
  l.tone = Math.random();
}
function buildLeaves(){
  const n = reduce ? 6 : (L.narrow ? 14 : 22);
  leaves = Array.from({ length:n }, () => { const l = {}; spawnLeaf(l, true); return l; });
}
function stepLeaves(t, push){
  for (const l of leaves){
    if (!reduce){
      l.vx += Math.sin(t*0.9 + l.sw) * 0.012;
      l.vy += (l.fall - l.vy) * 0.03;
    }
    if (push){
      const d = distSeg(l.x, l.y, push.ax, push.ay, push.bx, push.by), R = 46;
      if (d < R){ const f = 1 - d/R; l.vx += push.mx*0.06*f; l.vy += push.my*0.06*f; l.vr += push.mx*0.002*f; }
    }
    l.vx *= 0.97; l.vy *= 0.985; l.vr *= 0.99;
    l.x += l.vx; l.y += reduce ? 0 : l.vy; l.rot += reduce ? 0 : l.vr + Math.sin(t*1.3 + l.sw)*0.006;
    if (l.y > H + 24 || l.x < -40 || l.x > W + 40) spawnLeaf(l, false);
  }
}
function drawLeaf(l){
  const s = l.size;
  ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot);
  // 부채꼴 은행잎 (가운데 갈라짐)
  ctx.beginPath();
  ctx.moveTo(0, s*0.55);
  ctx.lineTo(-s*0.95, -s*0.35);
  ctx.quadraticCurveTo(-s*0.55, -s*1.05, -s*0.08, -s*0.78);
  ctx.lineTo(0, -s*0.45);
  ctx.lineTo(s*0.08, -s*0.78);
  ctx.quadraticCurveTo(s*0.55, -s*1.05, s*0.95, -s*0.35);
  ctx.closePath();
  ctx.fillStyle = T.leaf; ctx.globalAlpha = 0.78 + l.tone*0.2; ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = T.leafEdge; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(0, s*0.55); ctx.lineTo(0, s*1.15); ctx.stroke();
  ctx.restore();
}

const ptr = { x:0, y:0, lx:0, ly:0, active:false };
function toLocal(e){
  const r = cvs.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function distSeg(px, py, ax, ay, bx, by){
  const dx = bx-ax, dy = by-ay, l2 = dx*dx + dy*dy;
  let t = l2 ? ((px-ax)*dx + (py-ay)*dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t*dx - px, qy = ay + t*dy - py;
  return Math.sqrt(qx*qx + qy*qy);
}

const GRAV = 0.32, DAMP = 0.982;
function physics(t, push){
  const R = L.narrow ? 30 : 26;
  const mvx = Math.max(-45, Math.min(45, push ? push.mx : 0));
  const mvy = Math.max(-45, Math.min(45, push ? push.my : 0));
  for (const s of strands){
    const pts = s.pts, n = pts.length;
    for (let i = 1; i < n; i++){
      const p = pts[i];
      const vx = (p.x - p.px) * DAMP, vy = (p.y - p.py) * DAMP;
      p.px = p.x; p.py = p.y;
      const wind = reduce ? 0 : (Math.sin(t*0.7 + s.phase*0.25)*0.6 + Math.sin(t*1.9 + s.phase)*0.4) * 0.014 * (i/n);
      p.x += vx + wind; p.y += vy + GRAV;
      if (push){
        const d = distSeg(p.x, p.y, push.ax, push.ay, push.bx, push.by);
        if (d < R){ const f = 1 - d/R; p.x += mvx*0.2*f; p.y += mvy*0.07*f; }
      }
    }
    for (let it = 0; it < 4; it++){
      pts[0].x = s.x; pts[0].y = s.ay;
      for (let i = 0; i < n-1; i++){
        const a = pts[i], b = pts[i+1];
        const dx = b.x-a.x, dy = b.y-a.y, d = Math.sqrt(dx*dx + dy*dy) || 0.001;
        const diff = (d - seg) / d;
        if (i === 0){ b.x -= dx*diff; b.y -= dy*diff; }
        else { a.x += dx*diff*0.5; a.y += dy*diff*0.5; b.x -= dx*diff*0.5; b.y -= dy*diff*0.5; }
      }
    }
    s.glow *= 0.955;
  }
  stepLeaves(t, push);
}

function crossings(push, now){
  const speed = Math.hypot(push.mx, push.my);
  if (speed < 0.6) return;
  const ym = (push.ay + push.by) / 2;
  let played = 0;
  for (const s of strands){
    const pts = s.pts;
    if (ym < s.ay || ym > pts[pts.length-1].y + 6) continue;
    let sx = pts[pts.length-1].x;
    for (let i = 0; i < pts.length-1; i++){
      const a = pts[i], b = pts[i+1];
      if (ym >= a.y && ym <= b.y){ const k = (ym - a.y) / ((b.y - a.y) || 1); sx = a.x + (b.x - a.x)*k; break; }
    }
    if ((push.ax - sx) * (push.bx - sx) <= 0 && push.ax !== push.bx){
      if (now - s.cool > 90){
        s.cool = now; s.glow = 1;
        if (played < 4){ pluck(s, speed); played++; }
      }
    }
  }
}

/* ---------- draw ---------- */
function draw(){
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const ox = L.RW*0.025, oy = L.RW*0.05;
  const box = gs*1.5, hb = box/2;
  for (const s of strands){
    const pts = s.pts;
    for (let i = 1; i < pts.length; i++)
      ctx.drawImage(sprites.sh[s.chars[i]], pts[i].x + ox - hb, pts[i].y + oy - hb, box, box);
  }
  if (roofCanvas) ctx.drawImage(roofCanvas, 0, 0, W, H);
  ctx.strokeStyle = T.thread; ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (const s of strands){
    const pts = s.pts;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
  for (const s of strands){
    const pts = s.pts;
    for (let i = 1; i < pts.length; i++){
      const ch = s.chars[i];
      const x = pts[i].x - hb, y = pts[i].y - hb;
      ctx.drawImage(sprites.ink[ch], x, y, box, box);
      if (s.glow > 0.03){
        ctx.globalAlpha = Math.min(1, s.glow * (0.4 + 0.6 * i / pts.length));
        ctx.drawImage(sprites.acc[ch], x, y, box, box);
        ctx.globalAlpha = 1;
      }
    }
    const a = pts[pts.length-2], b = pts[pts.length-1];
    const ang = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI/2;
    ctx.save(); ctx.translate(b.x, b.y + gs*0.7); ctx.rotate(ang);
    ctx.fillStyle = T.seal;
    ctx.beginPath(); ctx.moveTo(0, -2.6); ctx.lineTo(2.2, 0); ctx.lineTo(0, 2.6); ctx.lineTo(-2.2, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = T.seal; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-1, 2.5); ctx.lineTo(-1.4, 8); ctx.moveTo(0, 2.6); ctx.lineTo(0, 8.6); ctx.moveTo(1, 2.5); ctx.lineTo(1.4, 8); ctx.stroke();
    ctx.restore();
  }
  for (const l of leaves) drawLeaf(l);
}

/* ---------- audio: 가야금 (Karplus-Strong + 농현) ---------- */
let ac = null, master = null, soundOn = false, voices = 0;
const bufCache = new Map();
// 평조 (황·태·중·임·남) — 황종을 E♭으로 잡음
const PENT = [0, 2, 5, 7, 9];
function noteFreq(k){ const o = Math.floor(k/5), d = k % 5; return 155.56 * Math.pow(2, (o*12 + PENT[d]) / 12); }
function impulse(sec){
  const r = ac.sampleRate, len = Math.floor(r*sec), b = ac.createBuffer(2, len, r);
  for (let c = 0; c < 2; c++){ const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1) * Math.pow(1 - i/len, 3); }
  return b;
}
// 명주실을 손가락으로 뜯는 소리: 노이즈를 지연선에 넣고 평균 필터로 감쇠
function stringBuffer(k){
  if (bufCache.has(k)) return bufCache.get(k);
  const sr = ac.sampleRate, f = noteFreq(k);
  const N = Math.max(2, Math.round(sr / f));
  const dur = 3.2, len = Math.floor(sr * dur);
  const buf = ac.createBuffer(1, len, sr), out = buf.getChannelData(0);
  const ring = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++){ const n = Math.random()*2 - 1; prev = prev*0.55 + n*0.45; ring[i] = prev; } // 살을 뜯는 부드러운 어택
  // 뜯는 위치(줄 끝에서 1/7)로 배음 색깔 조절
  const pos = Math.max(1, Math.floor(N/7)), shaped = new Float32Array(N);
  for (let i = 0; i < N; i++) shaped[i] = ring[i] - 0.6*ring[(i + pos) % N];
  const decay = 0.9985 - Math.min(0.004, f / 600000);
  let idx = 0, peak = 0;
  for (let i = 0; i < len; i++){
    const a = shaped[idx], b = shaped[(idx + 1) % N];
    out[i] = a;
    shaped[idx] = (a*0.5 + b*0.5) * decay;
    idx = (idx + 1) % N;
    const v = Math.abs(a); if (v > peak) peak = v;
  }
  const g = 0.9 / (peak || 1);
  for (let i = 0; i < len; i++) out[i] *= g;
  const res = { buf, rate: f / (sr / N) };
  bufCache.set(k, res);
  return res;
}
function initAudio(){
  if (ac) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  comp.connect(ac.destination);
  // 오동나무 울림통 느낌: 저역 공명 + 고역 살짝 깎기
  const body = ac.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 280; body.Q.value = 1.1; body.gain.value = 5;
  const tone = ac.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 3800; tone.Q.value = 0.5;
  master = ac.createGain(); master.gain.value = 0.7;
  master.connect(body); body.connect(tone); tone.connect(comp);
  const conv = ac.createConvolver(); conv.buffer = impulse(2.4);
  const wet = ac.createGain(); wet.gain.value = 0.22;
  tone.connect(conv); conv.connect(wet); wet.connect(comp);
  for (let k = 0; k <= 12; k++) stringBuffer(k);
}
function pluck(s, speed){
  if (!ac || !soundOn || voices > 22) return;
  const t = ac.currentTime;
  const { buf, rate } = stringBuffer(s.note);
  const src = ac.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
  const amp = Math.min(1, 0.3 + speed/35) * 0.5;
  const gn = ac.createGain();
  gn.gain.setValueAtTime(amp, t);
  gn.gain.setTargetAtTime(0.0001, t + 1.6, 0.5);
  // 농현: 뜯은 뒤 왼손으로 줄을 눌러 흔드는 떨림
  const lfo = ac.createOscillator(); lfo.frequency.value = 4.6 + Math.random()*1.2;
  const depth = ac.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(0, t + 0.22);
  depth.gain.linearRampToValueAtTime(28 + Math.random()*22, t + 0.7);
  depth.gain.linearRampToValueAtTime(10, t + 2.6);
  lfo.connect(depth); depth.connect(src.detune);
  // 세게 쓸면 가끔 추성(밀어 올리기) 또는 퇴성(흘려 내리기)
  if (speed > 14 && Math.random() < 0.35){
    const up = Math.random() < 0.6;
    src.detune.setValueAtTime(0, t + 0.18);
    src.detune.linearRampToValueAtTime(up ? 200 : -100, t + 0.42);
  }
  let node = gn;
  if (ac.createStereoPanner){ const p = ac.createStereoPanner(); p.pan.value = s.pan; gn.connect(p); node = p; }
  src.connect(gn); node.connect(master);
  src.start(t); lfo.start(t);
  src.stop(t + 3.2); lfo.stop(t + 3.2);
  voices++; setTimeout(() => voices--, 3200);
}
function setSound(on){
  if (on){ initAudio(); if (!ac) return; ac.resume(); }
  soundOn = on;
  btn.setAttribute('aria-pressed', String(on));
  btnLabel.textContent = on ? '소리 켜짐' : '소리 켜기';
  hintEl.textContent = on ? '줄을 쓸어 보세요' : '화면을 한 번 누르면 소리가 켜집니다';
}
btn.addEventListener('click', e => { e.stopPropagation(); setSound(!soundOn); });

/* ---------- input ---------- */
window.addEventListener('pointermove', e => {
  const p = toLocal(e);
  ptr.x = p.x; ptr.y = p.y;
  if (!ptr.active){ ptr.active = true; ptr.lx = ptr.x; ptr.ly = ptr.y; }
}, { passive:true });
cvs.addEventListener('pointerdown', e => {
  if (!ac) setSound(true); else if (ac.state === 'suspended') ac.resume();
  const p = toLocal(e);
  ptr.x = ptr.lx = p.x; ptr.y = ptr.ly = p.y; ptr.active = true;
});
window.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') ptr.active = false; });
window.addEventListener('pointercancel', () => { ptr.active = false; });
document.addEventListener('pointerleave', () => { ptr.active = false; });
window.addEventListener('blur', () => { ptr.active = false; });

/* ---------- loop ---------- */
let acc = 0, last = performance.now(), simT = 0;
function frame(now){
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  acc += dt;
  let push = null;
  if (ptr.active){
    push = { ax:ptr.lx, ay:ptr.ly, bx:ptr.x, by:ptr.y, mx:ptr.x - ptr.lx, my:ptr.y - ptr.ly };
    if (push.mx || push.my) crossings(push, now);
    ptr.lx = ptr.x; ptr.ly = ptr.y;
  }
  let first = true;
  while (acc >= 1/60){
    simT += 1/60;
    physics(simT, first ? push : null);
    first = false; acc -= 1/60;
  }
  draw();
  requestAnimationFrame(frame);
}

/* ---------- setup ---------- */
function resize(){
  const rect = sceneEl.getBoundingClientRect();
  W = rect.width; H = rect.height;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cvs.width = Math.floor(W*dpr); cvs.height = Math.floor(H*dpr);
  readTokens(); computeLayout(); buildSprites(); renderRoof(); buildStrands(); buildLeaves();
}
function retheme(){ readTokens(); buildSprites(); renderRoof(); }
let rt;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', retheme);
new MutationObserver(retheme).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });

/* ---------- 재생지 섬유 질감 (이음매 없는 타일) ---------- */
function paperTexture(){
  const S = 420, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  // 미세한 얼룩 노이즈
  const img = g.createImageData(S, S), d = img.data;
  for (let i = 0; i < d.length; i += 4){
    const v = Math.random();
    if (v < 0.5){ d[i]=120; d[i+1]=96; d[i+2]=60; d[i+3]=Math.random()*14; }
    else { d[i]=255; d[i+1]=250; d[i+2]=236; d[i+3]=Math.random()*16; }
  }
  g.putImageData(img, 0, 0);
  const wrap = fn => { for (const ox of [-S,0,S]) for (const oy of [-S,0,S]){ g.save(); g.translate(ox, oy); fn(); g.restore(); } };
  const fiber = (col, w, lenMin, lenMax) => {
    const x = Math.random()*S, y = Math.random()*S, a = Math.random()*Math.PI*2;
    const len = lenMin + Math.random()*(lenMax - lenMin), bend = (Math.random()-0.5)*len*0.6;
    const ex = x + Math.cos(a)*len, ey = y + Math.sin(a)*len;
    const mx = (x+ex)/2 - Math.sin(a)*bend, my = (y+ey)/2 + Math.cos(a)*bend;
    wrap(() => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke(); });
  };
  g.lineCap = 'round';
  for (let i = 0; i < 520; i++) fiber(`rgba(122,96,58,${0.05 + Math.random()*0.08})`, 0.3 + Math.random()*0.6, 4, 22);
  for (let i = 0; i < 260; i++) fiber(`rgba(255,251,240,${0.25 + Math.random()*0.3})`, 0.4 + Math.random()*0.7, 5, 26);
  for (let i = 0; i < 26; i++) fiber(`rgba(150,120,80,${0.10 + Math.random()*0.08})`, 0.5, 30, 70);
  // 재생지 특유의 작은 티끌
  const flecks = ['rgba(90,80,70,.35)','rgba(120,110,95,.3)','rgba(150,95,60,.28)','rgba(95,105,120,.22)'];
  for (let i = 0; i < 70; i++){
    const x = Math.random()*S, y = Math.random()*S, r = 0.3 + Math.random()*1.1, col = flecks[i % flecks.length];
    wrap(() => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r, r*(0.4 + Math.random()*0.6), Math.random()*3, 0, Math.PI*2); g.fill(); });
  }
  try { sceneEl.style.setProperty('--mnd2-fiber', `url(${c.toDataURL('image/png')})`); } catch(e) {}
}
paperTexture();

resize();
if (!reduce) for (const s of strands){ const p = s.pts[s.pts.length-1]; p.px -= 6 * Math.sin(s.phase); }
requestAnimationFrame(frame);
if (document.fonts){
  document.fonts.load(`700 12px "Nanum Myeongjo"`, 'ㄱㅏ').then(() => { buildSprites(); }).catch(() => {});
  document.fonts.ready.then(() => resize()).catch(() => {});
}
})();

document.querySelectorAll('.carousel').forEach(c=>{
  const box=c.querySelector('.slides'), n=box.children.length,
        cnt=c.querySelector('.count'), dots=c.querySelector('.dots');
  dots.innerHTML='<i></i>'.repeat(n);
  const set=()=>{const i=Math.round(box.scrollLeft/box.clientWidth);
    cnt.textContent=(i+1)+' / '+n;
    [...dots.children].forEach((d,k)=>d.classList.toggle('on',k===i));};
  box.addEventListener('scroll',set,{passive:true}); set();
});
