(function(){
  'use strict';

  var CONFIG_KEY='tom_lottery_supabase_config_v2';
  var FILTER_KEY='tom_opportunity_type_filter_v242';
  var NAV_ID='tom-opportunity-nav-v242';
  var STYLE_ID='tom-events-newbadges-v252-style';
  var TYPES=['lottery','all_applicants','preorder','campaign','event'];
  var client=null,userId=null,items={},progress={},reads={},channel=null,scheduled=false;

  function byId(id){return document.getElementById(id);}
  function norm(v){return String(v||'').normalize?String(v||'').normalize('NFKC'):String(v||'');}
  function readConfig(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');}catch(e){return null;}}
  function currentType(){try{return localStorage.getItem(FILTER_KEY)||'all';}catch(e){return 'all';}}
  function ensureClient(){
    if(client)return client;
    var cfg=readConfig();
    if(!cfg||!cfg.url||!cfg.key||!window.__TOM_SUPABASE__||!window.__TOM_SUPABASE__.createClient)return null;
    client=window.__TOM_SUPABASE__.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  function esc(v){return String(v||'').replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];});}
  function z(n){return String(n).padStart(2,'0');}
  function isoDate(y,m,d){return String(y)+'-'+z(m)+'-'+z(d);}
  function inferYear(y,m,base){
    if(y)return Number(y);
    var now=base?new Date(base+'T00:00:00'):new Date();
    var yr=now.getFullYear(),cm=now.getMonth()+1;
    if(Number(m)<cm-6)yr++;
    return yr;
  }
  function parseDateToken(s,base){
    var m=norm(s).match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/);
    if(!m)m=norm(s).match(/(?:(\d{4})[\/.\-])?(\d{1,2})[\/.\-](\d{1,2})/);
    if(!m)return '';
    return isoDate(inferYear(m[1],m[2],base),m[2],m[3]);
  }
  function parseEventDates(text){
    var t=norm(text),start='',end='',timeText='';
    var range=t.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日[^\n]{0,28}?[～〜~\-ー]\s*(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/);
    if(range){
      var sy=inferYear(range[1],range[2]);
      start=isoDate(sy,range[2],range[3]);
      var ey=range[4]?Number(range[4]):sy;
      if(!range[4]&&Number(range[5])<Number(range[2])-6)ey++;
      end=isoDate(ey,range[5],range[6]);
    }
    if(!range){
      var shortRange=t.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日[^\n]{0,20}?[～〜~\-ー]\s*(\d{1,2})日/);
      if(shortRange){
        var yy=inferYear(shortRange[1],shortRange[2]);
        start=isoDate(yy,shortRange[2],shortRange[3]);
        end=isoDate(yy,shortRange[2],shortRange[4]);
      }
    }
    var lines=t.split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean);
    if(!start){
      for(var i=0;i<lines.length;i++){
        if(/開催日|開催期間|開催日時|日程|会期|イベント期間|開催予定/.test(lines[i])){
          start=parseDateToken(lines[i]);if(start)break;
        }
      }
    }
    if(!start){
      for(var j=0;j<lines.length;j++){
        if(/開催|イベント|フェスタ|展示会|ポップアップ|POP.?UP/i.test(lines[j])){
          start=parseDateToken(lines[j]);if(start)break;
        }
      }
    }
    if(start&&!end)end=start;
    for(var k=0;k<lines.length;k++){
      if(/開催時間|開催日時|時間|開場|開演/.test(lines[k])){
        var tm=lines[k].match(/([01]?\d|2[0-3])[:：]([0-5]\d)[^\n]{0,12}?[～〜~\-ー]\s*([01]?\d|2[0-3])[:：]([0-5]\d)/);
        if(tm){timeText=z(tm[1])+':'+z(tm[2])+'〜'+z(tm[3])+':'+z(tm[4]);break;}
      }
    }
    return {start:start,end:end,timeText:timeText};
  }
  function parseLocation(text){
    var lines=norm(text).split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean);
    for(var i=0;i<lines.length;i++){
      var m=lines[i].match(/^(?:会場|開催場所|場所|会場名|開催地)\s*[:：]?\s*(.+)$/);
      if(m&&m[1]&&!/未定|後日/.test(m[1]))return m[1].trim().slice(0,100);
      if(/^(?:会場|開催場所|場所|会場名|開催地)\s*[:：]?$/.test(lines[i])&&lines[i+1])return lines[i+1].trim().slice(0,100);
    }
    return '';
  }
  function looksLikeEvent(text){
    var t=norm(text);
    var strong=/ジャンプフェスタ|ポケモン(?:センター)?.{0,12}(?:イベント|フェス)|(?:イベント|フェスタ|展示会|ポップアップ|POP.?UP|体験会|交流会|ステージイベント|カードイベント)|開催(?:日|日時|期間|場所|会場|決定|予定)/i.test(t);
    if(!strong)return false;
    if(/応募者全員(?:大)?サービス|期間限定受注|受注生産/.test(t)&&!/イベント|フェスタ|展示会|開催会場/.test(t))return false;
    return true;
  }

  function injectStyle(){
    if(byId(STYLE_ID))return;
    var s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='\
#'+NAV_ID+' .tom-new-count-v252{display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;margin-left:5px;padding:0 5px;border-radius:999px;background:#e83b5b;color:#fff;font-size:9px;font-weight:1000;line-height:1}\
#'+NAV_ID+' .tom-new-count-v252[hidden]{display:none!important}\
.tom-type-badge-v242.event{background:#e9f5ff!important;border-color:#a9d6f4!important;color:#17668f!important}\
.deadline-box.tom-event-date-v252{background:#eef8ff;border-color:#9dd2ef;color:#1d607f}\
.deadline-box.tom-event-date-v252 .deadline-left{color:#19739f}\
.tom-event-location-v252{display:inline-flex;align-items:center;border:1px solid #c9dce9;background:#f5fbff;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900;color:#446474}\
@media(max-width:520px){#'+NAV_ID+' .tom-new-count-v252{min-width:16px;height:16px;font-size:8px;margin-left:4px}}';
    document.head.appendChild(s);
  }
  function addOption(select,value,label){
    if(!select||select.querySelector('option[value="'+value+'"]'))return;
    var o=document.createElement('option');o.value=value;o.textContent=label;select.appendChild(o);
  }
  function ensureEventOptions(){
    addOption(byId('pOpportunityType'),'event','🎪 イベント');
    addOption(byId('eOpportunityType'),'event','🎪 イベント');
    var modal=byId('tom-opportunity-modal-v242');
    if(modal){var sel=modal.querySelector('select');addOption(sel,'event','🎪 イベント');}
  }
  function fieldLabel(id,text){
    var el=byId(id);if(!el)return;
    var lab=el.closest?el.closest('label'):el.parentNode;if(!lab)return;
    var sp=lab.querySelector('span');if(sp&&sp.textContent!==text)sp.textContent=text;
  }
  function applyTypeUI(prefix){
    var typeEl=byId(prefix+'OpportunityType');if(!typeEl)return;
    var isEvent=typeEl.value==='event';
    if(prefix==='p'){
      fieldLabel('pStart',isEvent?'開催開始日':'受付開始日');
      fieldLabel('pDeadline',isEvent?'開催終了日':'締切日');
      fieldLabel('pDeadlineTime',isEvent?'終了時刻':'締切時刻');
      var pay=byId('pPaymentTiming');if(pay&&pay.parentNode)pay.parentNode.style.display=isEvent?'none':'';
      var extra=byId('tomEntryExtraFields');if(extra)extra.style.display=isEvent?'none':'';
      var r=document.querySelectorAll('.tom-preview-result-field');for(var i=0;i<r.length;i++)if(isEvent)r[i].style.display='none';
    }else{
      fieldLabel('eStart',isEvent?'開催開始日':'受付開始日');
      fieldLabel('eDeadline',isEvent?'開催終了日':'締切日');
      fieldLabel('eDeadlineTime',isEvent?'終了時刻':'締切時刻');
      var ex=byId('eOpportunityExtraFields');if(ex&&isEvent)ex.classList.add('hidden');
    }
  }
  function appendEventNote(location,timeText){
    var n=byId('pNote');if(!n)return;
    var v=String(n.value||'').trim(),add=[];
    if(location&&v.indexOf('開催場所：')<0&&v.indexOf('開催場所:')<0)add.push('開催場所：'+location);
    if(timeText&&v.indexOf('開催時間：')<0&&v.indexOf('開催時間:')<0)add.push('開催時間：'+timeText);
    if(add.length)n.value=(v?v+'\n':'')+add.join('\n');
  }
  function applyEventAnalysis(){
    var src=byId('sourceText');if(!src||!looksLikeEvent(src.value))return;
    ensureEventOptions();
    var type=byId('pOpportunityType');if(type){type.value='event';var ev=document.createEvent('HTMLEvents');ev.initEvent('change',true,false);type.dispatchEvent(ev);}
    var dates=parseEventDates(src.value),loc=parseLocation(src.value);
    if(dates.start&&byId('pStart'))byId('pStart').value=dates.start;
    if(dates.end&&byId('pDeadline'))byId('pDeadline').value=dates.end;
    appendEventNote(loc,dates.timeText);
    var det=byId('tomEntryDetected');if(det)det.textContent='🎪 イベント｜イベント開催情報を検出';
    applyTypeUI('p');
    var checks=byId('tom-entry-analysis-status-v246');
    if(checks){var spans=checks.querySelectorAll('span');for(var i=0;i<spans.length;i++){if(spans[i].textContent.indexOf('締切')>=0)spans[i].textContent=spans[i].textContent.replace('締切','開催日');}}
  }

  function getRowId(row){var b=row&&row.querySelector('[data-open]');return b?b.getAttribute('data-open'):'';}
  function fmtDate(v){if(!v)return '未入力';var p=String(v).split('-');return p.length===3?(Number(p[1])+'/'+Number(p[2])):v;}
  function dayDiff(v){if(!v)return 99999;var p=String(v).split('-');if(p.length!==3)return 99999;var a=new Date(+p[0],+p[1]-1,+p[2]),n=new Date(),b=new Date(n.getFullYear(),n.getMonth(),n.getDate());return Math.round((a-b)/86400000);}
  function locationFromNote(note){var m=String(note||'').match(/開催場所\s*[:：]\s*([^\n/]+)/);return m?m[1].trim():'';}
  function setText(el,text){if(el&&el.textContent!==text)el.textContent=text;}
  function decorateEventRow(row,item){
    if(!row||!item||item.opportunity_type!=='event')return;
    var badge=row.querySelector('.tom-type-badge-v242');
    if(badge){if(badge.className!=='tom-type-badge-v242 event')badge.className='tom-type-badge-v242 event';setText(badge,'🎪 イベント');}
    var box=row.querySelector('.deadline-box');
    if(box){
      box.classList.add('tom-event-date-v252');
      setText(box.querySelector('.deadline-label'),'開催');
      setText(box.querySelector('.deadline-date'),fmtDate(item.start_date||item.deadline_date));
      var startLeft=dayDiff(item.start_date||item.deadline_date),endLeft=dayDiff(item.deadline_date||item.start_date),left='';
      if(startLeft>0)left='あと'+startLeft+'日';else if(startLeft===0)left='本日開催';else if(endLeft>=0)left='開催中';else left='終了';
      setText(box.querySelector('.deadline-left'),left);
      var tm=box.querySelector('.deadline-time');if(tm)tm.style.display='none';
    }
    var infos=row.querySelectorAll('.info-grid .info-box');
    if(infos.length>=2){
      setText(infos[0].querySelector('.info-label'),'開催開始');setText(infos[0].querySelector('.info-value'),fmtDate(item.start_date||item.deadline_date));
      setText(infos[1].querySelector('.info-label'),'開催終了');setText(infos[1].querySelector('.info-value'),fmtDate(item.deadline_date||item.start_date));
    }
    var info=row.querySelector('.tom-type-info-v242');
    if(info){
      var loc=locationFromNote(item.note),sig='event|'+loc;
      if(info.getAttribute('data-v252-event-sig')!==sig){
        info.innerHTML='<span class="tom-type-chip-v242">🎪 イベント</span>'+(loc?'<span class="tom-event-location-v252">📍 '+esc(loc)+'</span>':'');
        info.setAttribute('data-v252-event-sig',sig);info.style.display='flex';
      }
    }
    var st=row.querySelector('.tom-type-status-v242 select');
    if(st){
      var opts=['未確認','確認済み','参加予定','参加済み','完了'];
      var cur=progress[item.id]||'未確認';if(opts.indexOf(cur)<0)cur='未確認';
      var sig=opts.join('|')+'|'+cur;
      if(st.getAttribute('data-v252-event-status')!==sig){
        var html='';for(var i=0;i<opts.length;i++)html+='<option value="'+opts[i]+'"'+(opts[i]===cur?' selected':'')+'>'+opts[i]+'</option>';
        st.innerHTML=html;st.setAttribute('data-v252-event-status',sig);
      }
    }
  }
  function decorateRows(){
    var rows=document.querySelectorAll('#lotteryList .lottery-row,#archiveList .lottery-row,#adminLotteryList .lottery-row');
    for(var i=0;i<rows.length;i++){var id=getRowId(rows[i]),item=items[id];if(item&&item.opportunity_type==='event')decorateEventRow(rows[i],item);}
    if(currentType()==='event')updateEventSummary();
  }
  function updateEventSummary(){
    var labels=document.querySelectorAll('.summary-label');
    if(labels.length>=5){setText(labels[0],'管理中');setText(labels[1],'未確認');setText(labels[2],'3日以内');setText(labels[3],'本日開催');setText(labels[4],'参加予定');}
    var total=0,un=0,soon=0,today=0,plan=0;
    Object.keys(items).forEach(function(id){var x=items[id];if(x.opportunity_type!=='event')return;var st=progress[id]||'未確認',d=dayDiff(x.start_date||x.deadline_date);if(st!=='完了')total++;if(st==='未確認')un++;if(d>=0&&d<=3)soon++;if(d===0)today++;if(st==='参加予定')plan++;});
    setText(byId('countTotal'),String(total));setText(byId('countUnapplied'),String(un));setText(byId('countSoon'),String(soon));setText(byId('countToday'),String(today));setText(byId('countWon'),String(plan));
  }

  function ensureNav(){
    var nav=byId(NAV_ID);if(!nav)return;
    if(!nav.querySelector('[data-tom-type-filter="event"]')){
      var b=document.createElement('button');b.type='button';b.setAttribute('data-tom-type-filter','event');b.innerHTML='🎪 イベント';nav.appendChild(b);
    }
    var bs=nav.querySelectorAll('[data-tom-type-filter]');
    for(var i=0;i<bs.length;i++){
      if(!bs[i].querySelector('.tom-new-count-v252')){var s=document.createElement('span');s.className='tom-new-count-v252';s.hidden=true;bs[i].appendChild(s);}
    }
    if(!nav.getAttribute('data-v252-bound')){
      nav.setAttribute('data-v252-bound','1');
      nav.addEventListener('click',function(e){
        var b=e.target.closest&&e.target.closest('[data-tom-type-filter]');if(!b)return;
        var type=b.getAttribute('data-tom-type-filter');
        if(type&&type!=='all')setTimeout(function(){markSeen(type);},60);
        setTimeout(function(){applyTypeUI('p');decorateRows();},90);
      });
    }
    renderCounts();
  }
  function renderCounts(){
    var nav=byId(NAV_ID);if(!nav)return;
    var counts={lottery:0,all_applicants:0,preorder:0,campaign:0,event:0},all=0;
    Object.keys(items).forEach(function(id){var x=items[id],t=x.opportunity_type||'lottery',seen=reads[t];if(!seen)return;if(new Date(x.created_at).getTime()>new Date(seen).getTime()){counts[t]=(counts[t]||0)+1;all++;}});
    TYPES.forEach(function(t){var b=nav.querySelector('[data-tom-type-filter="'+t+'"]'),s=b&&b.querySelector('.tom-new-count-v252');if(s){var n=counts[t]||0;s.textContent=n>99?'99+':String(n);s.hidden=!n;}});
    var ab=nav.querySelector('[data-tom-type-filter="all"]'),as=ab&&ab.querySelector('.tom-new-count-v252');if(as){as.textContent=all>99?'99+':String(all);as.hidden=!all;}
  }
  function markSeen(type){
    var c=ensureClient();if(!c||!userId||TYPES.indexOf(type)<0)return;
    var now=new Date().toISOString();reads[type]=now;renderCounts();
    c.from('user_opportunity_type_reads').upsert({user_id:userId,opportunity_type:type,last_seen_at:now},{onConflict:'user_id,opportunity_type'}).then(function(r){if(r&&r.error)console.warn('[V2.52] read marker save failed',r.error);});
  }

  function refreshData(){
    var c=ensureClient();if(!c)return Promise.resolve();
    return c.auth.getSession().then(function(r){
      var s=r&&r.data&&r.data.session;if(!s||!s.user)return null;userId=s.user.id;
      return Promise.all([
        c.from('lotteries').select('id,opportunity_type,created_at,start_date,deadline_date,deadline_time,note,title,store').eq('is_active',true),
        c.from('user_lottery_progress').select('lottery_id,status').eq('user_id',userId),
        c.from('user_opportunity_type_reads').select('opportunity_type,last_seen_at').eq('user_id',userId)
      ]);
    }).then(function(res){
      if(!res)return;
      var a=res[0],p=res[1],rd=res[2];if(a.error)throw a.error;if(p.error)throw p.error;if(rd.error)throw rd.error;
      items={};(a.data||[]).forEach(function(x){items[x.id]=x;});progress={};(p.data||[]).forEach(function(x){progress[x.lottery_id]=x.status;});reads={};(rd.data||[]).forEach(function(x){reads[x.opportunity_type]=x.last_seen_at;});
      ensureNav();decorateRows();renderCounts();
    }).catch(function(err){console.warn('[V2.52] refresh failed',err);});
  }
  function setupRealtime(){
    var c=ensureClient();if(!c||channel)return;
    channel=c.channel('tom-entry-new-v252').on('postgres_changes',{event:'INSERT',schema:'public',table:'lotteries'},function(payload){
      refreshData().then(function(){var t=payload&&payload.new&&(payload.new.opportunity_type||'lottery');var member=byId('memberView');if(member&&!member.classList.contains('hidden')&&currentType()===t)markSeen(t);});
    }).on('postgres_changes',{event:'UPDATE',schema:'public',table:'lotteries'},function(){refreshData();}).on('postgres_changes',{event:'DELETE',schema:'public',table:'lotteries'},function(){refreshData();}).subscribe();
  }
  function scheduleDecorate(){if(scheduled)return;scheduled=true;setTimeout(function(){scheduled=false;ensureEventOptions();ensureNav();decorateRows();},70);}
  function bind(){
    injectStyle();ensureEventOptions();ensureNav();applyTypeUI('p');applyTypeUI('e');
    var p=byId('pOpportunityType');if(p&&!p.getAttribute('data-v252-bound')){p.setAttribute('data-v252-bound','1');p.addEventListener('change',function(){setTimeout(function(){applyTypeUI('p');},0);});}
    var e=byId('eOpportunityType');if(e&&!e.getAttribute('data-v252-bound')){e.setAttribute('data-v252-bound','1');e.addEventListener('change',function(){setTimeout(function(){applyTypeUI('e');},0);});}
    var analyze=byId('analyzeBtn');if(analyze&&!analyze.getAttribute('data-v252-bound')){analyze.setAttribute('data-v252-bound','1');analyze.addEventListener('click',function(){setTimeout(applyEventAnalysis,45);});}
    var edit=byId('editBackdrop');if(edit&&!edit.getAttribute('data-v252-observed')){edit.setAttribute('data-v252-observed','1');new MutationObserver(function(){setTimeout(function(){ensureEventOptions();applyTypeUI('e');},0);}).observe(edit,{attributes:true,attributeFilter:['class']});}
    var lists=[byId('lotteryList'),byId('archiveList'),byId('adminLotteryList')];for(var i=0;i<lists.length;i++){if(lists[i]&&!lists[i].getAttribute('data-v252-observed')){lists[i].setAttribute('data-v252-observed','1');new MutationObserver(scheduleDecorate).observe(lists[i],{childList:true,subtree:true});}}
  }
  function start(){bind();refreshData().then(setupRealtime);setTimeout(bind,500);setTimeout(function(){refreshData();bind();},1400);document.addEventListener('visibilitychange',function(){if(!document.hidden)refreshData();});window.addEventListener('focus',refreshData);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
