(() => {
  (() => {
    "use strict";
    const CONFIG_KEY = "tom_lottery_supabase_config_v2";
    const STYLE_ID = "tom-member-admin-v227-style";
    let profiles = [];
    let loading = false;
    function readConfig() {
      try {
        return JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
      } catch {
        return null;
      }
    }
    function findToken(v, d = 0) {
      if (!v || d > 5) return null;
      if (typeof v === "object") {
        if (typeof v.access_token === "string" && v.access_token) return v.access_token;
        for (const x of Object.values(v)) {
          const t = findToken(x, d + 1);
          if (t) return t;
        }
      }
      return null;
    }
    function accessToken() {
      for (const s of [localStorage, sessionStorage]) {
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i) || "";
          if (!/auth-token|supabase/i.test(k)) continue;
          try {
            const t = findToken(JSON.parse(s.getItem(k) || "null"));
            if (t) return t;
          } catch {
          }
        }
      }
      return null;
    }
    async function rest(path, opt = {}) {
      const c = readConfig(), token = accessToken();
      if (!(c == null ? void 0 : c.url) || !(c == null ? void 0 : c.key) || !token) throw new Error("\u30ED\u30B0\u30A4\u30F3\u60C5\u5831\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093");
      const res = await fetch("".concat(c.url, "/rest/v1/").concat(path), {
        ...opt,
        headers: { apikey: c.key, Authorization: "Bearer ".concat(token), "Content-Type": "application/json", Accept: "application/json", ...opt.headers || {} }
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "") || "HTTP ".concat(res.status));
      if (res.status === 204) return null;
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }
    function esc(s) {
      return String(s != null ? s : "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);
    }
    function toast(msg) {
      let el = document.getElementById("tom-member-admin-toast");
      if (!el) {
        el = document.createElement("div");
        el.id = "tom-member-admin-toast";
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.classList.add("show");
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove("show"), 2200);
    }
    function injectStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const st = document.createElement("style");
      st.id = STYLE_ID;
      st.textContent = "\n#tom-member-admin-extra{margin:0 0 12px;padding:12px;background:#f8fbff;border:1px solid #cfe0f3;border-radius:13px}\n#tom-member-admin-extra .tom-ma-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px}\n#tom-member-admin-extra .tom-ma-head b{font-size:13px}.tom-ma-count{font-size:10px;font-weight:900;color:#35658f;background:#e8f3ff;border-radius:999px;padding:3px 8px}\n.tom-ma-list{display:flex;flex-direction:column;gap:8px}.tom-ma-row{background:#fff;border:1px solid #dce4ed;border-radius:11px;padding:9px}\n.tom-ma-email{font-size:12px;font-weight:1000;word-break:break-all}.tom-ma-meta{font-size:9.5px;color:#7a8490;margin-top:3px;line-height:1.45}\n.tom-ma-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}.tom-ma-actions input{min-width:135px;flex:1;border:1px solid #cfd8e4;border-radius:8px;padding:7px;font:inherit;background:#fff}\n.tom-ma-btn{border:1px solid #b8c7d9;background:#fff;border-radius:8px;padding:7px 9px;font-size:10px;font-weight:1000;cursor:pointer}.tom-ma-btn.primary{background:#1f75e8;color:#fff;border-color:#1f75e8}.tom-ma-btn:disabled{opacity:.5}\n.tom-ma-admin{font-size:9px;font-weight:1000;color:#835d00;background:#fff4c7;border:1px solid #ead17b;border-radius:999px;padding:4px 7px}\n#tom-member-admin-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(12px);opacity:0;z-index:2147483646;background:#202733;color:#fff;border-radius:999px;padding:9px 14px;font-size:11px;font-weight:900;transition:.18s;pointer-events:none}#tom-member-admin-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}\n";
      document.head.appendChild(st);
    }
    async function load() {
      var _a;
      if (loading) return;
      loading = true;
      try {
        const data = await rest("profiles?select=id,email,display_name,role,membership_status,expires_at,mail_connection_status,mail_last_received_at,created_at&order=created_at.desc");
        profiles = Array.isArray(data) ? data : [];
        const selfOnly = profiles.length === 1 && ((_a = profiles[0]) == null ? void 0 : _a.role) !== "admin";
        if (selfOnly) return;
        render();
      } catch (e) {
        console.warn("member-admin", e);
      } finally {
        loading = false;
      }
    }
    function render() {
      injectStyle();
      const host = document.getElementById("adminMembers");
      if (!host) return;
      let box = document.getElementById("tom-member-admin-extra");
      if (!box) {
        box = document.createElement("section");
        box.id = "tom-member-admin-extra";
        host.prepend(box);
      }
      box.innerHTML = '<div class="tom-ma-head"><b>\u904B\u55B6\u6A29\u9650\u30FB\u4F1A\u54E1\u671F\u9650</b><span class="tom-ma-count">'.concat(profiles.length, '\u4EBA</span></div><div class="tom-ma-list"></div>');
      const list = box.querySelector(".tom-ma-list");
      for (const p of profiles) {
        const row = document.createElement("div");
        row.className = "tom-ma-row";
        const mailStatus = p.mail_connection_status === "connected" ? "\u30E1\u30FC\u30EB\u9023\u643A\u6E08" : p.mail_connection_status === "verification_received" ? "\u30E1\u30FC\u30EB\u78BA\u8A8D\u5F85\u3061" : "\u30E1\u30FC\u30EB\u672A\u9023\u643A";
        row.innerHTML = '<div class="tom-ma-email">'.concat(esc(p.email || p.display_name || p.id), '</div><div class="tom-ma-meta">').concat(p.role === "admin" ? "\u904B\u55B6" : "\u4F1A\u54E1", " / ").concat(esc(p.membership_status || "pending"), " / ").concat(mailStatus).concat(p.expires_at ? " / \u671F\u9650 ".concat(esc(p.expires_at)) : "", '</div><div class="tom-ma-actions"><input type="date" value="').concat(esc(p.expires_at || ""), '" data-expiry="').concat(esc(p.id), '"><button class="tom-ma-btn" data-save-expiry="').concat(esc(p.id), '">\u671F\u9650\u4FDD\u5B58</button>').concat(p.role === "admin" ? '<span class="tom-ma-admin">ADMIN</span>' : '<button class="tom-ma-btn primary" data-promote="'.concat(esc(p.id), '" data-email="').concat(esc(p.email || ""), '">\u904B\u55B6\u306B\u5909\u66F4</button>'), "</div>");
        list.appendChild(row);
      }
      box.querySelectorAll("[data-save-expiry]").forEach((btn) => btn.addEventListener("click", async () => {
        const id = btn.dataset.saveExpiry;
        const input = box.querySelector('[data-expiry="'.concat(CSS.escape(id), '"]'));
        btn.disabled = true;
        try {
          await rest("profiles?id=eq.".concat(encodeURIComponent(id)), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ expires_at: input.value || null }) });
          toast("\u4F1A\u54E1\u671F\u9650\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F");
          await load();
        } catch (e) {
          console.error(e);
          toast("\u671F\u9650\u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F");
        } finally {
          btn.disabled = false;
        }
      }));
      box.querySelectorAll("[data-promote]").forEach((btn) => btn.addEventListener("click", async () => {
        const id = btn.dataset.promote, email = btn.dataset.email || "\u3053\u306E\u4F1A\u54E1";
        if (!confirm("".concat(email, " \u3092\u904B\u55B6\u30A2\u30AB\u30A6\u30F3\u30C8\u306B\u5909\u66F4\u3057\u307E\u3059\u304B\uFF1F\n\u904B\u55B6\u753B\u9762\u3068\u4F1A\u54E1\u7BA1\u7406\u3092\u4F7F\u7528\u3067\u304D\u308B\u3088\u3046\u306B\u306A\u308A\u307E\u3059\u3002"))) return;
        btn.disabled = true;
        try {
          await rest("profiles?id=eq.".concat(encodeURIComponent(id)), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ role: "admin", membership_status: "active" }) });
          toast("\u904B\u55B6\u30A2\u30AB\u30A6\u30F3\u30C8\u306B\u5909\u66F4\u3057\u307E\u3057\u305F");
          await load();
        } catch (e) {
          console.error(e);
          toast("\u904B\u55B6\u3078\u306E\u5909\u66F4\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
        } finally {
          btn.disabled = false;
        }
      }));
    }
    const schedule = () => setTimeout(() => {
      if (document.getElementById("adminMembers")) load();
    }, 120);
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
    setTimeout(schedule, 700);
    setTimeout(schedule, 1800);
  })();
})();
