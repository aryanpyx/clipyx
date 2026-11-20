(function () {
    "use strict";

    // Tablet landscape widths (including 1366px) use ordinary navigation buttons.
    const desktopControls = window.matchMedia("(min-width: 600px) and (hover: hover) and (pointer: fine)");
    const canUsePointerEffects = desktopControls.matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodeSelector = ".hero-button-group .btn:not(.btn-disabled):not([aria-disabled='true'])";
    const magneticButtonSelector = ".btn:not(.btn-disabled):not([aria-disabled='true'])";

    function ready(fn) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn, { once: true });
        } else {
            fn();
        }
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function debounce(fn) {
        let frame = 0;
        return function () {
            if (frame) cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                frame = 0;
                fn();
            });
        };
    }

    function initSectionGridLines() {
        const theme = getComputedStyle(document.documentElement);
        const gridHeight = parseFloat(theme.getPropertyValue("--signal-cell-y")) || 28;
        const separatorHeight = parseFloat(theme.getPropertyValue("--signal-separator-height")) || 3;
        const sectionSelector = ".products-section:not(.products-section--no-separator), .library-showcase, .faq-section, .portfolio-section, .contact-section, .footer-bottom";

        function updateGrid() {
            const signalGrid = document.querySelector(".site-signal-grid");
            const gridOrigin = signalGrid ? signalGrid.getBoundingClientRect().top + window.scrollY : 0;
            const pageHeight = Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight,
                window.innerHeight
            );
            const linePositions = Array.from(document.querySelectorAll(sectionSelector))
                .map((section) => section.getBoundingClientRect().top + window.scrollY - gridOrigin)
                .filter((top) => top > gridHeight)
                .map((top) => Math.round(top / gridHeight) * gridHeight)
                .filter((top, index, positions) => top >= 0 && positions.indexOf(top) === index)
                .sort((a, b) => a - b);

            const separatorLayers = linePositions.map((top) => (
                `linear-gradient(to bottom, transparent 0 ${top}px, var(--fusion-grid-separator) ${top}px ${top + separatorHeight}px, transparent ${top + separatorHeight}px 100%)`
            ));

            if (signalGrid) {
                // The background layer paints the film grain; it only needs the pre-grid separator lines.
                signalGrid.style.setProperty("--signal-section-lines", separatorLayers.join(", ") || "none");
                document.body.classList.toggle("signal-section-lines", linePositions.length > 0);
                return;
            }

            // Without the background layer the body carries only the section lines; the site has no grid lines.
            if (linePositions.length === 0) {
                document.body.style.backgroundImage = "";
                return;
            }

            const separatorLayerCount = separatorLayers.length;

            document.body.style.backgroundImage = separatorLayers.join(", ");
            document.body.style.backgroundSize = Array(separatorLayerCount).fill(`100% ${pageHeight}px`).join(", ");
            document.body.style.backgroundRepeat = Array(separatorLayerCount).fill("no-repeat").join(", ");
            document.body.style.backgroundAttachment = Array(separatorLayerCount).fill("scroll").join(", ");
        }

        const scheduleUpdate = debounce(updateGrid);
        updateGrid();
        requestAnimationFrame(updateGrid);
        window.addEventListener("load", updateGrid, { once: true });
        window.addEventListener("resize", scheduleUpdate);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(updateGrid).catch(() => {});
        }
        document.addEventListener("toggle", (event) => {
            if (event.target instanceof HTMLDetailsElement) scheduleUpdate();
        }, true);
        if ("ResizeObserver" in window) {
            const resizeObserver = new ResizeObserver(scheduleUpdate);
            // Padding can change when the deferred grid/theme mounts, even with reduced motion.
            document.querySelectorAll(sectionSelector).forEach((section) => resizeObserver.observe(section, { box: "border-box" }));
            resizeObserver.observe(document.body, { box: "border-box" });
        }
    }

    function initMagneticButtons() {
        if (!canUsePointerEffects || prefersReducedMotion) return;

        document.querySelectorAll(magneticButtonSelector).forEach((button) => {
            if (button.closest(".hero-button-group")) return;

            button.classList.add("magnetic-button");

            button.addEventListener("mousemove", (event) => {
                if (!desktopControls.matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
                if (document.body.classList.contains("node-connection-active")) return;

                const rect = button.getBoundingClientRect();
                const localX = event.clientX - rect.left;
                const localY = event.clientY - rect.top;
                const pullX = clamp((localX - rect.width / 2) * 0.12, -12, 12);
                const pullY = clamp((localY - rect.height / 2) * 0.12, -10, 10);

                button.style.transform = `translate(${pullX}px, ${pullY}px)`;
                button.style.transformOrigin = `${localX}px ${localY}px`;
            });

            button.addEventListener("mouseleave", () => {
                button.style.transform = "";
                button.style.transformOrigin = "";
            });
            desktopControls.addEventListener("change", () => {
                button.style.transform = "";
                button.style.transformOrigin = "";
            });
        });
    }

    function initMobileMenu() {
        const navbar = document.querySelector(".navbar");
        const navLinks = navbar?.querySelector(".nav-links");
        if (!navbar || !navLinks) return;

        const mobileQuery = window.matchMedia("(max-width: 768px)");
        const toggle = document.createElement("button");
        const panel = document.createElement("div");

        toggle.type = "button";
        toggle.className = "mobile-menu-toggle";
        toggle.setAttribute("aria-label", "Open navigation menu");
        toggle.setAttribute("aria-expanded", "false");
        toggle.innerHTML = '<svg class="iconizo iconizo--menu" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="/assets/iconizo/iconizo-sprite.svg?v=1.0.0#iz-menu"></use></svg>';

        panel.className = "mobile-menu-panel";
        panel.setAttribute("aria-hidden", "true");
        panel.inert = true;
        toggle.tabIndex = -1;
        panel.append(...Array.from(navLinks.children).map((item) => item.cloneNode(true)));

        document.body.append(toggle, panel);

        function closeMenu() {
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Open navigation menu");
            toggle.querySelector("use").setAttribute("href", "/assets/iconizo/iconizo-sprite.svg?v=1.0.0#iz-menu");
            panel.setAttribute("aria-hidden", "true");
            panel.inert = true;
            panel.classList.remove("is-open");
        }

        function updateVisibility() {
            if (!mobileQuery.matches) {
                toggle.classList.remove("is-visible");
                toggle.tabIndex = -1;
                closeMenu();
                return;
            }

            const navbarHidden = navbar.getBoundingClientRect().bottom <= 0;
            toggle.classList.toggle("is-visible", navbarHidden);
            toggle.tabIndex = navbarHidden ? 0 : -1;
            if (!navbarHidden) closeMenu();
        }

        const scheduleVisibilityUpdate = debounce(updateVisibility);
        toggle.addEventListener("click", () => {
            const isOpen = panel.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
            toggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
            toggle.querySelector("use").setAttribute("href", "/assets/iconizo/iconizo-sprite.svg?v=1.0.0#iz-" + (isOpen ? "x" : "menu"));
            panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
            panel.inert = !isOpen;
        });
        panel.addEventListener("click", (event) => {
            if (event.target.closest("a")) closeMenu();
        });
        document.addEventListener("click", (event) => {
            if (!panel.classList.contains("is-open")) return;
            if (panel.contains(event.target) || toggle.contains(event.target)) return;
            closeMenu();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && panel.classList.contains("is-open")) {
                closeMenu();
                toggle.focus();
            }
        });
        window.addEventListener("scroll", scheduleVisibilityUpdate, { passive: true });
        window.addEventListener("resize", scheduleVisibilityUpdate);
        mobileQuery.addEventListener?.("change", updateVisibility);
        updateVisibility();
    }

    function initNodeConnections() {
        if (!desktopControls.matches) return;
        if (!document.querySelector(nodeSelector)) return;

        const events = new AbortController();
        const captureOptions = { capture: true, signal: events.signal };
        const originalNodes = Array.from(document.querySelectorAll(nodeSelector));
        let disposed = false;
        let layer = null;
        let active = null;
        let nodeDrag = null;
        let targetPort = null;
        let targetOutput = null;
        let suppressClickUntil = 0;
        let mergeCount = 0;
        let boxSelect = null;
        const connections = [];
        const inputPortNames = ["left", "top", "bottom"];
        const inputDefaultSides = { left: "left", top: "top", bottom: "bottom" };
        const portMarkerEdgeOffset = 4;
        const nodeInputMarkers = new Map();
        const nodeOutputMarkers = new Map();
        const selectedNodes = new Set();
        // Wires and port markers live inside the hero and use its coordinates, so they scroll with the nodes natively
        // instead of being repositioned after every scroll (which made them trail and jump).
        const container = originalNodes[0].closest(".hero") || document.body;
        let resizeWatch = null;

        function toLocal(point) {
            const origin = container.getBoundingClientRect();
            return { x: point.x - origin.left, y: point.y - origin.top };
        }

        function nodeRect(node) {
            const x = parseFloat(node.dataset.nodeX || "0") || 0;
            const y = parseFloat(node.dataset.nodeY || "0") || 0;
            const parent = node.offsetParent;

            if (parent) {
                const parentRect = parent.getBoundingClientRect();
                const left = parentRect.left + node.offsetLeft + x;
                const top = parentRect.top + node.offsetTop + y;
                const width = node.offsetWidth;
                const height = node.offsetHeight;

                return {
                    left,
                    top,
                    width,
                    height,
                    right: left + width,
                    bottom: top + height,
                };
            }

            return node.getBoundingClientRect();
        }

        function initializeNode(node) {
            node.draggable = false;
            node.dataset.nodeX = node.dataset.nodeX || "0";
            node.dataset.nodeY = node.dataset.nodeY || "0";
            node.style.setProperty("--node-x", `${parseFloat(node.dataset.nodeX || "0") || 0}px`);
            node.style.setProperty("--node-y", `${parseFloat(node.dataset.nodeY || "0") || 0}px`);
        }

        document.querySelectorAll(nodeSelector).forEach(initializeNode);

        function setSelectedNodes(nodes) {
            selectedNodes.forEach((node) => node.classList.remove("is-node-selected"));
            selectedNodes.clear();

            nodes.forEach((node) => {
                if (!document.body.contains(node)) return;
                selectedNodes.add(node);
                node.classList.add("is-node-selected");
            });
        }

        function unionRects(rects) {
            return rects.reduce((union, rect) => ({
                left: Math.min(union.left, rect.left),
                top: Math.min(union.top, rect.top),
                right: Math.max(union.right, rect.right),
                bottom: Math.max(union.bottom, rect.bottom),
            }), {
                left: Infinity,
                top: Infinity,
                right: -Infinity,
                bottom: -Infinity,
            });
        }

        function normalizeRect(left, top, right, bottom) {
            return {
                left: Math.min(left, right),
                top: Math.min(top, bottom),
                right: Math.max(left, right),
                bottom: Math.max(top, bottom),
            };
        }

        function rectsIntersect(first, second) {
            return first.left <= second.right && first.right >= second.left && first.top <= second.bottom && first.bottom >= second.top;
        }

        function makeSelectionBox() {
            const box = document.createElement("span");
            box.className = "node-selection-box";
            box.setAttribute("aria-hidden", "true");
            document.body.appendChild(box);
            return box;
        }

        function updateSelectionBox(event) {
            if (!boxSelect) return false;

            const rect = normalizeRect(boxSelect.startX, boxSelect.startY, event.clientX, event.clientY);
            const width = rect.right - rect.left;
            const height = rect.bottom - rect.top;
            boxSelect.moved = width > 3 || height > 3;
            boxSelect.box.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
            boxSelect.box.style.width = `${width}px`;
            boxSelect.box.style.height = `${height}px`;

            const hits = Array.from(document.querySelectorAll(nodeSelector)).filter((node) => rectsIntersect(rect, nodeRect(node)));
            setSelectedNodes(hits);
            return true;
        }

        function startBoxSelect(event) {
            if (!event.target.closest || !event.target.closest(".hero")) return false;
            // The Latest news panel's buttons and links take their own clicks (20261026-hero-news): a selection box
            // would swallow them (suppressClickUntil).
            if (event.target.closest("[data-hero-news]")) return false;

            boxSelect = {
                startX: event.clientX,
                startY: event.clientY,
                box: makeSelectionBox(),
                moved: false,
            };
            document.body.classList.add("node-drag-active");
            suppressClickUntil = Date.now() + 900;
            event.preventDefault();
            event.stopPropagation();
            updateSelectionBox(event);
            return true;
        }

        function endBoxSelect(event) {
            if (!boxSelect) return false;

            const moved = boxSelect.moved;
            boxSelect.box.remove();
            boxSelect = null;
            document.body.classList.remove("node-drag-active");
            if (moved) {
                suppressClickUntil = Date.now() + 900;
                event?.preventDefault?.();
                event?.stopPropagation?.();
            }
            return true;
        }

        function ensureLayer() {
            if (layer) return layer;
            // theme.css sizes the layer to the hero; without a viewBox one SVG unit is one CSS pixel of the hero.
            layer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            layer.classList.add("node-link-layer");
            layer.setAttribute("aria-hidden", "true");
            container.appendChild(layer);
            return layer;
        }

        function makePathPair() {
            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const shadow = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
            shadow.classList.add("node-link-shadow");
            line.classList.add("node-link-line");
            group.append(shadow, line);
            ensureLayer().appendChild(group);
            return { group, shadow, line };
        }

        function outputPointForSide(node, side) {
            const rect = nodeRect(node);
            if (side === "top") return { x: rect.left + rect.width / 2, y: rect.top - 4.5 };
            if (side === "bottom") return { x: rect.left + rect.width / 2, y: rect.bottom + 4.5 };
            if (side === "left") return { x: rect.left - 6, y: rect.top + rect.height / 2 };
            return { x: rect.right + 6, y: rect.top + rect.height / 2 };
        }

        function markerEdgePoint(point, side) {
            if (side === "top") return { x: point.x, y: point.y - portMarkerEdgeOffset };
            if (side === "bottom") return { x: point.x, y: point.y + portMarkerEdgeOffset };
            if (side === "right") return { x: point.x + portMarkerEdgeOffset, y: point.y };
            return { x: point.x - portMarkerEdgeOffset, y: point.y };
        }

        function outputAnchorPointForSide(node, side) {
            return markerEdgePoint(outputPointForSide(node, side), side);
        }

        function sideTowardPoint(rect, point) {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dx = point.x - centerX;
            const dy = point.y - centerY;

            if (Math.abs(dx) >= Math.abs(dy) * 0.8) return dx < 0 ? "left" : "right";
            return dy < 0 ? "top" : "bottom";
        }

        function rectCenter(rect) {
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            };
        }

        function pointDistance(first, second) {
            return Math.hypot(first.x - second.x, first.y - second.y);
        }

        function sideTowardRect(sourceRect, targetRect) {
            const horizontalGap = targetRect.left >= sourceRect.right
                ? targetRect.left - sourceRect.right
                : (targetRect.right <= sourceRect.left ? sourceRect.left - targetRect.right : 0);
            const verticalGap = targetRect.top >= sourceRect.bottom
                ? targetRect.top - sourceRect.bottom
                : (targetRect.bottom <= sourceRect.top ? sourceRect.top - targetRect.bottom : 0);

            if (verticalGap > 0 && (horizontalGap === 0 || verticalGap >= Math.max(18, horizontalGap * 0.35))) {
                return targetRect.top >= sourceRect.bottom ? "bottom" : "top";
            }
            if (horizontalGap > 0) {
                return targetRect.right <= sourceRect.left ? "left" : "right";
            }
            if (verticalGap > 0) return targetRect.top >= sourceRect.bottom ? "bottom" : "top";
            return sideTowardPoint(sourceRect, rectCenter(targetRect));
        }

        function outputSideTowardPoint(node, point) {
            return sideTowardPoint(nodeRect(node), point);
        }

        function nodeHasOutgoingConnection(node) {
            return connections.some((connection) => connection.source === node);
        }

        function activeOutputPoint(node, side) {
            return side ? outputAnchorPointForSide(node, side) : outputAnchorPoint(node);
        }

        function connectionOutputSide(source, target) {
            const targetRect = nodeRect(target);
            const sourceRect = nodeRect(source);
            const targetCenterX = targetRect.left + targetRect.width / 2;
            const targetCenterY = targetRect.top + targetRect.height / 2;

            return sideTowardPoint(sourceRect, { x: targetCenterX, y: targetCenterY });
        }

        function outputSideForNode(node) {
            const outgoing = connections.filter((connection) => connection.source === node && document.body.contains(connection.target));
            if (outgoing.length === 0) return "right";

            const sourceRect = nodeRect(node);
            const sourceCenter = rectCenter(sourceRect);
            const nearestTargetRect = outgoing
                .map((connection) => nodeRect(connection.target))
                .reduce((nearest, targetCenter) => {
                    const distance = pointDistance(sourceCenter, rectCenter(targetCenter));
                    return distance < nearest.distance ? { targetRect: targetCenter, distance } : nearest;
                }, { targetRect: null, distance: Infinity }).targetRect;
            if (!nearestTargetRect) return "right";

            return sideTowardRect(sourceRect, nearestTargetRect);
        }

        function outputPoint(node) {
            return outputPointForSide(node, outputSideForNode(node));
        }

        function outputAnchorPoint(node) {
            const side = outputSideForNode(node);
            return outputAnchorPointForSide(node, side);
        }

        function connectedOutputPoint(connection) {
            return outputAnchorPoint(connection.source);
        }

        function inputPointForSide(node, side) {
            const rect = nodeRect(node);
            if (side === "top") return { x: rect.left + rect.width / 2, y: rect.top - 4.5 };
            if (side === "bottom") return { x: rect.left + rect.width / 2, y: rect.bottom + 4.5 };
            if (side === "right") return { x: rect.right + 4.5, y: rect.top + rect.height / 2 };
            return { x: rect.left - 4.5, y: rect.top + rect.height / 2 };
        }

        function inputAnchorPointForSide(node, side) {
            return markerEdgePoint(inputPointForSide(node, side), side);
        }

        function inputPoint(node, port) {
            return inputPointForSide(node, inputDefaultSides[port] || "left");
        }

        function connectionInputSide(source, target) {
            const sourceAnchor = outputAnchorPoint(source);
            const occupiedOutputSide = nodeHasOutgoingConnection(target) ? outputSideForNode(target) : "";
            const sideOrder = ["left", "top", "bottom", "right"];
            let bestSide = sideTowardPoint(nodeRect(target), sourceAnchor);
            let bestScore = Infinity;

            sideOrder.forEach((side) => {
                if (side === occupiedOutputSide) return;

                const anchor = inputAnchorPointForSide(target, side);
                const score = pointDistance(anchor, sourceAnchor);
                if (score < bestScore) {
                    bestScore = score;
                    bestSide = side;
                }
            });

            return bestSide;
        }

        function inputLayoutForNode(node) {
            const layout = { ...inputDefaultSides };
            const incoming = connections.filter((connection) => connection.target === node);
            const outputSide = nodeHasOutgoingConnection(node) ? outputSideForNode(node) : "";
            const desiredSides = new Map(incoming.map((connection) => [
                connection.port,
                connectionInputSide(connection.source, connection.target),
            ]));
            const connectedPorts = new Set(incoming.map((connection) => connection.port));
            const blockedSwaps = new Set();
            const inputSides = ["left", "top", "bottom", "right"];

            function resolveOutputInputOverlap() {
                if (!outputSide) return;

                const usedSides = new Set(Array.from(connectedPorts).map((port) => layout[port] || inputDefaultSides[port] || "left"));
                connectedPorts.forEach((port) => {
                    if (layout[port] !== outputSide) return;

                    const defaultSide = inputDefaultSides[port] || "left";
                    const candidates = [defaultSide, ...inputSides].filter((side, index, sides) => (
                        side !== outputSide && sides.indexOf(side) === index
                    ));
                    const connection = incoming.find((incomingConnection) => incomingConnection.port === port);
                    const sourceAnchor = connection ? outputAnchorPoint(connection.source) : null;
                    const rankedCandidates = candidates.sort((first, second) => {
                        if (!sourceAnchor) return 0;
                        return pointDistance(inputAnchorPointForSide(node, first), sourceAnchor) - pointDistance(inputAnchorPointForSide(node, second), sourceAnchor);
                    });
                    const replacement = rankedCandidates.find((side) => !usedSides.has(side)) || rankedCandidates[0];
                    if (!replacement) return;

                    usedSides.delete(layout[port]);
                    layout[port] = replacement;
                    usedSides.add(replacement);
                });
            }

            incoming.forEach((connection) => {
                const port = connection.port;
                const desiredSide = desiredSides.get(port) || inputDefaultSides[port] || "left";
                const defaultSide = inputDefaultSides[port] || "left";

                inputPortNames.forEach((otherPort) => {
                    if (otherPort === port || !connectedPorts.has(otherPort)) return;
                    const otherDefaultSide = inputDefaultSides[otherPort] || "left";
                    const otherDesiredSide = desiredSides.get(otherPort) || otherDefaultSide;
                    if (desiredSide === otherDefaultSide && otherDesiredSide === defaultSide) {
                        blockedSwaps.add(port);
                        blockedSwaps.add(otherPort);
                    }
                });
            });

            incoming.forEach((connection) => {
                const port = connection.port;
                if (blockedSwaps.has(port)) return;

                const desiredSide = desiredSides.get(port) || inputDefaultSides[port] || "left";
                const currentSide = layout[port] || inputDefaultSides[port] || "left";
                if (desiredSide === currentSide) return;

                const displacedPort = inputPortNames.find((candidatePort) => candidatePort !== port && layout[candidatePort] === desiredSide);
                if (displacedPort && connectedPorts.has(displacedPort)) {
                    const displacedDesiredSide = desiredSides.get(displacedPort) || inputDefaultSides[displacedPort] || "left";
                    if (displacedDesiredSide === desiredSide) return;
                }
                if (displacedPort) layout[displacedPort] = currentSide;
                layout[port] = desiredSide;
            });

            resolveOutputInputOverlap();

            return layout;
        }

        function targetInputPoint(node, port) {
            const layout = inputLayoutForNode(node);
            return inputPointForSide(node, layout[port] || inputDefaultSides[port] || "left");
        }

        function targetInputAnchorPoint(node, port) {
            const layout = inputLayoutForNode(node);
            const side = layout[port] || inputDefaultSides[port] || "left";
            return inputAnchorPointForSide(node, side);
        }

        function connectedInputPoint(connection) {
            return targetInputAnchorPoint(connection.target, connection.port);
        }

        function portColor(port) {
            if (port === "top") return "var(--node-pin-green)";
            if (port === "bottom") return "var(--node-pin-blue)";
            return "var(--node-pin-yellow)";
        }

        function linePath(start, end) {
            return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
        }

        function setPair(pair, start, end, color = "var(--node-link)") {
            const d = linePath(toLocal(start), toLocal(end));
            pair.shadow.setAttribute("d", d);
            pair.line.setAttribute("d", d);
            pair.line.style.stroke = color;
        }

        function portClass(port) {
            return `has-node-input-${port}`;
        }

        function makeInputMarker(port) {
            const marker = document.createElement("span");
            marker.className = `node-input-marker node-input-marker--${port}`;
            marker.setAttribute("aria-hidden", "true");
            container.appendChild(marker);
            return marker;
        }

        function makeOutputMarker() {
            const marker = document.createElement("span");
            marker.className = "node-output-marker";
            marker.setAttribute("aria-hidden", "true");
            container.appendChild(marker);
            return marker;
        }

        function updateMarker(marker, node, port) {
            const layout = inputLayoutForNode(node);
            const side = layout[port] || inputDefaultSides[port] || "left";
            const point = inputPointForSide(node, side);
            marker.className = `node-input-marker node-input-marker--${port} node-input-marker--side-${side}`;
            marker.style.setProperty("--node-marker-color", portColor(port));
            const local = toLocal(point);
            marker.style.transform = `translate(${local.x - 4}px, ${local.y - 4}px)`;
        }

        function updateOutputMarker(marker, node) {
            const local = toLocal(outputPoint(node));
            marker.style.transform = `translate(${local.x - 4}px, ${local.y - 4}px)`;
        }

        function syncConnectedPortClasses() {
            document.querySelectorAll(nodeSelector).forEach((node) => {
                inputPortNames.forEach((port) => node.classList.remove(portClass(port)));
                node.classList.remove("has-node-input-dynamic");
                node.classList.remove("has-node-output-dynamic");
            });

            const connectedTargets = new Set();
            const connectedSources = new Set();
            connections.forEach((connection) => {
                connectedTargets.add(connection.target);
                connectedSources.add(connection.source);
            });

            nodeInputMarkers.forEach((markers, node) => {
                if (connectedTargets.has(node) && document.body.contains(node)) return;
                markers.forEach((marker) => marker.remove());
                nodeInputMarkers.delete(node);
            });

            connectedTargets.forEach((node) => {
                if (!document.body.contains(node)) return;

                node.classList.add("has-node-input-dynamic");
                let markers = nodeInputMarkers.get(node);
                if (!markers) {
                    markers = new Map();
                    nodeInputMarkers.set(node, markers);
                }

                inputPortNames.forEach((port) => {
                    let marker = markers.get(port);
                    if (!marker) {
                        marker = makeInputMarker(port);
                        markers.set(port, marker);
                    }
                    updateMarker(marker, node, port);
                });
            });

            nodeOutputMarkers.forEach((marker, node) => {
                if (connectedSources.has(node) && document.body.contains(node)) return;
                marker.remove();
                nodeOutputMarkers.delete(node);
            });

            connectedSources.forEach((node) => {
                if (!document.body.contains(node)) return;

                node.classList.add("has-node-output-dynamic");
                let marker = nodeOutputMarkers.get(node);
                if (!marker) {
                    marker = makeOutputMarker();
                    nodeOutputMarkers.set(node, marker);
                }
                updateOutputMarker(marker, node);
            });
        }

        function outputHitDistance(event, node) {
            const side = outputSideForNode(node);
            const point = outputPointForSide(node, side);
            const rect = nodeRect(node);

            if (side === "right" && event.clientX < rect.right - 2) return null;
            if (side === "left" && event.clientX > rect.left + 2) return null;
            if (side === "top" && event.clientY > rect.top + 2) return null;
            if (side === "bottom" && event.clientY < rect.bottom - 2) return null;

            const dx = Math.abs(event.clientX - point.x);
            const dy = Math.abs(event.clientY - point.y);
            if (dx > 14 || dy > 14) return null;
            return dx * dx + dy * dy;
        }

        function isOutputGrab(event, node) {
            return outputHitDistance(event, node) !== null;
        }

        function inputPortHit(event, node, port) {
            const point = targetInputPoint(node, port);
            const dx = Math.abs(event.clientX - point.x);
            const dy = Math.abs(event.clientY - point.y);
            if (dx > 30 || dy > 26) return null;
            return dx * dx + dy * dy;
        }

        function connectedInputPortHit(event, node, port) {
            const point = targetInputPoint(node, port);
            const dx = Math.abs(event.clientX - point.x);
            const dy = Math.abs(event.clientY - point.y);
            if (dx > 14 || dy > 14) return null;
            return dx * dx + dy * dy;
        }

        function outputPortHit(event, node) {
            return outputHitDistance(event, node);
        }

        function findConnectedInput(event) {
            let best = null;

            for (let index = connections.length - 1; index >= 0; index -= 1) {
                const connection = connections[index];
                const distance = connectedInputPortHit(event, connection.target, connection.port);
                if (distance === null) continue;
                if (!best || distance < best.distance) best = { connection, index, distance };
            }

            return best;
        }

        function findTargetOutput(event, source) {
            let best = null;

            document.querySelectorAll(nodeSelector).forEach((node) => {
                if (node === source) return;
                const distance = outputPortHit(event, node);
                if (distance === null) return;
                if (!best || distance < best.distance) best = { node, distance };
            });

            return best;
        }

        function findOutputNode(event) {
            const directNode = event.target.closest ? event.target.closest(nodeSelector) : null;
            if (directNode && isOutputGrab(event, directNode)) return directNode;

            return Array.from(document.querySelectorAll(nodeSelector)).find((node) => isOutputGrab(event, node)) || null;
        }

        function findTargetPort(event, source) {
            let best = null;

            document.querySelectorAll(nodeSelector).forEach((node) => {
                if (node === source) return;
                inputPortNames.forEach((port) => {
                    const distance = inputPortHit(event, node, port);
                    if (distance === null) return;
                    if (!best || distance < best.distance) best = { node, port, distance };
                });
            });

            return best;
        }

        function startNodeDrag(event) {
            const node = event.target.closest ? event.target.closest(nodeSelector) : null;
            if (!node) return false;

            if (!selectedNodes.has(node)) {
                setSelectedNodes([node]);
            }

            const dragNodes = Array.from(selectedNodes);
            const nodeItems = dragNodes.map((dragNode) => ({
                node: dragNode,
                baseX: parseFloat(dragNode.dataset.nodeX || "0") || 0,
                baseY: parseFloat(dragNode.dataset.nodeY || "0") || 0,
                startRect: nodeRect(dragNode),
            }));
            const groupRect = unionRects(nodeItems.map((item) => item.startRect));

            nodeDrag = {
                node,
                nodes: nodeItems,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                groupRect,
                moved: false,
                over: null,
            };
            node.setPointerCapture?.(event.pointerId);
            return true;
        }

        function moveNodeDrag(event) {
            if (!nodeDrag) return false;

            const dx = event.clientX - nodeDrag.startX;
            const dy = event.clientY - nodeDrag.startY;
            if (!nodeDrag.moved && Math.hypot(dx, dy) < 4) return true;

            nodeDrag.moved = true;
            nodeDrag.nodes.forEach((item) => item.node.classList.add("is-node-dragging"));
            document.body.classList.add("node-drag-active");
            suppressClickUntil = Date.now() + 900;

            const bounds = dragBounds();
            const boundedDx = clamp(dx, bounds.left - nodeDrag.groupRect.left, Math.max(bounds.left - nodeDrag.groupRect.left, bounds.right - nodeDrag.groupRect.right));
            const boundedDy = clamp(dy, bounds.top - nodeDrag.groupRect.top, Math.max(bounds.top - nodeDrag.groupRect.top, bounds.bottom - nodeDrag.groupRect.bottom));
            nodeDrag.nodes.forEach((item) => {
                const nextX = item.baseX + boundedDx;
                const nextY = item.baseY + boundedDy;
                item.node.dataset.nodeX = String(nextX);
                item.node.dataset.nodeY = String(nextY);
                item.node.style.setProperty("--node-x", `${nextX}px`);
                item.node.style.setProperty("--node-y", `${nextY}px`);
            });
            if (nodeDrag.nodes.length === 1) { // a node held over another lights it: dropped there, they merge
                const over = dropTarget(nodeDrag.node);
                if (over !== nodeDrag.over) {
                    nodeDrag.over?.classList.remove("is-node-target");
                    nodeDrag.over = over;
                    over?.classList.add("is-node-target");
                }
            }
            updateConnections();
            return true;
        }

        function endNodeDrag(event) {
            if (!nodeDrag) return false;

            const didMove = nodeDrag.moved;
            const drop = event && didMove && nodeDrag.over ? { item: nodeDrag.nodes[0], target: nodeDrag.over } : null; // not on a cancel
            nodeDrag.over?.classList.remove("is-node-target");
            nodeDrag.nodes.forEach((item) => item.node.classList.remove("is-node-dragging"));
            document.body.classList.remove("node-drag-active");
            nodeDrag = null;

            if (didMove) {
                suppressClickUntil = Date.now() + 900;
                event?.preventDefault?.();
                event?.stopPropagation?.();
            }
            if (drop) mergeOnDrop(drop.item, drop.target);
            updateConnections();
            return didMove;
        }

        // Two nodes dropped on top of each other merge, as one node's output dropped on another's does (owner, 2026-10-15:
        // "the thing that activates the Easter egg is the user getting a merge node by merging two nodes on top of each
        // other"): the node under the dragged one, if they overlap by at least a third of the smaller, takes it.
        function dropTarget(node) {
            const rect = nodeRect(node);
            let best = null;
            let bestShare = 0;
            document.querySelectorAll(nodeSelector).forEach((other) => {
                if (other === node) return;
                const r = nodeRect(other);
                const w = Math.min(rect.right, r.right) - Math.max(rect.left, r.left);
                const h = Math.min(rect.bottom, r.bottom) - Math.max(rect.top, r.top);
                if (w <= 0 || h <= 0) return;
                const share = (w * h) / Math.min(rect.width * rect.height, r.width * r.height);
                if (share >= 0.33 && share > bestShare) {
                    best = other;
                    bestShare = share;
                }
            });
            return best;
        }

        // The dropped node glides back to where it was picked up while a Merge node takes both: the dropped one as its
        // foreground, the one under it as its background.
        function mergeOnDrop(item, target) {
            const node = item.node;
            const fromX = parseFloat(node.dataset.nodeX || "0") || 0;
            const fromY = parseFloat(node.dataset.nodeY || "0") || 0;
            const place = (x, y) => {
                node.dataset.nodeX = String(x);
                node.dataset.nodeY = String(y);
                node.style.setProperty("--node-x", `${x}px`);
                node.style.setProperty("--node-y", `${y}px`);
            };
            place(item.baseX, item.baseY); // where it goes back to, so the Merge node is placed under it
            createMergeFromOutputConnection(node, target, makePathPair());
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
            place(fromX, fromY); // then the glide back, from where it was dropped, before the next paint
            const start = performance.now();
            const step = (now) => {
                if (disposed || nodeDrag) return;
                const t = Math.min(1, (now - start) / 240);
                const eased = 1 - (1 - t) ** 3;
                place(fromX + (item.baseX - fromX) * eased, fromY + (item.baseY - fromY) * eased);
                updateConnections();
                if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }

        function clearTarget() {
            if (targetPort) targetPort.node.classList.remove("is-node-target");
            if (targetOutput) targetOutput.node.classList.remove("is-node-target");
            targetPort = null;
            targetOutput = null;
        }

        // Where nodes may go (owner, 2026-10-15: "make it so that the nodes cannot go outside the nodes area"): inside the
        // Node editor of the hero's ghost Fusion page (living-signal-grid.js), in viewport pixels; without it, between the
        // navigation and the products, 20px from the window's sides, as before.
        function dragBounds() {
            const host = window.clipyxSmoke;
            const area = host && host.hero && typeof host.nodeArea === "function" ? host.nodeArea() : null;
            if (area) {
                const hero = host.hero.getBoundingClientRect();
                return { left: hero.left + area.left, right: hero.left + area.right, top: hero.top + area.top, bottom: hero.top + area.bottom };
            }
            const navbar = document.querySelector(".navbar");
            const productsSection = document.getElementById("products");
            return {
                left: 20,
                right: window.innerWidth - 20,
                top: navbar ? navbar.getBoundingClientRect().bottom + 20 : 20,
                bottom: productsSection ? productsSection.getBoundingClientRect().top - 24 : window.innerHeight - 20,
            };
        }

        function setNodeViewportPosition(node, left, top) {
            const bounds = dragBounds();
            const boundedLeft = clamp(left, bounds.left, Math.max(bounds.left, bounds.right - node.offsetWidth));
            const boundedTop = clamp(top, bounds.top, Math.max(bounds.top, bounds.bottom - node.offsetHeight));
            const parent = node.offsetParent;
            const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0 };
            const nextX = boundedLeft - parentRect.left - node.offsetLeft;
            const nextY = boundedTop - parentRect.top - node.offsetTop;

            node.dataset.nodeX = String(nextX);
            node.dataset.nodeY = String(nextY);
            node.style.setProperty("--node-x", `${nextX}px`);
            node.style.setProperty("--node-y", `${nextY}px`);
        }

        function createMergeNode(source, target) {
            const group = document.querySelector(".hero-button-group");
            if (!group) return null;

            mergeCount += 1;
            const node = document.createElement("button");
            const label = document.createElement("span");
            node.type = "button";
            node.className = "btn hero-merge-node";
            node.dataset.nodeId = `merge-${mergeCount}`;
            label.textContent = `Merge${mergeCount}`;
            label.style.pointerEvents = "none";
            node.appendChild(label);
            group.appendChild(node);
            initializeNode(node);
            resizeWatch?.observe(node);

            const sourceRect = nodeRect(source);
            const desiredLeft = sourceRect.left;
            const desiredTop = sourceRect.bottom + 54;
            setNodeViewportPosition(node, desiredLeft, desiredTop);

            return node;
        }

        function createMergeFromOutputConnection(source, target, sourcePair) {
            const mergeNode = createMergeNode(source, target);
            if (!mergeNode) {
                sourcePair.group.remove();
                return;
            }

            connections.push({ source, target: mergeNode, port: "top", pair: sourcePair });
            connections.push({ source: target, target: mergeNode, port: "left", pair: makePathPair() });
            setSelectedNodes([mergeNode]);
            updateConnections();
            celebrateMerge(mergeNode);
        }

        // A new Merge node starts the hero's easter egg (living-signal-grid.js): its ghost Fusion page lights up from the
        // Merge node and the curve plays the Library's expressions; the page stays lit until the last Merge node is
        // deleted (Delete or Backspace with it selected).
        function celebrateMerge(mergeNode) {
            const host = window.clipyxSmoke;
            if (!host || typeof host.easterEgg !== "function" || !host.hero) return;
            const hero = host.hero.getBoundingClientRect();
            const rect = nodeRect(mergeNode);
            host.easterEgg({ x: (rect.left + rect.right) / 2 - hero.left, y: (rect.top + rect.bottom) / 2 - hero.top });
        }

        function addConnection(source, target, port, pair) {
            const connection = { source, target, port, pair };
            connections.push(connection);
            setPair(pair, connectedOutputPoint(connection), targetInputAnchorPoint(target, port), portColor(port));
            updateConnections();
        }

        function updateConnections() {
            if (disposed || !desktopControls.matches) return;
            for (let index = connections.length - 1; index >= 0; index -= 1) {
                const connection = connections[index];
                if (!document.body.contains(connection.source) || !document.body.contains(connection.target)) {
                    connection.pair.group.remove();
                    connections.splice(index, 1);
                    continue;
                }
                setPair(connection.pair, connectedOutputPoint(connection), connectedInputPoint(connection), portColor(connection.port));
            }
            syncConnectedPortClasses();
        }

        function removeConnectionsForNode(node) {
            for (let index = connections.length - 1; index >= 0; index -= 1) {
                const connection = connections[index];
                if (connection.source !== node && connection.target !== node) continue;

                connection.pair.group.remove();
                connections.splice(index, 1);
            }
        }

        function deleteSelectedMergeNodes() {
            const mergeNodes = Array.from(selectedNodes).filter((node) => node.classList.contains("hero-merge-node"));
            if (mergeNodes.length === 0) return false;

            mergeNodes.forEach((node) => {
                removeConnectionsForNode(node);
                nodeInputMarkers.get(node)?.forEach((marker) => marker.remove());
                nodeInputMarkers.delete(node);
                nodeOutputMarkers.get(node)?.remove();
                nodeOutputMarkers.delete(node);
                selectedNodes.delete(node);
                node.remove();
            });
            setSelectedNodes(Array.from(selectedNodes));
            updateConnections();
            suppressClickUntil = Date.now() + 300;
            // the last Merge node gone: the hero's Fusion page closes (it stays lit while one is there)
            if (!document.querySelector(".hero-button-group .hero-merge-node")) window.clipyxSmoke?.endEasterEgg?.();
            return true;
        }

        function isEditableTarget(target) {
            if (!(target instanceof Element)) return false;
            if (target.closest("input, textarea, select, [contenteditable='true']")) return true;
            return false;
        }

        document.addEventListener("pointerdown", (event) => {
            if (!desktopControls.matches || event.pointerType !== "mouse") return;
            if (event.button !== 0) return;

            const connectedInput = findConnectedInput(event);
            if (connectedInput) {
                event.preventDefault();
                event.stopPropagation();

                const { connection, index } = connectedInput;
                const sourceSide = outputSideForNode(connection.source);
                connections.splice(index, 1);
                syncConnectedPortClasses();

                active = { source: connection.source, pair: connection.pair, sourceSide };
                targetPort = { node: connection.target, port: connection.port, distance: 0 };
                suppressClickUntil = Date.now() + 900;
                document.body.classList.add("node-connection-active");
                connection.source.classList.add("is-node-connecting");
                const end = targetInputAnchorPoint(connection.target, connection.port);
                setPair(connection.pair, activeOutputPoint(connection.source, active.sourceSide), end, portColor(connection.port));
                return;
            }

            const node = findOutputNode(event);
            if (!node) {
                if (!startNodeDrag(event)) startBoxSelect(event);
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            node.setPointerCapture?.(event.pointerId);

            const pair = makePathPair();
            active = { source: node, pair, sourceSide: outputSideForNode(node) };
            suppressClickUntil = Date.now() + 450;
            document.body.classList.add("node-connection-active");
            node.classList.add("is-node-connecting");
            setPair(pair, activeOutputPoint(node, active.sourceSide), { x: event.clientX, y: event.clientY });
        }, captureOptions);

        document.addEventListener("pointermove", (event) => {
            if (!active && boxSelect) {
                updateSelectionBox(event);
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if (!active && nodeDrag) {
                if (moveNodeDrag(event) && nodeDrag?.moved) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                return;
            }

            if (!active) return;

            const nextTargetOutput = findTargetOutput(event, active.source);
            const nextTarget = nextTargetOutput ? null : findTargetPort(event, active.source);
            const targetChanged = !targetPort || !nextTarget || targetPort.node !== nextTarget.node || targetPort.port !== nextTarget.port;
            const outputTargetChanged = !targetOutput || !nextTargetOutput || targetOutput.node !== nextTargetOutput.node;
            if (targetChanged) {
                if (targetPort) targetPort.node.classList.remove("is-node-target");
                targetPort = nextTarget;
                if (targetPort) targetPort.node.classList.add("is-node-target");
            }

            if (outputTargetChanged) {
                if (targetOutput) targetOutput.node.classList.remove("is-node-target");
                targetOutput = nextTargetOutput;
                if (targetOutput) targetOutput.node.classList.add("is-node-target");
            }

            const end = targetOutput
                ? outputAnchorPoint(targetOutput.node)
                : (targetPort ? targetInputAnchorPoint(targetPort.node, targetPort.port) : { x: event.clientX, y: event.clientY });
            setPair(active.pair, activeOutputPoint(active.source, active.sourceSide), end, targetPort ? portColor(targetPort.port) : "var(--node-link)");
        }, captureOptions);

        document.addEventListener("pointerup", (event) => {
            if (!active && boxSelect) {
                endBoxSelect(event);
                return;
            }

            if (!active && nodeDrag) {
                endNodeDrag(event);
                return;
            }

            if (!active) return;

            event.preventDefault();
            event.stopPropagation();

            const source = active.source;
            source.classList.remove("is-node-connecting");
            document.body.classList.remove("node-connection-active");
            suppressClickUntil = Date.now() + 900;

            if (targetOutput) {
                createMergeFromOutputConnection(source, targetOutput.node, active.pair);
            } else if (targetPort) {
                const connection = { source, target: targetPort.node, port: targetPort.port, pair: active.pair };
                connections.push(connection);
                setPair(active.pair, connectedOutputPoint(connection), targetInputAnchorPoint(targetPort.node, targetPort.port), portColor(targetPort.port));
            } else {
                active.pair.group.remove();
            }

            clearTarget();
            active = null;
            updateConnections();
        }, captureOptions);

        document.addEventListener("pointercancel", () => {
            if (!active && boxSelect) {
                endBoxSelect();
                return;
            }

            if (!active && nodeDrag) {
                endNodeDrag();
                return;
            }

            if (!active) return;
            suppressClickUntil = Date.now() + 900;
            active.source.classList.remove("is-node-connecting");
            active.pair.group.remove();
            document.body.classList.remove("node-connection-active");
            clearTarget();
            active = null;
        }, captureOptions);

        document.addEventListener("click", (event) => {
            if (Date.now() > suppressClickUntil) return;
            event.preventDefault();
            event.stopPropagation();
        }, captureOptions);

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Delete" && event.key !== "Backspace") return;
            if (isEditableTarget(event.target)) return;
            if (!deleteSelectedMergeNodes()) return;

            event.preventDefault();
            event.stopPropagation();
        }, captureOptions);

        window.addEventListener("resize", updateConnections, { signal: events.signal });
        // No scroll handler: the wires and markers scroll with the hero. A size change (the web font arriving, a resized
        // window, a new merge node) redraws them before the next paint.
        if ("ResizeObserver" in window) {
            resizeWatch = new ResizeObserver(() => updateConnections());
            resizeWatch.observe(container);
            document.querySelectorAll(nodeSelector).forEach((node) => resizeWatch.observe(node));
        }

        const youtubeNode = document.querySelector('.hero-button-group .btn[data-node-id="youtube"]');
        const discordNode = document.querySelector('.hero-button-group .btn[data-node-id="discord"]');
        if (youtubeNode && discordNode) {
            addConnection(youtubeNode, discordNode, "left", makePathPair());
            requestAnimationFrame(updateConnections);
            window.addEventListener("load", updateConnections, { once: true, signal: events.signal });
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(updateConnections).catch(() => {});
            }
        } else {
            updateConnections();
        }
        // theme.css hides the nodes until this point, so they appear together with their wires and port markers.
        document.querySelector(".hero-button-group")?.setAttribute("data-nodes-ready", "");

        return () => {
            disposed = true;
            events.abort();
            resizeWatch?.disconnect();
            if (nodeDrag?.node.hasPointerCapture?.(nodeDrag.pointerId)) nodeDrag.node.releasePointerCapture(nodeDrag.pointerId);
            boxSelect?.box.remove();
            layer?.remove();
            nodeInputMarkers.forEach(markers => markers.forEach(marker => marker.remove()));
            nodeOutputMarkers.forEach(marker => marker.remove());
            document.querySelectorAll(".hero-button-group .hero-merge-node").forEach(node => node.remove());
            window.clipyxSmoke?.endEasterEgg?.(); // no Merge node left
            originalNodes.forEach(node => {
                Array.from(node.classList).filter(name => /^(is-node-|has-node-)/.test(name)).forEach(name => node.classList.remove(name));
                node.removeAttribute("draggable");
            });
            document.body.classList.remove("node-drag-active", "node-connection-active");
        };
    }

    function initResponsiveHeroControls() {
        const group = document.querySelector(".hero-button-group");
        if (!group) return;
        let cleanup = null;
        function update() {
            cleanup?.();
            cleanup = null;
            group.dataset.heroControls = desktopControls.matches ? "nodes" : "buttons";
            if (desktopControls.matches) cleanup = initNodeConnections();
        }
        desktopControls.addEventListener("change", update);
        update();
    }

    function initSecurityEnhancements() {
        document.querySelectorAll("form[data-confirm]").forEach((form) => {
            form.addEventListener("submit", (event) => {
                const message = form.getAttribute("data-confirm") || "Continue?";
                if (!window.confirm(message)) {
                    event.preventDefault();
                }
            });
        });

        document.querySelectorAll("select[data-autosubmit]").forEach((select) => {
            select.addEventListener("change", () => {
                if (select.form) {
                    select.form.submit();
                }
            });
        });

        document.querySelectorAll("[data-prevent-contextmenu]").forEach((element) => {
            element.addEventListener("contextmenu", (event) => event.preventDefault());
        });
    }

    function initContactForms() {
        document.querySelectorAll("form[data-contact-form]").forEach((form) => {
            const status = form.querySelector("[data-contact-status]");
            const submitButton = form.querySelector("button[type='submit']");
            if (!status || !window.fetch || !window.FormData) return;

            function setContactStatus(message, type) {
                status.textContent = message;
                status.className = `contact-form-status is-${type}`;
            }

            form.addEventListener("submit", async (event) => {
                event.preventDefault();

                const formData = new FormData(form);
                setContactStatus("Sending your message...", "pending");
                if (submitButton) submitButton.disabled = true;

                try {
                    const response = await fetch(form.action || "/contact-submit", {
                        method: "POST",
                        body: formData,
                        headers: {
                            "X-Requested-With": "XMLHttpRequest",
                            "X-CSRF-Token": String(formData.get("csrf_token") || ""),
                            "Accept": "application/json",
                        },
                        credentials: "same-origin",
                    });
                    const payload = await response.json().catch(() => ({}));
                    const message = payload.message || (response.ok ? "Thanks, your message was sent." : "Your message was not sent. Please try again.");
                    setContactStatus(message, response.ok && payload.success !== false ? "success" : "error");
                    if (response.ok && payload.success !== false) {
                        form.reset();
                    }
                } catch (error) {
                    setContactStatus("Network error. Try again.", "error");
                } finally {
                    if (submitButton) submitButton.disabled = false;
                }
            });
        });
    }

    function initContactAnchorFeedback() {
        const contactSection = document.getElementById("contact");
        if (!contactSection) return;

        let pulseTimer = 0;
        document.querySelectorAll('a[href="#contact"]').forEach((link) => {
            link.addEventListener("click", () => {
                window.setTimeout(() => {
                    contactSection.classList.remove("is-contact-pulse");
                    void contactSection.offsetWidth;
                    contactSection.classList.add("is-contact-pulse");
                    window.clearTimeout(pulseTimer);
                    pulseTimer = window.setTimeout(() => {
                        contactSection.classList.remove("is-contact-pulse");
                    }, 1100);
                }, 80);
            });
        });
    }

    function initReplyToggles() {
        document.querySelectorAll("[data-reply-toggle]").forEach((button) => {
            button.addEventListener("click", () => {
                const formId = button.getAttribute("data-reply-toggle");
                const replyForm = formId ? document.getElementById(formId) : null;
                if (!replyForm) return;

                replyForm.hidden = !replyForm.hidden;
                if (!replyForm.hidden) {
                    replyForm.querySelector("textarea")?.focus();
                }
            });
        });
    }

    function initPresetEndorsement() {
        const endorseForm = document.querySelector("[data-endorse-form]");
        if (!endorseForm) return;

        const button = endorseForm.querySelector("[data-endorse-button]");
        const label = endorseForm.querySelector("[data-endorse-label]");
        const count = document.querySelector("[data-endorse-count]");
        const redirectTarget = endorseForm.getAttribute("data-redirect-target") || window.location.pathname + window.location.search;
        const endorseEndpoint = endorseForm.getAttribute("data-endorse-endpoint") || endorseForm.action;
        let isRequestInFlight = false;

        if (!button) return;

        if (button.dataset.loginRequired === "true") {
            button.addEventListener("click", () => {
                window.location.href = "/login?redirect=" + encodeURIComponent(redirectTarget);
            });
            return;
        }

        endorseForm.addEventListener("submit", (event) => {
            event.preventDefault();
            if (isRequestInFlight) return;

            function readCount() {
                if (!count) return 0;
                const parsedCount = parseInt(count.textContent, 10);
                return Number.isFinite(parsedCount) ? parsedCount : 0;
            }

            function applyEndorseState(endorsed, likesCount) {
                button.classList.toggle("is-endorsed", !!endorsed);
                button.setAttribute("aria-pressed", endorsed ? "true" : "false");
                if (label) label.textContent = endorsed ? "Endorsed" : "Endorse";
                if (count) count.textContent = Math.max(0, likesCount);
            }

            const formData = new FormData(endorseForm);
            const previousEndorsed = button.classList.contains("is-endorsed");
            const previousCount = readCount();
            const nextEndorsed = !previousEndorsed;
            const nextCount = previousCount + (nextEndorsed ? 1 : -1);

            isRequestInFlight = true;
            button.classList.add("is-pending");
            applyEndorseState(nextEndorsed, nextCount);

            fetch(endorseEndpoint, {
                method: "POST",
                body: formData,
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-Token": String(formData.get("csrf_token") || ""),
                    "Accept": "application/json",
                },
                credentials: "same-origin",
            })
                .then((response) => {
                    if (response.redirected && response.url) {
                        return { response, payload: { redirectTo: response.url } };
                    }

                    return response.text().then((text) => {
                        const contentType = (response.headers.get("content-type") || "").toLowerCase();
                        const trimmedText = text.trim();
                        let payload = null;

                        if (contentType.includes("application/json") || (trimmedText.startsWith("{") && trimmedText.endsWith("}"))) {
                            try {
                                payload = JSON.parse(trimmedText);
                            } catch (error) {
                                payload = null;
                            }
                        }

                        if (response.status === 401 && !payload) {
                            payload = { success: false, message: "Please log in to endorse presets." };
                        }

                        return { response, payload };
                    });
                })
                .then(({ response, payload }) => {
                    if (payload && payload.redirectTo) {
                        window.location.href = payload.redirectTo;
                        return;
                    }

                    if (response.status === 401) {
                        window.location.href = (payload && payload.login_url) || "/login?redirect=" + encodeURIComponent(redirectTarget);
                        return;
                    }

                    if (!response.ok || !payload || payload.success !== true) {
                        throw new Error((payload && payload.message) || "Could not update endorsement.");
                    }

                    applyEndorseState(!!payload.endorsed, Number(payload.likes || 0));
                })
                .catch((error) => {
                    applyEndorseState(previousEndorsed, previousCount);
                    window.alert(error.message || "Could not update the endorsement right now.");
                })
                .finally(() => {
                    isRequestInFlight = false;
                    button.classList.remove("is-pending");
                });
        });
    }

    function initProfileActions() {
        const avatarInput = document.getElementById("avatar_file");
        const avatarForm = document.getElementById("profileAvatarForm");
        const editNameButton = document.getElementById("profileNameEdit");
        const nameForm = document.getElementById("profileNameForm");
        const editPasswordButton = document.getElementById("profilePasswordEdit");
        const passwordForm = document.getElementById("profilePasswordForm");

        avatarInput?.addEventListener("change", () => {
            if (avatarInput.files && avatarInput.files.length > 0) avatarForm?.submit();
        });

        editNameButton?.addEventListener("click", () => {
            nameForm?.classList.toggle("is-open");
            editNameButton.setAttribute("aria-expanded", nameForm?.classList.contains("is-open") ? "true" : "false");
            if (nameForm?.classList.contains("is-open")) {
                passwordForm?.classList.remove("is-open");
                editPasswordButton?.setAttribute("aria-expanded", "false");
            }
            if (nameForm?.classList.contains("is-open")) {
                document.getElementById("username")?.focus();
            }
        });

        editPasswordButton?.addEventListener("click", () => {
            passwordForm?.classList.toggle("is-open");
            editPasswordButton.setAttribute("aria-expanded", passwordForm?.classList.contains("is-open") ? "true" : "false");
            if (passwordForm?.classList.contains("is-open")) {
                nameForm?.classList.remove("is-open");
                editNameButton?.setAttribute("aria-expanded", "false");
                document.getElementById("current_password")?.focus();
            }
        });
    }

    function initUploadFileLabels() {
        const presetInput = document.getElementById("preset_file");
        const secondaryPresetInput = document.getElementById("secondary_preset_file");
        const thumbnailInput = document.getElementById("thumbnail_file");
        const uploadForm = document.querySelector("[data-upload-form]");
        const uploadError = document.querySelector("[data-upload-error]");
        const presetDropZone = document.getElementById("drop-zone");
        const thumbnailDropZone = document.getElementById("drop-zone-img");
        const descriptionInput = document.getElementById("description");
        const categoryInput = document.getElementById("category");
        const uploadFilesBox = document.querySelector("[data-upload-files-box]");
        const uploadFileList = document.querySelector("[data-upload-file-list]");
        const primaryFileTrigger = document.querySelector("[data-primary-file-trigger]");
        const primaryFileRow = document.querySelector("[data-primary-file-row]");
        const secondaryFileRow = document.querySelector("[data-secondary-file-row]");
        const secondaryFileTrigger = document.querySelector("[data-secondary-file-trigger]");
        const primaryFileRemove = document.querySelector("[data-remove-primary-file]");
        const secondaryFileRemove = document.querySelector("[data-remove-secondary-file]");
        const standardInstallExtensions = new Set(["setting", "drfx", "fuse", "py", "lua"]);

        document.querySelectorAll("[data-select-field]").forEach((field) => {
            const select = field.querySelector("select");
            field.addEventListener("pointerdown", (event) => {
                if (!select || typeof select.showPicker !== "function") return;
                event.preventDefault();
                select.focus();
                select.showPicker();
            });
        });

        function bytesLabel(bytes) {
            const mb = bytes / (1024 * 1024);
            return `${mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
        }

        function showUploadError(message, target) {
            if (uploadError) {
                uploadError.textContent = message;
                uploadError.classList.add("is-visible");
                uploadError.scrollIntoView({ block: "center", behavior: "smooth" });
            } else {
                window.alert(message);
            }

            presetDropZone?.classList.toggle("is-error", target === presetInput || target === secondaryPresetInput);
            thumbnailDropZone?.classList.toggle("is-error", target === thumbnailInput);
        }

        function clearUploadError(target) {
            if (uploadError) {
                uploadError.textContent = "";
                uploadError.classList.remove("is-visible");
            }

            if (!target || target === presetInput) presetDropZone?.classList.remove("is-error");
            if (!target || target === secondaryPresetInput) presetDropZone?.classList.remove("is-error");
            if (!target || target === thumbnailInput) thumbnailDropZone?.classList.remove("is-error");
        }

        function fileExtension(file) {
            const name = String(file?.name || "");
            const dot = name.lastIndexOf(".");
            return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
        }

        function updateUploadFilesUi() {
            const primaryFile = presetInput?.files?.[0] || null;
            const secondaryFile = secondaryPresetInput?.files?.[0] || null;
            const primaryName = document.getElementById("file-name");
            const secondaryName = document.getElementById("secondary-file-name");

            uploadFilesBox?.classList.toggle("has-primary", Boolean(primaryFile));
            if (uploadFileList) uploadFileList.hidden = !primaryFile;
            if (primaryFileRow) primaryFileRow.hidden = !primaryFile;
            if (secondaryFileRow) secondaryFileRow.hidden = !secondaryFile;
            if (secondaryFileTrigger) secondaryFileTrigger.hidden = !primaryFile || Boolean(secondaryFile);
            if (primaryFileRemove) primaryFileRemove.hidden = !primaryFile;
            if (secondaryFileRemove) secondaryFileRemove.hidden = !secondaryFile;
            if (primaryName) primaryName.textContent = primaryFile ? primaryFile.name : "";
            if (secondaryName) secondaryName.textContent = secondaryFile ? secondaryFile.name : "";

            if (primaryFile) presetDropZone?.style.setProperty("border-color", "var(--accent)");
            if (!primaryFile) presetDropZone?.style.removeProperty("border-color");
        }

        function setFileInputFile(input, file) {
            if (!input || !file || typeof DataTransfer !== "function") return false;

            const transfer = new DataTransfer();
            transfer.items.add(file);
            input.files = transfer.files;
            return true;
        }

        primaryFileTrigger?.addEventListener("click", () => {
            presetInput?.click();
        });

        secondaryFileTrigger?.addEventListener("click", () => {
            secondaryPresetInput?.click();
        });

        presetInput?.addEventListener("change", (event) => {
            updateUploadFilesUi();
            clearUploadError(presetInput);
        });

        secondaryPresetInput?.addEventListener("change", (event) => {
            updateUploadFilesUi();
            clearUploadError(secondaryPresetInput);
        });

        primaryFileRemove?.addEventListener("click", () => {
            const secondaryFile = secondaryPresetInput?.files?.[0] || null;
            if (presetInput) presetInput.value = "";
            if (secondaryFile && setFileInputFile(presetInput, secondaryFile) && secondaryPresetInput) {
                secondaryPresetInput.value = "";
            }
            updateUploadFilesUi();
            clearUploadError();
            presetInput?.focus();
        });

        secondaryFileRemove?.addEventListener("click", () => {
            if (secondaryPresetInput) secondaryPresetInput.value = "";
            updateUploadFilesUi();
            clearUploadError(secondaryPresetInput);
            secondaryPresetInput?.focus();
        });

        updateUploadFilesUi();

        thumbnailInput?.addEventListener("change", (event) => {
            const file = event.target.files[0] || null;
            const fileName = file ? file.name : "";
            const label = document.getElementById("img-name");
            if (label) label.textContent = fileName ? "Attached: " + fileName : "";
            if (fileName) document.getElementById("drop-zone-img")?.style.setProperty("border-color", "var(--accent)");
            clearUploadError(thumbnailInput);

            const thumbnailMaxBytes = parseInt(uploadForm?.dataset.thumbnailMaxBytes || "0", 10) || 0;
            if (file && thumbnailMaxBytes > 0 && file.size > thumbnailMaxBytes) {
                showUploadError(`Thumbnail must be ${bytesLabel(thumbnailMaxBytes)} or smaller. Selected file is ${bytesLabel(file.size)}. You can skip the thumbnail or choose a smaller image.`, thumbnailInput);
                thumbnailInput.value = '';
                if (label) label.textContent = '';
                document.getElementById("drop-zone-img")?.style.removeProperty("border-color");
            }
        });

        uploadForm?.addEventListener("submit", (event) => {
            clearUploadError();

            const presetFile = presetInput?.files?.[0] || null;
            const secondaryPresetFile = secondaryPresetInput?.files?.[0] || null;
            const thumbnailFile = thumbnailInput?.files?.[0] || null;
            const presetMaxBytes = parseInt(uploadForm.dataset.presetMaxBytes || "0", 10) || 0;
            const thumbnailMaxBytes = parseInt(uploadForm.dataset.thumbnailMaxBytes || "0", 10) || 0;

            if (!presetFile) {
                event.preventDefault();
                showUploadError("Choose a preset file before initializing the upload.", presetInput);
                return;
            }

            if (presetMaxBytes > 0 && presetFile.size > presetMaxBytes) {
                event.preventDefault();
                showUploadError(`Preset file must be ${bytesLabel(presetMaxBytes)} or smaller. Selected file is ${bytesLabel(presetFile.size)}.`, presetInput);
                return;
            }

            if (secondaryPresetFile && presetMaxBytes > 0 && secondaryPresetFile.size > presetMaxBytes) {
                event.preventDefault();
                showUploadError(`Optional second file must be ${bytesLabel(presetMaxBytes)} or smaller. Selected file is ${bytesLabel(secondaryPresetFile.size)}.`, secondaryPresetInput);
                return;
            }

            if (String(categoryInput?.value || "") === "Expression" && !String(descriptionInput?.value || "").trim()) {
                event.preventDefault();
                showUploadError("Add a description explaining what this expression does and how to use it.", presetInput);
                descriptionInput?.focus();
                return;
            }

            if (!standardInstallExtensions.has(fileExtension(presetFile)) && !String(descriptionInput?.value || "").trim()) {
                event.preventDefault();
                showUploadError("Add a description for this file format explaining how to install it and what it does.", presetInput);
                descriptionInput?.focus();
                return;
            }

            if (thumbnailFile && thumbnailMaxBytes > 0 && thumbnailFile.size > thumbnailMaxBytes) {
                event.preventDefault();
                showUploadError(`Thumbnail must be ${bytesLabel(thumbnailMaxBytes)} or smaller. Selected file is ${bytesLabel(thumbnailFile.size)}.`, thumbnailInput);
            }
        });
    }

    function initYoutubeFacades() {
        document.querySelectorAll(".yt-facade").forEach((facade) => {
            const vidId = facade.getAttribute("data-vid");
            if (!vidId) return;

            const img = document.createElement("img");
            img.src = `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`;
            facade.appendChild(img);

            const playBtn = document.createElement("div");
            playBtn.className = "play-btn";
            playBtn.innerHTML = '<svg class="iconizo iconizo--menu" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="/assets/iconizo/iconizo-sprite.svg?v=1.0.0#iz-play"></use></svg>';
            facade.appendChild(playBtn);

            facade.addEventListener("click", function () {
                this.innerHTML = "";
                const iframe = document.createElement("iframe");
                iframe.src = `https://www.youtube.com/embed/${vidId}?autoplay=1`;
                iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
                iframe.setAttribute("allowfullscreen", "true");
                this.appendChild(iframe);
            });
        });
    }

    ready(() => {
        initSecurityEnhancements();
        initContactForms();
        initContactAnchorFeedback();
        initReplyToggles();
        initPresetEndorsement();
        initProfileActions();
        initUploadFileLabels();
        initYoutubeFacades();
        initSectionGridLines();
        initMobileMenu();
        initMagneticButtons();
        initResponsiveHeroControls();
    });
}());
