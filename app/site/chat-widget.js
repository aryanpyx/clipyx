(function () {
  "use strict";
  var styleNonce = document.currentScript ? document.currentScript.nonce : '';

  var CHAT_ENDPOINT = "https://bots.clipyx.com/website-chat";
  // Voice input (owner, 2026-10-20: dictation for signed-in customers, press to talk): clipyx.com gives a signed-in
  // member a 10-minute token, Botizo's server turns the clip into text with ElevenLabs and keeps the limits.
  var DICTATE_ENDPOINT = "https://bots.clipyx.com/website-dictate";
  var DICTATE_TOKEN_ENDPOINT = "/botizo-web-session.php?action=dictation-token";
  var DICTATE_MAX_SECONDS = 60;
  var DICTATE_NOTICE_KEY = "clipyx_voice_notice_v1";
  var STORAGE_KEY = "clipyx_chat_state_v3";
  var history = [];
  var msgList = [];
  var isOpen = false;
  var isSending = false;
  var isDragging = false;
  var dragStart = { x: 0, y: 0, bx: 0, by: 0 };
  var dragMoved = false;

  function clearStateOnReload() {
    try {
      var entries = window.performance && window.performance.getEntriesByType ? window.performance.getEntriesByType("navigation") : [];
      var isReload = entries.length ? entries[0].type === "reload" : Boolean(window.performance && window.performance.navigation && window.performance.navigation.type === 1);
      if (isReload) sessionStorage.removeItem(STORAGE_KEY);
    } catch (_error) {}
  }

  clearStateOnReload();

  // The button sits in the bottom-right corner (owner, 2026-10-27: "move the botizo chat button off the news panel"; it
  // was fixed at 45vh on the right edge, over the home hero's Latest news). Visitors can still drag it anywhere.
  function css() {
    var style = document.createElement("style");
    if (styleNonce) style.nonce = styleNonce;
    style.textContent = [
      "#clipyx-chat-btn{position:fixed;right:24px;bottom:calc(24px + env(safe-area-inset-bottom, 0px));z-index:99998;width:56px;height:56px;border-radius:50%;border:1px solid #00a2ff;background:#181818;cursor:grab;-webkit-tap-highlight-color:transparent;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none;user-select:none}",
      "#clipyx-chat-btn:active{cursor:grabbing}",
      "#clipyx-chat-btn:focus-visible{outline:2px solid #00a2ff;outline-offset:3px}",
      "#clipyx-chat-btn img{width:38px;height:38px;border-radius:50%;pointer-events:none}",
      "#clipyx-chat-btn.dragging{transition:none}",
      "#clipyx-chat-cloud{position:fixed;z-index:99998;background:#181818;color:#f4f4f4;font-family: var(--font-body);font-size:13px;font-weight:600;padding:10px 14px;border-radius:12px;border:1px solid #00a2ff;box-shadow:0 16px 36px rgba(0,0,0,.35);max-width:200px;pointer-events:none;opacity:0;transition:opacity .3s ease}",
      "#clipyx-chat-cloud.show{opacity:1}",
      "#clipyx-chat-cloud::after{content:'';position:absolute;width:12px;height:12px;background:#181818;transform:rotate(-45deg)}",
      "#clipyx-chat-cloud.cloud-right{border-right-color:#00a2ff}",
      "#clipyx-chat-cloud.cloud-right::after{right:-7px;top:50%;margin-top:-6px;border-right:1px solid #00a2ff;border-bottom:1px solid #00a2ff}",
      "#clipyx-chat-cloud.cloud-left::after{left:-7px;top:50%;margin-top:-6px;transform:rotate(135deg);border-left:1px solid #00a2ff;border-top:1px solid #00a2ff}",
      "#clipyx-chat-panel{position:fixed;z-index:99999;width:100%;height:100%;max-width:380px;max-height:560px;background:#121212;border:1px solid #2a2a2a;border-radius:0;display:none;flex-direction:column;overflow:hidden;box-shadow:0 16px 36px rgba(0,0,0,.35)}",
      "@media(min-width:480px){#clipyx-chat-panel{border-radius:12px}}",
      "#clipyx-chat-header{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:14px 16px;background:#181818;border-bottom:1px solid #242424;flex-shrink:0;cursor:grab;user-select:none;touch-action:none}",
      "#clipyx-chat-header:active{cursor:grabbing}",
      "#clipyx-chat-header-left{display:flex;align-items:center;gap:10px}",
      "#clipyx-chat-header img{width:32px;height:32px;border-radius:50%}",
      "#clipyx-chat-header span{font-family: var(--font-body);font-size:15px;font-weight:700;color:#f4f4f4}",
      "#clipyx-chat-header span small{display:block;font-size:11px;font-weight:400;color:#a8a8a8}",
      "#clipyx-chat-close{display:inline-flex;align-items:center;justify-content:center;background:none;border:none;color:var(--color-muted);font-size:20px;cursor:pointer;padding:4px 8px;line-height:1;flex-shrink:0;min-width:44px;min-height:44px}",
      "#clipyx-chat-close:hover{color:#f4f4f4}",
      "#clipyx-chat-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;scrollbar-color:#383838 transparent}",
      "#clipyx-chat-messages::-webkit-scrollbar{width:6px}",
      "#clipyx-chat-messages::-webkit-scrollbar-thumb{background:#383838;border-radius:3px}",
      ".clipyx-chat-msg{max-width:85%;padding:10px 14px;border-radius:12px;font-family: var(--font-body);font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word}",
      ".clipyx-chat-msg--bot{align-self:flex-start;background:#181818;color:#f4f4f4;border:1px solid #2a2a2a}",
      ".clipyx-chat-msg--user{align-self:flex-end;background:#262626;color:#f4f4f4;border:1px solid #383838}",
      ".clipyx-chat-msg--thinking{display:flex;align-items:center;gap:7px;color:#a8a8a8}",
      ".clipyx-chat-thinking-dots{display:inline-flex;align-items:center;gap:3px}",
      ".clipyx-chat-thinking-dots span{width:4px;height:4px;border-radius:50%;background:#00a2ff;opacity:.25;animation:clipyx-chat-thinking 1.1s ease-in-out infinite}",
      ".clipyx-chat-thinking-dots span:nth-child(2){animation-delay:.16s}",
      ".clipyx-chat-thinking-dots span:nth-child(3){animation-delay:.32s}",
      "@keyframes clipyx-chat-thinking{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-2px)}}",
      ".clipyx-chat-msg--bot strong{color:#00a2ff}",
      ".clipyx-chat-msg--bot a{color:#00a2ff;text-decoration:underline;pointer-events:auto;cursor:pointer;position:relative;z-index:1}",
      "#clipyx-chat-input-area{display:flex;gap:8px;padding:12px;background:#181818;border-top:1px solid #242424;flex-shrink:0}",
      "#clipyx-chat-input{flex:1;padding:10px 14px;border-radius:8px;border:1px solid #2a2a2a;background:#101010;color:#f4f4f4;font-family: var(--font-body);font-size:14px;outline:none;resize:none;max-height:80px}",
      "#clipyx-chat-input:focus{border-color:#00a2ff}",
      "#clipyx-chat-input:focus-visible{outline:none!important}",
      "#clipyx-chat-send{padding:10px 16px;border-radius:8px;border:1px solid #00a2ff;background:#00a2ff;color:#0c0c0c;font-family: var(--font-body);font-size:14px;font-weight:700;cursor:pointer;transition:opacity .15s ease;white-space:nowrap}",
      "#clipyx-chat-send:disabled{opacity:.4;cursor:not-allowed}",
      "#clipyx-chat-send:hover:not(:disabled){background:#d1ff4d;border-color:#d1ff4d}",
      "#clipyx-chat-mic{display:none;align-items:center;justify-content:center;flex-shrink:0;width:42px;min-height:42px;padding:0;border-radius:8px;border:1px solid #2a2a2a;background:#101010;color:#a8a8a8;cursor:pointer;transition:color .15s ease,border-color .15s ease,background-color .15s ease}",
      "#clipyx-chat-mic.is-ready{display:inline-flex}",
      "#clipyx-chat-mic:hover{color:#f4f4f4;border-color:#515151}",
      "#clipyx-chat-mic:focus-visible{outline:2px solid #00a2ff;outline-offset:2px}",
      "#clipyx-chat-mic.is-recording{color:#0c0c0c;border-color:#00a2ff;background:#00a2ff}",
      "#clipyx-chat-mic.is-busy{opacity:.5;cursor:progress}",
      "#clipyx-chat-mic svg{width:18px;height:18px}",
      "#clipyx-chat-voice{display:none;align-items:center;gap:8px;padding:10px 12px 0;background:#181818;color:#a8a8a8;font-family: var(--font-body);font-size:12px;line-height:1.45}",
      "#clipyx-chat-voice.is-shown{display:flex}",
      "#clipyx-chat-voice.is-error{color:#ff8b83}",
      "#clipyx-chat-voice a{color:#00a2ff;text-decoration:underline}",
      "#clipyx-chat-voice-text{flex:1;min-width:0}",
      "#clipyx-chat-voice button{flex-shrink:0;padding:6px 12px;border-radius:8px;border:1px solid #00a2ff;background:#00a2ff;color:#0c0c0c;font-family: var(--font-body);font-size:12px;font-weight:700;cursor:pointer}",
      "#clipyx-chat-voice button:focus-visible{outline:2px solid #00a2ff;outline-offset:2px}",
      ".clipyx-chat-rec-dot{flex-shrink:0;width:8px;height:8px;border-radius:50%;background:#00a2ff;animation:clipyx-chat-rec 1.1s ease-in-out infinite}",
      "#clipyx-chat-wave{flex-shrink:0;width:94px;height:20px}",
      ".clipyx-chat-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
      "@keyframes clipyx-chat-rec{0%,100%{opacity:1}50%{opacity:.3}}",
      "@media (prefers-reduced-motion:reduce){.clipyx-chat-rec-dot{animation:none}#clipyx-chat-mic{transition:none}}",
      "@media (max-width:1024px),(hover:none) and (pointer:coarse){#clipyx-chat-btn,#clipyx-chat-cloud,#clipyx-chat-panel{display:none!important}}",
    ].join("\n");
    document.head.appendChild(style);
  }

  function getBtn() { return document.getElementById("clipyx-chat-btn"); }
  function getCloud() { return document.getElementById("clipyx-chat-cloud"); }
  function getPanel() { return document.getElementById("clipyx-chat-panel"); }

  // Quotes too: a reply's link address goes into an href attribute, and a quote in it must not end the attribute.
  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function friendlyLinkLabel(value) {
    try {
      var parsed = new URL(String(value || "").replace(/&amp;/g, "&"));
      var host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
      var path = parsed.pathname.replace(/\/+$/, "") || "/";
      if (host === "discord.gg" || host.endsWith("discord.com")) return "Discord";
      if (host === "youtube.com" || host === "youtu.be") return "YouTube";
      if (host === "clipyx.com") {
        if (parsed.hash === "#contact") return "contact form";
        var labels = {
          "/": "Clipyx",
          "/store": "store",
          "/production": "production",
          "/community": "community",
          "/tapered-lines-fuse": "Taperizo product page",
          "/dashizo": "Dashizo product page",
          "/animizo": "Animizo Modifier product page",
          "/matchizo": "Matchizo product page",
          "/crtizo": "CRTizo product page",
          "/typewriter-pro": "Clipyx Typewriter page"
        };
        return labels[path] || "Clipyx page";
      }
      return host || "Open link";
    } catch (_error) {
      return "Open link";
    }
  }

  function linkTargetAttributes(value) {
    try {
      var parsed = new URL(String(value || "").replace(/&amp;/g, "&"), window.location.href);
      if (parsed.origin === window.location.origin) return "";
    } catch (_error) {}
    return ' target="_blank" rel="noopener noreferrer"';
  }

  function renderMarkdown(text) {
    var html = escapeHtml(text);
    var markdownLinks = [];
    html = html.replace(/\[([^\]]+)\]\(mailto:([^\s)]+)\)/g, "$2");
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (_match, label, url) {
      var index = markdownLinks.push('<a href="' + url + '"' + linkTargetAttributes(url) + ">" + label + "</a>") - 1;
      return "\uE000" + index + "\uE001";
    });
    html = html.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, function (_match, prefix, url) {
      var trailing = "";
      while (/[.,!?;:)]$/.test(url)) {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
      }
      return prefix + '<a href="' + url + '"' + linkTargetAttributes(url) + ">" + escapeHtml(friendlyLinkLabel(url)) + "</a>" + trailing;
    });
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(^|\n)\* (.+)/g, '$1\u2022 $2');
    html = html.replace(/(^|\n)- (.+)/g, '$1\u2022 $2');
    html = html.replace(/\uE000(\d+)\uE001/g, function (_match, index) { return markdownLinks[Number(index)] || ""; });
    return html;
  }

  function saveState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        open: isOpen,
        msgs: msgList,
        history: history,
        btnPos: getBtn() ? { left: getBtn().style.left, top: getBtn().style.top, right: getBtn().style.right, transform: getBtn().style.transform } : null,
        panelPos: getPanel() ? { left: getPanel().style.left, top: getPanel().style.top } : null,
      }));
    } catch (_e) {}
  }

  function loadState() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_e) { return null; }
  }

  function positionCloud() {
    var btn = getBtn();
    var cloud = getCloud();
    if (!btn || !cloud) return;
    var r = btn.getBoundingClientRect();
    var cw = cloud.offsetWidth || 200;
    var ch = cloud.offsetHeight || 50;
    cloud.classList.remove("cloud-right", "cloud-left");
    var placeRight = r.left > cw + 30;
    var left, top;
    if (placeRight) {
      left = r.left - cw - 16;
      cloud.classList.add("cloud-right");
    } else {
      left = r.right + 16;
      cloud.classList.add("cloud-left");
    }
    top = r.top + r.height / 2 - ch / 2;
    if (top < 10) top = 10;
    if (top + ch > window.innerHeight - 10) top = window.innerHeight - ch - 10;
    cloud.style.left = left + "px";
    cloud.style.top = top + "px";
  }

  function showCloud(text, autohide) {
    var cloud = getCloud();
    if (!cloud) return;
    cloud.textContent = "";
    cloud.classList.add("show");
    positionCloud();
    var i = 0;
    function typeNext() {
      if (i <= text.length) {
        cloud.textContent = text.slice(0, i);
        positionCloud();
        i++;
        setTimeout(typeNext, 35);
      } else if (autohide) {
        setTimeout(function () { cloud.classList.remove("show"); }, 4000);
      }
    }
    typeNext();
  }

  function hideCloud() {
    var cloud = getCloud();
    if (cloud) cloud.classList.remove("show");
  }

  function createButton() {
    var btn = document.createElement("div");
    btn.id = "clipyx-chat-btn";
    btn.innerHTML = '<img src="/media/botizo.png?v=2" alt="Botizo" width="38" height="38">';
    btn.setAttribute("role", "button");
    btn.setAttribute("tabindex", "0");
    btn.setAttribute("aria-label", "Open Clipyx chat");
    document.body.appendChild(btn);

    var cloud = document.createElement("div");
    cloud.id = "clipyx-chat-cloud";
    document.body.appendChild(cloud);

    btn.addEventListener("pointerdown", onBtnPointerDown);
    btn.addEventListener("click", function () { if (!dragMoved) toggle(); });
    // Reachable without a mouse: Tab stops on it, Enter or Space opens and closes the chat.
    btn.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        toggle();
      }
    });

    var saved = loadState();
    if (saved && saved.btnPos && saved.btnPos.left) {
      btn.style.left = saved.btnPos.left;
      btn.style.top = saved.btnPos.top;
      btn.style.right = saved.btnPos.right || "auto";
      btn.style.transform = saved.btnPos.transform || "none";
    }

    // The greeting shows once a visit, not over every page.
    var greeted = false;
    try { greeted = sessionStorage.getItem("clipyxChatGreeted") === "1"; } catch (_error) {}
    if ((!saved || !saved.open) && !greeted) {
      setTimeout(function () {
        showCloud("Hi, I am Botizo. Need any help?", true);
        try { sessionStorage.setItem("clipyxChatGreeted", "1"); } catch (_error) {}
      }, 2500);
    }

    window.addEventListener("resize", function () {
      if (cloud.classList.contains("show")) positionCloud();
    });
  }

  function onBtnPointerDown(e) {
    var btn = getBtn();
    if (!btn) return;
    isDragging = true;
    dragMoved = false;
    btn.classList.add("dragging");
    var rect = btn.getBoundingClientRect();
    dragStart = { x: e.clientX, y: e.clientY, bx: rect.left, by: rect.top };
    btn.setPointerCapture(e.pointerId);
    btn.addEventListener("pointermove", onBtnPointerMove);
    btn.addEventListener("pointerup", onBtnPointerUp);
    btn.addEventListener("pointercancel", onBtnPointerUp);
  }

  function onBtnPointerMove(e) {
    if (!isDragging) return;
    var dx = e.clientX - dragStart.x;
    var dy = e.clientY - dragStart.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) { dragMoved = true; hideCloud(); }
    var btn = getBtn();
    var nx = Math.max(8, Math.min(window.innerWidth - btn.offsetWidth - 8, dragStart.bx + dx));
    var ny = Math.max(8, Math.min(window.innerHeight - btn.offsetHeight - 8, dragStart.by + dy));
    btn.style.left = nx + "px";
    btn.style.top = ny + "px";
    btn.style.right = "auto";
    btn.style.transform = "none";
  }

  function onBtnPointerUp(e) {
    isDragging = false;
    var btn = getBtn();
    if (btn) {
      btn.classList.remove("dragging");
      btn.removeEventListener("pointermove", onBtnPointerMove);
      btn.removeEventListener("pointerup", onBtnPointerUp);
      btn.removeEventListener("pointercancel", onBtnPointerUp);
      try { btn.releasePointerCapture(e.pointerId); } catch (_e) {}
      saveState();
    }
  }

  function createPanel() {
    var panel = document.createElement("div");
    panel.id = "clipyx-chat-panel";
    panel.innerHTML =
      '<div id="clipyx-chat-header">' +
      '<div id="clipyx-chat-header-left">' +
      '<img src="/media/botizo.png?v=2" alt="Botizo">' +
      '<span>Botizo<small>Ask about Clipyx, tools, and tutorials</small></span>' +
      "</div>" +
      '<button id="clipyx-chat-close" aria-label="Close chat"><svg class="iconizo iconizo--large" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="/assets/iconizo/iconizo-sprite.svg?v=1.0.0#iz-x"></use></svg></button>' +
      "</div>" +
      '<div id="clipyx-chat-messages"></div>' +
      '<div id="clipyx-chat-voice" role="status" aria-live="polite"></div>' +
      '<div id="clipyx-chat-input-area">' +
      '<textarea id="clipyx-chat-input" rows="1" placeholder="Ask a question..." autocomplete="off"></textarea>' +
      '<button id="clipyx-chat-mic" type="button" aria-label="Speak your question" title="Speak your question" aria-pressed="false"><svg class="iconizo" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="/assets/iconizo/iconizo-sprite.svg?v=1.0.0#iz-mic"></use></svg></button>' +
      '<button id="clipyx-chat-send">Send</button>' +
      "</div>";
    document.body.appendChild(panel);

    document.getElementById("clipyx-chat-close").addEventListener("click", function () { close(); saveState(); });
    document.getElementById("clipyx-chat-send").addEventListener("click", send);
    document.getElementById("clipyx-chat-mic").addEventListener("click", voiceClick);
    panel.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && voice.recorder) { e.preventDefault(); voiceStop(false); voiceStatus("Cancelled."); }
    });
    document.addEventListener("visibilitychange", function () { if (document.hidden && voice.recorder) voiceStop(false); });
    var input = document.getElementById("clipyx-chat-input");
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
    input.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 80) + "px";
    });

    var header = document.getElementById("clipyx-chat-header");
    var panelDrag = { x: 0, y: 0, px: 0, py: 0, active: false };
    header.addEventListener("pointerdown", function (e) {
      if (e.target.id === "clipyx-chat-close") return;
      panelDrag.active = true;
      panelDrag.x = e.clientX;
      panelDrag.y = e.clientY;
      var r = panel.getBoundingClientRect();
      panelDrag.px = r.left;
      panelDrag.py = r.top;
      header.setPointerCapture(e.pointerId);
    });
    header.addEventListener("pointermove", function (e) {
      if (!panelDrag.active) return;
      var dx = e.clientX - panelDrag.x;
      var dy = e.clientY - panelDrag.y;
      var nx = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, panelDrag.px + dx));
      var ny = Math.max(0, Math.min(window.innerHeight - 60, panelDrag.py + dy));
      panel.style.left = nx + "px";
      panel.style.top = ny + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    });
    header.addEventListener("pointerup", function (e) {
      panelDrag.active = false;
      try { header.releasePointerCapture(e.pointerId); } catch (_e) {}
      saveState();
    });
  }

  function positionPanel(anchorToButton) {
    var btn = getBtn();
    var panel = getPanel();
    if (!btn || !panel) return;
    var saved = loadState();
    if (!anchorToButton && saved && saved.panelPos && saved.panelPos.left) {
      panel.style.left = saved.panelPos.left;
      panel.style.top = saved.panelPos.top;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      var pw = Math.min(380, window.innerWidth);
      var ph = Math.min(560, window.innerHeight - 40);
      panel.style.width = pw + "px";
      panel.style.height = ph + "px";
      return;
    }
    var r = btn.getBoundingClientRect();
    var pw = Math.min(380, window.innerWidth);
    var ph = Math.min(560, window.innerHeight - 40);
    var left, top;
    if (r.left > window.innerWidth / 2) {
      left = Math.max(4, r.right - pw);
    } else {
      left = r.left;
      if (left + pw > window.innerWidth - 4) left = window.innerWidth - pw - 4;
    }
    top = Math.max(8, Math.min(r.top + r.height / 2 - ph / 2, window.innerHeight - ph - 8));
    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = pw + "px";
    panel.style.height = ph + "px";
  }

  function restoreMessages() {
    var saved = loadState();
    if (!saved || !saved.msgs || !saved.msgs.length) return false;
    var container = document.getElementById("clipyx-chat-messages");
    if (!container) return false;
    container.innerHTML = "";
    msgList = saved.msgs;
    history = saved.history || [];
    for (var i = 0; i < msgList.length; i++) {
      var m = msgList[i];
      var div = document.createElement("div");
      div.className = "clipyx-chat-msg clipyx-chat-msg--" + m.type;
      if (m.type === "bot") { div.innerHTML = renderMarkdown(m.text); }
      else { div.textContent = m.text; }
      container.appendChild(div);
    }
    container.scrollTop = container.scrollHeight;
    return true;
  }

  function addMessage(type, text) {
    msgList.push({ type: type, text: text });
    var container = document.getElementById("clipyx-chat-messages");
    var div = document.createElement("div");
    div.className = "clipyx-chat-msg clipyx-chat-msg--" + type;
    if (type === "bot") { div.innerHTML = renderMarkdown(text); }
    else { div.textContent = text; }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    saveState();
    return div;
  }

  function removeMessage(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function addThinkingMessage() {
    var container = document.getElementById("clipyx-chat-messages");
    var div = document.createElement("div");
    div.className = "clipyx-chat-msg clipyx-chat-msg--bot clipyx-chat-msg--thinking";
    div.setAttribute("aria-label", "Thinking");
    div.innerHTML = '<span>Thinking</span><span class="clipyx-chat-thinking-dots" aria-hidden="true"><span></span><span></span><span></span></span>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  function open(anchorToButton) {
    isOpen = true;
    getPanel().style.display = "flex";
    positionPanel(anchorToButton !== false);
    getBtn().style.opacity = "0";
    getBtn().style.pointerEvents = "none";
    hideCloud();
    var hadMessages = restoreMessages();
    if (!hadMessages && !document.querySelector(".clipyx-chat-msg")) {
      addMessage("bot", "Hey! I am Botizo, the Clipyx assistant. Ask me about Clipyx, our tools, tutorials, or whatever you are looking for.");
    }
    setTimeout(function () { document.getElementById("clipyx-chat-input").focus(); }, 100);
    voiceCheck();
    saveState();
  }

  function close() {
    if (voice.recorder) voiceStop(false);
    isOpen = false;
    getPanel().style.display = "none";
    getBtn().style.opacity = "1";
    getBtn().style.pointerEvents = "auto";
    saveState();
  }

  function toggle() {
    if (isOpen) close(); else open(true);
  }

  async function send() {
    // While recording, Send stops, transcribes and sends without the review step (owner, 2026-10-20); while a clip is
    // still being transcribed, it sends once the text is in.
    if (voice.recorder) { voice.sendAfter = true; voiceStop(true); return; }
    if (voice.busy && voice.uploading) { voice.sendAfter = true; return; }
    var input = document.getElementById("clipyx-chat-input");
    var sendBtn = document.getElementById("clipyx-chat-send");
    var message = input.value.trim();
    if (!message || isSending) return;
    isSending = true;
    sendBtn.disabled = true;
    input.value = "";
    input.style.height = "auto";
    addMessage("user", message);
    var thinking = addThinkingMessage();
    try {
      var response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message, history: history.slice(-8) }),
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      var data = await response.json();
      removeMessage(thinking);
      var reply = data.reply || "Sorry, I could not answer that right now.";
      addMessage("bot", reply);
      history.push({ user: message, bot: reply });
      if (history.length > 20) history = history.slice(-20);
    } catch (error) {
      removeMessage(thinking);
      addMessage("bot", "Connection error. Please try again or use the contact form below.");
    } finally {
      isSending = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // ---- voice input --------------------------------------------------------------------------------------------------
  var voice = { checked: false, token: "", tokenExpires: 0, recorder: null, stream: null, chunks: [], startedAt: 0, timer: 0, busy: false,
    audio: null, analyser: null, levels: [], lastLevel: 0, waveFrame: 0, sendAfter: false, uploading: false };
  var WAVE_BARS = 24;

  function micButton() { return document.getElementById("clipyx-chat-mic"); }

  // The line above the box: a message, optionally with a link and a button. Empty text hides it.
  function voiceStatus(text, options) {
    var row = document.getElementById("clipyx-chat-voice");
    if (!row) return;
    options = options || {};
    row.textContent = "";
    row.className = text ? "is-shown" + (options.error ? " is-error" : "") : "";
    if (!text) return;
    if (options.recording) {
      // The waveform while recording (owner: "like when you talk on ChatGPT"); the still dot with reduced motion.
      var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var mark = document.createElement(still ? "span" : "canvas");
      if (still) mark.className = "clipyx-chat-rec-dot";
      else mark.id = "clipyx-chat-wave";
      mark.setAttribute("aria-hidden", "true");
      row.appendChild(mark);
      row.setAttribute("data-recording", "");
    }
    var span = document.createElement("span");
    span.id = "clipyx-chat-voice-text";
    span.appendChild(document.createTextNode(text));
    if (options.link) {
      span.appendChild(document.createTextNode(" "));
      var a = document.createElement("a");
      a.href = options.link.href;
      a.textContent = options.link.label;
      span.appendChild(a);
    }
    row.appendChild(span);
    if (options.action) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = options.action.label;
      button.addEventListener("click", options.action.run);
      row.appendChild(button);
    }
  }

  // Shown once Botizo's server says voice input is on (a key, and the month not used up).
  async function voiceCheck() {
    if (voice.checked || !window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    voice.checked = true;
    try {
      var response = await fetch(DICTATE_ENDPOINT + "/status", { method: "GET", credentials: "omit" });
      var data = response.ok ? await response.json() : null;
      if (data && data.available === true) micButton().classList.add("is-ready");
    } catch (_error) {}
  }

  function voiceHide() {
    var mic = micButton();
    if (mic) mic.classList.remove("is-ready");
  }

  function signInLink() {
    return { href: "/login?redirect=" + encodeURIComponent(location.pathname + location.search), label: "Sign in" };
  }

  async function voiceToken() {
    if (voice.token && voice.tokenExpires - 30 > Date.now() / 1000) return voice.token;
    var response = await fetch(DICTATE_TOKEN_ENDPOINT, { method: "POST", credentials: "same-origin", headers: { "Accept": "application/json" } });
    if (response.status === 401) { var guest = new Error("not_signed_in"); guest.code = "not_signed_in"; throw guest; }
    if (!response.ok) { var failed = new Error("unavailable"); failed.code = "unavailable"; throw failed; }
    var data = await response.json();
    voice.token = data.token || "";
    voice.tokenExpires = Number(data.expires_at) || 0;
    return voice.token;
  }

  function voiceClick() {
    if (voice.busy) return;
    if (voice.recorder) { voiceStop(true); return; }
    var acknowledged = false;
    try { acknowledged = localStorage.getItem(DICTATE_NOTICE_KEY) === "1"; } catch (_error) {}
    if (!acknowledged) {
      voiceStatus("Your voice goes to ElevenLabs to become text. It isn't stored.", {
        link: { href: "/privacy#voice-input", label: "Privacy" },
        action: { label: "Start", run: function () { try { localStorage.setItem(DICTATE_NOTICE_KEY, "1"); } catch (_error) {} voiceStart(); } }
      });
      return;
    }
    voiceStart();
  }

  function voiceSetRecording(on) {
    var mic = micButton();
    mic.classList.toggle("is-recording", on);
    mic.setAttribute("aria-pressed", on ? "true" : "false");
    mic.setAttribute("aria-label", on ? "Stop and check the text" : "Speak your question");
    mic.title = on ? "Stop and check the text" : "Speak your question";
    var sendButton = document.getElementById("clipyx-chat-send");
    if (on) { sendButton.setAttribute("aria-label", "Stop recording and send"); sendButton.title = "Stop recording and send"; }
    else { sendButton.removeAttribute("aria-label"); sendButton.removeAttribute("title"); }
    mic.querySelector("use").setAttribute("href", "/assets/iconizo/iconizo-sprite.svg?v=1.0.0#" + (on ? "iz-square" : "iz-mic"));
  }

  function voiceClock() {
    var seconds = Math.min(DICTATE_MAX_SECONDS, Math.floor((performance.now() - voice.startedAt) / 1000));
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var text = Math.floor(seconds / 60) + ":" + pad(seconds % 60) + " / 1:00 · Stop to review, or Send";
    var row = document.getElementById("clipyx-chat-voice");
    var span = document.getElementById("clipyx-chat-voice-text");
    if (row && span && row.hasAttribute("data-recording")) { span.textContent = text; return; }
    voiceStatus(text, { recording: true });
    span = document.getElementById("clipyx-chat-voice-text");
    span.setAttribute("aria-hidden", "true");
    var said = document.createElement("span");
    said.className = "clipyx-chat-sr";
    said.textContent = "Recording. Click Stop to check the text first, or Send to send it right away. Escape cancels.";
    span.parentNode.appendChild(said);
    voiceWave();
    if (performance.now() - voice.startedAt >= DICTATE_MAX_SECONDS * 1000) voiceStop(true);
  }

  async function voiceStart() {
    voice.busy = true;
    micButton().classList.add("is-busy");
    voiceStatus("");
    try {
      await voiceToken();
    } catch (error) {
      voice.busy = false;
      micButton().classList.remove("is-busy");
      if (error.code === "not_signed_in") voiceStatus("Voice input is for signed-in members.", { link: signInLink() });
      else voiceStatus("Voice input isn't available right now. Typing still works.", { error: true });
      return;
    }
    var stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      voiceListen(stream);
    } catch (_error) {
      voice.busy = false;
      micButton().classList.remove("is-busy");
      voiceStatus("The microphone is blocked. Allow it for clipyx.com in your browser to use voice input.", { error: true });
      return;
    }
    var types = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"];
    var type = "";
    for (var i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(types[i])) { type = types[i]; break; }
    }
    var recorder;
    try {
      recorder = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
    } catch (_error) {
      stream.getTracks().forEach(function (track) { track.stop(); });
      voice.busy = false;
      micButton().classList.remove("is-busy");
      voiceStatus("This browser can't record audio here. Typing still works.", { error: true });
      return;
    }
    voice.stream = stream;
    voice.recorder = recorder;
    voice.chunks = [];
    voice.send = true;
    recorder.addEventListener("dataavailable", function (event) { if (event.data && event.data.size) voice.chunks.push(event.data); });
    recorder.addEventListener("stop", function () {
      var seconds = (performance.now() - voice.startedAt) / 1000;
      var blob = new Blob(voice.chunks, { type: recorder.mimeType || type || "audio/webm" });
      voiceQuiet();
      voice.stream.getTracks().forEach(function (track) { track.stop(); });
      voice.stream = null;
      voice.recorder = null;
      voice.chunks = [];
      if (!voice.send) return;
      if (!blob.size) { voiceStatus("Nothing was recorded. Check your microphone and try again.", { error: true }); return; }
      voiceUpload(blob, seconds);
    });
    recorder.start(1000);
    voice.startedAt = performance.now();
    voice.busy = false;
    micButton().classList.remove("is-busy");
    voiceSetRecording(true);
    voiceClock();
    voice.timer = setInterval(voiceClock, 250);
  }

  // The microphone's level for the waveform (Web Audio); if that isn't available, the bars still move gently.
  function voiceListen(stream) {
    voice.levels = [];
    voice.lastLevel = 0;
    try {
      var Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      voice.audio = new Context();
      var analyser = voice.audio.createAnalyser();
      analyser.fftSize = 512;
      voice.audio.createMediaStreamSource(stream).connect(analyser);
      voice.analyser = analyser;
      if (voice.audio.state === "suspended" && voice.audio.resume) voice.audio.resume().catch(function () {});
    } catch (_error) {
      voice.analyser = null;
    }
  }

  function voiceQuiet() {
    cancelAnimationFrame(voice.waveFrame);
    voice.waveFrame = 0;
    voice.analyser = null;
    if (voice.audio) { try { voice.audio.close(); } catch (_error) {} }
    voice.audio = null;
  }

  // 24 bars, newest on the right: a new level every 50 ms, the louder the taller, a flat line when silent.
  function voiceWave() {
    var canvas = document.getElementById("clipyx-chat-wave");
    if (!voice.recorder || !canvas) return;
    voice.waveFrame = requestAnimationFrame(voiceWave);
    var now = performance.now();
    if (now - voice.lastLevel >= 50) {
      voice.lastLevel = now;
      var level;
      if (voice.analyser) {
        var data = new Uint8Array(voice.analyser.fftSize);
        voice.analyser.getByteTimeDomainData(data);
        var sum = 0;
        for (var i = 0; i < data.length; i++) { var x = (data[i] - 128) / 128; sum += x * x; }
        level = Math.min(1, Math.sqrt(sum / data.length) * 5);
      } else {
        var last = voice.levels.length ? voice.levels[voice.levels.length - 1] : 0.3;
        level = Math.max(0.12, Math.min(0.8, last + (Math.random() - 0.5) * 0.35));
      }
      voice.levels.push(level);
      if (voice.levels.length > WAVE_BARS) voice.levels.shift();
    }
    var ratio = window.devicePixelRatio || 1;
    var width = canvas.clientWidth, height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
    var context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#00a2ff";
    var bar = 2, gap = (width - WAVE_BARS * bar) / (WAVE_BARS - 1);
    for (var b = 0; b < WAVE_BARS; b++) {
      var value = voice.levels[voice.levels.length - WAVE_BARS + b] || 0;
      var h = Math.max(2, value * height);
      var left = b * (bar + gap), top = (height - h) / 2;
      context.beginPath();
      if (context.roundRect) context.roundRect(left, top, bar, h, 1);
      else context.rect(left, top, bar, h);
      context.fill();
    }
  }

  function voiceStop(send) {
    if (!voice.recorder) return;
    clearInterval(voice.timer);
    cancelAnimationFrame(voice.waveFrame);
    voice.send = send;
    if (!send) voice.sendAfter = false;
    voiceSetRecording(false);
    if (!send) voiceStatus("");
    try { voice.recorder.stop(); } catch (_error) {}
  }

  async function voiceUpload(blob, seconds) {
    voice.busy = true;
    voice.uploading = true;
    micButton().classList.add("is-busy");
    voiceStatus("Turning your voice into text...");
    var data = null;
    var status = 0;
    try {
      var token = await voiceToken();
      var response = await fetch(DICTATE_ENDPOINT, {
        method: "POST",
        credentials: "omit",
        headers: { "Authorization": "Bearer " + token, "Content-Type": blob.type.replace(/\s+/g, ""), "X-Audio-Seconds": String(Math.max(1, Math.ceil(seconds))) },
        body: blob
      });
      status = response.status;
      data = await response.json().catch(function () { return null; });
    } catch (error) {
      status = error.code === "not_signed_in" ? 401 : 0;
    }
    voice.busy = false;
    voice.uploading = false;
    var sendNow = voice.sendAfter;
    voice.sendAfter = false;
    micButton().classList.remove("is-busy");
    if (status === 200 && data) {
      var text = String(data.text || "").trim();
      if (!text) { voiceStatus("Nothing was heard. Try again a little closer to the microphone."); return; }
      var input = document.getElementById("clipyx-chat-input");
      input.value = input.value.trim() ? input.value.replace(/\s+$/, "") + " " + text : text;
      input.dispatchEvent(new Event("input"));
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      if (sendNow) { voiceStatus(""); send(); return; }
      voiceStatus("Check the text, then press Send.");
      return;
    }
    var code = data && data.error;
    if (status === 401) { voice.token = ""; voiceStatus("Voice input is for signed-in members.", { link: signInLink() }); return; }
    if (code === "monthly_limit") { voiceHide(); voiceStatus("Voice input is paused for this month. Typing still works.", { error: true }); return; }
    var message = data && typeof data.message === "string" && data.message ? data.message : "Couldn't turn that into text. Please try again or type your question.";
    voiceStatus(message, { error: true });
  }

  function init() {
    if (window.matchMedia("(max-width: 1024px), (hover: none) and (pointer: coarse)").matches) return;
    if (document.getElementById("clipyx-chat-btn")) return;
    css();
    createButton();
    createPanel();
    var saved = loadState();
    if (saved && saved.open) {
      setTimeout(function () { open(false); }, 50);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
