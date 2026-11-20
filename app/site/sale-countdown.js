(function () {
    'use strict';

    function plural(value, label) {
        return value + ' ' + label + (value === 1 ? '' : 's');
    }

    function formatRemaining(ms) {
        if (ms <= 0) {
            return '';
        }

        var totalSeconds = Math.ceil(ms / 1000);
        var days = Math.floor(totalSeconds / 86400);
        var hours = Math.floor((totalSeconds % 86400) / 3600);
        var minutes = Math.floor((totalSeconds % 3600) / 60);

        if (days > 0) {
            return plural(days, 'day') + (hours > 0 ? ' ' + plural(hours, 'hour') : '');
        }
        if (hours > 0) {
            return plural(hours, 'hour') + (minutes > 0 ? ' ' + plural(minutes, 'minute') : '');
        }
        if (minutes > 0) {
            return plural(minutes, 'minute');
        }
        return 'less than 1 minute';
    }

    function hideExpiredSale(node) {
        node.hidden = true;
        var scope = node.closest('.product-info, .tool-price-row');
        if (scope) {
            scope.querySelectorAll('.price-discount').forEach(function (badge) {
                badge.remove();
            });
        }
    }

    function updateCountdowns() {
        document.querySelectorAll('[data-sale-ends-at]').forEach(function (node) {
            var target = Date.parse(node.getAttribute('data-sale-ends-at') || '');
            var timer = node.querySelector('[data-sale-countdown]');
            if (!timer || Number.isNaN(target)) {
                return;
            }
            var remaining = formatRemaining(target - Date.now());
            if (!remaining) {
                hideExpiredSale(node);
                return;
            }
            timer.textContent = remaining;
        });
    }

    updateCountdowns();
    window.setInterval(updateCountdowns, 1000);
})();
