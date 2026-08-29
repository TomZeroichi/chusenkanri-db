(()=>{
  'use strict';

  const CONFIG_KEY='tom_lottery_supabase_config_v2';
  const NOTICE_ID='tom-loss-notice-v225';
  const MODAL_ID='tom-loss-modal-v225';
  let losses=[];
  let busy=false;

  function readConfig(){
    try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');}catch{return null;}
  }

  function findAccessToken(value,depth=0){
    if(!value||depth>4)return null;
    if(typeof value==='object'){
      if(typeof value.access_token==='string'&&value.access_token)return value.access_token;
      for(const v of Object.values(value)){
        const token=findAccessToken(v,depth+1);
        if(token)return token;
      }
    }
    return null;
  }

  function getAccessToken(){
    for(const storage of [localStorage,sessionStorage]){
      for(let i=0;i<storage.length;i++){
        const key=storage.key(i)||'';
        if(!/auth-token|supabase/i.test(key))continue;
        try{
          const token=findAccessToken(JSON.parse(storage.getItem(key)||'null'));
          if(token)return token;
        }catch{}
      }
    }
    return null;
  }

  async function rest(path,options={}){
    const config=readConfig();
    const token=getAccessToken();
    if(!config?.url||!config?.key||!token)return null;
    const headers={
      apikey:config.key,
      Authorization:`Bearer ${token}`,
      'Content-Type':'application/json',
      Accept:'application/json',
      ...(options.headers||{})
    };
    const res=await fetch(`${config.url}/rest/v1/${path}`,{...options,headers});
    if(!res.ok){
      const text=await res.text().catch(()=>String(res.status));
      throw new Error(text||`HTTP ${res.status}`);
    }
    if(res.status===204)return null;
    const text=await res.text();
    return text?JSON.parse(text):null;
  }

  function injectStyle(){
    if(document.getElementById('tom-loss-style-v225'))return;
    const style=document.createElement('style');
    style.id='tom-loss-style-v225';
    style.textContent=`
#${NOTICE_ID}{margin:0 0 11px;border:2px solid #ef6a79;background:#fff0f2;border-radius:15px;overflow:hidden;box-shadow:0 3px 12px rgba(112,22,35,.08)}
#${NOTICE_ID} button{width:100%;border:0;background:transparent;padding:11px 13px;display:flex;align-items:center;gap:10px;text-align:left;color:#442027;cursor:pointer}
#${NOTICE_ID} .tom-loss-icon{width:35px;height:35px;border-radius:50%;background:#e54858;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:1000;flex:0 0 35px}
#${NOTICE_ID} .tom-loss-copy{min-width:0;flex:1}.tom-loss-title{font-size:14px;font-weight:1000;line-height:1.2}.tom-loss-sub{font-size:11px;color:#865761;font-weight:800;margin-top:3px}.tom-loss-count{background:#e54858;color:#fff;border-radius:999px;min-width:28px;height:28px;padding:0 8px;display:flex;align-items:center;justify-content:center;font-weight:1000}
#${MODAL_ID}{position:fixed;inset:0;z-index:2147483000;background:rgba(20,24,32,.48);display:flex;align-items:flex-end;justify-content:center;padding:14px}
#${MODAL_ID}[hidden]{display:none!important}.tom-loss-sheet{width:min(620px,100%);max-height:min(78vh,720px);overflow:auto;background:#f7f8fb;border-radius:20px 20px 14px 14px;padding:14px;box-shadow:0 18px 60px rgba(0,0,0,.28)}
.tom-loss-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px}.tom-loss-head h3{font-size:18px;margin:0}.tom-loss-close{border:1px solid #d6dce6;background:#fff;border-radius:10px;padding:8px 11px;font-weight:900;cursor:pointer}.tom-loss-help{font-size:12px;color:#687386;margin:-4px 0 11px;line-height:1.5}
.tom-loss-list{display:flex;flex-direction:column;gap:9px}.tom-loss-item{background:#fff;border:1px solid #e1e5ec;border-left:6px solid #e54858;border-radius:13px;padding:11px}.tom-loss-store{font-size:11px;color:#6b7586;font-weight:900}.tom-loss-product{font-size:14px;line-height:1.35;font-weight:1000;margin:3px 0 8px}.tom-loss-time{font-size:10px;color:#8a93a2;margin-bottom:9px}.tom-loss-ack{width:100%;border:0;border-radius:10px;background:#e54858;color:#fff;padding:10px 12px;font-weight:1000;cursor:pointer}.tom-loss-ack:disabled{opacity:.55;cursor:wait}
@media(min-width:700px){#${MODAL_ID}{align-items:center}.tom-loss-sheet{border-radius:20px}}
`;
    document.head.appendChild(style);
  }

  function ensureUi(){
    injectStyle();
    const app=document.querySelector('.app')||document.querySelector('main')||document.body;
    if(!document.getElementById(NOTICE_ID)){
      const notice=document.createElement('section');
      notice.id=NOTICE_ID;
      notice.hidden=true;
      notice.innerHTML='<button type="button"><span class="tom-loss-icon">!</span><span class="tom-loss-copy"><span class="tom-loss-title">落選のお知らせ</span><span class="tom-loss-sub">確認後、自動でアーカイブへ移動します</span></span><span class="tom-loss-count">0</span></button>';
      notice.querySelector('button').addEventListener('click',openModal);
      const anchor=app.querySelector('.summary');
      if(anchor?.parentNode)anchor.parentNode.insertBefore(notice,anchor.nextSibling);
      else app.prepend(notice);
    }
    if(!document.getElementById(MODAL_ID)){
      const modal=document.createElement('div');
      modal.id=MODAL_ID;
      modal.hidden=true;
      modal.innerHTML='<div class="tom-loss-sheet" role="dialog" aria-modal="true" aria-label="落選結果の確認"><div class="tom-loss-head"><h3>落選結果</h3><button class="tom-loss-close" type="button">あとで</button></div><div class="tom-loss-help">内容を確認して「確認してアーカイブ」を押すと、管理中一覧から外れてアーカイブに保存されます。</div><div class="tom-loss-list"></div></div>';
      modal.querySelector('.tom-loss-close').addEventListener('click',closeModal);
      modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
      document.body.appendChild(modal);
    }
  }

  function formatJst(value){
    if(!value)return '';
    try{return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}catch{return '';}
  }

  function render(){
    ensureUi();
    const notice=document.getElementById(NOTICE_ID);
    const count=notice?.querySelector('.tom-loss-count');
    if(notice){notice.hidden=losses.length===0;if(count)count.textContent=String(losses.length);}
    const list=document.querySelector(`#${MODAL_ID} .tom-loss-list`);
    if(!list)return;
    list.innerHTML='';
    for(const row of losses){
      const item=document.createElement('article');
      item.className='tom-loss-item';
      item.innerHTML=`<div class="tom-loss-store"></div><div class="tom-loss-product"></div><div class="tom-loss-time"></div><button class="tom-loss-ack" type="button">確認してアーカイブ</button>`;
      item.querySelector('.tom-loss-store').textContent=row.store||'抽選';
      item.querySelector('.tom-loss-product').textContent=row.title||'商品名未取得';
      item.querySelector('.tom-loss-time').textContent=row.pending_result_at?`落選受信：${formatJst(row.pending_result_at)}`:'';
      item.querySelector('.tom-loss-ack').addEventListener('click',()=>acknowledge(row.lottery_id,item));
      list.appendChild(item);
    }
  }

  async function loadLosses(){
    if(busy)return;
    busy=true;
    try{
      ensureUi();
      const progress=await rest('user_lottery_progress?select=lottery_id,pending_result,pending_result_at,is_archived,result_seen_at&pending_result=eq.lose&is_archived=eq.false&order=pending_result_at.desc');
      if(progress===null){losses=[];render();return;}
      const rows=Array.isArray(progress)?progress:[];
      if(!rows.length){losses=[];render();return;}
      const ids=rows.map(r=>r.lottery_id).filter(Boolean);
      let info=[];
      if(ids.length){
        const filter=encodeURIComponent(`in.(${ids.join(',')})`);
        info=await rest(`lotteries?select=id,title,store&id=${filter}`)||[];
      }
      const byId=new Map((Array.isArray(info)?info:[]).map(x=>[x.id,x]));
      losses=rows.map(r=>({...r,title:byId.get(r.lottery_id)?.title||'',store:byId.get(r.lottery_id)?.store||''}));
      render();
    }catch(err){console.warn('[TOM V2.25] loss review load failed',err);}
    finally{busy=false;}
  }

  function openModal(){
    ensureUi();
    render();
    const modal=document.getElementById(MODAL_ID);
    if(modal)modal.hidden=false;
  }
  function closeModal(){const modal=document.getElementById(MODAL_ID);if(modal)modal.hidden=true;}

  async function acknowledge(lotteryId,item){
    const btn=item?.querySelector('.tom-loss-ack');
    if(btn){btn.disabled=true;btn.textContent='移動中...';}
    try{
      await rest('rpc/acknowledge_lottery_loss',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({p_lottery_id:lotteryId})});
      losses=losses.filter(x=>x.lottery_id!==lotteryId);
      render();
      if(!losses.length)closeModal();
      setTimeout(()=>location.reload(),350);
    }catch(err){
      console.error('[TOM V2.25] acknowledge failed',err);
      if(btn){btn.disabled=false;btn.textContent='確認してアーカイブ';}
      alert('アーカイブへの移動に失敗しました。通信状態を確認してもう一度お試しください。');
    }
  }

  const observer=new MutationObserver(()=>ensureUi());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(loadLosses,800);
  setInterval(loadLosses,30000);
})();
