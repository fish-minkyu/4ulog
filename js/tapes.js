/* ─────────────────────────────────────────────────────────────
   테이프와 노래 목록 — 노래를 넣을 때는 이 파일만 고치면 됩니다.

   노래 넣는 법
   1) 음악 파일(mp3, m4a 등)을 songs 폴더에 넣습니다.  예) songs/pop-01.mp3
   2) 아래에서 해당 곡의 title 에 제목, artist 에 가수, dur 에 길이, src 에 파일 경로를 적습니다.
        { title: "노래 제목", artist: "가수 이름", dur: "3:42", src: "songs/pop-01.mp3" }
      dur 는 "3:42" 처럼 분:초로 적거나 222 처럼 초로 적어도 됩니다.
      곡 목록에 그대로 표시되고, 테이프 전체 시간도 이 값으로 더해서 보여 줍니다.
      artist 와 dur 는 비워 두면 그 칸이 표시되지 않습니다.
   3) 곡을 늘리려면 줄을 복사해 붙이고, 줄이려면 줄을 지우면 됩니다.

   src 가 비어 있거나 파일을 찾지 못하면, 그 곡은 브라우저가 만드는
   임시 멜로디로 재생됩니다(동작 확인용).

   테이프 항목
   - name  : 선반과 화면에 보이는 테이프 이름
   - image : 테이프 그림
   - label : 라벨 위에 손글씨로 올릴 글자. 그림에 이미 글씨가 있으면 text 를 "" 로 둡니다.
             top 은 글자의 세로 위치(테이프 높이 기준), color 는 글자 색입니다.
   ───────────────────────────────────────────────────────────── */
const TAPES = [
    {
        id: "coral",
        name: "sunset tape",
        image: "./image/cassettePlayer/tape-coral.webp",
        label: { text: "sunset tape", top: "18%", color: "#4a1710" },
        tracks: [
            {
                title: "EVERYTHING",
                artist: "검정치마",
                src: "./music/EVERYTHING.m4a",
                dur: 293.16,
            },
            {
                title: "Antifreeze",
                artist: "검정치마",
                src: "./music/Antifreeze.m4a",
                dur: 242.1,
            },
            {
                title: "폭죽과 풍선들",
                artist: "검정치마",
                src: "./music/ConfettiAndBalloons.m4a",
                dur: 201.14,
            },
            {
                title: "Heya",
                artist: "검정치마",
                src: "./music/Heya.m4a",
                dur: 325.1,
            },
            {
                title: "Hollywood",
                artist: "검정치마",
                src: "./music/Hollywood.m4a",
                dur: 331.07,
            },
            {
                title: "Love Is All",
                artist: "검정치마",
                src: "./music/LoveIsAll.m4a",
                dur: 164.15,
            },
        ],
    },
    {
        id: "blue",
        name: "blue tape",
        image: "./image/cassettePlayer/tape-blue.webp",
        label: { text: "blue tape", top: "25%", color: "#1b2c8f" },
        tracks: [
            {
                title: "love.",
                artist: "wave to earth",
                src: "./music/love.m4a",
                dur: 308.0,
            },
            {
                title: "annie",
                artist: "wave to earth",
                src: "./music/annie.m4a",
                dur: 206.07,
            },
            {
                title: "bad",
                artist: "wave to earth",
                src: "./music/bad.m4a",
                dur: 263.33,
            },
            {
                title: "daisy.",
                artist: "wave to earth",
                src: "./music/daisy.m4a",
                dur: 218.59,
            },
            {
                title: "pink",
                artist: "wave to earth",
                src: "./music/pink.m4a",
                dur: 268.09,
            },
            {
                title: "seasons",
                artist: "wave to earth",
                src: "./music/seasons.m4a",
                dur: 256.09,
            },
        ],
    },
    {
        id: "pop",
        name: "pop songs",
        image: "./image/cassettePlayer/tape-pop.webp",
        label: { text: "" },
        tracks: [
            {
                title: "Malibu Nights",
                artist: "LANY",
                src: "./music/MalibuNights.m4a",
                dur: 253.18,
            },
            {
                title: "Apocalypse",
                artist: "Cigarettes After Sex",
                src: "./music/Apocalypse.m4a",
                dur: 290.15,
            },
            {
                title: "death bed",
                artist: "Powfu",
                src: "./music/DeathBed.m4a",
                dur: 173.77,
            },
            {
                title: "Karma",
                artist: "AJR",
                src: "./music/Karma.m4a",
                dur: 245.64,
            },
            {
                title: "Midnight Flight",
                artist: "Cornor Matthews",
                src: "./music/MidnightFlight.m4a",
                dur: 180.08,
            },
            {
                title: "My Love Mine All Mine",
                artist: "Mitski",
                src: "./music/MyLoveMineAllMine.m4a",
                dur: 138.43,
            },
        ],
    },
];

/* 페이지를 열었을 때 미리 꽂혀 있을 테이프의 id. 빈 덱으로 시작하려면 null */
const START_TAPE = "pop";
