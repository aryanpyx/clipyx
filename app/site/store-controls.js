// The store's controls (store.php): the hidden Price filter and the Sort menu. This file replaces store-filter.js since
// 20261111-store-newest (owner, 2026-11-11: "For the store, add the ability to sort by newest"). It has a new name, not
// a new ?v on the old one: these files are cached for a year at their address, and a new name is an address nobody has
// asked for yet.
// Sort: Default (the page's own order), Newest (by each card's data-added, the day its product went public), Most
// downloaded, Name A-Z.
(function () {
    'use strict';

    var container = document.querySelector('[data-store-filter]');
    if (!container) return;

    var emptyState = document.querySelector('[data-store-empty]');
    var priceSelect = container.querySelector('[data-store-price-filter-select]');
    var sortSelect = container.querySelector('[data-store-sort-select]');
    var grid = document.querySelector('#products .product-grid');
    if (!grid) return;

    var cards = Array.prototype.slice.call(grid.querySelectorAll('.product-card'));

    function isFree(card) {
        return card.getAttribute('data-price') === 'free';
    }

    function interleaveFree(visible) {
        var paid = visible.filter(function (card) { return !isFree(card); });
        var free = visible.filter(isFree);
        var out = [];
        var freeIndex = 0;
        paid.forEach(function (card, index) {
            out.push(card);
            if ((index + 1) % 2 === 0 && freeIndex < free.length) {
                out.push(free[freeIndex]);
                freeIndex += 1;
            }
        });
        while (freeIndex < free.length) {
            out.push(free[freeIndex]);
            freeIndex += 1;
        }
        return out;
    }

    function applyFilter() {
        var priceFilter = priceSelect ? priceSelect.value || 'all' : 'all';
        var sortMode = sortSelect ? sortSelect.value || 'default' : 'default';

        var visible = cards.filter(function (card) {
            var price = card.getAttribute('data-price') || 'paid';
            var matches = priceFilter === 'all' || price === priceFilter;
            card.style.display = matches ? '' : 'none';
            return matches;
        });

        if (sortMode === 'price-low') {
            visible.sort(function (a, b) {
                return parseFloat(a.getAttribute('data-price-value')) - parseFloat(b.getAttribute('data-price-value'));
            });
        } else if (sortMode === 'price-high') {
            visible.sort(function (a, b) {
                return parseFloat(b.getAttribute('data-price-value')) - parseFloat(a.getAttribute('data-price-value'));
            });
        } else if (sortMode === 'name') {
            visible.sort(function (a, b) {
                return (a.getAttribute('data-name') || '').localeCompare(b.getAttribute('data-name') || '');
            });
        } else if (sortMode === 'downloads') {
            // Most downloaded first (data-downloads: the count under each card's price; 0 while the database is away),
            // ties in the default order (owner, 2026-10-25: "make it possible to sort by most downloaded").
            visible.sort(function (a, b) {
                return (parseInt(b.getAttribute('data-downloads'), 10) || 0) - (parseInt(a.getAttribute('data-downloads'), 10) || 0)
                    || cards.indexOf(a) - cards.indexOf(b);
            });
        } else if (sortMode === 'newest') {
            // Newest first, by data-added (YYYY-MM-DD). Products that went public the same day keep the page's order.
            // The oldest products carry no date: they come last, the later card first (the page lists them oldest first).
            visible.sort(function (a, b) {
                var da = a.getAttribute('data-added') || '';
                var db = b.getAttribute('data-added') || '';
                if (da && db) return da < db ? 1 : da > db ? -1 : cards.indexOf(a) - cards.indexOf(b);
                if (da || db) return da ? -1 : 1;
                return cards.indexOf(b) - cards.indexOf(a);
            });
        } else if (priceFilter === 'all') {
            visible = interleaveFree(visible);
        }

        visible.forEach(function (card) { grid.appendChild(card); });

        if (emptyState) {
            emptyState.style.display = visible.length === 0 ? 'block' : 'none';
        }
    }

    if (priceSelect) priceSelect.addEventListener('change', applyFilter);
    if (sortSelect) sortSelect.addEventListener('change', applyFilter);

    applyFilter();
})();
