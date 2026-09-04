(function(){
  'use strict';
  function byId(id){return document.getElementById(id);}
  function syncPreview(){
    var type=byId('pOpportunityType')?byId('pOpportunityType').value:'lottery';
    var fields=document.querySelectorAll('.tom-preview-result-field');
    for(var i=0;i<fields.length;i++)fields[i].style.display=type==='lottery'?'':'none';
  }
  function syncEdit(){
    var type=byId('eOpportunityType')?byId('eOpportunityType').value:'lottery';
    var fields=document.querySelectorAll('.tom-edit-result-field');
    for(var i=0;i<fields.length;i++)fields[i].style.display=type==='lottery'?'':'none';
  }
  function sync(){syncPreview();syncEdit();}
  function start(){
    document.title='TOM エントリーマネージャー V2.51';
    document.addEventListener('change',function(e){
      if(e.target&&e.target.id==='pOpportunityType')syncPreview();
      if(e.target&&e.target.id==='eOpportunityType')syncEdit();
    });
    sync();
    setTimeout(sync,0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
