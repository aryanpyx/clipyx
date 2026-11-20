(function () {
    'use strict';

    // Latest news in the home hero (store.php, hero-news.css; owner, 2026-10-26: "replace the curve with a latest news
    // slideshow (not for mobiel view) ... make it look premuim"). Each slide shows while its progress bar fills (7 s); the
    // bar's own CSS animation turns the slide when it ends, so pausing that animation pauses the slideshow. It pauses on
    // the mouse and while keyboard focus is inside, offscreen, in hidden tabs, below 1200px (where the panel is hidden)
    // and after Pause; with reduced motion it never turns by itself. A click's focus doesn't pause it (20261027-hero-
    // news-bars; owner: "sometimes it just pauses when I remove my cursor off of it. It doesn't continue playing": a
    // clicked bar kept the focus, so leaving with the mouse didn't resume it). The bars are buttons too (since 20261026-hero-news-polish,
    // owner: "i think the UI can look better and more professional"): one opens its slide. The arrow keys and a touch
    // swipe change slides. The Watchizo drawing animates only while its slide shows, on screen and without reduced motion.
    const root = document.querySelector('[data-hero-news]');
    if (!root) return;
    const slides = [...root.querySelectorAll('[data-news-slide]')];
    const bars = [...root.querySelectorAll('[data-news-bar]')];
    const region = root.querySelector('[data-news-slides]');
    const toggle = root.querySelector('[data-news-toggle]');
    if (slides.length < 2 || bars.length !== slides.length || !region || !toggle) return;
    const wide = window.matchMedia('(min-width: 600px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let index = 0, stopped = false, hovered = false, focused = false, onScreen = true;

    const update = () => {
        const shown = onScreen && !document.hidden && wide.matches;
        const running = shown && !stopped && !hovered && !focused && !reduced.matches;
        root.classList.toggle('is-running', running);
        root.classList.toggle('is-stopped', stopped);
        region.setAttribute('aria-live', running ? 'off' : 'polite'); // announced only when the visitor turns it
        slides.forEach((slide, i) => {
            const art = slide.querySelector('svg[data-news-art]');
            if (!art || !art.pauseAnimations) return;
            if (shown && i === index && !reduced.matches) art.unpauseAnimations(); else art.pauseAnimations();
        });
    };

    const show = next => {
        index = (next + slides.length) % slides.length;
        slides.forEach((slide, i) => {
            const on = i === index;
            slide.classList.toggle('is-active', on);
            slide.inert = !on;
            slide.setAttribute('aria-hidden', String(!on));
            const art = slide.querySelector('svg[data-news-art]');
            if (on && art && art.setCurrentTime) art.setCurrentTime(0);
        });
        bars.forEach((bar, i) => {
            bar.classList.remove('is-current');
            bar.classList.toggle('is-done', i < index);
            if (i === index) bar.setAttribute('aria-current', 'true'); else bar.removeAttribute('aria-current');
        });
        void bars[index].offsetWidth; // the new bar's fill starts from empty
        bars[index].classList.add('is-current');
        update();
    };

    bars.forEach((bar, i) => {
        bar.addEventListener('animationend', event => {
            if (event.animationName === 'hero-news-fill' && bar.classList.contains('is-current')) show(index + 1);
        });
        bar.addEventListener('click', () => show(i));
    });
    toggle.addEventListener('click', () => {
        stopped = !stopped;
        toggle.setAttribute('aria-label', stopped ? 'Play the news' : 'Pause the news');
        update();
    });
    root.addEventListener('keydown', event => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            show(index + (event.key === 'ArrowRight' ? 1 : -1));
        }
    });
    root.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; update(); } });
    root.addEventListener('pointerleave', () => { if (hovered) { hovered = false; update(); } });
    const keyboard = el => { try { return el.matches(':focus-visible'); } catch (error) { return true; } };
    root.addEventListener('focusin', event => { focused = keyboard(event.target); update(); });
    root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) { focused = false; update(); } });
    // A swipe on a touch screen (large tablets in landscape reach 1200px): left for the next slide, right for the last.
    let swipe = null;
    root.addEventListener('pointerdown', event => {
        focused = false; // a click or tap moves on from the keyboard
        swipe = event.pointerType === 'touch' ? [event.clientX, event.clientY] : null;
    });
    root.addEventListener('pointerup', event => {
        if (!swipe) return;
        const dx = event.clientX - swipe[0], dy = event.clientY - swipe[1];
        swipe = null;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
    });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => { onScreen = entries[entries.length - 1].isIntersecting; update(); }, { threshold: 0.25 }).observe(root);
    }
    document.addEventListener('visibilitychange', update);
    wide.addEventListener?.('change', update);
    reduced.addEventListener?.('change', update);

    root.classList.add('is-ready');
    show(0);
})();
