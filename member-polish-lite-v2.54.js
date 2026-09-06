(function(){
  'use strict';
  var CONFIG_KEY='tom_lottery_supabase_config_v2';
  var STYLE_ID='tom-member-polish-style-v254';
  var BULK_ID='tom-expired-bulk-v236';
  var state=null,client=null,applying=false,scheduled=false;

  function byId(id){return document.getElementById(id);}
  function readConfig(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');}catch(e){return null;}}
  function ensureClient(){
    if(client)return client;
    var cfg=readConfig();
    if(!cfg||!cfg.url||!cfg.key||!window.__TOM_SUPABASE__||!window.__TOM_SUPABASE__.createClient)return null;
    client=window.__TOM_SUPABASE__.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  function injectStyle(){
    if(byId(STYLE_ID))return;
    var s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='\
#'+BULK_ID+'{display:none;width:100%;margin:6px 0 10px;border:1px solid #efb3ba;background:#fff5f6;color:#b62f40;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:1000;box-shadow:0 2px 8px rgba(120,25,40,.05)}\
#'+BULK_ID+'.show{display:block}#'+BULK_ID+':disabled{opacity:.58}\
.tom-win-badge-v236{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:#18a766;color:#fff;border:1px solid #11804e;padding:4px 8px;font-size:11px;font-weight:1000;box-shadow:0 2px 7px rgba(24,167,102,.22)}\
.lottery-row.tom-win-card-v236{border-color:#53bc83!important;box-shadow:0 0 0 2px rgba(28,174,104,.16),0 7px 22px rgba(25,120,78,.12)!important}\
.lottery-row.tom-win-card-v236 .row-summary{background:linear-gradient(90deg,rgba(222,249,233,.96),rgba(246,255,249,.94))!important}\
';
    document.head.appendChild(s);
  }
  function pFor(id){return state&&state.progress&&state.progress[id]?state.progress[id]:{status:'未応募',is_archived:false};}
  function rowId(row){var b=row&&row.querySelector('[data-open]');return b?b.getAttribute('data-open'):'';}
  function dayDiff(v){if(!v)return 9999;var p=String(v).split('-');if(p.length!==3)return 9999;var t=new Date(+p[0],+p[1]-1,+p[2]),n=new Date(),d=new Date(n.getFullYear(),n.getMonth(),n.getDate());return Math.round((t-d)/86400000);}
  function decorateWinners(){
    var rows=document.querySelectorAll('#lotteryList .lottery-row');
    for(var i=0;i<rows.length;i++){
      var id=rowId(rows[i]),p=pFor(id),win=p.status==='当選'&&!p.is_archived;
      rows[i].classList.toggle('tom-win-card-v236',!!win);
      var old=rows[i].querySelector('.tom-win-badge-v236');
      if(win&&!old){var meta=rows[i].querySelector('.meta-line');if(meta){var b=document.createElement('span');b.className='tom-win-badge-v236';b.textContent='🎉 当選';meta.appendChild(b);}}
      if(!win&&old&&old.parentNode)old.parentNode.removeChild(old);
    }
  }
  function expiredIds(){
    var out=[],ls=state&&state.lotteries?state.lotteries:[];
    for(var i=0;i<ls.length;i++){var p=pFor(ls[i].id);if(p.status==='未応募'&&!p.is_archived&&dayDiff(ls[i].deadline_date)<0)out.push(ls[i].id);}
    return out;
  }
  function ensureBulk(){
    var list=byId('lotteryList');if(!list)return null;
    var b=byId(BULK_ID);
    if(!b){b=document.createElement('button');b.type='button';b.id=BULK_ID;b.addEventListener('click',bulkArchive);list.parentNode.insertBefore(b,list.nextSibling);}
    return b;
  }
  function updateBulk(){var b=ensureBulk();if(!b)return;var ids=expiredIds();b.classList.toggle('show',ids.length>0);b.textContent=ids.length?'期限切れの未応募をまとめてアーカイブ（'+ids.length+'件）':'期限切れの未応募はありません';b.disabled=!ids.length;}
  function bulkArchive(){
    var ids=expiredIds();if(!ids.length)return;if(!window.confirm('期限切れで未応募の案件 '+ids.length+'件をまとめてアーカイブしますか？'))return;
    var c=ensureClient(),uid=state&&state.userId;if(!c||!uid)return;
    var b=byId(BULK_ID);if(b)b.disabled=true;var now=new Date().toISOString(),rows=[];
    for(var i=0;i<ids.length;i++)rows.push({user_id:uid,lottery_id:ids[i],is_archived:true,archived_at:now,updated_at:now});
    c.from('user_lottery_progress').upsert(rows,{onConflict:'user_id,lottery_id'}).then(function(r){if(r&&r.error)throw r.error;for(var j=0;j<ids.length;j++){if(!state.progress[ids[j]])state.progress[ids[j]]={status:'未応募'};state.progress[ids[j]].is_archived=true;}updateBulk();}).catch(function(e){console.warn('[V2.54] bulk archive failed',e);if(b)b.disabled=false;});
  }
  function apply(){if(applying)return;applying=true;try{injectStyle();decorateWinners();updateBulk();}finally{applying=false;}}
  function schedule(){if(scheduled)return;scheduled=true;setTimeout(function(){scheduled=false;apply();},25);}
  function attachListObservers(){['lotteryList','archiveList'].forEach(function(id){var el=byId(id);if(el&&!el.getAttribute('data-v254-observed')){el.setAttribute('data-v254-observed','1');new MutationObserver(schedule).observe(el,{childList:true});}});}
  function start(){injectStyle();state=window.__TOM_ENTRY_STATE__||null;attachListObservers();apply();document.addEventListener('tom:state',function(e){state=(e&&e.detail)||window.__TOM_ENTRY_STATE__||state;attachListObservers();schedule();});setTimeout(function(){state=window.__TOM_ENTRY_STATE__||state;attachListObservers();apply();},300);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();