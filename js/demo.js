/* ============================================================
   AutoPilotAI — Animated WhatsApp demo
   Plays the conversation like a short video while a timeline on
   the right lights up the matching step. Replayable.
   ============================================================ */
(function () {
  'use strict';

  var screen = document.getElementById('waScreen');
  var timeline = document.getElementById('timeline');
  var replay = document.getElementById('replayDemo');
  var section = document.getElementById('demo-chat');
  if (!screen || !timeline || !section) return;

  var steps = Array.prototype.slice.call(timeline.querySelectorAll('.tl'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var convo = [
    { who: 'cust', time: '09:11', text: 'Hoi! Mijn APK is verlopen, kan ik nog langskomen?', step: 0 },
    { who: 'ai', time: '09:11', text: 'Zeker! Wat is je kenteken? Dan zoek ik ’m meteen op. 🚗', step: 1 },
    { who: 'cust', time: '09:12', text: '12-ABC-3' },
    { who: 'ai', time: '09:12', text: 'Top — een Ford Focus. Een APK is €45,- en duurt zo’n 45 min. Wanneer komt het je uit?', step: 2 },
    { who: 'cust', time: '09:13', text: 'Vrijdag rond 10 uur?' },
    { who: 'ai', time: '09:13', text: 'Vrijdag 7 juni om 10:00 is vrij. Zal ik ’m voor je vastzetten?', step: 3 },
    { who: 'cust', time: '09:14', text: '10:00 uur graag!' },
    { who: 'ai', time: '09:14', text: '✅ Afspraak bevestigd!\n\n📅 Vrijdag 7 juni om 10:00\n📍 Garage Jansen, Hoofdstraat 15\n🚗 APK Ford Focus — €45,-\n\n💡 Tip: wil je tegelijk ook een kleine beurt (olie + filters)? Nu extra voordelig: €79,- i.p.v. €99,- 🔧', step: 4 },
    { who: 'cust', time: '09:15', text: 'Ja, dat klinkt goed!' },
    { who: 'ai', time: '09:15', text: 'Top! Afspraak bijgewerkt. ✓\n\nJe ontvangt zo een bevestiging per e-mail. Tot vrijdag! 👍' }
  ];

  var runId = 0;

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function clearScreen() {
    while (screen.children.length > 1) screen.removeChild(screen.lastChild);
  }

  function setStep(i) {
    steps.forEach(function (el) {
      var s = +el.getAttribute('data-step');
      el.classList.toggle('is-active', s === i);
      el.classList.toggle('is-done', s < i);
    });
  }

  function scrollDown() {
    screen.scrollTop = screen.scrollHeight;
  }

  function addMsg(m) {
    var div = document.createElement('div');
    div.className = 'wa__msg wa__msg--' + m.who;
    var p = document.createElement('p');
    p.innerHTML = m.text.replace(/\n/g, '<br>');
    var t = document.createElement('span');
    t.className = 'wa__time';
    t.textContent = m.time;
    div.appendChild(p);
    div.appendChild(t);
    screen.appendChild(div);
    requestAnimationFrame(function () { div.classList.add('in'); });
    scrollDown();
  }

  function showTyping() {
    var d = document.createElement('div');
    d.className = 'wa__typing';
    d.innerHTML = '<span></span><span></span><span></span>';
    screen.appendChild(d);
    scrollDown();
    return d;
  }

  function play() {
    var myId = ++runId;
    clearScreen();
    setStep(-1);

    if (reduce) {
      convo.forEach(function (m) { addMsg(m); });
      setStep(4);
      return;
    }

    var i = 0;
    function next() {
      if (myId !== runId) return;
      if (i >= convo.length) {
        setStep(4); // leave the last step glowing
        return;
      }
      var m = convo[i];

      function reveal() {
        if (myId !== runId) return;
        addMsg(m);
        if (m.step != null) setStep(m.step);
        i++;
        sleep(480).then(next);
      }

      if (m.who === 'ai') {
        var ty = showTyping();
        sleep(900 + Math.min(m.text.length * 7, 1300)).then(function () {
          if (ty.parentNode) ty.parentNode.removeChild(ty);
          reveal();
        });
      } else {
        sleep(650).then(reveal);
      }
    }
    sleep(500).then(next);
  }

  // autostart when scrolled into view
  var started = false;
  function kickoff() {
    if (started) return;
    started = true;
    play();
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) kickoff();
      });
    }, { threshold: 0.3 });
    io.observe(section);
  } else {
    kickoff();
  }

  if (replay) {
    replay.addEventListener('click', function () {
      started = true;
      play();
    });
  }
})();
