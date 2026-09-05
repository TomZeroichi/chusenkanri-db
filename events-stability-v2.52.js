(function(){
  'use strict';
  var CONFIG_KEY='tom_lottery_supabase_config_v2',STYLE_ID='tom-event-stability-v252-style';
  var client=null,userId=null,events={},progress={},scheduled=false;
  function byId(id){return document.getElementById(id);}
  function cfg(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');}catch(e){return null;}}
  function ensureClient(){if(client)return client;var c=cfg();if(!c||!c.url||!c.key||!window.__TOM_SUPABASE__)return null;client=window.__TOM_SUPABASE__.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client;}
  function esc(v){return String(v||'').replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];});}
  function injectStyle(){if(byId(STYLE_ID))return;var s=document.createElement('style');s.id=STYLE_ID;s.textContent='\
.tom-event-row-v252 .tom-type-info-v242,.tom-event-row-v252 .tom-type-status-v242{display:none!important}\
.tom-event-row-v252 .tom-type-badge-v242{font-size:0!important;background:#e9f5ff!important;border-color:#a9d6f4!important;color:#17668f!important}\
.tom-event-row-v252 .tom-type-badge-v242::after{content:"🎪 イベント";font-size:9px;font-weight:1000}\
.tom-event-info-v252{display:flex;flex-wrap:wrap;gap:5px;margin:9px 0 0}\
.tom-event-info-v252 span{display:inline-flex;align-items:center;border:1px solid #c9dce9;background:#f5fbff;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900;color:#446474}\
.tom-event-status-v252{margin-top:10px;border:1px solid #cbe0ec;background:#f5fbff;border-radius:12px;padding:10px}\
.tom-event-status-v252 label{display:block;font-size:10px;font-weight:1000;color:#5a7180;margin-bottom:6px}\
.tom-event-status-v252 select{width:100%;border:1px solid #c6d9e5;background:#fff;border-radius:10px;padding:9px 10px;font-weight:900}';document.head.appendChild(s);}
  function rowId(row){var b=row&&row.querySelector('[data-open]');return b?b.getAttribute('data-open'):'';}
  function loc(note){var m=String(note||'').match(/開催場所\s*[:：]\s*([^\n/]+)/);return m?m[1].trim():'';}
  function ensureEventUi(row,item){
    if(!row||!item)return;row.classList.add('tom-event-row-v252');
    var d=row.querySelector('.details');if(!d)return;
    var info=d.querySelector('.tom-event-info-v252');if(!info){info=document.createElement('div');info.className='tom-event-info-v252';d.insertBefore(info,d.firstChild);}
    var place=loc(item.note),sig='event|'+place;if(info.getAttribute('data-sig')!==sig){info.innerHTML='<span>🎪 イベント</span>'+(place?'<span>📍 '+esc(place)+'</span>':'');info.setAttribute('data-sig',sig);}
    if(row.closest('#adminLotteryList'))return;
    var box=d.querySelector('.tom-event-status-v252');if(!box){box=document.createElement('div');box.className='tom-event-status-v252';box.innerHTML='<label>このイベントの進捗</label><select></select>';d.appendChild(box);}
    var sel=box.querySelector('select'),opts=['未確認','確認済み','参加予定','参加済み','完了'],cur=progress[item.id]||'未確認';if(opts.indexOf(cur)<0)cur='未確認';var ss=opts.join('|')+'|'+cur;
    if(sel.getAttribute('data-sig')!==ss){var h='';for(var i=0;i<opts.length;i++)h+='<option value="'+opts[i]+'"'+(opts[i]===cur?' selected':'')+'>'+opts[i]+'</option>';sel.innerHTML=h;sel.setAttribute('data-sig',ss);}
    sel.setAttribute('data-id',item.id);
    if(!sel.getAttribute('data-bound')){sel.setAttribute('data-bound','1');sel.addEventListener('change',function(){save(this.getAttribute('data-id'),this.value);});}
  }
  function decorate(){var rows=document.querySelectorAll('#lotteryList .lottery-row,#archiveList .lottery-row,#adminLotteryList .lottery-row');for(var i=0;i<rows.length;i++){var id=rowId(rows[i]);if(events[id])ensureEventUi(rows[i],events[id]);}}
  function save(id,status){var c=ensureClient();if(!c||!userId)return;progress[id]=status;decorate();c.from('user_lottery_progress').upsert({user_id:userId,lottery_id:id,status:status,updated_at:new Date().toISOString()},{onConflict:'user_id,lottery_id'}).then(function(r){if(r&&r.error)console.warn('[V2.52] event status save failed',r.error);});}
  function refresh(){var c=ensureClient();if(!c)return;c.auth.getSession().then(function(r){var s=r&&r.data&&r.data.session;if(!s||!s.user)return null;userId=s.user.id;return Promise.all([c.from('lotteries').select('id,opportunity_type,note').eq('is_active',true).eq('opportunity_type','event'),c.from('user_lottery_progress').select('lottery_id,status').eq('user_id',userId)]);}).then(function(r){if(!r)return;events={};(r[0].data||[]).forEach(function(x){events[x.id]=x;});progress={};(r[1].data||[]).forEach(function(x){progress[x.lottery_id]=x.status;});decorate();}).catch(function(e){console.warn('[V2.52] event ui refresh failed',e);});}
  function schedule(){if(scheduled)return;scheduled=true;setTimeout(function(){scheduled=false;decorate();},0);}
  function bind(){injectStyle();var ids=['lotteryList','archiveList','adminLotteryList'];for(var i=0;i<ids.length;i++){var el=byId(ids[i]);if(el&&!el.getAttribute('data-v252-event-stable')){el.setAttribute('data-v252-event-stable','1');new MutationObserver(schedule).observe(el,{childList:true,subtree:true});}}}
  function start(){bind();refresh();setTimeout(bind,600);setTimeout(refresh,1500);document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh();});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
