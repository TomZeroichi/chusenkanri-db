from pathlib import Path
import runpy

# Build the current stable V2.55 release first, then apply the second-stage
# performance cleanup without rewriting the application from scratch.
runpy.run_path('scripts/build-v255.py', run_name='__main__')

root = Path('.')


def must_replace(text, old, new, label, count=1):
    found = text.count(old)
    if found < count:
        raise SystemExit('missing marker %s: found %s' % (label, found))
    return text.replace(old, new, count)


# -----------------------------------------------------------------------------
# Core lifecycle: patches should react once after card HTML is complete instead
# of watching the entire document and guessing when rendering finished.
# -----------------------------------------------------------------------------
html = (root / 'preview-v2.55.html').read_text(encoding='utf-8')
html = html.replace('V2.55', 'V2.56')

html = must_replace(
    html,
    '    bindLotteryEvents(false);\n    updateSummary();\n  }\n  function updateSummary() {',
    '''    bindLotteryEvents(false);\n    updateSummary();\n    try {\n      document.dispatchEvent(new CustomEvent("tom:cards-rendered", { detail: { view: "member", archive_open: archiveOpen } }));\n    } catch (e) {\n    }\n  }\n  function updateSummary() {''',
    'member render lifecycle',
)

html = must_replace(
    html,
    '    $("adminLotteryList").innerHTML = list.map((x) => renderLotteryCard(x, true)).join("");\n    bindLotteryEvents(true);\n  }',
    '''    $("adminLotteryList").innerHTML = list.map((x) => renderLotteryCard(x, true)).join("");\n    bindLotteryEvents(true);\n    try {\n      document.dispatchEvent(new CustomEvent("tom:cards-rendered", { detail: { view: "admin" } }));\n    } catch (e) {\n    }\n  }''',
    'admin render lifecycle',
)

# Swipe archive writes are already persisted by the swipe patch. This listener
# mirrors the saved state into the core map immediately so the card moves without
# waiting for the Realtime echo/network round-trip.
html = must_replace(
    html,
    '  $("sortSelect").addEventListener("change", renderMember);',
    '''  $("sortSelect").addEventListener("change", renderMember);\n  document.addEventListener("tom:archive-local-change", (e) => {\n    const d = e && e.detail ? e.detail : null;\n    if (!d || !d.lottery_id) return;\n    const prev = getProgress(d.lottery_id);\n    const next = Object.assign({}, prev, {\n      is_archived: !!d.is_archived,\n      archived_at: d.is_archived ? (d.archived_at || new Date().toISOString()) : null\n    });\n    progressMap.set(d.lottery_id, next);\n    publishEntryState();\n    if (roleView === "member") renderMember();\n  });''',
    'archive local core sync',
)

# -----------------------------------------------------------------------------
# Progress polish: keep winner/mail polish, but stop refreshing on every form
# change and every 20 seconds. Core state changes are the refresh trigger.
# -----------------------------------------------------------------------------
progress = (root / 'compat/progress-polish-fast-v2.39.js').read_text(encoding='utf-8')
progress = must_replace(
    progress,
    '        renderWinners();\n        renderCardPolish();',
    '''        renderWinners();\n        try { document.dispatchEvent(new CustomEvent("tom:winners-rendered")); } catch (e) {}\n        renderCardPolish();''',
    'winner render event',
)
progress = must_replace(
    progress,
    '''    injectStyle();\n    ensureArchiveUi();\n    document.addEventListener("click", () => setTimeout(() => {\n      renderCardPolish();\n      ensureArchiveUi();\n    }, 180), true);\n    document.addEventListener("change", () => setTimeout(load, 80), true);\n    load();\n    setTimeout(load, 900);\n    setInterval(load, 2e4);''',
    '''    injectStyle();\n    ensureArchiveUi();\n    load();\n    document.addEventListener("tom:entry-state", () => { load(); });\n    document.addEventListener("tom:cards-rendered", () => {\n      renderCardPolish();\n      ensureArchiveUi();\n    });''',
    'progress polish polling tail',
)
(root / 'compat/progress-polish-event-v2.56.js').write_text(progress, encoding='utf-8')

# -----------------------------------------------------------------------------
# Swipe archive: preserve swipe UX and writes, but consume the shared snapshot.
# No document-wide observer, no DOM-mutation network reload, no 15s polling.
# Core V2.54+ already owns archive membership/lazy archive rendering.
# -----------------------------------------------------------------------------
swipe = (root / 'swipe-archive-v2.35.js').read_text(encoding='utf-8')
swipe = must_replace(
    swipe,
    '''      progressById[id].is_archived=archive;\n      progressById[id].archived_at=archive?now:null;\n      applyDom();\n      updateSummary();\n      setTimeout(loadState,350);''',
    '''      progressById[id].is_archived=archive;\n      progressById[id].archived_at=archive?now:null;\n      var shared=window.__TOM_ENTRY_STATE__;\n      if(shared&&shared.progress){\n        if(!shared.progress[id])shared.progress[id]={lottery_id:id,status:statusFor(id)};\n        shared.progress[id].is_archived=archive;\n        shared.progress[id].archived_at=archive?now:null;\n        shared.updated_at=Date.now();\n      }\n      try {\n        document.dispatchEvent(new CustomEvent('tom:archive-local-change',{detail:{lottery_id:id,is_archived:archive,archived_at:archive?now:null}}));\n      } catch(_e) {}''',
    'swipe save local sync',
)
swipe = must_replace(
    swipe,
    '''  function applyDom(){\n    if(applying)return;\n    applying=true;\n    try{\n      injectStyle();ensureHint();patchArchiveNote();\n      moveManualArchivedRows();\n      bindAllRows();\n      var archiveList=document.getElementById('archiveList');\n      var empty=document.getElementById('archiveEmpty');\n      if(archiveList&&empty)empty.hidden=archiveList.querySelectorAll('.lottery-row').length>0;\n      updateSummary();\n    }finally{applying=false;}\n  }''',
    '''  function applyDom(){\n    if(applying)return;\n    applying=true;\n    try{\n      injectStyle();ensureHint();patchArchiveNote();\n      bindAllRows();\n    }finally{applying=false;}\n  }''',
    'swipe lightweight apply',
)
swipe = must_replace(swipe, '  function loadState(){', '  function loadStateNetwork(){', 'swipe load rename')
swipe_prefix = swipe.split('  function scheduleLoad(){', 1)[0]
swipe_tail = r'''  function syncFromSnapshot(){
    var st=window.__TOM_ENTRY_STATE__;
    if(!st||!st.lotteries)return false;
    userId=st.user_id||userId;
    lotteries=st.lotteries||[];
    progressById={};
    var ps=st.progress||{};
    for(var id in ps)if(Object.prototype.hasOwnProperty.call(ps,id))progressById[id]=ps[id];
    return true;
  }

  function start(){
    injectStyle();
    document.addEventListener('tom:entry-state',function(){syncFromSnapshot();});
    document.addEventListener('tom:cards-rendered',function(e){
      if(e&&e.detail&&e.detail.view&&e.detail.view!=='member')return;
      if(syncFromSnapshot())applyDom();else loadStateNetwork();
    });
    if(syncFromSnapshot())applyDom();else setTimeout(loadStateNetwork,500);
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&syncFromSnapshot())applyDom();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
})();
'''
swipe = swipe_prefix + swipe_tail
(root / 'swipe-archive-fast-v2.56.js').write_text(swipe, encoding='utf-8')

# -----------------------------------------------------------------------------
# Winner deadline editor: shared progress snapshot, render lifecycle only.
# -----------------------------------------------------------------------------
winner = (root / 'winner-deadlines-fast-v2.39.js').read_text(encoding='utf-8')
winner = must_replace(
    winner,
    '''      progressById[id].payment_deadline=paymentValue;\n      progressById[id].pickup_deadline=pickupValue;\n      applyDom();''',
    '''      progressById[id].payment_deadline=paymentValue;\n      progressById[id].pickup_deadline=pickupValue;\n      var shared=window.__TOM_ENTRY_STATE__;\n      if(shared&&shared.progress){\n        if(!shared.progress[id])shared.progress[id]={lottery_id:id,status:'当選'};\n        shared.progress[id].payment_deadline=paymentValue;\n        shared.progress[id].pickup_deadline=pickupValue;\n        shared.updated_at=Date.now();\n        try { document.dispatchEvent(new CustomEvent('tom:entry-state',{detail:shared})); } catch(_e) {}\n      }\n      applyDom();''',
    'winner deadline shared update',
)
winner = must_replace(winner, '  function loadState(){', '  function loadStateNetwork(){', 'winner load rename')
winner_prefix = winner.split('  function scheduleLoad(){', 1)[0]
winner_tail = r'''  function syncFromSnapshot(){
    var st=window.__TOM_ENTRY_STATE__;
    if(!st||!st.progress)return false;
    userId=st.user_id||userId;
    progressById={};
    var ps=st.progress||{};
    for(var id in ps)if(Object.prototype.hasOwnProperty.call(ps,id))progressById[id]=ps[id];
    return true;
  }

  function start(){
    injectStyle();
    document.addEventListener('tom:entry-state',function(){syncFromSnapshot();});
    document.addEventListener('tom:cards-rendered',function(e){
      if(e&&e.detail&&e.detail.view&&e.detail.view!=='member')return;
      if(syncFromSnapshot())applyDom();else loadStateNetwork();
    });
    if(syncFromSnapshot())applyDom();else loadStateNetwork();
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&syncFromSnapshot())applyDom();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
})();
'''
winner = winner_prefix + winner_tail
(root / 'winner-deadlines-event-v2.56.js').write_text(winner, encoding='utf-8')

# -----------------------------------------------------------------------------
# Winner top deadline chips: same snapshot, and update when the winner panel says
# it has rendered. No full-document observer and no 12s polling.
# -----------------------------------------------------------------------------
wtop = (root / 'winner-top-deadlines-fast-v2.39.js').read_text(encoding='utf-8')
wtop = must_replace(wtop, '  function loadState(){', '  function loadStateNetwork(){', 'winner top load rename')
wtop_prefix = wtop.split('  var observer=new MutationObserver', 1)[0]
wtop_tail = r'''  function syncFromSnapshot(){
    var st=window.__TOM_ENTRY_STATE__;
    if(!st||!st.lotteries)return false;
    userId=st.user_id||userId;
    lotteries=st.lotteries||[];
    progressById={};
    var ps=st.progress||{};
    for(var id in ps)if(Object.prototype.hasOwnProperty.call(ps,id))progressById[id]=ps[id];
    return true;
  }

  function start(){
    injectStyle();
    document.addEventListener('tom:entry-state',function(){if(syncFromSnapshot())scheduleApply();});
    document.addEventListener('tom:winners-rendered',function(){if(syncFromSnapshot())scheduleApply();});
    document.addEventListener('tom:cards-rendered',function(){if(syncFromSnapshot())scheduleApply();});
    if(syncFromSnapshot())scheduleApply();else loadStateNetwork();
    setTimeout(function(){if(syncFromSnapshot())scheduleApply();},700);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
})();
'''
wtop = wtop_prefix + wtop_tail
(root / 'winner-top-deadlines-event-v2.56.js').write_text(wtop, encoding='utf-8')

# Use the event-driven replacements in the release HTML.
html = must_replace(html, '<script src="./compat/progress-polish-fast-v2.39.js?v=2.39.0"></script>', '<script src="./compat/progress-polish-event-v2.56.js?v=2.56.0"></script>', 'progress polish script')
html = must_replace(html, '<script src="./swipe-archive-v2.35.js?v=2.35.1"></script>', '<script src="./swipe-archive-fast-v2.56.js?v=2.56.0"></script>', 'swipe script')
html = must_replace(html, '<script src="./winner-deadlines-fast-v2.39.js?v=2.39.0"></script>', '<script src="./winner-deadlines-event-v2.56.js?v=2.56.0"></script>', 'winner deadline script')
html = must_replace(html, '<script src="./winner-top-deadlines-fast-v2.39.js?v=2.39.0"></script>', '<script src="./winner-top-deadlines-event-v2.56.js?v=2.56.0"></script>', 'winner top script')

# Safety checks: the release must not accidentally reference the old heavy files.
for old_ref in [
    './compat/progress-polish-fast-v2.39.js',
    './swipe-archive-v2.35.js',
    './winner-deadlines-fast-v2.39.js',
    './winner-top-deadlines-fast-v2.39.js',
]:
    if old_ref in html:
        raise SystemExit('old heavy script still referenced: ' + old_ref)

checks = {
    root / 'swipe-archive-fast-v2.56.js': ['observer.observe(document.documentElement', 'setInterval(loadState'],
    root / 'winner-deadlines-event-v2.56.js': ['observer.observe(document.documentElement', 'setInterval(loadState'],
    root / 'winner-top-deadlines-event-v2.56.js': ['observer.observe(document.documentElement', 'setInterval(loadState'],
    root / 'compat/progress-polish-event-v2.56.js': ['setInterval(load, 2e4)', 'document.addEventListener("change", () => setTimeout(load, 80)'],
}
for path, banned in checks.items():
    text = path.read_text(encoding='utf-8')
    for marker in banned:
        if marker in text:
            raise SystemExit('%s still contains banned marker: %s' % (path, marker))

(root / 'preview-v2.56.html').write_text(html, encoding='utf-8')

index = '''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0; url=./preview-v2.56.html?v=2561"><title>TOM エントリーマネージャー</title><script>location.replace('./preview-v2.56.html?v=2561');</script></head><body><p><a href="./preview-v2.56.html?v=2561">TOM エントリーマネージャー V2.56 を開く</a></p></body></html>'''
(root / 'index.html').write_text(index, encoding='utf-8')
print('V2.56 event-driven performance build complete')
