(function(){
  'use strict';
  var STYLE_ID='tom-category-tabs-v253-style';
  function inject(){
    if(document.getElementById(STYLE_ID))return;
    var s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent='\
#tom-opportunity-nav-v242{display:flex!important;flex-wrap:wrap!important;overflow-x:visible!important;overflow-y:visible!important;gap:8px!important;padding:2px 1px 10px!important;-webkit-overflow-scrolling:auto!important}\
#tom-opportunity-nav-v242 button{display:inline-flex!important;align-items:center!important;justify-content:center!important;white-space:nowrap!important;max-width:100%!important}\
#tom-opportunity-nav-v242 .tom-new-count-v252{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:20px!important;min-width:20px!important;height:20px!important;padding:0!important;margin-left:5px!important;border-radius:50%!important;background:#e53950!important;color:#fff!important;border:0!important;font-size:9px!important;font-weight:1000!important;line-height:20px!important;box-sizing:border-box!important;box-shadow:0 1px 3px rgba(181,28,52,.22)!important}\
#tom-opportunity-nav-v242 .tom-new-count-v252[hidden]{display:none!important}\
@media(max-width:520px){#tom-opportunity-nav-v242{gap:7px!important}#tom-opportunity-nav-v242 button{padding:8px 10px!important;font-size:10.5px!important}#tom-opportunity-nav-v242 .tom-new-count-v252{width:19px!important;min-width:19px!important;height:19px!important;line-height:19px!important;font-size:8.5px!important}}';
    document.head.appendChild(s);
  }
  function start(){inject();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
