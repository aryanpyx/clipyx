(function () {
    'use strict';

    // Springy titles (owner, 2026-10-26: "just find some satisfying effect. It doesn't have to be DaVinci Resolve related.
    // Surprise me and push it live"; then "make it for the 'most popular tools' title too"; then "make it for all titles").
    // Every title on the site's pages (h1 to h3) is made of little springs: the mouse nudges the letters near it aside, a
    // quick sweep flicks them, a click on a title (or in the empty space of the hero or a section header around it; not on
    // links or buttons) sends a ripple through it, and each letter settles back with a small wobble. Smaller titles move in
    // proportion to their type. On the home page a soft wave hops along the headline once a session, shortly after the page
    // opens, then along the Most Popular Tools title once it's fully in view; no other page has a hello.
    // Not springy: hidden titles, titles marked data-signature="off" (members' review titles), titles inside links, buttons,
    // the navigation, the footer, dialogs or the Latest news panel, titles that hold a link, a control or a picture, and
    // titles whose type a copy couldn't match (gradient text, capitalize).
    // To keep the type exactly as set (kerning included), a title keeps its text, transparent, while a copy of each letter
    // sits on its glyph and moves; letters bounce off the edges of a box that would otherwise cut them off. The copies exist
    // only while letters move or the mouse is near them; once all are home the title gets its own text back. The lime
    // periods never move. Mouse desktops only; nothing with reduced motion, forced colours or touch; a loop runs only while
    // letters move, and everything snaps home in hidden tabs, offscreen and on layout changes. Decorative: the copies are
    // hidden from assistive technology, which reads the titles themselves, and nothing here takes focus.
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const calm = [matchMedia('(prefers-reduced-motion: reduce)'), matchMedia('(forced-colors: active)')];
    const allowed = () => fine.matches && !calm.some(query => query.matches);
    if (!allowed()) return;

    const SPRING = 240;    // stiffness: how fast a letter heads home
    const DAMPING = 13;    // under-damped, so each one wobbles a little as it settles
    // For the home headline's type, 86.4px at 1440px wide; other titles take them in proportion to theirs.
    const BASE = 86.4;
    const REACH = 150;     // px around the mouse that nudges letters (never less than 0.3 of it, so small titles still answer)
    const PUSH = 26;       // px the nearest letter moves aside at most
    const FLICK = 0.03;    // how much of a quick sweep's speed the letters it passes take
    const WAVE = 1400;     // px/s a ripple travels (a click's at full speed on every title)
    const KICK = 900;      // px/s a click's ripple gives the letters nearest it
    const HELLO = 420;     // px/s upward hop the hello gives each letter (about 16px high)

    const hero = document.querySelector('[data-signal-hero]');
    const headline = hero && hero.querySelector('.hero-content h1');
    const tools = document.querySelector('#products .section-header h2');
    const HELLOS = new Map([[headline, 'clipyx-headline-hello'], [tools, 'clipyx-tools-hello']]);
    const SKIP = 'a, button, label, summary, nav, footer, dialog, [role="dialog"], [data-hero-news], .visually-hidden, [hidden], [aria-hidden="true"]';
    const fontSize = el => parseFloat(getComputedStyle(el).fontSize) || 0;
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    // How a text's letters look, as a copy's inline style; null where a copy couldn't match it (gradient or invisible ink,
    // and capitalize, which depends on the word around a letter).
    function look(el) {
        const s = getComputedStyle(el);
        if (s.textTransform === 'capitalize' || s.webkitTextFillColor !== s.color || s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text'
            || /^rgba\(.*,\s*0\)$|\/\s*0\)$|^transparent$/.test(s.color)) return null; // no ink: rgba(…, 0), color(… / 0)
        return `color: ${s.color}; font-family: ${s.fontFamily}; font-size: ${s.fontSize}; font-weight: ${s.fontWeight}; font-style: ${s.fontStyle}; ` +
            `font-stretch: ${s.fontStretch}; letter-spacing: ${s.letterSpacing}; text-transform: ${s.textTransform}; ` +
            `font-feature-settings: ${s.fontFeatureSettings}; font-variation-settings: ${s.fontVariationSettings};`;
    }
    // The nearest box above a title that cuts off what overflows it, in viewport pixels, and on which axes.
    function clipping(el) {
        for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
            const s = getComputedStyle(node), x = s.overflowX !== 'visible', y = s.overflowY !== 'visible';
            if (!x && !y) continue;
            const r = node.getBoundingClientRect();
            return { x, y, left: r.left + parseFloat(s.borderLeftWidth), right: r.right - parseFloat(s.borderRightWidth),
                top: r.top + parseFloat(s.borderTopWidth), bottom: r.bottom - parseFloat(s.borderBottomWidth) };
        }
        return null;
    }

    class Springy {
        // title: the heading; area: where the mouse counts; clicks: where a click ripples it; key: its hello's session flag.
        constructor(title, area, clicks, key) {
            Object.assign(this, { title, area, clicks, key, letters: [], layer: null, saved: null, pointer: null, frame: 0, last: 0, onScreen: true, size: '', unsafe: false });
            this.waves = [];
            this.scale = this.ratio();
            this.tick = this.tick.bind(this);
            area.addEventListener('pointerleave', () => { if (this.pointer) { this.pointer = null; this.start(); } });
            if ('IntersectionObserver' in window) {
                new IntersectionObserver(entries => {
                    this.onScreen = entries[entries.length - 1].isIntersecting;
                    if (!this.onScreen) this.home();
                }).observe(area);
            }
            // a layout change moves the glyphs: home at once, measured again on the next movement
            if ('ResizeObserver' in window) {
                new ResizeObserver(entries => {
                    const r = entries[entries.length - 1].contentRect, next = r.width + 'x' + r.height;
                    if (this.size && next !== this.size) { this.teardown(); this.scale = this.ratio(); }
                    this.size = next;
                }).observe(title);
            }
        }
        // Its type against the headline's.
        ratio() { return this.title === headline ? 1 : (fontSize(this.title) / BASE) || 1; }
        reach() { return REACH * Math.max(this.scale, 0.3); }
        // Its text box (the glyphs, not the heading's full-width box), widened by the mouse's reach.
        near(p) {
            const range = document.createRange();
            range.selectNodeContents(this.title);
            const r = range.getBoundingClientRect(), reach = this.reach();
            return p.x > r.left - reach && p.x < r.right + reach && p.y > r.top - reach && p.y < r.bottom + reach;
        }

        // The copies: one per visible character, each on its glyph (measured from the text itself) and looking like its
        // text, in a layer over the heading; then the heading's own text turns transparent.
        build() {
            if (this.layer) return true;
            if (this.unsafe || !allowed() || !this.onScreen || document.hidden) return false;
            const title = this.title;
            try {
                const glyphs = [], looks = new Map();
                const range = document.createRange();
                const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
                for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                    let at = 0;
                    for (const ch of node.data) {
                        if (ch.trim()) {
                            range.setStart(node, at);
                            range.setEnd(node, at + ch.length);
                            const r = range.getBoundingClientRect();
                            if (r.width && r.height) {
                                if (!looks.has(node.parentElement)) looks.set(node.parentElement, look(node.parentElement));
                                glyphs.push([ch, r, looks.get(node.parentElement)]);
                            }
                        }
                        at += ch.length;
                    }
                }
                if (!glyphs.length) return false;
                if ([...looks.values()].includes(null)) { this.unsafe = true; return false; }
                this.scale = this.ratio();
                const clip = clipping(title);
                this.saved = [title.style.position, [...looks.keys()].map(el => [el, el.style.color])];
                if (getComputedStyle(title).position === 'static') title.style.position = 'relative';
                const layer = this.layer = document.createElement('span');
                layer.setAttribute('aria-hidden', 'true');
                layer.style.cssText = 'position: absolute; inset: 0; pointer-events: none; user-select: none;';
                title.append(layer);
                const box = layer.getBoundingClientRect();
                this.letters = glyphs.map(([ch, r, style]) => {
                    const el = document.createElement('span');
                    el.textContent = ch;
                    el.style.cssText = `position: absolute; left: ${r.left - box.left}px; top: ${r.top - box.top}px; height: ${r.height}px; line-height: ${r.height}px; white-space: pre; ${style}`;
                    layer.append(el);
                    // how far it may go inside a box that would cut it off, with room for its tilt
                    const mx = 0.12 * r.height + 1, my = 0.12 * r.width + 1;
                    return { el, cx: r.left - box.left + r.width / 2, cy: r.top - box.top + r.height / 2, x: 0, y: 0, vx: 0, vy: 0, moving: false,
                        x0: clip && clip.x ? Math.min(0, clip.left - r.left + mx) : -Infinity, x1: clip && clip.x ? Math.max(0, clip.right - r.right - mx) : Infinity,
                        y0: clip && clip.y ? Math.min(0, clip.top - r.top + my) : -Infinity, y1: clip && clip.y ? Math.max(0, clip.bottom - r.bottom - my) : Infinity };
                });
                for (const el of looks.keys()) el.style.color = 'transparent'; // their text stays for layout, selection and screen readers
                return true;
            } catch (error) {
                this.teardown();
                return false;
            }
        }
        teardown() {
            cancelAnimationFrame(this.frame);
            this.frame = 0;
            this.waves.length = 0;
            if (!this.layer) return;
            this.layer.remove();
            this.layer = null;
            this.letters = [];
            this.title.style.position = this.saved[0];
            for (const [el, color] of this.saved[1]) el.style.color = color;
        }
        home() { this.pointer = null; this.teardown(); }

        start() { if (!this.frame && this.layer) { this.last = 0; this.frame = requestAnimationFrame(this.tick); } }
        tick(now) {
            this.frame = 0;
            if (!this.layer) return;
            const dt = this.last ? Math.min(0.033, (now - this.last) / 1000) : 1 / 60;
            this.last = now;
            const k = this.scale, reach = this.reach(), push = PUSH * k;
            const box = this.layer.getBoundingClientRect();
            let busy = false, away = false;
            for (let i = this.waves.length - 1; i >= 0; i--) {
                const wave = this.waves[i], radius = Math.max(0, now - wave.at) / 1000 * wave.speed;
                for (const l of this.letters) {
                    if (wave.hit.has(l)) continue;
                    const dx = l.cx - wave.x, dy = l.cy - wave.y, d = Math.hypot(dx, dy) || 1;
                    if (d > radius) continue;
                    wave.hit.add(l);
                    l.moving = true;
                    if (wave.hop) { l.vy -= wave.power; continue; } // the hello: each letter hops as the wave passes
                    const strength = wave.power / (1 + d / 260);    // a click: pushed away from it, the nearer the more
                    l.vx += dx / d * strength;
                    l.vy += dy / d * strength - strength * 0.25;    // with a little lift, so it reads as a bounce
                }
                if (wave.hit.size < this.letters.length && radius < 4000) busy = true; else this.waves.splice(i, 1);
            }
            const px = this.pointer ? this.pointer.x - box.left : 0, py = this.pointer ? this.pointer.y - box.top : 0;
            for (const l of this.letters) {
                let tx = 0, ty = 0;
                if (this.pointer) {
                    const dx = l.cx - px, dy = l.cy - py, d = Math.hypot(dx, dy);
                    if (d < reach) { const f = (1 - d / reach) ** 2 * push / (d || 1); tx = Math.max(l.x0, Math.min(l.x1, dx * f)); ty = Math.max(l.y0, Math.min(l.y1, dy * f)); }
                }
                if (!l.moving && !tx && !ty) continue;
                l.moving = true;
                l.vx += (SPRING * (tx - l.x) - DAMPING * l.vx) * dt;
                l.vy += (SPRING * (ty - l.y) - DAMPING * l.vy) * dt;
                l.x += l.vx * dt;
                l.y += l.vy * dt;
                // a box's edge: it bounces back softly instead of being cut off
                if (l.x < l.x0) { l.x = l.x0; if (l.vx < 0) l.vx *= -0.35; } else if (l.x > l.x1) { l.x = l.x1; if (l.vx > 0) l.vx *= -0.35; }
                if (l.y < l.y0) { l.y = l.y0; if (l.vy < 0) l.vy *= -0.35; } else if (l.y > l.y1) { l.y = l.y1; if (l.vy > 0) l.vy *= -0.35; }
                if (Math.abs(l.x - tx) < 0.05 && Math.abs(l.y - ty) < 0.05 && Math.abs(l.vx) < 1 && Math.abs(l.vy) < 1) {
                    l.x = tx; l.y = ty; l.vx = l.vy = 0; // settled: home, or held aside by a resting mouse
                    if (!tx && !ty) { l.moving = false; l.el.style.transform = ''; continue; }
                } else busy = true;
                away = true;
                const turn = Math.max(-14, Math.min(14, (l.x * 0.5 + l.vx * 0.004) / k));
                l.el.style.transform = `translate(${l.x.toFixed(2)}px, ${l.y.toFixed(2)}px) rotate(${turn.toFixed(2)}deg)`;
            }
            if (busy) this.frame = requestAnimationFrame(this.tick);
            else if (!away && !(this.pointer && this.near(this.pointer))) this.teardown(); // all home: its own text back
        }

        move(event) {
            if (!(event.target instanceof Node) || !this.area.contains(event.target)) {
                if (this.pointer) { this.pointer = null; this.start(); }
                return;
            }
            const previous = this.pointer, pointer = this.pointer = { x: event.clientX, y: event.clientY, t: event.timeStamp };
            if (!this.layer && !(this.near(pointer) && this.build())) return;
            if (previous && event.timeStamp > previous.t) {
                // a quick sweep flicks the letters it passes, in its direction
                const dt = Math.max(8, event.timeStamp - previous.t) / 1000;
                let vx = (pointer.x - previous.x) / dt, vy = (pointer.y - previous.y) / dt;
                const speed = Math.hypot(vx, vy);
                if (speed > 4000) { vx *= 4000 / speed; vy *= 4000 / speed; }
                const box = this.layer.getBoundingClientRect(), reach = this.reach() * 0.6, flick = FLICK * this.scale;
                for (const l of this.letters) {
                    const d = Math.hypot(l.cx - (pointer.x - box.left), l.cy - (pointer.y - box.top));
                    if (d < reach) { const f = flick * (1 - d / reach); l.vx += vx * f; l.vy += vy * f; l.moving = true; }
                }
            }
            this.start();
        }
        // A click in its space, except on links, buttons and the news panel, sends a ripple through its letters.
        press(event) {
            if (!this.clicks.contains(event.target) || event.target.closest('a, button, input, select, textarea, label, summary, [data-hero-news], .hero-button-group')) return;
            if (!this.build()) return;
            const box = this.layer.getBoundingClientRect();
            this.waves.push({ x: event.clientX - box.left, y: event.clientY - box.top, at: performance.now(), hit: new Set(), power: KICK * this.scale, speed: WAVE });
            this.start();
        }

        // The hello: a soft wave hops along it (not if the visitor is already at its letters).
        hello() {
            if (this.layer || (this.pointer && this.near(this.pointer)) || !this.build()) return false;
            try { sessionStorage.setItem(this.key, '1'); } catch (error) {}
            const first = this.letters[0];
            // in proportion, so smaller letters hop to the same beat
            this.waves.push({ x: first.cx - 40 * this.scale, y: first.cy, at: performance.now(), hit: new Set(), power: HELLO * this.scale, speed: WAVE * this.scale, hop: true });
            this.start();
            return true;
        }
        greeted() { try { return sessionStorage.getItem(this.key) === '1'; } catch (error) { return false; } }
        // Resolves once it's fully in view (and has been for a moment).
        inView() {
            return new Promise(resolve => {
                if (!('IntersectionObserver' in window)) return resolve(false);
                const watch = new IntersectionObserver(entries => {
                    if (entries[entries.length - 1].intersectionRatio < 0.95) return;
                    watch.disconnect();
                    wait(300).then(() => resolve(true));
                }, { threshold: [0.95] });
                watch.observe(this.title);
            });
        }
    }

    // The titles: the mouse counts in the hero or the title's section, a click ripples it in the hero, its section header or
    // on the title itself.
    const springs = [...document.querySelectorAll('h1, h2, h3')]
        .filter(title => !title.matches('[data-signature="off"]') && !title.closest(SKIP) && title.textContent.trim()
            && !title.querySelector('a, button, input, select, textarea, svg, img, picture, video, canvas'))
        .map(title => new Springy(title,
            title.closest('[data-signal-hero], section, header, article, aside, main') || document.body,
            title.closest('[data-signal-hero], .section-header, .store-page-header, .tool-page-header') || title,
            HELLOS.get(title) || ''));
    if (!springs.length) return;

    // The mouse, watched from the window: node-effects.js stops presses and drags in the hero before they reach it.
    window.addEventListener('pointermove', event => {
        if (event.pointerType === 'mouse') for (const spring of springs) spring.move(event);
    }, { capture: true, passive: true });
    window.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' && event.button === 0 && event.target instanceof Element) for (const spring of springs) spring.press(event);
    }, true);
    window.addEventListener('scroll', () => { for (const spring of springs) if (spring.pointer) spring.start(); }, { passive: true });

    // The hellos (home page), one at a time: the headline's 0.9 s after the fonts are in (not if the visitor has scrolled
    // down), then the Most Popular Tools title's once it's fully in view; never in a hidden tab.
    const showing = () => new Promise(resolve => {
        if (!document.hidden) resolve();
        else document.addEventListener('visibilitychange', () => wait(600).then(resolve), { once: true });
    });
    let hellos = (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => wait(900));
    for (const spring of springs) {
        if (!spring.key || spring.greeted()) continue;
        const ready = spring.title === headline ? () => scrollY <= 40 : () => spring.inView();
        hellos = hellos.then(ready).then(go => go && showing().then(() => spring.hello() && wait(1100)));
    }

    // Home at once when the page goes out of view, the motion settings change or fonts load (the next movement measures
    // the glyphs again).
    document.addEventListener('visibilitychange', () => { if (document.hidden) for (const spring of springs) spring.home(); });
    for (const query of [fine, ...calm]) query.addEventListener('change', () => { if (!allowed()) for (const spring of springs) spring.home(); });
    if (document.fonts) document.fonts.addEventListener('loadingdone', () => { for (const spring of springs) spring.teardown(); });
})();
