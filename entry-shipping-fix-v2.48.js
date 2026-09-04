(function(){
  'use strict';

  var BOUND='data-tom-shipping-v248';

  function byId(id){return document.getElementById(id);}
  function clean(v){return String(v||'').replace(/\r/g,'').replace(/\s+/g,' ').trim();}

  function extractShipping(text){
    var raw=String(text||'').replace(/\r/g,'');
    var ls=raw.split(/\n+/).map(function(x){return x.trim();}).filter(Boolean);
    var key=/(発送予定|発送時期|お届け予定|お届け時期|出荷予定|出荷時期|発送開始|出荷開始|順次発送|順次お届け)/;
    var dateExpr='(?:\\d{4}年\\s*)?\\d{1,2}月(?:\\s*\\d{1,2}日)?(?:\\s*(?:上旬|中旬|下旬|末頃?|頃|ごろ))?';
    var rangeExpr='(?:\\d{4}年\\s*)?\\d{1,2}月(?:\\s*(?:上旬|中旬|下旬|末頃?|頃|ごろ))?\\s*[～〜~\-ー]\\s*(?:\\d{4}年\\s*)?\\d{1,2}月(?:\\s*(?:上旬|中旬|下旬|末頃?|頃|ごろ))?';

    for(var i=0;i<ls.length;i++){
      var line=ls[i];
      if(!key.test(line) && !/(?:応募|申込|注文|受付)後.{0,24}(?:発送|お届け|出荷)/.test(line))continue;

      // 例: 12月頃発送予定 / 12月下旬より順次発送 / 12月〜1月頃発送予定
      var beforeRange=line.match(new RegExp('('+rangeExpr+')[^。]{0,16}(?:発送予定|発送|お届け予定|お届け|出荷予定|出荷|順次発送|順次お届け)'));
      if(beforeRange)return clean(beforeRange[1]);
      var before=line.match(new RegExp('('+dateExpr+')[^。]{0,16}(?:発送予定|発送|お届け予定|お届け|出荷予定|出荷|順次発送|順次お届け)'));
      if(before)return clean(before[1]);

      // 例: 発送予定：12月頃 / お届け予定 2027年1月下旬
      var afterRange=line.match(new RegExp('(?:発送予定|発送時期|お届け予定|お届け時期|出荷予定|出荷時期|発送開始|出荷開始)\\s*[:：]?\\s*('+rangeExpr+')'));
      if(afterRange)return clean(afterRange[1]);
      var after=line.match(new RegExp('(?:発送予定|発送時期|お届け予定|お届け時期|出荷予定|出荷時期|発送開始|出荷開始)\\s*[:：]?\\s*('+dateExpr+')'));
      if(after)return clean(after[1]);

      // 例: 応募後2〜3か月で発送 / 注文後3週間以内にお届け
      var rel=line.match(/((?:応募|申込|申し込み|注文|受付)後\s*\d+\s*(?:[～〜~\-ー]\s*\d+)?\s*(?:か月|ヶ月|カ月|ヵ月|週間|週|日)(?:程度|前後|以内|ほど|くらい)?)(?:[^。]{0,12})(?:発送|お届け|出荷)/);
      if(rel)return clean(rel[1]);
    }

    // 行をまたぐ「発送予定\n12月頃」も補完。
    for(var j=0;j<ls.length-1;j++){
      if(!key.test(ls[j]))continue;
      var next=ls[j+1];
      var nr=next.match(new RegExp('^('+rangeExpr+')'));
      if(nr)return clean(nr[1]);
      var nd=next.match(new RegExp('^('+dateExpr+')'));
      if(nd)return clean(nd[1]);
    }
    return '';
  }

  function fixAfterAnalyze(){
    var src=byId('sourceText');
    var out=byId('pShippingEstimate');
    if(!src||!out)return;
    var found=extractShipping(src.value);
    if(found){
      out.value=found;
      out.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function bind(){
    var btn=byId('analyzeBtn');
    if(!btn||btn.getAttribute(BOUND))return;
    btn.setAttribute(BOUND,'1');
    btn.addEventListener('click',function(){
      // 本体 → V2.46 → V2.47 の後に発送予定だけ最終確定。
      setTimeout(fixAfterAnalyze,90);
    });
  }

  function start(){bind();setTimeout(bind,400);setTimeout(bind,1200);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
