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

      // Geen backend: open het mailprogramma met de aanvraag,
      // geadresseerd aan AutoPilotAI.
      var to = 'agency.autopilotai@gmail.com';
      var subject = 'Demo-aanvraag AutoPilotAI — ' + company.value.trim();
      var body =
        'Nieuwe demo-aanvraag via de website:\n\n' +
        'Naam: ' + name.value.trim() + '\n' +
        'Autobedrijf: ' + company.value.trim() + '\n' +
        'E-mail: ' + email.value.trim() + '\n' +
        'Telefoon / WhatsApp: ' + phone.value.trim() + '\n\n' +
        'Graag een demo van AutoPilotAI.';

      var mailto =
        'mailto:' + to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      window.location.href = mailto;

      note.textContent =
        'Je mailprogramma opent met je aanvraag — verstuur de mail en we ' +
        'nemen binnen één werkdag contact met je op.';
      note.style.color = 'var(--color-bone)';
      form.reset();
    });
  }
})();
