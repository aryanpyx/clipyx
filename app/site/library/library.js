// Clipyx Library (/library/): type tabs (Expressions, Motion graphics, Node trees, Scripts, AI Integration; ?type= keeps
// the tab in the URL), category chips (AI Integration's are its sub-tabs Skills, Repos and MCP) and search ("/" focuses it) filter the server-rendered tiles; Copy puts an expression, a node tree
// or a script on the clipboard; a tile opens its item dialog (/library/<slug>, shareable). Preview loops load
// and play only while their tile is visible, pause offscreen and in hidden tabs, and release their decoder when far
// away. Reduced motion and Save-Data start with Autoplay off (hover or keyboard focus still plays one); the Autoplay
// switch lets anyone stop or restart them, and the choice is remembered in this browser.
(() => {
    'use strict';
    const root = document.querySelector('[data-library]');
    const source = document.getElementById('library-data');
    const dialog = document.getElementById('library-detail');
    if (!root || !source || !dialog) return;
    const data = JSON.parse(source.textContent);
    const items = new Map(data.items.map(item => [item.slug, item]));
    // Sign-in to copy: guests get no code, and their Copy controls are links to the login (back to the item).
    const signedIn = true;
    const loginFor = slug => '/login?redirect=' + encodeURIComponent('/library/' + slug);
    const tiles = [...root.querySelectorAll('.library-tile')];
    const search = document.getElementById('library-search');
    const status = root.querySelector('[data-library-status]');
    const empty = root.querySelector('[data-library-empty]');
    const toggle = root.querySelector('[data-library-previews]');
    const toast = document.querySelector('[data-library-toast]');
    const field = name => dialog.querySelector('[data-field="' + name + '"]');
    const detailVideo = field('video');
    const detailCopy = dialog.querySelector('[data-copy]');
    const detailSignIn = dialog.querySelector('[data-signin]');
    const detailStatus = dialog.querySelector('[data-detail-status]');
    const copyLink = dialog.querySelector('[data-copy-link]');
    const detailLike = dialog.querySelector('[data-detail-like]');
    const detailLikeSignIn = dialog.querySelector('[data-detail-like-signin]');
    const nav = dialog.querySelector('[data-detail-nav]');
    const download = dialog.querySelector('[data-download]'); // members: an AI guide as its file
    const detailIcon = field('icon');
    const SPRITE = '/assets/iconizo/iconizo-sprite.svg?v=1.0.0#iz-';
    const STORAGE = 'clipyx-library-previews';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    const NOUNS = { expression: ['expression', 'expressions'], motion: ['motion graphic', 'motion graphics'], tree: ['node tree', 'node trees'],
        script: ['script', 'scripts'], tool: ['tool', 'tools'], skills: ['skill', 'skills'], repos: ['repo', 'repos'], mcp: ['MCP server', 'MCP servers'],
        favorites: ['favorite', 'favorites'] };
    const plural = (count, type) => count + ' ' + NOUNS[type][count === 1 ? 0 : 1];
    const isTree = item => item.type === 'motion' || item.type === 'tree';
    const isScript = item => item.type === 'script';
    const isAi = item => item.type === 'ai'; // an AI guide: text for an AI chat (link items open their link instead)
    const opensLink = tile => Boolean((items.get(tile.dataset.slug) || {}).url); // a tool or a link, never the dialog
    const where = item => isTree(item) ? 'the Node Editor' : isScript(item) ? 'the Console' : isAi(item) ? 'an AI chat' : item.paste;
    const copyLabel = item => isTree(item) ? 'Copy node tree' : isScript(item) ? 'Copy script' : isAi(item) ? 'Copy guide' : 'Copy expression';
    // What to do with a copy in Fusion, as the item window's how-to says it (members on Discord, 2026-10-27: "how to
    // use these expressions"); the shortcut follows the visitor's system.
    const paste = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? 'Cmd+V' : 'Ctrl+V';
    const steps = item => isScript(item) ? 'In Fusion, open Workspace › Console, choose Lua, paste and press Enter.'
        : isTree(item) ? 'In Fusion, click an empty spot in the Node Editor and press ' + paste + '.'
        : isAi(item) ? 'Paste it into an AI chat, then describe what you want.'
        : 'In Fusion, right-click ' + item.input + ' in the Inspector, choose Expression, paste and press Enter.';
    let previews = true;
    let remembered = false;
    try {
        const saved = localStorage.getItem(STORAGE);
        if (saved === 'on' || saved === 'off') { previews = saved === 'on'; remembered = true; }
    } catch { remembered = false; }
    const visible = new Set();
    // Tile loops play only while previews are on, the tab is visible and no item dialog covers them.
    const tilesLive = () => previews && !document.hidden && !dialog.open;

    // Filters and search ----------------------------------------------------------------------------------------------
    const pressedType = root.querySelector('.library-tab[aria-pressed="true"]');
    const chips = root.querySelector('.library-chips');
    // On phones the type tabs and the category chips scroll sideways: mark the edge that still has more, so the CSS
    // fades it as the store's reviews do (site review D28, 2026-11-11: they ran off the edge with no hint).
    const scrollRows = [root.querySelector('.library-tabs'), chips].filter(Boolean);
    const edges = () => {
        for (const row of scrollRows) {
            const max = row.scrollWidth - row.clientWidth, more = max > 1;
            row.classList.toggle('can-scroll-left', more && row.scrollLeft > 1);
            row.classList.toggle('can-scroll-right', more && row.scrollLeft < max - 1);
        }
    };
    for (const row of scrollRows) row.addEventListener('scroll', edges, { passive: true });
    addEventListener('resize', edges);
    edges();
    if (document.fonts) document.fonts.ready.then(edges); // the labels' widths settle once Inter has loaded
    const pressedChip = chips.querySelector('[aria-pressed="true"]');
    const state = { type: pressedType ? pressedType.dataset.type : 'expression', category: pressedChip ? pressedChip.dataset.category : 'all', words: [] };
    // AI Integration has no "All": it opens on its first sub-tab, and an empty sub-tab says it is coming soon.
    const AI = 'ai';
    const allChip = chips.querySelector('[data-category="all"]');
    // On a phone the tab row scrolls sideways: keep the open tab in view (a ?type= or item link can open on the last one).
    if (pressedType) {
        const over = pressedType.getBoundingClientRect().right - pressedType.parentElement.getBoundingClientRect().right;
        if (over > 0) pressedType.parentElement.scrollLeft += over;
    }
    // The chip row too, at any width: a ?category= link can open on a chip past the row's right edge (2026-11-12:
    // Motion graphics has twelve chips since the Interface category, wider than the page at 1440 px).
    if (pressedChip) {
        const over = pressedChip.getBoundingClientRect().right - chips.getBoundingClientRect().right;
        if (over > 0) chips.scrollLeft += over + 16;
    }
    const soonNotes = [...root.querySelectorAll('[data-library-soon]')];
    // Locked items (2026-10-29): lock tiles with no name, shown with their AI sub-tab and counted there, never searched;
    // in Motion graphics they sit in the grid, shown with All and their category.
    const lockedGrids = [...root.querySelectorAll('[data-library-locked]')];
    const lockedTiles = [...root.querySelectorAll('.library-locked-tile[data-locked-type]')];
    // Sort (owner, 2026-10-29: "sort by new, both on expressions and motion graphics"): Most liked, or Newest (the latest
    // day first, a day's items in the Library's own order), offered on those two tabs. It moves the tiles themselves, so
    // Previous and Next follow it; ?sort=new keeps it in the URL.
    const SORTABLE = new Set(['expression', 'motion']);
    const TYPE_ORDER = ['expression', 'motion', 'tool', 'tree', 'script', 'ai'];
    const sortBox = root.querySelector('[data-library-sort]');
    const sortSelect = sortBox.querySelector('select');
    const grid = root.querySelector('.library-grid');
    state.sort = sortSelect.value;
    function byNewest(a, b) {
        const [x, y] = [a.dataset.added || '', b.dataset.added || ''];
        return x === y ? a.dataset.order - b.dataset.order : x < y ? 1 : -1;
    }
    function sortTiles() {
        tiles.sort((a, b) => state.sort !== 'new' ? a.dataset.rank - b.dataset.rank
            : TYPE_ORDER.indexOf(a.dataset.type) - TYPE_ORDER.indexOf(b.dataset.type)
                || (SORTABLE.has(a.dataset.type) ? byNewest(a, b) : a.dataset.rank - b.dataset.rank));
        const anchor = grid.querySelector('.library-locked-tile'); // lock tiles stay last
        for (const tile of tiles) grid.insertBefore(tile, anchor);
        refresh(); // a moved tile's loop pauses
    }
    sortSelect.addEventListener('change', () => {
        state.sort = sortSelect.value;
        sortTiles();
        remember();
    });
    // Search reads titles, summaries, categories, targets, the nodes a tree is made of and what kind of item it is, with
    // British and American spellings treated alike (colour/color, centre/center, grey/gray).
    const spell = text => String(text).toLowerCase().replace(/colour/g, 'color').replace(/centre/g, 'center').replace(/grey/g, 'gray');
    const KIND_WORDS = { expression: 'expression', motion: 'motion graphic node tree group', tree: 'node tree effect look',
        script: 'script lua console', tool: 'tool web tool', ai: 'ai integration' };
    const haystack = new Map(tiles.map(tile => {
        const item = items.get(tile.dataset.slug) || {};
        return [tile, spell([item.title, item.summary, item.category, item.tool, item.input, item.paste, item.nodes, KIND_WORDS[item.type]].join(' '))];
    }));
    // Favorites (owner, 2026-11-04: "when users ... like a preset, add it to a new tab called Favorites. They get saved
    // there regardless of type ... on that page, they can sort them just like we have these tabs under motion graphics"):
    // the items this member likes, whatever their type, with a chip for each of their categories (one per name), in the
    // chips' own order. A heart changes the tab's count at once; the grid and its chips follow at the next filter, so a
    // tile never goes from under the visitor's hand (one unliked by mistake is a tap away from coming back).
    const FAVORITES = 'favorites';
    const favoritesCount = root.querySelector('[data-favorites-count]');
    const favoritesEmpty = root.querySelector('[data-library-favorites-empty]');
    const liked = tile => Boolean((items.get(tile.dataset.slug) || {}).liked);
    const aiChip = chips.querySelector('[data-type="ai"]');
    const chipOrder = [...chips.querySelectorAll('[data-type]:not([data-type="favorites"])')].map(chip => chip.dataset.category);
    function countFavorites() {
        const count = tiles.filter(liked).length;
        favoritesCount.textContent = count || '';
        favoritesCount.hidden = count === 0;
    }
    function syncFavoriteChips() {
        const found = new Map(); // category => [name, count]
        for (const tile of tiles) {
            if (!liked(tile)) continue;
            const entry = found.get(tile.dataset.category) || [items.get(tile.dataset.slug).category, 0];
            entry[1]++;
            found.set(tile.dataset.category, entry);
        }
        if (state.category !== 'all' && !found.has(state.category)) {
            state.category = 'all';
            press(chips, allChip);
        }
        const rank = key => { const at = chipOrder.indexOf(key); return at < 0 ? chipOrder.length : at; };
        const existing = new Map([...chips.querySelectorAll('[data-type="favorites"]')].map(chip => [chip.dataset.category, chip]));
        for (const [key, chip] of existing) if (!found.has(key)) chip.remove();
        // the chips kept stay where they are (a focused one keeps its focus); a new one goes before the one after it
        let next = aiChip;
        for (const key of [...found.keys()].sort((a, b) => rank(b) - rank(a))) {
            let chip = existing.get(key);
            if (!chip) {
                chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'library-chip';
                chip.dataset.type = FAVORITES;
                chip.dataset.category = key;
                const count = document.createElement('span');
                count.className = 'library-chip-count';
                chip.append(found.get(key)[0] + ' ', count);
                chips.insertBefore(chip, next);
            }
            chip.querySelector('.library-chip-count').textContent = found.get(key)[1];
            chip.setAttribute('aria-pressed', String(key === state.category));
            chip.hidden = state.type !== FAVORITES;
            next = chip;
        }
    }
    function apply() {
        const favorites = state.type === FAVORITES;
        if (favorites) syncFavoriteChips();
        let shown = 0, total = 0;
        for (const tile of tiles) {
            const ofType = favorites ? liked(tile) : tile.dataset.type === state.type && (state.type !== AI || tile.dataset.category === state.category);
            const match = ofType
                && (state.category === 'all' || tile.dataset.category === state.category)
                && state.words.every(word => haystack.get(tile).includes(word));
            tile.hidden = !match;
            if (ofType) total++;
            if (match) shown++;
        }
        for (const grid of lockedGrids) {
            const ofSection = state.type === AI && grid.dataset.libraryLocked === state.category;
            grid.hidden = !ofSection || state.words.length > 0;
            if (ofSection) total += grid.children.length;
            if (!grid.hidden) shown += grid.children.length;
        }
        for (const tile of lockedTiles) {
            const ofType = tile.dataset.lockedType === state.type;
            tile.hidden = !ofType || state.words.length > 0 || (state.category !== 'all' && tile.dataset.lockedCategory !== state.category);
            if (ofType) total++;
            if (!tile.hidden) shown++;
        }
        if (favorites) search.placeholder = 'Search ' + plural(total, FAVORITES); // its count moves with the hearts
        const noun = state.type === AI ? state.category : state.type;
        status.textContent = shown === total ? plural(total, noun) : shown + ' of ' + plural(total, noun);
        const soon = state.type === AI && total === 0;
        for (const note of soonNotes) note.hidden = !soon || note.dataset.librarySoon !== state.category;
        favoritesEmpty.hidden = !favorites || total > 0; // none yet: how to add one (a guest: sign in first)
        empty.hidden = shown > 0 || soon || !favoritesEmpty.hidden;
    }
    // The URL remembers any tab but the first and a chosen category (?category=, owner 2026-10-29: "add the category text
    // link"), so the view can be shared; AI Integration's sub-tabs stay out of it.
    function linkState(url) {
        if (state.type === 'expression') url.searchParams.delete('type'); else url.searchParams.set('type', state.type);
        if (state.type === AI || state.category === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', state.category);
        if (state.sort === 'new' && SORTABLE.has(state.type)) url.searchParams.set('sort', 'new'); else url.searchParams.delete('sort');
        return url;
    }
    function remember() {
        if (!dialog.open) history.replaceState(history.state, '', linkState(new URL(location.href)));
    }
    // A tab shows its own category chips and starts on All.
    function showType(type) {
        const ai = type === AI;
        state.type = type;
        for (const chip of chips.querySelectorAll('[data-type]')) chip.hidden = chip.dataset.type !== type;
        allChip.hidden = ai;
        const first = ai ? chips.querySelector('[data-type="ai"]') : allChip;
        state.category = first.dataset.category;
        press(chips, first);
        search.placeholder = ai ? 'Search AI integration' : 'Search ' + plural(type === FAVORITES ? tiles.filter(liked).length
            : [...tiles, ...lockedTiles].filter(tile => (tile.dataset.type || tile.dataset.lockedType) === type).length, type);
        toggle.hidden = ai; // no preview loops to pause
        sortBox.hidden = !SORTABLE.has(type);
        remember();
        edges(); // the chips changed with the tab
    }
    function press(group, button) {
        for (const other of group.querySelectorAll('[aria-pressed]')) other.setAttribute('aria-pressed', String(other === button));
    }
    search.addEventListener('input', () => {
        state.words = spell(search.value).split(/\s+/).filter(Boolean);
        apply();
    });
    root.querySelector('[data-library-clear]').addEventListener('click', () => {
        search.value = '';
        state.words = [];
        if (state.type !== AI) { // AI Integration keeps its sub-tab
            state.category = 'all';
            press(chips, allChip);
        }
        apply();
        remember();
        search.focus();
    });
    // "/" jumps to the search field unless the visitor is typing somewhere or an item is open.
    document.addEventListener('keydown', event => {
        if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || dialog.open) return;
        const active = document.activeElement;
        if (active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))) return;
        event.preventDefault();
        search.focus();
    });

    // Copy --------------------------------------------------------------------------------------------------------------
    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fallback selection; inside an open modal the page behind it is inert, so the helper goes into the dialog.
            const area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', '');
            area.className = 'visually-hidden';
            (dialog.open ? dialog : document.body).append(area);
            area.select();
            let copied = false;
            try { copied = document.execCommand('copy'); } catch { copied = false; }
            area.remove();
            return copied;
        }
    }
    const timers = new WeakMap();
    function later(key, ms, action) {
        clearTimeout(timers.get(key));
        timers.set(key, setTimeout(action, ms));
    }
    function say(message, ms = 2600) {
        toast.textContent = message;
        toast.classList.add('is-visible');
        later(toast, ms, () => toast.classList.remove('is-visible'));
    }
    function flash(button) {
        const use = button.querySelector('use');
        const label = button.querySelector('[data-copy-label]');
        button.classList.add('is-done');
        if (use) use.setAttribute('href', SPRITE + 'check');
        if (label) label.textContent = 'Copied';
        later(button, 1800, () => unflash(button));
    }
    function unflash(button) {
        clearTimeout(timers.get(button));
        const use = button.querySelector('use');
        const label = button.querySelector('[data-copy-label]');
        button.classList.remove('is-done');
        if (use) use.setAttribute('href', SPRITE + 'copy');
        if (label && current) label.textContent = copyLabel(current);
    }

    // Item dialog -------------------------------------------------------------------------------------------------------
    let current = null;
    let opener = null;
    function fill(item) {
        field('category').textContent = item.category;
        if (item.by) { // a member's share: their name links to their profile
            const by = document.createElement('a');
            by.href = item.byUrl;
            by.textContent = item.by;
            field('status').replaceChildren('Shared by ', by);
        } else {
            field('status').textContent = item.verified ? 'Tested in Resolve' : 'Being tested';
        }
        // An AI guide has nothing to test in Resolve, so its kicker is just its sub-tab.
        field('status').hidden = isAi(item);
        dialog.querySelector('[data-status]').hidden = isAi(item);
        field('title').textContent = item.title;
        field('summary').textContent = item.summary;
        field('target').textContent = item.paste;
        field('expression').textContent = isTree(item) ? item.nodes : signedIn ? item.code : 'Sign in to see the code and copy it.';
        if (detailSignIn) detailSignIn.href = loginFor(item.slug);
        if (detailLikeSignIn) detailLikeSignIn.href = loginFor(item.slug);
        showLikes(item);
        showCopies(item);
        for (const input of dialog.querySelectorAll('[data-field="input"]')) input.textContent = item.input;
        // How-to per kind: an expression, a plain node tree, an effect tree (MediaIn1 goes to item.input), or a motion
        // graphic shipped as one group with controls.
        const kind = item.group ? 'group' : isTree(item) ? (item.input ? 'effect' : 'tree') : isScript(item) ? 'script' : isAi(item) ? 'ai' : 'expression';
        for (const output of dialog.querySelectorAll('[data-field="output"]')) output.textContent = item.output || '';
        for (const howto of dialog.querySelectorAll('[data-howto]')) howto.hidden = howto.dataset.howto !== kind;
        field('tip').textContent = item.tip || '';
        field('tip').hidden = !item.tip;
        // A plugin preset's box: the plugin it needs (its name links to its page, as Get <plugin> does), whether it's free,
        // its video once there is one.
        const requires = field('requires');
        requires.hidden = !item.requires;
        if (item.requires) {
            for (const name of requires.querySelectorAll('[data-requires-name]')) name.textContent = item.requires.name;
            for (const page of requires.querySelectorAll('[data-requires-page]')) page.href = item.requires.url;
            requires.querySelector('[data-requires-free]').hidden = !item.requires.free;
            const video = requires.querySelector('[data-requires-video]');
            video.hidden = !item.requires.video;
            if (item.requires.video) video.querySelector('a').href = item.requires.video;
        }
        // What a script needs before it runs (owner, 2026-11-09: a Text+ in the Media Pool on the free version), in orange.
        const needs = field('needs');
        needs.hidden = !item.needs;
        if (item.needs) {
            needs.querySelector('[data-needs-text]').textContent = item.needs.text;
            const how = needs.querySelector('[data-needs-how]');
            how.textContent = item.needs.how || '';
            how.hidden = !item.needs.how;
        }
        dialog.querySelector('[data-copy-label]').textContent = signedIn ? copyLabel(item) : 'Sign in to copy';
        field('note').hidden = item.verified || Boolean(item.by); // a member's share isn't ours to test
        if (download) download.hidden = !item.file;
        detailStatus.textContent = '';
        // An AI guide shows its icon where the others play their preview.
        detailVideo.hidden = !item.video;
        detailIcon.hidden = Boolean(item.video);
        if (item.icon) detailIcon.querySelector('use').setAttribute('href', SPRITE + item.icon);
        if (!item.video) detailVideo.removeAttribute('src');
        else if (detailVideo.getAttribute('src') !== item.video) detailVideo.src = item.video;
        detailVideo.poster = item.poster;
    }
    function openItem(slug, from) {
        const item = items.get(slug);
        if (!item) return;
        current = item;
        opener = from || null;
        fill(item);
        setupTweak(item);
        setupSettings(item);
        showPosition();
        // A new item starts with fresh buttons, not the last item's "Copied" or "Link copied".
        if (detailCopy) unflash(detailCopy);
        clearTimeout(timers.get(copyLink));
        copyLink.querySelector('[data-link-label]').textContent = 'Copy link';
        toast.classList.remove('is-visible'); // it would only sit dimmed behind the modal
        if (!dialog.open) dialog.showModal();
        // The item's own page (/library/<slug>), which picks its tab itself.
        const url = new URL(location.href);
        url.pathname = '/library/' + encodeURIComponent(slug);
        url.searchParams.delete('item');
        url.searchParams.delete('type');
        url.searchParams.delete('category');
        url.searchParams.delete('sort');
        history.replaceState(history.state, '', url);
        refresh();
    }
    // Paused previews: the visitor starts the large preview with its own controls.
    function syncDetailVideo() {
        detailVideo.controls = !previews;
        if (previews) detailVideo.setAttribute('aria-hidden', 'true');
        else detailVideo.removeAttribute('aria-hidden');
        if (dialog.open && previews && !document.hidden && !(tweak && tweak.changed && tweak.preview) && detailVideo.getAttribute('src')) detailVideo.play().catch(() => {});
        else detailVideo.pause();
        syncTweak();
    }
    dialog.addEventListener('close', () => {
        if (dialog.open) return; // a late event from the start-up reopen below; the dialog is open again
        refresh();
        const url = new URL(location.href);
        url.pathname = '/library/';
        url.searchParams.delete('item');
        history.replaceState(history.state, '', linkState(url));
        if (opener && opener.isConnected) opener.focus();
        opener = null;
    });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    // Copy counts (copies.php): one quiet POST after a successful copy; shown from 10 copies, always to admins.
    function showCopies(item) {
        const line = field('copies');
        const count = item.copies || 0;
        line.hidden = !(count >= 10 || data.admin);
        line.textContent = line.hidden ? '' : 'Copied ' + count.toLocaleString('en') + (count === 1 ? ' time' : ' times');
    }
    function countCopy(item) {
        if (!data.csrf) return;
        fetch('/library/copied.php', { method: 'POST', credentials: 'same-origin', keepalive: true,
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': data.csrf }, body: JSON.stringify({ item: item.slug }) })
            .then(response => response.ok ? response.json() : null)
            .then(answer => {
                if (!answer || answer.outcome !== 'counted') return;
                item.copies = (item.copies || 0) + 1;
                if (current === item) showCopies(item);
            })
            .catch(() => {});
    }
    if (detailCopy) detailCopy.addEventListener('click', async () => {
        if (!current) return;
        const copied = await copyText(tweak && tweak.changed ? tweak.expression : settings && settings.changed ? settings.script : current.code);
        if (copied) { flash(detailCopy); countCopy(current); }
        detailStatus.textContent = copied ? 'Copied. ' + steps(current) : 'Copy failed: select the code and copy it by hand.';
    });

    // Copy link: the item's own address, for sharing (guests too; it isn't counted as a copy).
    copyLink.addEventListener('click', async () => {
        if (!current) return;
        const copied = await copyText(new URL('/library/' + encodeURIComponent(current.slug), location.origin).href);
        const label = copyLink.querySelector('[data-link-label]');
        label.textContent = copied ? 'Link copied' : 'Copy failed';
        detailStatus.textContent = copied ? 'Link copied.' : 'Copy failed: copy the address bar instead.';
        later(copyLink, 1800, () => { label.textContent = 'Copy link'; });
    });
    // Download (members): an AI guide as its own file, made from the text the page already has; counted like a copy.
    if (download) download.addEventListener('click', () => {
        if (!current || !current.file || !current.code) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([current.code], { type: 'text/markdown' }));
        link.download = current.file;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        countCopy(current);
        detailStatus.textContent = 'Downloaded ' + current.file + '.';
    });
    // Previous and Next (and the arrow keys) walk the tiles the visitor sees: tab, chip and search. After a shared link
    // that is the item's tab.
    function sequence() {
        const shown = tiles.filter(tile => !tile.hidden && !opensLink(tile)); // tools and links never open in the dialog
        const list = shown.some(tile => tile.dataset.slug === current.slug) ? shown : tiles.filter(tile => tile.dataset.type === current.type);
        return list.map(tile => tile.dataset.slug);
    }
    function showPosition() {
        const list = sequence();
        const at = list.indexOf(current.slug);
        const [back, ahead] = nav.querySelectorAll('[data-step]');
        const focused = document.activeElement;
        field('position').textContent = (at + 1) + ' of ' + list.length;
        // Alone in its list (an AI guide beside a link), an item shows no position and no Previous or Next.
        for (const part of dialog.querySelectorAll('[data-position]')) part.hidden = list.length < 2;
        nav.hidden = list.length < 2;
        back.disabled = at <= 0;
        ahead.disabled = at >= list.length - 1;
        if (focused === back && back.disabled) ahead.focus(); // a disabled button would drop the focus
        if (focused === ahead && ahead.disabled) back.focus();
    }
    function step(by) {
        if (!current) return;
        const list = sequence();
        const slug = list[list.indexOf(current.slug) + by];
        if (!slug) return;
        const tile = tiles.find(other => other.dataset.slug === slug);
        openItem(slug, tile ? tile.querySelector('.library-tile-link') : null); // closing returns to this tile
    }
    nav.addEventListener('click', event => {
        const button = event.target.closest('[data-step]');
        if (button && !button.disabled) step(Number(button.dataset.step));
    });
    dialog.addEventListener('keydown', event => {
        if ((event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
        if (event.target.closest('.library-code, video, input, textarea')) return; // they scroll or seek with the arrows
        event.preventDefault();
        step(event.key === 'ArrowLeft' ? -1 : 1);
    });
    // Tweak (2026-10-20): a member can change the numbers in an expression before copying it. Each plain number in the
    // code becomes a spin button: drag it sideways (a step every 4 px) or press Up/Down (Shift for ten steps). The video
    // gives way to a live preview drawn like the preview videos, from the same evaluator they are made with
    // (fusion-expr.js), and Copy takes the changed expression. Follow text edge measures a drawn title, so it stays as is.
    // Settings (2026-11-11): an expression's important values (the name a picker lands on, a speed, a centre) are fields
    // above its code. The item's template is the expression with {{...}} where they go; fusion-expr.js fills them in
    // and the code box shows each filled place as a slot. Numbers the template still writes out stay lime numbers.
    const tweakCanvas = dialog.querySelector('[data-tweak-canvas]');
    const tweakHint = dialog.querySelector('[data-tweak-hint]');
    const tweakHintWhole = [...tweakHint.childNodes].map(node => node.cloneNode(true)); // the page's own words about lime numbers
    const tweakReset = dialog.querySelector('[data-tweak-reset]'); // Reset for a tweak or script settings
    const KINDS = ['point', 'scale', 'opacity', 'angle', 'text', 'blur', 'write', 'spacing'];
    // { item, parts: [text | number index | { slot }], numbers: [{ value, decimals, original, node }], expression, compiled,
    //   changed, preview: the live preview can draw it }; with settings also slots: [{ text, original, node }], segments
    //   (the parsed template), typed (the fields' texts) and last: 'field' | 'number' (what was changed last)
    let tweak = null;
    const canTweak = item => signedIn && Boolean(window.FusionExpr) && item.type === 'expression' && KINDS.includes(item.kind)
        && !(item.preview && (item.preview.follow || item.preview.partner || item.preview.on || item.preview.copies)); // (an expression that reads another layer or its own name keeps its video, 2026-11-16)
    const hasSettings = item => signedIn && Boolean(window.FusionExpr && window.FusionExpr.template) && item.type === 'expression'
        && typeof item.template === 'string' && Array.isArray(item.settings) && item.settings.length > 0 && Boolean(item.code);
    // The code split into text and plain decimal numbers, read the way fusion-expr.js reads it: not inside strings or
    // names (Text1), and not hex or exponent forms, which stay as written.
    function splitNumbers(source) {
        const parts = [], numbers = [];
        let i = 0, text = '';
        while (i < source.length) {
            const c = source[i];
            if (c === '"' || c === "'") {
                let j = i + 1;
                while (j < source.length && source[j] !== c) j += source[j] === '\\' ? 2 : 1;
                text += source.slice(i, j + 1);
                i = j + 1;
                continue;
            }
            const rest = source.slice(i);
            const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
            if (name) { text += name[0]; i += name[0].length; continue; }
            const number = /^(?:0[xX][0-9a-fA-F]+|(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)/.exec(rest);
            if (number) {
                if (/^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(number[0])) {
                    if (text) parts.push(text);
                    text = '';
                    parts.push(numbers.length);
                    numbers.push({ value: Number(number[0]), decimals: (number[0].split('.')[1] || '').length, original: number[0] });
                } else text += number[0];
                i += number[0].length;
                continue;
            }
            text += c;
            i++;
        }
        if (text) parts.push(text);
        return { parts, numbers };
    }
    const written = number => {
        if (number.value === Number(number.original)) return number.original;
        const fixed = number.value.toFixed(number.decimals);
        return Number(fixed) < 0 ? '(' + fixed + ')' : fixed.replace(/^-/, ''); // "(-0.5)" reads right after any operator
    };
    const rebuild = () => tweak.parts.map(part => typeof part === 'number' ? written(tweak.numbers[part])
        : typeof part === 'string' ? part : tweak.slots[part.slot].text).join('');
    const code = field('expression');
    // An expression's parts for these typed values: its template with the sections its options keep (2026-11-16: an
    // option can change the expression's shape), filled in; each {{...}} a slot and, where the live preview works, each
    // number the template still writes out a lime number. A slot remembers what it holds with the item's own values
    // under the same options, so the places a field changed are marked.
    function structure(item, typed) {
        const F = window.FusionExpr;
        const { vars, bad } = F.settings(item.settings, typed);
        if (bad.length) return null;
        const segments = F.template(item.template, vars);
        const texts = F.fill(segments, vars);
        const own = item.settings.map((setting, k) => (setting.type === 'choice' ? typed[k] : String(setting.value)));
        const originals = F.fill(segments, F.settings(item.settings, own).vars);
        const parts = [], numbers = [], slots = [], preview = canTweak(item);
        segments.forEach(segment => {
            if (segment.text === undefined) {
                parts.push({ slot: slots.length });
                slots.push({ text: texts[slots.length], original: originals[slots.length] });
            } else if (preview) {
                const split = splitNumbers(segment.text), from = numbers.length;
                split.parts.forEach(part => parts.push(typeof part === 'number' ? part + from : part));
                numbers.push(...split.numbers);
            } else parts.push(segment.text);
        });
        return { item, parts, numbers, slots, segments, typed, preview, last: 'field', expression: item.code, compiled: null, changed: false };
    }
    // The code box from tweak's parts: slots, lime numbers and the text between them.
    function drawCode() {
        code.replaceChildren(...tweak.parts.map(part => {
            if (typeof part === 'string') return document.createTextNode(part);
            if (typeof part !== 'number') {
                const slot = tweak.slots[part.slot];
                const node = document.createElement('span');
                node.className = 'library-slot';
                node.textContent = slot.text;
                node.classList.toggle('is-changed', slot.text !== slot.original);
                slot.node = node;
                return node;
            }
            const number = tweak.numbers[part];
            const node = document.createElement('span');
            node.className = 'library-num';
            node.textContent = number.original;
            node.tabIndex = 0;
            node.dataset.index = part;
            node.setAttribute('role', 'spinbutton');
            node.setAttribute('aria-label', 'Number ' + (part + 1) + ' of ' + tweak.numbers.length);
            node.setAttribute('aria-valuenow', String(number.value));
            number.node = node;
            return node;
        }));
        // Beside fields the lime numbers are an extra, so their line is short.
        if (tweak.slots) tweakHint.textContent = 'You can also drag a lime number, or press ↑ or ↓ on it.';
        else tweakHint.replaceChildren(...tweakHintWhole.map(node => node.cloneNode(true)));
        tweakHint.hidden = !tweak.numbers.length;
    }
    function setupTweak(item) {
        tweak = null;
        tweakHint.hidden = true;
        tweakReset.hidden = true;
        if (hasSettings(item)) {
            try {
                tweak = structure(item, item.settings.map(setting => String(setting.value)));
                if (tweak && rebuild() !== item.code) tweak = null; // only when the template gives back the exact text
            } catch {
                tweak = null;
            }
        }
        if (!tweak && canTweak(item)) {
            const { parts, numbers } = splitNumbers(item.code);
            tweak = { item, parts, numbers, preview: true, expression: item.code, compiled: null, changed: false };
            if (!numbers.length || rebuild() !== item.code) tweak = null; // only when the split gives back the exact text
        }
        if (tweak) drawCode();
        syncTweak();
    }
    // After a number or a field changed: the new expression, its preview, Reset.
    function retweak() {
        tweak.expression = rebuild();
        tweak.changed = tweak.expression !== tweak.item.code;
        tweak.compiled = null;
        tweak.copies = null;
        if (tweak.preview) {
            // An expression that reads its own name (self.Name: a copy's number, In turn) is drawn as three copies of its
            // tool, Transform1 to Transform3 (2026-11-16).
            const tool = { 'Text+': 'Text', Polygon: 'Polygon' }[tweak.item.tool] || tweak.item.tool || 'Tool';
            try {
                tweak.compiled = window.FusionExpr.compile(tweak.expression, { self: { Name: tool + '1' } });
                if (/\bself\b/.test(tweak.expression)) tweak.copies = [1, 2, 3].map(n => window.FusionExpr.compile(tweak.expression, { self: { Name: tool + n } }));
            } catch {
                tweak.compiled = null;
                tweak.copies = null;
            }
        }
        tweakReset.hidden = !tweak.changed;
        detailStatus.textContent = '';
        lastFrame = -1;
        syncDetailVideo();
    }
    function setNumber(index, value) {
        const number = tweak.numbers[index];
        number.value = Math.max(-1e6, Math.min(1e6, Number(value.toFixed(Math.min(number.decimals + 2, 10)))));
        number.node.textContent = written(number);
        number.node.setAttribute('aria-valuenow', String(number.value));
        number.node.classList.toggle('is-changed', number.value !== Number(number.original));
        tweak.last = 'number';
        retweak();
    }
    const stepOf = number => Math.pow(10, -number.decimals);
    code.addEventListener('keydown', event => {
        const node = event.target.closest('.library-num');
        if (!node || !tweak || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
        event.preventDefault();
        event.stopPropagation();
        const number = tweak.numbers[node.dataset.index];
        setNumber(Number(node.dataset.index), number.value + (event.key === 'ArrowUp' ? 1 : -1) * stepOf(number) * (event.shiftKey ? 10 : 1));
    });
    let drag = null;
    code.addEventListener('pointerdown', event => {
        const node = event.target.closest('.library-num');
        if (!node || !tweak || event.button !== 0) return;
        event.preventDefault(); // no text selection while scrubbing
        node.focus({ preventScroll: true });
        node.setPointerCapture(event.pointerId);
        node.classList.add('is-dragging');
        drag = { node, index: Number(node.dataset.index), x: event.clientX, from: tweak.numbers[node.dataset.index].value, steps: 0 };
    });
    code.addEventListener('pointermove', event => {
        if (!drag || event.target !== drag.node) return;
        const steps = Math.round((event.clientX - drag.x) / 4);
        if (steps === drag.steps) return;
        drag.steps = steps;
        setNumber(drag.index, drag.from + steps * stepOf(tweak.numbers[drag.index]) * (event.shiftKey ? 10 : 1));
    });
    const endDrag = () => {
        if (!drag) return;
        drag.node.classList.remove('is-dragging');
        drag = null;
    };
    code.addEventListener('pointerup', endDrag);
    code.addEventListener('pointercancel', endDrag);
    tweakReset.addEventListener('click', () => {
        if (!current) return;
        const script = Boolean(settings);
        const fields = script || Boolean(tweak && tweak.slots && tweak.last === 'field'); // back to where the change was made
        fill(current);
        setupTweak(current);
        setupSettings(current);
        const first = fields ? settingsBox.querySelector('input[data-setting]:not([type="radio"])') || settingsBox.querySelector('[data-setting]') : code.querySelector('.library-num');
        if (first) first.focus({ preventScroll: true }); // the Reset button hides itself
        detailStatus.textContent = script ? 'Back to the original settings.' : 'Back to the original expression.';
    });

    // The live preview, drawn as the preview videos are (library/preview-stage.html): the site's black canvas, a lime
    // dot with its trail (point), a dot against a dashed ring (scale, opacity), a turning square (angle) or the text.
    const LIME = '#00a2ff', INK = '#0c0c0c', MUTED = '#858585', FAINT = 'rgba(0, 162, 255, 0.18)';
    const TRAIL = 14;
    let tweakFrame = 0, lastFrame = -1, startedAt = 0;
    const tweakValue = frame => tweak.compiled(frame);
    function dot(ctx, x, y, r, alpha = 1, glow = true) {
        ctx.save();
        ctx.globalAlpha = alpha;
        if (glow) { ctx.shadowColor = 'rgba(0, 162, 255, 0.55)'; ctx.shadowBlur = r * 0.9; }
        ctx.fillStyle = LIME;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    function ring(ctx, x, y, r, S) {
        ctx.save();
        ctx.strokeStyle = FAINT;
        ctx.lineWidth = S / 360;
        ctx.setLineDash([S / 90, S / 90]);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    // Blur (2026-11-16): the lime dot softened by the Blur Size (Fusion's, on a 1080-high frame) over its dashed ring. The
    // dot is drawn far off the canvas and only its shadow lands, so every browser blurs it the same way.
    function blurDot(ctx, S, v) {
        const r = S * 0.12, soft = Math.max(0, Number(v) || 0) * S / 1080 * 2;
        ring(ctx, S / 2, S / 2, r, S);
        ctx.save();
        ctx.fillStyle = LIME;
        ctx.shadowColor = LIME;
        ctx.shadowBlur = soft;
        ctx.shadowOffsetX = S * 3;
        ctx.beginPath();
        ctx.arc(S / 2 - S * 3, S / 2, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Tracking (2026-11-17): a word whose letters stand apart by the Tracking, centred, over a faint line as wide as the word at
    // 1. Fusion's CharacterSpacing adds the same gap after every letter, (value - 1) times the Text+ Size in frame widths,
    // about 1.41 letter heights (probe in Resolve: IIIIWWWW at 1, 2 and 3; a letter height is Size x 0.7068).
    function spacedWord(ctx, S, v) {
        const word = 'TRACKING', t = Math.max(0, Number(v) || 0);
        ctx.save();
        ctx.font = `800 ${Math.round(S * 0.07)}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textBaseline = 'middle';
        const widths = [...word].map(ch => ctx.measureText(ch).width), full = widths.reduce((a, b) => a + b, 0);
        const gap = (t - 1) * S * 0.07 / 0.7068, span = full + gap * (word.length - 1); // the first letter's left to the last one's right
        ctx.strokeStyle = FAINT;
        ctx.lineWidth = S / 360;
        ctx.setLineDash([S / 90, S / 90]);
        ctx.beginPath();
        ctx.moveTo(S / 2 - full / 2, S / 2 + S * 0.07);
        ctx.lineTo(S / 2 + full / 2, S / 2 + S * 0.07);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#f4f4f4';
        let x = S / 2 - span / 2;
        [...word].forEach((ch, k) => { ctx.fillText(ch, x, S / 2); x += widths[k] + gap; });
        ctx.restore();
    }

    // Write on (2026-11-16): a lime stroke along a gentle wave as far as the Write Length (0 to 1), over the wave's faint
    // dashed whole.
    function writePath(ctx, S, v) {
        const u = Math.min(1, Math.max(0, Number(v) || 0)), N = 160;
        const at = t => [S * (0.18 + 0.64 * t), S * (0.5 - 0.1 * Math.sin(t * Math.PI * 2.2 + 0.6))];
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = FAINT;
        ctx.lineWidth = S / 360;
        ctx.setLineDash([S / 90, S / 90]);
        ctx.beginPath();
        for (let k = 0; k <= N; k++) { const [x, y] = at(k / N); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.stroke();
        ctx.setLineDash([]);
        if (u > 0) {
            ctx.strokeStyle = LIME;
            ctx.lineWidth = S * 0.02;
            ctx.shadowColor = 'rgba(0, 162, 255, 0.5)';
            ctx.shadowBlur = S * 0.025;
            ctx.beginPath();
            for (let k = 0; k <= Math.floor(u * N); k++) { const [x, y] = at(k / N); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
            const [x, y] = at(u);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        ctx.restore();
    }
    function drawTweak(frame) {
        const ctx = tweakCanvas.getContext('2d');
        const S = tweakCanvas.width;
        const font = getComputedStyle(document.body).fontFamily;
        const item = tweak.item;
        ctx.fillStyle = INK;
        ctx.fillRect(0, 0, S, S);
        try {
            if (!tweak.compiled) throw new Error('no expression');
            const v = tweakValue(frame);
            if (tweak.copies && ['point', 'scale', 'opacity', 'angle'].includes(item.kind)) {
                tweak.copies.forEach((copy, k) => {
                    const c = copy(frame), x = S / 2 + (k - 1) * S * 0.28;
                    if (item.kind === 'point') dot(ctx, x + (c.x - 0.5) * S * 0.3, (1 - c.y) * S, S * 0.03); // (each copy in its own third: a member's Merges place copies apart)
                    else if (item.kind === 'scale') { ring(ctx, x, S / 2, S * 0.08, S); dot(ctx, x, S / 2, S * 0.08 * Number(c)); }
                    else if (item.kind === 'opacity') { ring(ctx, x, S / 2, S * 0.08, S); dot(ctx, x, S / 2, S * 0.08, Math.min(1, Math.max(0, Number(c)))); }
                    else {
                        const size = S * 0.12;
                        ctx.save();
                        ctx.translate(x, S / 2);
                        ctx.rotate(-Number(c) * Math.PI / 180);
                        ctx.fillStyle = LIME;
                        ctx.beginPath();
                        ctx.roundRect(-size / 2, -size / 2, size, size, S * 0.016);
                        ctx.fill();
                        ctx.fillStyle = INK;
                        ctx.beginPath();
                        ctx.arc(0, -size * 0.3, size * 0.07, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                });
            } else if (item.kind === 'point') {
                for (let k = TRAIL; k >= 1; k--) {
                    if (frame - k < 0) continue;
                    const p = tweakValue(frame - k);
                    dot(ctx, p.x * S, (1 - p.y) * S, S * 0.03 * (1 - k / (TRAIL * 1.6)), 0.4 * (1 - k / (TRAIL + 1)), false);
                }
                dot(ctx, v.x * S, (1 - v.y) * S, S * 0.034);
            } else if (item.kind === 'scale') {
                ring(ctx, S / 2, S / 2, S * 0.12, S);
                dot(ctx, S / 2, S / 2, S * 0.12 * Number(v));
            } else if (item.kind === 'opacity') {
                ring(ctx, S / 2, S / 2, S * 0.12, S);
                dot(ctx, S / 2, S / 2, S * 0.12, Math.min(1, Math.max(0, Number(v))));
            } else if (item.kind === 'angle') {
                const size = S * 0.24;
                ctx.save();
                ctx.translate(S / 2, S / 2);
                ctx.strokeStyle = FAINT;
                ctx.lineWidth = S / 360;
                ctx.setLineDash([S / 90, S / 90]);
                ctx.strokeRect(-size / 2, -size / 2, size, size);
                ctx.setLineDash([]);
                ctx.rotate(-Number(v) * Math.PI / 180); // Fusion angles turn counter-clockwise
                ctx.shadowColor = 'rgba(0, 162, 255, 0.45)';
                ctx.shadowBlur = S * 0.04;
                ctx.fillStyle = LIME;
                ctx.beginPath();
                ctx.roundRect(-size / 2, -size / 2, size, size, S * 0.03);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.fillStyle = INK;
                ctx.beginPath();
                ctx.arc(0, -size * 0.3, size * 0.07, 0, Math.PI * 2); // a notch so the turn is visible
                ctx.fill();
                ctx.restore();
            } else if (item.kind === 'blur') {
                blurDot(ctx, S, v);
            } else if (item.kind === 'write') {
                writePath(ctx, S, v);
            } else if (item.kind === 'spacing') {
                spacedWord(ctx, S, v);
            } else {
                const lines = (v && v.kind === 'text' ? v.text : String(v)).split('\n');
                const size = Math.round(S * 0.075), lead = size * 1.2;
                ctx.save();
                ctx.font = `800 ${size}px ${font}`;
                ctx.fillStyle = '#f4f4f4';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                lines.forEach((line, i) => ctx.fillText(line, S / 2, S / 2 + (i - (lines.length - 1) / 2) * lead));
                if (!(item.preview && item.preview.caret === false)) {
                    const width = ctx.measureText(lines[lines.length - 1]).width;
                    ctx.fillStyle = LIME;
                    ctx.fillRect(S / 2 + width / 2 + S * 0.012, S / 2 + (lines.length - 1) / 2 * lead - S * 0.04, S * 0.012, S * 0.08);
                }
                ctx.restore();
            }
        } catch {
            ctx.save();
            ctx.font = `600 ${Math.round(S * 0.032)}px ${font}`;
            ctx.fillStyle = MUTED;
            ctx.textAlign = 'center';
            ctx.fillText('This value can’t be previewed', S / 2, S / 2);
            ctx.restore();
        }
        ctx.save(); // captions, as on the large preview video
        ctx.font = `600 ${Math.round(S * 0.026)}px ${font}`;
        ctx.fillStyle = MUTED;
        ctx.fillText(`${item.tool} › ${item.input}`, S * 0.045, S * 0.95);
        ctx.textAlign = 'right';
        ctx.fillText(`f ${String(frame).padStart(3, '0')}`, S * 0.955, S * 0.95);
        ctx.textAlign = 'left';
        ctx.font = `800 ${Math.round(S * 0.03)}px ${font}`;
        ctx.fillStyle = 'rgba(244, 244, 244, 0.55)';
        ctx.fillText('Clipyx', S * 0.045, S * 0.075);
        const mark = ctx.measureText('Clipyx').width;
        ctx.fillStyle = 'rgba(0, 162, 255, 0.75)';
        ctx.fillText('.', S * 0.045 + mark, S * 0.075);
        ctx.restore();
    }
    // 24 frames a second over the 96-frame loop while the dialog shows a changed expression; one still frame when
    // previews are paused (reduced motion, Save-Data or the Autoplay switch), redrawn on every change.
    function animate(now) {
        tweakFrame = 0;
        if (!tweak || !tweak.changed || !tweak.preview || !dialog.open || document.hidden || !previews) return;
        const frame = Math.floor((now - startedAt) / (1000 / 24)) % 96;
        if (frame !== lastFrame) { lastFrame = frame; drawTweak(frame); }
        tweakFrame = requestAnimationFrame(animate);
    }
    function syncTweak() {
        const on = Boolean(tweak && tweak.changed && tweak.preview); // an expression the preview can't draw keeps its video
        tweakCanvas.hidden = !on;
        detailVideo.hidden = on || !(current && current.video); // an AI guide shows its icon instead
        if (on && dialog.open && !document.hidden && previews) {
            if (!tweakFrame) { startedAt = performance.now(); lastFrame = -1; tweakFrame = requestAnimationFrame(animate); }
        } else {
            if (tweakFrame) cancelAnimationFrame(tweakFrame);
            tweakFrame = 0;
            if (on) drawTweak(30);
        }
    }

    // Script settings (2026-10-20): the settings in capitals at the top of a script (local NAME = "Shot" -- its note)
    // become fields above its code, for members. The code box shows, and Copy takes, the script with the values filled
    // in; Reset brings the original back. Strings are written back as Lua strings (quotes, backslashes and new lines
    // escaped), so nothing typed can break out of its line.
    // The same box holds an expression's settings (2026-11-11, see Tweak above): one field per setting in the item's
    // data, with its limits; a value that can't be used is marked and the expression keeps the last one that worked.
    // These fields are small (three to a row) so the window still fits the screen; one line under them tells what the
    // field in use takes, or what a refused value should have been. An expression's options (choice settings,
    // 2026-11-16) sit in one row above its fields as small segmented switches (radio buttons): no text beyond their
    // names, so the window does not grow.
    const settingsBox = dialog.querySelector('[data-script-settings]');
    const SETTING = /^local ([A-Z][A-Z0-9_]*) = ("(?:[^"\\]|\\.)*"|true|false|-?[0-9]+(?:\.[0-9]+)?)(.*)$/;
    let settings = null; // { item, lines, fields: [{ index, name, literal, now, input }], script, changed }
    const luaString = text => '"' + text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n') + '"';
    const fromLua = literal => literal.slice(1, -1).replace(/\\(.)/g, (all, c) => (c === 'n' ? '\n' : c));
    const nice = name => name.charAt(0) + name.slice(1).toLowerCase().replace(/_/g, ' ');
    function setupSettings(item) {
        settings = null;
        settingsBox.hidden = true;
        settingsBox.classList.remove('is-compact', 'is-many');
        settingsBox.replaceChildren();
        if (tweak && tweak.slots) {
            settingsBox.classList.add('is-compact');
            const fields = item.settings.filter(setting => setting.type !== 'choice').length;
            settingsBox.classList.toggle('is-many', fields === 4 || fields > 6); // four to a row (four fields share one row)
            const choices = document.createElement('div');
            choices.className = 'library-choices';
            item.settings.forEach((setting, k) => {
                if (setting.type === 'choice') {
                    const group = document.createElement('div');
                    group.className = 'library-choice';
                    group.setAttribute('role', 'radiogroup');
                    const name = document.createElement('span');
                    name.className = 'library-choice-label';
                    name.id = 'library-setting-' + k;
                    name.textContent = setting.label;
                    group.setAttribute('aria-labelledby', name.id);
                    const options = document.createElement('span');
                    options.className = 'library-choice-options';
                    setting.options.forEach((option, n) => {
                        const label = document.createElement('label');
                        label.className = 'library-choice-option';
                        const input = document.createElement('input');
                        input.type = 'radio';
                        input.name = 'library-setting-' + k;
                        input.id = 'library-setting-' + k + '-' + n;
                        input.value = option.value;
                        input.checked = option.value === String(setting.value);
                        input.dataset.setting = k;
                        const text = document.createElement('span');
                        text.textContent = option.label;
                        label.append(input, text);
                        options.append(label);
                    });
                    group.append(name, options);
                    choices.append(group);
                    return;
                }
                const group = document.createElement('div');
                group.className = setting.type === 'list' ? 'form-group library-setting-wide' : 'form-group';
                const input = document.createElement('input');
                input.id = 'library-setting-' + k;
                input.dataset.setting = k;
                if (setting.type === 'number') {
                    input.type = 'number';
                    input.step = setting.whole ? '1' : 'any';
                    if (setting.min !== undefined) input.min = String(setting.min);
                    if (setting.max !== undefined) input.max = String(setting.max);
                } else {
                    input.type = 'text';
                    input.maxLength = setting.type === 'list' ? 400 : 200;
                }
                input.value = String(setting.value);
                input.autocomplete = 'off';
                input.spellcheck = false;
                const label = document.createElement('label');
                label.htmlFor = input.id;
                label.textContent = setting.label;
                group.append(label, input);
                if (setting.hint) {
                    const note = document.createElement('p'); // read out with the field; shown in the line under the fields
                    note.className = 'visually-hidden';
                    note.id = input.id + '-note';
                    note.textContent = setting.hint;
                    input.setAttribute('aria-describedby', note.id);
                    group.append(note);
                }
                settingsBox.append(group);
            });
            if (choices.childElementCount) settingsBox.prepend(choices);
            const line = document.createElement('p');
            line.className = 'library-howto library-setting-note';
            line.dataset.settingNote = '';
            settingsBox.append(line);
            settingNote();
            settingsBox.hidden = false;
            return;
        }
        if (!signedIn || !isScript(item) || !item.code) return;
        const lines = item.code.split('\n');
        const fields = [];
        lines.slice(0, 20).forEach((line, index) => {
            const match = SETTING.exec(line.replace(/\r$/, ''));
            if (match) fields.push({ index, name: match[1], literal: match[2], now: match[2], note: (/^\s*--\s*(.*)$/.exec(match[3]) || [])[1] || '' });
        });
        if (!fields.length) return;
        settings = { item, lines, fields, script: item.code, changed: false };
        const intro = document.createElement('p');
        intro.className = 'library-howto';
        intro.textContent = 'These settings go into the script you copy.';
        settingsBox.append(intro);
        fields.forEach((setting, k) => {
            const group = document.createElement('div');
            group.className = 'form-group';
            const input = document.createElement('input');
            input.id = 'library-setting-' + k;
            input.dataset.setting = k;
            const label = document.createElement('label');
            label.htmlFor = input.id;
            if (setting.literal === 'true' || setting.literal === 'false') {
                input.type = 'checkbox';
                input.checked = setting.literal === 'true';
                label.className = 'library-check';
                label.append(input, ' ' + nice(setting.name));
                group.append(label);
            } else {
                const text = setting.literal.startsWith('"');
                input.type = text ? 'text' : 'number';
                if (!text) input.step = 'any';
                input.value = text ? fromLua(setting.literal) : setting.literal;
                input.autocomplete = 'off';
                input.spellcheck = false;
                label.textContent = nice(setting.name);
                group.append(label, input);
            }
            if (setting.note) {
                const note = document.createElement('p');
                note.className = 'library-howto';
                note.id = input.id + '-note';
                const said = input.type === 'checkbox' ? setting.note.replace(/^true:\s*/i, '') : setting.note; // a tick already means true
                note.textContent = said.charAt(0).toUpperCase() + said.slice(1);
                input.setAttribute('aria-describedby', note.id);
                group.append(note);
            }
            setting.input = input;
            settingsBox.append(group);
        });
        settingsBox.hidden = false;
    }
    // The line under an expression's fields: what the field in use takes, or what a refused value should have been.
    function settingNote() {
        const line = settingsBox.querySelector('[data-setting-note]');
        if (!line || !tweak || !tweak.slots) return;
        const inputs = [...settingsBox.querySelectorAll('input[data-setting]:not([type="radio"])')];
        const bad = input => input.getAttribute('aria-invalid') === 'true';
        const of = input => tweak.item.settings[input.dataset.setting];
        const focused = inputs.find(input => input === document.activeElement);
        const shown = focused && (bad(focused) || of(focused).hint) ? focused : inputs.find(bad);
        const problem = Boolean(shown && bad(shown));
        line.textContent = !shown ? 'These settings go into the expression you copy.'
            : problem ? of(shown).label + ' needs ' + needs(of(shown)) + '.' : of(shown).hint;
        line.classList.toggle('library-setting-problem', problem);
    }
    settingsBox.addEventListener('focusin', settingNote);
    settingsBox.addEventListener('focusout', settingNote);
    // What a refused value should have been, for that line and the status line.
    const needs = setting => (setting.type === 'number'
        ? 'a ' + (setting.whole ? 'whole ' : '') + 'number' + (setting.min !== undefined && setting.max !== undefined ? ' from ' + setting.min + ' to ' + setting.max
            : setting.min !== undefined ? ' of ' + setting.min + ' or more' : setting.max !== undefined ? ' of ' + setting.max + ' or less' : '')
        : setting.type === 'name' ? 'a tool’s name, like Text1'
        : setting.type === 'list' ? (setting.numbers ? 'numbers with commas between them'
            : 'words with commas between them' + (setting.plain ? ', in plain letters' : '') + ', without " or \\')
        : (setting.plain ? 'plain letters and signs' : 'one line of text') + ' without " or \\');
    settingsBox.addEventListener('input', event => {
        const input = event.target.closest('[data-setting]');
        if (!input) return;
        if (tweak && tweak.slots) {
            const k = Number(input.dataset.setting), setting = tweak.item.settings[k];
            const typed = tweak.typed.slice();
            typed[k] = input.value;
            // An option changes the expression's shape, and so does an optional text that is typed in or cleared (its
            // section comes or goes): the expression is then laid out again from the template, with the fields' last
            // good values (lime numbers dragged before go back to the template's).
            const shape = segments => segments.map(segment => (segment.text !== undefined ? segment.text : '\u0000')).join('');
            let reshaped = setting.type === 'choice';
            if (!reshaped) {
                try {
                    const { vars, bad } = window.FusionExpr.settings(tweak.item.settings, typed);
                    reshaped = !bad.length && shape(window.FusionExpr.template(tweak.item.template, vars)) !== shape(tweak.segments);
                } catch {
                    reshaped = false;
                }
            }
            if (reshaped) {
                let next = null;
                try {
                    next = structure(tweak.item, typed);
                } catch {
                    next = null;
                }
                if (!next) {
                    detailStatus.textContent = setting.label + ' could not change the expression.';
                    return;
                }
                input.setAttribute('aria-invalid', 'false');
                tweak = next;
                drawCode();
                retweak();
                settingNote();
                return;
            }
            let texts = null;
            try {
                const { vars, bad } = window.FusionExpr.settings(tweak.item.settings, typed);
                if (!bad.length) texts = window.FusionExpr.fill(tweak.segments, vars);
            } catch {
                texts = null;
            }
            input.setAttribute('aria-invalid', String(!texts));
            settingNote();
            if (!texts) {
                detailStatus.textContent = setting.label + ' needs ' + needs(setting) + '. The expression keeps the last value that worked.';
                return;
            }
            tweak.typed = typed;
            tweak.slots.forEach((slot, n) => {
                slot.text = texts[n];
                slot.node.textContent = slot.text;
                slot.node.classList.toggle('is-changed', slot.text !== slot.original);
            });
            tweak.last = 'field';
            retweak();
            return;
        }
        if (!settings) return;
        const setting = settings.fields[input.dataset.setting];
        if (input.type === 'checkbox') setting.now = input.checked ? 'true' : 'false';
        else if (input.type === 'number') {
            const ok = input.value.trim() !== '' && Number.isFinite(Number(input.value));
            input.setAttribute('aria-invalid', String(!ok));
            setting.now = ok ? String(Number(input.value)) : setting.literal; // an unfinished number keeps the original
        } else setting.now = luaString(input.value);
        const lines = settings.lines.slice();
        for (const s of settings.fields) {
            const head = `local ${s.name} = `;
            lines[s.index] = head + s.now + lines[s.index].slice(head.length + s.literal.length);
        }
        settings.script = lines.join('\n');
        settings.changed = settings.script !== settings.item.code;
        field('expression').textContent = settings.script;
        tweakReset.hidden = !settings.changed;
        detailStatus.textContent = '';
    });

    // Likes (2026-10-26): a member's heart on a tile or in the item window likes the item or takes the like back. The
    // count changes at once; like.php keeps it (and sends the real count back), and a failure puts it back as it was.
    // Tabs are sorted by likes on the server, so the order changes on the next visit, never under the visitor's hand.
    const likeText = count => (count > 0 ? count.toLocaleString('en') : '');
    function showLikes(item) {
        const tile = root.querySelector(`.library-tile[data-slug="${item.slug}"]`);
        const button = tile && tile.querySelector('button[data-like]');
        const label = (item.liked ? 'Unlike ' : 'Like ') + item.title + (item.likes ? ` (${item.likes} ${item.likes === 1 ? 'like' : 'likes'})` : '');
        if (button) {
            button.setAttribute('aria-pressed', String(Boolean(item.liked)));
            button.setAttribute('aria-label', label);
            button.title = item.liked ? 'Liked' : 'Like';
            button.querySelector('[data-like-count]').textContent = likeText(item.likes || 0);
        }
        if (current === item) {
            if (detailLike) {
                detailLike.setAttribute('aria-pressed', String(Boolean(item.liked)));
                detailLike.querySelector('[data-like-label]').textContent = item.liked ? 'Liked' : 'Like';
                detailLike.querySelector('[data-like-count]').textContent = likeText(item.likes || 0);
            }
            if (detailLikeSignIn) detailLikeSignIn.querySelector('[data-like-count]').textContent = likeText(item.likes || 0);
        }
    }
    async function toggleLike(item) {
        if (!item || !data.csrf) return;
        const before = { liked: Boolean(item.liked), likes: item.likes || 0 };
        item.liked = !before.liked;
        item.likes = Math.max(0, before.likes + (item.liked ? 1 : -1));
        showLikes(item);
        countFavorites();
        try {
            const response = await fetch('/library/like.php', { method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': data.csrf }, body: JSON.stringify({ item: item.slug, liked: item.liked }) });
            const answer = response.ok ? await response.json() : null;
            if (!answer || !answer.ok) throw new Error('not saved');
            item.liked = Boolean(answer.liked);
            item.likes = Number(answer.likes) || 0;
            showLikes(item);
            countFavorites();
        } catch {
            Object.assign(item, before);
            showLikes(item);
            countFavorites();
            const message = 'Your like could not be saved. Please try again.';
            if (dialog.open) detailStatus.textContent = message; else say(message);
        }
    }
    if (detailLike) detailLike.addEventListener('click', () => toggleLike(current));

    copyLink.hidden = false;
    nav.hidden = false;
    for (const part of dialog.querySelectorAll('[data-position]')) part.hidden = false;

    root.addEventListener('click', async event => {
        const filter = event.target.closest('.library-tab, .library-chip');
        if (filter && !filter.disabled && (filter.dataset.type || filter.dataset.category)) {
            if (filter.classList.contains('library-tab')) showType(filter.dataset.type);
            else state.category = filter.dataset.category;
            press(filter.parentElement, filter);
            apply();
            remember();
            return;
        }
        const like = event.target.closest('button[data-like]');
        if (like) {
            toggleLike(items.get(like.closest('.library-tile').dataset.slug));
            return;
        }
        const link = event.target.closest('.library-tile-link');
        if (link && opensLink(link.closest('.library-tile'))) return; // a tool's tile opens the tool page, a link item's its link
        if (link && event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
            event.preventDefault();
            openItem(link.closest('.library-tile').dataset.slug, link);
            return;
        }
        const copy = event.target.closest('.library-copy');
        if (copy && copy.tagName === 'A') return; // a guest's Copy is a link to the login
        if (copy) {
            const item = items.get(copy.closest('.library-tile').dataset.slug);
            if (!item) return;
            if (await copyText(item.code)) {
                flash(copy);
                say('Copied. ' + steps(item), 6500); // long enough to read the steps
                countCopy(item);
            } else {
                openItem(item.slug, copy);
                detailStatus.textContent = 'Copy failed: press ' + copyLabel(item) + ' to try again.';
            }
        }
    });

    // Preview loops -----------------------------------------------------------------------------------------------------
    // AI items have no loop: their tiles show an icon.
    const videoOf = tile => tile.querySelector('video');
    function start(tile) {
        const video = videoOf(tile);
        if (!video) return;
        video.muted = true;
        video.loop = true;
        video.setAttribute('playsinline', '');
        if (!video.getAttribute('src') && video.dataset.src) {
            video.src = video.dataset.src;
        }
        const p = video.play();
        if (p && p.then) {
            p.then(() => tile.classList.add('is-playing')).catch(() => {});
        } else {
            tile.classList.add('is-playing');
        }
    }
    function stop(tile) { if (videoOf(tile)) videoOf(tile).pause(); }
    function release(tile) {
        const video = videoOf(tile);
        if (!video || !video.getAttribute('src')) return;
        video.pause();
        video.removeAttribute('src');
        video.load();
        tile.classList.remove('is-playing');
    }
    for (const tile of tiles) { const v = videoOf(tile); if (v) { v.muted = true; v.loop = true; v.addEventListener('playing', () => tile.classList.add('is-playing')); v.addEventListener('loadeddata', () => tile.classList.add('is-playing')); } }
    function refresh() {
        for (const tile of visible) {
            if (tilesLive()) start(tile);
            else stop(tile);
        }
        syncDetailVideo();
    }
    if ('IntersectionObserver' in window) {
        const onScreen = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    visible.add(entry.target);
                    if (tilesLive()) start(entry.target);
                } else {
                    visible.delete(entry.target);
                    stop(entry.target);
                }
            }
        }, { threshold: 0.25 });
        // Far from the viewport a tile gives its decoder back (browsers cap the number of live media players).
        const nearby = new IntersectionObserver(entries => {
            for (const entry of entries) if (!entry.isIntersecting) release(entry.target);
        }, { rootMargin: '150% 0px' });
        for (const tile of tiles) { onScreen.observe(tile); nearby.observe(tile); }
    }
    // While previews are paused, hovering or focusing a tile plays its loop.
    const tileOf = node => node instanceof Element ? node.closest('.library-tile') : null;
    root.addEventListener('pointerover', event => {
        const tile = tileOf(event.target);
        if (tile && !previews && !dialog.open && event.pointerType === 'mouse') start(tile);
    });
    root.addEventListener('pointerout', event => {
        const tile = tileOf(event.target);
        if (tile && !previews && !tile.contains(event.relatedTarget)) stop(tile);
    });
    root.addEventListener('focusin', event => {
        const tile = tileOf(event.target);
        if (tile && !previews && !dialog.open) start(tile);
    });
    root.addEventListener('focusout', event => {
        const tile = tileOf(event.target);
        if (tile && !previews && !tile.contains(event.relatedTarget)) stop(tile);
    });
    function setPreviews(on, remember) {
        previews = on;
        toggle.setAttribute('aria-checked', String(on));
        if (remember) {
            remembered = true;
            try { localStorage.setItem(STORAGE, on ? 'on' : 'off'); } catch { remembered = true; }
        }
        refresh();
    }
    toggle.addEventListener('click', () => setPreviews(!previews, true));
    toggle.hidden = state.type === AI;
    reduced.addEventListener('change', () => { if (!remembered) setPreviews(!(reduced.matches || saveData), false); });
    document.addEventListener('visibilitychange', refresh);
    setPreviews(true, false);
    setTimeout(() => { for (const t of tiles.slice(0, 40)) start(t); }, 50);

    // A shared item link (/library/<slug>, or an old ?item=<slug>): the server rendered the dialog open (works without JavaScript); reopen it as a modal.
    if (dialog.hasAttribute('data-open')) {
        dialog.close();
        openItem(dialog.dataset.open, null);
    }
})();
