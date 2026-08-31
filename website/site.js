(function () {
  function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    const backdrop = document.querySelector('.nav-backdrop');
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.documentElement.classList.toggle('nav-open', open);
      if (backdrop) backdrop.hidden = !open;
    }

    setOpen(false);

    function closeNav() {
      setOpen(false);
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    if (backdrop) {
      backdrop.addEventListener('click', closeNav);
    }

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeNav();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();
