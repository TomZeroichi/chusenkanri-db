(function(){
  'use strict';

  var CONFIG_KEY='tom_lottery_supabase_config_v2';
  var STYLE_ID='tom-winner-deadline-style-v237';
  var BULK_ID='tom-expired-bulk-v236';
  var client=null;
  var userId=null;
  var progressById={};
  var applying=false;
  var loadTimer=null;

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
.tom-win-deadline-strip-v237{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}\
.tom-win-deadline-chip-v237{display:inline-flex;align-items:center;gap:4px;border:1px solid #a9d9be;background:#f2fbf6;color:#20724a;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:1000;line-height:1.15}\
.tom-win-deadline-chip-v237.unset{border-color:#d6dce5;background:#f7f8fa;color:#788292}\
.tom-win-deadline-chip-v237.soon{border-color:#efbd63;background:#fff7e6;color:#9a6500}\
.tom-win-deadline-chip-v237.today{border-color:#e6853f;background:#fff0df;color:#b34f00}\
.tom-win-deadline-chip-v237.expired{border-color:#e18c96;background:#fff0f2;color:#b52e3e}\
.tom-win-deadline-form-v237{margin:10px 0 0;border:1.5px solid #9fd8b9;background:#f4fbf7;border-radius:13px;padding:10px}\
.tom-win-deadline-title-v237{font-size:12px;font-weight:1000;color:#176c45;margin-bottom:7px}\
.tom-win-deadline-grid-v237{display:grid;grid-template-columns:1fr 1fr;gap:7px}\
.tom-win-deadline-field-v237 label{display:block;font-size:10px;font-weight:900;color:#667365;margin:0 0 4px}\
.tom-win-deadline-field-v237 input{width:100%;border:1px solid #cbd8cf;background:#fff;border-radius:9px;padding:9px 8px;font:700 12px -apple-system,BlinkMacSystemFont,sans-serif;color:#26352c}\
.tom-win-deadline-save-v237{width:100%;margin-top:8px;border:0;border-radius:10px;background:#18a766;color:#fff;padding:9px 10px;font-size:12px;font-weight:1000}\
.tom-win-deadline-save-v237:disabled{opacity:.55}\
@media(max-width:430px){.tom-win-deadline-grid-v237{grid-template-columns:1fr 1fr}.tom-win-deadline-chip-v237{font-size:9px;padding:4px 6px}}\
';
    document.head.appendChild(style);
  }

  function cardId(row){
    var el=row&&row.querySelector('[data-open]');
    return el&&el.getAttribute('data-open');
  }

  function statusFor(id){
    var p=progressById[id];
    return p&&p.status?p.status:'未応募';
  }

  function isArchived(id){
    var p=progressById[id];
    return !!(p&&p.is_archived);
  }

  function localDayDiff(dateStr){
    if(!dateStr)return 9999;
    var p=String(dateStr).split('-');
    if(p.length!==3)return 9999;
    var target=new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));
    var now=new Date();
    var today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    return Math.round((target-today)/86400000);
  }

  function shortDate(dateStr){
    if(!dateStr)return '未入力';
    var p=String(dateStr).split('-');
    if(p.length!==3)return String(dateStr);
    return Number(p[1])+'/'+Number(p[2]);
  }

  function deadlineClass(dateStr){
    if(!dateStr)return 'unset';
    var d=localDayDiff(dateStr);
    if(d<0)return 'expired';
    if(d===0)return 'today';
    if(d<=3)return 'soon';
    return '';
  }

  function deadlineSuffix(dateStr){
    if(!dateStr)return '';
    var d=localDayDiff(dateStr);
    if(d<0)return ' 期限超過';
    if(d===0)return ' 本日';
    if(d===1)return ' 明日';
    if(d<=3)return ' あと'+d+'日';
    return '';
  }

  function makeChip(icon,label,dateStr){
    var span=document.createElement('span');
    span.className='tom-win-deadline-chip-v237 '+deadlineClass(dateStr);
    span.textContent=icon+' '+label+' '+shortDate(dateStr)+deadlineSuffix(dateStr);
    return span;
  }

  function decorateWinnerRow(row,id){
    if(!row||!id)return;
    var p=progressById[id]||{};
    var win=statusFor(id)==='当選'&&!isArchived(id);
    var oldStrip=row.querySelector('.tom-win-deadline-strip-v237');
    var oldForm=row.querySelector('.tom-win-deadline-form-v237');

    if(!win){
      if(oldStrip&&oldStrip.parentNode)oldStrip.parentNode.removeChild(oldStrip);
      if(oldForm&&oldForm.parentNode)oldForm.parentNode.removeChild(oldForm);
      return;
    }

    var main=row.querySelector('.row-main');
    if(main){
      var strip=oldStrip;
      if(!strip){
        strip=document.createElement('div');
        strip.className='tom-win-deadline-strip-v237';
        main.appendChild(strip);
      }
      strip.innerHTML='';
      strip.appendChild(makeChip('💳','支払期限',p.payment_deadline||''));
      strip.appendChild(makeChip('📦','受取期限',p.pickup_deadline||''));
    }

    var details=row.querySelector('.details');
    if(details){
      var form=oldForm;
      if(!form){
        form=document.createElement('section');
        form.className='tom-win-deadline-form-v237';
        var statusBox=details.querySelector('.status-control-box');
        if(statusBox&&statusBox.parentNode)statusBox.parentNode.insertBefore(form,statusBox);
        else details.appendChild(form);
      }
      form.innerHTML='\
<div class="tom-win-deadline-title-v237">🎉 当選後の期限を設定</div>\
<div class="tom-win-deadline-grid-v237">\
  <div class="tom-win-deadline-field-v237"><label>支払期限</label><input type="date" data-win-payment-v237="'+id+'"></div>\
  <div class="tom-win-deadline-field-v237"><label>受取期限</label><input type="date" data-win-pickup-v237="'+id+'"></div>\
</div>\
<button type="button" class="tom-win-deadline-save-v237" data-win-save-v237="'+id+'">期限を保存</button>';
      var payment=form.querySelector('[data-win-payment-v237]');
      var pickup=form.querySelector('[data-win-pickup-v237]');
      if(payment)payment.value=p.payment_deadline||'';
      if(pickup)pickup.value=p.pickup_deadline||'';
      var btn=form.querySelector('[data-win-save-v237]');
      if(btn)btn.addEventListener('click',function(){saveDeadlines(id,form);});
    }
  }

  function saveDeadlines(id,form){
    var c=ensureClient();
    if(!c||!userId){window.alert('ログイン情報を取得できませんでした。');return;}
    var payment=form.querySelector('[data-win-payment-v237]');
    var pickup=form.querySelector('[data-win-pickup-v237]');
    var btn=form.querySelector('[data-win-save-v237]');
    var paymentValue=payment&&payment.value?payment.value:null;
    var pickupValue=pickup&&pickup.value?pickup.value:null;
    if(btn){btn.disabled=true;btn.textContent='保存中...';}
    c.from('user_lottery_progress').update({
      payment_deadline:paymentValue,
      pickup_deadline:pickupValue,
      updated_at:new Date().toISOString()
    }).eq('user_id',userId).eq('lottery_id',id).then(function(res){
      if(res&&res.error)throw res.error;
      if(!progressById[id])progressById[id]={lottery_id:id,status:'当選'};
      progressById[id].payment_deadline=paymentValue;
      progressById[id].pickup_deadline=pickupValue;
      applyDom();
      if(btn){btn.disabled=false;btn.textContent='保存しました ✓';setTimeout(function(){if(btn)btn.textContent='期限を保存';},1400);}
    }).catch(function(err){
      console.error('[TOM V2.37] deadline save failed',err);
      if(btn){btn.disabled=false;btn.textContent='期限を保存';}
      window.alert('期限の保存に失敗しました。通信状態を確認してもう一度お試しください。');
    });
  }

  function moveBulkToBottom(){
    var list=document.getElementById('lotteryList');
    var btn=document.getElementById(BULK_ID);
    if(!list||!btn||!list.parentNode)return;
    var parent=list.parentNode;
    if(list.nextSibling!==btn)parent.insertBefore(btn,list.nextSibling);
    btn.style.marginTop='10px';
    btn.style.marginBottom='6px';
  }

  function applyDom(){
    if(applying)return;
    applying=true;
    try{
      injectStyle();
      moveBulkToBottom();
      var rows=document.querySelectorAll('#lotteryList .lottery-row');
      for(var i=0;i<rows.length;i++){
        var id=cardId(rows[i]);
        if(id)decorateWinnerRow(rows[i],id);
      }
    }finally{applying=false;}
  }

  function loadState(){
    var c=ensureClient();
    if(!c)return Promise.resolve();
    return c.auth.getSession().then(function(r){
      var s=r&&r.data&&r.data.session;
      if(!s||!s.user)return null;
      userId=s.user.id;
      return c.from('user_lottery_progress').select('lottery_id,status,is_archived,payment_deadline,pickup_deadline').eq('user_id',userId);
    }).then(function(res){
      if(!res)return;
      if(res.error)throw res.error;
      progressById={};
      var rows=res.data||[];
      for(var i=0;i<rows.length;i++)progressById[rows[i].lottery_id]=rows[i];
      applyDom();
    }).catch(function(err){console.warn('[TOM V2.37] winner deadline load failed',err);});
  }

  function scheduleLoad(){
    if(loadTimer)clearTimeout(loadTimer);
    loadTimer=setTimeout(loadState,60);
  }

  var observer=new MutationObserver(function(){
    if(applying)return;
    scheduleLoad();
  });

  function start(){
    injectStyle();
    observer.observe(document.documentElement,{childList:true,subtree:true});
    loadState();
    setInterval(loadState,15000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
})();
