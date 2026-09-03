(function(){
  'use strict';

  var mailLatched=false;
  var lastConnectedText='';

  function matchesTextTarget(el){
    if(!el||el.nodeType!==1)return false;
    if(el.id==='countTotal'||el.id==='countUnapplied'||el.id==='countSoon'||el.id==='countToday'||el.id==='countWon'||el.id==='archiveCount')return true;
    if(!el.matches)return false;
    return el.matches('.archive-note,.tom-region-card-summary,.tom-region-chip-v240,.tom-admin-region-value,.tom-type-badge-v242');
  }
  function matchesHtmlTarget(el){
    return !!(el&&el.nodeType===1&&el.matches&&el.matches('.tom-admin-region-v240'));
  }

  function installStableSetters(){
    try{
      var td=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');
      if(td&&td.get&&td.set&&!Node.prototype.__tomStableTextV245){
        Object.defineProperty(Node.prototype,'textContent',{
          configurable:td.configurable,
          enumerable:td.enumerable,
          get:td.get,
          set:function(v){
            if(matchesTextTarget(this)){
              var next=v==null?'':String(v);
              if(td.get.call(this)===next)return;
            }
            return td.set.call(this,v);
          }
        });
        try{Object.defineProperty(Node.prototype,'__tomStableTextV245',{value:true,configurable:true});}catch(_e){}
      }
    }catch(e){console.warn('[TOM V2.45] text stability guard skipped',e);}

    try{
      var hd=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
      if(hd&&hd.get&&hd.set&&!Element.prototype.__tomStableHtmlV245){
        Object.defineProperty(Element.prototype,'innerHTML',{
          configurable:hd.configurable,
          enumerable:hd.enumerable,
          get:hd.get,
          set:function(v){
            if(matchesHtmlTarget(this)){
              var next=v==null?'':String(v);
              if(hd.get.call(this)===next)return;
            }
            return hd.set.call(this,v);
          }
        });
        try{Object.defineProperty(Element.prototype,'__tomStableHtmlV245',{value:true,configurable:true});}catch(_e2){}
      }
    }catch(e2){console.warn('[TOM V2.45] html stability guard skipped',e2);}
  }

  function stabilizeMailStatus(){
    var status=document.getElementById('mailConnectStatus');
    var original=document.getElementById('mailConnectCard');
    if(!status)return;
    var text=String(status.textContent||'').trim();
    if(/連携済み/.test(text)){
      mailLatched=true;
      lastConnectedText=text;
    }
    if(mailLatched){
      if(!/連携済み/.test(String(status.textContent||''))){
        status.textContent=lastConnectedText||'メール連携済み';
      }
      if(original)original.style.display='none';
    }
  }

  function start(){
    installStableSetters();
    stabilizeMailStatus();
    var status=document.getElementById('mailConnectStatus');
    if(status)new MutationObserver(function(){stabilizeMailStatus();}).observe(status,{childList:true,subtree:true,characterData:true});
    setTimeout(stabilizeMailStatus,300);
    setTimeout(stabilizeMailStatus,1000);
    setInterval(stabilizeMailStatus,5000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();