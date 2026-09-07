from pathlib import Path
import runpy
import re

runpy.run_path('scripts/build-v256.py', run_name='__main__')
root = Path('.')


def must_replace(text, old, new, label, count=1):
    found = text.count(old)
    if found < count:
        raise SystemExit('missing marker %s: found %s' % (label, found))
    return text.replace(old, new, count)

html = (root / 'preview-v2.56.html').read_text(encoding='utf-8')
html = html.replace('V2.56', 'V2.57')

# Core owns both opportunity-type and region visibility. This prevents a card
# from painting once and then being hidden by a later patch.
old_filter = '''    let entryTypeFilter = "all";
    try { entryTypeFilter = localStorage.getItem("tom_opportunity_type_filter_v242") || "all"; } catch (e) {}
    const filtered = lotteries.filter((x) => {
      const p = getProgress(x.id);
      const hay = "".concat(x.store, " ").concat(x.title).toLowerCase();
      return (!q || hay.includes(q)) && (activeCategory === "all" || hasCategory(x, activeCategory)) && (status === "all" || p.status === status) && (entryTypeFilter === "all" || (x.opportunity_type || "lottery") === entryTypeFilter);
    });'''
new_filter = '''    let entryTypeFilter = "all";
    try { entryTypeFilter = localStorage.getItem("tom_opportunity_type_filter_v242") || "all"; } catch (e) {}
    const preferredRegions = profile && Object.prototype.hasOwnProperty.call(profile, "preferred_prefectures") ? profile.preferred_prefectures : null;
    const filtered = lotteries.filter((x) => {
      const p = getProgress(x.id);
      let regionOk = true;
      if (!p.is_archived && p.status === "未応募" && x.fulfillment !== "全国配送") {
        const eligible = Array.isArray(x.eligible_prefectures) ? x.eligible_prefectures : [];
        if (eligible.length && preferredRegions !== null) {
          regionOk = false;
          if (Array.isArray(preferredRegions) && preferredRegions.length) {
            for (let ri = 0; ri < eligible.length; ri++) {
              if (preferredRegions.indexOf(eligible[ri]) >= 0) { regionOk = true; break; }
            }
          }
        }
      }
      const hay = "".concat(x.store, " ").concat(x.title).toLowerCase();
      return regionOk && (!q || hay.includes(q)) && (activeCategory === "all" || hasCategory(x, activeCategory)) && (status === "all" || p.status === status) && (entryTypeFilter === "all" || (x.opportunity_type || "lottery") === entryTypeFilter);
    });'''
html = must_replace(html, old_filter, new_filter, 'core region/type filter')

# Old progress polish used fuzzy title/store matching and directly hid archived
# cards. Core V2.54+ already owns archive membership, so decoration must never
# change card visibility.
progress = (root / 'compat/progress-polish-event-v2.56.js').read_text(encoding='utf-8')
progress = re.sub(
    r'    function findCard\(lottery\) \{.*?\n    \}\n    function renderWinners\(\) \{',
    '''    function findCard(lottery) {
      if (!lottery) return null;
      const id = String(lottery.id || "");
      const buttons = document.querySelectorAll("#lotteryList [data-open],#archiveList [data-open]");
      for (let i = 0; i < buttons.length; i++) {
        if (String(buttons[i].getAttribute("data-open") || "") === id) {
          return buttons[i].closest ? (buttons[i].closest(".lottery-row") || buttons[i].closest("article")) : buttons[i].parentNode;
        }
      }
      return null;
    }
    function renderWinners() {''',
    progress,
    count=1,
    flags=re.S,
)
progress, removed = re.subn(
    r'\n        if \(p\.is_archived\) \{.*?\n        \}\n        if \(card\.dataset\.tomArchivedHidden === "1"\) \{.*?\n        \}',
    '',
    progress,
    count=1,
    flags=re.S,
)
if removed != 1:
    raise SystemExit('progress archive visibility block not found')
(root / 'compat/progress-polish-safe-v2.57.js').write_text(progress, encoding='utf-8')

# Opportunity patch becomes decoration/status UI only. Core already renders only
# the selected type, so a fuzzy secondary filter must never hide a valid card.
opp = (root / 'opportunity-types-fast-v2.55.js').read_text(encoding='utf-8')
opp = must_replace(
    opp,
    '''  function findLotteryForRow(row){
    var text=compact(row&&row.textContent),best=null,bestScore=0;''',
    '''  function findLotteryForRow(row){
    var open=row&&row.querySelector('[data-open]');
    var exactId=open&&open.getAttribute('data-open');
    var exact=exactId&&byId(exactId);
    if(exact)return exact;
    var text=compact(row&&row.textContent),best=null,bestScore=0;''',
    'opportunity exact row id',
)
opp = re.sub(
    r"  function applyFilter\(row,l\)\{\n.*?\n  \}",
    "  function applyFilter(row,l){if(row)row.classList.remove('tom-type-hidden-v242');}",
    opp,
    count=1,
    flags=re.S,
)
(root / 'opportunity-types-safe-v2.57.js').write_text(opp, encoding='utf-8')

# Region patch keeps settings/chips, but no longer hides rows after paint.
region = (root / 'regions-archive-fast-v2.55.js').read_text(encoding='utf-8')
region = re.sub(
    r'  function applyMemberFilter\(\)\{\n.*?\n  \}\n  function updateSummary\(\)\{\}',
    '''  function applyMemberFilter(){
    var rows=document.querySelectorAll('#lotteryList .lottery-row');
    for(var i=0;i<rows.length;i++){
      var row=rows[i],id=rowId(row),l=lotteryMap[id];if(!id||!l)continue;
      decorateRegionChip(row,l);
      row.classList.remove('tom-region-hidden-v240');
      var unit=cardUnit(row);if(unit)unit.classList.remove('tom-region-hidden-v240');
    }
  }
  function updateSummary(){}''',
    region,
    count=1,
    flags=re.S,
)
(root / 'regions-archive-safe-v2.57.js').write_text(region, encoding='utf-8')

html = must_replace(html, '<script src="./compat/progress-polish-event-v2.56.js?v=2.56.0"></script>', '<script src="./compat/progress-polish-safe-v2.57.js?v=2.57.0"></script>', 'safe progress ref')
html = must_replace(html, '<script src="./opportunity-types-fast-v2.55.js?v=2.55.0"></script>', '<script src="./opportunity-types-safe-v2.57.js?v=2.57.0"></script>', 'safe opportunity ref')
html = must_replace(html, '<script src="./regions-archive-fast-v2.55.js?v=2.55.0"></script>', '<script src="./regions-archive-safe-v2.57.js?v=2.57.0"></script>', 'safe region ref')

# Release safety checks.
for bad in ['card.style.display = "none"', "classList.add('tom-type-hidden-v242')", "classList.add('tom-region-hidden-v240')"]:
    for p in [root / 'compat/progress-polish-safe-v2.57.js', root / 'opportunity-types-safe-v2.57.js', root / 'regions-archive-safe-v2.57.js']:
        if bad in p.read_text(encoding='utf-8'):
            raise SystemExit('%s still contains visibility mutation: %s' % (p, bad))

(root / 'preview-v2.57.html').write_text(html, encoding='utf-8')
index = '''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0; url=./preview-v2.57.html?v=2571"><title>TOM エントリーマネージャー</title><script>location.replace('./preview-v2.57.html?v=2571');</script></head><body><p><a href="./preview-v2.57.html?v=2571">TOM エントリーマネージャー V2.57 を開く</a></p></body></html>'''
(root / 'index.html').write_text(index, encoding='utf-8')
print('V2.57 core-owned visibility build complete')
