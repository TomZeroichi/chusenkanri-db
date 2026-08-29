(()=>{
  'use strict';

  const CONNECTED_TEXT='連携済み';
  const OLD_SETUP_TEXT='初回設定をする';
  const NEW_SETUP_TEXT='メール連携を再設定';

  function normalize(text){return String(text||'').replace(/\s+/g,' ').trim();}

  function isMailConnected(){
    return [...document.querySelectorAll('body *')].some(el=>{
      if(el.children.length)return false;
      return normalize(el.textContent)===CONNECTED_TEXT;
    });
  }

  function renameSetupButton(){
    if(!isMailConnected())return;
    for(const btn of document.querySelectorAll('button')){
      if(normalize(btn.textContent)===OLD_SETUP_TEXT){
        btn.textContent=NEW_SETUP_TEXT;
        btn.setAttribute('aria-label',NEW_SETUP_TEXT);
        btn.title='Gmailの転送設定や連携先を再確認・再設定します';
      }
    }
  }

  function looksLikeForwardingHistory(text){
    const t=normalize(text);
    return /転送確認/.test(t) && /Gmail\s*の転送の確認|Gmail転送確認|forwarding/i.test(t);
  }

  function findHistoryCard(leaf){
    let node=leaf;
    let best=null;
    for(let depth=0;node && node!==document.body && depth<7;depth++,node=node.parentElement){
      const text=normalize(node.innerText||node.textContent);
      if(!looksLikeForwardingHistory(text))continue;
      // 1件分の履歴カードは短く、時刻か日付を含む想定。
      if(text.length<=420 && (/\b\d{1,2}:\d{2}\b/.test(text)||/\b\d{1,2}\/\d{1,2}\b/.test(text))){
        best=node;
      }
      if(text.length>700)break;
    }
    return best;
  }

  function hideForwardingVerificationHistory(){
    const leaves=[...document.querySelectorAll('body *')].filter(el=>{
      if(el.children.length)return false;
      return looksLikeForwardingHistory(el.textContent);
    });
    for(const leaf of leaves){
      const card=findHistoryCard(leaf);
      if(card){
        card.style.display='none';
        card.dataset.tomHiddenForwardingHistory='1';
      }
    }
  }

  function apply(){
    renameSetupButton();
    hideForwardingVerificationHistory();
  }

  let scheduled=false;
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;apply();});
  };

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  setTimeout(apply,350);
  setTimeout(apply,1200);
})();