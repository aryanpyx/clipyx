// Explore Planizo (store.php, the home page): its drawn tiles move only while visible (.is-live on the tile), as Explore
// the Library's loops do (library/showcase.js): never for reduced motion and never in a hidden tab. Without this script
// each tile shows its finished frame.
(function () {
    'use strict';
    const grid = document.querySelector('[data-planizo-showcase]');
    if (!grid || !('IntersectionObserver' in window)) return;
    const tiles = [...grid.querySelectorAll('.planizo-tile')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const visible = new Set();
    const refresh = () => {
        const live = !reduced.matches && !document.hidden;
        for (const tile of tiles) tile.classList.toggle('is-live', live && visible.has(tile));
    };
    const onScreen = new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (entry.isIntersecting) visible.add(entry.target);
            else visible.delete(entry.target);
        }
        refresh();
    }, { threshold: 0.25 });
    for (const tile of tiles) onScreen.observe(tile);
    document.addEventListener('visibilitychange', refresh);
    reduced.addEventListener('change', refresh);
})();
