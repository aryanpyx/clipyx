// The phone menu: site-nav.php's <details class="nav-menu"> opens and closes by itself (theme.css shows the links under
// the bar while it is open). This closes it where a native disclosure does not: on Escape, on a tap outside the header,
// on one of its links (a page's own #contact would scroll behind an open menu) and when the window grows past the phone
// layout.
(function () {
    "use strict";

    var menu = document.querySelector(".navbar > .nav-menu");
    if (!menu) return;

    var navbar = menu.parentElement;
    var wide = window.matchMedia("(min-width: 769px)");

    function close() {
        menu.open = false;
    }

    document.addEventListener("click", function (event) {
        if (!menu.open || !(event.target instanceof Element)) return;
        if (!navbar.contains(event.target) || event.target.closest(".nav-links a")) close();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape" || !menu.open) return;
        close();
        menu.querySelector("summary").focus();
    });
    if (wide.addEventListener) wide.addEventListener("change", close);
})();
