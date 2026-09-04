from pathlib import Path

src = Path('preview-v2.50.html').read_text(encoding='utf-8')
html = src.replace('V2.50', 'V2.51')

def replace_once(old, new, label):
    global html
    if old not in html:
        raise SystemExit('missing marker: ' + label)
    html = html.replace(old, new, 1)

# Result-date styling. The existing red "today" style is reused when the result moment has passed.
style = '''<style id="tom-result-style-v251">
.deadline-box.result-mode .deadline-label{font-size:0}
.deadline-box.result-mode .deadline-label::after{content:'結果発表';font-size:9px;font-weight:900;letter-spacing:.04em}
.deadline-box.result-missing{background:#fff7e8;border-color:#e1b949;color:#8a6500}
.deadline-box.result-missing .deadline-left{color:#8a6500}
.deadline-box.result-missing .deadline-date{font-size:18px;letter-spacing:0}
</style>
'''
replace_once('</head>', style + '</head>', 'head style')

# New-entry result announcement fields (lottery only; visibility is controlled by V2.51 UI helper).
old = '''                <label class="field"><span>締切時刻</span><input class="control" id="pDeadlineTime" type="time"></label>'''
new = '''                <label class="field"><span>締切時刻</span><input class="control" id="pDeadlineTime" type="time"></label>
                <label class="field tom-preview-result-field"><span>結果発表日（抽選のみ）</span><div class="date-wrap"><input id="pResultDate" type="date"></div></label>
                <label class="field tom-preview-result-field"><span>結果発表時刻</span><input class="control" id="pResultTime" type="time"></label>'''
replace_once(old, new, 'preview result fields')

# Edit result announcement fields.
old = '''        <label class="field"><span>締切時刻</span><input class="control" id="eDeadlineTime" type="time"></label>'''
new = '''        <label class="field"><span>締切時刻</span><input class="control" id="eDeadlineTime" type="time"></label>
        <label class="field tom-edit-result-field"><span>結果発表日（抽選のみ）</span><div class="date-wrap"><input id="eResultDate" type="date"></div></label>
        <label class="field tom-edit-result-field"><span>結果発表時刻</span><input class="control" id="eResultTime" type="time"></label>'''
replace_once(old, new, 'edit result fields')

# Keep opportunity metadata + result fields in the core normalized object.
old = '''      deadline_time: cleanTime(x.deadline_time),'''
new = '''      deadline_time: cleanTime(x.deadline_time),
      result_announcement_date: x.result_announcement_date || null,
      result_announcement_time: cleanTime(x.result_announcement_time),
      opportunity_type: x.opportunity_type || "lottery",
      payment_timing: x.payment_timing || "unknown",
      payment_amount: x.payment_amount === null || x.payment_amount === undefined ? null : x.payment_amount,
      shipping_estimate: x.shipping_estimate || null,'''
replace_once(old, new, 'normalize result metadata')

# Parse explicit result-announcement lines from pasted lottery information.
helper = r'''  function detectResultAnnouncement(text, deadlineDate) {
    const lines = String(text || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    let date = "", time = "";
    for (const line of lines) {
      if (!/結果発表|当選発表|当落発表|抽選結果|当落結果/.test(line)) continue;
      let m = line.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/);
      if (!m) m = line.match(/(?:(\d{4})[\/.\-])?(\d{1,2})[\/.\-](\d{1,2})/);
      if (m) {
        const base = deadlineDate || todayJST();
        let year = m[1] ? Number(m[1]) : Number(base.slice(0, 4));
        const month = Number(m[2]), day = Number(m[3]), baseMonth = Number(base.slice(5, 7));
        if (!m[1] && deadlineDate && month < baseMonth - 6) year++;
        date = "".concat(year, "-").concat(String(month).padStart(2, "0"), "-").concat(String(day).padStart(2, "0"));
      }
      let tm = line.match(/([01]?\d|2[0-3])[:：]([0-5]\d)/);
      if (tm) time = "".concat(String(tm[1]).padStart(2, "0"), ":").concat(String(tm[2]).padStart(2, "0"));
      else {
        tm = line.match(/([01]?\d|2[0-3])時(?:(\d{1,2})分)?/);
        if (tm) time = "".concat(String(tm[1]).padStart(2, "0"), ":").concat(String(tm[2] || 0).padStart(2, "0"));
      }
      if (date) break;
    }
    return { date, time };
  }
'''
replace_once('  function parseSource(text) {', helper + '  function parseSource(text) {', 'result parser helper')
replace_once('''    const dates = detectDates(text);''', '''    const dates = detectDates(text);
    const resultAnnouncement = detectResultAnnouncement(text, dates.deadline);''', 'result parser call')
replace_once('''extra_requirement, note: notes.join(" / "), links };''', '''extra_requirement, result_announcement_date: resultAnnouncement.date || null, result_announcement_time: resultAnnouncement.time || null, note: notes.join(" / "), links };''', 'parseSource result return')

# Populate parsed result fields.
old = '''    $("pDeadlineTime").value = data.deadline_time || "";'''
new = '''    $("pDeadlineTime").value = data.deadline_time || "";
    $("pResultDate").value = data.result_announcement_date || "";
    $("pResultTime").value = data.result_announcement_time || "";'''
replace_once(old, new, 'fill preview result')

# Include result fields in new-entry payload only when the entry type is lottery.
old = '''  function previewPayload() {
    const categories = getCategorySelection("pCategorySelector");
    return {'''
new = '''  function previewPayload() {
    const categories = getCategorySelection("pCategorySelector");
    const previewTypeEl = $("pOpportunityType");
    const previewIsLottery = !previewTypeEl || previewTypeEl.value === "lottery";
    return {'''
replace_once(old, new, 'preview payload type')
old = '''      deadline_time: $("pDeadlineTime").value || null,'''
new = '''      deadline_time: $("pDeadlineTime").value || null,
      result_announcement_date: previewIsLottery ? ($("pResultDate").value || null) : null,
      result_announcement_time: previewIsLottery ? ($("pResultTime").value || null) : null,'''
replace_once(old, new, 'preview payload result fields')

# Persist result fields on creation.
old = '''      deadline_time: payload.deadline_time || null,
      fulfillment: payload.fulfillment,'''
new = '''      deadline_time: payload.deadline_time || null,
      result_announcement_date: payload.result_announcement_date || null,
      result_announcement_time: payload.result_announcement_time || null,
      fulfillment: payload.fulfillment,'''
replace_once(old, new, 'create result fields')

# Edit visibility: payment fields for non-lottery, result fields for lottery.
old = '''  function updateEditOpportunityFields() {
    const type = $("eOpportunityType") ? $("eOpportunityType").value : "lottery";
    const extra = $("eOpportunityExtraFields");
    if (extra) extra.classList.toggle("hidden", type === "lottery");
  }'''
new = '''  function updateEditOpportunityFields() {
    const type = $("eOpportunityType") ? $("eOpportunityType").value : "lottery";
    const extra = $("eOpportunityExtraFields");
    if (extra) extra.classList.toggle("hidden", type === "lottery");
    document.querySelectorAll(".tom-edit-result-field").forEach((el) => el.style.display = type === "lottery" ? "" : "none");
  }'''
replace_once(old, new, 'edit visibility')

# Populate edit result fields.
old = '''    $("eDeadlineTime").value = cleanTime(x.deadline_time);'''
new = '''    $("eDeadlineTime").value = cleanTime(x.deadline_time);
    $("eResultDate").value = x.result_announcement_date || "";
    $("eResultTime").value = cleanTime(x.result_announcement_time);'''
replace_once(old, new, 'open edit result')

# Include/persist result fields when editing.
old = '''      shipping_estimate: $("eOpportunityType").value === "lottery" ? null : ($("eShippingEstimate").value.trim() || null),
      store: $("eStore").value.trim()'''
new = '''      shipping_estimate: $("eOpportunityType").value === "lottery" ? null : ($("eShippingEstimate").value.trim() || null),
      result_announcement_date: $("eOpportunityType").value === "lottery" ? ($("eResultDate").value || null) : null,
      result_announcement_time: $("eOpportunityType").value === "lottery" ? ($("eResultTime").value || null) : null,
      store: $("eStore").value.trim()'''
replace_once(old, new, 'edit patch result')
old = '''      shipping_estimate: patch.shipping_estimate,
      store: patch.store,'''
new = '''      shipping_estimate: patch.shipping_estimate,
      result_announcement_date: patch.result_announcement_date,
      result_announcement_time: patch.result_announcement_time,
      store: patch.store,'''
replace_once(old, new, 'cloud update result')

# Result timing helper. On the result date, the box changes to "result check" after the specified time.
helper = r'''  function currentJSTMinutes() {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    let h = 0, m = 0;
    parts.forEach((p) => { if (p.type === "hour") h = Number(p.value === "24" ? "0" : p.value); if (p.type === "minute") m = Number(p.value); });
    return h * 60 + m;
  }
  function resultMomentPassed(date, time) {
    if (!date) return false;
    const today = todayJST();
    if (date < today) return true;
    if (date > today) return false;
    if (!time) return false;
    const t = cleanTime(time).split(":");
    if (t.length !== 2) return false;
    return currentJSTMinutes() >= Number(t[0]) * 60 + Number(t[1]);
  }
'''
replace_once('  function renderLotteryCard(item, adminMode) {', helper + '  function renderLotteryCard(item, adminMode) {', 'result moment helper')

old = '''    const p = getProgress(item.id);
    const cats = itemCategories(item);
    const primary = primaryCategory(item);
    const left = dayDiff(item.deadline_date);
    const deadlineState = left === 0 ? "today" : left === 1 ? "tomorrow" : left >= 2 && left <= 3 ? "soon" : "";
    const time = item.deadline_time ? cleanTime(item.deadline_time) : "";
    const weekday = weekdayInfo(item.deadline_date);'''
new = '''    const p = getProgress(item.id);
    const cats = itemCategories(item);
    const primary = primaryCategory(item);
    const isLotteryEntry = (item.opportunity_type || "lottery") === "lottery";
    const showResult = !adminMode && isLotteryEntry && p.status === "結果待ち";
    const displayDate = showResult ? item.result_announcement_date : item.deadline_date;
    const displayTimeRaw = showResult ? item.result_announcement_time : item.deadline_time;
    const left = displayDate ? dayDiff(displayDate) : 99999;
    const resultPassed = showResult && resultMomentPassed(displayDate, displayTimeRaw);
    const stateBase = showResult && !displayDate ? "result-missing" : resultPassed ? "today" : left === 0 ? "today" : left === 1 ? "tomorrow" : left >= 2 && left <= 3 ? "soon" : "";
    const deadlineState = (showResult ? "result-mode " : "") + stateBase;
    const time = displayTimeRaw ? cleanTime(displayTimeRaw) : "";
    const weekday = weekdayInfo(displayDate);
    const deadlineDateText = showResult && !displayDate ? "未入力" : fmtDate(displayDate);
    const deadlineLeftText = showResult ? (!displayDate ? "要確認" : resultPassed ? "結果確認" : left === 0 ? "本日発表" : "あと".concat(left, "日")) : (left < 0 ? "終了" : left === 0 ? "本日" : "あと".concat(left, "日"));'''
replace_once(old, new, 'card result calculations')

# Closed-card date uses deadline before application, then result announcement while waiting.
replace_once('''').concat(fmtDate(item.deadline_date), "</div>")''', '''').concat(esc(deadlineDateText), "</div>")''', 'card display date')
old = r''').concat(left < 0 ? "\u7D42\u4E86" : left === 0 ? "\u672C\u65E5" : "\u3042\u3068".concat(left, "\u65E5"), '</div>'''
new = r''').concat(esc(deadlineLeftText), '</div>'''
replace_once(old, new, 'card display status')

# Improve helper copy for lottery result parsing.
html = html.replace('案件種別・主催/店舗・商品名・受付期間・締切・支払・発送予定・URLを自動認識します。', '案件種別・主催/店舗・商品名・受付期間・締切・結果発表・支払・発送予定・URLを自動認識します。')

# V2.51 UI helper is loaded after the existing parser/type patches.
patch = '\n<script src="./lottery-result-ui-v2.51.js?v=2.51.0"></script>\n'
if 'lottery-result-ui-v2.51.js' not in html:
    html = html.replace('</body>', patch + '</body>')

Path('preview-v2.51.html').write_text(html, encoding='utf-8')

index = '''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0; url=./preview-v2.51.html?v=2511"><title>TOM エントリーマネージャー</title><script>location.replace('./preview-v2.51.html?v=2511');</script></head><body><p><a href="./preview-v2.51.html?v=2511">TOM エントリーマネージャー V2.51 を開く</a></p></body></html>'''
Path('index.html').write_text(index, encoding='utf-8')
