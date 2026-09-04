(function(){
  'use strict';

  var BOUND='data-tom-deadline-v247';

  function byId(id){return document.getElementById(id);}
  function z(n){return String(Number(n)||0).padStart(2,'0');}
  function todayJST(){return new Date(Date.now()+9*60*60*1000).toISOString().slice(0,10);}
  function currentYearJST(){return Number(todayJST().slice(0,4));}

  function toIso(y,m,d){
    y=Number(y)||currentYearJST();
    m=Number(m);d=Number(d);
    if(!m||m<1||m>12||!d||d<1||d>31)return '';
    if(!arguments[0]){
      var today=todayJST();
      var cm=Number(today.slice(5,7));
      // 年表記なしで、現在月より大幅に前の月なら翌年扱い。
      if(m<cm-6)y++;
    }
    return y+'-'+z(m)+'-'+z(d);
  }

  function parseTime(s){
    var m=String(s||'').match(/([01]?\d|2[0-3])\s*[:：]\s*([0-5]\d)/);
    if(m)return z(m[1])+':'+z(m[2]);
    m=String(s||'').match(/([01]?\d|2[0-3])\s*時\s*(?:(\d{1,2})\s*分)?/);
    if(m)return z(m[1])+':'+z(m[2]||0);
    return '';
  }

  function parseDateToken(s){
    var text=String(s||'');
    var m=text.match(/(?:(\d{4})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    if(m)return {date:toIso(m[1],m[2],m[3]),time:parseTime(text)};
    m=text.match(/(?:(\d{4})[\/.\-])?(\d{1,2})[\/.\-](\d{1,2})(?!\d)/);
    if(m)return {date:toIso(m[1],m[2],m[3]),time:parseTime(text)};
    return {date:'',time:''};
  }

  function extractDeadline(text){
    var raw=String(text||'').replace(/\r/g,'');
    var ls=raw.split(/\n+/).map(function(x){return x.trim();}).filter(Boolean);
    var keys=/応募締切|申込締切|申し込み締切|受付締切|予約締切|受注締切|販売締切|締切日|応募期限|申込期限|申し込み期限|受付期限|応募終了|申込終了|受付終了|予約終了|受注終了|販売終了|締切|期限/;

    // 1. 「応募締切：10月21日 23:59」など、明示された締切行を最優先。
    for(var i=0;i<ls.length;i++){
      if(!keys.test(ls[i]))continue;
      var one=parseDateToken(ls[i]);
      if(one.date)return one;
    }

    // 2. 「応募期間：9月1日～10月21日 23:59」の終了側。
    for(var j=0;j<ls.length;j++){
      if(!/応募|申込|受付|予約|受注|販売|期間/.test(ls[j]))continue;
      var parts=ls[j].split(/[～〜~]/);
      if(parts.length>=2){
        var end=parseDateToken(parts[parts.length-1]);
        if(end.date)return end;
      }
      // ハイフン区切りは日付内のハイフンと衝突しない日本語日付だけ対応。
      var jp=ls[j].match(/(?:(\d{4})年\s*)?(\d{1,2})月(\d{1,2})日[\s\S]{0,24}?[\-ー]\s*(?:(\d{4})年\s*)?(\d{1,2})月(\d{1,2})日([\s\S]*)$/);
      if(jp){
        return {date:toIso(jp[4],jp[5],jp[6]),time:parseTime(jp[7]||ls[j])};
      }
    }
    return {date:'',time:''};
  }

  function fixAfterAnalyze(){
    var src=byId('sourceText');
    var deadlineEl=byId('pDeadline');
    if(!src||!deadlineEl)return;

    var found=extractDeadline(src.value);
    if(found.date){
      // 旧抽選解析が仮に入れた「今日」より、本文から明示取得した締切を必ず優先。
      deadlineEl.value=found.date;
      var timeEl=byId('pDeadlineTime');
      if(timeEl&&found.time)timeEl.value=found.time;
      deadlineEl.dispatchEvent(new Event('change',{bubbles:true}));
      if(timeEl&&found.time)timeEl.dispatchEvent(new Event('change',{bubbles:true}));
      return;
    }

    // 非抽選案件で締切を取得できない場合、旧解析の today fallback は信用しない。
    var typeEl=byId('pOpportunityType');
    var type=typeEl?typeEl.value:'lottery';
    if(type!=='lottery'&&deadlineEl.value===todayJST()){
      deadlineEl.value='';
      deadlineEl.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function bind(){
    var btn=byId('analyzeBtn');
    if(!btn||btn.getAttribute(BOUND))return;
    btn.setAttribute(BOUND,'1');
    btn.addEventListener('click',function(){
      // 本体解析 → V2.46解析の後に最終締切だけ確定する。
      setTimeout(fixAfterAnalyze,40);
    });
  }

  function start(){bind();setTimeout(bind,400);setTimeout(bind,1200);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
