from pathlib import Path
import re

src = Path('preview-v2.53.html').read_text(encoding='utf-8')
html = src.replace('V2.53', 'V2.54')

# Remove the old member polish that intentionally hid the member list and reloaded state on every DOM change.
html = html.replace('<script src="./member-polish-fast-v2.39.js?v=2.39.0"></script>\n', '')

# Progress defaults now include archive/deadline fields so the core can place cards correctly on first render.
html = html.replace(
'''  function getProgress(id) {
    const raw = progressMap.get(id) || { status: "\\u672A\\u5FDC\\u52DF", membership_done: false, memo: "" };
    return { ...raw, status: normalizeStatus(raw.status) };
  }''',
'''  function getProgress(id) {
    const raw = progressMap.get(id) || { status: "\\u672A\\u5FDC\\u52DF", membership_done: false, memo: "", is_archived: false, archived_at: null, payment_deadline: null, pickup_deadline: null };
    return { ...raw, status: normalizeStatus(raw.status), is_archived: !!raw.is_archived };
  }'''
)

# Publish one shared in-memory state so lightweight patches don't need their own Supabase polling.
publish = '''  function publishSharedState() {
    try {
      const progress = {};
      progressMap.forEach((v, k) => progress[k] = v);
      window.__TOM_ENTRY_STATE__ = {
        userId: session && session.user ? session.user.id : null,
        profile: profile || null,
        lotteries: lotteries || [],
        progress
      };
      document.dispatchEvent(new CustomEvent("tom:state", { detail: window.__TOM_ENTRY_STATE__ }));
    } catch (e) {
    }
  }
'''
if 'function publishSharedState()' not in html:
    html = html.replace('  function renderAll() {', publish + '  function renderAll() {', 1)

old_render_all = '''  function renderAll() {
    if (!$("app") || $("app").classList.contains("hidden")) return;
    $("inactiveNotice").classList.toggle("hidden", currentIsActive());
    renderRoleTabs();
    renderMailConnection();
    renderMember();
    if (currentIsAdmin()) renderAdmin();
  }'''
new_render_all = '''  function renderAll() {
    if (!$("app") || $("app").classList.contains("hidden")) return;
    $("inactiveNotice").classList.toggle("hidden", currentIsActive());
    renderRoleTabs();
    renderMailConnection();
    renderMember();
    if (currentIsAdmin()) renderAdmin();
    publishSharedState();
  }'''
if old_render_all not in html:
    raise SystemExit('renderAll marker not found')
html = html.replace(old_render_all, new_render_all, 1)

# Primary card data first; mail/catalog/profile-admin extras continue in the background.
new_load = '''  async function loadAllData() {
    if (mode === "demo") {
      loadDemoData();
      return;
    }
    if (!profile) return;
    const uid = session.user.id;
    if (currentIsActive()) {
      const [lRes, pRes] = await Promise.all([
        supabase.from("lotteries").select("*, lottery_links(*)").eq("is_active", true).order("deadline_date", { ascending: true }),
        supabase.from("user_lottery_progress").select("*").eq("user_id", uid)
      ]);
      if (lRes.error) throw lRes.error;
      if (pRes.error) throw pRes.error;
      lotteries = (lRes.data || []).map(normalizeCloudLottery);
      progressMap = new Map((pRes.data || []).map((p) => [p.lottery_id, { ...p, status: p.status, membership_done: p.membership_done, memo: p.memo || "" }]));
    } else {
      lotteries = [];
      progressMap = /* @__PURE__ */ new Map();
    }
    renderAll();

    Promise.all([
      supabase.from("public_settings").select("key,value"),
      supabase.from("mailbox_aliases").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("mail_events").select("id,event_type,from_address,subject,store,title,confidence,needs_review,received_at,lottery_id").eq("user_id", uid).order("received_at", { ascending: false }).limit(8),
      currentIsActive() ? supabase.from("product_catalog").select("*").eq("is_active", true).order("release_date", { ascending: false }) : Promise.resolve({ data: [] })
    ]).then(async ([settingsRes, mailboxRes, eventRes, cRes]) => {
      publicSettings = Object.fromEntries((settingsRes.data || []).map((x) => [x.key, x.value]));
      mailboxAlias = mailboxRes.data || null;
      mailEvents = eventRes.data || [];
      catalog = currentIsActive() ? (cRes.data || []).map((c) => ({ ...c, aliases: Array.isArray(c.aliases) ? c.aliases : [] })) : BUILTIN_CATALOG.slice();
      if (!mailboxAlias && !mailboxRes.error) {
        try {
          await supabase.rpc("ensure_my_mailbox");
          const retry = await supabase.from("mailbox_aliases").select("*").eq("user_id", uid).maybeSingle();
          mailboxAlias = retry.data || null;
        } catch (e) {
          console.warn(e);
        }
      }
      if (currentIsAdmin()) await loadProfiles();
      if ($("app") && !$("app").classList.contains("hidden")) {
        renderMailConnection();
        if (currentIsAdmin() && roleView === "admin") renderAdmin();
      }
    }).catch((e) => console.warn("[V2.54] secondary data load failed", e));
  }'''
html, n = re.subn(r'  async function loadAllData\(\) \{.*?\n  \}\n  function normalizeCloudLottery', new_load + '\n  function normalizeCloudLottery', html, count=1, flags=re.S)
if n != 1:
    raise SystemExit('loadAllData block not replaced')

# Region data is already returned by the lotteries query; keep it in the normalized object.
needle = '      shipping_estimate: x.shipping_estimate || null,\n      fulfillment: x.fulfillment,'
repl = '      shipping_estimate: x.shipping_estimate || null,\n      eligible_prefectures: Array.isArray(x.eligible_prefectures) ? x.eligible_prefectures : [],\n      fulfillment: x.fulfillment,'
if needle not in html:
    raise SystemExit('normalize eligible marker not found')
html = html.replace(needle, repl, 1)

# Render the correct type/region/archive destination in the core, instead of moving/hiding cards after paint.
new_member = '''  function renderMember() {
    if (!currentIsActive()) {
      $("lotteryList").innerHTML = "";
      if ($("archiveList")) $("archiveList").innerHTML = "";
      $("emptyState").hidden = false;
      if ($("archiveEmpty")) $("archiveEmpty").hidden = false;
      updateArchiveUI(0);
      updateSummary();
      return;
    }
    const q = $("searchInput").value.trim().toLowerCase();
    const status = $("statusFilter").value;
    const sort = $("sortSelect").value;
    let opportunityFilter = "all";
    try { opportunityFilter = localStorage.getItem("tom_opportunity_type_filter_v242") || "all"; } catch (e) {}
    const mine = profile && Array.isArray(profile.preferred_prefectures) ? profile.preferred_prefectures : null;
    const filtered = lotteries.filter((x) => {
      const p = getProgress(x.id);
      const hay = "".concat(x.store, " ").concat(x.title).toLowerCase();
      const typeOk = opportunityFilter === "all" || (x.opportunity_type || "lottery") === opportunityFilter;
      const eligible = Array.isArray(x.eligible_prefectures) ? x.eligible_prefectures : [];
      const tracked = !!p.is_archived || !["未応募", "未注文", "未確認"].includes(p.status);
      const regionOk = tracked || x.fulfillment === "全国配送" || !eligible.length || mine === null || (mine.length > 0 && eligible.some((v) => mine.includes(v)));
      return typeOk && regionOk && (!q || hay.includes(q)) && (activeCategory === "all" || hasCategory(x, activeCategory)) && (status === "all" || p.status === status);
    });
    const sorter = (a, b) => {
      if (sort === "store") return (a.store || "").localeCompare(b.store || "", "ja");
      if (sort === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return (a.deadline_date || "9999").localeCompare(b.deadline_date || "9999");
    };
    const activeList = filtered.filter((x) => {
      const p = getProgress(x.id);
      return !TERMINAL_STATUSES.includes(p.status) && !p.is_archived;
    }).sort(sorter);
    const archivedList = filtered.filter((x) => {
      const p = getProgress(x.id);
      return TERMINAL_STATUSES.includes(p.status) || !!p.is_archived;
    }).sort(sorter);
    $("lotteryList").innerHTML = activeList.map((x) => renderLotteryCard(x, false)).join("");
    $("emptyState").hidden = !!activeList.length;
    if ($("archiveList")) $("archiveList").innerHTML = archivedList.map((x) => renderLotteryCard(x, false)).join("");
    if ($("archiveEmpty")) $("archiveEmpty").hidden = !!archivedList.length;
    updateArchiveUI(archivedList.length);
    bindLotteryEvents(false);
    updateSummary();
  }'''
html, n = re.subn(r'  function renderMember\(\) \{.*?\n  \}\n  function updateSummary\(\)', new_member + '\n  function updateSummary()', html, count=1, flags=re.S)
if n != 1:
    raise SystemExit('renderMember block not replaced')

# Summary should also exclude manual archive rows immediately.
html = html.replace(
'$("countTotal").textContent = currentIsActive() ? ps.filter((o) => !TERMINAL_STATUSES.includes(o.p.status)).length : 0;',
'$("countTotal").textContent = currentIsActive() ? ps.filter((o) => !TERMINAL_STATUSES.includes(o.p.status) && !o.p.is_archived).length : 0;',
1
)
html = html.replace(
'$("countUnapplied").textContent = ps.filter((o) => o.p.status === "\\u672A\\u5FDC\\u52DF").length;',
'$("countUnapplied").textContent = ps.filter((o) => o.p.status === "\\u672A\\u5FDC\\u52DF" && !o.p.is_archived).length;',
1
)
html = html.replace(
'$("countSoon").textContent = ps.filter((o) => o.p.status === "\\u672A\\u5FDC\\u52DF" && dayDiff(o.x.deadline_date) >= 0 && dayDiff(o.x.deadline_date) <= 3).length;',
'$("countSoon").textContent = ps.filter((o) => o.p.status === "\\u672A\\u5FDC\\u52DF" && !o.p.is_archived && dayDiff(o.x.deadline_date) >= 0 && dayDiff(o.x.deadline_date) <= 3).length;',
1
)
html = html.replace(
'$("countToday").textContent = ps.filter((o) => o.p.status === "\\u672A\\u5FDC\\u52DF" && dayDiff(o.x.deadline_date) === 0).length;',
'$("countToday").textContent = ps.filter((o) => o.p.status === "\\u672A\\u5FDC\\u52DF" && !o.p.is_archived && dayDiff(o.x.deadline_date) === 0).length;',
1
)
html = html.replace(
'$("countWon").textContent = ps.filter((o) => o.p.status === "\\u5F53\\u9078").length;',
'$("countWon").textContent = ps.filter((o) => o.p.status === "\\u5F53\\u9078" && !o.p.is_archived).length;',
1
)

# Lightweight member polish uses the shared state and never hides the list or polls Supabase.
patch = '\n<script src="./member-polish-lite-v2.54.js?v=2.54.0"></script>\n'
if 'member-polish-lite-v2.54.js' not in html:
    html = html.replace('</body>', patch + '</body>')

Path('preview-v2.54.html').write_text(html, encoding='utf-8')
Path('index.html').write_text('''<!doctype html>\n<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0; url=./preview-v2.54.html?v=2541"><title>TOM エントリーマネージャー</title><script>location.replace('./preview-v2.54.html?v=2541');</script></head><body><p><a href="./preview-v2.54.html?v=2541">TOM エントリーマネージャー V2.54 を開く</a></p></body></html>''', encoding='utf-8')
