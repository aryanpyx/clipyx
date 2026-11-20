// Explore the Library (store.php, the home page and /store/): its tiles' preview loops play only while visible, as on the
// Library page (library/library.js): never for reduced motion or Save-Data, nor when the visitor turned the Library's
// Autoplay off (hovering or focusing a tile still plays it), and never in a hidden tab.
(function () {
    'use strict';
    const grid = document.querySelector('[data-library-showcase]');
    if (!grid || !('IntersectionObserver' in window)) return;
    const tiles = [...grid.querySelectorAll('.library-tile')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    let autoplay = true;
    let remembered = false;
    try {
        const saved = localStorage.getItem('clipyx-library-previews'); // the Library's Autoplay switch
        if (saved === 'on' || saved === 'off') { autoplay = saved === 'on'; remembered = true; }
    } catch { remembered = false; }
    const visible = new Set();
    const videoOf = tile => tile.querySelector('video');
    const start = tile => {
        const video = videoOf(tile);
        if (!video) return;
        video.muted = true;
        video.loop = true;
        video.setAttribute('playsinline', '');
        if (!video.getAttribute('src') && video.dataset.src) video.src = video.dataset.src;
        const p = video.play();
        if (p && p.then) {
            p.then(() => tile.classList.add('is-playing')).catch(() => {});
        } else {
            tile.classList.add('is-playing');
        }
    };
    const stop = tile => videoOf(tile).pause();
    const live = () => autoplay && !document.hidden;
    const refresh = () => { for (const tile of visible) { if (live()) start(tile); else stop(tile); } };
    for (const tile of tiles) videoOf(tile).addEventListener('playing', () => tile.classList.add('is-playing'));
    const onScreen = new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                visible.add(entry.target);
                if (live()) start(entry.target);
            } else {
                visible.delete(entry.target);
                stop(entry.target);
            }
        }
    }, { threshold: 0.25 });
    for (const tile of tiles) onScreen.observe(tile);
    document.addEventListener('visibilitychange', refresh);
    reduced.addEventListener('change', () => { if (!remembered) { autoplay = !(reduced.matches || saveData); refresh(); } });
    // With Autoplay off, hovering (mouse) or focusing a tile plays its loop.
    const tileOf = node => node instanceof Element ? node.closest('.library-tile') : null;
    grid.addEventListener('pointerover', event => {
        const tile = tileOf(event.target);
        if (tile && !autoplay && event.pointerType === 'mouse') start(tile);
    });
    grid.addEventListener('pointerout', event => {
        const tile = tileOf(event.target);
        if (tile && !autoplay && !tile.contains(event.relatedTarget)) stop(tile);
    });
    grid.addEventListener('focusin', event => {
        const tile = tileOf(event.target);
        if (tile && !autoplay) start(tile);
    });
    grid.addEventListener('focusout', event => {
        const tile = tileOf(event.target);
        if (tile && !autoplay && !tile.contains(event.relatedTarget)) stop(tile);
    });
})();
