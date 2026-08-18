// ==UserScript==
// @name         Clean Novel Reader
// @namespace    https://github.com/Chargou/clean-novel-reader
// @version      1.0.1
// @description  Clean, consistent reading UI across supported novel websites.
// @match        https://novelphoenix.com/novel/*/*
// @match        https://novelfire.net/book/*/*
// @updateURL    https://raw.githubusercontent.com/Chargou/clean-novel-reader/main/dist/clean-novel-reader.user.js
// @downloadURL  https://raw.githubusercontent.com/Chargou/clean-novel-reader/main/dist/clean-novel-reader.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
    "sites": {
        "https://novelphoenix.com/novel/*": {
            "name": "NovelPhoenix",
            "alwaysHidden": [
                ".nf-ads",
                ".box-notification",
                ".box-notice",
                ".report-container",
                "footer"
            ],
            "topUI": [
                "header.main-header",
                "#chapter-article .titles",
                "#chapter-article .chapternav"
            ],
            "comments": [
                "#chapter-comments"
            ]
        },
        "https://novelfire.net/book/*": {
            "name": "NovelFire",
            "alwaysHidden": [
                ".nf-ads",
                ".box-notice",
                ".report-container",
                "#chapter-container > div:has(iframe)",
                "footer"
            ],
            "topUI": [
                "header.main-header",
                "#chapter-article .titles",
                "#chapter-article .chapternav",
                ".navbar-breadcrumb"
            ],
            "comments": [
                "#chapter-comments"
            ]
        }
    }
};
    const STORAGE_KEY = 'clean-novel-reader-state-v1';

    const state = { topUIHidden: false, commentsHidden: false };
    let controls = null;
    let chapterButton = null;
    let commentsButton = null;
    let lastScrollY = window.scrollY;
    let mutationTimer = null;

    function getSiteConfig() {
        const host = window.location.hostname.toLowerCase();

        for (const [siteURL, siteConfig] of Object.entries(CONFIG.sites || {})) {
            try {
                const url = new URL(siteURL);
                const siteHost = url.hostname.toLowerCase();
                if (host === siteHost || host.endsWith(`.${siteHost}`)) return siteConfig;
            } catch {}
        }
        return null;
    }

    const SITE = getSiteConfig();
    if (!SITE) return;

    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            if (typeof saved.topUIHidden === 'boolean') state.topUIHidden = saved.topUIHidden;
            if (typeof saved.commentsHidden === 'boolean') state.commentsHidden = saved.commentsHidden;
        } catch {}
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {}
    }

    function queryAll(selectors) {
        if (!Array.isArray(selectors)) return [];
        const elements = [];
        for (const selector of selectors) {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    if (!elements.includes(el)) elements.push(el);
                });
            } catch {}
        }
        return elements;
    }

    function getTopUIElements() {
        return queryAll(SITE.topUI);
    }

    function getCommentElements() {
        return queryAll(SITE.comments);
    }

    function applyAlwaysHidden() {
        queryAll(SITE.alwaysHidden).forEach(el => el.classList.add('cnr-always-hidden'));
    }

    function applyToggleState() {
        getTopUIElements().forEach(el =>
            el.classList.toggle('cnr-toggle-hidden', state.topUIHidden)
        );

        getCommentElements().forEach(el =>
            el.classList.toggle('cnr-toggle-hidden', state.commentsHidden)
        );

        updateButtonAppearance();
    }

    function toggleTopUI() {
        state.topUIHidden = !state.topUIHidden;
        saveState();
        applyToggleState();
    }

    function toggleComments() {
        state.commentsHidden = !state.commentsHidden;
        saveState();
        applyToggleState();
    }

    function createButton(icon, shortcut, title, handler) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cnr-button';
        button.textContent = icon;
        button.title = `${title} (${shortcut})`;
        button.setAttribute('aria-label', `${title} (${shortcut})`);

        const key = document.createElement('span');
        key.className = 'cnr-key';
        key.textContent = shortcut;
        button.appendChild(key);

        button.addEventListener('click', handler);
        return button;
    }

    function createControls() {
        controls = document.createElement('div');
        controls.id = 'clean-novel-reader-controls';

        chapterButton = createButton('📖', 'X', 'Toggle reading UI', toggleTopUI);
        commentsButton = createButton('💬', 'C', 'Toggle comments', toggleComments);

        controls.append(chapterButton, commentsButton);
        document.body.appendChild(controls);
        updateButtonAppearance();
    }

    function updateButtonAppearance() {
        if (!chapterButton || !commentsButton) return;

        chapterButton.classList.toggle('cnr-on', !state.topUIHidden);
        chapterButton.classList.toggle('cnr-off', state.topUIHidden);

        commentsButton.classList.toggle('cnr-on', !state.commentsHidden);
        commentsButton.classList.toggle('cnr-off', state.commentsHidden);
    }

    function handleScroll() {
        const currentScrollY = window.scrollY;
        if (currentScrollY < lastScrollY) {
            controls?.classList.add('cnr-visible');
        } else if (currentScrollY > lastScrollY) {
            controls?.classList.remove('cnr-visible');
        }
        lastScrollY = currentScrollY;
    }

    function isTypingTarget(target) {
        return target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement ||
            target?.isContentEditable;
    }

    function handleKeydown(event) {
        if (isTypingTarget(event.target) || event.ctrlKey || event.altKey || event.metaKey) return;

        const key = event.key.toLowerCase();
        if (key === 'x') {
            event.preventDefault();
            toggleTopUI();
        } else if (key === 'c') {
            event.preventDefault();
            toggleComments();
        }
    }

    function refresh() {
        applyAlwaysHidden();
        applyToggleState();
    }

    function observePage() {
        new MutationObserver(() => {
            clearTimeout(mutationTimer);
            mutationTimer = setTimeout(refresh, 50);
        }).observe(document.documentElement, { childList: true, subtree: true });
    }

    function injectCSS() {
        const style = document.createElement('style');
        style.textContent = `
            .cnr-always-hidden,
            .cnr-toggle-hidden { display: none !important; }

            #clean-novel-reader-controls {
                position: fixed;
                right: 18px;
                bottom: 18px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                z-index: 2147483647;
                opacity: 0;
                transform: translateY(18px);
                pointer-events: none;
                transition: opacity .2s ease, transform .2s ease;
            }

            #clean-novel-reader-controls.cnr-visible {
                opacity: 1;
                transform: translateY(0);
                pointer-events: auto;
            }

            .cnr-button {
                position: relative;
                width: 46px;
                height: 46px;
                padding: 0;
                margin: 0;
                border: 1px solid rgba(255,255,255,.25);
                border-radius: 50%;
                background: rgba(25,25,25,.72);
                color: white;
                font-size: 22px;
                line-height: 46px;
                text-align: center;
                cursor: pointer;
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                transition: opacity .2s ease, box-shadow .2s ease, transform .15s ease;
            }

            .cnr-button:hover { transform: scale(1.08); }
            .cnr-button:active { transform: scale(.94); }

            .cnr-button.cnr-on {
                opacity: .95;
                box-shadow: 0 0 7px rgba(255,255,255,.35), 0 0 18px rgba(255,255,255,.15);
            }

            .cnr-button.cnr-off {
                opacity: .42;
                box-shadow: none;
            }

            .cnr-key {
                position: absolute;
                right: -2px;
                bottom: -2px;
                min-width: 15px;
                height: 15px;
                padding: 0 3px;
                border-radius: 8px;
                background: rgba(0,0,0,.85);
                border: 1px solid rgba(255,255,255,.2);
                color: rgba(255,255,255,.85);
                font: 9px/15px monospace;
                text-align: center;
                pointer-events: none;
            }

            @media (max-width:600px) {
                #clean-novel-reader-controls { right:12px; bottom:12px; }
                .cnr-button { width:50px; height:50px; line-height:50px; font-size:24px; }
            }
        `;
        document.head.appendChild(style);
    }

    function init() {
        loadState();
        injectCSS();
        applyAlwaysHidden();
        createControls();
        applyToggleState();
        observePage();

        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('keydown', handleKeydown);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
