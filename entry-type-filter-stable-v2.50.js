(function(){
  'use strict';

  var FILTER_KEY='tom_opportunity_type_filter_v242';

  function currentFilter(){
    try{return localStorage.getItem(FILTER_KEY)||'all';}catch(e){return 'all';}
  }

  function closest(el,selector){
    while(el&&el.nodeType===1){
      if(el.matches&&el.matches(selector))return el;
      el=el.parentElement;
    }
    return null;
  }

  document.addEventListener('click',function(e){
    var btn=closest(e.target,'#lotteryList [data-open],#archiveList [data-open]');
    if(!btn)return;
    if(currentFilter()==='all')return;

    var row=closest(btn,'.lottery-row');
    if(!row)return;

    // 種別絞り込み中は本体 renderMember() による全件再描画を止め、
    // 現在表示中のカードだけをその場で開閉する。
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();

    var wasOpen=row.classList.contains('open');
    var list=row.parentElement;
    if(list){
      var opened=list.querySelectorAll('.lottery-row.open');
      for(var i=0;i<opened.length;i++){
        if(opened[i]!==row){
          opened[i].classList.remove('open');
          var oldBtn=opened[i].querySelector('[data-open]');
          if(oldBtn)oldBtn.setAttribute('aria-expanded','false');
        }
      }
    }
    row.classList.toggle('open',!wasOpen);
    btn.setAttribute('aria-expanded',wasOpen?'false':'true');
  },true);
})();
