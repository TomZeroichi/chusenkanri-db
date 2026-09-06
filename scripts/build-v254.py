from pathlib import Path
import re

ROOT = Path('.')
html = (ROOT / 'preview-v2.53.html').read_text(encoding='utf-8')
html = html.replace('V2.53', 'V2.54')


def must_replace(text, old, new, label, count=1):
    found = text.count(old)
    if found < count:
        raise SystemExit(f'missing marker {label}: found {found}')
    return text.replace(old, new, count)


# -----------------------------------------------------------------------------
# Core: expose one shared state snapshot and load member cards before secondary
# mail/catalog data. This removes the sequential wait that previously happened
# before the lotteries/progress query.
# -----------------------------------------------------------------------------
load_pattern = re.compile(
    r'  async function loadAllData\(\) \{\n.*?\n  \}\n  function normalizeCloudLottery\(x\) \{',
    re.S,
)
load_match = load_pattern.search(html)
if not load_match:
    raise SystemExit('loadAllData block not found')

new_load = r'''  function publishEntryState() {
    const progress = {};
    progressMap.forEach((value, key) => {
      progress[key] = value;
    });
    window.__TOM_ENTRY_STATE__ = {
      user_id: session && session.user ? session.user.id : null,
      preferred_prefectures: profile && Object.prototype.hasOwnProperty.call(profile, "preferred_prefectures") ? profile.preferred_prefectures : null,
      lotteries,
      progress,
      updated_at: Date.now()
    };
    try {
      document.dispatchEvent(new CustomEvent("tom:entry-state", { detail: window.__TOM_ENTRY_STATE__ }));
    } catch (e) {
    }
  }
  function loadSupplementalData(force = false) {
    if (mode !== "cloud" || !session || !session.user) return Promise.resolve();
    const now = Date.now();
    const last = loadSupplementalData._last || 0;
    if (!force && now - last < 3e4) return Promise.resolve();
    loadSupplementalData._last = now;
    const seq = (loadSupplementalData._seq || 0) + 1;
    loadSupplementalData._seq = seq;
    const uid = session.user.id;
    const catalogQuery = currentIsActive() ? supabase.from("product_catalog").select("*").eq("is_active", true).order("release_date", { ascending: false }) : Promise.resolve({ data: BUILTIN_CATALOG.slice(), error: null });
    return Promise.all([
      supabase.from("public_settings").select("key,value"),
      supabase.from("mailbox_aliases").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("mail_events").select("id,event_type,from_address,subject,store,title,confidence,needs_review,received_at,lottery_id").eq("user_id", uid).order("received_at", { ascending: false }).limit(8),
      catalogQuery
    ]).then(async ([settingsRes, mailboxRes, eventRes, cRes]) => {
      if (seq !== loadSupplementalData._seq) return;
      publicSettings = Object.fromEntries((settingsRes.data || []).map((x) => [x.key, x.value]));
      mailboxAlias = mailboxRes.data || null;
      if (!mailboxAlias && !mailboxRes.error) {
        await supabase.rpc("ensure_my_mailbox");
        const retry = await supabase.from("mailbox_aliases").select("*").eq("user_id", uid).maybeSingle();
        mailboxAlias = retry.data || null;
      }
      mailEvents = eventRes.data || [];
      if (currentIsActive() && cRes && !cRes.error) catalog = (cRes.data || []).map((c) => ({ ...c, aliases: Array.isArray(c.aliases) ? c.aliases : [] }));
      if ($("app") && !$("app").classList.contains("hidden")) {
        renderMailConnection();
        if (currentIsAdmin() && roleView === "admin" && adminSection === "catalog") renderCatalog();
      }
    }).catch((err) => console.warn("[TOM V2.54] supplemental load failed", err));
  }
  async function loadAllData(forceSupplemental = false) {
    if (mode === "demo") {
      loadDemoData();
      return;
    }
    if (!profile) return;
    if (currentIsActive()) {
      const [lRes, pRes] = await Promise.all([
        supabase.from("lotteries").select("*, lottery_links(*)").eq("is_active", true).order("deadline_date", { ascending: true }),
        supabase.from("user_lottery_progress").select("*").eq("user_id", session.user.id)
      ]);
      if (lRes.error) throw lRes.error;
      if (pRes.error) throw pRes.error;
      lotteries = (lRes.data || []).map(normalizeCloudLottery);
      progressMap = new Map((pRes.data || []).map((p) => [p.lottery_id, {
        status: p.status,
        membership_done: p.membership_done,
        memo: p.memo || "",
        is_archived: !!p.is_archived,
        archived_at: p.archived_at || null,
        payment_deadline: p.payment_deadline || null,
        pickup_deadline: p.pickup_deadline || null
      }]));
    } else {
      lotteries = [];
      progressMap = /* @__PURE__ */ new Map();
      catalog = BUILTIN_CATALOG.slice();
    }
    if (!catalog || !catalog.length) catalog = BUILTIN_CATALOG.slice();
    publishEntryState();
    if (currentIsAdmin()) {
      loadProfiles().then(() => {
        if ($("app") && !$("app").classList.contains("hidden") && roleView === "admin" && adminSection === "members") renderMembers();
      }).catch((err) => console.warn("[TOM V2.54] profile list load failed", err));
    }
    loadSupplementalData(forceSupplemental);
    renderAll();
  }
  function normalizeCloudLottery(x) {'''

html = html[:load_match.start()] + new_load + html[load_match.end():]

# Make region metadata available to the shared snapshot.
html = must_replace(
    html,
    '      shipping_estimate: x.shipping_estimate || null,\n      fulfillment: x.fulfillment,',
    '      shipping_estimate: x.shipping_estimate || null,\n      eligible_prefectures: Array.isArray(x.eligible_prefectures) ? x.eligible_prefectures : [],\n      fulfillment: x.fulfillment,',
    'normalize eligible prefectures',
)

# Publish status changes immediately instead of waiting for realtime to echo them.
html = must_replace(
    html,
    '    progressMap.set(lotteryId, next);\n    if (mode === "demo") {',
    '    progressMap.set(lotteryId, next);\n    publishEntryState();\n    if (mode === "demo") {',
    'publish progress patch',
)

# Explicit mail refresh should bypass the supplemental throttle.
html = must_replace(
    html,
    '      await loadCloudProfile();\n      await loadAllData();\n    } else renderMailConnection();',
    '      await loadCloudProfile();\n      await loadAllData(true);\n    } else renderMailConnection();',
    'force mail refresh',
)

# Render only the selected opportunity type in the core, instead of rendering all
# cards and hiding most of them after the fact.
html = must_replace(
    html,
    '    const q = $("searchInput").value.trim().toLowerCase();\n    const status = $("statusFilter").value;\n    const sort = $("sortSelect").value;\n    const filtered = lotteries.filter((x) => {',
    '    const q = $("searchInput").value.trim().toLowerCase();\n    const status = $("statusFilter").value;\n    const sort = $("sortSelect").value;\n    let entryTypeFilter = "all";\n    try { entryTypeFilter = localStorage.getItem("tom_opportunity_type_filter_v242") || "all"; } catch (e) {}\n    const filtered = lotteries.filter((x) => {',
    'render member type filter setup',
)
html = must_replace(
    html,
    '      return (!q || hay.includes(q)) && (activeCategory === "all" || hasCategory(x, activeCategory)) && (status === "all" || p.status === status);',
    '      return (!q || hay.includes(q)) && (activeCategory === "all" || hasCategory(x, activeCategory)) && (status === "all" || p.status === status) && (entryTypeFilter === "all" || (x.opportunity_type || "lottery") === entryTypeFilter);',
    'render member type filter condition',
)

# Manual archive is now first-class in the core. More importantly: do not build
# archive card HTML while the archive section is closed.
html = must_replace(
    html,
    '    const activeList = filtered.filter((x) => !TERMINAL_STATUSES.includes(getProgress(x.id).status)).sort(sorter);\n    const archivedList = filtered.filter((x) => TERMINAL_STATUSES.includes(getProgress(x.id).status)).sort(sorter);',
    '    const activeList = filtered.filter((x) => { const p = getProgress(x.id); return !p.is_archived && !TERMINAL_STATUSES.includes(p.status); }).sort(sorter);\n    const archivedList = filtered.filter((x) => { const p = getProgress(x.id); return !!p.is_archived || TERMINAL_STATUSES.includes(p.status); }).sort(sorter);',
    'archive split',
)
html = must_replace(
    html,
    '    if ($("archiveList")) $("archiveList").innerHTML = archivedList.map((x) => renderLotteryCard(x, false)).join("");\n    if ($("archiveEmpty")) $("archiveEmpty").hidden = !!archivedList.length;',
    '    if ($("archiveList")) $("archiveList").innerHTML = archiveOpen ? archivedList.map((x) => renderLotteryCard(x, false)).join("") : "";\n    if ($("archiveEmpty")) $("archiveEmpty").hidden = !archiveOpen || !!archivedList.length;',
    'lazy archive html',
)

# Core summary is type-aware and ignores manually archived entries, so patch
# layers do not need to correct a large initial total after paint.
summary_pattern = re.compile(r'  function updateSummary\(\) \{\n.*?\n  \}\n  function updateArchiveUI\(count\) \{', re.S)
summary_match = summary_pattern.search(html)
if not summary_match:
    raise SystemExit('summary block not found')
new_summary = r'''  function updateSummary() {
    let entryTypeFilter = "all";
    try { entryTypeFilter = localStorage.getItem("tom_opportunity_type_filter_v242") || "all"; } catch (e) {}
    const ps = lotteries.filter((x) => entryTypeFilter === "all" || (x.opportunity_type || "lottery") === entryTypeFilter).map((x) => ({ x, p: getProgress(x.id) }));
    $("countTotal").textContent = currentIsActive() ? ps.filter((o) => !o.p.is_archived && !TERMINAL_STATUSES.includes(o.p.status)).length : 0;
    $("countUnapplied").textContent = ps.filter((o) => !o.p.is_archived && o.p.status === "未応募").length;
    $("countSoon").textContent = ps.filter((o) => !o.p.is_archived && o.p.status === "未応募" && dayDiff(o.x.deadline_date) >= 0 && dayDiff(o.x.deadline_date) <= 3).length;
    $("countToday").textContent = ps.filter((o) => !o.p.is_archived && o.p.status === "未応募" && dayDiff(o.x.deadline_date) === 0).length;
    $("countWon").textContent = ps.filter((o) => !o.p.is_archived && o.p.status === "当選").length;
  }
  function updateArchiveUI(count) {'''
html = html[:summary_match.start()] + new_summary + html[summary_match.end():]

# Opening archive renders it on demand; closing immediately releases the hidden
# card DOM so later member renders stay light.
old_archive_click = '''      archiveToggleEl.onclick = () => {
        var _a;
        archiveOpen = !archiveOpen;
        updateArchiveUI(Number(((_a = $("archiveCount")) == null ? void 0 : _a.textContent) || 0));
      };'''
new_archive_click = '''      archiveToggleEl.onclick = () => {
        var _a;
        archiveOpen = !archiveOpen;
        if (archiveOpen) {
          renderMember();
        } else {
          if ($("archiveList")) $("archiveList").innerHTML = "";
          updateArchiveUI(Number(((_a = $("archiveCount")) == null ? void 0 : _a.textContent) || 0));
        }
      };'''
html = must_replace(html, old_archive_click, new_archive_click, 'lazy archive toggle')

# A type-tab click updates localStorage in the type patch. Re-render on the next
# task so the core creates only the newly selected category's cards.
html = must_replace(
    html,
    '  $("sortSelect").addEventListener("change", renderMember);',
    '''  $("sortSelect").addEventListener("change", renderMember);
  document.addEventListener("click", (e) => {
    const b = e.target && e.target.closest ? e.target.closest("[data-tom-type-filter]") : null;
    if (!b) return;
    setTimeout(() => {
      if (roleView === "member") renderMember();
    }, 0);
  });''',
    'type tab core rerender',
)

# -----------------------------------------------------------------------------
# Opportunity type patch: use the core snapshot, remove 15-second polling, and
# observe only direct list child changes rather than the whole document.
# -----------------------------------------------------------------------------
opp = (ROOT / 'opportunity-types-stable-v2.43.js').read_text(encoding='utf-8')
opp = must_replace(opp, '  function loadState(){', '  function loadStateNetwork(){', 'opp load rename')
if '  function start(){' not in opp:
    raise SystemExit('opp start not found')
opp_prefix = opp.rsplit('  function start(){', 1)[0]
opp_tail = r'''  function loadState(){
    var st=window.__TOM_ENTRY_STATE__;
    if(st&&st.lotteries){
      userId=st.user_id||userId;
      lotteries=st.lotteries||[];
      progressById={};
      var ps=st.progress||{};
      for(var id in ps)if(Object.prototype.hasOwnProperty.call(ps,id))progressById[id]=ps[id];
      applyDom();
      return Promise.resolve();
    }
    return loadStateNetwork();
  }
  function waitForCoreState(n){
    if(window.__TOM_ENTRY_STATE__)return loadState();
    if(n<60){setTimeout(function(){waitForCoreState(n+1);},50);return Promise.resolve();}
    return loadStateNetwork();
  }
  function start(){
    try{selectedType=localStorage.getItem(FILTER_KEY)||'all';}catch(e){selectedType='all';}
    injectStyle();ensureModal();ensureNav();
    var ids=['lotteryList','archiveList','adminLotteryList'];
    for(var i=0;i<ids.length;i++){
      var el=document.getElementById(ids[i]);
      if(el)new MutationObserver(function(){if(!applying)scheduleApply();}).observe(el,{childList:true});
    }
    document.addEventListener('tom:entry-state',function(){loadState();});
    waitForCoreState(0);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)loadState();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
'''
opp = opp_prefix + opp_tail
(ROOT / 'opportunity-types-fast-v2.54.js').write_text(opp, encoding='utf-8')

# -----------------------------------------------------------------------------
# Region/archive patch: shared snapshot, no polling, top-level observers only.
# The core now owns archive membership and lazy rendering, so the old DOM-moving
# archive unifier and duplicate summary pass are removed.
# -----------------------------------------------------------------------------
region = (ROOT / 'regions-archive-v2.40.js').read_text(encoding='utf-8')
region = must_replace(region, '  function loadState(){', '  function loadStateNetwork(){', 'region load rename')
region = re.sub(
    r'  function unifyArchive\(\)\{\n.*?\n  \}\n  function applyMemberFilter\(\)\{',
    '''  function unifyArchive(){
    var base=document.getElementById('archiveWrap'),list=document.getElementById('archiveList');
    if(!base||!list)return;
    if(!base.classList.contains('open')&&list.childNodes.length)list.innerHTML='';
  }
  function applyMemberFilter(){''',
    region,
    count=1,
    flags=re.S,
)
region = re.sub(
    r'  function updateSummary\(\)\{\n.*?\n  \}\n  function applyDom\(\)\{',
    '''  function updateSummary(){}
  function applyDom(){''',
    region,
    count=1,
    flags=re.S,
)
if '  var observer=new MutationObserver' not in region:
    raise SystemExit('region observer tail not found')
region_prefix = region.split('  var observer=new MutationObserver', 1)[0]
region_tail = r'''  function loadState(){
    var st=window.__TOM_ENTRY_STATE__;
    if(st&&st.lotteries){
      userId=st.user_id||userId;
      profilePrefs=Object.prototype.hasOwnProperty.call(st,'preferred_prefectures')?st.preferred_prefectures:null;
      lotteryMap={};progressMap={};
      var ls=st.lotteries||[],ps=st.progress||{};
      for(var i=0;i<ls.length;i++)lotteryMap[ls[i].id]=ls[i];
      for(var id in ps)if(Object.prototype.hasOwnProperty.call(ps,id))progressMap[id]=ps[id];
      applyDom();
      return Promise.resolve();
    }
    return loadStateNetwork();
  }
  function waitForCoreState(n){
    if(window.__TOM_ENTRY_STATE__)return loadState();
    if(n<60){setTimeout(function(){waitForCoreState(n+1);},50);return Promise.resolve();}
    return loadStateNetwork();
  }
  function start(){
    injectStyle();ensureMemberCard();ensureModal();
    var ids=['lotteryList','archiveList','adminLotteryList'];
    for(var i=0;i<ids.length;i++){
      var el=document.getElementById(ids[i]);
      if(el)new MutationObserver(function(){if(!applying)scheduleApply();}).observe(el,{childList:true});
    }
    document.addEventListener('tom:entry-state',function(){loadState();});
    waitForCoreState(0);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)loadState();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
'''
region = region_prefix + region_tail
(ROOT / 'regions-archive-fast-v2.54.js').write_text(region, encoding='utf-8')

# -----------------------------------------------------------------------------
# Event/new badge patch: lotteries/progress come from the core snapshot. Only
# the tiny per-user read-marker table is queried by this patch. Core realtime
# already refreshes the snapshot, so the duplicate realtime subscription goes.
# -----------------------------------------------------------------------------
events = (ROOT / 'events-newbadges-v2.52.js').read_text(encoding='utf-8')
events = must_replace(
    events,
    'var client=null,userId=null,items={},progress={},reads={},channel=null,scheduled=false;',
    'var client=null,userId=null,items={},progress={},reads={},channel=null,scheduled=false,readsLoaded=false;',
    'events state vars',
)
events = must_replace(events, '  function refreshData(){', '  function refreshDataNetwork(){', 'events refresh rename')
if '  function setupRealtime(){' not in events:
    raise SystemExit('events setupRealtime marker missing')
events = events.replace('  function setupRealtime(){', r'''  function applyCoreSnapshot(){
    var st=window.__TOM_ENTRY_STATE__;
    if(!st||!st.lotteries)return false;
    userId=st.user_id||userId;items={};progress={};
    var ls=st.lotteries||[],ps=st.progress||{};
    for(var i=0;i<ls.length;i++)items[ls[i].id]=ls[i];
    for(var id in ps)if(Object.prototype.hasOwnProperty.call(ps,id))progress[id]=ps[id]&&ps[id].status?ps[id].status:'未応募';
    ensureNav();decorateRows();renderCounts();return true;
  }
  function loadReadsOnly(force){
    if(readsLoaded&&!force)return Promise.resolve();
    var c=ensureClient();if(!c||!userId)return Promise.resolve();
    return c.from('user_opportunity_type_reads').select('opportunity_type,last_seen_at').eq('user_id',userId).then(function(r){
      if(r&&r.error)throw r.error;reads={};(r.data||[]).forEach(function(x){reads[x.opportunity_type]=x.last_seen_at;});readsLoaded=true;renderCounts();
    }).catch(function(err){console.warn('[V2.54] read marker load failed',err);});
  }
  function refreshData(){
    if(applyCoreSnapshot())return loadReadsOnly(false);
    return refreshDataNetwork();
  }
  function waitForCoreState(n){
    if(window.__TOM_ENTRY_STATE__)return refreshData();
    if(n<60){setTimeout(function(){waitForCoreState(n+1);},50);return Promise.resolve();}
    return refreshDataNetwork();
  }
  function setupRealtime(){''', 1)
# Direct-list observers only; decoration inside a card must not retrigger itself.
events = events.replace(".observe(lists[i],{childList:true,subtree:true});", ".observe(lists[i],{childList:true});")
# Replace start tail and drop duplicate realtime/focus full-data refreshes.
start_pos = events.rfind('  function start(){')
if start_pos < 0:
    raise SystemExit('events start marker missing')
events_prefix = events[:start_pos]
events_tail = r'''  function start(){
    bind();
    document.addEventListener('tom:entry-state',function(){refreshData();});
    waitForCoreState(0);
    setTimeout(bind,450);
    document.addEventListener('visibilitychange',function(){
      if(!document.hidden){readsLoaded=false;applyCoreSnapshot();loadReadsOnly(true);}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
'''
events = events_prefix + events_tail
(ROOT / 'events-newbadges-fast-v2.54.js').write_text(events, encoding='utf-8')

# -----------------------------------------------------------------------------
# Event status UI: snapshot only, one direct-child observer per list.
# -----------------------------------------------------------------------------
event_ui = (ROOT / 'events-stability-v2.52.js').read_text(encoding='utf-8')
event_ui = must_replace(event_ui, '  function refresh(){', '  function refreshNetwork(){', 'event ui refresh rename')
event_ui = event_ui.replace(".observe(el,{childList:true,subtree:true});", ".observe(el,{childList:true});")
start_pos = event_ui.rfind('  function start(){')
if start_pos < 0:
    raise SystemExit('event ui start marker missing')
event_prefix = event_ui[:start_pos]
event_tail = r'''  function refresh(){
    var st=window.__TOM_ENTRY_STATE__;
    if(st&&st.lotteries){
      userId=st.user_id||userId;events={};progress={};
      var ls=st.lotteries||[],ps=st.progress||{};
      for(var i=0;i<ls.length;i++)if(ls[i].opportunity_type==='event')events[ls[i].id]=ls[i];
      for(var id in ps)if(Object.prototype.hasOwnProperty.call(ps,id))progress[id]=ps[id]&&ps[id].status?ps[id].status:'未確認';
      decorate();return Promise.resolve();
    }
    return refreshNetwork();
  }
  function waitForCoreState(n){
    if(window.__TOM_ENTRY_STATE__)return refresh();
    if(n<60){setTimeout(function(){waitForCoreState(n+1);},50);return Promise.resolve();}
    return refreshNetwork();
  }
  function start(){
    bind();
    document.addEventListener('tom:entry-state',function(){refresh();});
    waitForCoreState(0);
    setTimeout(bind,450);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
'''
event_ui = event_prefix + event_tail
(ROOT / 'events-stability-fast-v2.54.js').write_text(event_ui, encoding='utf-8')

# Use fast variants in V2.54.
html = must_replace(html, '<script src="./regions-archive-v2.40.js?v=2.40.0"></script>', '<script src="./regions-archive-fast-v2.54.js?v=2.54.0"></script>', 'region script')
html = must_replace(html, '<script src="./opportunity-types-stable-v2.43.js?v=2.43.0"></script>', '<script src="./opportunity-types-fast-v2.54.js?v=2.54.0"></script>', 'opportunity script')
html = must_replace(html, '<script src="./events-newbadges-v2.52.js?v=2.52.0"></script>', '<script src="./events-newbadges-fast-v2.54.js?v=2.54.0"></script>', 'event badges script')
html = must_replace(html, '<script src="./events-stability-v2.52.js?v=2.52.0"></script>', '<script src="./events-stability-fast-v2.54.js?v=2.54.0"></script>', 'event ui script')

(ROOT / 'preview-v2.54.html').write_text(html, encoding='utf-8')

index = '''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0; url=./preview-v2.54.html?v=2541"><title>TOM エントリーマネージャー</title><script>location.replace('./preview-v2.54.html?v=2541');</script></head><body><p><a href="./preview-v2.54.html?v=2541">TOM エントリーマネージャー V2.54 を開く</a></p></body></html>'''
(ROOT / 'index.html').write_text(index, encoding='utf-8')

print('V2.54 build complete')
