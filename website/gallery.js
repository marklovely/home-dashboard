(function () {
  function initGallery() {
    const grid = document.querySelector('.shot-grid');
    if (!grid) return;

    const shots = Array.from(grid.querySelectorAll('.shot')).map(function (figure) {
      const img = figure.querySelector('img');
      const title = figure.querySelector('figcaption strong')?.textContent?.trim() || '';
      const description = figure.querySelector('figcaption span')?.textContent?.trim() || '';
      return {
        src: img?.getAttribute('src') || '',
        alt: img?.getAttribute('alt') || title,
        title: title,
        description: description
      };
    });

    if (!shots.length) return;

    const lightbox = document.createElement('div');
    lightbox.className = 'gallery-lightbox';
    lightbox.hidden = true;
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Screenshot gallery');
    lightbox.innerHTML =
      '<button type="button" class="gallery-lightbox-close" aria-label="Close gallery">&times;</button>' +
      '<button type="button" class="gallery-lightbox-prev" aria-label="Previous screenshot">&#8249;</button>' +
      '<button type="button" class="gallery-lightbox-next" aria-label="Next screenshot">&#8250;</button>' +
      '<div class="gallery-lightbox-inner">' +
      '<figure class="gallery-lightbox-figure">' +
      '<img class="gallery-lightbox-img" src="" alt="">' +
      '<figcaption class="gallery-lightbox-caption">' +
      '<strong class="gallery-lightbox-title"></strong>' +
      '<span class="gallery-lightbox-desc"></span>' +
      '</figcaption>' +
      '</figure>' +
      '</div>';

    document.body.appendChild(lightbox);

    const closeBtn = lightbox.querySelector('.gallery-lightbox-close');
    const prevBtn = lightbox.querySelector('.gallery-lightbox-prev');
    const nextBtn = lightbox.querySelector('.gallery-lightbox-next');
    const lightboxImg = lightbox.querySelector('.gallery-lightbox-img');
    const lightboxTitle = lightbox.querySelector('.gallery-lightbox-title');
    const lightboxDesc = lightbox.querySelector('.gallery-lightbox-desc');

    let index = 0;
    let lastFocus = null;

    function render() {
      const shot = shots[index];
      lightboxImg.src = shot.src;
      lightboxImg.alt = shot.alt;
      lightboxTitle.textContent = shot.title;
      lightboxDesc.textContent = shot.description;
      prevBtn.disabled = index <= 0;
      nextBtn.disabled = index >= shots.length - 1;
      lightbox.setAttribute('aria-label', shot.title + ' — screenshot ' + (index + 1) + ' of ' + shots.length);
    }

    function open(at) {
      index = at;
      lastFocus = document.activeElement;
      render();
      lightbox.hidden = false;
      document.documentElement.classList.add('gallery-open');
      closeBtn.focus();
    }

    function close() {
      lightbox.hidden = true;
      document.documentElement.classList.remove('gallery-open');
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    function step(delta) {
      const next = index + delta;
      if (next < 0 || next >= shots.length) return;
      index = next;
      render();
    }

    grid.querySelectorAll('.shot').forEach(function (figure, i) {
      const opener = figure.querySelector('.shot-open');
      if (!opener) return;
      opener.addEventListener('click', function () {
        open(i);
      });
    });

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () {
      step(-1);
    });
    nextBtn.addEventListener('click', function () {
      step(1);
    });

    lightbox.addEventListener('click', function (event) {
      if (event.target === lightbox) close();
    });

    document.addEventListener('keydown', function (event) {
      if (lightbox.hidden) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGallery);
  } else {
    initGallery();
  }
})();
