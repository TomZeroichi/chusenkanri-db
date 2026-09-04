(function(){
  'use strict';

  var CONFIG_KEY='tom_lottery_supabase_config_v2';
  var STYLE_ID='tom-entry-parser-style-v246';
  var PANEL_ID='tom-entry-parser-panel-v246';
  var STATUS_ID='tom-entry-analysis-status-v246';
  var pendingSave=null;
  var client=null;

  var TYPES={
    lottery:{label:'抽選',icon:'🎯'},
    all_applicants:{label:'応募者全員サービス',icon:'🎁'},
    preorder:{label:'期間限定受注',icon:'🛒'},
    campaign:{label:'キャンペーン',icon:'🎫'}
  };

  function byId(id){return document.getElementById(id);}
  function norm(v){return String(v||'').replace(/\r/g,'').trim();}
  function lines(text){return norm(text).split(/\n+/).map(function(x){return x.trim();}).filter(Boolean);}
  function z(n){return String(n).padStart(2,'0');}
  function nowYear(){return new Date().getFullYear();}
  function isoDate(y,m,d){
    y=Number(y)||nowYear();m=Number(m);d=Number(d);
    if(!m||!d)return '';
    return y+'-'+z(m)+'-'+z(d);
  }
  function dateFromMatch(y,m,d){
    var year=Number(y)||nowYear();
    if(!y){
      var now=new Date(),cm=now.getMonth()+1;
      if(Number(m)<cm-6)year++;
    }
    return isoDate(year,m,d);
  }
  function escText(s){return String(s||'').replace(/\s+/g,' ').trim();}

  function ensureClient(){
    if(client)return client;
    var cfg=null;
    try{cfg=JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');}catch(e){}
    if(!cfg||!cfg.url||!cfg.key||!window.__TOM_SUPABASE__||!window.__TOM_SUPABASE__.createClient)return null;
    client=window.__TOM_SUPABASE__.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }

  function injectStyle(){
    if(byId(STYLE_ID))return;
    var s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='\
#'+PANEL_ID+'{grid-column:1/-1;border:1px solid #cfd9e8;background:#f8fbff;border-radius:13px;padding:11px;margin-bottom:2px}\
#'+PANEL_ID+' .tom-ep-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}\
#'+PANEL_ID+' .tom-ep-title{font-size:12px;font-weight:1000;color:#34445a}\
#'+PANEL_ID+' .tom-ep-detected{font-size:10px;font-weight:1000;border-radius:999px;padding:5px 8px;background:#edf3fb;color:#466079}\
#'+PANEL_ID+' .tom-ep-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}\
#'+PANEL_ID+' .tom-ep-field span{display:block;font-size:10px;font-weight:900;color:#69768a;margin-bottom:5px}\
#'+PANEL_ID+' .tom-ep-extra{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}\
#'+STATUS_ID+'{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}\
#'+STATUS_ID+' .ok,#'+STATUS_ID+' .warn{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:1000}\
#'+STATUS_ID+' .ok{background:#eaf8f1;border:1px solid #b9e2ce;color:#177650}\
#'+STATUS_ID+' .warn{background:#fff7e8;border:1px solid #efd79e;color:#8b6500}\
.tom-entry-brand-sub{font-size:10px!important;color:#748195!important;margin-top:2px!important}\
@media(max-width:520px){#'+PANEL_ID+' .tom-ep-grid,#'+PANEL_ID+' .tom-ep-extra{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  function renameUi(){
    document.title='TOM エントリーマネージャー V2.46';
    var h=document.querySelector('.header-title h1');if(h)h.textContent='TOM エントリーマネージャー';
    var sub=document.querySelector('.header-title p');if(sub){sub.textContent='抽選・応募・限定受注・キャンペーンをまとめて管理';sub.classList.add('tom-entry-brand-sub');}
    var memberHead=document.querySelector('#memberView .list-head h2');if(memberHead)memberHead.textContent='エントリー一覧';
    var empty=byId('emptyState');if(empty)empty.textContent='該当するエントリーがありません。';
    var adminNotice=document.querySelector('#adminView > .notice');if(adminNotice)adminNotice.textContent='運営が編集するのは「エントリー情報そのもの」です。会員ごとの応募・当選・注文・受取などの進捗は個別データとして保持されます。';
    var adminBtn=document.querySelector('[data-admin-section="lotteries"]');if(adminBtn)adminBtn.textContent='エントリー管理';
    var addTitle=document.querySelector('#addCard .add-head h3');if(addTitle)addTitle.textContent='新しいエントリーを追加';
    var addSub=document.querySelector('#addCard .add-head p');if(addSub)addSub.textContent='投稿文・案内文をそのまま貼り付けて解析';
    var src=byId('sourceText');if(src)src.placeholder='抽選・全員サービス・限定受注・キャンペーン情報をここに貼り付けてください';
    var helpers=document.querySelectorAll('#addCard .add-body > .helper');
    if(helpers[0])helpers[0].textContent='案件種別・主催/店舗・商品名・受付期間・締切・支払・発送予定・URLを自動認識します。';
    if(helpers[1])helpers[1].textContent='解析できなかった項目は「未確認」で表示します。内容を確認してから登録してください。';
    var adminHead=document.querySelector('#adminLotteries > .list-head h2');if(adminHead)adminHead.textContent='運営登録済みエントリー';
    var editHead=document.querySelector('#editBackdrop .modal-head h3');if(editHead)editHead.textContent='エントリー情報を編集（運営共通）';
  }

  function ensurePanel(){
    var grid=document.querySelector('#previewArea .field-grid');if(!grid)return null;
    var p=byId(PANEL_ID);if(p)return p;
    p=document.createElement('section');p.id=PANEL_ID;
    p.innerHTML='<div class="tom-ep-head"><div class="tom-ep-title">自動判定</div><div class="tom-ep-detected" id="tomEntryDetected">解析待ち</div></div>'+
      '<div class="tom-ep-grid">'+
      '<label class="tom-ep-field"><span>案件種別</span><select class="control" id="pOpportunityType"><option value="lottery">🎯 抽選</option><option value="all_applicants">🎁 応募者全員サービス</option><option value="preorder">🛒 期間限定受注</option><option value="campaign">🎫 キャンペーン</option></select></label>'+
      '<label class="tom-ep-field"><span>支払タイミング</span><select class="control" id="pPaymentTiming"><option value="unknown">未確認</option><option value="application">応募・注文時に支払</option><option value="after_application">応募・注文後に支払</option><option value="cod">商品到着時（代引）</option><option value="free">無料</option></select></label>'+ 
      '</div>'+
      '<div class="tom-ep-extra" id="tomEntryExtraFields">'+
      '<label class="tom-ep-field"><span>負担金・商品代金（円）</span><input class="control" id="pPaymentAmount" type="number" min="0" inputmode="numeric" placeholder="未確認"></label>'+
      '<label class="tom-ep-field"><span>発送・お届け予定</span><input class="control" id="pShippingEstimate" placeholder="例：12月頃 / 応募後2〜3か月"></label>'+ 
      '</div><div id="'+STATUS_ID+'"></div>';
    grid.insertBefore(p,grid.firstChild);
    byId('pOpportunityType').addEventListener('change',function(){updatePanelVisibility();renderChecks(lastParsed||{});});
    updatePanelVisibility();
    return p;
  }

  function updatePanelVisibility(){
    var type=byId('pOpportunityType')?byId('pOpportunityType').value:'lottery';
    var pay=byId('pPaymentTiming');
    var extra=byId('tomEntryExtraFields');
    if(pay)pay.parentNode.style.display=(type==='lottery'?'none':'block');
    if(extra)extra.style.display=(type==='lottery'?'none':'grid');
  }

  function detectType(text){
    var t=norm(text);
    if(/応募者全員(?:大)?サービス|応募者全員プレゼント|全員サービス|全員応募サービス/.test(t))return {type:'all_applicants',reason:'「応募者全員サービス」を検出'};
    if(/キャンペーン|プレゼント企画|レシート応募|シリアル(?:コード)?応募|購入者限定応募|応募して当たる/.test(t))return {type:'campaign',reason:'キャンペーン応募表現を検出'};
    if(/期間限定受注|受注生産|受注販売|予約受付|予約販売|予約受注|受注受付/.test(t) && !/抽選販売|抽選受付|抽選応募/.test(t))return {type:'preorder',reason:'受注・予約販売表現を検出'};
    if(/抽選|当選発表|抽選販売|抽選受付/.test(t))return {type:'lottery',reason:'抽選表現を検出'};
    return {type:'lottery',reason:'種別を特定できないため「抽選」で仮登録'};
  }

  function parseDateToken(s){
    var m=String(s||'').match(/(?:(\d{4})年[\/.\-]?)?(\d{1,2})月(\d{1,2})日/);
    if(!m)m=String(s||'').match(/(?:(\d{4})[\/.\-])?(\d{1,2})[\/.\-](\d{1,2})/);
    return m?dateFromMatch(m[1],m[2],m[3]):'';
  }
  function parseTime(s){
    var m=String(s||'').match(/([01]?\d|2[0-3])[:：]([0-5]\d)/);if(m)return z(m[1])+':'+z(m[2]);
    m=String(s||'').match(/([01]?\d|2[0-3])時(?:(\d{1,2})分)?/);if(m)return z(m[1])+':'+z(m[2]||0);
    return '';
  }
  function parseDateInfo(text){
    var ls=lines(text),start='',deadline='',deadlineTime='';
    for(var i=0;i<ls.length;i++){
      var line=ls[i];
      var range=line.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日[^\n]{0,20}?[～〜~\-ー]\s*(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/);
      if(range && /期間|受付|応募|申込|予約|受注|販売/.test(line)){
        if(!start)start=dateFromMatch(range[1],range[2],range[3]);
        deadline=dateFromMatch(range[4],range[5],range[6]);
        deadlineTime=parseTime(line);
      }
    }
    for(var j=0;j<ls.length;j++){
      var l=ls[j];
      if(!deadline && /締切|期限|受付終了|応募終了|申込終了|予約終了|受注終了|販売終了|まで/.test(l)){
        var d=parseDateToken(l);if(d){deadline=d;deadlineTime=parseTime(l);}
      }
      if(!start && /受付開始|応募開始|申込開始|予約開始|受注開始|販売開始|開始日/.test(l)){
        var st=parseDateToken(l);if(st)start=st;
      }
    }
    return {start:start,deadline:deadline,time:deadlineTime};
  }

  function parsePayment(text,type){
    var t=norm(text),timing='unknown',amount=null;
    if(/商品到着時|到着時.*支払|代金引換|代引/.test(t))timing='cod';
    else if(/無料|応募者負担なし|参加費無料/.test(t))timing='free';
    else if(/応募後.{0,18}(?:日|週間|週).*以内.*(?:支払|決済)|申込後.{0,18}(?:日|週間|週).*以内.*(?:支払|決済)|注文後.{0,18}(?:支払|決済)/.test(t))timing='after_application';
    else if(/応募時.*(?:支払|決済)|申込時.*(?:支払|決済)|注文時.*(?:支払|決済)|予約時.*(?:支払|決済)|事前決済/.test(t))timing='application';
    var patterns=[/応募者負担金\s*[:：]?\s*[¥￥]?\s*([\d,]+)\s*円/i,/負担金\s*[:：]?\s*[¥￥]?\s*([\d,]+)\s*円/i,/販売価格\s*[:：]?\s*[¥￥]?\s*([\d,]+)\s*円/i,/商品代金\s*[:：]?\s*[¥￥]?\s*([\d,]+)\s*円/i,/価格\s*[:：]?\s*[¥￥]?\s*([\d,]+)\s*円/i,/参加費\s*[:：]?\s*[¥￥]?\s*([\d,]+)\s*円/i];
    for(var i=0;i<patterns.length&&!amount;i++){
      var m=t.match(patterns[i]);if(m)amount=Number(m[1].replace(/,/g,''));
    }
    if(type==='lottery')timing='unknown';
    return {timing:timing,amount:amount};
  }

  function parseShipping(text){
    var ls=lines(text);
    for(var i=0;i<ls.length;i++){
      if(/発送予定|発送時期|お届け予定|お届け時期|発送は|発送開始|出荷予定/.test(ls[i]))return escText(ls[i].replace(/^.*?(発送予定|発送時期|お届け予定|お届け時期|発送開始|出荷予定)\s*[:：]?\s*/,'')).slice(0,80);
    }
    var m=norm(text).match(/(?:発送|お届け)[^。\n]{0,8}(\d{1,2}月(?:上旬|中旬|下旬|頃|予定)?)/);return m?m[1]:'';
  }

  function parseProvider(text,type){
    var t=norm(text);
    var known=['Vジャンプ','週刊少年ジャンプ','最強ジャンプ','コロコロコミック','月刊コロコロコミック','ちゃお','ポケモンセンターオンライン','プレミアムバンダイ','タカラトミーモール','Joshin','ジョーシン'];
    for(var i=0;i<known.length;i++)if(t.indexOf(known[i])>=0)return known[i];
    var ls=lines(text);
    for(var j=0;j<Math.min(ls.length,6);j++)if(ls[j].length<=35&&!/期間|締切|応募|受付|価格|円|http|抽選販売/.test(ls[j]))return ls[j];
    return '';
  }

  function isMetaLine(s){return /^(?:応募|申込|受付|販売|予約|受注)?(?:期間|締切|期限|開始|終了)|発送|お届け|価格|負担金|商品代金|支払|決済|応募方法|申込方法|対象店舗|会員|http|※|\d{1,2}月\d{1,2}日/.test(s);}
  function parseTitle(text,type,provider,current){
    var cur=norm(current);
    if(cur && cur!=='抽選商品' && cur!=='エントリー商品')return cur;
    var ls=lines(text),markers=type==='all_applicants'?/応募者全員(?:大)?サービス|全員サービス/:type==='preorder'?/期間限定受注|受注販売|予約販売|予約受付/:type==='campaign'?/キャンペーン|プレゼント企画/:/抽選販売|抽選受付/;
    var marker=-1;
    for(var i=0;i<ls.length;i++)if(markers.test(ls[i])){marker=i;break;}
    var candidates=marker>=0?ls.slice(marker+1):ls;
    for(var j=0;j<candidates.length;j++){
      var s=candidates[j];if(!s||s===provider||isMetaLine(s)||/^https?:/.test(s))continue;
      if(s.length>=4&&s.length<=120)return s;
    }
    for(var k=0;k<ls.length;k++){var x=ls[k];if(x!==provider&&!isMetaLine(x)&&!/^https?:/.test(x)&&x.length>=4&&x.length<=120)return x;}
    return cur||'エントリー商品';
  }

  function parseExtras(text,type){
    var ls=lines(text),out=[];
    if(type==='all_applicants'){
      for(var i=0;i<ls.length;i++)if(/Vジャンプ|週刊少年ジャンプ|最強ジャンプ|コロコロ|雑誌|\d+月号/.test(ls[i])&&ls[i].length<90){out.push('対象誌: '+ls[i]);break;}
    }
    if(type==='campaign'){
      for(var j=0;j<ls.length;j++)if(/賞品|プレゼント内容/.test(ls[j])){out.push(escText(ls[j]));break;}
      for(var k=0;k<ls.length;k++)if(/当選.*(?:名|人)|\d+名様/.test(ls[k])){out.push(escText(ls[k]));break;}
    }
    return out;
  }

  var lastParsed=null;
  function parseEntry(text){
    var det=detectType(text),di=parseDateInfo(text),pay=parsePayment(text,det.type),shipping=parseShipping(text),provider=parseProvider(text,det.type);
    return {type:det.type,reason:det.reason,start:di.start,deadline:di.deadline,time:di.time,payment_timing:pay.timing,payment_amount:pay.amount,shipping:shipping,provider:provider,extras:parseExtras(text,det.type)};
  }

  function setIf(id,value,force){var el=byId(id);if(el&&(force||!el.value)&&value!==undefined&&value!==null&&value!=='')el.value=value;}
  function appendNotes(extra){
    if(!extra||!extra.length)return;
    var n=byId('pNote');if(!n)return;
    var existing=norm(n.value),parts=existing?existing.split(/\n+/):[];
    extra.forEach(function(x){if(parts.indexOf(x)<0)parts.push(x);});
    n.value=parts.join('\n');
  }

  function applyParsed(text){
    ensurePanel();
    var p=parseEntry(text);lastParsed=p;
    var typeEl=byId('pOpportunityType');if(typeEl)typeEl.value=p.type;
    var meta=TYPES[p.type]||TYPES.lottery;
    var det=byId('tomEntryDetected');if(det)det.textContent=meta.icon+' '+meta.label+'｜'+p.reason;
    setIf('pStart',p.start,false);
    setIf('pDeadline',p.deadline,false);
    setIf('pDeadlineTime',p.time,false);
    if(p.provider){var store=byId('pStore');if(store&&(!store.value||store.value==='店舗未設定'))store.value=p.provider;}
    var title=parseTitle(text,p.type,p.provider,byId('pTitle')&&byId('pTitle').value);if(title)setIf('pTitle',title,true);
    if(byId('pPaymentTiming'))byId('pPaymentTiming').value=p.payment_timing||'unknown';
    if(byId('pPaymentAmount'))byId('pPaymentAmount').value=p.payment_amount===null||p.payment_amount===undefined?'':String(p.payment_amount);
    if(byId('pShippingEstimate'))byId('pShippingEstimate').value=p.shipping||'';
    appendNotes(p.extras);
    updatePanelVisibility();renderChecks(p);
  }

  function addCheck(label,ok){var host=byId(STATUS_ID);if(!host)return;var s=document.createElement('span');s.className=ok?'ok':'warn';s.textContent=(ok?'✅ ':'⚠️ ')+label+(ok?'':' 未確認');host.appendChild(s);}
  function renderChecks(p){
    var host=byId(STATUS_ID);if(!host)return;host.innerHTML='';
    var type=byId('pOpportunityType')?byId('pOpportunityType').value:(p.type||'lottery');
    addCheck('種別',!!type);
    addCheck('タイトル',!!(byId('pTitle')&&norm(byId('pTitle').value)));
    addCheck('締切',!!(byId('pDeadline')&&byId('pDeadline').value));
    addCheck('応募/申込方法',!!(byId('pApplyMethod')&&byId('pApplyMethod').value&&byId('pApplyMethod').value!=='未確認'));
    if(type==='all_applicants'||type==='preorder'){
      addCheck('支払時期',!!(byId('pPaymentTiming')&&byId('pPaymentTiming').value!=='unknown'));
      addCheck('金額',!!(byId('pPaymentAmount')&&byId('pPaymentAmount').value));
      addCheck('発送予定',!!(byId('pShippingEstimate')&&norm(byId('pShippingEstimate').value)));
    }
  }

  function validateBeforeSave(e){
    var preview=byId('previewArea');if(!preview||!preview.classList.contains('show'))return;
    ensurePanel();
    if(!byId('pDeadline')||!byId('pDeadline').value){
      e.preventDefault();e.stopImmediatePropagation();
      alert('締切日を自動取得できませんでした。\n「締切日」を確認して入力してから登録してください。');
      renderChecks(lastParsed||{});return;
    }
    var type=byId('pOpportunityType')?byId('pOpportunityType').value:'lottery';
    pendingSave={
      started:Date.now(),
      title:byId('pTitle')?norm(byId('pTitle').value):'',
      store:byId('pStore')?norm(byId('pStore').value):'',
      deadline:byId('pDeadline').value,
      type:type,
      payment_timing:byId('pPaymentTiming')?byId('pPaymentTiming').value:'unknown',
      payment_amount:byId('pPaymentAmount')&&byId('pPaymentAmount').value!==''?Number(byId('pPaymentAmount').value):null,
      shipping_estimate:byId('pShippingEstimate')?norm(byId('pShippingEstimate').value)||null:null,
      tries:0
    };
    setTimeout(syncPending,350);
  }

  function syncPending(){
    if(!pendingSave)return;
    var c=ensureClient();if(!c){pendingSave=null;return;}
    var p=pendingSave;p.tries++;
    c.auth.getSession().then(function(r){
      var session=r&&r.data&&r.data.session;if(!session||!session.user)throw new Error('no session');
      var q=c.from('lotteries').select('id,title,store,deadline_date,created_at').eq('created_by',session.user.id).eq('title',p.title).eq('store',p.store).eq('deadline_date',p.deadline).gte('created_at',new Date(p.started-5000).toISOString()).order('created_at',{ascending:false}).limit(1);
      return q;
    }).then(function(r){
      if(r&&r.error)throw r.error;
      var row=r&&r.data&&r.data[0];
      if(!row){if(p.tries<9)setTimeout(syncPending,Math.min(300+p.tries*250,1800));else pendingSave=null;return null;}
      return c.from('lotteries').update({opportunity_type:p.type,payment_timing:p.payment_timing,payment_amount:p.payment_amount,shipping_estimate:p.shipping_estimate,updated_at:new Date().toISOString()}).eq('id',row.id);
    }).then(function(r){if(r&&r.error)throw r.error;if(r)pendingSave=null;}).catch(function(err){
      console.warn('[TOM V2.46] entry metadata sync failed',err);
      if(pendingSave&&pendingSave.tries<9)setTimeout(syncPending,1000);else pendingSave=null;
    });
  }

  function bind(){
    injectStyle();renameUi();ensurePanel();
    var analyze=byId('analyzeBtn');
    if(analyze&&!analyze.getAttribute('data-tom-entry-bound')){
      analyze.setAttribute('data-tom-entry-bound','1');
      analyze.addEventListener('click',function(){setTimeout(function(){var t=byId('sourceText');if(t&&norm(t.value))applyParsed(t.value);},0);});
    }
    var save=byId('savePreviewBtn');
    if(save&&!save.getAttribute('data-tom-entry-bound')){
      save.setAttribute('data-tom-entry-bound','1');
      save.addEventListener('click',validateBeforeSave,true);
    }
    var inputs=['pTitle','pDeadline','pApplyMethod','pPaymentTiming','pPaymentAmount','pShippingEstimate'];
    inputs.forEach(function(id){var el=byId(id);if(el&&!el.getAttribute('data-tom-check-bound')){el.setAttribute('data-tom-check-bound','1');el.addEventListener('change',function(){renderChecks(lastParsed||{});});}});
  }

  function start(){bind();setTimeout(bind,300);setTimeout(bind,900);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
