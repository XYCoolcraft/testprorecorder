/* ProRec website - by XYCoolcraft. Tanpa library; semua progressive enhancement. */
(function () {
  'use strict';
  var d = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header: latar kaca saat di-scroll */
  var header = d.querySelector('.site-header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* menu mobile */
  var menu = d.getElementById('menu');
  var nav = d.getElementById('nav');
  if (menu && nav) {
    var setMenu = function (open) { nav.classList.toggle('open', open); menu.setAttribute('aria-expanded', String(open)); };
    menu.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* tab preview (aksesibel: panah kiri/kanan, Home, End) */
  var tablist = d.querySelector('[role="tablist"]');
  if (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = d.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  }

  /* reveal: hanya elemen di bawah layar yang disembunyikan -> tidak ada kedipan */
  var items = Array.prototype.slice.call(d.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); en.target.classList.remove('pre'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.92) { el.classList.add('pre'); io.observe(el); }
    });
  }

  /* efek cahaya mengikuti kursor pada kartu */
  if (!reduce) {
    d.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* tilt halus pada visual hero (hanya perangkat dengan mouse) */
  var tilt = d.getElementById('tilt');
  if (tilt && !reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    tilt.addEventListener('pointermove', function (e) {
      var r = tilt.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
      tilt.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
    });
    tilt.addEventListener('pointerleave', function () {
      tilt.style.setProperty('--ry', '0deg');
      tilt.style.setProperty('--rx', '0deg');
    });
  }

  /* salin checksum */
  d.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = d.querySelector(btn.getAttribute('data-copy'));
      if (!src) return;
      var text = src.textContent.trim();
      var label = btn.querySelector('span');
      var old = label ? label.textContent : '';
      var done = function () {
        if (label) { label.textContent = btn.getAttribute('data-done') || 'OK'; setTimeout(function () { label.textContent = old; }, 1800); }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
      else {
        var r = d.createRange(); r.selectNodeContents(src);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        try { d.execCommand('copy'); done(); } catch (err) { /* abaikan */ }
      }
    });
  });

  /* bukan Windows? beri catatan di dekat tombol unduh */
  var note = d.getElementById('os-note');
  if (note && !/Windows/i.test(navigator.userAgent)) note.hidden = false;
})();
