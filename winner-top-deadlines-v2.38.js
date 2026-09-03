(function(){
  'use strict';

  var CONFIG_KEY='tom_lottery_supabase_config_v2';
  var STYLE_ID='tom-winner-top-style-v238';
  var client=null;
  var userId=null;
  var progressById={};
  var lotteries=[];
  var applying=false;
  var applyTimer=null;

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
    var s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent='\
.tom-win-top-deadlines-v238{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}\
.tom-win-top-chip-v238{display:inline-flex;align-items:center;gap:4px;border:1px solid #d9c568;background:#fffdf0;color:#6e5a00;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:1000}\
.tom-win-top-chip-v238.unset{border-color:#d8dde5;background:#f7f8fa;color:#7a8493}\
.tom-win-top-chip-v238.soon{border-color:#efbd63;background:#fff7e6;color:#9a6500}\
.tom-win-top-chip-v238.today{border-color:#e6853f;background:#fff0df;color:#b34f00}\
.tom-win-top-chip-v238.expired{border-color:#e18c96;background:#fff0f2;color:#b52e3e}\
';
    document.head.appendChild(s);
  }

  function compact(v){
    return String(v||'').toLowerCase().replace(/[\s　・･'\"“”‘’「」『』【】()（）\[\]：:／/\-]/g,'');
  }

  function shortDate(v){
    if(!v)return '未入力';
    var p=String(v).split('-');
    if(p.length!==3)return String(v);
    return Number(p[1])+'/'+Number(p[2]);
  }

  function dayDiff(v){
    if(!v)return 9999;
    var p=String(v).split('-');
    if(p.length!==3)return 9999;
    var t=new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));
    var n=new Date();
    var d=new Date(n.getFullYear(),n.getMonth(),n.getDate());
    return Math.round((t-d)/86400000);
  }

  function cls(v){
    if(!v)return 'unset';
    var d=dayDiff(v);
    if(d<0)return 'expired';
    if(d===0)return 'today';
    if(d<=3)return 'soon';
    return '';
  }

  function suffix(v){
    if(!v)return '';
    var d=dayDiff(v);
    if(d<0)return ' 期限超過';
    if(d===0)return ' 本日';
    if(d===1)return ' 明日';
    if(d<=3)return ' あと'+d+'日';
    return '';
  }

  function makeChip(icon,label,v){
    var e=document.createElement('span');
    e.className='tom-win-top-chip-v238 '+cls(v);
    e.textContent=icon+' '+label+' '+shortDate(v)+suffix(v);
    return e;
  }

  function findLotteryForItem(item){
    var text=compact(item&&item.textContent);
    var best=null,bestScore=0;
    for(var i=0;i<lotteries.length;i++){
      var l=lotteries[i];
      var title=compact(l.title),store=compact(l.store),score=0;
      if(title&&text.indexOf(title)>=0)score+=8;
      else if(title.length>=12&&text.indexOf(title.slice(0,12))>=0)score+=4;
      if(store&&text.indexOf(store)>=0)score+=3;
      if(score>bestScore){best=l;bestScore=score;}
    }
    return bestScore>=5?best:null;
  }

  function removeOldCardDeadlinePrompt(){
    var olds=document.querySelectorAll('.tom-pc-deadline');
    for(var i=0;i<olds.length;i++){
      var parent=olds[i].parentNode;
      parent.removeChild(olds[i]);
      if(parent&&parent.classList&&parent.classList.contains('tom-pc-action')&&!parent.children.length){
        if(parent.parentNode)parent.parentNode.removeChild(parent);
      }
    }
  }

  function decorateTopWinners(){
    var panel=document.getElementById('tom-winners-v226');
    if(!panel)return;
    var items=panel.querySelectorAll('.tom-win-item');
    for(var i=0;i<items.length;i++){
      var item=items[i];
      var l=findLotteryForItem(item);
      if(!l)continue;
      var p=progressById[l.id]||{};
      if(p.status!=='当選'||p.is_archived)continue;
      var old=item.querySelector('.tom-win-deadline');
      if(old)old.style.display='none';
      var strip=item.querySelector('.tom-win-top-deadlines-v238');
      if(!strip){
        strip=document.createElement('div');
        strip.className='tom-win-top-deadlines-v238';
        var actions=item.querySelector('.tom-win-actions');
        if(actions&&actions.parentNode)actions.parentNode.insertBefore(strip,actions);
        else item.appendChild(strip);
      }
      strip.innerHTML='';
      strip.appendChild(makeChip('💳','支払期限',p.payment_deadline||''));
      strip.appendChild(makeChip('📦','受取期限',p.pickup_deadline||''));
    }
  }

  function applyDom(){
    if(applying)return;
    applying=true;
    try{
      injectStyle();
      removeOldCardDeadlinePrompt();
      decorateTopWinners();
    }finally{applying=false;}
  }

  function scheduleApply(){
    if(applyTimer)clearTimeout(applyTimer);
    applyTimer=setTimeout(applyDom,80);
  }

  function loadState(){
    var c=ensureClient();
    if(!c)return Promise.resolve();
    return c.auth.getSession().then(function(r){
      var s=r&&r.data&&r.data.session;
      if(!s||!s.user)return null;
      userId=s.user.id;
      return Promise.all([
        c.from('user_lottery_progress').select('lottery_id,status,is_archived,payment_deadline,pickup_deadline').eq('user_id',userId),
        c.from('lotteries').select('id,title,store').eq('is_active',true)
      ]);
    }).then(function(all){
      if(!all)return;
      if(all[0]&&all[0].error)throw all[0].error;
      if(all[1]&&all[1].error)throw all[1].error;
      progressById={};
      var rows=all[0]&&all[0].data?all[0].data:[];
      for(var i=0;i<rows.length;i++)progressById[rows[i].lottery_id]=rows[i];
      lotteries=all[1]&&all[1].data?all[1].data:[];
      applyDom();
    }).catch(function(err){console.warn('[TOM V2.38] winner top deadline sync failed',err);});
  }

  var observer=new MutationObserver(function(){
    if(applying)return;
    scheduleApply();
  });

  function start(){
    injectStyle();
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(loadState,700);
    setInterval(loadState,12000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
})();
