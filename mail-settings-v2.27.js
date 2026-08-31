(()=>{
  'use strict';

  const DOMAIN='lottery.tomtradesystem.com';
  const STRIP_ID='tom-mail-compact-v227';
  const MODAL_ID='tom-settings-modal-v227';
  const STYLE_ID='tom-mail-settings-style-v227';

  const normalize=v=>String(v||'').replace(/\s+/g,' ').trim();

  function getMailAddress(){
    const text=document.body?.textContent||'';
    const m=text.match(new RegExp('[A-Za-z0-9._%+-]+@'+DOMAIN.replace(/\./g,'\\.'),'i'));
    return m?m[0]:'';
  }

  function isConnected(){
    const text=normalize(document.body?.textContent||'');
    return !!getMailAddress() && /連携済み/.test(text);
  }

  function getLastReceived(){
    const text=normalize(document.body?.textContent||'');
    const m=text.match(/最終受信\s*[:：]?\s*([^|｜]{3,32}?)(?=\s{2,}|$|設定|コピー|メール)/);
    return m?normalize(m[1]):'';
  }

  function ensureStyles(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #${STRIP_ID}{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;margin:10px 0;border:1px solid #dbe4ee;border-radius:12px;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.04);font-size:13px}
      #${STRIP_ID} .tom-mail-status{display:flex;align-items:center;gap:8px;min-width:0;color:#334155;font-weight:700}
      #${STRIP_ID} .tom-mail-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;flex:0 0 auto}
      #${STRIP_ID} .tom-mail-last{font-weight:500;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #${STRIP_ID} button{border:1px solid #cbd5e1;background:#f8fafc;color:#334155;border-radius:9px;padding:7px 11px;font-weight:700;cursor:pointer;white-space:nowrap}
      #${MODAL_ID}{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.42);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}
      #${MODAL_ID} .tom-settings-sheet{width:min(460px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.28);padding:18px;box-sizing:border-box}
      #${MODAL_ID} .tom-settings-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
      #${MODAL_ID} .tom-settings-title{font-size:19px;font-weight:800;color:#0f172a}
      #${MODAL_ID} .tom-close{border:0;background:#f1f5f9;border-radius:9px;width:34px;height:34px;font-size:20px;cursor:pointer;color:#475569}
      #${MODAL_ID} .tom-section-title{font-size:14px;font-weight:800;color:#334155;margin:4px 0 10px}
      #${MODAL_ID} .tom-connected{display:inline-flex;align-items:center;gap:7px;background:#ecfdf5;color:#047857;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:800;margin-bottom:12px}
      #${MODAL_ID} .tom-connected:before{content:'';width:7px;height:7px;border-radius:50%;background:#22c55e}
      #${MODAL_ID} .tom-label{font-size:12px;color:#64748b;margin:10px 0 6px;font-weight:700}
      #${MODAL_ID} .tom-address-row{display:flex;gap:8px;align-items:stretch}
      #${MODAL_ID} .tom-address{flex:1;min-width:0;border:1px solid #dbe4ee;background:#f8fafc;border-radius:10px;padding:10px 11px;font:600 12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${MODAL_ID} .tom-copy{border:0;background:#2563eb;color:#fff;border-radius:10px;padding:0 14px;font-weight:800;cursor:pointer}
      #${MODAL_ID} .tom-meta{font-size:12px;color:#64748b;margin-top:8px}
      #${MODAL_ID} .tom-actions{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}
      #${MODAL_ID} .tom-actions button{flex:1;min-width:140px;border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:10px;padding:10px 12px;font-weight:800;cursor:pointer}
      #${MODAL_ID} .tom-toast{height:18px;margin-top:8px;font-size:12px;color:#047857;font-weight:700}
      @media(max-width:560px){#${STRIP_ID}{margin:8px 0;padding:9px 10px}#${STRIP_ID} .tom-mail-last{display:none}#${MODAL_ID}{align-items:flex-end;padding:0}#${MODAL_ID} .tom-settings-sheet{width:100%;max-height:84vh;border-radius:18px 18px 0 0;padding:18px 16px 22px}}
    `;
    document.head.appendChild(s);
  }

  function findMailCard(address){
    if(!address)return null;
    const leaves=[...document.querySelectorAll('body *')].filter(el=>{
      if(el.children.length)return false;
      return String(el.textContent||'').includes(address);
    });
    for(const leaf of leaves){
      let node=leaf;
      for(let depth=0;node&&node!==document.body&&depth<9;depth++,node=node.parentElement){
        const text=normalize(node.textContent);
        if(!text.includes(address))continue;
        if(!/(メール連携|専用メール|専用アドレス|連携済み)/.test(text))continue;
        if(text.length>2500)continue;
        const r=node.getBoundingClientRect();
        if(r.width>220 && (r.height>105 || text.length>90))return node;
      }
    }
    return null;
  }

  function restoreMailCard(){
    const card=document.querySelector('[data-tom-mail-card-hidden="1"]');
    if(card){
      card.style.removeProperty('display');
      delete card.dataset.tomMailCardHidden;
    }
    document.getElementById(STRIP_ID)?.remove();
  }

  function copyFallback(text){
    const ta=document.createElement('textarea');
    ta.value=text;
    ta.style.position='fixed';
    ta.style.opacity='0';
    document.body.appendChild(ta);
    ta.select();
    try{document.execCommand('copy');}catch(_){/* noop */}
    ta.remove();
  }

  async function copyText(text){
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
      else copyFallback(text);
      return true;
    }catch(_){
      copyFallback(text);
      return true;
    }
  }

  function openOriginalSetup(){
    const card=document.querySelector('[data-tom-mail-card-hidden="1"]');
    if(!card)return;
    const trigger=[...card.querySelectorAll('button,a')].find(el=>/再設定|初回設定|設定をする|転送設定/.test(normalize(el.textContent)));
    closeModal();
    if(trigger){
      try{trigger.click();return;}catch(_){/* fall through */}
    }
    card.style.removeProperty('display');
    delete card.dataset.tomMailCardHidden;
    document.getElementById(STRIP_ID)?.remove();
    card.scrollIntoView({behavior:'smooth',block:'center'});
  }

  function closeModal(){
    document.getElementById(MODAL_ID)?.remove();
  }

  function openSettings(address,last){
    closeModal();
    const overlay=document.createElement('div');
    overlay.id=MODAL_ID;
    overlay.innerHTML=`
      <div class="tom-settings-sheet" role="dialog" aria-modal="true" aria-label="設定">
        <div class="tom-settings-head"><div class="tom-settings-title">設定</div><button class="tom-close" type="button" aria-label="閉じる">×</button></div>
        <div class="tom-section-title">メール連携</div>
        <div class="tom-connected">連携済み</div>
        <div class="tom-label">専用メールアドレス</div>
        <div class="tom-address-row"><div class="tom-address" title="${address}">${address}</div><button class="tom-copy" type="button">コピー</button></div>
        <div class="tom-meta">${last?`最終受信：${last}`:'メール転送を受信すると自動で抽選状況へ反映されます。'}</div>
        <div class="tom-toast" aria-live="polite"></div>
        <div class="tom-actions"><button class="tom-reopen" type="button">メール連携を再設定</button></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal();});
    overlay.querySelector('.tom-close')?.addEventListener('click',closeModal);
    overlay.querySelector('.tom-copy')?.addEventListener('click',async()=>{
      await copyText(address);
      const toast=overlay.querySelector('.tom-toast');
      if(toast)toast.textContent='✓ コピーしました';
      setTimeout(()=>{if(toast)toast.textContent='';},1800);
    });
    overlay.querySelector('.tom-reopen')?.addEventListener('click',openOriginalSetup);
  }

  function makeCompact(card,address){
    let strip=document.getElementById(STRIP_ID);
    const last=getLastReceived();
    if(!strip){
      strip=document.createElement('div');
      strip.id=STRIP_ID;
      strip.innerHTML=`<div class="tom-mail-status"><span class="tom-mail-dot"></span><span>メール連携済み</span><span class="tom-mail-last"></span></div><button type="button">設定</button>`;
      card.parentNode?.insertBefore(strip,card);
      strip.querySelector('button')?.addEventListener('click',()=>openSettings(getMailAddress()||address,getLastReceived()||last));
    }
    const lastEl=strip.querySelector('.tom-mail-last');
    if(lastEl)lastEl.textContent=last?`最終受信 ${last}`:'';
    card.style.display='none';
    card.dataset.tomMailCardHidden='1';
  }

  function apply(){
    ensureStyles();
    if(!isConnected()){
      restoreMailCard();
      closeModal();
      return;
    }
    const address=getMailAddress();
    const already=document.querySelector('[data-tom-mail-card-hidden="1"]');
    if(already){
      makeCompact(already,address);
      return;
    }
    const card=findMailCard(address);
    if(card)makeCompact(card,address);
  }

  let scheduled=false;
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;apply();});
  };

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  setTimeout(apply,250);
  setTimeout(apply,800);
  setTimeout(apply,1800);
})();
