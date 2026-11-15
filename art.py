#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
art.py · 크리스마스트리 코드 아트

터미널에서 3D 크리스마스 트리가 아래에서부터 조립되며 회전합니다.
    pip install numpy
    python3 art.py            # 조립 후 계속 회전 (Ctrl+C 로 종료)
    python3 art.py --loop     # 조립이 끝나면 처음부터 다시 반복

트루컬러(24bit)를 지원하는 터미널에서, 창을 110x54 이상으로 키우면 가장 예쁩니다.
"""
import math
import os
import shutil
import sys
import time

import numpy as np

# ── 0. 기본 설정 ─────────────────────────────────────────────
FPS = 30
BUILD_SEC = 10.5          # 조립에 걸리는 시간
SPIN_DEG = 17.7           # 초당 회전 각도
TILT = 0.22               # 카메라가 내려다보는 각도(rad)
RAMP = np.array(list(".:-=+*f%#0@"))
rng = np.random.default_rng(1225)

GREEN = (46, 170, 82)
LEAF = (120, 225, 135)
BROWN = (120, 78, 45)
WHITE = (240, 240, 240)
SILVER = (200, 205, 215)
GOLD = (245, 190, 60)
RED = (220, 50, 50)
BLUE = (70, 120, 235)
PINK = (255, 120, 170)
WARM = (255, 225, 150)
PURPLE = (130, 110, 220)

TREE, GLOW, HEART, STAR = 0, 1, 2, 3   # 점의 종류

# 조립 순서 (built 0~1 구간)
S_TRUNK, S_TREE, S_STAR, S_BALL, S_LIGHT, S_HEART, S_GIFT, S_SNOW = (
    0.00, 0.02, 0.45, 0.52, 0.62, 0.72, 0.78, 0.90)


class Scene:
    """3D 점 구름을 모아 두는 통"""

    def __init__(self):
        self.p, self.n, self.c, self.b, self.k = [], [], [], [], []

    def add(self, p, n, c, b, k=TREE):
        m = len(p)
        self.p.append(np.asarray(p, float))
        self.n.append(np.broadcast_to(np.asarray(n, float), (m, 3)))
        self.c.append(np.broadcast_to(np.asarray(c, float), (m, 3)))
        self.b.append(np.broadcast_to(np.asarray(b, float), (m,)))
        self.k.append(np.full(m, k))

    def done(self):
        self.p, self.n, self.c = (np.concatenate(a) for a in (self.p, self.n, self.c))
        self.b, self.k = np.concatenate(self.b), np.concatenate(self.k)
        self.ph = rng.uniform(0, 2 * np.pi, len(self.p))     # 반짝임 위상
        self.noise = rng.uniform(-0.08, 0.08, len(self.p))


sc = Scene()
Y0, Y1 = -1.0, 1.15       # 잎의 바닥 / 꼭대기
GROUND = -1.2
TIERS = 6


def radius(t):
    """높이 t(0~1)에서의 트리 반지름 — 층층이 톱니 모양"""
    f = (t * TIERS) % 1.0
    return (1.0 * (1 - t) + 0.03) * (1.09 - 0.20 * f)


# ── 1. 나무 기둥 ─────────────────────────────────────────────
n = 300
a = rng.uniform(0, 2 * np.pi, n)
y = rng.uniform(GROUND, Y0 + 0.05, n)
sc.add(np.c_[0.13 * np.cos(a), y, 0.13 * np.sin(a)],
       np.c_[np.cos(a), np.zeros(n), np.sin(a)], BROWN, S_TRUNK)

# ── 2. 잎 — 아래에서 위로 쌓인다 ─────────────────────────────
n = 9000
t = rng.uniform(0, 1, n) ** 1.25
a = rng.uniform(0, 2 * np.pi, n)
inner = np.where(rng.random(n) < 0.25, rng.uniform(0.55, 1, n), 1.0)
r = radius(t) * inner
f = (t * TIERS) % 1.0
mix = (np.clip(1 - f * 1.6, 0, 1) * 0.75 * inner)[:, None]   # 층 끝은 밝은 연두
col = np.array(GREEN) * (1 - mix) + np.array(LEAF) * mix
col = col * (0.55 + 0.45 * inner)[:, None]
nrm = np.c_[np.cos(a), np.full(n, 0.45), np.sin(a)]
nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
sc.add(np.c_[r * np.cos(a), Y0 + (Y1 - Y0) * t, r * np.sin(a)],
       nrm, col, S_TREE + (S_STAR - S_TREE) * t)

# ── 3. 별 — 꼭대기 ───────────────────────────────────────────
n = 700
a = rng.uniform(0, 2 * np.pi, n)
R_, r_ = 0.36, 0.15
phi = np.abs((a + np.pi / 5) % (2 * np.pi / 5) - np.pi / 5)
s5, c5 = math.sin(math.pi / 5), math.cos(math.pi / 5)
edge = R_ * r_ * s5 / (r_ * s5 * np.cos(phi) + (R_ - r_ * c5) * np.sin(phi))
rho = edge * np.sqrt(rng.uniform(0, 1, n))
u, v = rho * np.sin(a), rho * np.cos(a)            # 뾰족한 끝이 위로
cy_star = Y1 + 0.24
star = np.c_[u, cy_star + v, np.full(n, 0.3)]      # 항상 정면을 보는 별
shade = (1.0 - 0.35 * rho / R_)[:, None]
sc.add(star, (0, 0, 1), np.array(GOLD) * shade + np.array(WARM) * (1 - shade) * 0.6,
       S_STAR + (S_BALL - S_STAR) * (v - v.min()) / (v.max() - v.min()), STAR)

# ── 4. 오너먼트 — 빨강 · 금 · 은 · 파랑 ──────────────────────
BALLS = [RED, GOLD, SILVER, BLUE, RED]
NB = 36
for i in range(NB):
    t_ = rng.uniform(0.04, 0.9)
    a_ = rng.uniform(0, 2 * np.pi)
    r_b = radius(t_) * 0.98
    cen = np.array([r_b * np.cos(a_), Y0 + (Y1 - Y0) * t_ - 0.03, r_b * np.sin(a_)])
    d = rng.normal(size=(70, 3))
    d /= np.linalg.norm(d, axis=1, keepdims=True)
    sc.add(cen + 0.075 * d, d, BALLS[i % len(BALLS)],
           S_BALL + (S_LIGHT - S_BALL) * i / NB)

# ── 5. 전구 — 나선으로 감긴다 ────────────────────────────────
NL = 170
t = np.linspace(0.02, 0.96, NL)
a = t * 2 * np.pi * 7
r = radius(t) * 1.04
BULB = np.array([WARM, RED, GOLD, (120, 220, 255)])[np.arange(NL) % 4]
sc.add(np.c_[r * np.cos(a), Y0 + (Y1 - Y0) * t, r * np.sin(a)],
       np.c_[np.cos(a), np.zeros(NL), np.sin(a)], BULB,
       S_LIGHT + (S_HEART - S_LIGHT) * t, GLOW)

# ── 6. 하트 — 주변을 떠다닌다 ────────────────────────────────
NH = 16
t = rng.uniform(0.05, 0.95, NH)
a = rng.uniform(0, 2 * np.pi, NH)
r = radius(t) + rng.uniform(0.15, 0.45, NH)
sc.add(np.c_[r * np.cos(a), Y0 + (Y1 - Y0) * t, r * np.sin(a)],
       (0, 0, 1), PINK, np.linspace(S_HEART, S_GIFT, NH), HEART)

# ── 7. 선물 상자 — 리본 포함 ─────────────────────────────────
#        각도   거리   폭    높이   상자색   리본색
GIFTS = [(0.3, 1.25, .52, .42, RED, WHITE),
         (1.4, 1.35, .44, .32, GOLD, RED),
         (2.5, 1.20, .56, .38, WHITE, PINK),
         (3.6, 1.35, .46, .44, (60, 150, 90), GOLD),
         (4.6, 1.22, .42, .30, BLUE, SILVER),
         (5.5, 1.38, .50, .36, GOLD, RED)]
for gi, (ang, dist, wd, ht, box, rib) in enumerate(GIFTS):
    m = 900
    face = rng.integers(0, 5, m)                    # 옆면 4개 + 윗면
    p = rng.uniform(-0.5, 0.5, (m, 3))
    nr = np.zeros((m, 3))
    for fc, (ax, sg) in enumerate([(0, 1), (0, -1), (2, 1), (2, -1), (1, 1)]):
        sel = face == fc
        p[sel, ax] = 0.5 * sg
        nr[sel, ax] = sg
    ribbon = (np.abs(p[:, 0]) < 0.11) | (np.abs(p[:, 2]) < 0.11)
    col = np.where(ribbon[:, None], np.array(rib), np.array(box))
    tw = rng.uniform(0, np.pi)
    ca, sa = math.cos(tw), math.sin(tw)
    rot = lambda q: np.c_[q[:, 0] * ca + q[:, 2] * sa, q[:, 1], -q[:, 0] * sa + q[:, 2] * ca]
    hgt = (p[:, 1] + 0.5)
    q = rot(p * [wd, ht, wd])
    q += [dist * math.cos(ang), GROUND + ht / 2, dist * math.sin(ang)]
    b0 = S_GIFT + (S_SNOW - S_GIFT) * gi / len(GIFTS)
    sc.add(q, rot(nr), col, b0 + 0.02 * hgt)
    bow = rng.normal(size=(40, 3))                  # 리본 매듭
    bow /= np.linalg.norm(bow, axis=1, keepdims=True)
    cen = [dist * math.cos(ang), GROUND + ht + 0.03, dist * math.sin(ang)]
    sc.add(cen + bow * [0.09, 0.05, 0.09], bow, rib, b0 + 0.02)

sc.done()


# ── 8. 배경 — 별 · 행성 · 눈밭 (회전하지 않는다) ─────────────
def make_background(W, H):
    ch = np.full((H, W), " ")
    rgb = np.zeros((H, W, 3))
    yy, xx = np.mgrid[0:H, 0:W]

    # 희미한 성운 점들
    neb = (np.sin(xx * 0.11 + 1.3) * np.sin(yy * 0.33 + 2.1)
           + np.sin(xx * 0.045 + yy * 0.21) + 0.6 * np.sin(xx * 0.27 - yy * 0.4))
    dots = (neb > 0.75) & (rng.random((H, W)) < 0.55) & (yy < H * 0.78)
    ch[dots] = np.where(rng.random(dots.sum()) < 0.5, ".", ":")
    rgb[dots] = 62

    def planet(px, py, pr, color, ring=False, bands=0.0):
        dx, dy = (xx - px) / (2.0 * pr), (yy - py) / pr
        d2 = dx * dx + dy * dy
        nz = np.sqrt(np.clip(1 - d2, 0, 1))
        br = np.clip(0.25 + 0.75 * (-0.45 * dx - 0.5 * dy + 0.72 * nz), 0.12, 1)
        br = br * (1 + bands * np.sin(dy * 9 + dx * 2))
        body = d2 < 1
        if ring:                                    # 기울어진 고리
            cr, sr = math.cos(-0.35), math.sin(-0.35)
            u, v = dx * cr - dy * sr, (dx * sr + dy * cr) / 0.36
            rr = np.hypot(u, v)
            rg = (rr > 1.35) & (rr < 1.85)
            back = rg & ~body
            front = rg & (v > 0)
            ch[back | front] = "0"
            rgb[back] = np.array(SILVER) * 0.75
            body &= ~front
            rgb[front] = np.array(WHITE)
        idx = np.clip((br * len(RAMP)).astype(int), 0, len(RAMP) - 1)
        ch[body] = RAMP[idx][body]
        rgb[body] = (np.array(color) * np.clip(br, 0, 1)[..., None])[body]

    planet(W * 0.17, H * 0.16, max(2.5, H * 0.075), SILVER, ring=True)
    planet(W * 0.85, H * 0.17, max(2.2, H * 0.07), BLUE, bands=0.25)
    planet(W * 0.11, H * 0.52, max(1.3, H * 0.035), PURPLE)

    # 눈 덮인 바닥
    scale = H * 0.2545
    gy = H * 0.5645 + 1.2 * scale
    e = ((xx - W / 2) / (W * 0.49)) ** 2 + ((yy - gy - 1) / max(2.5, H * 0.085)) ** 2
    g = (e < 1) & (rng.random((H, W)) < 0.93)
    ch[g] = np.where(e[g] < 0.45, ":", ".")
    rgb[g] = (95 - 45 * e[g])[:, None]
    return ch, rgb


def make_extras(W, H):
    ns = max(40, W * H // 45)                        # 반짝이는 별
    stars = dict(x=rng.integers(0, W, ns), y=rng.integers(0, int(H * 0.86), ns),
                 br=rng.uniform(0.35, 1, ns), w=rng.uniform(1, 5, ns),
                 ph=rng.uniform(0, 6.28, ns),
                 ch=rng.choice(list("..·*"), ns))
    nf = max(30, W * H // 60)                        # 내리는 눈
    snow = dict(x=rng.uniform(0, W, nf), y=rng.uniform(0, H, nf),
                v=rng.uniform(3, 9, nf), ph=rng.uniform(0, 6.28, nf),
                ch=rng.choice(list("*.·"), nf), front=rng.random(nf) < 0.5,
                born=rng.uniform(S_SNOW, 1.0, nf))
    return stars, snow


# ── 9. 한 프레임 그리기 ──────────────────────────────────────
LIGHT = np.array([-0.45, 0.55, 0.70])
LIGHT /= np.linalg.norm(LIGHT)


def draw_snow(ch, rgb, snow, t, built, front, W, H):
    sel = (snow["front"] == front) & (snow["born"] <= built)
    if not sel.any():
        return
    x = (snow["x"][sel] + 1.5 * np.sin(t * 1.3 + snow["ph"][sel])).astype(int) % W
    y = ((snow["y"][sel] + snow["v"][sel] * t) % H).astype(int)
    ch[y, x] = snow["ch"][sel]
    rgb[y, x] = 235 if front else 170


def frame(t, built, W, H, bg, stars, snow):
    ch, rgb = bg[0].copy(), bg[1].copy()

    tw = stars["br"] * (0.65 + 0.35 * np.sin(t * stars["w"] + stars["ph"]))
    ch[stars["y"], stars["x"]] = stars["ch"]
    rgb[stars["y"], stars["x"]] = (235 * tw)[:, None]
    draw_snow(ch, rgb, snow, t, built, False, W, H)

    m = sc.b <= built
    p, nr, col, kind = sc.p[m], sc.n[m], sc.c[m], sc.k[m]
    ang = math.radians(SPIN_DEG * t)
    ca, sa = math.cos(ang), math.sin(ang)
    x = p[:, 0] * ca + p[:, 2] * sa
    z = -p[:, 0] * sa + p[:, 2] * ca
    flat = kind == STAR                                         # 별은 돌지 않는다
    x[flat], z[flat] = p[flat, 0], p[flat, 2]
    y = p[:, 1].copy()
    hearts = kind == HEART
    y[hearts] += 0.05 * np.sin(t * 2 + sc.ph[m][hearts])        # 둥실둥실
    ct, st = math.cos(TILT), math.sin(TILT)
    ys, depth = y * ct - z * st, z * ct + y * st

    scale = H * 0.2545
    sx = np.rint(W / 2 + x * scale * 2.1).astype(int)
    sy = np.rint(H * 0.5645 - ys * scale).astype(int)

    nx = nr[:, 0] * ca + nr[:, 2] * sa
    nz = -nr[:, 0] * sa + nr[:, 2] * ca
    br = 0.30 + 0.70 * np.clip(nx * LIGHT[0] + nr[:, 1] * LIGHT[1] + nz * LIGHT[2], 0, 1)
    br += sc.noise[m]
    glow = kind != TREE
    br[glow] = 0.80 + 0.20 * np.sin(t * 6 + sc.ph[m][glow])     # 반짝반짝
    br[flat] = 0.88 + 0.10 * math.sin(t * 3)
    col = col * np.clip(0.30 + 0.75 * br, 0, 1.05)[:, None]

    fresh = (built - sc.b[m] < 0.022) & (built < 1)             # 방금 쌓인 줄은 하얗게
    col[fresh] = WHITE
    br[fresh] = 1.0

    ok = (sx >= 0) & (sx < W) & (sy >= 0) & (sy < H)
    order = np.argsort(depth[ok], kind="stable")                # 먼 점부터 → 가까운 점이 덮는다
    sx, sy, br, col, kind = (v[ok][order] for v in (sx, sy, br, col, kind))
    glyph = RAMP[np.clip((br * len(RAMP)).astype(int), 0, len(RAMP) - 1)]
    glyph[kind == HEART] = "♥"
    ch[sy, sx] = glyph
    rgb[sy, sx] = col

    draw_snow(ch, rgb, snow, t, built, True, W, H)
    return ch, np.clip(rgb, 0, 255).astype(np.int32)


# ── 10. 터미널에 출력 ────────────────────────────────────────
def width(s):
    return sum(2 if ord(c) >= 0x1100 else 1 for c in s)


def bar(left, right, W):
    return left + " " * max(1, W - width(left) - width(right)) + right


def paint(ch, rgb, head, foot):
    key = ((rgb[..., 0] << 16) | (rgb[..., 1] << 8) | rgb[..., 2]).tolist()
    out = ["\x1b[H\x1b[38;2;130;130;140m", head, "\x1b[K\n"]
    for row, krow in zip(ch.tolist(), key):
        last = -1
        for c, k in zip(row, krow):
            if c == " ":
                out.append(" ")
                continue
            if k != last:
                out.append(f"\x1b[38;2;{k >> 16};{(k >> 8) & 255};{k & 255}m")
                last = k
            out.append(c)
        out.append("\x1b[0m\x1b[K\n")
    out.append(foot)
    sys.stdout.write("".join(out))
    sys.stdout.flush()


def main():
    loop = "--loop" in sys.argv
    if os.name == "nt":
        os.system("")                                # 윈도우 ANSI 켜기
    size = shutil.get_terminal_size((110, 54))
    W, H = max(40, min(size.columns - 1, 112)), max(20, min(size.lines - 4, 50))
    bg = make_background(W, H)
    stars, snow = make_extras(W, H)

    sys.stdout.write("\x1b[?1049h\x1b[?25l\x1b[2J")
    t0 = time.time()
    try:
        while True:
            t = time.time() - t0
            if loop and t > BUILD_SEC + 2.5:
                t0, t = time.time(), 0.0
            built = min(1.0, t / BUILD_SEC)
            ch, rgb = frame(t, built, W, H, bg, stars, snow)
            state = "done" if built >= 1 else "running"
            head = bar("art.py · 크리스마스트리 코드 아트", f"t {t:5.2f}s", W)
            foot = ("\x1b[38;2;110;110;120m"
                    f"spin {SPIN_DEG * t % 360:5.1f}°   built {built * 100:3.0f}%\x1b[K\n"
                    "\x1b[38;2;230;230;230m"
                    + bar("$ python3 art.py", f"\x1b[38;2;90;140;255m●\x1b[38;2;150;150;160m {state} · {FPS} fps", W + 38)
                    + "\x1b[0m\x1b[K")
            paint(ch, rgb, head, foot)
            time.sleep(max(0.0, 1 / FPS - (time.time() - t0 - t)))
    except KeyboardInterrupt:
        pass
    finally:
        sys.stdout.write("\x1b[0m\x1b[?25h\x1b[?1049l")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
