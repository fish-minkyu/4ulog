/* 카세트 플레이어 동작 (버튼, 릴 회전, 테이프 교체, 재생) — TAPES 는 js/tapes.js 에 있음 */
(function () {
    const DECK = "./image/cassettePlayer/deck.jpg"; // 테이프를 뺀 빈 덱 그림 (버튼·액정·테두리)
    const IMG = TAPES[0].img;
    TAPES.forEach((tp) => {
        const i = new Image();
        i.src = tp.img;
        tp._pre = i;
    }); // 탭 바꿀 때 바로 보이도록 미리 받아 둠
    const W = 1502,
        H = 1047;
    const $ = (id) => document.getElementById(id);
    const stage = $("stage");
    $("base").src = DECK;
    const pct = (v, t) => (v / t) * 100 + "%";
    const poly = (pts) =>
        "polygon(" +
        pts.map(([x, y]) => pct(x, W) + " " + pct(y, H)).join(",") +
        ")";

    /* ---------- 카세트 칸: 덱 입구 안쪽만 보이게 자르고, 그 안에서 카세트가 빠지고 들어감 ---------- */
    const DOOR = [
        [32, 93],
        [1248, 93],
        [1248, 700],
        [32, 700],
    ]; // 카세트 칸
    const SHELL = [
        [32, 93],
        [1248, 93],
        [1248, 700],
        [32, 700],
    ]; // 테이프(칸 테두리까지 함께 움직임)
    const door = document.createElement("div");
    door.className = "layer door";
    door.style.clipPath = poly(DOOR);
    stage.appendChild(door);
    const cass = document.createElement("div");
    cass.className = "layer cass";
    cass.style.clipPath = poly(SHELL);
    door.appendChild(cass);
    const cassImgs = [];
    const cassImg = document.createElement("img");
    cassImg.src = IMG;
    cassImg.alt = "";
    cass.appendChild(cassImg);
    cassImgs.push(cassImg);

    /* ---------- 그림 위의 움직이는 부품 ---------- */
    const R = 76;
    function makeReel() {
        const d = document.createElement("div");
        d.className = "reel";
        const im = document.createElement("img");
        im.src = IMG;
        im.alt = "";
        cassImgs.push(im);
        d.appendChild(im);
        cass.appendChild(d);
        d._im = im;
        return d;
    }
    function posReel(d, [cx, cy]) {
        Object.assign(d.style, {
            left: pct(cx - R, W),
            top: pct(cy - R, H),
            width: pct(2 * R, W),
            height: pct(2 * R, H),
        });
        Object.assign(d._im.style, {
            width: (W / (2 * R)) * 100 + "%",
            left: (-(cx - R) / (2 * R)) * 100 + "%",
            top: (-(cy - R) / (2 * R)) * 100 + "%",
        });
    }
    const reelL = makeReel(),
        reelR = makeReel();

    const tapeCv = document.createElement("canvas");
    tapeCv.className = "layer";
    cass.appendChild(tapeCv);
    const tctx = tapeCv.getContext("2d");
    let HUB, WIN;
    // 테이프마다 릴·창 위치가 조금씩 달라서 테이프를 넣을 때마다 맞춤
    function fitTape(tp) {
        posReel(reelL, tp.reels[0]);
        posReel(reelR, tp.reels[1]);
        HUB = tp.reels[0];
        const [x0, y0, x1, y1] = tp.win;
        WIN = [
            [x0, y0],
            [x1, y0],
            [x1, y1],
            [x0, y1],
        ];
        tapeCv.style.clipPath = poly(WIN); // 테이프 결은 가운데 창 안에서만 보이게
    }
    fitTape(TAPES[0]);
    let rs = 12345;
    const rnd0 = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
    const STREAKS = Array.from({ length: 320 }, () => ({
        r: 110 + rnd0() * 260,
        a: rnd0() * Math.PI * 2,
        len: 0.04 + rnd0() * 0.3,
        w: 0.6 + rnd0() * 1.4,
        light: rnd0() < 0.4,
        o: 0.04 + rnd0() * 0.11,
    }));
    function sizeTape() {
        const dpr = window.devicePixelRatio || 1;
        tapeCv.width = Math.round(stage.clientWidth * dpr);
        tapeCv.height = Math.round(stage.clientHeight * dpr);
    }
    sizeTape();
    window.addEventListener("resize", sizeTape);
    function drawTape(deg) {
        const s = tapeCv.width / W;
        tctx.setTransform(1, 0, 0, 1, 0, 0);
        tctx.clearRect(0, 0, tapeCv.width, tapeCv.height);
        tctx.setTransform(s, 0, 0, s, 0, 0);
        tctx.save();
        tctx.beginPath();
        WIN.forEach(([x, y], i) => (i ? tctx.lineTo(x, y) : tctx.moveTo(x, y)));
        tctx.closePath();
        tctx.clip();
        tctx.translate(HUB[0], HUB[1]);
        tctx.rotate((deg * Math.PI) / 180);
        for (const k of STREAKS) {
            tctx.beginPath();
            tctx.arc(0, 0, k.r, k.a, k.a + k.len);
            tctx.lineWidth = k.w;
            tctx.strokeStyle = k.light
                ? `rgba(230,215,255,${k.o})`
                : `rgba(10,6,30,${k.o * 1.4})`;
            tctx.stroke();
        }
        tctx.restore();
    }

    // 오른쪽 위 표시등: 재생 중에만 켜짐
    [["off"], ["glow"]].forEach(([c]) => {
        const l = document.createElement("div");
        l.className = "lamp " + c;
        const r = c === "glow" ? 55 : 24;
        Object.assign(l.style, {
            left: pct(66 - r, W),
            top: pct(316 - r, H),
            width: pct(2 * r, W),
            height: pct(2 * r, H),
        });
        stage.appendChild(l);
    });

    function makeButton(points, label) {
        const clip = poly(points);
        const slot = document.createElement("div");
        slot.className = "layer slot";
        slot.style.clipPath = clip;
        const b = document.createElement("div");
        b.className = "layer btn";
        b.style.clipPath = clip;
        const im = document.createElement("img");
        im.src = DECK;
        im.alt = "";
        b.appendChild(im);
        const hit = document.createElement("button");
        hit.className = "hit";
        hit.type = "button";
        hit.setAttribute("aria-label", label);
        hit.style.clipPath = clip;
        stage.append(slot, b, hit);
        return { el: b, hit };
    }
    const REW = makeButton(
        [
            [198, 782],
            [501, 782],
            [503, 908],
            [198, 908],
        ],
        "되감기, 정지할 때까지 이전 곡으로 계속 이동",
    );
    const PLAY = makeButton(
        [
            [528, 782],
            [841, 782],
            [841, 908],
            [528, 908],
        ],
        "재생",
    );
    const STOP = makeButton(
        [
            [867, 782],
            [1139, 782],
            [1139, 908],
            [867, 908],
        ],
        "정지",
    );
    const FF = makeButton(
        [
            [1164, 782],
            [1433, 782],
            [1433, 908],
            [1164, 908],
        ],
        "빨리 감기, 정지할 때까지 다음 곡으로 계속 이동",
    );
    PLAY.hit.setAttribute("aria-pressed", "false");
    const EJECT = makeButton(
        [
            [1322, 122],
            [1424, 122],
            [1424, 219],
            [1322, 219],
        ],
        "테이프 꺼내기",
    );

    // 세로 액정
    const LCDBOX = [1300, 266, 1448, 572];
    const lcd = document.createElement("div");
    lcd.className = "lcd";
    Object.assign(lcd.style, {
        left: pct(LCDBOX[0], W),
        top: pct(LCDBOX[1], H),
        width: pct(LCDBOX[2] - LCDBOX[0], W),
        height: pct(LCDBOX[3] - LCDBOX[1], H),
    });
    lcd.innerHTML =
        '<span class="ls">SIDE</span><span class="lb" id="lcdSide">A</span><span class="ln" id="lcdTr">TR 01</span><span class="mq"><span id="lcdTitle"></span></span><span class="lt" id="lcdTime">0:00</span><span class="vu" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="lst" id="lcdState">STOP</span>';
    stage.appendChild(lcd);
    const vu = [...lcd.querySelectorAll(".vu i")];
    function setLcdTitle(s) {
        const el = $("lcdTitle");
        if (el.textContent === s) return;
        el.textContent = s;
        el.style.setProperty("--mqd", Math.max(5, s.length * 0.42) + "s");
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = ""; // 곡이 바뀌면 처음부터 다시 흐름
    }
    stage.addEventListener("contextmenu", (e) => e.preventDefault());

    /* ---------- 소리 ---------- */
    let ctx = null,
        out = null,
        noise = null,
        wow = null,
        hissG = null,
        rainG = null,
        whirNode = null;
    function initAudio() {
        if (ctx) {
            ctx.resume();
            return;
        }
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 3300;
        const g = ctx.createGain();
        g.gain.value = 0.55;
        lp.connect(g);
        g.connect(ctx.destination);
        out = lp;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.6;
        wow = ctx.createGain();
        wow.gain.value = 9;
        lfo.connect(wow);
        lfo.start();
        noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const mk = (type, f) => {
            const s = ctx.createBufferSource();
            s.buffer = noise;
            s.loop = true;
            const fl = ctx.createBiquadFilter();
            fl.type = type;
            fl.frequency.value = f;
            const gg = ctx.createGain();
            gg.gain.value = 0;
            s.connect(fl);
            fl.connect(gg);
            gg.connect(ctx.destination);
            s.start();
            return gg;
        };
        hissG = mk("highpass", 5000);
        rainG = mk("lowpass", 1400);
    }
    function burstNoise(t, type, f, q, v, d) {
        const s = ctx.createBufferSource();
        s.buffer = noise;
        const fl = ctx.createBiquadFilter();
        fl.type = type;
        fl.frequency.value = f;
        fl.Q.value = q;
        const g = ctx.createGain();
        g.gain.setValueAtTime(v, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + d);
        s.connect(fl);
        fl.connect(g);
        g.connect(ctx.destination);
        s.start(t, Math.random());
        s.stop(t + d + 0.02);
    }
    const clack = () => {
        initAudio();
        burstNoise(ctx.currentTime, "bandpass", 1600, 1.4, 0.6, 0.06);
    };
    // 테이프 끝: 모터가 걸리며 '툭' + 재생 버튼이 튀어오르는 '딸깍'
    function thunk() {
        initAudio();
        const t = ctx.currentTime;
        const o = ctx.createOscillator(),
            g = ctx.createGain();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
        g.gain.setValueAtTime(0.9, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.25);
        burstNoise(t, "lowpass", 700, 0.7, 0.8, 0.09);
        burstNoise(t + 0.11, "bandpass", 2200, 1.8, 0.45, 0.04);
    }
    function whirStart() {
        initAudio();
        whirStop();
        const s = ctx.createBufferSource();
        s.buffer = noise;
        s.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.Q.value = 6;
        const t = ctx.currentTime;
        f.frequency.setValueAtTime(450, t);
        f.frequency.linearRampToValueAtTime(1250, t + 0.9);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.11, t + 0.08);
        s.connect(f);
        f.connect(g);
        g.connect(ctx.destination);
        s.start(t);
        whirNode = { s, g };
    }
    function whirStop() {
        if (!whirNode) return;
        const w = whirNode;
        whirNode = null;
        w.g.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
        w.s.stop(ctx.currentTime + 0.2);
    }
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

    function melodyFor(tr) {
        let s = tr.seed * 99991;
        const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
        const mel = [];
        let last = tr.prog[0][1] + 12;
        for (let b = 0; b < 8; b++) {
            const pool = tr.prog[b % 4]
                .map((m) => m + 12)
                .concat(tr.prog[b % 4].slice(0, 2).map((m) => m + 24));
            const row = [];
            for (let e = 0; e < 8; e++) {
                if (r() < tr.density * (e % 2 ? 0.75 : 1.15)) {
                    pool.sort(
                        (a, c) => Math.abs(a - last) - Math.abs(c - last),
                    );
                    last =
                        pool[
                            Math.min(pool.length - 1, Math.floor(r() * r() * 4))
                        ];
                    row.push(last);
                } else row.push(null);
            }
            mel.push(row);
        }
        return mel;
    }
    TAPES.forEach((tp) =>
        tp.tracks.forEach((t) => {
            if (t.prog) {
                t.mel = melodyFor(t);
                t.dur = t.bars * 8 * (60 / t.bpm / 2);
            }
        }),
    );

    function Synth(tr, offset) {
        const E = 60 / tr.bpm / 2,
            total = tr.bars * 8;
        const bus = ctx.createGain();
        bus.connect(out);
        let step = Math.floor(offset / E),
            nextT = ctx.currentTime + 0.1,
            done = false,
            timer;
        const t0 = ctx.currentTime + 0.1 - step * E;
        const tone = (m, t, dur, type, vol) => {
            const o = ctx.createOscillator();
            o.type = type;
            o.frequency.value = mtof(m);
            wow.connect(o.detune);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(
                vol,
                t + Math.min(0.08, dur * 0.3),
            );
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g);
            g.connect(bus);
            o.start(t);
            o.stop(t + dur + 0.05);
        };
        const kick = (t) => {
            const o = ctx.createOscillator(),
                g = ctx.createGain();
            o.frequency.setValueAtTime(110, t);
            o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
            g.gain.setValueAtTime(0.5, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            o.connect(g);
            g.connect(bus);
            o.start(t);
            o.stop(t + 0.32);
        };
        const nz = (t, type, f, v, d) => {
            const s = ctx.createBufferSource();
            s.buffer = noise;
            const fl = ctx.createBiquadFilter();
            fl.type = type;
            fl.frequency.value = f;
            const g = ctx.createGain();
            g.gain.setValueAtTime(v, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + d);
            s.connect(fl);
            fl.connect(g);
            g.connect(bus);
            s.start(t, Math.random());
            s.stop(t + d + 0.02);
        };
        function sched(st, t) {
            const bar = Math.floor(st / 8),
                e = st % 8,
                ch = tr.prog[bar % 4];
            const outro = bar >= tr.bars - 2,
                intro = bar < 2;
            if (e === 0) {
                ch.forEach((m) => {
                    tone(m, t, E * 7.9, "triangle", 0.042);
                    tone(m + 12, t, E * 7.2, "sine", 0.016);
                });
                tone(ch[0] - 12, t, E * 3, "sine", 0.22);
            }
            if (e === 5 && !outro) tone(ch[0] - 12, t, E * 2.5, "sine", 0.15);
            if (!intro && !outro) {
                if (tr.kick.includes(e)) kick(t);
                if (tr.snare.includes(e)) nz(t, "bandpass", 1800, 0.18, 0.12);
                nz(
                    t + (e % 2 ? E * 0.12 : 0),
                    "highpass",
                    7000,
                    e % 2 ? tr.hat : tr.hat * 0.6,
                    0.05,
                );
                const n = tr.mel[bar % 8][e];
                if (n && bar >= 4) {
                    tone(
                        n,
                        t,
                        E * 1.8,
                        tr.lead,
                        tr.lead === "square" ? 0.022 : 0.05,
                    );
                    tone(n, t, E * 1.8, "sine", 0.045);
                }
            }
        }
        timer = setInterval(() => {
            while (!done && nextT < ctx.currentTime + 0.15) {
                if (step >= total) {
                    done = true;
                    break;
                }
                sched(step, nextT);
                nextT += E;
                step++;
            }
            if (done && ctx.currentTime >= nextT + E * 2) {
                clearInterval(timer);
                api.onend && api.onend();
            }
        }, 25);
        const api = {
            elapsed: () => Math.max(0, Math.min(tr.dur, ctx.currentTime - t0)),
            stop() {
                clearInterval(timer);
                bus.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
                setTimeout(() => bus.disconnect(), 400);
                hissG.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
                rainG.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
            },
        };
        return api;
    }
    /* 실제 노래 재생: 하나의 audio 요소를 계속 재사용해야 휴대폰에서도 자동으로 다음 곡이 이어짐 */
    const audioEl = new Audio();
    audioEl.preload = "auto";
    audioEl.setAttribute("playsinline", "");
    const urlCache = {};
    let selfPause = false;
    function songURL(tr) {
        if (tr.src) return tr.src;
        if (urlCache[tr.data]) return urlCache[tr.data];
        const bin = atob(document.getElementById(tr.data).textContent.trim());
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return (urlCache[tr.data] = URL.createObjectURL(
            new Blob([u8], { type: "audio/mp4" }),
        ));
    }
    function FilePlayer(tr, offset) {
        const a = audioEl,
            url = songURL(tr);
        let alive = true;
        const onEnd = () => {
            if (!alive) return;
            alive = false;
            cleanup();
            api.onend && api.onend();
        };
        const onMeta = () => {
            if (offset > 0)
                try {
                    a.currentTime = offset;
                } catch (_) {}
        };
        function cleanup() {
            a.removeEventListener("ended", onEnd);
            a.removeEventListener("loadedmetadata", onMeta);
        }
        a.addEventListener("ended", onEnd);
        if (a.src !== url) {
            a.src = url;
            a.addEventListener("loadedmetadata", onMeta, { once: true });
        } else {
            try {
                a.currentTime = offset;
            } catch (_) {}
        }
        a.play().catch(() => {});
        const api = {
            file: true,
            elapsed: () =>
                a.currentTime > 0 || !offset ? a.currentTime : offset,
            stop() {
                alive = false;
                cleanup();
                if (!a.paused) {
                    selfPause = true;
                    a.pause();
                }
                if (ctx) hissG.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
            },
        };
        return api;
    }
    // 잠금화면·이어폰 등 바깥에서 멈췄을 때 데크도 같이 멈춤
    audioEl.addEventListener("pause", () => {
        if (selfPause) {
            selfPause = false;
            return;
        }
        if (engine && engine.file && !audioEl.ended) stop();
    });

    /* ---------- 데크 상태 ---------- */
    let tapeIdx = 0,
        TRACKS = TAPES[0].tracks,
        LAST = TRACKS.length - 1,
        busy = false;
    let idx = 0,
        offset = 0,
        playing = false,
        engine = null;
    let wind = 0; // -1 되감는 중, +1 감는 중, 0 정지
    let resumeT = null;
    const fmt = (s) => {
        s = Math.max(0, Math.round(s || 0));
        return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    };
    const atTapeEnd = () => idx === LAST && offset >= TRACKS[LAST].dur - 0.05;

    const list = $("list");
    function renderList() {
        list.innerHTML = "";
        if (!loaded) {
            list.innerHTML =
                '<li class="empty">데크가 비어 있어요. 위에서 테이프를 골라 넣어 주세요.</li>';
            $("meta").textContent = "";
            $("side").textContent = "–";
            $("tapeName").textContent = "테이프 없음";
            $("title").textContent = "테이프 없음";
            $("artist").textContent = "탭을 누르면 테이프가 들어가요";
            $("count").textContent = "-- / --";
            $("dur").textContent = "--:--";
            $("lcdTr").textContent = "TR --";
            $("lcdSide").textContent = "-";
            setLcdTitle("NO TAPE");
            return;
        }
        TRACKS.forEach((t, i) => {
            const li = document.createElement("li");
            const b = document.createElement("button");
            b.type = "button";
            b.className = "track";
            b.innerHTML = `<span class="no"><span class="num">${String(i + 1).padStart(2, "0")}</span><span class="eq" aria-hidden="true"><i></i><i></i><i></i></span></span><span class="name"><span class="t"></span><span class="ar"></span></span><span class="len">${t.dur ? fmt(t.dur) : "--:--"}</span>`;
            b.querySelector(".t").textContent = t.title;
            b.querySelector(".ar").textContent = t.artist || "";
            b.addEventListener("click", () => {
                clack();
                selectAndPlay(i);
            });
            li.appendChild(b);
            list.appendChild(li);
        });
        const tot = TRACKS.reduce((a, t) => a + (t.dur || 0), 0);
        $("meta").textContent = `${TRACKS.length} SONGS · ${fmt(tot)}`;
        $("side").textContent = TAPES[tapeIdx].side;
        $("tapeName").textContent = TAPES[tapeIdx].title || TAPES[tapeIdx].name;
        renderNow();
    }
    function renderNow() {
        const t = TRACKS[idx];
        $("title").textContent = t.title;
        $("artist").textContent = t.artist || "";
        if ("mediaSession" in navigator && window.MediaMetadata) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: t.title,
                    artist: t.artist || "",
                    album: "B SIDE",
                });
            } catch (_) {}
        }
        $("count").textContent =
            String(idx + 1).padStart(2, "0") +
            " / " +
            String(TRACKS.length).padStart(2, "0");
        $("lcdTr").textContent = "TR " + String(idx + 1).padStart(2, "0");
        $("lcdSide").textContent = TAPES[tapeIdx].side;
        setLcdTitle(t.artist ? t.title + "  ·  " + t.artist : t.title);
        $("dur").textContent = t.dur ? fmt(t.dur) : "--:--";
        list.querySelectorAll(".track").forEach((b, i) =>
            b.setAttribute("aria-current", i === idx ? "true" : "false"),
        );
    }
    function setLabel(txt) {
        const empty = !loaded && !txt;
        $("state").textContent =
            txt ||
            (empty
                ? "Empty"
                : wind < 0
                  ? "Rewind"
                  : wind > 0
                    ? "Fast Fwd"
                    : playing
                      ? "Play"
                      : "Stop");
        $("lcdState").textContent = txt
            ? txt.toUpperCase()
            : empty
              ? "NO TAPE"
              : wind < 0
                ? "◀◀ REW"
                : wind > 0
                  ? "FF ▶▶"
                  : playing
                    ? "▶ PLAY"
                    : "■ STOP";
        lcd.classList.toggle("blink", !!txt || !!wind);
        const on = playing && !wind;
        $("led").classList.toggle("on", on);
        document.body.classList.toggle("playing", on);
    }
    function latchPlay(on) {
        PLAY.el.classList.toggle("down", on);
        PLAY.hit.setAttribute("aria-pressed", String(on));
    }

    function startEngine() {
        const tr = TRACKS[idx];
        engine = tr.src || tr.data ? FilePlayer(tr, offset) : Synth(tr, offset);
        engine.onend = () => {
            engine = null;
            if (idx === LAST) {
                offset = TRACKS[LAST].dur;
                tapeEnd();
            } else {
                idx++;
                offset = 0;
                renderNow();
                startEngine();
            }
        };
    }
    function haltEngine() {
        if (engine) {
            offset = engine.elapsed();
            engine.onend = null;
            engine.stop();
            engine = null;
        }
    }

    /* 버튼 눌림: 짧게 탭해도 눈에 보이도록 최소 0.18초는 내려가 있음 */
    function tapPress(B) {
        const t0 = performance.now();
        B.el.classList.add("down");
        const up = () => {
            setTimeout(
                () => {
                    if (B !== windBtn && !(B === PLAY && playing))
                        B.el.classList.remove("down");
                },
                Math.max(0, 180 - (performance.now() - t0)),
            );
            B.hit.removeEventListener("pointerup", up);
            B.hit.removeEventListener("pointercancel", up);
        };
        B.hit.addEventListener("pointerup", up);
        B.hit.addEventListener("pointercancel", up);
    }

    // 테이프 끝(또는 처음)에 닿음: '툭' 하고 눌려 있던 버튼이 튀어오르며 멈춤
    function tapeEnd() {
        clearTimeout(resumeT);
        haltEngine();
        unlatchWind();
        thunk();
        playing = false;
        latchPlay(false);
        setLabel(idx === 0 && offset === 0 ? "Tape start" : "Tape end");
    }

    function play() {
        initAudio();
        if (busy) return;
        if (!loaded) {
            setTimeout(() => latchPlay(false), 150);
            noTape();
            return;
        }
        if (wind) unlatchWind(); // 감던 버튼이 풀리고 재생으로
        if (playing) return;
        if (atTapeEnd()) {
            latchPlay(true);
            setTimeout(() => {
                latchPlay(false);
                thunk();
                setLabel("Tape end");
            }, 110);
            return;
        }
        playing = true;
        latchPlay(true);
        startEngine();
        setLabel();
    }
    function stop() {
        clearTimeout(resumeT);
        unlatchWind();
        haltEngine();
        playing = false;
        latchPlay(false);
        setLabel();
    }
    function selectAndPlay(i) {
        if (busy || !loaded) return;
        initAudio();
        clearTimeout(resumeT);
        unlatchWind();
        haltEngine();
        const dir = i >= idx ? 1 : -1;
        idx = i;
        offset = 0;
        renderNow();
        playing = true;
        latchPlay(true);
        setLabel();
        spin = 7 * dir;
        whirStart();
        setTimeout(whirStop, 350);
        resumeT = setTimeout(() => {
            if (playing && !engine) startEngine();
        }, 350);
    }

    /* 감기: ◀◀ / ▶▶ 를 누르면 버튼이 내려간 채 걸리고,
     ■ 정지나 ▶ 재생을 누를 때까지(또는 테이프 끝까지) 계속 곡을 넘김 */
    const FIRST_MS = 380,
        STEP_MS = 650;
    let windTimer = null,
        windSteps = 0,
        windBtn = null;
    function windStep() {
        if (wind > 0) {
            if (idx === LAST) {
                offset = TRACKS[LAST].dur;
                tapeEnd();
                return false;
            }
            idx++;
            offset = 0;
        } else {
            if (windSteps === 0 && offset > 3) {
                offset = 0;
            } // 곡 중간이면 먼저 이 곡 처음으로
            else if (idx === 0) {
                offset = 0;
                tapeEnd();
                return false;
            } else {
                idx--;
                offset = 0;
            }
        }
        windSteps++;
        renderNow();
        return true;
    }
    function latchWind(dir, B) {
        initAudio();
        clack();
        if (busy) return;
        if (!loaded) {
            noTape();
            return;
        }
        if (wind === dir) return;
        unlatchWind();
        clearTimeout(resumeT);
        if (playing) {
            haltEngine();
            playing = false;
            latchPlay(false);
        } // 감기를 누르면 재생 버튼은 튀어오름
        if (dir > 0 && atTapeEnd()) {
            B.el.classList.add("down");
            setTimeout(() => {
                B.el.classList.remove("down");
                thunk();
            }, 110);
            return;
        }
        wind = dir;
        windBtn = B;
        windSteps = 0;
        B.el.classList.add("down");
        whirStart();
        setLabel();
        const tick = () => {
            if (windStep()) windTimer = setTimeout(tick, STEP_MS);
        };
        windTimer = setTimeout(tick, FIRST_MS);
    }
    function unlatchWind() {
        if (!wind) return;
        clearTimeout(windTimer);
        windTimer = null;
        if (windBtn) windBtn.el.classList.remove("down");
        windBtn = null;
        wind = 0;
        whirStop();
        setLabel();
    }

    function bindPress(B, fn) {
        B.hit.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            tapPress(B);
            fn();
        });
        B.hit.addEventListener("keydown", (e) => {
            if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
                e.preventDefault();
                B.el.classList.add("down");
                setTimeout(() => {
                    if (B !== windBtn && !(B === PLAY && playing))
                        B.el.classList.remove("down");
                }, 180);
                fn();
            }
        });
    }
    bindPress(REW, () => latchWind(-1, REW));
    bindPress(FF, () => latchWind(1, FF));
    bindPress(PLAY, () => {
        clack();
        play();
    });
    bindPress(STOP, () => {
        clack();
        stop();
    });
    EJECT.hit.addEventListener("click", ejectButton);

    document.addEventListener("keydown", (e) => {
        if (e.target.closest && e.target.closest("button")) return;
        if (e.repeat) return;
        if (e.code === "Space") {
            e.preventDefault();
            clack();
            playing || wind ? stop() : play();
        }
        if (e.code === "ArrowLeft") latchWind(-1, REW);
        if (e.code === "ArrowRight") latchWind(1, FF);
    });

    /* ---------- 애니메이션 ---------- */
    let spin = 0,
        speed = 0,
        angL = 0,
        angR = 0,
        last = performance.now();
    function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        spin *= Math.pow(0.02, dt);
        const target = wind
            ? wind * 7
            : Math.abs(spin) > 0.3
              ? spin
              : playing && engine
                ? 1
                : 0;
        speed += (target - speed) * Math.min(1, dt * (wind ? 9 : 6));
        angL += speed * dt * 95;
        angR += speed * dt * 140;
        reelL.style.transform = "rotate(" + angL + "deg)";
        reelR.style.transform = "rotate(" + angR + "deg)";
        drawTape(angL);
        const t = TRACKS[idx],
            el = !loaded ? 0 : engine ? engine.elapsed() : offset;
        $("cur").textContent = fmt(el);
        $("prog").style.width =
            (t.dur ? Math.min(100, (el / t.dur) * 100) : 0) + "%";
        $("lcdTime").textContent = loaded ? fmt(el) : "-:--";
        const live = playing && engine && !wind;
        vu.forEach((b, i) => {
            b.style.height = live
                ? (
                      25 +
                      70 * Math.abs(Math.sin(now / (170 + i * 53) + i * 1.7))
                  ).toFixed(0) + "%"
                : "15%";
        });
        requestAnimationFrame(frame);
    }
    /* ---------- 테이프 교체: 덜컥 빠지고 → 새 테이프가 착 들어감 ---------- */
    /* 테이프 교체음: '철커덕' — 쇠 걸쇠가 울리는 '철' → 기구가 맞물리는 '커' → 테이프가 내려앉는 '덕' */
    function ring(t, f, v, d) {
        const o = ctx.createOscillator(),
            g = ctx.createGain();
        o.type = "triangle";
        o.frequency.value = f;
        g.gain.setValueAtTime(v, t);
        g.gain.exponentialRampToValueAtTime(0.0005, t + d);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + d + 0.02);
    }
    function thud(t, f0, f1, v, d) {
        const o = ctx.createOscillator(),
            g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.8);
        g.gain.setValueAtTime(v, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + d + 0.02);
    }
    function chulkeodeok(t, v) {
        // 철: 금속성 짧은 울림 (서로 어긋난 높은 음 몇 개 + 날카로운 잡음)
        burstNoise(t, "bandpass", 2600, 10, v * 0.7, 0.05);
        ring(t, 1870, v * 0.1, 0.09);
        ring(t, 2950, v * 0.07, 0.07);
        ring(t, 4120, v * 0.05, 0.05);
        // 커: 기구가 맞물리는 중간 소리
        burstNoise(t + 0.075, "bandpass", 950, 4, v * 0.75, 0.05);
        ring(t + 0.075, 640, v * 0.08, 0.05);
        // 덕: 묵직하게 내려앉음 + 걸쇠 딸깍
        thud(t + 0.15, 150, 58, v * 0.9, 0.16);
        burstNoise(t + 0.15, "lowpass", 650, 0.8, v * 0.6, 0.07);
        burstNoise(t + 0.152, "bandpass", 3200, 3, v * 0.35, 0.015);
    }
    // ⏏ 꺼낼 때: 테이프가 튀어 오르는 순간에 '덕'이 맞도록
    /* 직접 구한 효과음 (sfx 폴더). 파일을 못 받으면 위의 합성 '철커덕'으로 대신함 */
    const SFX = {
        eject: "./sound/tape-eject.mp3",
        insert: "./sound/tape-insert.mp3",
    };
    const sfxBuf = {};
    // 페이지를 열 때 미리 받아서 풀어 둠 (첫 탭부터 바로 소리가 나도록)
    (function preloadSfx() {
        let dec;
        try {
            dec = new (
                window.OfflineAudioContext || window.webkitOfflineAudioContext
            )(1, 1, 44100);
        } catch (_) {
            return;
        }
        Object.entries(SFX).forEach(([k, url]) => {
            fetch(url)
                .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
                .then(
                    (ab) =>
                        new Promise((ok, no) =>
                            dec.decodeAudioData(ab, ok, no),
                        ),
                )
                .then((buf) => {
                    sfxBuf[k] = buf;
                })
                .catch(() => {});
        });
    })();
    function playSfx(k, when, vol = 1) {
        const buf = sfxBuf[k];
        if (!buf) return false;
        const s = ctx.createBufferSource(),
            g = ctx.createGain();
        s.buffer = buf;
        g.gain.value = vol;
        s.connect(g);
        g.connect(ctx.destination);
        s.start(Math.max(ctx.currentTime, when));
        return true;
    }
    // ⏏ 꺼낼 때: 효과음의 '탁'(0.25초 지점)이 테이프가 튀어 오르는 순간과 맞도록
    function ejectSound() {
        if (!playSfx("eject", ctx.currentTime + 0.04))
            chulkeodeok(ctx.currentTime + 0.12, 0.85);
    }
    // 넣을 때는 미끄러지는 소리 없이 조용히 들어감
    function insertSound() {}
    // 자리 잡을 때: '철커덕' (마지막 '덕'이 테이프가 닿는 순간)
    function seatSound() {
        initAudio();
        if (!playSfx("insert", ctx.currentTime))
            chulkeodeok(ctx.currentTime - 0.15, 1);
    }
    const OUT = "translate(0,-60%)";
    const reduce =
        window.matchMedia &&
        matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* 테이프 꺼내기 / 넣기 */
    let loaded = true,
        anim = null;
    function stopAll() {
        clearTimeout(resumeT);
        unlatchWind();
        haltEngine();
        playing = false;
        latchPlay(false);
    }
    function pressEject() {
        EJECT.el.classList.add("down");
        setTimeout(() => EJECT.el.classList.remove("down"), 420);
    }
    function ejectAnim() {
        ejectSound();
        if (reduce) {
            if (anim) anim.cancel();
            anim = null;
            cass.style.transform = OUT;
            return Promise.resolve();
        }
        if (anim) anim.cancel();
        anim = cass.animate(
            [
                { transform: "translate(0,0)" },
                { transform: "translate(0,-3%)", offset: 0.22 },
                { transform: "translate(0,-2.4%)", offset: 0.42 },
                { transform: OUT },
            ],
            {
                duration: 780,
                delay: 120,
                easing: "cubic-bezier(.4,0,.7,.4)",
                fill: "forwards",
            },
        );
        return anim.finished.catch(() => {});
    }
    async function insertAnim(n) {
        tapeIdx = n;
        TRACKS = TAPES[n].tracks;
        LAST = TRACKS.length - 1;
        idx = 0;
        offset = 0;
        cassImgs.forEach((im) => (im.src = TAPES[n].img));
        fitTape(TAPES[n]);
        try {
            await cassImg.decode();
        } catch (_) {}
        loaded = true;
        renderTabs();
        renderList();
        setLabel("Load");
        insertSound();
        if (reduce) {
            if (anim) anim.cancel();
            anim = null;
            cass.style.transform = "";
            seatSound();
            return;
        }
        cass.style.transform = "";
        const prev = anim;
        anim = cass.animate(
            [
                { transform: OUT },
                { transform: "translate(0,1.2%)", offset: 0.7 },
                { transform: "translate(0,-.4%)", offset: 0.85 },
                { transform: "translate(0,0)" },
            ],
            {
                duration: 640,
                easing: "cubic-bezier(.2,.7,.3,1)",
                fill: "forwards",
            },
        );
        if (prev) prev.cancel();
        setTimeout(seatSound, 320);
        await anim.finished.catch(() => {});
        anim.cancel();
        anim = null;
    }
    // ⏏ 버튼: 테이프가 있으면 꺼내서 빈 데크로 두고, 비어 있으면 마지막 테이프를 다시 넣음
    async function ejectButton() {
        if (busy) return;
        initAudio();
        busy = true;
        pressEject();
        if (loaded) {
            stopAll();
            setLabel("Eject");
            await ejectAnim();
            loaded = false;
            renderTabs();
            renderList();
            setLabel();
        } else {
            await new Promise((r) => setTimeout(r, 200));
            await insertAnim(tapeIdx);
            setLabel();
        }
        busy = false;
    }
    // 탭: 다른 테이프로 갈아 끼움 (비어 있으면 바로 넣음)
    async function switchTape(n) {
        if (busy || (loaded && n === tapeIdx)) return;
        initAudio();
        busy = true;
        if (loaded) {
            stopAll();
            pressEject();
            setLabel("Eject");
            renderTabs(n);
            await ejectAnim();
            await new Promise((r) => setTimeout(r, 180)); // 빈 칸이 잠깐 보임
        }
        await insertAnim(n);
        setLabel();
        busy = false;
    }
    function noTape(B) {
        initAudio();
        thunk();
        if (B) {
            B.el.classList.add("down");
            setTimeout(() => B.el.classList.remove("down"), 160);
        }
        setLabel("No tape");
        clearTimeout(noTape.t);
        noTape.t = setTimeout(() => setLabel(), 1200);
    }
    const tabsEl = $("tabs");
    function renderTabs(active = tapeIdx) {
        tabsEl.innerHTML = "";
        TAPES.forEach((tp, i) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "tab";
            b.setAttribute("role", "tab");
            b.setAttribute(
                "aria-selected",
                loaded && i === active ? "true" : "false",
            );
            b.style.setProperty("--tape", tp.color);
            b.innerHTML = '<i class="dot" aria-hidden="true"></i><span></span>';
            b.querySelector("span").textContent = tp.name;
            b.addEventListener("click", () => switchTape(i));
            tabsEl.appendChild(b);
        });
    }

    if ("mediaSession" in navigator) {
        const ms = navigator.mediaSession,
            h = (k, f) => {
                try {
                    ms.setActionHandler(k, f);
                } catch (_) {}
            };
        h("play", () => play());
        h("pause", () => stop());
        h("stop", () => stop());
        h("previoustrack", () => {
            if (idx > 0) selectAndPlay(idx - 1);
        });
        h("nexttrack", () => {
            if (idx < LAST) selectAndPlay(idx + 1);
        });
    }
    renderTabs();
    renderList();
    setLabel();
    requestAnimationFrame(frame);
})();
