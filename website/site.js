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
