(function(){
  'use strict';

  var CONFIG_KEY='tom_lottery_supabase_config_v2';
  var STYLE_ID='tom-member-polish-style-v236';
  var BULK_ID='tom-expired-bulk-v236';
  var client=null;
  var userId=null;
  var progressById={};
  var lotteries=[];
  var applying=false;
  var loadTimer=null;
  var bulkBusy=false;

  function readConfig(){
    try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');}catch(e){return null;}
  }

  function ensureClient(){
    if(client)return client;
    var cfg=readConfig();
    if(!cfg||!cfg.url||!cfg.key||!window.__TOM_SUPABASE__||!window.__TOM_SUPABASE__.createClient)return null;
    client=window.__TOM_SUPABASE__.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }

  function injectStyle(){
    if(document.getElementById(STYLE_ID))return;
    var style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent='\
#'+BULK_ID+'{display:none;width:100%;margin:6px 0 10px;border:1px solid #efb3ba;background:#fff5f6;color:#b62f40;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:1000;box-shadow:0 2px 8px rgba(120,25,40,.05)}\
#'+BULK_ID+'.show{display:block}\
#'+BULK_ID+':disabled{opacity:.58}\
.tom-win-badge-v236{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:#18a766;color:#fff;border:1px solid #11804e;padding:4px 8px;font-size:11px;font-weight:1000;box-shadow:0 2px 7px rgba(24,167,102,.22)}\
.lottery-row.tom-win-card-v236{border-color:#53bc83!important;box-shadow:0 0 0 2px rgba(28,174,104,.16),0 7px 22px rgba(25,120,78,.12)!important}\
.lottery-row.tom-win-card-v236 .row-summary{background:linear-gradient(90deg,rgba(222,249,233,.96),rgba(246,255,249,.94))!important}\
.lottery-row.tom-win-card-v236::after{content:"当選";position:absolute;right:8px;top:7px;z-index:5;background:#18a766;color:#fff;border-radius:999px;padding:3px 7px;font-size:9px;font-weight:1000;pointer-events:none}\
';
    document.head.appendChild(style);
  }

  function dayDiff(dateStr){
    if(!dateStr)return 9999;
    var p=String(dateStr).split('-');
    if(p.length!==3)return 9999;
    var target=new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));
    var now=new Date();
    var today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    return Math.round((target-today)/86400000);
  }

  function statusFor(id){
    var p=progressById[id];
    return p&&p.status?p.status:'未応募';
  }

  function isArchived(id){
    var p=progressById[id];
    return !!(p&&p.is_archived);
  }

  function expiredUnappliedIds(){
    var ids=[];
    for(var i=0;i<lotteries.length;i++){
      var item=lotteries[i];
      if(statusFor(item.id)==='未応募'&&!isArchived(item.id)&&dayDiff(item.deadline_date)<0)ids.push(item.id);
    }
    return ids;
  }

  function ensureBulkButton(){
    var list=document.getElementById('lotteryList');
    if(!list)return null;
    var btn=document.getElementById(BULK_ID);
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.id=BULK_ID;
      btn.addEventListener('click',bulkArchive);
      var hint=document.getElementById('tom-swipe-hint-v235');
      if(hint&&hint.parentNode)hint.parentNode.insertBefore(btn,hint);
      else list.parentNode.insertBefore(btn,list);
    }
    return btn;
  }

  function updateBulkButton(){
    var btn=ensureBulkButton();
    if(!btn)return;
    var ids=expiredUnappliedIds();
    btn.classList.toggle('show',ids.length>0);
    btn.textContent=ids.length?'期限切れの未応募をまとめてアーカイブ（'+ids.length+'件）':'期限切れの未応募はありません';
    btn.disabled=bulkBusy||!ids.length;
  }

  function cardId(row){
    var el=row&&row.querySelector('[data-open]');
    return el&&el.getAttribute('data-open');
  }

  function cardUnit(row){
    var p=row&&row.parentNode;
    if(p&&p.classList&&p.classList.contains('tom-swipe-shell'))return p;
    return row;
  }

  function decorateWinners(){
    var list=document.getElementById('lotteryList');
    if(!list)return;
    var rows=list.querySelectorAll('.lottery-row');
    var winners=[];
    for(var i=0;i<rows.length;i++){
      var row=rows[i];
      var id=cardId(row);
      var win=id&&statusFor(id)==='当選'&&!isArchived(id);
      row.classList.toggle('tom-win-card-v236',!!win);
      var old=row.querySelector('.tom-win-badge-v236');
      if(win){
        if(!old){
          var meta=row.querySelector('.meta-line');
          if(meta){
            var badge=document.createElement('span');
            badge.className='tom-win-badge-v236';
            badge.textContent='🎉 当選';
            meta.appendChild(badge);
          }
        }
        winners.push(cardUnit(row));
      }else if(old){
        old.parentNode.removeChild(old);
      }
    }
    for(var j=winners.length-1;j>=0;j--){
      var unit=winners[j];
      if(unit&&unit.parentNode===list)list.insertBefore(unit,list.firstChild);
    }
  }

  function bulkArchive(){
    if(bulkBusy)return;
    var ids=expiredUnappliedIds();
    if(!ids.length)return;
    var msg='期限切れで未応募の抽選 '+ids.length+'件をまとめてアーカイブしますか？\n\nステータスは「未応募」のまま保存します。';
    if(!window.confirm(msg))return;
    var c=ensureClient();
    if(!c||!userId){window.alert('ログイン情報を取得できませんでした。');return;}
    bulkBusy=true;
    updateBulkButton();
    var now=new Date().toISOString();
    var jobs=[];
    for(var i=0;i<ids.length;i++){
      jobs.push(c.from('user_lottery_progress').upsert({user_id:userId,lottery_id:ids[i],is_archived:true,archived_at:now,updated_at:now},{onConflict:'user_id,lottery_id'}));
    }
    Promise.all(jobs).then(function(results){
      for(var k=0;k<results.length;k++)if(results[k]&&results[k].error)throw results[k].error;
      for(var n=0;n<ids.length;n++){
        if(!progressById[ids[n]])progressById[ids[n]]={lottery_id:ids[n],status:'未応募'};
        progressById[ids[n]].is_archived=true;
        progressById[ids[n]].archived_at=now;
      }
      window.alert(ids.length+'件をアーカイブしました。');
      location.reload();
    }).catch(function(err){
      console.error('[TOM V2.36] bulk archive failed',err);
      bulkBusy=false;
      updateBulkButton();
      window.alert('一括アーカイブに失敗しました。通信状態を確認して、もう一度お試しください。');
    });
  }

  function applyDom(){
    if(applying)return;
    applying=true;
    try{
      injectStyle();
      decorateWinners();
      updateBulkButton();
    }finally{applying=false;}
  }

  function loadState(){
    var c=ensureClient();
    if(!c)return Promise.resolve();
    return c.auth.getSession().then(function(r){
      var s=r&&r.data&&r.data.session;
      if(!s||!s.user)return null;
      userId=s.user.id;
      return Promise.all([
        c.from('user_lottery_progress').select('lottery_id,status,is_archived,archived_at').eq('user_id',userId),
        c.from('lotteries').select('id,deadline_date').eq('is_active',true)
      ]);
    }).then(function(all){
      if(!all)return;
      var pRes=all[0],lRes=all[1];
      if(pRes&&pRes.error)throw pRes.error;
      if(lRes&&lRes.error)throw lRes.error;
      progressById={};
      var pRows=pRes&&pRes.data?pRes.data:[];
      for(var i=0;i<pRows.length;i++)progressById[pRows[i].lottery_id]=pRows[i];
      lotteries=lRes&&lRes.data?lRes.data:[];
      applyDom();
    }).catch(function(err){console.warn('[TOM V2.36] member polish load failed',err);});
  }

  function scheduleLoad(){
    if(loadTimer)clearTimeout(loadTimer);
    loadTimer=setTimeout(loadState,300);
  }

  var observer=new MutationObserver(function(){
    if(applying)return;
    scheduleLoad();
  });

  function start(){
    injectStyle();
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(loadState,650);
    setInterval(loadState,15000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
})();
