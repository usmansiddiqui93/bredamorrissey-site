(function () {
  "use strict";
  // Mobile menu
  var header = document.querySelector("header.site-head");
  var menuBtn = document.querySelector(".m-menu");
  if (header && menuBtn) {
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.lastChild.nodeValue = open ? "Close" : "Menu";
    });
  }

  // FAQ accordions: keep the +/− icon in sync
  document.querySelectorAll("details").forEach(function (d) {
    var icon = d.querySelector("summary span[aria-hidden]");
    if (!icon) return;
    var sync = function () {
      icon.textContent = d.open ? "−" : "+";
      icon.style.background = d.open ? "#7A4A6E" : "#F1E6EA";
      icon.style.color = d.open ? "#FFFFFF" : "#5C3553";
    };
    d.addEventListener("toggle", sync);
    sync();
  });

  // Blog topic filters
  var filters = document.querySelectorAll(".blog-filters button");
  filters.forEach(function (b) {
    b.addEventListener("click", function () {
      var f = b.getAttribute("data-filter");
      filters.forEach(function (x) {
        var on = x === b;
        x.setAttribute("aria-pressed", String(on));
        x.style.background = on ? "#7A4A6E" : "#FFFFFF";
        x.style.color = on ? "#FFFFFF" : "#4A2840";
        x.style.borderColor = on ? "#7A4A6E" : "#E9DCE2";
      });
      document.querySelectorAll("[data-filter-card]").forEach(function (c) {
        c.hidden = !(f === "all" || c.getAttribute("data-topic") === f);
      });
    });
  });

  // Contact form: sends to /api/contact (stored in the admin inbox)
  var form = document.getElementById("contact-form");
  if (!form) return;
  var status = document.getElementById("form-status");
  function show(msg, err) {
    status.textContent = msg;
    status.style.display = "block";
    status.style.background = err ? "#F8E3E3" : "#F1E6EA";
    status.style.color = err ? "#7A2424" : "#4A2840";
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = false;
    form.querySelectorAll("[required]").forEach(function (f) {
      var ok = f.value.trim() !== "" && (f.type !== "email" || /\S+@\S+\.\S+/.test(f.value));
      f.setAttribute("aria-invalid", ok ? "false" : "true");
      f.style.borderColor = ok ? "" : "#B23B3B";
      if (!ok) bad = true;
    });
    if (bad) return show("Please fill in your name, a valid email address and your message.", true);
    if (location.protocol === "file:" || /github\.io$/.test(location.hostname)) {
      form.reset();
      return show("Thank you for contacting me. I will get back to you within 24 hours. (Preview: messages are only sent on the live site.)");
    }
    var data = Object.fromEntries(new FormData(form).entries());
    data.page = location.pathname;
    var submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    fetch(form.getAttribute("action"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error); }); })
      .then(function () { form.reset(); show("Thank you for contacting me. I will get back to you within 24 hours."); })
      .catch(function (err) { show((err && err.message) || "Your message could not be sent. Please email bredamorrisseycounsellor@gmail.com or call 083 854 1298.", true); })
      .finally(function () { submit.disabled = false; });
  });
})();
