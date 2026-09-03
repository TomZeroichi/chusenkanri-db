(function(){
  'use strict';

  var CONFIG_KEY='tom_lottery_supabase_config_v2';
  var STYLE_ID='tom-swipe-archive-style-v235';
  var TERMINAL={ '完了':true, '落選':true };
  var client=null;
  var userId=null;
  var progressById={};
  var lotteries=[];
  var loadTimer=null;
  var applying=false;

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
.tom-swipe-shell{position:relative;overflow:hidden;border-radius:16px;touch-action:pan-y}\
.tom-swipe-shell>.lottery-row{position:relative;z-index:2;margin:0;transition:transform .18s ease;will-change:transform}\
.tom-swipe-shell.dragging>.lottery-row{transition:none}\
.tom-swipe-action{position:absolute;top:0;bottom:0;width:112px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:1000;letter-spacing:.02em;color:#fff;z-index:1;user-select:none;-webkit-user-select:none}\
.tom-swipe-shell.archive .tom-swipe-action{right:0;background:#e34855}\
.tom-swipe-shell.restore .tom-swipe-action{left:0;background:#3d83ef}\
.tom-swipe-hint{font-size:10px;color:#7b8494;margin:4px 2px 8px;text-align:right}\
.tom-swipe-shell.saving{opacity:.62;pointer-events:none}\
';
    document.head.appendChild(style);
  }

  function statusFor(id){
    var p=progressById[id];
    return p&&p.status?p.status:'未応募';
  }

  function isArchived(id){
    var p=progressById[id];
    return !!(p&&p.is_archived);
  }

  function isTerminalStatus(status){return !!TERMINAL[status];}

  function dayDiff(dateStr){
    if(!dateStr)return 9999;
    var parts=String(dateStr).split('-');
    if(parts.length!==3)return 9999;
    var target=new Date(Number(parts[0]),Number(parts[1])-1,Number(parts[2]));
    var now=new Date();
    var today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    return Math.round((target-today)/86400000);
  }

  function updateSummary(){
    if(!lotteries.length)return;
    var total=0,unapplied=0,soon=0,today=0,won=0,archivedCount=0;
    for(var i=0;i<lotteries.length;i++){
      var item=lotteries[i];
      var st=statusFor(item.id);
      var archived=isArchived(item.id);
      var terminal=isTerminalStatus(st);
      if(terminal||archived){
        archivedCount++;
        continue;
      }
      total++;
      if(st==='未応募'){
        unapplied++;
        var diff=dayDiff(item.deadline_date);
        if(diff===0)today++;
        if(diff>=0&&diff<=3)soon++;
      }
      if(st==='当選')won++;
    }
    var el;
    el=document.getElementById('countTotal');if(el)el.textContent=String(total);
    el=document.getElementById('countUnapplied');if(el)el.textContent=String(unapplied);
    el=document.getElementById('countSoon');if(el)el.textContent=String(soon);
    el=document.getElementById('countToday');if(el)el.textContent=String(today);
    el=document.getElementById('countWon');if(el)el.textContent=String(won);
    el=document.getElementById('archiveCount');if(el)el.textContent=String(archivedCount);
  }

  function ensureHint(){
    var list=document.getElementById('lotteryList');
    if(!list||document.getElementById('tom-swipe-hint-v235'))return;
    var hint=document.createElement('div');
    hint.id='tom-swipe-hint-v235';
    hint.className='tom-swipe-hint';
    hint.textContent='← カードをスワイプでアーカイブ';
    list.parentNode.insertBefore(hint,list);
  }

  function patchArchiveNote(){
    var note=document.querySelector('#archiveWrap .archive-note');
    if(note)note.textContent='完了・落選、または手動でアーカイブした抽選を保存します。手動アーカイブは右へスワイプすると一覧へ戻せます。';
  }

  function resetRow(shell,row){
    if(!shell||!row)return;
    shell.classList.remove('dragging');
    row.style.transform='translateX(0px)';
  }

  function saveArchiveState(id,archive,shell,row){
    var c=ensureClient();
    if(!c||!userId)return Promise.reject(new Error('ログイン情報を取得できません'));
    if(shell)shell.classList.add('saving');
    var now=new Date().toISOString();
    var op;
    if(archive){
      op=c.from('user_lottery_progress').upsert({
        user_id:userId,
        lottery_id:id,
        is_archived:true,
        archived_at:now,
        updated_at:now
      },{onConflict:'user_id,lottery_id'});
    }else{
      op=c.from('user_lottery_progress').update({
        is_archived:false,
        archived_at:null,
        updated_at:now
      }).eq('user_id',userId).eq('lottery_id',id);
    }
    return Promise.resolve(op).then(function(res){
      if(res&&res.error)throw res.error;
      if(!progressById[id])progressById[id]={lottery_id:id,status:'未応募'};
      progressById[id].is_archived=archive;
      progressById[id].archived_at=archive?now:null;
      applyDom();
      updateSummary();
      setTimeout(loadState,350);
    }).catch(function(err){
      console.error('[TOM V2.35] archive save failed',err);
      resetRow(shell,row);
      if(shell)shell.classList.remove('saving');
      alert('アーカイブの更新に失敗しました。通信状態を確認して、もう一度お試しください。');
      throw err;
    });
  }

  function bindSwipe(shell,row,id,mode){
    if(shell.getAttribute('data-swipe-bound')==='1')return;
    shell.setAttribute('data-swipe-bound','1');
    var surface=row.querySelector('.row-summary')||row;
    var startX=0,startY=0,lastX=0,tracking=false,horizontal=false,suppressClick=false;

    surface.addEventListener('touchstart',function(e){
      if(!e.touches||e.touches.length!==1)return;
      tracking=true;horizontal=false;suppressClick=false;
      startX=e.touches[0].clientX;startY=e.touches[0].clientY;lastX=startX;
    },{passive:true});

    surface.addEventListener('touchmove',function(e){
      if(!tracking||!e.touches||e.touches.length!==1)return;
      var x=e.touches[0].clientX,y=e.touches[0].clientY;
      var dx=x-startX,dy=y-startY;
      if(!horizontal){
        if(Math.abs(dx)<10)return;
        if(Math.abs(dx)<=Math.abs(dy)){tracking=false;return;}
        horizontal=true;
      }
      if((mode==='archive'&&dx>0)||(mode==='restore'&&dx<0))dx=0;
      if(mode==='archive')dx=Math.max(-112,Math.min(0,dx));
      else dx=Math.min(112,Math.max(0,dx));
      lastX=x;
      suppressClick=Math.abs(dx)>12;
      shell.classList.add('dragging');
      row.style.transform='translateX('+dx+'px)';
      e.preventDefault();
    },{passive:false});

    surface.addEventListener('touchend',function(){
      if(!tracking&&!horizontal)return;
      var dx=lastX-startX;
      tracking=false;
      shell.classList.remove('dragging');
      var reached=mode==='archive'?dx<=-68:dx>=68;
      if(!reached){resetRow(shell,row);return;}
      var message=mode==='archive'?'この抽選をアーカイブしますか？\nステータスは変更せず、そのまま保存します。':'この抽選を管理中の一覧へ戻しますか？';
      if(!window.confirm(message)){resetRow(shell,row);return;}
      saveArchiveState(id,mode==='archive',shell,row).then(function(){
        if(mode==='archive'){
          if(window.navigator&&navigator.vibrate)try{navigator.vibrate(20);}catch(e){}
        }
      });
      setTimeout(function(){suppressClick=false;},450);
    },{passive:true});

    row.addEventListener('click',function(e){
      if(!suppressClick)return;
      e.preventDefault();e.stopPropagation();
    },true);
  }

  function wrapRow(row,mode,id){
    if(!row||row.parentNode&&row.parentNode.classList&&row.parentNode.classList.contains('tom-swipe-shell'))return;
    var parent=row.parentNode;
    if(!parent)return;
    var shell=document.createElement('div');
    shell.className='tom-swipe-shell '+mode;
    shell.setAttribute('data-swipe-id',id);
    var action=document.createElement('div');
    action.className='tom-swipe-action';
    action.textContent=mode==='archive'?'アーカイブ':'一覧へ戻す';
    parent.insertBefore(shell,row);
    shell.appendChild(action);
    shell.appendChild(row);
    bindSwipe(shell,row,id,mode);
  }

  function moveManualArchivedRows(){
    var activeList=document.getElementById('lotteryList');
    var archiveList=document.getElementById('archiveList');
    if(!activeList||!archiveList)return;
    var rows=activeList.querySelectorAll('.lottery-row');
    for(var i=0;i<rows.length;i++){
      var row=rows[i];
      var open=row.querySelector('[data-open]');
      var id=open&&open.getAttribute('data-open');
      if(!id)continue;
      var st=statusFor(id);
      if(isArchived(id)&&!isTerminalStatus(st))archiveList.appendChild(row);
    }
  }

  function bindAllRows(){
    var rows=document.querySelectorAll('#lotteryList .lottery-row');
    var i,row,open,id,st;
    for(i=0;i<rows.length;i++){
      row=rows[i];open=row.querySelector('[data-open]');id=open&&open.getAttribute('data-open');
      if(!id)continue;st=statusFor(id);
      if(!isTerminalStatus(st)&&!isArchived(id))wrapRow(row,'archive',id);
    }
    rows=document.querySelectorAll('#archiveList .lottery-row');
    for(i=0;i<rows.length;i++){
      row=rows[i];open=row.querySelector('[data-open]');id=open&&open.getAttribute('data-open');
      if(!id)continue;st=statusFor(id);
      if(isArchived(id)&&!isTerminalStatus(st))wrapRow(row,'restore',id);
    }
  }

  function applyDom(){
    if(applying)return;
    applying=true;
    try{
      injectStyle();ensureHint();patchArchiveNote();
      moveManualArchivedRows();
      bindAllRows();
      var archiveList=document.getElementById('archiveList');
      var empty=document.getElementById('archiveEmpty');
      if(archiveList&&empty)empty.hidden=archiveList.querySelectorAll('.lottery-row').length>0;
      updateSummary();
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
    }).catch(function(err){console.warn('[TOM V2.35] archive state load failed',err);});
  }

  function scheduleLoad(){
    if(loadTimer)clearTimeout(loadTimer);
    loadTimer=setTimeout(function(){loadState();},250);
  }

  var observer=new MutationObserver(function(){
    if(applying)return;
    scheduleLoad();
  });

  function start(){
    injectStyle();
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(loadState,500);
    setInterval(loadState,15000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
})();
