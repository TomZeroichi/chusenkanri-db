(function(){
  'use strict';

  var CONFIG_KEY='tom_lottery_supabase_config_v2';
  var FILTER_KEY='tom_opportunity_type_filter_v242';
  var STYLE_ID='tom-opportunity-style-v242';
  var NAV_ID='tom-opportunity-nav-v242';
  var MODAL_ID='tom-opportunity-modal-v242';
  var client=null,userId=null,lotteries=[],progressById={},selectedType='all',applying=false,applyTimer=null;

  var TYPES={
    lottery:{label:'抽選',icon:'🎯'},
    all_applicants:{label:'応募者全員サービス',icon:'🎁'},
    preorder:{label:'期間限定受注',icon:'🛒'},
    campaign:{label:'キャンペーン',icon:'🎫'}
  };

  function readConfig(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');}catch(e){return null;}}
  function ensureClient(){
    if(client)return client;
    var cfg=readConfig();
    if(!cfg||!cfg.url||!cfg.key||!window.__TOM_SUPABASE__||!window.__TOM_SUPABASE__.createClient)return null;
    client=window.__TOM_SUPABASE__.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  function compact(v){return String(v||'').toLowerCase().replace(/[\s　・･'\"“”‘’「」『』【】()（）\[\]：:／/\-]/g,'');}
  function tmeta(type){return TYPES[type]||TYPES.lottery;}
  function yen(v){if(v===null||v===undefined||v==='')return '';return Number(v).toLocaleString('ja-JP')+'円';}
  function payLabel(v){return {application:'応募時に支払',after_application:'応募後に支払',cod:'商品到着時（代引）',free:'無料',unknown:'未確認'}[v]||'未確認';}
  function byId(id){for(var i=0;i<lotteries.length;i++)if(lotteries[i].id===id)return lotteries[i];return null;}

  function injectStyle(){
    if(document.getElementById(STYLE_ID))return;
    var s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='\
#'+NAV_ID+'{display:flex;gap:6px;overflow-x:auto;padding:2px 1px 8px;margin:0 0 4px;-webkit-overflow-scrolling:touch}\
#'+NAV_ID+' button{flex:0 0 auto;border:1px solid #d9e0ea;background:#fff;color:#46556a;border-radius:999px;padding:8px 11px;font-size:11px;font-weight:1000;white-space:nowrap}\
#'+NAV_ID+' button.active{background:#1f2734;color:#fff;border-color:#1f2734}.tom-type-hidden-v242{display:none!important}\
.tom-type-badge-v242{display:inline-flex;align-items:center;border-radius:999px;padding:4px 7px;font-size:9px;font-weight:1000;border:1px solid #d8dfe8;background:#fff;color:#435065}\
.tom-type-badge-v242.all_applicants{background:#f4ecff;border-color:#d7bdf6;color:#7041a5}.tom-type-badge-v242.preorder{background:#eaf8f0;border-color:#b9e0c8;color:#27744b}.tom-type-badge-v242.campaign{background:#fff1e5;border-color:#f3c799;color:#9a5a16}\
.tom-type-info-v242{display:flex;flex-wrap:wrap;gap:5px;margin:9px 0 0}.tom-type-chip-v242{display:inline-flex;align-items:center;border:1px solid #d9e0e9;background:#fff;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900;color:#4b596c}\
.tom-type-status-v242{margin-top:10px;border:1px solid #dbe2eb;background:#f8fafc;border-radius:12px;padding:10px}.tom-type-status-v242 label{display:block;font-size:10px;font-weight:1000;color:#687589;margin-bottom:6px}.tom-type-status-v242 select{width:100%;border:1px solid #cfd8e5;background:#fff;border-radius:10px;padding:9px 10px;font-weight:900}\
.tom-type-admin-v242{margin-top:8px}.tom-type-admin-v242 button{width:100%;border:1px solid #cad5e2;background:#fff;border-radius:10px;padding:8px 10px;font-size:11px;font-weight:1000;color:#34465d}\
#'+MODAL_ID+'{position:fixed;inset:0;z-index:2147483300;background:rgba(20,27,38,.48);display:flex;align-items:flex-end;justify-content:center;padding:12px}#'+MODAL_ID+'[hidden]{display:none!important}#'+MODAL_ID+' .tom-sheet{width:min(560px,100%);max-height:86vh;overflow:auto;background:#f7f9fc;border-radius:20px 20px 14px 14px;padding:15px}#'+MODAL_ID+' .tom-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}#'+MODAL_ID+' h3{margin:0;font-size:18px}#'+MODAL_ID+' .tom-close{border:1px solid #d5dde8;background:#fff;border-radius:10px;width:36px;height:36px;font-size:20px}#'+MODAL_ID+' .tom-field{margin-top:10px}#'+MODAL_ID+' .tom-field span{display:block;font-size:10px;font-weight:1000;color:#69768a;margin-bottom:5px}#'+MODAL_ID+' select,#'+MODAL_ID+' input{width:100%;border:1px solid #cfd8e5;background:#fff;border-radius:10px;padding:10px}#'+MODAL_ID+' .tom-save{width:100%;margin-top:13px;border:0;background:#3d83ef;color:#fff;border-radius:11px;padding:11px;font-weight:1000}\
@media(min-width:700px){#'+MODAL_ID+'{align-items:center}#'+MODAL_ID+' .tom-sheet{border-radius:20px}}';
    document.head.appendChild(s);
  }

  function findLotteryForRow(row){
    var text=compact(row&&row.textContent),best=null,bestScore=0;
    for(var i=0;i<lotteries.length;i++){
      var l=lotteries[i],title=compact(l.title),store=compact(l.store),score=0;
      if(title&&text.indexOf(title)>=0)score+=8;else if(title.length>=10&&text.indexOf(title.slice(0,10))>=0)score+=4;
      if(store&&text.indexOf(store)>=0)score+=3;
      if(score>bestScore){best=l;bestScore=score;}
    }
    return bestScore>=5?best:null;
  }

  function ensureNav(){
    var member=document.getElementById('memberView');if(!member)return;
    var nav=document.getElementById(NAV_ID);
    if(!nav){
      nav=document.createElement('div');nav.id=NAV_ID;
      var items=[['all','すべて','📚'],['lottery','抽選','🎯'],['all_applicants','全員サービス','🎁'],['preorder','期間限定受注','🛒'],['campaign','キャンペーン','🎫']];
      for(var i=0;i<items.length;i++){
        var b=document.createElement('button');b.type='button';b.setAttribute('data-tom-type-filter',items[i][0]);b.textContent=items[i][2]+' '+items[i][1];nav.appendChild(b);
      }
      var toolbar=member.querySelector('.toolbar');if(toolbar&&toolbar.parentNode)toolbar.parentNode.insertBefore(nav,toolbar);else member.insertBefore(nav,member.firstChild);
      nav.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-tom-type-filter]');if(!b)return;selectedType=b.getAttribute('data-tom-type-filter')||'all';try{localStorage.setItem(FILTER_KEY,selectedType);}catch(_e){}applyDom();});
    }
    var bs=nav.querySelectorAll('button');for(var j=0;j<bs.length;j++)bs[j].classList.toggle('active',bs[j].getAttribute('data-tom-type-filter')===selectedType);
  }

  function statusOptions(l){
    var type=l.opportunity_type||'lottery',p=l.payment_timing||'unknown';
    if(type==='all_applicants'){
      if(p==='cod')return ['未応募','応募済み','発送待ち','受取・支払済み','完了'];
      if(p==='free')return ['未応募','応募済み','発送待ち','受取済み','完了'];
      return ['未応募','応募済み','支払済み','発送待ち','受取済み','完了'];
    }
    if(type==='preorder'){
      if(p==='cod')return ['未注文','注文済み','発送待ち','受取・支払済み','完了'];
      if(p==='free')return ['未注文','注文済み','発送待ち','受取済み','完了'];
      return ['未注文','注文済み','支払済み','発送待ち','受取済み','完了'];
    }
    if(type==='campaign')return ['未応募','応募済み','結果待ち','当選','落選','受取済み','完了'];
    return ['未応募','結果待ち','当選','購入済み','完了','落選'];
  }

  function hideCoreStatus(row){
    var sels=row.querySelectorAll('select');
    for(var i=0;i<sels.length;i++){
      var txt=sels[i].textContent||'';
      if(txt.indexOf('未応募')>=0&&txt.indexOf('当選')>=0&&txt.indexOf('落選')>=0){
        var p=sels[i].parentNode;if(p)p.style.display='none';
      }
    }
  }

  function makeStatus(row,l){
    if((l.opportunity_type||'lottery')==='lottery')return;
    hideCoreStatus(row);
    var details=row.querySelector('.details')||row;
    var box=details.querySelector('.tom-type-status-v242');
    if(!box){box=document.createElement('div');box.className='tom-type-status-v242';box.innerHTML='<label>この案件の進捗</label><select></select>';details.appendChild(box);}
    var sel=box.querySelector('select'),opts=statusOptions(l),cur=(progressById[l.id]&&progressById[l.id].status)||opts[0],html='';
    for(var i=0;i<opts.length;i++)html+='<option value="'+opts[i]+'"'+(opts[i]===cur?' selected':'')+'>'+opts[i]+'</option>';
    sel.innerHTML=html;sel.setAttribute('data-tom-status-id',l.id);
    if(sel.getAttribute('data-bound')!=='1'){
      sel.setAttribute('data-bound','1');sel.addEventListener('change',function(){saveStatus(this.getAttribute('data-tom-status-id'),this.value);});
    }
  }

  function addInfo(row,l){
    var type=l.opportunity_type||'lottery',meta=tmeta(type);
    var host=row.querySelector('.meta-line')||row.querySelector('.row-main')||row;
    var badge=host.querySelector('.tom-type-badge-v242');if(!badge){badge=document.createElement('span');host.insertBefore(badge,host.firstChild);}
    badge.className='tom-type-badge-v242 '+type;badge.textContent=meta.icon+' '+meta.label;
    var details=row.querySelector('.details');if(!details)return;
    var info=details.querySelector('.tom-type-info-v242');if(!info){info=document.createElement('div');info.className='tom-type-info-v242';details.insertBefore(info,details.firstChild);}
    var chips=[];
    if(type!=='lottery')chips.push(meta.icon+' '+meta.label);
    if(type!=='lottery' || (l.payment_timing&&l.payment_timing!=='unknown'))chips.push('💳 '+payLabel(l.payment_timing));
    if(l.payment_amount!==null&&l.payment_amount!==undefined)chips.push('💴 '+yen(l.payment_amount));
    if(l.shipping_estimate)chips.push('📦 '+l.shipping_estimate);
    info.innerHTML='';for(var i=0;i<chips.length;i++){var c=document.createElement('span');c.className='tom-type-chip-v242';c.textContent=chips[i];info.appendChild(c);}
    if(!chips.length)info.style.display='none';else info.style.display='flex';
  }

  function addAdmin(row,l){
    if(!row.closest('#adminLotteryList'))return;
    var details=row.querySelector('.details')||row,box=details.querySelector('.tom-type-admin-v242');
    if(!box){box=document.createElement('div');box.className='tom-type-admin-v242';var b=document.createElement('button');b.type='button';b.textContent='案件種別・支払設定';b.setAttribute('data-lottery-id',l.id);box.appendChild(b);details.appendChild(box);b.addEventListener('click',function(){openAdminModal(this.getAttribute('data-lottery-id'));});}
  }

  function applyFilter(row,l){
    var match=selectedType==='all'||(l.opportunity_type||'lottery')===selectedType;row.classList.toggle('tom-type-hidden-v242',!match);
  }

  function updateSummary(){
    var rows=[],ids={};
    var cards=document.querySelectorAll('#lotteryList .lottery-row:not(.tom-type-hidden-v242)');
    for(var i=0;i<cards.length;i++){var l=findLotteryForRow(cards[i]);if(l&&!ids[l.id]){ids[l.id]=1;rows.push(l);}}
    var labels=document.querySelectorAll('.summary-label');
    var fifth=selectedType==='all_applicants'||selectedType==='preorder'?'発送待ち':selectedType==='campaign'?'当選':'当選';
    if(labels.length>=5){labels[0].textContent='管理中';labels[1].textContent=selectedType==='preorder'?'未注文':'未応募';labels[2].textContent='3日以内';labels[3].textContent='本日締切';labels[4].textContent=fifth;}
    function dd(v){if(!v)return 9999;var p=String(v).split('-');if(p.length!==3)return 9999;var t=new Date(+p[0],+p[1]-1,+p[2]),n=new Date(),d=new Date(n.getFullYear(),n.getMonth(),n.getDate());return Math.round((t-d)/86400000);}
    var total=0,un=0,soon=0,today=0,last=0;
    for(var j=0;j<rows.length;j++){
      var l=rows[j],st=(progressById[l.id]&&progressById[l.id].status)||((l.opportunity_type||'lottery')==='preorder'?'未注文':'未応募');
      if(st!=='完了'&&st!=='落選')total++;
      if(st==='未応募'||st==='未注文')un++;
      if((st==='未応募'||st==='未注文')&&dd(l.deadline_date)>=0&&dd(l.deadline_date)<=3)soon++;
      if((st==='未応募'||st==='未注文')&&dd(l.deadline_date)===0)today++;
      if(fifth==='発送待ち'){if(st==='発送待ち')last++;}else if(st==='当選')last++;
    }
    var a=document.getElementById('countTotal'),b=document.getElementById('countUnapplied'),c=document.getElementById('countSoon'),d=document.getElementById('countToday'),e=document.getElementById('countWon');
    if(a)a.textContent=String(total);if(b)b.textContent=String(un);if(c)c.textContent=String(soon);if(d)d.textContent=String(today);if(e)e.textContent=String(last);
  }

  function decorateRows(){
    var rows=document.querySelectorAll('#lotteryList .lottery-row,#archiveList .lottery-row,#adminLotteryList .lottery-row');
    for(var i=0;i<rows.length;i++){
      var l=findLotteryForRow(rows[i]);if(!l)continue;addInfo(rows[i],l);addAdmin(rows[i],l);
      if(rows[i].closest('#lotteryList')){applyFilter(rows[i],l);makeStatus(rows[i],l);}    
    }
    updateSummary();
  }

  function saveStatus(id,status){
    var c=ensureClient();if(!c||!userId)return;
    var payload={user_id:userId,lottery_id:id,status:status,updated_at:new Date().toISOString()};
    c.from('user_lottery_progress').upsert(payload,{onConflict:'user_id,lottery_id'}).then(function(r){if(r&&r.error)throw r.error;progressById[id]=progressById[id]||{};progressById[id].status=status;applyDom();}).catch(function(err){console.warn('[TOM V2.42] status save failed',err);});
  }

  function ensureModal(){
    var m=document.getElementById(MODAL_ID);if(m)return m;
    m=document.createElement('div');m.id=MODAL_ID;m.hidden=true;
    m.innerHTML='<div class="tom-sheet"><div class="tom-head"><h3>案件種別・支払設定</h3><button class="tom-close" type="button">×</button></div><input type="hidden" id="tomTypeLotteryId"><label class="tom-field"><span>案件種別</span><select id="tomTypeSelect"><option value="lottery">🎯 抽選</option><option value="all_applicants">🎁 応募者全員サービス</option><option value="preorder">🛒 期間限定受注</option><option value="campaign">🎫 キャンペーン</option></select></label><label class="tom-field"><span>支払タイミング</span><select id="tomPayTiming"><option value="unknown">未確認</option><option value="application">応募時に支払</option><option value="after_application">応募後に支払</option><option value="cod">商品到着時（代引）</option><option value="free">無料</option></select></label><label class="tom-field"><span>負担金・商品代金（円）</span><input id="tomPayAmount" type="number" min="0" inputmode="numeric" placeholder="例：1200"></label><label class="tom-field"><span>発送予定</span><input id="tomShippingEstimate" placeholder="例：2026年12月中 / 応募後2〜3か月"></label><button class="tom-save" type="button">保存</button></div>';
    document.body.appendChild(m);m.addEventListener('click',function(e){if(e.target===m)m.hidden=true;});m.querySelector('.tom-close').addEventListener('click',function(){m.hidden=true;});m.querySelector('.tom-save').addEventListener('click',saveAdminModal);return m;
  }
  function openAdminModal(id){var l=byId(id);if(!l)return;var m=ensureModal();document.getElementById('tomTypeLotteryId').value=id;document.getElementById('tomTypeSelect').value=l.opportunity_type||'lottery';document.getElementById('tomPayTiming').value=l.payment_timing||'unknown';document.getElementById('tomPayAmount').value=l.payment_amount===null||l.payment_amount===undefined?'':l.payment_amount;document.getElementById('tomShippingEstimate').value=l.shipping_estimate||'';m.hidden=false;}
  function saveAdminModal(){
    var c=ensureClient();if(!c)return;var id=document.getElementById('tomTypeLotteryId').value,amt=document.getElementById('tomPayAmount').value;
    var patch={opportunity_type:document.getElementById('tomTypeSelect').value,payment_timing:document.getElementById('tomPayTiming').value,payment_amount:amt===''?null:Number(amt),shipping_estimate:document.getElementById('tomShippingEstimate').value.trim()||null,updated_at:new Date().toISOString()};
    c.from('lotteries').update(patch).eq('id',id).then(function(r){if(r&&r.error)throw r.error;document.getElementById(MODAL_ID).hidden=true;return loadState();}).catch(function(err){console.warn('[TOM V2.42] type save failed',err);alert('保存に失敗しました');});
  }

  function applyDom(){if(applying)return;applying=true;try{injectStyle();ensureNav();decorateRows();}finally{applying=false;}}
  function scheduleApply(){if(applyTimer)clearTimeout(applyTimer);applyTimer=setTimeout(applyDom,60);}
  function loadState(){
    var c=ensureClient();if(!c)return Promise.resolve();
    return c.auth.getSession().then(function(r){var s=r&&r.data&&r.data.session;if(!s||!s.user)return null;userId=s.user.id;return Promise.all([
      c.from('lotteries').select('id,title,store,deadline_date,opportunity_type,payment_timing,payment_amount,shipping_estimate,fulfillment,is_active,owner_user_id'),
      c.from('user_lottery_progress').select('lottery_id,status,is_archived').eq('user_id',userId)
    ]);}).then(function(all){if(!all)return;if(all[0]&&all[0].error)throw all[0].error;if(all[1]&&all[1].error)throw all[1].error;lotteries=all[0]&&all[0].data?all[0].data:[];progressById={};var ps=all[1]&&all[1].data?all[1].data:[];for(var i=0;i<ps.length;i++)progressById[ps[i].lottery_id]=ps[i];applyDom();}).catch(function(err){console.warn('[TOM V2.42] load failed',err);});
  }

  function start(){try{selectedType=localStorage.getItem(FILTER_KEY)||'all';}catch(e){selectedType='all';}injectStyle();ensureModal();new MutationObserver(function(){if(!applying)scheduleApply();}).observe(document.documentElement,{childList:true,subtree:true});loadState();setInterval(loadState,15000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
