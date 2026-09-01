(()=>{
  'use strict';
  const CONFIG_KEY='tom_lottery_supabase_config_v2';
  const STYLE_ID='tom-member-admin-v227-style';
  let profiles=[];
  let loading=false;

  function readConfig(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'null')}catch{return null}}
  function findToken(v,d=0){
    if(!v||d>5)return null;
    if(typeof v==='object'){
      if(typeof v.access_token==='string'&&v.access_token)return v.access_token;
      for(const x of Object.values(v)){const t=findToken(x,d+1);if(t)return t;}
    }
    return null;
  }
  function accessToken(){
    for(const s of [localStorage,sessionStorage]){
      for(let i=0;i<s.length;i++){
        const k=s.key(i)||''; if(!/auth-token|supabase/i.test(k))continue;
        try{const t=findToken(JSON.parse(s.getItem(k)||'null'));if(t)return t}catch{}
      }
    }
    return null;
  }
  async function rest(path,opt={}){
    const c=readConfig(),token=accessToken();
    if(!c?.url||!c?.key||!token)throw new Error('ログイン情報を取得できません');
    const res=await fetch(`${c.url}/rest/v1/${path}`,{
      ...opt,
      headers:{apikey:c.key,Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json',...(opt.headers||{})}
    });
    if(!res.ok)throw new Error((await res.text().catch(()=>''))||`HTTP ${res.status}`);
    if(res.status===204)return null;
    const text=await res.text();return text?JSON.parse(text):null;
  }
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function toast(msg){
    let el=document.getElementById('tom-member-admin-toast');
    if(!el){el=document.createElement('div');el.id='tom-member-admin-toast';document.body.appendChild(el);}
    el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2200);
  }
  function injectStyle(){
    if(document.getElementById(STYLE_ID))return;
    const st=document.createElement('style');st.id=STYLE_ID;st.textContent=`
#tom-member-admin-extra{margin:0 0 12px;padding:12px;background:#f8fbff;border:1px solid #cfe0f3;border-radius:13px}
#tom-member-admin-extra .tom-ma-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px}
#tom-member-admin-extra .tom-ma-head b{font-size:13px}.tom-ma-count{font-size:10px;font-weight:900;color:#35658f;background:#e8f3ff;border-radius:999px;padding:3px 8px}
.tom-ma-list{display:flex;flex-direction:column;gap:8px}.tom-ma-row{background:#fff;border:1px solid #dce4ed;border-radius:11px;padding:9px}
.tom-ma-email{font-size:12px;font-weight:1000;word-break:break-all}.tom-ma-meta{font-size:9.5px;color:#7a8490;margin-top:3px;line-height:1.45}
.tom-ma-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}.tom-ma-actions input{min-width:135px;flex:1;border:1px solid #cfd8e4;border-radius:8px;padding:7px;font:inherit;background:#fff}
.tom-ma-btn{border:1px solid #b8c7d9;background:#fff;border-radius:8px;padding:7px 9px;font-size:10px;font-weight:1000;cursor:pointer}.tom-ma-btn.primary{background:#1f75e8;color:#fff;border-color:#1f75e8}.tom-ma-btn:disabled{opacity:.5}
.tom-ma-admin{font-size:9px;font-weight:1000;color:#835d00;background:#fff4c7;border:1px solid #ead17b;border-radius:999px;padding:4px 7px}
#tom-member-admin-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(12px);opacity:0;z-index:2147483646;background:#202733;color:#fff;border-radius:999px;padding:9px 14px;font-size:11px;font-weight:900;transition:.18s;pointer-events:none}#tom-member-admin-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
`;
    document.head.appendChild(st);
  }
  async function load(){
    if(loading)return;loading=true;
    try{
      const data=await rest('profiles?select=id,email,display_name,role,membership_status,expires_at,mail_connection_status,mail_last_received_at,created_at&order=created_at.desc');
      profiles=Array.isArray(data)?data:[];
      const selfOnly=profiles.length===1&&profiles[0]?.role!=='admin';
      if(selfOnly)return;
      render();
    }catch(e){console.warn('member-admin',e)}finally{loading=false}
  }
  function render(){
    injectStyle();
    const host=document.getElementById('adminMembers');if(!host)return;
    let box=document.getElementById('tom-member-admin-extra');
    if(!box){box=document.createElement('section');box.id='tom-member-admin-extra';host.prepend(box);}
    box.innerHTML=`<div class="tom-ma-head"><b>運営権限・会員期限</b><span class="tom-ma-count">${profiles.length}人</span></div><div class="tom-ma-list"></div>`;
    const list=box.querySelector('.tom-ma-list');
    for(const p of profiles){
      const row=document.createElement('div');row.className='tom-ma-row';
      const mailStatus=p.mail_connection_status==='connected'?'メール連携済':p.mail_connection_status==='verification_received'?'メール確認待ち':'メール未連携';
      row.innerHTML=`<div class="tom-ma-email">${esc(p.email||p.display_name||p.id)}</div><div class="tom-ma-meta">${p.role==='admin'?'運営':'会員'} / ${esc(p.membership_status||'pending')} / ${mailStatus}${p.expires_at?` / 期限 ${esc(p.expires_at)}`:''}</div><div class="tom-ma-actions"><input type="date" value="${esc(p.expires_at||'')}" data-expiry="${esc(p.id)}"><button class="tom-ma-btn" data-save-expiry="${esc(p.id)}">期限保存</button>${p.role==='admin'?'<span class="tom-ma-admin">ADMIN</span>':`<button class="tom-ma-btn primary" data-promote="${esc(p.id)}" data-email="${esc(p.email||'')}">運営に変更</button>`}</div>`;
      list.appendChild(row);
    }
    box.querySelectorAll('[data-save-expiry]').forEach(btn=>btn.addEventListener('click',async()=>{
      const id=btn.dataset.saveExpiry;const input=box.querySelector(`[data-expiry="${CSS.escape(id)}"]`);btn.disabled=true;
      try{await rest(`profiles?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({expires_at:input.value||null})});toast('会員期限を保存しました');await load();}catch(e){console.error(e);toast('期限を保存できませんでした')}finally{btn.disabled=false}
    }));
    box.querySelectorAll('[data-promote]').forEach(btn=>btn.addEventListener('click',async()=>{
      const id=btn.dataset.promote,email=btn.dataset.email||'この会員';
      if(!confirm(`${email} を運営アカウントに変更しますか？\n運営画面と会員管理を使用できるようになります。`))return;
      btn.disabled=true;
      try{await rest(`profiles?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({role:'admin',membership_status:'active'})});toast('運営アカウントに変更しました');await load();}catch(e){console.error(e);toast('運営への変更に失敗しました')}finally{btn.disabled=false}
    }));
  }
  const schedule=()=>setTimeout(()=>{if(document.getElementById('adminMembers'))load()},120);
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',schedule,{once:true});setTimeout(schedule,700);setTimeout(schedule,1800);
})();