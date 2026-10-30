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

  // Contact form: sends to /api/contact (stored in the admin inbox)
  var form = document.getElementById('contact-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  function show(msg, err) {
    status.className = 'form-status' + (err ? ' err' : '');
    status.textContent = msg;
    status.style.display = 'block';
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = false;
    form.querySelectorAll('[required]').forEach(function (f) {
      var ok = f.value.trim() !== '' && (f.type !== 'email' || /\S+@\S+\.\S+/.test(f.value));
      f.setAttribute('aria-invalid', ok ? 'false' : 'true');
      f.style.borderColor = ok ? '' : '#b23b3b';
      if (!ok) bad = true;
    });
    if (bad) return show('Please fill in your name, a valid email address and your message.', true);
    if (location.protocol === 'file:') {
      form.reset();
      return show('Thank you for contacting me. I will get back to you within 24 hours. (Preview: messages are only sent on the live site.)');
    }
    var data = Object.fromEntries(new FormData(form).entries());
    data.page = location.pathname;
    var submit = form.querySelector('button[type=submit]');
    submit.disabled = true;
    fetch(form.getAttribute('action'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error); }); })
      .then(function () { form.reset(); show('Thank you for contacting me. I will get back to you within 24 hours.'); })
      .catch(function (err) { show((err && err.message) || 'Your message could not be sent. Please email bredamorrisseycounsellor@gmail.com or call 083 854 1298.', true); })
      .finally(function () { submit.disabled = false; });
  });
})();
