// Click-to-play YouTube: the privacy-enhanced player loads only after a visitor asks for it.
// Without JavaScript the poster stays an ordinary link to the video on YouTube.
// data-youtube-start="<seconds>" starts the video there: one video can show several plugins, each page at its chapter.
(function () {
    'use strict';
    document.addEventListener('click', function (event) {
        var link = event.target instanceof Element ? event.target.closest('a[data-youtube-facade]') : null;
        if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        var id = link.getAttribute('data-youtube-facade') || '';
        if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return;
        event.preventDefault();
        var frame = document.createElement('iframe');
        var start = parseInt(link.getAttribute('data-youtube-start') || '', 10);
        frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0' + (start > 0 ? '&start=' + start : '');
        frame.title = link.getAttribute('data-youtube-title') || 'YouTube video';
        frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        link.replaceWith(frame);
        frame.focus();
    });
})();
