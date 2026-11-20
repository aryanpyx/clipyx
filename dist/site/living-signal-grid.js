(function () {
    'use strict';

    // Site background (the file keeps its historical name) and the home hero's silver layer.
    // Every public page gets the .site-signal-grid layer: node-effects.js measures the section lines onto it. Nothing else
    // decorates the pages: no smoke since 2026-10-25, and no margin node since 20261025-no-node (owner: "I actually don't
    // like the node ... Remove it. Let's keep it pure black for now"). The animation curve that stood right of the home
    // hero's text (hero-curve.js) gave way to the Latest news slideshow on 2026-10-26 (store.php, hero-news.js; owner:
    // "replace the curve with a latest news slideshow"); this file no longer loads it. Until 20261026-no-reveal the home
    // hero also showed a ghost of DaVinci Resolve's Fusion page inside a soft circle on the mouse, lit up by a Merge node
    // (owner, 2026-10-26: "Remove the cursor reveal thingy and the nodes revealing, uh, DaVinci Resolve layout in the
    // background"; its code: sync_backups/20261026-no-reveal/local-pre-edit/Repo/living-signal-grid.js). The hero
    // ([data-signal-hero]) keeps its host below for node-effects.js.
    const page = document.body;
    if (!page || page.dataset.signalInitialized || location.hostname === 'admin.clipyx.com') return;
    const styles = getComputedStyle(page);
    // Avoid mounting against an older cached theme during a versioned asset rollout.
    if (styles.getPropertyValue('--signal-continuous').trim() !== '1') return;
    const background = document.createElement('div');
    background.className = 'site-signal-grid';
    background.setAttribute('aria-hidden', 'true');
    page.prepend(background);
    page.classList.add('signal-page');
    page.dataset.signalInitialized = 'true';
    page.dataset.signalState = 'static';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    // ---- The hero's host ---------------------------------------------------------------------------------------------
    // window.clipyxSmoke (a historical name) hands the hero to node-effects.js: where its node buttons may go. The curve
    // that also read it (hero-curve.js, loaded here until 20261026-hero-news) is no longer loaded, and since
    // 20261026-no-reveal no easter egg answers a Merge node (node-effects.js asks for one only if it's there).
    const smokeHost = { layer: background, hero: null, lines: null, onScreen: () => true, heroSync: () => {} };
    window.clipyxSmoke = smokeHost;

    const hero = page.querySelector('[data-signal-hero]');
    if (!hero) return;
    hero.classList.add('signal-hero');
    let onScreen = true;

    // The floor: the hero's bottom line, no longer drawn (2026-10-14), the position the curve's box measures. The other hairlines and their travelling highlights went with the owner's "remove everything" (2026-10-12).
    const lines = document.createElement('div');
    lines.className = 'hero-lines';
    lines.setAttribute('aria-hidden', 'true');
    const floorLine = document.createElement('span');
    floorLine.className = 'hero-line hero-line--h';
    floorLine.style.top = '96%';
    lines.append(floorLine);
    hero.prepend(lines);

    smokeHost.hero = hero;
    smokeHost.lines = lines;
    smokeHost.onScreen = () => onScreen;
    // The node buttons' offsets before any drag (node-effects.js moves them, writing data-node-x and -y): their area is
    // measured from where the buttons belong, not where a visitor left them (Merge nodes aside).
    const nodeHome = new Map([...hero.querySelectorAll('.hero-button-group .btn')].map(b => [b, [parseFloat(b.dataset.nodeX || '0') || 0, parseFloat(b.dataset.nodeY || '0') || 0]]));
    const nodeShift = el => { const at = nodeHome.get(el); return at ? [(parseFloat(el.dataset.nodeX || '0') || 0) - at[0], (parseFloat(el.dataset.nodeY || '0') || 0) - at[1]] : [0, 0]; };
    // The right edge of the hero's text and node buttons, in hero pixels (the curve stood right of it).
    smokeHost.textRight = () => {
        const box = hero.getBoundingClientRect();
        const text = el => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect().right; }; // the text, not its box
        return Math.max(...[...hero.querySelectorAll('.hero-content h1, .hero-content p')].map(text), ...[...hero.querySelectorAll('.hero-button-group .btn:not(.hero-merge-node)')].map(node => node.getBoundingClientRect().right - nodeShift(node)[0]), box.left + box.width * 0.5) - box.left;
    };
    // The curve's box, in hero pixels, for hero-curve.js (which drew the curve in it; kept for it): the room right of the
    // text and node buttons, from 90 px right of the text (at
    // least the hero's middle) to 6% from its right edge, from 14% of the floor's height down to 8% above the floor. The
    // curve takes half of it, at most 440 x 400 px, centred (owner, 2026-10-15: "make the curve a little smaller", then
    // "a lot smaller"); where the room is narrow it widens into the margins. track: the lime dot's track under the box,
    // above the floor.
    smokeHost.curveBox = () => {
        const box = hero.getBoundingClientRect(), W = box.width, right = smokeHost.textRight();
        const floor = floorLine.getBoundingClientRect().top - box.top + 0.5;
        let x0 = Math.max(right + 90, W * 0.5), x1 = W - Math.max(70, W * 0.06);
        if (x1 - x0 < 220) { x0 = right + 40; x1 = W - 30; }
        const y0 = Math.max(70, floor * 0.14), y1 = floor - Math.max(40, floor * 0.08);
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = Math.min(220, (x1 - x0) * 0.25), hh = Math.min(200, (y1 - y0) * 0.25);
        return { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh, floor, track: cy + hh + Math.min(56, (floor - cy - hh) * 0.55) };
    };

    // Where node-effects.js keeps the node buttons (owner, 2026-10-15: "make it so that the nodes cannot go outside the
    // nodes area"), in hero pixels. It was the inside of the ghost Fusion page's Node editor until that page went
    // (20261026-no-reveal; owner: "Remove the cursor reveal thingy and the nodes revealing, uh, DaVinci Resolve layout in
    // the background"); now the same room without the drawing: from just above the buttons to 54px above the hero's
    // foot, from 24px left of the buttons to 24px short of the Latest news panel (or the hero's edge). Mouse desktops
    // only; elsewhere node-effects.js keeps its own bounds.
    smokeHost.nodeArea = () => {
        if (!finePointer.matches) return null;
        const box = hero.getBoundingClientRect();
        const buttons = [...hero.querySelectorAll('.hero-button-group .btn:not(.hero-merge-node)')];
        if (box.width < 700 || !buttons.length) return null;
        const home = buttons.map(el => { const r = el.getBoundingClientRect(), [dx, dy] = nodeShift(el); return { left: r.left - box.left - dx, top: r.top - box.top - dy }; });
        const news = hero.querySelector('[data-hero-news]');
        const newsLeft = news && news.offsetParent ? news.getBoundingClientRect().left - box.left : box.width;
        const left = Math.max(14, Math.min(...home.map(b => b.left)) - 24), right = Math.min(newsLeft - 24, box.width - 14);
        const top = Math.min(...home.map(b => b.top)) - 4, bottom = box.height - 54;
        return right - left > 120 && bottom - top > 40 ? { left, top, right, bottom } : null;
    };

    function syncMotion() {
        hero.classList.toggle('is-still', !(onScreen && !document.hidden && !reducedMotion.matches));
        smokeHost.heroSync();
    }
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
            onScreen = entries[entries.length - 1].isIntersecting;
            syncMotion();
        }).observe(hero);
    }
    document.addEventListener('visibilitychange', syncMotion);
    reducedMotion.addEventListener('change', syncMotion);
    syncMotion();
})();


(function() {
    // Clipyx Dynamic Animated Signal Grid & Node Network
    function initActiveSignalCanvas() {
        const hero = document.querySelector('[data-signal-hero]') || document.querySelector('.hero');
        if (!hero) return;
        
        let canvas = hero.querySelector('.clipyx-signal-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'clipyx-signal-canvas';
            canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:0; opacity:0.85;';
            hero.style.position = 'relative';
            hero.prepend(canvas);
        }
        
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        const numParticles = 45;
        const maxDist = 140;
        
        let mouseX = -1000, mouseY = -1000;
        window.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        });
        
        function resize() {
            width = canvas.width = hero.offsetWidth;
            height = canvas.height = hero.offsetHeight;
            initParticles();
        }
        
        function initParticles() {
            particles = [];
            for (let i = 0; i < numParticles; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.7,
                    vy: (Math.random() - 0.5) * 0.7,
                    radius: 1.5 + Math.random() * 2,
                    pulse: Math.random() * Math.PI,
                    speed: 0.02 + Math.random() * 0.03
                });
            }
        }
        
        function draw() {
            ctx.clearRect(0, 0, width, height);
            
            // Draw connecting lines between particles
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < maxDist) {
                        const alpha = (1 - dist / maxDist) * 0.22;
                        ctx.strokeStyle = `rgba(0, 162, 255, ${alpha})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            
            // Draw particles and mouse connections
            for (let p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.pulse += p.speed;
                
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;
                
                // Connect to mouse if near
                const mdx = p.x - mouseX;
                const mdy = p.y - mouseY;
                const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < 160) {
                    const mAlpha = (1 - mdist / 160) * 0.45;
                    ctx.strokeStyle = `rgba(0, 162, 255, ${mAlpha})`;
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouseX, mouseY);
                    ctx.stroke();
                }
                
                const curRadius = p.radius + Math.sin(p.pulse) * 0.8;
                ctx.fillStyle = `rgba(0, 162, 255, 0.85)`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.5, curRadius), 0, Math.PI * 2);
                ctx.fill();
            }
            
            requestAnimationFrame(draw);
        }
        
        resize();
        window.addEventListener('resize', resize);
        requestAnimationFrame(draw);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initActiveSignalCanvas);
    } else {
        initActiveSignalCanvas();
    }
})();
