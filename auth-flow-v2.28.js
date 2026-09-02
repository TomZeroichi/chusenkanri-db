(()=>{
  'use strict';
  const CONFIG_KEY='tom_lottery_supabase_config_v2';
  const REDIRECT='https://tomzeroichi.github.io/chusenkanri-db/';
  let clientPromise=null;
  function cfg(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'null')}catch{return null}}
  async function client(){
    if(clientPromise)return clientPromise;
    clientPromise=(async()=>{
      const c=cfg(); if(!c?.url||!c?.key)throw new Error('Supabase config missing');
      const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm');
      return createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    })();
    return clientPromise;
  }
  function message(text){
    const n=document.getElementById('connectionNotice');
    if(n)n.textContent=text; else alert(text);
  }
  function ensureResend(){
    const signup=document.getElementById('signupBtn');
    if(!signup||document.getElementById('resendSignupBtn'))return;
    const b=document.createElement('button');
    b.type='button'; b.id='resendSignupBtn'; b.className='soft-btn'; b.textContent='確認メールを再送';
    signup.insertAdjacentElement('afterend',b);
  }
  document.addEventListener('click',async e=>{
    const target=e.target.closest?.('#signupBtn,#resendSignupBtn');
    if(!target)return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const email=document.getElementById('loginEmail')?.value.trim()||'';
    const password=document.getElementById('loginPassword')?.value||'';
    try{
      const s=await client();
      if(target.id==='resendSignupBtn'){
        if(!email){message('メールアドレスを入力してください');return}
        const {error}=await s.auth.resend({type:'signup',email,options:{emailRedirectTo:REDIRECT}});
        if(error)throw error;
        message('確認メールを再送しました。新しく届いたメールのリンクを開いてください。');
      }else{
        if(!email||password.length<6){message('メールと6文字以上のパスワードを入力してください');return}
        const {data,error}=await s.auth.signUp({email,password,options:{emailRedirectTo:REDIRECT}});
        if(error)throw error;
        message(data.session?'登録しました。':'確認メールを送信しました。メール内のリンクから認証してください。');
      }
    }catch(err){console.error(err);message('処理できませんでした。少し待ってからもう一度お試しください。')}
  },true);
  new MutationObserver(ensureResend).observe(document.documentElement,{childList:true,subtree:true});
  ensureResend();
})();
