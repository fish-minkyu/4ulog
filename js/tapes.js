/* 테이프(탭)와 곡 목록 — 곡을 바꾸거나 추가할 때는 이 파일만 고치면 됩니다.
   name: 탭 이름, title: 리스트 위에 나오는 테이프 이름, side: 면 표시, color: 탭 점 색, img: 테이프 그림, reels/win: 그림 속 릴 중심과 가운데 창 위치
   tracks 안의 title(제목)·artist(가수)·src(노래 파일)를 바꾸거나 줄을 추가하면 됩니다. dur 는 곡 길이(초), 모르면 빼도 돼요. */
const TAPES = [
    {
        name: "검정치마",
        title: "검정치마",
        side: "A",
        color: "#ff7a7a",
        img: "./image/cassettePlayer/tape-1.jpg",
        reels: [
            [444, 396],
            [902, 396],
        ],
        win: [555, 326, 800, 466],
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
                title: "Confetti and Balloons",
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
        name: "wave to earth",
        title: "wave to earth",
        side: "B",
        color: "#7d95f2",
        img: "./image/cassettePlayer/tape-2.jpg",
        reels: [
            [427, 384],
            [897, 384],
        ],
        win: [528, 316, 808, 454],
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
        name: "Pop Songs",
        title: "DJ fish-minkyu 픽",
        side: "C",
        color: "#9cc3ee",
        img: "./image/cassettePlayer/tape-3.jpg",
        reels: [
            [445, 386],
            [903, 386],
        ],
        win: [548, 314, 800, 456],
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
