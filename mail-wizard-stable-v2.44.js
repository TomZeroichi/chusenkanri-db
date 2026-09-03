(function(){
  'use strict';

  var CARD_ID='tom-mail-wizard-v244';
  var STYLE_ID='tom-mail-wizard-style-v244';
  var STEP_KEY='tom_mail_wizard_v241_step';
  var JOSHIN_KEY='tom_mail_wizard_v241_joshin';
  var POKEMON_KEY='tom_mail_wizard_v241_pokemon';
  var DOMAIN='lottery.tomtradesystem.com';
  var ADDRESS_RE=new RegExp('[A-Za-z0-9._%+-]+@'+DOMAIN.replace(/\./g,'\\.') ,'i');
  var JOSHIN_QUERY='from:joshinmail@joshin.co.jp subject:抽選販売';
  var POKEMON_QUERY='from:info@pokemoncenter-online.com {subject:"応募完了" subject:"抽選結果" subject:"当選" subject:"注文完了"}';
  var timer=null;
  var lastSig='';

  function byId(id){return document.getElementById(id);}
  function norm(v){return String(v||'').replace(/\s+/g,' ').trim();}
  function findAddress(){
    var ids=['mailForwardAddress','mailSetupAddress'];
    for(var i=0;i<ids.length;i++){
      var el=byId(ids[i]);
      var m=el&&String(el.textContent||'').match(ADDRESS_RE);
      if(m)return m[0];
    }
    var original=byId('mailConnectCard');
    var text=original?String(original.textContent||''):'';
    var all=text.match(ADDRESS_RE);
    return all?all[0]:'';
  }
  function connected(){
    var status=byId('mailConnectStatus');
    var text=status?norm(status.textContent):'';
    return /連携済み/.test(text)&&!!findAddress();
  }
  function verificationText(){
    var ids=['mailVerifyInline','mailSetupVerification'];
    for(var i=0;i<ids.length;i++){
      var el=byId(ids[i]);
      if(!el)continue;
      var t=norm(el.textContent);
      if(t&&!/確認メール待ち|待機|準備中/.test(t))return t;
    }
    return '';
  }
  function injectStyle(){
    if(byId(STYLE_ID))return;
    var s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='#'+CARD_ID+'{background:#fff;border:1px solid #cfe0f6;border-radius:16px;padding:13px;margin-bottom:12px;box-shadow:0 2px 10px rgba(25,36,58,.04)}#'+CARD_ID+' .mw-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}#'+CARD_ID+' .mw-title{font-size:15px;font-weight:1000;color:#1f2c40}#'+CARD_ID+' .mw-sub{font-size:11px;line-height:1.5;color:#718096;margin-top:3px}#'+CARD_ID+' .mw-progress{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:12px 0 10px}#'+CARD_ID+' .mw-progress span{border-radius:999px;background:#edf1f6;color:#7a8492;text-align:center;padding:6px 4px;font-size:9px;font-weight:1000}#'+CARD_ID+' .mw-progress span.active{background:#e7f1ff;color:#2369c9;border:1px solid #a9c9f2}#'+CARD_ID+' .mw-progress span.done{background:#e9f8f1;color:#168459;border:1px solid #b8dfcd}#'+CARD_ID+' .mw-step{border:1px solid #dfe6ef;background:#fbfcfe;border-radius:13px;padding:11px}#'+CARD_ID+' .mw-step-title{font-size:14px;font-weight:1000;margin-bottom:5px;color:#28384e}#'+CARD_ID+' .mw-help{font-size:11px;line-height:1.6;color:#657287;margin:0 0 9px}#'+CARD_ID+' .mw-address{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:stretch}#'+CARD_ID+' .mw-code{min-width:0;border:1px solid #d6dee9;background:#fff;border-radius:10px;padding:10px;font:700 11px ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;color:#1f2937}#'+CARD_ID+' button,#'+CARD_ID+' a.mw-btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border-radius:10px;min-height:39px;padding:8px 11px;font-size:11px;font-weight:1000;box-sizing:border-box}#'+CARD_ID+' .mw-primary{border:0;background:#3d83ef;color:#fff}#'+CARD_ID+' .mw-soft{border:1px solid #cfd8e4;background:#fff;color:#34445a}#'+CARD_ID+' .mw-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}#'+CARD_ID+' .mw-actions>*{flex:1;min-width:120px}#'+CARD_ID+' .mw-verify{margin-top:9px;border:1px solid #efd99d;background:#fffaf0;color:#815f00;border-radius:10px;padding:9px;font-size:11px;font-weight:800;line-height:1.5}#'+CARD_ID+' .mw-shop{border:1px solid #dde4ed;background:#fff;border-radius:12px;padding:10px;margin-top:8px}#'+CARD_ID+' .mw-shop-head{display:flex;align-items:center;justify-content:space-between;gap:8px}#'+CARD_ID+' .mw-shop-name{font-size:13px;font-weight:1000}#'+CARD_ID+' .mw-shop-status{font-size:9px;font-weight:1000;color:#758092;background:#f0f3f7;border-radius:999px;padding:4px 7px}#'+CARD_ID+' .mw-shop-status.done{background:#e9f8f1;color:#168459}#'+CARD_ID+' .mw-query{margin-top:7px;border:1px dashed #d2dbe7;background:#f8fafc;border-radius:9px;padding:8px;font-size:10px;color:#536176;word-break:break-all}#'+CARD_ID+' .mw-check{margin-top:8px;display:flex;align-items:center;gap:7px;font-size:11px;font-weight:800;color:#4f5d70}#'+CARD_ID+' .mw-note{margin-top:9px;border-radius:10px;background:#f3f7fc;color:#5b6b80;padding:8px 9px;font-size:10px;line-height:1.5}#'+CARD_ID+' .mw-finish{background:#effaf5;border:1px solid #b8dfcd;color:#17734f;border-radius:12px;padding:12px;text-align:center;font-size:13px;font-weight:1000}@media(max-width:430px){#'+CARD_ID+'{padding:11px}#'+CARD_ID+' .mw-address{grid-template-columns:1fr}#'+CARD_ID+' .mw-progress span{font-size:8px;padding:5px 2px}}';
    document.head.appendChild(s);
  }
  function copyFallback(text){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}ta.remove();}
  function copyText(text,btn){function done(){if(!btn)return;var old=btn.textContent;btn.textContent='コピーしました ✓';setTimeout(function(){if(btn)btn.textContent=old;},1200);}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(done,function(){copyFallback(text);done();});else{copyFallback(text);done();}}
  function getStep(){var n=parseInt(localStorage.getItem(STEP_KEY)||'1',10);return n>=1&&n<=3?n:1;}
  function shopDone(k){return localStorage.getItem(k)==='1';}
  function progressHtml(step){var labels=['1 専用アドレス','2 Gmail転送','3 ショップ設定'],out='';for(var i=1;i<=3;i++)out+='<span class="'+(i<step?'done':i===step?'active':'')+'">'+labels[i-1]+'</span>';return out;}
  function step1(address){return '<div class="mw-step"><div class="mw-step-title">① 専用メールアドレスをコピー</div><p class="mw-help">このアドレスはあなた専用です。Gmailの転送先として登録します。</p><div class="mw-address"><div class="mw-code">'+(address||'専用アドレスを準備中...')+'</div><button type="button" class="mw-primary" data-copy-address '+(!address?'disabled':'')+'>コピー</button></div><div class="mw-actions"><button type="button" class="mw-primary" data-next="2" '+(!address?'disabled':'')+'>コピーできた → 次へ</button></div></div>';}
  function step2(address,verify){return '<div class="mw-step"><div class="mw-step-title">② Gmailに転送先を登録</div><p class="mw-help">PCのGmailで「設定 → メール転送とPOP/IMAP → 転送先アドレスを追加」を開き、専用アドレスを登録します。</p><div class="mw-address"><div class="mw-code">'+(address||'専用アドレスを準備中...')+'</div><button type="button" class="mw-soft" data-copy-address '+(!address?'disabled':'')+'>コピー</button></div><div class="mw-actions"><a class="mw-btn mw-primary" target="_blank" rel="noopener" href="https://mail.google.com/mail/u/0/#settings/fwdandpop">Gmail転送設定を開く</a><button type="button" class="mw-soft" data-refresh>確認状態を更新</button></div><div class="mw-verify">'+(verify?'📩 TOMに届いた確認情報：<br>'+verify:'Gmailからの確認メール待ちです。届いたらここに確認コード／リンクが表示されます。')+'</div><div class="mw-note">※ Gmailの自動転送設定はPC推奨です。初回設定が終われば普段はスマホだけでOKです。</div><div class="mw-actions"><button type="button" class="mw-soft" data-next="1">戻る</button><button type="button" class="mw-primary" data-next="3">Gmailの確認ができた → 次へ</button></div></div>';}
  function shopCard(name,query,key){var done=shopDone(key);return '<div class="mw-shop"><div class="mw-shop-head"><div class="mw-shop-name">'+name+'</div><span class="mw-shop-status '+(done?'done':'')+'">'+(done?'設定済み ✓':'未設定')+'</span></div><div class="mw-query">'+query+'</div><div class="mw-actions"><button type="button" class="mw-soft" data-query="'+(key===JOSHIN_KEY?'joshin':'pokemon')+'">条件をコピー</button><a class="mw-btn mw-primary" target="_blank" rel="noopener" href="https://mail.google.com/mail/u/0/#settings/filters">Gmailフィルター設定を開く</a></div><label class="mw-check"><input type="checkbox" data-shop="'+key+'" '+(done?'checked':'')+'> このショップのフィルター設定ができた</label></div>';}
  function step3(){var all=shopDone(JOSHIN_KEY)&&shopDone(POKEMON_KEY);return '<div class="mw-step"><div class="mw-step-title">③ 対応ショップだけを自動転送</div><p class="mw-help">「条件をコピー」→「Gmailフィルター設定を開く」の順に進み、転送先にTOM専用アドレスを指定します。</p>'+shopCard('Joshin',JOSHIN_QUERY,JOSHIN_KEY)+shopCard('ポケモンセンターオンライン',POKEMON_QUERY,POKEMON_KEY)+(all?'<div class="mw-finish" style="margin-top:10px">✅ メール連携の初回設定は完了です</div>':'')+'<div class="mw-actions"><button type="button" class="mw-soft" data-next="2">戻る</button></div></div>';}
  function bind(card,address){
    card.querySelectorAll('[data-copy-address]').forEach(function(btn){btn.onclick=function(){if(address)copyText(address,btn);};});
    card.querySelectorAll('[data-next]').forEach(function(btn){btn.onclick=function(){localStorage.setItem(STEP_KEY,btn.getAttribute('data-next'));lastSig='';render();};});
    var ref=card.querySelector('[data-refresh]');if(ref)ref.onclick=function(){var b=byId('refreshMailBtn');if(b)b.click();setTimeout(function(){lastSig='';render();},600);};
    card.querySelectorAll('[data-query]').forEach(function(btn){btn.onclick=function(){copyText(btn.getAttribute('data-query')==='joshin'?JOSHIN_QUERY:POKEMON_QUERY,btn);};});
    card.querySelectorAll('[data-shop]').forEach(function(ch){ch.onchange=function(){localStorage.setItem(ch.getAttribute('data-shop'),ch.checked?'1':'0');lastSig='';render();};});
  }
  function removeWizard(){var c=byId(CARD_ID);if(c)c.remove();lastSig='';}
  function render(){
    injectStyle();
    var original=byId('mailConnectCard');if(!original)return;
    if(connected()){
      removeWizard();
      return;
    }
    original.style.display='none';
    var address=findAddress(),verify=verificationText(),step=getStep();
    var sig=[address,verify,step,shopDone(JOSHIN_KEY),shopDone(POKEMON_KEY)].join('|');
    var card=byId(CARD_ID);
    if(!card){card=document.createElement('section');card.id=CARD_ID;original.parentNode.insertBefore(card,original);lastSig='';}
    if(sig===lastSig)return;
    card.innerHTML='<div class="mw-head"><div><div class="mw-title">📩 メール連携かんたん設定</div><div class="mw-sub">初回だけ3ステップ。設定後は対応メールから抽選状況を自動反映します。</div></div></div><div class="mw-progress">'+progressHtml(step)+'</div>'+(step===1?step1(address):step===2?step2(address,verify):step3());
    lastSig=sig;bind(card,address);
  }
  function schedule(){if(timer)clearTimeout(timer);timer=setTimeout(render,120);}
  function start(){
    injectStyle();
    var original=byId('mailConnectCard');
    if(original)new MutationObserver(schedule).observe(original,{childList:true,subtree:true,characterData:true});
    render();setTimeout(render,300);setTimeout(render,1000);setInterval(render,5000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();