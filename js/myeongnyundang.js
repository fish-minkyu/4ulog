// 음악 켜기/끄기 버튼
// 브라우저 정책상 자동재생은 안 되고, 사용자가 버튼을 눌러야 소리가 납니다.
(function () {
  var audio = document.getElementById('bgm-audio');
  var btn = document.getElementById('bgm-btn');

  function setPlaying(on) {
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on);
    btn.setAttribute('aria-label', on ? '음악 끄기' : '음악 켜기');
  }

  btn.addEventListener('click', function () {
    if (audio.paused) {
      audio.play().catch(function () { setPlaying(false); });
    } else {
      audio.pause();
    }
  });

  audio.addEventListener('play', function () { setPlaying(true); });
  audio.addEventListener('pause', function () { setPlaying(false); });
})();
