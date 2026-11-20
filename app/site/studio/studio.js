// Clipyx Studio (studio/index.php): each tool card's preview loop plays only while the card is visible, as the Library's
// tiles do (library/showcase.js): never for reduced motion or Save-Data, nor when the visitor turned the Library's Autoplay
// off (hovering or focusing a card still plays it then), and never in a hidden tab.
(function () {
    'use strict';
    const grid = document.querySelector('[data-studio-grid]');
    if (!grid || !('IntersectionObserver' in window)) return;
    const cards = [...grid.querySelectorAll('.studio-card')].filter(card => card.querySelector('video'));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    let autoplay = !(reduced.matches || saveData);
    let remembered = false;
    try {
        const saved = localStorage.getItem('clipyx-library-previews'); // the Library's Autoplay switch
        if (saved === 'on' || saved === 'off') { autoplay = saved === 'on'; remembered = true; }
    } catch { remembered = false; }
    const visible = new Set();
    const videoOf = card => card.querySelector('video');
    const start = card => {
        const video = videoOf(card);
        if (!video.getAttribute('src')) video.src = video.dataset.src;
        video.play().catch(() => {});
    };
    const stop = card => videoOf(card).pause();
    const live = () => autoplay && !document.hidden;
    const refresh = () => { for (const card of visible) { if (live()) start(card); else stop(card); } };
    for (const card of cards) videoOf(card).addEventListener('playing', () => card.classList.add('is-playing'));
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
    for (const card of cards) onScreen.observe(card);
    document.addEventListener('visibilitychange', refresh);
    reduced.addEventListener('change', () => { if (!remembered) { autoplay = !(reduced.matches || saveData); refresh(); } });
    // With Autoplay off, hovering (mouse) or focusing a card plays its loop.
    const cardOf = node => node instanceof Element ? node.closest('.studio-card') : null;
    grid.addEventListener('pointerover', event => {
        const card = cardOf(event.target);
        if (card && cards.includes(card) && !autoplay && event.pointerType === 'mouse') start(card);
    });
    grid.addEventListener('pointerout', event => {
        const card = cardOf(event.target);
        if (card && cards.includes(card) && !autoplay && !card.contains(event.relatedTarget)) stop(card);
    });
    grid.addEventListener('focusin', event => {
        const card = cardOf(event.target);
        if (card && cards.includes(card) && !autoplay) start(card);
    });
    grid.addEventListener('focusout', event => {
        const card = cardOf(event.target);
        if (card && cards.includes(card) && !autoplay && !card.contains(event.relatedTarget)) stop(card);
    });
})();
