(function(){
  'use strict';
  var CARD_ID='tom-mail-status-v245';
  var STYLE_ID='tom-mail-status-style-v245';
  var DOMAIN='lottery.tomtradesystem.com';
  var ADDRESS_RE=new RegExp('[A-Za-z0-9._%+-]+@'+DOMAIN.replace(/\./g,'\\.'),'i');
  var connectedLatched=false;
  var lastAddress='';

  function byId(id){return document.getElementById(id);}
  function findAddress(){
    var ids=['mailForwardAddress','mailSetupAddress'];
    for(var i=0;i<ids.length;i++){
      var el=byId(ids[i]);
      var m=el&&String(el.textContent||'').match(ADDRESS_RE);
      if(m)return m[0];
    }
    var original=byId('mailConnectCard');
    var m2=original&&String(original.textContent||'').match(ADDRESS_RE);
    return m2?m2[0]:lastAddress;
  }
  function isConnected(){
    if(connectedLatched)return true;
    var status=byId('mailConnectStatus');
    var text=status?String(status.textContent||''):'';
    var address=findAddress();
    if(/連携済み/.test(text)&&address){connectedLatched=true;lastAddress=address;return true;}
    return false;
  }
  function injectStyle(){
    if(byId(STYLE_ID))return;
    var s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='#'+CARD_ID+'{background:#fff;border:1px solid #cfe8dc;border-radius:15px;padding:11px 12px;margin:0 0 10px;box-shadow:0 2px 10px rgba(25,36,58,.03)}#'+CARD_ID+' .tom-mail-row{display:flex;align-items:center;justify-content:space-between;gap:10px}#'+CARD_ID+' .tom-mail-title{font-size:13px;font-weight:1000;color:#1f2c40}#'+CARD_ID+' .tom-mail-sub{font-size:10px;color:#6f7988;margin-top:3px}#'+CARD_ID+' .tom-mail-right{display:flex;align-items:center;gap:7px;flex:0 0 auto}#'+CARD_ID+' .tom-mail-ok{display:inline-flex;align-items:center;border:1px solid #a8dcc2;background:#edf9f3;color:#16845a;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:1000}#'+CARD_ID+' .tom-mail-settings{border:1px solid #cfd8e5;background:#fff;border-radius:10px;padding:8px 10px;font-size:10px;font-weight:1000;color:#34445a}';
    document.head.appendChild(s);
  }
  function ensureCard(){
    injectStyle();
    if(!isConnected()){
      var old=byId(CARD_ID);if(old&&old.parentNode)old.parentNode.removeChild(old);
      return;
    }
    var original=byId('mailConnectCard');
    if(original)original.style.display='none';
    var card=byId(CARD_ID);
    if(!card){
      card=document.createElement('section');card.id=CARD_ID;
      card.innerHTML='<div class="tom-mail-row"><div><div class="tom-mail-title">📩 メール連携</div><div class="tom-mail-sub">対応メールを自動判定します</div></div><div class="tom-mail-right"><span class="tom-mail-ok">✓ 連携済み</span><button type="button" class="tom-mail-settings">設定</button></div></div>';
      var region=byId('tom-region-card-v240');
      if(region&&region.parentNode)region.parentNode.insertBefore(card,region);
      else if(original&&original.parentNode)original.parentNode.insertBefore(card,original);
      else{
        var member=byId('memberView');if(member)member.insertBefore(card,member.firstChild);
      }
      var btn=card.querySelector('.tom-mail-settings');
      if(btn)btn.addEventListener('click',function(){var open=byId('openMailSetupBtn');if(open)open.click();});
    }
  }
  function start(){
    ensureCard();
    var original=byId('mailConnectCard');
    if(original)new MutationObserver(function(){ensureCard();}).observe(original,{childList:true,subtree:true,characterData:true});
    setTimeout(ensureCard,400);setTimeout(ensureCard,1200);setInterval(ensureCard,5000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();