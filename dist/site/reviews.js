// Product-page reviews: a one-row carousel of equal cards with clamped text and reply previews. Arrow buttons and
// edge fades appear only when cards overflow; "Read more" opens the full review (and creator reply) in a centred
// dialog. On paid plugins the header's "Write a review" opens the verified-review explanation in the same dialog,
// with a non-verified option that opens the member form; on free plugins it opens the member form directly.
// Without JavaScript the row still scrolls, Read more targets the card (CSS unclamps it) and the explanation
// shows inline through #review-howto.
(function () {
    'use strict';
    var section = document.querySelector('[data-tool-reviews]');
    if (!section || typeof HTMLDialogElement === 'undefined') {
        return;
    }
    var cards = Array.prototype.slice.call(section.querySelectorAll('[data-tool-review]'));
    var dialog = document.createElement('dialog');
    dialog.className = 'tool-review-dialog';
    dialog.setAttribute('aria-label', 'Full review');
    var body = document.createElement('div');
    body.className = 'tool-review-dialog-body';
    // Icon close button in the top-right corner; first in the dialog so it receives focus and Tab order starts there.
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'tool-review-dialog-close';
    close.setAttribute('aria-label', 'Close');
    var svgNS = 'http://www.w3.org/2000/svg';
    var icon = document.createElementNS(svgNS, 'svg');
    icon.setAttribute('class', 'iconizo');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('focusable', 'false');
    var use = document.createElementNS(svgNS, 'use');
    use.setAttribute('href', '/assets/iconizo/iconizo-sprite.svg?v=1.0.0#iz-x');
    icon.appendChild(use);
    close.appendChild(icon);
    dialog.appendChild(close);
    dialog.appendChild(body);
    document.body.appendChild(dialog);
    var opener = null;

    // Marks each cut-off text block (.is-clamped: CSS fades its last line) and reports whether the card has one.
    function clamped(card) {
        var any = false;
        Array.prototype.forEach.call(card.querySelectorAll('.tool-review-text, .tool-review-reply'), function (el) {
            var cut = el.scrollHeight > el.clientHeight + 1;
            el.classList.toggle('is-clamped', cut);
            any = any || cut;
        });
        return any;
    }

    var list = section.querySelector('[data-review-list]');
    var prev = section.querySelector('[data-review-prev]');
    var next = section.querySelector('[data-review-next]');

    function edges() {
        if (!list) {
            return;
        }
        var max = list.scrollWidth - list.clientWidth;
        var overflow = max > 1;
        list.classList.toggle('can-scroll-left', overflow && list.scrollLeft > 1);
        list.classList.toggle('can-scroll-right', overflow && list.scrollLeft < max - 1);
        if (prev && next) {
            prev.hidden = next.hidden = !overflow;
            prev.disabled = list.scrollLeft <= 1;
            next.disabled = list.scrollLeft >= max - 1;
        }
    }

    function step(direction) {
        var card = list.querySelector('[data-tool-review]');
        var gap = parseFloat(getComputedStyle(list).columnGap) || 0;
        list.scrollBy({ left: direction * (card ? card.getBoundingClientRect().width + gap : list.clientWidth) });
    }

    function refresh() {
        cards.forEach(function (card) {
            var more = card.querySelector('[data-review-more]');
            if (more) {
                more.hidden = !clamped(card);
            }
        });
        edges();
    }

    if (list) {
        list.addEventListener('scroll', edges, { passive: true });
        if (prev && next) {
            prev.addEventListener('click', function () { step(-1); });
            next.addEventListener('click', function () { step(1); });
        }
    }

    function show(node, trigger, label) {
        dialog.setAttribute('aria-label', label);
        body.replaceChildren(node);
        opener = trigger;
        dialog.showModal();
        close.focus();
    }

    function open(card, trigger) {
        var copy = card.cloneNode(true);
        copy.removeAttribute('id');
        copy.classList.add('is-full');
        var more = copy.querySelector('[data-review-more]');
        if (more) {
            more.remove();
        }
        show(copy, trigger, 'Full review');
    }

    cards.forEach(function (card) {
        var more = card.querySelector('[data-review-more]');
        if (more) {
            more.addEventListener('click', function (event) {
                event.preventDefault();
                open(card, more);
            });
        }
    });
    var compose = section.querySelector('#review-compose');
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function openCompose() {
        if (!compose) {
            return false;
        }
        compose.open = true;
        compose.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
        var first = compose.querySelector('input:not([type="hidden"]), textarea');
        if (first) {
            first.focus({ preventScroll: true });
        }
        return true;
    }
    Array.prototype.forEach.call(section.querySelectorAll('[data-review-compose]'), function (link) {
        link.addEventListener('click', function (event) {
            if (openCompose()) {
                event.preventDefault();
            }
        });
    });
    var howto = section.querySelector('[data-review-howto-body]');
    Array.prototype.forEach.call(section.querySelectorAll('[data-review-howto]'), function (link) {
        link.addEventListener('click', function (event) {
            if (!howto) {
                return;
            }
            event.preventDefault();
            var copy = howto.cloneNode(true);
            copy.removeAttribute('id');
            show(copy, link, 'Write a review');
        });
    });
    // The dialog shows a copy, so its non-verified link is handled here: close the dialog (without returning focus
    // to the header button), then open the member form. Log-in links navigate normally.
    body.addEventListener('click', function (event) {
        var link = event.target.closest('[data-review-compose]');
        if (link && compose) {
            event.preventDefault();
            opener = null;
            dialog.close();
            openCompose();
        }
    });
    close.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) {
        if (event.target === dialog) {
            dialog.close();
        }
    });
    dialog.addEventListener('close', function () {
        body.replaceChildren();
        if (opener) {
            opener.focus();
        }
    });

    section.classList.add('is-enhanced');
    refresh();
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(refresh);
    }
    if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(refresh).observe(section);
    } else {
        window.addEventListener('resize', refresh);
    }
}());
