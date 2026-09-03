(function(){
  'use strict';

  var CONFIG_KEY='tom_lottery_supabase_config_v2';
  var STYLE_ID='tom-region-style-v240';
  var CARD_ID='tom-region-card-v240';
  var MODAL_ID='tom-region-modal-v240';
  var ALL_PREFS=['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
  var GROUPS=[
    {name:'北海道',prefs:['北海道']},
    {name:'東北',prefs:['青森県','岩手県','宮城県','秋田県','山形県','福島県']},
    {name:'関東',prefs:['茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県']},
    {name:'北陸・甲信越',prefs:['新潟県','富山県','石川県','福井県','山梨県','長野県']},
    {name:'東海',prefs:['岐阜県','静岡県','愛知県','三重県']},
    {name:'関西',prefs:['滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県']},
    {name:'中国',prefs:['鳥取県','島根県','岡山県','広島県','山口県']},
    {name:'四国',prefs:['徳島県','香川県','愛媛県','高知県']},
    {name:'九州・沖縄',prefs:['福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県']}
  ];

  var client=null;
  var userId=null;
  var profilePrefs=null;
  var lotteryMap={};
  var progressMap={};
  var applying=false;
  var applyTimer=null;
  var modalMode='member';
  var modalLotteryId=null;
  var modalSelected={};

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
#'+CARD_ID+'{background:#fff;border:1px solid #dce3ec;border-radius:15px;padding:11px 12px;margin:0 0 10px;box-shadow:0 2px 10px rgba(25,36,58,.03)}\
.tom-region-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.tom-region-card-title{font-size:13px;font-weight:1000}.tom-region-card-summary{font-size:10px;color:#6f7988;margin-top:3px;line-height:1.45}.tom-region-open{border:1px solid #cfd8e5;background:#fff;border-radius:10px;padding:8px 11px;font-size:11px;font-weight:1000;white-space:nowrap}\
#'+MODAL_ID+'{position:fixed;inset:0;z-index:2147483400;background:rgba(20,24,32,.48);display:flex;align-items:flex-end;justify-content:center;padding:12px}#'+MODAL_ID+'[hidden]{display:none!important}.tom-region-sheet{width:min(660px,100%);max-height:88vh;overflow:auto;background:#f7f8fb;border-radius:20px 20px 14px 14px;padding:13px;box-shadow:0 20px 60px rgba(0,0,0,.28)}.tom-region-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.tom-region-head h3{margin:0;font-size:17px}.tom-region-close{border:1px solid #d6dce6;background:#fff;border-radius:10px;padding:7px 10px;font-weight:1000}.tom-region-help{font-size:10px;color:#707b8c;line-height:1.55;margin:7px 0 9px}.tom-region-global{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:8px}.tom-region-global button{border:1px solid #d4dce7;background:#fff;border-radius:10px;padding:8px;font-size:11px;font-weight:1000}.tom-region-groups{display:flex;flex-direction:column;gap:6px}.tom-region-group{border:1px solid #dce2ea;background:#fff;border-radius:12px;overflow:hidden}.tom-region-group-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px;padding:8px}.tom-region-expand{border:0;background:transparent;text-align:left;padding:0;font-size:12px;font-weight:1000;color:#243044}.tom-region-count{font-size:9px;color:#768293;margin-left:5px}.tom-region-area-toggle{border:1px solid #cdd7e4;background:#f7f9fc;border-radius:9px;padding:6px 8px;font-size:9px;font-weight:1000;color:#526077}.tom-region-area-toggle.on{background:#e9f8f0;border-color:#99d6b6;color:#17734c}.tom-region-pref-grid{display:none;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding:0 8px 9px}.tom-region-group.open .tom-region-pref-grid{display:grid}.tom-region-pref{border:1px solid #d8dee7;background:#fff;border-radius:9px;padding:7px 4px;font-size:10px;font-weight:900;color:#6c7686}.tom-region-pref.on{background:#eaf3ff;border-color:#78aef0;color:#1f68b9}.tom-region-save{width:100%;border:0;border-radius:11px;background:#2d7ce6;color:#fff;padding:11px;font-size:12px;font-weight:1000;margin-top:10px}.tom-region-save:disabled{opacity:.55}\
.tom-region-chip-v240{display:inline-flex;align-items:center;border:1px solid #a8ccec;background:#eef6ff;color:#22689f;border-radius:999px;padding:4px 7px;font-size:9px;font-weight:1000}.tom-admin-region-v240{margin-top:10px;border:1px solid #cfdceb;background:#f7fbff;border-radius:12px;padding:9px}.tom-admin-region-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.tom-admin-region-title{font-size:10px;color:#6a7687;font-weight:900}.tom-admin-region-value{font-size:11px;font-weight:1000;margin-top:2px}.tom-admin-region-btn{border:1px solid #b9cce3;background:#fff;border-radius:9px;padding:7px 9px;font-size:10px;font-weight:1000}.tom-admin-region-btn:disabled{opacity:.55}\
#tom-archive-manager-v226,#tom-archive-modal-v226{display:none!important}.tom-region-hidden-v240{display:none!important}\
@media(min-width:700px){#'+MODAL_ID+'{align-items:center}.tom-region-sheet{border-radius:20px}}@media(max-width:430px){.tom-region-pref-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}\
';
    document.head.appendChild(s);
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];});}
  function arr(v){return Array.isArray(v)?v:[];}
  function shortPref(v){
    if(v==='北海道')return v;
    return String(v||'').replace(/[都府県]$/,'');
  }
  function selectedObject(list){
    var o={},a=arr(list);
    for(var i=0;i<a.length;i++)o[a[i]]=true;
    return o;
  }
  function currentMemberSelected(){
    return profilePrefs===null?ALL_PREFS.slice():arr(profilePrefs).slice();
  }
  function countSelected(prefs,sel){
    var n=0;
    for(var i=0;i<prefs.length;i++)if(sel[prefs[i]])n++;
    return n;
  }
  function groupSummary(list){
    if(list===null||arr(list).length===ALL_PREFS.length)return 'すべての地域を表示';
    if(!arr(list).length)return '全国配送・地域制限なしのみ表示';
    var sel=selectedObject(list),parts=[];
    for(var i=0;i<GROUPS.length;i++){
      var g=GROUPS[i],n=countSelected(g.prefs,sel);
      if(n)parts.push(g.name+' '+n+'/'+g.prefs.length);
    }
    return parts.join('・')||'地域未選択';
  }
  function scopeLabel(prefs){
    var a=arr(prefs);
    if(!a.length)return '全国';
    var sel=selectedObject(a),full=[],partial=[];
    for(var i=0;i<GROUPS.length;i++){
      var g=GROUPS[i],n=countSelected(g.prefs,sel);
      if(n===g.prefs.length)full.push(g.name);
      else if(n>0)partial.push(g.name+'（一部）');
    }
    var all=full.concat(partial);
    if(all.length<=3)return all.join('・');
    return all.slice(0,2).join('・')+'ほか';
  }
  function rowId(row){
    var b=row&&row.querySelector('[data-open]');
    return b&&b.getAttribute('data-open');
  }
  function cardUnit(row){
    var p=row&&row.parentNode;
    if(p&&p.classList&&p.classList.contains('tom-swipe-shell'))return p;
    return row;
  }
  function isTerminal(status){return status==='完了'||status==='落選';}
  function progressFor(id){return progressMap[id]||{lottery_id:id,status:'未応募',is_archived:false};}
  function intersects(a,b){
    if(!a||!b)return false;
    var m=selectedObject(a);
    for(var i=0;i<b.length;i++)if(m[b[i]])return true;
    return false;
  }
  function shouldShowLottery(l){
    if(!l)return true;
    var p=progressFor(l.id);
    if(p.is_archived||p.status!=='未応募')return true;
    if(l.fulfillment==='全国配送')return true;
    var eligible=arr(l.eligible_prefectures);
    if(!eligible.length)return true;
    if(profilePrefs===null)return true;
    var mine=arr(profilePrefs);
    if(!mine.length)return false;
    return intersects(eligible,mine);
  }
  function dayDiff(dateStr){
    if(!dateStr)return 9999;
    var p=String(dateStr).split('-');
    if(p.length!==3)return 9999;
    var t=new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));
    var n=new Date(),d=new Date(n.getFullYear(),n.getMonth(),n.getDate());
    return Math.round((t-d)/86400000);
  }

  function ensureMemberCard(){
    var member=document.getElementById('memberView');
    if(!member)return;
    var card=document.getElementById(CARD_ID);
    if(!card){
      card=document.createElement('section');card.id=CARD_ID;
      card.innerHTML='<div class="tom-region-card-head"><div><div class="tom-region-card-title">📍 表示地域</div><div class="tom-region-card-summary"></div></div><button type="button" class="tom-region-open">設定</button></div>';
      var mail=document.getElementById('mailConnectCard');
      if(mail&&mail.parentNode)mail.parentNode.insertBefore(card,mail.nextSibling);else member.insertBefore(card,member.firstChild);
      card.querySelector('.tom-region-open').addEventListener('click',function(){openModal('member',null);});
    }
    var summary=card.querySelector('.tom-region-card-summary');
    if(summary)summary.textContent=groupSummary(profilePrefs);
  }
  function ensureModal(){
    var modal=document.getElementById(MODAL_ID);
    if(modal)return modal;
    modal=document.createElement('div');modal.id=MODAL_ID;modal.hidden=true;
    modal.innerHTML='<section class="tom-region-sheet"><div class="tom-region-head"><h3>📍 表示地域</h3><button type="button" class="tom-region-close">×</button></div><div class="tom-region-help"></div><div class="tom-region-global"><button type="button" data-all="on">すべてON</button><button type="button" data-all="off">すべてOFF</button></div><div class="tom-region-groups"></div><button type="button" class="tom-region-save">保存</button></section>';
    modal.querySelector('.tom-region-close').addEventListener('click',closeModal);
    modal.addEventListener('click',function(e){if(e.target===modal)closeModal();});
    modal.querySelector('[data-all="on"]').addEventListener('click',function(){setAll(true);});
    modal.querySelector('[data-all="off"]').addEventListener('click',function(){setAll(false);});
    modal.querySelector('.tom-region-save').addEventListener('click',saveModal);
    document.body.appendChild(modal);
    return modal;
  }
  function openModal(mode,lotteryId){
    modalMode=mode;modalLotteryId=lotteryId||null;
    var initial;
    if(mode==='admin'){
      var l=lotteryMap[lotteryId]||{};
      initial=arr(l.eligible_prefectures).length?arr(l.eligible_prefectures).slice():ALL_PREFS.slice();
    }else initial=currentMemberSelected();
    modalSelected=selectedObject(initial);
    var m=ensureModal();
    var title=m.querySelector('.tom-region-head h3');
    var help=m.querySelector('.tom-region-help');
    if(mode==='admin'){
      title.textContent='📍 抽選の対象地域';
      help.textContent='全国・地域制限なしの場合は「すべてON」。地域限定の場合は対象エリアまたは都道府県だけをONにしてください。';
    }else{
      title.textContent='📍 表示したい地域';
      help.textContent='全国配送は設定に関係なく表示します。地域限定の抽選だけ、この設定に合わせて絞り込みます。応募済み・当選など管理中の案件は地域外でも表示を続けます。';
    }
    renderGroups();m.hidden=false;
  }
  function closeModal(){var m=document.getElementById(MODAL_ID);if(m)m.hidden=true;}
  function setAll(on){
    modalSelected={};
    if(on)for(var i=0;i<ALL_PREFS.length;i++)modalSelected[ALL_PREFS[i]]=true;
    renderGroups();
  }
  function renderGroups(){
    var m=ensureModal(),host=m.querySelector('.tom-region-groups');
    var openNames={};
    var olds=host.querySelectorAll('.tom-region-group.open');
    for(var oi=0;oi<olds.length;oi++)openNames[olds[oi].getAttribute('data-group')]=true;
    host.innerHTML='';
    for(var i=0;i<GROUPS.length;i++){
      (function(g){
        var n=countSelected(g.prefs,modalSelected),box=document.createElement('div');
        box.className='tom-region-group'+(openNames[g.name]?' open':'');box.setAttribute('data-group',g.name);
        var prefsHtml='';
        for(var j=0;j<g.prefs.length;j++){
          var p=g.prefs[j];
          prefsHtml+='<button type="button" class="tom-region-pref'+(modalSelected[p]?' on':'')+'" data-pref="'+esc(p)+'">'+esc(shortPref(p))+'</button>';
        }
        box.innerHTML='<div class="tom-region-group-head"><button type="button" class="tom-region-expand">'+esc(g.name)+' <span class="tom-region-count">'+n+'/'+g.prefs.length+'</span> ▾</button><button type="button" class="tom-region-area-toggle'+(n===g.prefs.length?' on':'')+'">'+(n===g.prefs.length?'全ON':'一括ON')+'</button></div><div class="tom-region-pref-grid">'+prefsHtml+'</div>';
        box.querySelector('.tom-region-expand').addEventListener('click',function(){box.classList.toggle('open');});
        box.querySelector('.tom-region-area-toggle').addEventListener('click',function(){
          var all=countSelected(g.prefs,modalSelected)===g.prefs.length;
          for(var k=0;k<g.prefs.length;k++){if(all)delete modalSelected[g.prefs[k]];else modalSelected[g.prefs[k]]=true;}
          renderGroups();
        });
        var prefBtns=box.querySelectorAll('[data-pref]');
        for(var b=0;b<prefBtns.length;b++)prefBtns[b].addEventListener('click',function(){var p=this.getAttribute('data-pref');if(modalSelected[p])delete modalSelected[p];else modalSelected[p]=true;renderGroups();});
        host.appendChild(box);
      })(GROUPS[i]);
    }
  }
  function selectedArrayFromModal(){
    var out=[];
    for(var i=0;i<ALL_PREFS.length;i++)if(modalSelected[ALL_PREFS[i]])out.push(ALL_PREFS[i]);
    return out;
  }
  function saveModal(){
    var c=ensureClient(),m=ensureModal(),btn=m.querySelector('.tom-region-save'),selected=selectedArrayFromModal();
    if(!c||!userId){window.alert('ログイン情報を取得できませんでした。');return;}
    if(modalMode==='admin'&&!selected.length){window.alert('対象地域を1つ以上ONにしてください。全国の場合は「すべてON」にしてください。');return;}
    btn.disabled=true;btn.textContent='保存中...';
    var job;
    if(modalMode==='member'){
      var value=selected.length===ALL_PREFS.length?null:selected;
      job=c.rpc('set_my_preferred_prefectures',{p_prefectures:value}).then(function(res){if(res&&res.error)throw res.error;profilePrefs=value;});
    }else{
      var value2=selected.length===ALL_PREFS.length?null:selected;
      job=c.from('lotteries').update({eligible_prefectures:value2,updated_at:new Date().toISOString()}).eq('id',modalLotteryId).then(function(res){if(res&&res.error)throw res.error;if(lotteryMap[modalLotteryId])lotteryMap[modalLotteryId].eligible_prefectures=value2;});
    }
    job.then(function(){btn.disabled=false;btn.textContent='保存';closeModal();applyDom();}).catch(function(err){console.error('[TOM V2.40] region save failed',err);btn.disabled=false;btn.textContent='保存';window.alert('地域設定の保存に失敗しました。もう一度お試しください。');});
  }

  function decorateRegionChip(row,l){
    if(!row||!l)return;
    var old=row.querySelector('.tom-region-chip-v240');
    var eligible=arr(l.eligible_prefectures);
    if(l.fulfillment==='全国配送'||!eligible.length){if(old&&old.parentNode)old.parentNode.removeChild(old);return;}
    var meta=row.querySelector('.meta-line');
    if(!meta)return;
    if(!old){old=document.createElement('span');old.className='tom-region-chip-v240';meta.appendChild(old);}
    old.textContent='📍 '+scopeLabel(eligible);
  }
  function decorateAdmin(){
    var rows=document.querySelectorAll('#adminLotteryList .lottery-row');
    for(var i=0;i<rows.length;i++){
      var row=rows[i],id=rowId(row),l=lotteryMap[id];
      if(!id||!l)continue;
      decorateRegionChip(row,l);
      var details=row.querySelector('.details');if(!details)continue;
      var box=details.querySelector('.tom-admin-region-v240');
      if(!box){
        box=document.createElement('div');box.className='tom-admin-region-v240';
        var actions=details.querySelector('.admin-actions');
        if(actions&&actions.parentNode)actions.parentNode.insertBefore(box,actions);else details.appendChild(box);
      }
      var national=l.fulfillment==='全国配送',label=national?'全国配送（全員表示）':(arr(l.eligible_prefectures).length?scopeLabel(l.eligible_prefectures):'全国・地域制限なし');
      box.innerHTML='<div class="tom-admin-region-row"><div><div class="tom-admin-region-title">対象地域</div><div class="tom-admin-region-value">'+esc(label)+'</div></div><button type="button" class="tom-admin-region-btn"'+(national?' disabled':'')+'>'+(national?'設定不要':'地域設定')+'</button></div>';
      if(!national)(function(lotteryId,b){b.addEventListener('click',function(e){e.stopPropagation();openModal('admin',lotteryId);});})(id,box.querySelector('.tom-admin-region-btn'));
    }
  }

  function unifyArchive(){
    var base=document.getElementById('archiveWrap'),list=document.getElementById('archiveList');
    if(!base||!list)return;
    var note=base.querySelector('.archive-note');
    if(note)note.textContent='完了・落選・手動でアーカイブした抽選です。手動アーカイブはカードを右へスワイプすると管理中へ戻せます。';
    var rows=document.querySelectorAll('#lotteryList .lottery-row');
    for(var i=0;i<rows.length;i++){
      var row=rows[i],id=rowId(row),p=progressFor(id);
      if(!id||!p.is_archived)continue;
      var unit=cardUnit(row);
      row.classList.remove('tom-region-hidden-v240');
      row.style.display='';unit.style.display='';
      if(unit.parentNode!==list)list.appendChild(unit);
    }
    var archiveRows=list.querySelectorAll('.lottery-row');
    for(var j=0;j<archiveRows.length;j++){
      archiveRows[j].style.display='';archiveRows[j].classList.remove('tom-region-hidden-v240');
      var u=cardUnit(archiveRows[j]);if(u)u.style.display='';
    }
    var count=0,seen={};
    for(var id2 in progressMap)if(Object.prototype.hasOwnProperty.call(progressMap,id2)){
      var p2=progressMap[id2];if((p2.is_archived||isTerminal(p2.status))&&!seen[id2]){seen[id2]=1;count++;}
    }
    var c=document.getElementById('archiveCount');if(c)c.textContent=String(count);
    var empty=document.getElementById('archiveEmpty');if(empty)empty.hidden=count>0;
  }
  function applyMemberFilter(){
    var rows=document.querySelectorAll('#lotteryList .lottery-row');
    for(var i=0;i<rows.length;i++){
      var row=rows[i],id=rowId(row),l=lotteryMap[id];if(!id||!l)continue;
      decorateRegionChip(row,l);
      var unit=cardUnit(row),show=shouldShowLottery(l)&&!progressFor(id).is_archived&&!isTerminal(progressFor(id).status);
      if(show){row.classList.remove('tom-region-hidden-v240');if(unit)unit.classList.remove('tom-region-hidden-v240');}
      else{row.classList.add('tom-region-hidden-v240');if(unit)unit.classList.add('tom-region-hidden-v240');}
    }
    updateSummary();
  }
  function updateSummary(){
    var total=0,un=0,soon=0,today=0,won=0;
    for(var id in lotteryMap)if(Object.prototype.hasOwnProperty.call(lotteryMap,id)){
      var l=lotteryMap[id],p=progressFor(id);
      if(!shouldShowLottery(l))continue;
      if(!p.is_archived&&!isTerminal(p.status))total++;
      if(!p.is_archived&&p.status==='未応募'){
        un++;var d=dayDiff(l.deadline_date);if(d>=0&&d<=3)soon++;if(d===0)today++;
      }
      if(!p.is_archived&&p.status==='当選')won++;
    }
    var e;
    e=document.getElementById('countTotal');if(e)e.textContent=String(total);
    e=document.getElementById('countUnapplied');if(e)e.textContent=String(un);
    e=document.getElementById('countSoon');if(e)e.textContent=String(soon);
    e=document.getElementById('countToday');if(e)e.textContent=String(today);
    e=document.getElementById('countWon');if(e)e.textContent=String(won);
  }
  function applyDom(){
    if(applying)return;applying=true;
    try{
      injectStyle();ensureMemberCard();ensureModal();decorateAdmin();unifyArchive();applyMemberFilter();
    }finally{applying=false;}
  }
  function scheduleApply(){if(applyTimer)clearTimeout(applyTimer);applyTimer=setTimeout(applyDom,45);}
  function loadState(){
    var c=ensureClient();if(!c)return Promise.resolve();
    return c.auth.getSession().then(function(r){
      var s=r&&r.data&&r.data.session;if(!s||!s.user)return null;userId=s.user.id;
      return Promise.all([
        c.from('profiles').select('preferred_prefectures').eq('id',userId).single(),
        c.from('lotteries').select('id,title,store,fulfillment,eligible_prefectures,deadline_date').eq('is_active',true),
        c.from('user_lottery_progress').select('lottery_id,status,is_archived,archived_at').eq('user_id',userId)
      ]);
    }).then(function(all){
      if(!all)return;
      if(all[0]&&all[0].error)throw all[0].error;if(all[1]&&all[1].error)throw all[1].error;if(all[2]&&all[2].error)throw all[2].error;
      profilePrefs=all[0]&&all[0].data?all[0].data.preferred_prefectures:null;
      lotteryMap={};progressMap={};
      var ls=all[1]&&all[1].data?all[1].data:[],ps=all[2]&&all[2].data?all[2].data:[];
      for(var i=0;i<ls.length;i++)lotteryMap[ls[i].id]=ls[i];
      for(var j=0;j<ps.length;j++)progressMap[ps[j].lottery_id]=ps[j];
      applyDom();
    }).catch(function(err){console.warn('[TOM V2.40] region/archive load failed',err);});
  }
  var observer=new MutationObserver(function(){if(!applying)scheduleApply();});
  function start(){injectStyle();observer.observe(document.documentElement,{childList:true,subtree:true});loadState();setInterval(loadState,15000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
