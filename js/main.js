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

  /* ---- Demo aanvraag formulier ---- */
  var form = document.getElementById('accessForm');
  var note = document.getElementById('accessNote');
  if (form && note) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = document.getElementById('fieldName');
      var company = document.getElementById('fieldCompany');
      var email = document.getElementById('fieldEmail');
      var phone = document.getElementById('fieldPhone');

      var emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        (email.value || '').trim()
      );
      var phoneValid =
        ((phone.value || '').replace(/[^\d]/g, '').length) >= 8;

      function fail(field, msg) {
        note.textContent = msg;
        note.style.color = 'var(--color-amber-spark)';
        if (field) field.focus();
      }

      if (!(name.value || '').trim()) return fail(name, 'Vul je naam in.');
      if (!(company.value || '').trim())
        return fail(company, 'Vul de naam van je autobedrijf in.');
      if (!emailValid) return fail(email, 'Vul een geldig e-mailadres in.');
      if (!phoneValid)
        return fail(phone, 'Vul een geldig telefoon- of WhatsApp-nummer in.');

      // Honeypot: stilletjes afbreken als een bot het veld invult
      var honey = document.getElementById('fieldHoney');
      if (honey && honey.value) return;

      var to = 'agency.autopilotai@gmail.com';
      var values = {
        Naam: name.value.trim(),
        Autobedrijf: company.value.trim(),
        'E-mail': email.value.trim(),
        Telefoon: phone.value.trim()
      };

      var submitBtn = form.querySelector('.access__submit');

      function setBusy(busy) {
        if (!submitBtn) return;
        submitBtn.disabled = busy;
        submitBtn.textContent = busy ? 'VERSTUREN…' : 'DEMO AANVRAGEN';
      }

      // Back-up zodat een lead nooit verloren gaat als de dienst hapert
      function mailFallback() {
        var subject = 'Demo-aanvraag AutoPilotAI — ' + values.Autobedrijf;
        var body =
          'Nieuwe demo-aanvraag via de website:\n\n' +
          'Naam: ' + values.Naam + '\n' +
          'Autobedrijf: ' + values.Autobedrijf + '\n' +
          'E-mail: ' + values['E-mail'] + '\n' +
          'Telefoon / WhatsApp: ' + values.Telefoon + '\n\n' +
          'Graag een demo van AutoPilotAI.';
        window.location.href =
          'mailto:' + to +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
      }

      setBusy(true);
      note.textContent = 'Versturen…';
      note.style.color = 'var(--color-ash)';

      var payload = {
        Naam: values.Naam,
        Autobedrijf: values.Autobedrijf,
        'E-mail': values['E-mail'],
        Telefoon: values.Telefoon,
        _subject: 'Demo-aanvraag AutoPilotAI — ' + values.Autobedrijf,
        _template: 'table'
      };

      fetch('https://formsubmit.co/ajax/' + to, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (data && (data.success === 'true' || data.success === true)) {
            showThanks(submitBtn);
            form.reset();
          } else {
            throw new Error('submit failed');
          }
        })
        .catch(function () {
          mailFallback();
          note.textContent =
            'We openen je mailprogramma als back-up — verstuur de mail om ' +
            'je aanvraag af te ronden.';
          note.style.color = 'var(--color-amber-spark)';
        })
        .finally(function () {
          setBusy(false);
        });
    });
  }

  /* ---- Thank-you message + confetti ---- */
  function showThanks(originBtn) {
    if (note) {
      note.innerHTML =
        'Bedankt voor uw interesse.<br>' +
        '<strong>AutoPilotAI</strong> — Uw klantcontact op de automatische piloot.';
      note.style.color = 'var(--color-bone)';
    }
    confettiBurst(originBtn);
  }

  function confettiBurst(originBtn) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var rect = originBtn
      ? originBtn.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    var ox = rect.left + rect.width / 2;
    var oy = rect.top + rect.height / 2;
    var colors = ['#8052ff', '#ffb829', '#15846e', '#ffffff', '#c44bff'];

    for (var i = 0; i < 26; i++) {
      var piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = ox + 'px';
      piece.style.top = oy + 'px';
      piece.style.background = colors[i % colors.length];
      if (i % 2) piece.style.borderRadius = '50%';
      var ang = Math.random() * Math.PI * 2;
      var dist = 60 + Math.random() * 140;
      piece.style.setProperty('--cx', Math.cos(ang) * dist + 'px');
      piece.style.setProperty('--cy', (Math.sin(ang) * dist + 120) + 'px');
      piece.style.setProperty('--cr', Math.random() * 720 - 360 + 'deg');
      document.body.appendChild(piece);
      (function (el) {
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 1600);
      })(piece);
    }
  }

  /* ---- Hero 3D phone: tilt toward the cursor ---- */
  var heroPhone = document.getElementById('heroPhone');
  if (
    heroPhone &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    window.matchMedia('(pointer: fine)').matches
  ) {
    var baseRY = -20;
    var baseRX = 7;
    window.addEventListener('mousemove', function (e) {
      var nx = (e.clientX / window.innerWidth) * 2 - 1;
      var ny = (e.clientY / window.innerHeight) * 2 - 1;
      heroPhone.style.transform =
        'rotateY(' + (baseRY + nx * 13) + 'deg) rotateX(' + (baseRX - ny * 9) + 'deg)';
    }, { passive: true });
  }

  /* ---- Click ripple + bounce on primary buttons ---- */
  document.querySelectorAll('.btn--primary').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      setTimeout(function () {
        if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
      }, 600);

      btn.classList.remove('btn--pop');
      // reflow so the animation can retrigger
      void btn.offsetWidth;
      btn.classList.add('btn--pop');
    });
  });
})();
