(() => {
  (() => {
    "use strict";
    const CONFIG_KEY = "tom_lottery_supabase_config_v2";
    const STYLE_ID = "tom-progress-polish-style-v226";
    const WINNERS_ID = "tom-winners-v226";
    const ARCHIVE_ID = "tom-archive-manager-v226";
    const ARCHIVE_MODAL_ID = "tom-archive-modal-v226";
    let model = { progress: [], lotteries: [], events: [], links: [] };
    let busy = false;
    function readConfig() {
      try {
        return JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
      } catch {
        return null;
      }
    }
    function findAccessToken(value, depth = 0) {
      if (!value || depth > 5) return null;
      if (typeof value === "object") {
        if (typeof value.access_token === "string" && value.access_token) return value.access_token;
        for (const v of Object.values(value)) {
          const token = findAccessToken(v, depth + 1);
          if (token) return token;
        }
      }
      return null;
    }
    function getAccessToken() {
      for (const storage of [localStorage, sessionStorage]) {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i) || "";
          if (!/auth-token|supabase/i.test(key)) continue;
          try {
            const token = findAccessToken(JSON.parse(storage.getItem(key) || "null"));
            if (token) return token;
          } catch {
          }
        }
      }
      return null;
    }
    async function rest(path, options = {}) {
      const config = readConfig();
      const token = getAccessToken();
      if (!(config == null ? void 0 : config.url) || !(config == null ? void 0 : config.key) || !token) return null;
      const headers = {
        apikey: config.key,
        Authorization: "Bearer ".concat(token),
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers || {}
      };
      const res = await fetch("".concat(config.url, "/rest/v1/").concat(path), { ...options, headers });
      if (!res.ok) {
        const text2 = await res.text().catch(() => String(res.status));
        throw new Error(text2 || "HTTP ".concat(res.status));
      }
      if (res.status === 204) return null;
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }
    function injectStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = "\n#".concat(WINNERS_ID, "{margin:0 0 11px;background:#fff8dc;border:2px solid #e0bd3b;border-radius:15px;padding:11px 12px;box-shadow:0 3px 12px rgba(106,79,0,.06)}\n#").concat(WINNERS_ID, "[hidden]{display:none!important}.tom-win-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}.tom-win-head b{font-size:14px}.tom-win-count{background:#c79200;color:#fff;border-radius:999px;padding:3px 9px;font-size:11px;font-weight:1000}.tom-win-list{display:flex;flex-direction:column;gap:7px}.tom-win-item{background:#fff;border:1px solid #e8d284;border-radius:11px;padding:9px}.tom-win-store{font-size:10px;color:#756a48;font-weight:900}.tom-win-title{font-size:13px;font-weight:1000;line-height:1.35;margin:2px 0 7px}.tom-win-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.tom-win-deadline{font-size:11px;font-weight:1000;color:#a33333}.tom-win-buy{margin-left:auto;text-decoration:none;background:#1f75e8;color:#fff;border-radius:9px;padding:8px 11px;font-size:11px;font-weight:1000}\n.tom-mail-auto-badge{display:inline-flex;align-items:center;gap:3px;background:#e9f4ff;border:1px solid #a8ccec;color:#23689d;border-radius:999px;padding:3px 6px;font-size:9px;font-weight:1000;margin-left:5px}.tom-pc-action{margin-top:7px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}.tom-pc-deadline{font-size:10px;font-weight:1000;color:#b22f3f;background:#fff0f2;border:1px solid #efbdc4;border-radius:8px;padding:5px 7px}.tom-pc-buy{font-size:10px;font-weight:1000;color:#fff!important;text-decoration:none!important;background:#1f75e8;border-radius:8px;padding:6px 9px}.tom-pc-done{font-size:10px;font-weight:1000;color:#17744e;background:#e9f8f1;border:1px solid #b8dfcc;border-radius:8px;padding:5px 7px}\n#").concat(ARCHIVE_ID, "{margin-top:8px}.tom-archive-manage-btn{width:100%;border:1px solid #d7dee8;background:#fff;border-radius:12px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;font-weight:1000;color:#273243;cursor:pointer}.tom-archive-manage-btn small{color:#7a8493;font-weight:800}.tom-archive-manage-count{background:#eef2f7;border-radius:999px;padding:3px 9px;margin-left:6px}\n#").concat(ARCHIVE_MODAL_ID, "{position:fixed;inset:0;z-index:2147483100;background:rgba(20,24,32,.48);display:flex;align-items:flex-end;justify-content:center;padding:14px}#").concat(ARCHIVE_MODAL_ID, "[hidden]{display:none!important}.tom-archive-sheet{width:min(640px,100%);max-height:min(80vh,760px);overflow:auto;background:#f7f8fb;border-radius:20px 20px 14px 14px;padding:14px;box-shadow:0 18px 60px rgba(0,0,0,.28)}.tom-archive-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}.tom-archive-head h3{margin:0;font-size:18px}.tom-archive-close{border:1px solid #d6dce6;background:#fff;border-radius:10px;padding:8px 11px;font-weight:900}.tom-archive-help{font-size:11px;color:#6f7989;line-height:1.5;margin:0 0 10px}.tom-archive-list{display:flex;flex-direction:column;gap:8px}.tom-archive-item{background:#fff;border:1px solid #e0e5ec;border-radius:13px;padding:10px}.tom-archive-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.tom-archive-status{border-radius:999px;padding:4px 7px;font-size:9px;font-weight:1000}.tom-archive-status.loss{background:#ffe8eb;color:#b72f42}.tom-archive-status.done{background:#e7f7ef;color:#197552}.tom-archive-status.received{background:#e8f1ff;color:#3266a7}.tom-archive-store{font-size:10px;color:#6b7585;font-weight:900}.tom-archive-title{font-size:13px;font-weight:1000;line-height:1.35;margin:5px 0}.tom-archive-time{font-size:9px;color:#8b94a1}.tom-restore{width:100%;margin-top:8px;border:1px solid #b9c6d6;background:#fff;color:#32445d;border-radius:9px;padding:8px 10px;font-weight:1000}.tom-restore:disabled{opacity:.5}\n@media(min-width:700px){#").concat(ARCHIVE_MODAL_ID, "{align-items:center}.tom-archive-sheet{border-radius:20px}}\n");
      document.head.appendChild(style);
    }
    function fmtJst(value, withYear = false) {
      if (!value) return "";
      try {
        return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: withYear ? "numeric" : void 0, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
      } catch {
        return "";
      }
    }
    function compact(value) {
      return String(value || "").normalize("NFKC").toLowerCase().replace(/[\s　・･'"“”‘’「」『』【】()（）\[\]：:／/\-]/g, "");
    }
    function byLottery(id) {
      return model.lotteries.find((x) => x.id === id) || null;
    }
    function eventsFor(id) {
      return model.events.filter((x) => x.lottery_id === id);
    }
    function latestEvent(id, type) {
      return eventsFor(id).filter((x) => x.event_type === type).sort((a, b) => new Date(b.received_at) - new Date(a.received_at))[0] || null;
    }
    function detailLink(id) {
      return model.links.find((x) => x.lottery_id === id && x.type === "detail") || null;
    }
    function deadlineFor(id) {
      var _a, _b;
      const e = latestEvent(id, "result_win");
      return ((_b = (_a = e == null ? void 0 : e.parse_result) == null ? void 0 : _a.pokemon_center) == null ? void 0 : _b.order_deadline_end) || null;
    }
    function findMainAnchor() {
      const app = document.querySelector(".app") || document.querySelector("main") || document.body;
      return { app, summary: app.querySelector(".summary"), toolbar: app.querySelector(".toolbar") };
    }
    function findCard(lottery) {
      if (!lottery) return null;
      const title = compact(lottery.title);
      const store = compact(lottery.store);
      const candidates = [...document.querySelectorAll(".card, article")].filter((el) => !el.closest("#".concat(WINNERS_ID, ",#").concat(ARCHIVE_MODAL_ID)));
      let best = null, bestScore = 0;
      for (const el of candidates) {
        const text = compact(el.innerText || el.textContent);
        if (!text) continue;
        let score = 0;
        if (store && text.includes(store)) score += 3;
        if (title && text.includes(title)) score += 8;
        else if (title.length >= 12 && text.includes(title.slice(0, 12))) score += 4;
        else if (title.length >= 8 && text.includes(title.slice(-8))) score += 2;
        if (score > bestScore) {
          best = el;
          bestScore = score;
        }
      }
      return bestScore >= 5 ? best : null;
    }
    function renderWinners() {
      injectStyle();
      const { app, summary, toolbar } = findMainAnchor();
      let panel = document.getElementById(WINNERS_ID);
      if (!panel) {
        panel = document.createElement("section");
        panel.id = WINNERS_ID;
        if (summary == null ? void 0 : summary.parentNode) summary.parentNode.insertBefore(panel, summary.nextSibling);
        else if (toolbar == null ? void 0 : toolbar.parentNode) toolbar.parentNode.insertBefore(panel, toolbar);
        else app.prepend(panel);
      }
      const winners = model.progress.filter((p) => p.status === "\u5F53\u9078" && !p.is_archived).map((p) => ({ p, l: byLottery(p.lottery_id) })).filter((x) => x.l);
      panel.hidden = !winners.length;
      if (!winners.length) {
        panel.innerHTML = "";
        return;
      }
      panel.innerHTML = '<div class="tom-win-head"><b>\u{1F3AF} \u5F53\u9078\u30FB\u8CFC\u5165\u5F85\u3061</b><span class="tom-win-count"></span></div><div class="tom-win-list"></div>';
      panel.querySelector(".tom-win-count").textContent = String(winners.length);
      const list = panel.querySelector(".tom-win-list");
      for (const { p, l } of winners) {
        const dl = deadlineFor(p.lottery_id);
        const link = detailLink(p.lottery_id);
        const item = document.createElement("div");
        item.className = "tom-win-item";
        item.innerHTML = '<div class="tom-win-store"></div><div class="tom-win-title"></div><div class="tom-win-actions"><span class="tom-win-deadline"></span></div>';
        item.querySelector(".tom-win-store").textContent = l.store || "";
        item.querySelector(".tom-win-title").textContent = l.title || "";
        item.querySelector(".tom-win-deadline").textContent = dl ? "\u652F\u6255\u671F\u9650 ".concat(fmtJst(dl)) : "\u652F\u6255\u671F\u9650\u306F\u30E1\u30FC\u30EB\u30FB\u8CFC\u5165\u30DA\u30FC\u30B8\u3067\u78BA\u8A8D";
        if (link == null ? void 0 : link.url) {
          const a = document.createElement("a");
          a.className = "tom-win-buy";
          a.href = link.url;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = "\u5546\u54C1\u3092\u8CFC\u5165";
          item.querySelector(".tom-win-actions").appendChild(a);
        }
        list.appendChild(item);
      }
    }
    function renderCardPolish() {
      var _a, _b;
      document.querySelectorAll(".tom-mail-auto-badge,.tom-pc-action").forEach((el) => el.remove());
      for (const p of model.progress) {
        const l = byLottery(p.lottery_id);
        if (!l) continue;
        const card = findCard(l);
        if (!card) continue;
        if (p.is_archived) {
          card.style.display = "none";
          card.dataset.tomArchivedHidden = "1";
          continue;
        }
        if (card.dataset.tomArchivedHidden === "1") {
          card.style.display = "";
          delete card.dataset.tomArchivedHidden;
        }
        if (p.auto_updated_at) {
          const host = card.querySelector(".meta") || ((_a = card.querySelector(".title")) == null ? void 0 : _a.parentElement) || card;
          const badge = document.createElement("span");
          badge.className = "tom-mail-auto-badge";
          badge.textContent = "\u2709 \u30E1\u30FC\u30EB\u81EA\u52D5\u66F4\u65B0";
          host.appendChild(badge);
        }
        if (l.store === "\u30DD\u30B1\u30E2\u30F3\u30BB\u30F3\u30BF\u30FC\u30AA\u30F3\u30E9\u30A4\u30F3" && (p.status === "\u5F53\u9078" || p.status === "\u8CFC\u5165\u6E08\u307F")) {
          const host = card.querySelector(".main") || ((_b = card.querySelector(".title")) == null ? void 0 : _b.parentElement) || card;
          const action = document.createElement("div");
          action.className = "tom-pc-action";
          if (p.status === "\u5F53\u9078") {
            const dl = document.createElement("span");
            dl.className = "tom-pc-deadline";
            const d = deadlineFor(p.lottery_id);
            dl.textContent = d ? "\u652F\u6255\u671F\u9650 ".concat(fmtJst(d)) : "\u652F\u6255\u671F\u9650\u3092\u78BA\u8A8D";
            action.appendChild(dl);
            const link = detailLink(p.lottery_id);
            if (link == null ? void 0 : link.url) {
              const a = document.createElement("a");
              a.className = "tom-pc-buy";
              a.href = link.url;
              a.target = "_blank";
              a.rel = "noopener";
              a.textContent = "\u8CFC\u5165\u30DA\u30FC\u30B8";
              a.addEventListener("click", (e) => e.stopPropagation());
              action.appendChild(a);
            }
          } else {
            const done = document.createElement("span");
            done.className = "tom-pc-done";
            done.textContent = "\u2713 \u8CFC\u5165\u5B8C\u4E86\u30E1\u30FC\u30EB\u78BA\u8A8D\u6E08\u307F";
            action.appendChild(done);
          }
          host.appendChild(action);
        }
      }
    }
    function statusClass(status) {
      return status === "\u843D\u9078" ? "loss" : status === "\u53D7\u53D6\u6E08\u307F" ? "received" : "done";
    }
    function ensureArchiveUi() {
      injectStyle();
      const { app } = findMainAnchor();
      let box = document.getElementById(ARCHIVE_ID);
      if (!box) {
        box = document.createElement("section");
        box.id = ARCHIVE_ID;
        box.innerHTML = '<button type="button" class="tom-archive-manage-btn"><span>\u30A2\u30FC\u30AB\u30A4\u30D6\u7BA1\u7406 <span class="tom-archive-manage-count">0</span></span><small>\u7D50\u679C\u30FB\u5B8C\u4E86\u5C65\u6B74\u3092\u78BA\u8A8D</small></button>';
        const existing = app.querySelector(".archive");
        if (existing == null ? void 0 : existing.parentNode) existing.parentNode.insertBefore(box, existing.nextSibling);
        else app.appendChild(box);
        box.querySelector("button").addEventListener("click", openArchive);
      }
      let modal = document.getElementById(ARCHIVE_MODAL_ID);
      if (!modal) {
        modal = document.createElement("div");
        modal.id = ARCHIVE_MODAL_ID;
        modal.hidden = true;
        modal.innerHTML = '<div class="tom-archive-sheet"><div class="tom-archive-head"><h3>\u30A2\u30FC\u30AB\u30A4\u30D6</h3><button type="button" class="tom-archive-close">\u9589\u3058\u308B</button></div><p class="tom-archive-help">\u843D\u9078\u306F\u78BA\u8A8D\u5F8C\u306B\u3001\u53D7\u53D6\u6E08\u307F\u30FB\u5B8C\u4E86\u306F\u30B9\u30C6\u30FC\u30BF\u30B9\u66F4\u65B0\u6642\u306B\u81EA\u52D5\u3067\u4FDD\u5B58\u3055\u308C\u307E\u3059\u3002\u5FC5\u8981\u306A\u3089\u300C\u7BA1\u7406\u4E2D\u3078\u623B\u3059\u300D\u3067\u5FA9\u5143\u3067\u304D\u307E\u3059\u3002</p><div class="tom-archive-list"></div></div>';
        modal.querySelector(".tom-archive-close").addEventListener("click", () => modal.hidden = true);
        modal.addEventListener("click", (e) => {
          if (e.target === modal) modal.hidden = true;
        });
        document.body.appendChild(modal);
      }
    }
    function renderArchive() {
      ensureArchiveUi();
      const archived = model.progress.filter((p) => p.is_archived).map((p) => ({ p, l: byLottery(p.lottery_id) })).filter((x) => x.l).sort((a, b) => new Date(b.p.archived_at || 0) - new Date(a.p.archived_at || 0));
      const count = document.querySelector("#".concat(ARCHIVE_ID, " .tom-archive-manage-count"));
      if (count) count.textContent = String(archived.length);
      const oldCount = document.querySelector(".archive .count");
      if (oldCount) oldCount.textContent = String(archived.length);
      const list = document.querySelector("#".concat(ARCHIVE_MODAL_ID, " .tom-archive-list"));
      if (!list) return;
      list.innerHTML = "";
      if (!archived.length) {
        list.innerHTML = '<div style="padding:16px;text-align:center;color:#7b8492;font-weight:900">\u30A2\u30FC\u30AB\u30A4\u30D6\u306F\u3042\u308A\u307E\u305B\u3093</div>';
        return;
      }
      for (const { p, l } of archived) {
        const item = document.createElement("article");
        item.className = "tom-archive-item";
        item.innerHTML = '<div class="tom-archive-row"><span class="tom-archive-status"></span><span class="tom-archive-store"></span></div><div class="tom-archive-title"></div><div class="tom-archive-time"></div><button type="button" class="tom-restore">\u7BA1\u7406\u4E2D\u3078\u623B\u3059</button>';
        const st = item.querySelector(".tom-archive-status");
        st.textContent = p.status;
        st.classList.add(statusClass(p.status));
        item.querySelector(".tom-archive-store").textContent = l.store || "";
        item.querySelector(".tom-archive-title").textContent = l.title || "";
        item.querySelector(".tom-archive-time").textContent = p.archived_at ? "\u30A2\u30FC\u30AB\u30A4\u30D6 ".concat(fmtJst(p.archived_at, true)) : "";
        item.querySelector(".tom-restore").addEventListener("click", () => restore(p.lottery_id, item));
        list.appendChild(item);
      }
    }
    function openArchive() {
      renderArchive();
      const m = document.getElementById(ARCHIVE_MODAL_ID);
      if (m) m.hidden = false;
    }
    async function restore(id, item) {
      const btn = item.querySelector(".tom-restore");
      btn.disabled = true;
      btn.textContent = "\u5FA9\u5143\u4E2D...";
      try {
        await rest("rpc/restore_lottery_from_archive", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ p_lottery_id: id }) });
        await load();
        const modal = document.getElementById(ARCHIVE_MODAL_ID);
        if (modal && !model.progress.some((p) => p.is_archived)) modal.hidden = true;
        setTimeout(() => location.reload(), 250);
      } catch (err) {
        console.error("[TOM V2.26] restore failed", err);
        btn.disabled = false;
        btn.textContent = "\u7BA1\u7406\u4E2D\u3078\u623B\u3059";
        alert("\u5FA9\u5143\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002");
      }
    }
    async function load() {
      if (busy) return;
      busy = true;
      try {
        const progress = await rest("user_lottery_progress?select=lottery_id,status,last_mail_event_id,auto_updated_at,is_archived,archived_at,result_seen_at,pending_result,pending_result_at,updated_at&order=updated_at.desc");
        if (progress === null) return;
        const rows = Array.isArray(progress) ? progress : [];
        const ids = [...new Set(rows.map((x) => x.lottery_id).filter(Boolean))];
        let lotteries = [], events = [], links = [];
        if (ids.length) {
          const filter = encodeURIComponent("in.(".concat(ids.join(","), ")"));
          [lotteries, events, links] = await Promise.all([
            rest("lotteries?select=id,title,store,category&id=".concat(filter)),
            rest("mail_events?select=id,lottery_id,event_type,received_at,parse_result&lottery_id=".concat(filter, "&order=received_at.desc")),
            rest("lottery_links?select=lottery_id,label,url,type&lottery_id=".concat(filter))
          ]);
        }
        model = { progress: rows, lotteries: Array.isArray(lotteries) ? lotteries : [], events: Array.isArray(events) ? events : [], links: Array.isArray(links) ? links : [] };
        renderWinners();
        renderCardPolish();
        renderArchive();
      } catch (err) {
        console.warn("[TOM V2.26] progress polish load failed", err);
      } finally {
        busy = false;
      }
    }
    injectStyle();
    ensureArchiveUi();
    document.addEventListener("click", () => setTimeout(() => {
      renderCardPolish();
      ensureArchiveUi();
    }, 180), true);
    document.addEventListener("change", () => setTimeout(load, 80), true);
    load();
    setTimeout(load, 900);
    setInterval(load, 2e4);
  })();
})();
