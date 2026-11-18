/* 카세트 플레이어 동작. 노래 목록은 js/tapes.js 에서 고칩니다. */
(() => {
    "use strict";
    const $ = (id) => document.getElementById(id);

    /* ───────── 덱 그림 위 좌표 (원본 그림 1380 × 1515 기준) ───────── */
    const ART_W = 1380,
        ART_H = 1515,
        KEY_Y = 1135,
        KEY_H = 265;
    const KEY_X = {
        keyRew: [118, 220],
        keyPlay: [355, 220],
        keyFf: [592, 214],
        keyStop: [823, 217],
        keyEject: [1057, 215],
    };

    const deck = $("deck"),
        slot = $("tapeSlot"),
        shelf = $("shelf");
    const keys = {
        rew: $("keyRew"),
        play: $("keyPlay"),
        ff: $("keyFf"),
        stop: $("keyStop"),
        eject: $("keyEject"),
    };
    const lcdTitle = $("lcdTitle"),
        lcdState = $("lcdState"),
        lcdNo = $("lcdNo"),
        lcdTime = $("lcdTime"),
        lcdFill = $("lcdFill");
    const listHead = $("listHead"),
        trackList = $("tracks");
    const reduceMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    for (const [id, [x, w]] of Object.entries(KEY_X)) {
        const k = $(id);
        k.style.left = (x / ART_W) * 100 + "%";
        k.style.width = (w / ART_W) * 100 + "%";
        k.style.setProperty(
            "--bg-size",
            (ART_W / w) * 100 + "% " + (ART_H / KEY_H) * 100 + "%",
        );
        k.style.setProperty(
            "--bg-pos",
            (x / (ART_W - w)) * 100 +
                "% " +
                (KEY_Y / (ART_H - KEY_H)) * 100 +
                "%",
        );
    }

    /* ───────── 테이프 그림 조각 ───────── */
    const HUB_SVG = (() => {
        let teeth = "";
        for (let i = 0; i < 6; i++)
            teeth += `<rect x="-6.5" y="-51" width="13" height="16" rx="2" fill="#ece9df" transform="rotate(${i * 60})"/>`;
        return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><circle r="50" fill="#15110f"/>${teeth}<circle r="17" fill="#2f2c2a"/><circle r="6" fill="#a3a09a"/></svg>`;
    })();

    /* 이름표(마스킹테이프). 그림이 있으면 그림을, 없으면 코드로 그린 테이프를 씁니다 */
    let tagImageOk = false;
    if (typeof TAG_IMAGE === "string" && TAG_IMAGE) {
        const probe = new Image();
        probe.onload = () => {
            tagImageOk = true;
            document
                .querySelectorAll(".tape-tag")
                .forEach((tag) => applyTagImage(tag));
        };
        probe.src = TAG_IMAGE;
    }
    function applyTagImage(tag) {
        tag.classList.add("has-img");
        tag.style.backgroundImage = 'url("' + TAG_IMAGE + '")';
    }
    function makeTag(info) {
        const tag = document.createElement("span");
        tag.className = "tape-tag";
        tag.style.setProperty(
            "--tilt",
            (typeof info.tilt === "number" ? info.tilt : -2) + "deg",
        );
        if (info.color) tag.style.setProperty("--tag-ink", info.color);
        const txt = document.createElement("span");
        txt.className = "tape-tag-text";
        txt.textContent = info.text;
        tag.appendChild(txt);
        if (tagImageOk) applyTagImage(tag);
        return tag;
    }

    function makeTape(t) {
        const el = document.createElement("div");
        el.className = "tape";
        const img = document.createElement("img");
        img.src = t.image;
        img.alt = "";
        img.draggable = false;
        el.appendChild(img);
        for (const side of ["l", "r"]) {
            const h = document.createElement("span");
            h.className = "hub " + side;
            h.innerHTML = HUB_SVG;
            el.appendChild(h);
        }
        if (t.tag && t.tag.text) el.appendChild(makeTag(t.tag));
        return el;
    }

    /* ───────── 소리: 효과음과 임시 멜로디 (Web Audio) ───────── */
    let ctx = null,
        master = null,
        noiseBuf = null;
    function ac() {
        if (!ctx) {
            const C = window.AudioContext || window.webkitAudioContext;
            if (!C) return null;
            ctx = new C();
            master = ctx.createGain();
            master.gain.value = 0.9;
            master.connect(ctx.destination);
            noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const d = noiseBuf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        return ctx;
    }
    function burst(dur, type, freq, gain) {
        const c = ac();
        if (!c) return;
        const s = c.createBufferSource();
        s.buffer = noiseBuf;
        const f = c.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        const g = c.createGain();
        const t = c.currentTime;
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f);
        f.connect(g);
        g.connect(master);
        s.start(t, Math.random() * 0.5, dur + 0.02);
    }
    function thump(f0, f1, dur, gain) {
        const c = ac();
        if (!c) return;
        const o = c.createOscillator();
        o.type = "sine";
        const g = c.createGain();
        const t = c.currentTime;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + dur + 0.02);
    }
    const sfx = {
        click() {
            burst(0.035, "highpass", 1600, 0.28);
            thump(150, 70, 0.06, 0.3);
        },
        clunk() {
            burst(0.07, "lowpass", 1100, 0.55);
            thump(95, 42, 0.14, 0.65);
        },
        whirrNode: null,
        whirrOn() {
            const c = ac();
            if (!c || this.whirrNode) return;
            const s = c.createBufferSource();
            s.buffer = noiseBuf;
            s.loop = true;
            const f = c.createBiquadFilter();
            f.type = "bandpass";
            f.frequency.value = 2100;
            f.Q.value = 0.9;
            const g = c.createGain();
            g.gain.value = 0.0001;
            g.gain.setTargetAtTime(0.07, c.currentTime, 0.04);
            s.connect(f);
            f.connect(g);
            g.connect(master);
            s.start();
            this.whirrNode = { s, g };
        },
        whirrOff() {
            if (!this.whirrNode || !ctx) return;
            const { s, g } = this.whirrNode;
            this.whirrNode = null;
            g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
            s.stop(ctx.currentTime + 0.2);
        },
    };

    /* 노래 파일이 없는 곡에서 대신 나오는 임시 멜로디 */
    const SYNTH_LEN = 40;

    /* dur 값("3:42", "1:02:03", 222) → 초. 비었거나 잘못 적혔으면 0 */
    function durSec(v) {
        if (typeof v === "number") return isFinite(v) && v > 0 ? v : 0;
        if (typeof v !== "string" || !v.trim()) return 0;
        const parts = v.trim().split(":").map(Number);
        if (parts.some((n) => !isFinite(n) || n < 0)) return 0;
        return parts.reduce((acc, n) => acc * 60 + n, 0);
    }
    const fmt = (s) => {
        s = Math.max(0, Math.floor(s || 0));
        const h = Math.floor(s / 3600),
            m = Math.floor((s % 3600) / 60),
            ss = String(s % 60).padStart(2, "0");
        return h
            ? h + ":" + String(m).padStart(2, "0") + ":" + ss
            : m + ":" + ss;
    };
    const synthLen = (tr) => durSec(tr.dur) || SYNTH_LEN;
    const synth = {
        timer: null,
        out: null,
        t0: 0,
        n: 0,
        stepDur: 0.3,
        pat: null,
        root: 220,
        active: false,
        start(seed, offset) {
            const c = ac();
            this.stop();
            if (!c) return;
            let a = (seed * 2654435761) >>> 0;
            const rnd = () => {
                a |= 0;
                a = (a + 0x6d2b79f5) | 0;
                let t = Math.imul(a ^ (a >>> 15), 1 | a);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
            this.root = [220, 196, 174.61, 246.94, 164.81][seed % 5];
            this.stepDur = 60 / (76 + (seed % 4) * 10) / 2;
            const scale = [1, 1.2, 1.3333, 1.5, 1.8, 2, 2.4];
            this.pat = Array.from({ length: 16 }, () =>
                rnd() < 0.22 ? 0 : scale[Math.floor(rnd() * scale.length)],
            );
            this.out = c.createGain();
            this.out.gain.value = 0.0001;
            this.out.gain.setTargetAtTime(0.5, c.currentTime, 0.05);
            const lp = c.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = 1700;
            this.out.connect(lp);
            lp.connect(master);
            this.t0 = c.currentTime - offset;
            this.n = Math.ceil(offset / this.stepDur);
            this.active = true;
            const tick = () => {
                while (this.t0 + this.n * this.stepDur < c.currentTime + 0.18) {
                    const when = Math.max(
                        c.currentTime,
                        this.t0 + this.n * this.stepDur,
                    );
                    const r = this.pat[this.n % 16];
                    if (r)
                        this.note(
                            c,
                            "triangle",
                            this.root * r,
                            when,
                            this.stepDur * 1.9,
                            0.2,
                        );
                    if (this.n % 8 === 0)
                        this.note(
                            c,
                            "sine",
                            this.root / 2,
                            when,
                            this.stepDur * 7,
                            0.22,
                        );
                    this.n++;
                }
            };
            tick();
            this.timer = setInterval(tick, 60);
        },
        note(c, type, freq, when, dur, gain) {
            const o = c.createOscillator();
            o.type = type;
            o.frequency.value = freq;
            const g = c.createGain();
            g.gain.setValueAtTime(0.0001, when);
            g.gain.exponentialRampToValueAtTime(gain, when + 0.015);
            g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
            o.connect(g);
            g.connect(this.out);
            o.start(when);
            o.stop(when + dur + 0.05);
        },
        stop() {
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
            if (this.out && ctx) {
                const o = this.out;
                o.gain.cancelScheduledValues(ctx.currentTime);
                o.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
                setTimeout(() => o.disconnect(), 300);
            }
            this.out = null;
            this.active = false;
        },
        pos() {
            return this.active && ctx ? ctx.currentTime - this.t0 : 0;
        },
    };

    /* ───────── 재생 상태 ───────── */
    const S = {
        tape: null,
        idx: 0,
        pos: 0,
        playing: false,
        seeking: 0,
        busy: false,
        atEnd: false,
    };
    const audio = new Audio();
    audio.preload = "auto";
    let audioTrack = null;

    const track = () => (S.tape ? S.tape.tracks[S.idx] : null);
    const usesFile = (tr) => !!(tr && tr.src && !tr.failed);
    const seedFor = (tr) =>
        TAPES.indexOf(S.tape) * 16 + S.tape.tracks.indexOf(tr) + 1;

    function curPos() {
        const tr = track();
        if (!tr) return 0;
        if (!S.playing || S.seeking) return S.pos;
        return usesFile(tr) ? audio.currentTime : synth.pos();
    }
    function curDur() {
        const tr = track();
        if (!tr) return 0;
        if (!usesFile(tr)) return synthLen(tr);
        return audioTrack === tr && isFinite(audio.duration)
            ? audio.duration
            : durSec(tr.dur);
    }

    function startSound() {
        const tr = track();
        if (!tr) return;
        if (usesFile(tr)) {
            const p = S.pos;
            if (audioTrack !== tr) {
                audioTrack = tr;
                audio.src = tr.src;
            }
            if (audio.readyState >= 1) {
                try {
                    audio.currentTime = p;
                } catch (e) {}
            } else
                audio.addEventListener(
                    "loadedmetadata",
                    () => {
                        if (audioTrack === tr && p > 0) {
                            try {
                                audio.currentTime = p;
                            } catch (e) {}
                        }
                    },
                    { once: true },
                );
            audio.play().catch(() => {});
        } else {
            synth.start(seedFor(tr), S.pos);
        }
    }
    function haltSound() {
        audio.pause();
        synth.stop();
    }

    audio.addEventListener("ended", () => {
        if (S.playing && !S.seeking) onTrackEnd();
    });
    audio.addEventListener("error", () => {
        const tr = audioTrack;
        if (!tr) return;
        tr.failed = true; // 파일을 못 읽으면 임시 멜로디로 바꿉니다
        if (S.playing && !S.seeking && track() === tr)
            synth.start(seedFor(tr), S.pos);
        render();
    });

    function play() {
        if (!S.tape || S.busy) return false;
        if (S.playing) return true;
        if (S.atEnd) {
            S.idx = 0;
            S.pos = 0;
            S.atEnd = false;
        }
        ac();
        S.playing = true;
        startSound();
        render();
        return true;
    }
    function stop() {
        if (S.playing) {
            S.pos = curPos();
            S.playing = false;
            haltSound();
        }
        keyUp(keys.play);
        render();
    }
    function goTo(idx, pos) {
        const live = S.playing && !S.seeking;
        if (live) haltSound();
        S.idx = idx;
        S.pos = pos;
        S.atEnd = false;
        if (live) startSound();
        render();
    }
    function onTrackEnd() {
        if (S.idx < S.tape.tracks.length - 1) goTo(S.idx + 1, 0);
        else tapeEnd();
    }
    function tapeEnd() {
        // 마지막 곡 끝: '툭' 하고 멈춥니다
        S.pos = curDur();
        S.playing = false;
        S.atEnd = true;
        haltSound();
        sfx.clunk();
        keyUp(keys.play);
        render();
    }
    /* 한 곡 이동. 더 갈 곳이 없으면 false */
    function step(dir, repeating) {
        if (!S.tape) return false;
        if (dir < 0) {
            if (!repeating && S.pos > 3) {
                goTo(S.idx, 0);
                return true;
            }
            if (S.idx > 0) {
                goTo(S.idx - 1, 0);
                return true;
            }
            goTo(0, 0);
            sfx.clunk();
            return false;
        }
        if (S.idx < S.tape.tracks.length - 1) {
            goTo(S.idx + 1, 0);
            return true;
        }
        tapeEnd();
        return false;
    }
    function seekStart(dir) {
        S.pos = curPos();
        if (S.playing) haltSound();
        S.seeking = dir;
        sfx.whirrOn();
        render();
    }
    function seekEnd() {
        if (!S.seeking) return;
        S.seeking = 0;
        sfx.whirrOff();
        if (S.playing) startSound();
        render();
    }

    /* ───────── 버튼 ───────── */
    const keyDown = (k) => k.classList.add("is-down");
    const keyUp = (k) => k.classList.remove("is-down");

    function doPlay() {
        if (S.playing) return true;
        return play();
    }
    function doEject() {
        if (!S.tape || S.busy) return;
        stop();
        ejectTape();
    }

    /* 누르는 순간 바로 동작하게 pointerdown 에서 처리하고, 키보드는 click 으로 받습니다 */
    function momentary(k, action) {
        k.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            k.focus({ preventScroll: true });
            keyDown(k);
            sfx.click();
            action();
        });
        for (const ev of ["pointerup", "pointercancel", "pointerleave"])
            k.addEventListener(ev, () => keyUp(k));
        k.addEventListener("click", (e) => {
            if (e.detail !== 0) return;
            keyDown(k);
            sfx.click();
            action();
            setTimeout(() => keyUp(k), 140);
        });
    }
    momentary(keys.stop, stop);
    momentary(keys.eject, doEject);

    keys.play.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        keys.play.focus({ preventScroll: true });
        keyDown(keys.play);
        sfx.click();
        doPlay();
    });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"])
        keys.play.addEventListener(ev, () => {
            if (!S.playing) keyUp(keys.play);
        });
    keys.play.addEventListener("click", (e) => {
        if (e.detail !== 0) return;
        keyDown(keys.play);
        sfx.click();
        if (!doPlay()) setTimeout(() => keyUp(keys.play), 140);
    });

    function windKey(k, dir) {
        let holdT = null,
            repT = null,
            downAt = 0,
            held = false;
        const clear = () => {
            clearTimeout(holdT);
            clearInterval(repT);
            holdT = repT = null;
        };
        const release = () => {
            if (!held) return;
            held = false;
            clear();
            keyUp(k);
            setTimeout(
                seekEnd,
                Math.max(0, 230 - (performance.now() - downAt)),
            );
        };
        k.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            k.focus({ preventScroll: true });
            keyDown(k);
            sfx.click();
            if (!S.tape || S.busy) {
                held = true;
                downAt = performance.now();
                return;
            }
            held = true;
            downAt = performance.now();
            seekStart(dir);
            if (!step(dir, false)) return;
            holdT = setTimeout(() => {
                repT = setInterval(() => {
                    if (!step(dir, true)) clear();
                }, 380);
            }, 450);
        });
        for (const ev of ["pointerup", "pointercancel", "pointerleave"])
            k.addEventListener(ev, release);
        k.addEventListener("click", (e) => {
            if (e.detail !== 0) return;
            keyDown(k);
            sfx.click();
            setTimeout(() => keyUp(k), 160);
            if (!S.tape || S.busy) return;
            seekStart(dir);
            step(dir, false);
            setTimeout(seekEnd, 230);
        });
    }
    windKey(keys.rew, -1);
    windKey(keys.ff, 1);

    /* ───────── 테이프 넣고 빼기 ───────── */
    const spotOf = (t) =>
        shelf.querySelector(`[data-tape="${t.id}"] .shelf-spot`);
    const itemOf = (t) => shelf.querySelector(`[data-tape="${t.id}"]`);

    function flight(el, t) {
        // 선반 자리 → 덱 자리의 위치 차이
        const from = spotOf(t).getBoundingClientRect(),
            to = slot.getBoundingClientRect();
        el.style.transformOrigin = "0 0";
        return {
            away: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`,
            lifted: "translate(-3.5%, -10%) scale(1.07)",
        };
    }
    function insertTape(t, instant) {
        const el = makeTape(t);
        slot.appendChild(el);
        itemOf(t).classList.add("is-loaded");
        const seat = () => {
            S.tape = t;
            S.idx = 0;
            S.pos = 0;
            S.atEnd = false;
            S.busy = false;
            buildList();
            render();
        };
        if (instant) {
            seat();
            return;
        }
        S.busy = true;
        render();
        const f = flight(el, t);
        const a = el.animate(
            [
                { transform: f.away },
                { transform: f.lifted, offset: 0.7 },
                { transform: "none" },
            ],
            {
                duration: reduceMotion ? 1 : 640,
                easing: "cubic-bezier(.3,.1,.25,1)",
            },
        );
        a.onfinish = () => {
            sfx.clunk();
            seat();
        };
    }
    function ejectTape() {
        return new Promise((resolve) => {
            const t = S.tape,
                el = slot.querySelector(".tape");
            S.busy = true;
            sfx.clunk();
            const f = flight(el, t);
            const a = el.animate(
                [
                    { transform: "none" },
                    { transform: f.lifted, offset: 0.3 },
                    { transform: f.away },
                ],
                {
                    duration: reduceMotion ? 1 : 560,
                    easing: "cubic-bezier(.3,.1,.25,1)",
                },
            );
            a.onfinish = () => {
                el.remove();
                itemOf(t).classList.remove("is-loaded");
                S.tape = null;
                S.idx = 0;
                S.pos = 0;
                S.atEnd = false;
                S.busy = false;
                audio.removeAttribute("src");
                audioTrack = null;
                buildList();
                render();
                resolve();
            };
        });
    }
    async function chooseTape(t) {
        if (S.busy || S.tape === t) return;
        ac();
        if (S.tape) {
            stop();
            await ejectTape();
        }
        insertTape(t, false);
    }

    /* ───────── 화면 ───────── */
    for (const t of TAPES) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "shelf-item";
        b.dataset.tape = t.id;
        b.setAttribute("aria-label", t.name + " 테이프 넣기");
        const spot = document.createElement("span");
        spot.className = "shelf-spot";
        spot.appendChild(makeTape(t));
        const name = document.createElement("span");
        /* 테이프 하단 이름 제거 
        name.className = "shelf-name";
        name.textContent = t.name;
        */
        b.append(spot, name);
        b.addEventListener("click", () => chooseTape(t));
        shelf.appendChild(b);
    }

    function buildList() {
        trackList.textContent = "";
        if (!S.tape) {
            listHead.textContent = "수록곡";
            const p = document.createElement("p");
            p.className = "empty";
            p.textContent = "위 선반에서 테이프를 골라 넣어 주세요.";
            const li = document.createElement("li");
            li.style.border = "0";
            li.appendChild(p);
            trackList.appendChild(li);
            return;
        }
        const total = S.tape.tracks.reduce(
            (sum, tr) => sum + durSec(tr.dur),
            0,
        );
        listHead.textContent =
            S.tape.name +
            " · " +
            S.tape.tracks.length +
            "곡" +
            (total ? " · " + fmt(total) : "");
        S.tape.tracks.forEach((tr, i) => {
            const li = document.createElement("li");
            const b = document.createElement("button");
            b.type = "button";
            b.className = "track";
            const no = document.createElement("span");
            no.className = "no";
            no.textContent = String(i + 1).padStart(2, "0");
            const ttl = document.createElement("span");
            ttl.className = "ttl";
            const name = document.createElement("span");
            name.className = "name";
            name.textContent = tr.title;
            ttl.appendChild(name);
            if (tr.artist) {
                const ar = document.createElement("span");
                ar.className = "artist";
                ar.textContent = tr.artist;
                ttl.appendChild(ar);
            }
            b.append(no, ttl);
            const sec = durSec(tr.dur);
            if (sec) {
                const du = document.createElement("span");
                du.className = "dur";
                du.textContent = fmt(sec);
                b.appendChild(du);
            }
            b.addEventListener("click", () => {
                if (S.busy) return;
                ac();
                sfx.click();
                const live = S.playing;
                if (live) haltSound();
                S.idx = i;
                S.pos = 0;
                S.atEnd = false;
                if (live) startSound();
                else {
                    keyDown(keys.play);
                    play();
                }
                render();
            });
            li.appendChild(b);
            trackList.appendChild(li);
        });
    }

    /* 액정 첫 줄: 글자가 넘치면 좌우로 천천히 흘러갑니다 */
    function setLcdTitle(text) {
        if (lcdTitle.textContent !== text) lcdTitle.textContent = text;
        const over = lcdTitle.scrollWidth - lcdTitle.parentElement.clientWidth;
        if (over > 2) {
            lcdTitle.style.setProperty("--shift", -over + "px");
            lcdTitle.style.setProperty(
                "--scroll-time",
                Math.max(4, over / 22) + "s",
            );
            lcdTitle.classList.add("is-long");
        } else lcdTitle.classList.remove("is-long");
    }
    window.addEventListener("resize", () => setLcdTitle(lcdTitle.textContent));
    if (document.fonts && document.fonts.ready)
        document.fonts.ready.then(() => setLcdTitle(lcdTitle.textContent));

    function render() {
        const tr = track();
        keys.play.setAttribute("aria-pressed", String(S.playing));
        const el = slot.querySelector(".tape");
        if (el) {
            el.classList.toggle("is-playing", S.playing && !S.seeking);
            el.classList.toggle("is-ff", S.seeking > 0);
            el.classList.toggle("is-rew", S.seeking < 0);
        }
        trackList
            .querySelectorAll(".track")
            .forEach((b, i) =>
                b.classList.toggle("is-current", !!tr && i === S.idx),
            );
        const two = (n) => String(n).padStart(2, "0");
        if (!tr) {
            setLcdTitle(S.busy ? "LOADING..." : "NO TAPE");
            lcdState.textContent = "EJECT";
            lcdNo.textContent = "--/--";
        } else {
            setLcdTitle(tr.title + (tr.artist ? " - " + tr.artist : ""));
            lcdState.textContent =
                S.seeking > 0
                    ? "\u25B6\u25B6 FF"
                    : S.seeking < 0
                      ? "\u25C0\u25C0 REW"
                      : S.playing
                        ? "\u25B6 PLAY"
                        : S.atEnd
                          ? "\u25A0 END"
                          : "\u25A0 STOP";
            lcdNo.textContent =
                two(S.idx + 1) + "/" + two(S.tape.tracks.length);
        }
        paintTime();
    }
    function paintTime() {
        const p = curPos(),
            d = curDur();
        lcdTime.textContent = fmt(Math.min(p, d || p)) + " / " + fmt(d);
        lcdFill.style.width = (d > 0 ? Math.min(1, p / d) * 100 : 0) + "%";
    }
    (function loop() {
        const tr = track();
        if (
            tr &&
            S.playing &&
            !S.seeking &&
            !usesFile(tr) &&
            synth.pos() >= synthLen(tr)
        )
            onTrackEnd();
        paintTime();
        requestAnimationFrame(loop);
    })();

    /* ───────── 시작 ───────── */
    buildList();
    const first = TAPES.find((t) => t.id === START_TAPE);
    if (first) insertTape(first, true);
    else render();
})();
