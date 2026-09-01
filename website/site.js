(function () {
  function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    const backdrop = document.querySelector('.nav-backdrop');
    if (!toggle || !nav) return;

    const desktopQuery = window.matchMedia('(min-width: 1280px)');

    function isDesktopNav() {
      return desktopQuery.matches;
    }

    function setOpen(open) {
      if (isDesktopNav()) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
        nav.removeAttribute('aria-hidden');
        document.documentElement.classList.remove('nav-open');
        if (backdrop) backdrop.hidden = true;
        return;
      }

      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.documentElement.classList.toggle('nav-open', open);
      if (backdrop) backdrop.hidden = !open;
    }

    function closeNav() {
      setOpen(false);
    }

    function syncDesktopNav() {
      setOpen(false);
    }

    setOpen(false);

    toggle.addEventListener('click', function () {
      if (isDesktopNav()) return;
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

    if (typeof desktopQuery.addEventListener === 'function') {
      desktopQuery.addEventListener('change', syncDesktopNav);
    } else if (typeof desktopQuery.addListener === 'function') {
      desktopQuery.addListener(syncDesktopNav);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }

  applySiteVersion();

  function applySiteVersion() {
    const nodes = document.querySelectorAll('[data-site-version]');
    if (!nodes.length) return;

    fetch('version.json', { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then(function (response) {
        if (!response.ok) throw new Error('version');
        return response.json();
      })
      .then(function (payload) {
        const version = String(payload && payload.version ? payload.version : '').trim();
        if (!version) return;
        nodes.forEach(function (node) {
          node.textContent = 'v' + version;
        });
      })
      .catch(function () {
        /* Footer stays without a version if version.json is missing. */
      });
  }
})();
