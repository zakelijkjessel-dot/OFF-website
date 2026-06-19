/* ============================================================
   Dala — UI behaviour
   Nav scroll state, mobile menu, access form feedback.
   ============================================================ */
(function () {
  'use strict';

  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');

  /* ---- Nav background on scroll ---- */
  function onScroll() {
    if (!nav) return;
    if (window.scrollY > 20) nav.classList.add('nav--scrolled');
    else nav.classList.remove('nav--scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu ---- */
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('nav--open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Close menu after tapping a link
    nav.querySelectorAll('.nav__link, .nav__cta').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('nav--open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- Access form ---- */
  var form = document.getElementById('accessForm');
  var note = document.getElementById('accessNote');
  if (form && note) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('accessEmail');
      var value = (input.value || '').trim();
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

      if (!valid) {
        note.textContent = 'Please enter a valid work email.';
        note.style.color = 'var(--color-amber-spark)';
        input.focus();
        return;
      }

      note.textContent =
        'You’re on the list — we’ll bring you into the constellation soon.';
      note.style.color = 'var(--color-bone)';
      form.reset();
    });
  }
})();
