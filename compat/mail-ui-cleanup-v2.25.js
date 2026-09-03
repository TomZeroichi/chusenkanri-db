(() => {
  (() => {
    "use strict";
    const OLD_SETUP_TEXT = "\u521D\u56DE\u8A2D\u5B9A\u3092\u3059\u308B";
    const NEW_SETUP_TEXT = "\u30E1\u30FC\u30EB\u9023\u643A\u3092\u518D\u8A2D\u5B9A";
    const EVENT_RE = /(応募完了|当選|落選|購入完了|転送確認)/g;
    function normalize(text) {
      return String(text || "").replace(/\s+/g, " ").trim();
    }
    function isMailConnected() {
      var _a, _b;
      return normalize(((_a = document.body) == null ? void 0 : _a.innerText) || ((_b = document.body) == null ? void 0 : _b.textContent)).includes("\u9023\u643A\u6E08\u307F");
    }
    function renameSetupButton() {
      if (!isMailConnected()) return;
      for (const btn of document.querySelectorAll("button")) {
        const text = normalize(btn.textContent);
        if (text === OLD_SETUP_TEXT || text.includes(OLD_SETUP_TEXT)) {
          btn.textContent = NEW_SETUP_TEXT;
          btn.setAttribute("aria-label", NEW_SETUP_TEXT);
          btn.title = "Gmail\u306E\u8EE2\u9001\u8A2D\u5B9A\u3084\u9023\u643A\u5148\u3092\u518D\u78BA\u8A8D\u30FB\u518D\u8A2D\u5B9A\u3057\u307E\u3059";
        }
      }
    }
    function restorePreviouslyHidden() {
      for (const el of document.querySelectorAll('[data-tom-hidden-forwarding-history="1"]')) {
        el.style.removeProperty("display");
        delete el.dataset.tomHiddenForwardingHistory;
      }
    }
    function looksLikeForwarding(text) {
      const t = normalize(text);
      return /転送確認/.test(t) && /(Gmail\s*の転送の確認|Gmail転送確認|forwarding)/i.test(t);
    }
    function eventCount(text) {
      const m = normalize(text).match(EVENT_RE);
      return m ? m.length : 0;
    }
    function findSingleHistoryCard(leaf) {
      let node = leaf;
      for (let depth = 0; node && node !== document.body && depth < 8; depth++, node = node.parentElement) {
        const text = normalize(node.innerText || node.textContent);
        if (!looksLikeForwarding(text)) continue;
        if (eventCount(text) !== 1) continue;
        if (text.length < 18 || text.length > 500) continue;
        if (!(/\b\d{1,2}:\d{2}\b/.test(text) || /\b\d{1,2}\/\d{1,2}\b/.test(text))) continue;
        return node;
      }
      return null;
    }
    function hideForwardingVerificationHistory() {
      restorePreviouslyHidden();
      const leaves = [...document.querySelectorAll("body *")].filter((el) => {
        if (el.children.length) return false;
        return looksLikeForwarding(el.textContent);
      });
      const cards = /* @__PURE__ */ new Set();
      for (const leaf of leaves) {
        const card = findSingleHistoryCard(leaf);
        if (card) cards.add(card);
      }
      for (const card of cards) {
        card.style.display = "none";
        card.dataset.tomHiddenForwardingHistory = "1";
      }
    }
    function apply() {
      renameSetupButton();
      hideForwardingVerificationHistory();
    }
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        apply();
      });
    };
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    document.addEventListener("DOMContentLoaded", apply, { once: true });
    setTimeout(apply, 250);
    setTimeout(apply, 800);
    setTimeout(apply, 1800);
  })();
})();
