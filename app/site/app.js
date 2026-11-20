/* ============================================================
   Clipyx — Main Site JavaScript
   Library search, news ticker, hero canvas, interactivity
   ============================================================ */

// ---------- Globals ----------
let libraryData = [];
let filteredData = [];
let currentFilter = 'all';
let currentSearch = '';
let displayCount = 30;
const ITEMS_PER_PAGE = 30;

// ---------- DOM Ready ----------
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initHeroCanvas();
    initNewsTicker();
    initLibrary();
    initSmoothScroll();
});

// ============================================================
// NAVBAR
// ============================================================
function initNavbar() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    if (toggle && links) {
        toggle.addEventListener('click', () => links.classList.toggle('open'));
        links.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => links.classList.remove('open'));
        });
    }

    // Scroll-based active state
    const sections = document.querySelectorAll('section[id], header[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollY = window.scrollY + 100;
                let current = '';
                sections.forEach(sec => {
                    if (sec.offsetTop <= scrollY) current = sec.id;
                });
                navLinks.forEach(a => {
                    a.classList.remove('active');
                    if (a.getAttribute('href') === '#' + current) a.classList.add('active');
                });

                // Navbar background on scroll
                const navbar = document.getElementById('navbar');
                if (navbar) {
                    navbar.style.borderBottomColor = window.scrollY > 20 ? 'var(--border)' : 'var(--border-subtle)';
                }
                ticking = false;
            });
            ticking = true;
        }
    });
}

// ============================================================
// HERO CANVAS — animated signal grid
// ============================================================
function initHeroCanvas() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, cols, rows;
    const cellSize = 40;
    const dots = [];

    function resize() {
        w = canvas.width = canvas.offsetWidth;
        h = canvas.height = canvas.offsetHeight;
        cols = Math.ceil(w / cellSize);
        rows = Math.ceil(h / cellSize);
        dots.length = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                dots.push({
                    x: c * cellSize + cellSize / 2,
                    y: r * cellSize + cellSize / 2,
                    base: 0.06 + Math.random() * 0.04,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.3 + Math.random() * 0.5
                });
            }
        }
    }

    function draw(t) {
        ctx.clearRect(0, 0, w, h);
        const time = t * 0.001;
        for (const d of dots) {
            const pulse = Math.sin(time * d.speed + d.phase);
            const alpha = d.base + pulse * 0.03;
            ctx.fillStyle = `rgba(0, 162, 255, ${Math.max(0, alpha)})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Occasional bright signal lines
        const lineCount = 3;
        for (let i = 0; i < lineCount; i++) {
            const progress = ((time * 0.15 + i * 0.33) % 1);
            const y = progress * h;
            const gradient = ctx.createLinearGradient(0, y, w, y);
            gradient.addColorStop(0, 'rgba(0,162,255,0)');
            gradient.addColorStop(0.3 + Math.sin(time + i) * 0.2, `rgba(0,162,255,${0.04 + Math.sin(time * 2 + i) * 0.02})`);
            gradient.addColorStop(1, 'rgba(0,162,255,0)');
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
}

// ============================================================
// NEWS TICKER
// ============================================================
function initNewsTicker() {
    const slides = document.querySelectorAll('.hero-news-slide');
    const bars = document.querySelectorAll('.news-bar');
    if (slides.length === 0) return;

    let current = 0;
    let interval;

    function showSlide(idx) {
        slides.forEach(s => s.classList.remove('active'));
        bars.forEach(b => b.classList.remove('active'));
        slides[idx].classList.add('active');
        bars[idx].classList.add('active');
        current = idx;
    }

    function next() {
        showSlide((current + 1) % slides.length);
    }

    bars.forEach(bar => {
        bar.addEventListener('click', () => {
            clearInterval(interval);
            showSlide(parseInt(bar.dataset.slide));
            interval = setInterval(next, 5000);
        });
    });

    interval = setInterval(next, 5000);
}

// ============================================================
// LIBRARY — fetch, search, filter, render
// ============================================================
async function initLibrary() {
    try {
        const res = await fetch('/api/library');
        libraryData = await res.json();
        updateCounts();
        applyFilters();
    } catch (e) {
        document.getElementById('libraryGrid').innerHTML =
            '<div class="library-loading">Could not load library data. Make sure the server is running.</div>';
    }

    // Search input
    const searchInput = document.getElementById('librarySearch');
    if (searchInput) {
        let debounce;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                currentSearch = searchInput.value.trim().toLowerCase();
                displayCount = ITEMS_PER_PAGE;
                applyFilters();
            }, 200);
        });
    }

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            displayCount = ITEMS_PER_PAGE;
            applyFilters();
        });
    });

    // Load more button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            displayCount += ITEMS_PER_PAGE;
            renderLibrary();
        });
    }
}

function updateCounts() {
    const counts = { expression: 0, motion: 0, tree: 0, script: 0 };
    libraryData.forEach(item => {
        const t = (item.type || '').toLowerCase();
        if (counts[t] !== undefined) counts[t]++;
    });
    const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    el('countAll', libraryData.length);
    el('countExpr', counts.expression);
    el('countMotion', counts.motion);
    el('countTree', counts.tree);
    el('countScript', counts.script);
}

function applyFilters() {
    filteredData = libraryData.filter(item => {
        // Type filter
        if (currentFilter !== 'all') {
            const t = (item.type || '').toLowerCase();
            if (t !== currentFilter) return false;
        }
        // Search filter
        if (currentSearch) {
            const haystack = `${item.title} ${item.summary} ${item.slug} ${item.category} ${item.type} ${item.tool} ${item.input}`.toLowerCase();
            if (!haystack.includes(currentSearch)) return false;
        }
        return true;
    });
    renderLibrary();
}

function renderLibrary() {
    const grid = document.getElementById('libraryGrid');
    const moreSection = document.getElementById('libraryMore');
    const showingLabel = document.getElementById('libraryShowing');
    if (!grid) return;

    const toShow = filteredData.slice(0, displayCount);

    if (toShow.length === 0) {
        grid.innerHTML = '<div class="library-empty">No items found. Try a different search or filter.</div>';
        if (moreSection) moreSection.style.display = 'none';
        return;
    }

    grid.innerHTML = toShow.map(item => {
        const typeClass = `type-${(item.type || 'expression').toLowerCase()}`;
        const tipHtml = item.tip ? `<div class="library-item-tip">💡 ${escapeHtml(item.tip)}</div>` : '';
        return `
        <div class="library-item" data-slug="${escapeHtml(item.slug || '')}">
            <div class="library-item-header">
                <div class="library-item-title">${escapeHtml(item.title || 'Untitled')}</div>
                <span class="library-item-type ${typeClass}">${escapeHtml(item.type || 'item')}</span>
            </div>
            <div class="library-item-meta">${escapeHtml(item.category || 'General')} · ${escapeHtml(item.tool || 'Fusion')} · ${escapeHtml(item.input || 'N/A')}</div>
            <div class="library-item-summary">${escapeHtml(item.summary || '')}</div>
            ${tipHtml}
            <div class="library-item-actions">
                <button class="btn btn--sm btn--outline" onclick="copySlug('${escapeHtml(item.slug || '')}')">📋 Copy Slug</button>
            </div>
        </div>`;
    }).join('');

    // Load more
    if (moreSection) {
        if (filteredData.length > displayCount) {
            moreSection.style.display = 'flex';
            if (showingLabel) showingLabel.textContent = `Showing ${toShow.length} of ${filteredData.length} items`;
        } else {
            moreSection.style.display = 'none';
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Global function for filtering from product cards
function filterLibrary(query) {
    const searchInput = document.getElementById('librarySearch');
    if (searchInput) {
        searchInput.value = query;
        currentSearch = query.toLowerCase();
        displayCount = ITEMS_PER_PAGE;
        applyFilters();
    }
}

// Copy slug to clipboard
function copySlug(slug) {
    navigator.clipboard.writeText(slug).then(() => showToast(`Copied: ${slug}`)).catch(() => {});
}

// Toast notification
function showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

// ============================================================
// SMOOTH SCROLL
// ============================================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const target = document.querySelector(a.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}
