(()=>{
  'use strict';

  function clean(){
    document.querySelectorAll('.tom-mail-auto-badge').forEach(el=>el.remove());
    document.querySelectorAll('.tom-pc-done').forEach(el=>{
      const action=el.closest('.tom-pc-action');
      if(action) action.remove();
      else el.remove();
    });
  }

  let scheduled=false;
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      clean();
    });
  };

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',clean,{once:true});
  clean();
  setTimeout(clean,250);
  setTimeout(clean,800);
  setTimeout(clean,1800);
})();
