(function () {
  // Mobile menu
  var btn = document.querySelector('.menu-toggle');
  var nav = document.getElementById('menu');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Close' : 'Menu';
    });
  }

  // Contact form (Formspree). Replace YOUR_FORM_ID in contact.html before going live.
  var form = document.getElementById('contact-form');
  if (form) {
    var status = document.getElementById('form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = false;
      form.querySelectorAll('[required]').forEach(function (f) {
        var ok = f.value.trim() !== '' && (f.type !== 'email' || /\S+@\S+\.\S+/.test(f.value));
        f.setAttribute('aria-invalid', ok ? 'false' : 'true');
        f.style.borderColor = ok ? '' : '#b23b3b';
        if (!ok) bad = true;
      });
      status.className = 'form-status';
      if (bad) {
        status.textContent = 'Please fill in your name, a valid email address and your message.';
        status.classList.add('err');
        status.style.display = 'block';
        return;
      }
      var action = form.getAttribute('action') || '';
      if (action.indexOf('YOUR_FORM_ID') > -1) {
        // Preview mode: no form endpoint connected yet
        status.textContent = 'Thank you for contacting me. I will get back to you within 24 hours. (Preview: form not connected yet.)';
        status.style.display = 'block';
        form.reset();
        return;
      }
      fetch(action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('send failed');
          status.textContent = 'Thank you for contacting me. I will get back to you within 24 hours.';
          status.style.display = 'block';
          form.reset();
        })
        .catch(function () {
          status.textContent = 'Your message could not be sent. Please email bredamorrisseycounsellor@gmail.com or call 083 854 1298.';
          status.classList.add('err');
          status.style.display = 'block';
        });
    });
  }
})();
