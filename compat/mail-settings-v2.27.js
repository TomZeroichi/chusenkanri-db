(() => {
  (() => {
    "use strict";
    const DOMAIN = "lottery.tomtradesystem.com";
    const STRIP_ID = "tom-mail-compact-v227";
    const MODAL_ID = "tom-settings-modal-v227";
    const STYLE_ID = "tom-mail-settings-style-v227";
    const ADDRESS_RE = new RegExp("[A-Za-z0-9._%+-]+@" + DOMAIN.replace(/\./g, "\\."), "i");
    const normalize = (v) => String(v || "").replace(/\s+/g, " ").trim();
    let connectedLatched = false;
    let rememberedAddress = "";
    let rememberedLast = "";
    let applying = false;
    function pageText() {
      var _a;
      return ((_a = document.body) == null ? void 0 : _a.textContent) || "";
    }
    function scanState() {
      const text = pageText();
      const m = text.match(ADDRESS_RE);
      if (m) rememberedAddress = m[0];
      const last = text.match(/最終受信\s*[:：]?\s*([^|｜]{3,32}?)(?=\s{2,}|$|設定|コピー|メール)/);
      if (last) rememberedLast = normalize(last[1]);
      if (rememberedAddress && /連携済み/.test(text)) connectedLatched = true;
      return connectedLatched;
    }
    function ensureStyles() {
      if (document.getElementById(STYLE_ID)) return;
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = "\n      #".concat(STRIP_ID, "{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;margin:10px 0;border:1px solid #dbe4ee;border-radius:12px;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.04);font-size:13px}\n      #").concat(STRIP_ID, " .tom-mail-status{display:flex;align-items:center;gap:8px;min-width:0;color:#334155;font-weight:700}\n      #").concat(STRIP_ID, " .tom-mail-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;flex:0 0 auto}\n      #").concat(STRIP_ID, " .tom-mail-last{font-weight:500;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n      #").concat(STRIP_ID, " button{border:1px solid #cbd5e1;background:#f8fafc;color:#334155;border-radius:9px;padding:7px 11px;font-weight:700;cursor:pointer;white-space:nowrap}\n      #").concat(MODAL_ID, "{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.42);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}\n      #").concat(MODAL_ID, " .tom-settings-sheet{width:min(460px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.28);padding:18px;box-sizing:border-box}\n      #").concat(MODAL_ID, " .tom-settings-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}\n      #").concat(MODAL_ID, " .tom-settings-title{font-size:19px;font-weight:800;color:#0f172a}\n      #").concat(MODAL_ID, " .tom-close{border:0;background:#f1f5f9;border-radius:9px;width:34px;height:34px;font-size:20px;cursor:pointer;color:#475569}\n      #").concat(MODAL_ID, " .tom-section-title{font-size:14px;font-weight:800;color:#334155;margin:4px 0 10px}\n      #").concat(MODAL_ID, " .tom-connected{display:inline-flex;align-items:center;gap:7px;background:#ecfdf5;color:#047857;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:800;margin-bottom:12px}\n      #").concat(MODAL_ID, " .tom-connected:before{content:'';width:7px;height:7px;border-radius:50%;background:#22c55e}\n      #").concat(MODAL_ID, " .tom-label{font-size:12px;color:#64748b;margin:10px 0 6px;font-weight:700}\n      #").concat(MODAL_ID, " .tom-address-row{display:flex;gap:8px;align-items:stretch}\n      #").concat(MODAL_ID, " .tom-address{flex:1;min-width:0;border:1px solid #dbe4ee;background:#f8fafc;border-radius:10px;padding:10px 11px;font:600 12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n      #").concat(MODAL_ID, " .tom-copy{border:0;background:#2563eb;color:#fff;border-radius:10px;padding:0 14px;font-weight:800;cursor:pointer}\n      #").concat(MODAL_ID, " .tom-meta{font-size:12px;color:#64748b;margin-top:8px}\n      #").concat(MODAL_ID, " .tom-actions{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}\n      #").concat(MODAL_ID, " .tom-actions button{flex:1;min-width:140px;border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:10px;padding:10px 12px;font-weight:800;cursor:pointer}\n      #").concat(MODAL_ID, " .tom-toast{height:18px;margin-top:8px;font-size:12px;color:#047857;font-weight:700}\n      @media(max-width:560px){#").concat(STRIP_ID, "{margin:8px 0;padding:9px 10px}#").concat(STRIP_ID, " .tom-mail-last{display:none}#").concat(MODAL_ID, "{align-items:flex-end;padding:0}#").concat(MODAL_ID, " .tom-settings-sheet{width:100%;max-height:84vh;border-radius:18px 18px 0 0;padding:18px 16px 22px}}\n    ");
      document.head.appendChild(s);
    }
    function findMailCard() {
      const address = rememberedAddress;
      if (!address) return null;
      const leaves = [...document.querySelectorAll("body *")].filter((el) => {
        if (el.closest("#" + STRIP_ID) || el.closest("#" + MODAL_ID)) return false;
        if (el.children.length) return false;
        return String(el.textContent || "").includes(address);
      });
      for (const leaf of leaves) {
        let node = leaf;
        for (let depth = 0; node && node !== document.body && depth < 9; depth++, node = node.parentElement) {
          if (node.id === STRIP_ID || node.id === MODAL_ID) continue;
          const text = normalize(node.textContent);
          if (!text.includes(address)) continue;
          if (!/(メール連携|専用メール|専用アドレス|連携済み)/.test(text)) continue;
          if (text.length > 2500) continue;
          const r = node.getBoundingClientRect();
          if (r.width > 220 && (r.height > 105 || text.length > 90)) return node;
        }
      }
      return null;
    }
    function copyFallback(text) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch (_) {
      }
      ta.remove();
    }
    async function copyText(text) {
      var _a;
      try {
        if ((_a = navigator.clipboard) == null ? void 0 : _a.writeText) await navigator.clipboard.writeText(text);
        else copyFallback(text);
        return true;
      } catch (_) {
        copyFallback(text);
        return true;
      }
    }
    function closeModal() {
      var _a;
      (_a = document.getElementById(MODAL_ID)) == null ? void 0 : _a.remove();
    }
    function openOriginalSetup() {
      const card = document.querySelector('[data-tom-mail-card-hidden="1"]') || findMailCard();
      if (!card) return;
      const trigger = [...card.querySelectorAll("button,a")].find((el) => /再設定|初回設定|設定をする|転送設定/.test(normalize(el.textContent)));
      closeModal();
      if (trigger) {
        try {
          trigger.click();
          return;
        } catch (_) {
        }
      }
    }
    function openSettings() {
      var _a, _b, _c;
      closeModal();
      const address = rememberedAddress;
      const last = rememberedLast;
      const overlay = document.createElement("div");
      overlay.id = MODAL_ID;
      overlay.innerHTML = '\n      <div class="tom-settings-sheet" role="dialog" aria-modal="true" aria-label="\u8A2D\u5B9A">\n        <div class="tom-settings-head"><div class="tom-settings-title">\u8A2D\u5B9A</div><button class="tom-close" type="button" aria-label="\u9589\u3058\u308B">\xD7</button></div>\n        <div class="tom-section-title">\u30E1\u30FC\u30EB\u9023\u643A</div>\n        <div class="tom-connected">\u9023\u643A\u6E08\u307F</div>\n        <div class="tom-label">\u5C02\u7528\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9</div>\n        <div class="tom-address-row"><div class="tom-address"></div><button class="tom-copy" type="button">\u30B3\u30D4\u30FC</button></div>\n        <div class="tom-meta"></div>\n        <div class="tom-toast" aria-live="polite"></div>\n        <div class="tom-actions"><button class="tom-reopen" type="button">\u30E1\u30FC\u30EB\u9023\u643A\u3092\u518D\u8A2D\u5B9A</button></div>\n      </div>';
      overlay.querySelector(".tom-address").textContent = address;
      overlay.querySelector(".tom-address").title = address;
      overlay.querySelector(".tom-meta").textContent = last ? "\u6700\u7D42\u53D7\u4FE1\uFF1A".concat(last) : "\u30E1\u30FC\u30EB\u8EE2\u9001\u3092\u53D7\u4FE1\u3059\u308B\u3068\u81EA\u52D5\u3067\u62BD\u9078\u72B6\u6CC1\u3078\u53CD\u6620\u3055\u308C\u307E\u3059\u3002";
      document.body.appendChild(overlay);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
      });
      (_a = overlay.querySelector(".tom-close")) == null ? void 0 : _a.addEventListener("click", closeModal);
      (_b = overlay.querySelector(".tom-copy")) == null ? void 0 : _b.addEventListener("click", async () => {
        await copyText(address);
        const toast = overlay.querySelector(".tom-toast");
        if (toast) toast.textContent = "\u2713 \u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F";
        setTimeout(() => {
          if (toast) toast.textContent = "";
        }, 1800);
      });
      (_c = overlay.querySelector(".tom-reopen")) == null ? void 0 : _c.addEventListener("click", openOriginalSetup);
    }
    function createStripBefore(card) {
      var _a, _b;
      let strip = document.getElementById(STRIP_ID);
      if (!strip) {
        strip = document.createElement("div");
        strip.id = STRIP_ID;
        strip.innerHTML = '<div class="tom-mail-status"><span class="tom-mail-dot"></span><span>\u30E1\u30FC\u30EB\u9023\u643A\u6E08\u307F</span><span class="tom-mail-last"></span></div><button type="button">\u8A2D\u5B9A</button>';
        (_a = card.parentNode) == null ? void 0 : _a.insertBefore(strip, card);
        (_b = strip.querySelector("button")) == null ? void 0 : _b.addEventListener("click", openSettings);
      }
      const lastEl = strip.querySelector(".tom-mail-last");
      const next = rememberedLast ? "\u6700\u7D42\u53D7\u4FE1 ".concat(rememberedLast) : "";
      if (lastEl && lastEl.textContent !== next) lastEl.textContent = next;
      return strip;
    }
    function compactVisibleCard() {
      const card = findMailCard();
      if (!card) return false;
      createStripBefore(card);
      if (card.style.display !== "none") card.style.display = "none";
      card.dataset.tomMailCardHidden = "1";
      return true;
    }
    function apply() {
      if (applying) return;
      applying = true;
      try {
        ensureStyles();
        scanState();
        if (!connectedLatched) return;
        compactVisibleCard();
      } finally {
        applying = false;
      }
    }
    const observer = new MutationObserver(() => apply());
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    document.addEventListener("DOMContentLoaded", apply, { once: true });
    apply();
    setTimeout(apply, 100);
    setTimeout(apply, 300);
    setTimeout(apply, 800);
    setTimeout(apply, 1800);
    setInterval(() => {
      if (connectedLatched) compactVisibleCard();
    }, 500);
  })();
})();
