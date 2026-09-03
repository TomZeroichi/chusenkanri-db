(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  (() => {
    "use strict";
    const CONFIG_KEY = "tom_lottery_supabase_config_v2";
    const REDIRECT = "https://tomzeroichi.github.io/chusenkanri-db/";
    let clientPromise = null;
    function cfg() {
      try {
        return JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
      } catch {
        return null;
      }
    }
    async function client() {
      if (clientPromise) return clientPromise;
      clientPromise = (async () => {
        const c = cfg();
        if (!(c == null ? void 0 : c.url) || !(c == null ? void 0 : c.key)) throw new Error("Supabase config missing");
        const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm");
        return createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      })();
      return clientPromise;
    }
    function message(text) {
      const n = document.getElementById("connectionNotice");
      if (n) n.textContent = text;
      else alert(text);
    }
    function ensureResend() {
      const signup = document.getElementById("signupBtn");
      if (!signup || document.getElementById("resendSignupBtn")) return;
      const b = document.createElement("button");
      b.type = "button";
      b.id = "resendSignupBtn";
      b.className = "soft-btn";
      b.textContent = "\u78BA\u8A8D\u30E1\u30FC\u30EB\u3092\u518D\u9001";
      signup.insertAdjacentElement("afterend", b);
    }
    document.addEventListener("click", async (e) => {
      var _a, _b, _c, _d;
      const target = (_b = (_a = e.target).closest) == null ? void 0 : _b.call(_a, "#signupBtn,#resendSignupBtn");
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const email = ((_c = document.getElementById("loginEmail")) == null ? void 0 : _c.value.trim()) || "";
      const password = ((_d = document.getElementById("loginPassword")) == null ? void 0 : _d.value) || "";
      try {
        const s = await client();
        if (target.id === "resendSignupBtn") {
          if (!email) {
            message("\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
            return;
          }
          const { error } = await s.auth.resend({ type: "signup", email, options: { emailRedirectTo: REDIRECT } });
          if (error) throw error;
          message("\u78BA\u8A8D\u30E1\u30FC\u30EB\u3092\u518D\u9001\u3057\u307E\u3057\u305F\u3002\u65B0\u3057\u304F\u5C4A\u3044\u305F\u30E1\u30FC\u30EB\u306E\u30EA\u30F3\u30AF\u3092\u958B\u3044\u3066\u304F\u3060\u3055\u3044\u3002");
        } else {
          if (!email || password.length < 6) {
            message("\u30E1\u30FC\u30EB\u30686\u6587\u5B57\u4EE5\u4E0A\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
            return;
          }
          const { data, error } = await s.auth.signUp({ email, password, options: { emailRedirectTo: REDIRECT } });
          if (error) throw error;
          message(data.session ? "\u767B\u9332\u3057\u307E\u3057\u305F\u3002" : "\u78BA\u8A8D\u30E1\u30FC\u30EB\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F\u3002\u30E1\u30FC\u30EB\u5185\u306E\u30EA\u30F3\u30AF\u304B\u3089\u8A8D\u8A3C\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
        }
      } catch (err) {
        console.error(err);
        message("\u51E6\u7406\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u5C11\u3057\u5F85\u3063\u3066\u304B\u3089\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002");
      }
    }, true);
    new MutationObserver(ensureResend).observe(document.documentElement, { childList: true, subtree: true });
    ensureResend();
  })();
})();
