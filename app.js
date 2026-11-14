import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,signInAnonymously} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getDatabase,ref,set,get,update,push,remove,onValue} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


const E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $=s=>document.querySelector(s),app=$('#app');
const S={sel:new Set(),peek:new Set(),answers:null,results:null,revealed:null,players:null,meta:null,mine:null};
let db,uid,off=0;
const now=()=>Date.now()+off;
const R=p=>ref(db,`rooms/${S.room}${p?'/'+p:''}`);
const CH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const gen=()=>Array.from({length:5},()=>CH[Math.random()*CH.length|0]).join('');
const joinUrl=()=>location.origin+location.pathname+'?room='+S.room;
const DEF={limitOn:false,limit:1,instant:true,mode:'draw',tmode:'up',tdur:60,tfmt:'ms',okc:'red',ngc:'blue',share:false,sort:'send',vname:'pub',vtime:'hide',vmark:'pub',ipub:false,hprv:false,hideId:false,tshow:true,tlock:false};
const cfg=()=>({...DEF,...(S.meta?.settings||{})});
const EY='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">';
const EYE=EY+'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYEOFF=EY+'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/></svg>';
function showId(){const r=$('#rid'),e=$('#ey');if(!r||!e)return;const h=cfg().hideId;
  r.textContent=h&&!S.idv?'•••••':S.room;e.hidden=!h;e.innerHTML=S.idv?EYEOFF:EYE;e.setAttribute('aria-label',S.idv?'IDを隠す':'IDを表示')}
function updMid(){const m=$('#mid'),b=$('#me');if(!m)return;m.textContent=S.midv?S.room:'•••••';b.innerHTML=S.midv?EYEOFF:EYE;b.setAttribute('aria-label',S.midv?'IDを隠す':'IDを表示')}
const loadImg=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});
const bgMsg=t=>{const e=$('#bgs');if(e)e.textContent=t};
function afterBg(){
  if($('#cv'))paint($('#cv'),D.s);
  if(S.lpItems&&$('#lv'))liveView($('#lv'),S.lpItems);
  if($('#fp'))livePanel();
  const p=$('#bgp');if(p){p.hidden=!S.bgEl;if(S.bgSrc)p.src=S.bgSrc}
}
function bgApply(v){
  if(!v?.img){S.bgEl=null;S.bgKey=null;S.bgSrc='';afterBg();return}
  if(S.bgKey===v.t)return;S.bgKey=v.t;S.bgSrc=v.img;
  loadImg(v.img).then(i=>{S.bgEl=i;afterBg()}).catch(()=>{});
}
async function bgFromBlob(b){
  const u=URL.createObjectURL(b);let im;try{im=await loadImg(u)}finally{URL.revokeObjectURL(u)}
  const W=640,H=384,k=Math.min(W/im.width,H/im.height),w=im.width*k,h=im.height*k;
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,W,H);x.drawImage(im,(W-w)/2,(H-h)/2,w,h);
  const d=x.getImageData(0,0,W,H),a=d.data;
  for(let i=0;i<a.length;i+=4){const g=Math.round(a[i]*.299+a[i+1]*.587+a[i+2]*.114);a[i]=a[i+1]=a[i+2]=g;a[i+3]=255}
  x.putImageData(d,0,0);
  let o=cv.toDataURL('image/png');if(o.length>380000)o=cv.toDataURL('image/jpeg',.75);
  await set(R('bg'),{img:o,t:now()});
}
async function bgSet(b){try{bgMsg('変換中…');await bgFromBlob(b);bgMsg('設定しました')}catch(e){bgMsg('画像を読み込めませんでした')}}
const bd=d=>d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()});
const ST={s1:['limitOn','c'],s2:['limit','n'],s3:['instant','c'],s4:['mode'],s6:['tmode'],s7:['tdur','n'],s8:['tfmt'],sa:['okc'],sb:['ngc'],sc:['share','c'],sd:['sort'],se:['vname'],sf:['vtime'],sg:['vmark'],sh:['ipub','c'],si:['hprv','c'],sk:['hideId','c'],ss:['tshow','c'],st:['tlock','c']};
function applySet(c){
  Object.entries(ST).forEach(([id,[k,t]])=>{const el=$('#'+id);if(el)t==='c'?el.checked=!!c[k]:el.value=c[k]});
  $('#shg').hidden=!c.share;showId();
}

const showErr=(t,h,e)=>{app.innerHTML=`<div class="home"><h1>${E(t)}</h1><p class="err">${E(h)}${e?'<br>'+E(e.message):''}</p></div>`};
async function init(){
  let firebaseConfig;
  try{({firebaseConfig}=await import('./config.js'));if(!firebaseConfig)throw new Error('「export const firebaseConfig」が見つかりません')}
  catch(e){return showErr('設定ファイル config.js を読み込めません','config.js が index.html と同じフォルダにあるか、中身が「export const firebaseConfig={…}」の形になっているか確認してください。',e)}
  if(/YOUR_/.test(JSON.stringify(firebaseConfig)))return showErr('Firebaseの設定が未入力です','config.js の「YOUR_…」の部分を、Firebaseの設定値に書き換えてください。');
  try{
    const a=initializeApp(firebaseConfig);db=getDatabase(a);
    const au=getAuth(a);await signInAnonymously(au);uid=au.currentUser.uid;
    onValue(ref(db,'.info/serverTimeOffset'),s=>off=s.val()||0);
    home();
  }catch(e){app.innerHTML=`<div class="home"><h1>接続できません</h1><p class="err">Firebaseの設定と匿名ログインの有効化を確認してください。<br>${E(e.message)}</p></div>`}
}
const err=m=>{$('#err').textContent=m};

function home(){
  const p=new URLSearchParams(location.search).get('room')||'',hr=localStorage.hostRoom;
  app.innerHTML=`<div class="home"><h1>早書き回答ツール</h1>
  <div class="panel"><h2>参加する</h2><input type="text" id="jc" placeholder="参加コード" value="${E(p)}" maxlength="8" autocapitalize="characters">
  <input type="text" id="jn" placeholder="名前" value="${E(localStorage.name||'')}" maxlength="12"><button class="pri" id="jb">参加する</button></div>
  <div class="panel"><h2>司会者</h2><button class="pri" id="cb">部屋を作る</button>${hr?`<button id="rb">部屋 ${E(hr)} に戻る</button>`:''}</div><p id="err" class="err"></p></div>`;
  $('#jb').onclick=join;$('#cb').onclick=create;
  if(hr)$('#rb').onclick=async()=>{S.room=hr;try{const m=await get(R('meta'));if(m.exists()&&m.val().host===uid)host();else err('この部屋は使えません')}catch(e){err('戻れませんでした')}};
}
async function create(){
  for(let i=0;i<5;i++){
    const c=gen();
    try{await set(ref(db,`rooms/${c}/meta`),{host:uid,created:now(),settings:{...DEF}});S.room=c;localStorage.hostRoom=c;return host()}catch(e){}
  }
  err('部屋を作れませんでした。データベースのルール設定を確認してください。');
}
async function join(){
  const c=$('#jc').value.trim().toUpperCase(),n=$('#jn').value.trim();
  if(!c||!n)return err('参加コードと名前を入力してください');
  S.room=c;
  try{
    const m=await get(R('meta'));if(!m.exists())return err('この参加コードの部屋は見つかりません');
    localStorage.name=n;S.name=n;await set(R('players/'+uid),{name:n,t:now()});party();
  }catch(e){err('参加できませんでした')}
}

/* ---------- 参加者 ---------- */
function party(){
  app.innerHTML=`<header class="top"><span class="code" id="rid"></span><button id="ey" hidden></button><span class="sp"></span><span id="fb" class="fb" hidden></span><span id="pn">${E(S.name)}</span><button id="gs">設定</button></header><div class="tbar" id="tm" hidden></div>
  <div class="pmain"><div class="left"><section class="info" id="info"><div id="lv" class="rvw" hidden></div><div id="ib"></div></section>
  <form class="ans" id="af"><div id="dz" hidden><div class="tl">${tbs()}</div><canvas id="cv" width="640" height="384"></canvas><div class="tr"><div class="seg"><button type="button" id="ud" data-d="u" aria-label="1つ戻す">↶<small>戻す<span class="kb">Z</span></small></button><button type="button" id="rd" data-d="r" aria-label="1つ進める">↷<small>進める<span class="kb">X</span></small></button><button type="button" data-d="c" aria-label="全消し">${IC.t}<small>全消し</small></button></div><button class="pri" id="ab2">送信<span class="kb" id="kbs">Enter</span></button></div></div><input type="text" id="ai" placeholder="回答を入力" autocomplete="off" maxlength="200">
  <div class="row"><span id="lf"></span><button type="button" id="bd">ボードを下げる</button><button class="pri" id="ab">送信</button></div></form></div><aside class="side" id="pl"></aside></div>
  <dialog id="gd"><h2>設定</h2><div class="f"><label for="gn">名前</label><input type="text" id="gn" maxlength="12"><button id="gnb">変更</button></div><div class="f"><label for="gk">送信ショートカット（PC）</label><select id="gk"><option value="Enter">Enter</option><option value="Space">Space</option></select></div><div class="f"><label for="gc">1行に表示する枚数</label><select id="gc"><option value="0">自動</option>${[1,2,3,4,5,6,7,8].map(n=>`<option>${n}</option>`).join('')}</select></div><div class="f"><button class="pri" id="gx">閉じる</button></div></dialog>`;
  $('#af').onsubmit=async e=>{
    e.preventDefault();if(full())return;
    const m=cfg().mode||'text',v=m==='draw'?'':$('#ai').value.trim(),ink=m!=='text'&&hasInk();
    if(!v&&!ink)return;
    const o={name:S.name,t:now()};if(v)o.text=v;if(ink)o.img=$('#cv').toDataURL('image/png');
    $('#ai').value='';if(ink){D.s=[];D.r=[];draw()}
    await push(R('answers/'+uid),o);
  };
  initDraw();
  $('#bd').onclick=()=>{const l=$('#af').classList.toggle('low');$('#bd').textContent=l?'ボードを出す':'ボードを下げる'};
  $('#gn').value=S.name;
  $('#gnb').onclick=async()=>{const n=$('#gn').value.trim();if(!n)return;S.name=n;localStorage.name=n;$('#pn').textContent=n;try{await update(R('players/'+uid),{name:n});$('#gd').close()}catch(e){alert('名前を変更できませんでした')}};
  $('#gs').onclick=()=>{$('#gn').value=S.name;$('#gd').showModal()};$('#gx').onclick=()=>$('#gd').close();bd($('#gd'));
  $('#gk').value=localStorage.sendKey||'Enter';$('#kbs').textContent=$('#gk').value;$('#gk').onchange=()=>{localStorage.sendKey=$('#gk').value;$('#kbs').textContent=$('#gk').value};
  $('#ib').onclick=e=>{const b=e.target.closest('[data-zs]');if(!b)return;const v=Math.min(8,Math.max(1,(S.cc||2)+(+b.dataset.zs>0?-1:1)));localStorage.colsP=v;$('#gc').value=v;pinfo()};$('#ey').onclick=()=>{S.idv=!S.idv;showId()};showId();
  $('#gc').value=localStorage.colsP||0;$('#gc').onchange=()=>{localStorage.colsP=$('#gc').value;pinfo()};
  setInterval(()=>{tick();const l=locked();if(l!==S.lk){S.lk=l;pinfo()}},100);
  addEventListener('resize',()=>{if(!+localStorage.colsP)pinfo()});
  S.fm=false;
  onValue(R('meta'),s=>{S.meta=s.val();pinfo()});
  onValue(R('players'),s=>{S.players=s.val();$('#pl').innerHTML=Object.values(S.players||{}).map(p=>`<span class="chip">${E(p.name)}</span>`).join('')});
  onValue(R('answers/'+uid),s=>{S.mine=s.val();pinfo()});
  onValue(R('results/'+uid),s=>{S.results=s.val();pinfo()});
  onValue(R('revealed'),s=>{S.revealed=s.val();pinfo()});
  onValue(R('hist'),s=>{S.hist=s.val();pinfo()});
  onValue(R('bg'),s=>bgApply(s.val()));
  document.addEventListener('keydown',pk);
  document.addEventListener('keyup',e=>{if(e.code==='Space'&&localStorage.sendKey==='Space'&&!e.target.closest?.('input,select,textarea'))e.preventDefault()});
  onValue(R('livepub'),s=>{const it=Object.entries(s.val()||{}).map(([id,v])=>({id,name:v.n||'',d:v.d||''}));S.lpItems=it;liveView($('#lv'),it);$('#lv').hidden=!it.length});
}
const myCount=()=>Object.keys(S.mine||{}).length;
const locked=()=>{const t=T(),c=cfg();if(!c.tlock||!t?.start||!t.dur)return false;return t.dur-((t.stop||now())-t.start)<=0};
const full=()=>(cfg().limitOn&&myCount()>=cfg().limit)||locked();
function pinfo(){
  const fo=S.meta?.focus,fm=!!(fo&&fo.mode!=='off'&&fo.users?.[uid]);
  if(fm!==S.fm){S.fm=fm;if(fm)liveSched();else remove(R('live/'+uid)).catch(()=>{})}
  liveBadge();showId();
  const c=cfg();$('#lf').textContent=locked()?'⏱ タイムアップ：送信ロック中':c.limitOn?`残り ${Math.max(0,c.limit-myCount())} 回`:'回数制限なし';
  const md=c.mode||'text';$('#dz').hidden=md==='text';$('#ai').hidden=md==='draw';$('#dz').style.opacity=full()?.4:1;
  $('#bd').hidden=md==='text';$('#ab2').disabled=full();
  $('#ab').disabled=full();$('#ai').disabled=full();
  const c0=cfg(),de=document.documentElement;de.dataset.okc=c0.okc;de.dataset.ngc=c0.ngc;
  const colsS=n=>{S.cc=colsP(n);return `style="grid-template-columns:repeat(${S.cc},1fr)"`};
  const card=(cls,hd,body)=>`<div class="hc ${cls}"><small>${hd}</small><div class="t">${body}</div></div>`;
  const ZS='<span class="zm"><button type="button" data-zs="1" aria-label="大きく">＋</button><button type="button" data-zs="-1" aria-label="小さく">－</button></span>';
  const lab=m=>m==='o'?'○ 正解':m==='x'?'× 不正解':'';
  const cl=m=>m==='o'?'ok':m==='x'?'ng':'';
  let html='';
  if(c0.share){
    const hv=Object.entries(S.hist||{}).map(([k,e])=>({k,...e})).sort((a,b)=>a.o-b.o);
    const lm=()=>{const a=Object.entries(S.mine||{}).sort((x,y)=>y[1].t-x[1].t)[0];return a?{id:a[0],v:a[1]}:null};
    html='<h3>みんなの回答'+ZS+'</h3>'+(hv.length?`<div class="hg" ${colsS(hv.length)}>`+hv.map(e=>{
      let img=e.img,tx=e.tx,m=e.m;const me=e.u===uid;
      if(me){const x=S.mine?.[e.k]?{id:e.k,v:S.mine[e.k]}:(c0.sort==='fixed'?lm():null);if(x){img=x.v.img;tx=x.v.text;m=S.results?.[x.id]||null}}
      const nm=e.n!==undefined?E(e.n):(me?'あなた':'');
      const df=e.df?` <span class="${e.dn?'neg':''}">${E(e.df)}</span>`:'';
      const body=(img||tx)?(img?`<img src="${img}">`:'')+(tx?E(tx):''):(e.em?'<span class="mut">未回答</span>':'<div class="ph">非公開</div>');
      return card(cl(m),`${nm}${df} ${lab(m)}`,body)}).join('')+'</div>':'<p class="mut">まだ回答がありません</p>');
  }else{
    const rv=Object.values(S.revealed||{}).sort((a,b)=>a.t-b.t);
    const my=Object.entries(S.mine||{}).map(([a,v])=>({a,...v})).sort((x,y)=>y.t-x.t);
    html=(rv.length?`<h3>公開された回答</h3><div class="rvw" style="--n:${rv.length}">`+rv.map(r=>card(cl(r.mark),E(r.name)+(r.mark==='o'?' ○':r.mark==='x'?' ×':''),(r.img?`<img src="${r.img}">`:'')+(r.text?E(r.text):''))).join('')+'</div>':'')
     +'<h3>あなたの回答'+ZS+'</h3>'+(my.length?`<div class="hg" ${colsS(my.length)}>`+my.map(v=>{const m=S.results?.[v.a];return card(cl(m),m?lab(m):'送信済み',(v.img?`<img src="${v.img}">`:'')+(v.text?E(v.text):''))}).join('')+'</div>':'<p class="mut">回答を入力して送信してください</p>');
  }
  $('#ib').innerHTML=html;
}

/* ---------- タイマー・表示設定 ---------- */
const T=()=>S.meta?.timer;
const fmt=(ms,dn)=>{
  if((S.meta?.settings?.tfmt||'ms')==='s')return (Math.max(0,ms)/1000).toFixed(1);
  const t=Math.max(0,dn?Math.ceil(ms/1000):Math.floor(ms/1000));
  return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
};
const tmText=()=>{const t=T();if(!t)return'';
  if(!t.start){if(!t.armed)return'';const c=cfg();return c.tmode==='down'?fmt((c.tdur||60)*1000,1):fmt(0,0)}
  const el=(t.stop||now())-t.start;return t.dur?fmt(t.dur-el,1):fmt(el,0)};
const tick=()=>{const hd=$('header.top');if(hd)document.documentElement.style.setProperty('--hh',hd.offsetHeight+'px');const e=$('#tm');if(!e)return;const t=cfg().tshow?tmText():'';e.hidden=!t;e.textContent=t};
const SV='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">';
const IC={p:SV+'<path d="M4 20l1-4L16.5 4.5l3 3L8 19z"/><path d="M14 7l3 3"/></svg>',e:SV+'<path d="M14.5 4.5l5 5L10 19H5.5l-2-2z"/><path d="M8 11l5 5"/></svg>',t:SV+'<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>'};
const KEYS={p:['E','W','Q'],e:['D','S','A']};
const tbs=()=>['p','e'].map(k=>{const n=k==='p'?'ペン':'消しゴム';return `<div class="grp"><span class="gl">${n}</span><div class="seg">${[0,1,2].map(l=>`<button type="button" data-t="${k}${l}" aria-label="${n}${'細中太'[l]}" title="${n}${'細中太'[l]}（${KEYS[k][l]}）">${IC[k]}<i class="sz" style="height:${[2,4,7][l]}px"></i><span class="kb">${KEYS[k][l]}</span></button>`).join('')}</div></div>`}).join('');
const colsP=n=>{const v=+localStorage.colsP;if(v>0)return v;
  const w=($('#ib')?.clientWidth||innerWidth)-8,mx=Math.max(1,Math.floor(w/150)),mn=Math.max(1,Math.ceil(w/420));
  return Math.max(mn,Math.min(n||1,mx))};
const gridCols=()=>{$('#cards').style.gridTemplateColumns=+localStorage.colsH?`repeat(${localStorage.colsH},1fr)`:''};
const tdiff=(c,i,t0)=>{const t=T(),st=t?.start;let x='',neg=false;
  if(st&&c.t>=st){if(t.dur){const r=(t.dur-(c.t-st))/1000;neg=r<0;x='残'+r.toFixed(3)+'s'}else x=((c.t-st)/1000).toFixed(3)+'s'}
  else if(i)x='+'+((c.t-t0)/1000).toFixed(3)+'s';
  return{x,neg}};
const tspan=(c,i,t0)=>{const d=tdiff(c,i,t0);return `<span class="${d.neg?'neg':''}">${d.x}</span>`};

/* ---------- 手書きボード ---------- */
const D={s:[],r:[],t:'p',l:1,cur:null},SZ={p:[4,8,16],e:[14,28,52]};
const hasInk=()=>{let i=D.s.length;while(i--){if(D.s[i].c)return false;if(!D.s[i].e)return true}return false};
const tools=()=>document.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===D.t+D.l));
function paint(cv,L){
  const x=cv.getContext('2d'),W=cv.width,H=cv.height;x.fillStyle='#fff';x.fillRect(0,0,W,H);
  L.forEach(t=>{
    if(t.c){x.fillStyle='#fff';x.fillRect(0,0,W,H);return}
    x.strokeStyle=t.e?'#fff':'#13233a';x.lineWidth=t.w;x.lineCap=x.lineJoin='round';x.beginPath();
    t.p.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));
    if(t.p.length===1)x.lineTo(t.p[0][0]+.01,t.p[0][1]);x.stroke();
  });
  if(S.bgEl){x.globalCompositeOperation='multiply';x.drawImage(S.bgEl,0,0,W,H);x.globalCompositeOperation='source-over'}
}
function draw(){paint($('#cv'),D.s);$('#ud').disabled=!D.s.length;$('#rd').disabled=!D.r.length;liveSched()}
const enc=()=>D.s.map(t=>{if(t.c)return'c';let last=null;
  const q=t.p.filter((p,i)=>{if(!last||i===t.p.length-1||Math.hypot(p[0]-last[0],p[1]-last[1])>=2){last=p;return true}return false});
  return (t.e?1:0)+'|'+t.w+'|'+q.map(p=>Math.round(p[0])+','+Math.round(p[1])).join(';')}).join('\n');
const parse=str=>(str||'').split('\n').filter(Boolean).map(l=>{if(l==='c')return{c:1};const[a,b,c]=l.split('|');return{e:a==='1',w:+b,p:c.split(';').map(q=>q.split(',').map(Number))}});
let liveT=0;
function liveSched(){if(!S.fm||liveT)return;liveT=setTimeout(()=>{liveT=0;set(R('live/'+uid),{d:enc(),t:now()}).then(()=>{S.le=null;liveBadge()}).catch(e=>{S.le=e.code||'error';liveBadge()})},120)}
function pk(e){
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]'))return;
  const inp=e.target.closest?.('input,select,textarea'),af=$('#af');if(!af)return;
  const sk=localStorage.sendKey||'Enter',isSend=sk==='Space'?e.code==='Space':(e.code==='Enter'||e.code==='NumpadEnter');
  if(isSend){if(inp)return;e.preventDefault();document.activeElement?.blur?.();if(!$('#ab').disabled)$('#ab').click();return}
  if(inp||$('#dz').hidden||af.classList.contains('low'))return;
  const M={KeyQ:'p2',KeyW:'p1',KeyE:'p0',KeyA:'e2',KeyS:'e1',KeyD:'e0'};
  if(M[e.code]){e.preventDefault();document.querySelector(`[data-t="${M[e.code]}"]`)?.click()}
  else if(e.code==='KeyZ'){e.preventDefault();$('#ud').click()}
  else if(e.code==='KeyX'){e.preventDefault();$('#rd').click()}
}
function liveBadge(){const b=$('#fb');if(!b)return;const e=!!(S.fm&&S.le);b.hidden=!e;b.className='fb err';b.textContent='⚠ 描画送信エラー'}
function liveView(box,items){
  const have=new Map([...box.children].map(c=>[c.dataset.id,c]));
  box.style.setProperty('--n',Math.max(1,items.length));
  items.forEach(it=>{
    let c=have.get(it.id);
    if(!c){c=document.createElement('div');c.className='hc lv';c.dataset.id=it.id;c.innerHTML='<small></small><canvas width="640" height="384"></canvas>';box.appendChild(c)}
    have.delete(it.id);c.firstChild.textContent=it.name+(it.wait?'（受信待ち）':'（描画中）');paint(c.querySelector('canvas'),parse(it.d));
  });
  have.forEach(c=>c.remove());
}
function livePanel(){
  const f=S.meta?.focus,us=(f&&f.mode!=='off')?Object.keys(f.users||{}):[];
  const it=us.map(u=>({id:u,name:S.players?.[u]?.name||'?',d:S.live?.[u]?.d||'',wait:S.live?.[u]===undefined}));
  liveView($('#fp'),it);
  $('#fpw').hidden=!it.length&&!S.lerr;
  $('#fh').textContent=S.lerr?'⚠ ライブ受信エラー（'+S.lerr+'）: Firebaseのルールを更新してください':'フォーカス';
}
function relay(){
  const f=S.meta?.focus;S.rl=S.rl||{};
  if(!(f&&f.mode==='all')){if(Object.keys(S.rl).length){S.rl={};remove(R('livepub'))}return}
  Object.keys(S.rl).forEach(u=>{if(!f.users?.[u]||S.live?.[u]===undefined){delete S.rl[u];remove(R('livepub/'+u))}});
  Object.keys(f.users||{}).forEach(u=>{
    const v=S.live?.[u];if(v===undefined)return;const d=v.d||'';
    if(S.rl[u]!==d){S.rl[u]=d;set(R('livepub/'+u),{d,n:S.players?.[u]?.name||''})}
  });
}
function renderFocus(){
  const f=S.meta?.focus||{};
  $('#fl').innerHTML=Object.entries(S.players||{}).map(([u,p])=>`<label class="fk"><input type="checkbox" data-fu="${u}" ${f.users?.[u]?'checked':''}>${E(p.name)}</label>`).join('')||'<small>参加者がいません</small>';
}
function initDraw(){
  const cv=$('#cv');D.s=[];D.r=[];D.t='p';D.l=1;D.cur=null;draw();tools();
  const pt=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height]};
  cv.onpointerdown=e=>{if(full())return;e.preventDefault();cv.setPointerCapture(e.pointerId);D.cur={e:D.t==='e',w:SZ[D.t][D.l],p:[pt(e)]};D.s.push(D.cur);D.r=[];draw()};
  cv.onpointermove=e=>{if(!D.cur)return;D.cur.p.push(pt(e));draw()};
  cv.onpointerup=cv.onpointercancel=()=>{D.cur=null};
  cv.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
  cv.oncontextmenu=e=>e.preventDefault();$('#dz').oncontextmenu=e=>e.preventDefault();
  $('#dz').onclick=e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.t){D.t=b.dataset.t[0];D.l=+b.dataset.t[1];tools()}
    else if(b.dataset.d==='u'&&D.s.length)D.r.push(D.s.pop());
    else if(b.dataset.d==='r'&&D.r.length)D.s.push(D.r.pop());
    else if(b.dataset.d==='c'){D.s.push({c:1});D.r=[]}
    draw();
  };
}

/* ---------- 司会者 ---------- */
function host(){
  app.innerHTML=`<header class="top"><span class="code" id="rid"></span><button id="ey" hidden></button><button id="pc">参加 0人</button><span class="sp"></span><button id="cu">URLをコピー</button></header><div class="tbar" id="tm" hidden></div>
  <section id="pnl" class="pnl" hidden></section>
  <section id="seat" class="seatw" hidden></section>
  <section id="fpw" hidden><h3 id="fh">フォーカス</h3><div id="fp" class="rvw"></div></section>
  <main class="grid" id="cards"></main>
  <footer class="bar"><button data-a="menu">メニュー</button><button data-a="selall" id="bsa">全選択</button><button data-a="selnone" id="bsn">選択解除</button><button data-a="notify" id="bn">通知</button><button data-a="reveal" id="br">公開</button><button data-a="unreveal" id="bu" hidden>取り下げ</button><button data-a="timer" id="bt">タイマー開始</button><button data-a="treset">タイマーリセット</button><button data-a="reset">リセット</button></footer>
  <dialog id="mn"><h2>設定</h2><div class="dc"><div class="dcl">
  <details open><summary>回答</summary>
  <div class="f"><label for="s4">回答方式</label><select id="s4"><option value="text">文字</option><option value="draw">手書き</option><option value="both">文字＋手書き</option></select></div>
  <div class="f"><input type="checkbox" id="s1"><label for="s1">回答回数を制限する</label><input type="number" id="s2" min="1" max="99"><span>回</span></div>
  <div class="f"><input type="checkbox" id="s3"><label for="s3">正解・不正解をすぐ通知する</label></div></details>
  <details><summary>タイマー</summary>
  <div class="f"><label for="s6">方式</label><select id="s6"><option value="up">カウントアップ</option><option value="down">カウントダウン</option></select><input type="number" id="s7" min="1" max="3600"><span>秒</span></div>
  <div class="f"><label for="s8">表示</label><select id="s8"><option value="ms">mm:ss</option><option value="s">秒のみ</option></select></div>
  <div class="f"><input type="checkbox" id="ss"><label for="ss">タイマーを表示する（司会者・参加者の全画面）</label></div>
  <div class="f"><input type="checkbox" id="st"><label for="st">カウントダウンが0になったら送信をロックする</label></div></details>
  <details><summary>判定の見た目</summary>
  <div class="f"><label for="sa">正解の背景</label><select id="sa"><option value="red">赤</option><option value="yellow">黄</option><option value="blue">青</option></select></div>
  <div class="f"><label for="sb">不正解の背景</label><select id="sb"><option value="blue">青</option><option value="black">黒</option><option value="red">赤</option></select></div></details>
  <details><summary>履歴の共有</summary>
  <div class="f"><input type="checkbox" id="sc"><label for="sc">全員の回答履歴を参加者に共有する</label></div>
  <div id="shg" hidden>
  <div class="f"><label for="sd">並び順</label><select id="sd"><option value="send">送信順</option><option value="fixed">固定</option></select></div>
  <div class="f"><label for="se">名前</label><select id="se"><option value="pub">公開</option><option value="priv">非公開</option><option value="hide">完全非公開</option></select></div>
  <div class="f"><label for="sf">タイム差</label><select id="sf"><option value="pub">公開</option><option value="priv">非公開</option><option value="hide">完全非公開</option></select></div>
  <div class="f"><label for="sg">正解/不正解</label><select id="sg"><option value="pub">公開</option><option value="priv">非公開</option><option value="hide">完全非公開</option></select></div>
  <div class="f"><input type="checkbox" id="sh"><label for="sh">即座に公開する</label></div>
  <div class="f"><input type="checkbox" id="si"><label for="si">司会者画面でも非公開にする</label></div></div></details>
  </div><div class="dcr"><details><summary>フォーカス</summary>
  <div class="f"><label for="s9">モード</label><select id="s9"><option value="off">OFF</option><option value="host">司会のみ</option><option value="all">全体公開</option></select></div>
  <div class="f fl" id="fl"></div></details>
  <details><summary>ボード背景画像</summary>
  <div class="f"><input type="file" id="bgf" accept="image/*"></div>
  <div class="f"><button id="bgc">クリップボードから貼り付け</button><button id="bgd">削除</button></div>
  <div class="f"><small id="bgs">Ctrl+V（⌘V）でも貼り付けできます。白は透過され、線は判定色に合わせて変わります。</small></div>
  <img id="bgp" hidden alt="背景プレビュー" style="max-width:100%;max-height:90px;border:1px solid var(--line);background:#fff;margin-bottom:10px"></details>
  <details><summary>この端末・部屋</summary>
  <div class="f"><label for="s5">1行の枚数</label><select id="s5"><option value="0">自動</option>${[1,2,3,4,5,6,7,8].map(n=>`<option>${n}</option>`).join('')}</select></div>
  <div class="f"><input type="checkbox" id="sk"><label for="sk">左上の部屋IDを隠す（全員の画面）</label></div>
  <div class="f"><input type="checkbox" id="sj"><label for="sj">次の判定対象の枠を表示（Q/W用）</label></div>
  <div class="f"><span>参加コード <b id="mid">•••••</b></span><button id="me">${EYE}</button><button id="cu2">参加URLをコピー</button></div></details>
  </div></div><div class="f"><button class="pri" id="cl">閉じる</button></div></dialog>
  <dialog id="zm"><img id="zi" style="width:100%;display:block"></dialog>`;
  const cp=async()=>{try{await navigator.clipboard.writeText(joinUrl());alert('コピーしました')}catch(e){prompt('URL',joinUrl())}};
  $('#cu').onclick=cp;$('#cu2').onclick=cp;$('#cl').onclick=()=>$('#mn').close();$('#zm').onclick=()=>$('#zm').close();
  $('#s9').onchange=()=>update(R('meta/focus'),{mode:$('#s9').value});
  $('#pc').onclick=()=>{$('#pnl').hidden=!$('#pnl').hidden};
  $('#ey').onclick=()=>{S.idv=!S.idv;showId()};showId();
  $('#me').onclick=()=>{S.midv=!S.midv;updMid()};bd($('#mn'));
  $('#fl').onchange=e=>{const u=e.target.dataset.fu;if(u)update(R('meta/focus/users'),{[u]:e.target.checked?true:null})};
  $('#sj').checked=localStorage.tgt!=='0';$('#sj').onchange=()=>{localStorage.tgt=$('#sj').checked?'1':'0';cards()};
  $('#s5').value=localStorage.colsH||0;$('#s5').onchange=()=>{localStorage.colsH=$('#s5').value;gridCols()};gridCols();
  setInterval(tick,100);
  const sv=async()=>{const o={};Object.entries(ST).forEach(([id,[k,t]])=>{const el=$('#'+id);o[k]=t==='c'?el.checked:t==='n'?Math.max(1,+el.value||1):el.value});await update(R('meta/settings'),o);if(o.instant)notify()};
  Object.keys(ST).forEach(i=>$('#'+i).onchange=sv);
  app.onclick=hclick;
  $('#cards').onchange=e=>{const k=e.target.dataset.sel;if(!k)return;e.target.checked?S.sel.add(k):S.sel.delete(k);bar()};
  onValue(R('meta'),s=>{S.meta=s.val();const c=cfg();applySet(c);document.documentElement.dataset.okc=c.okc;document.documentElement.dataset.ngc=c.ngc;const t=T();$('#bt').textContent=(t?.start&&!t.stop)?'タイマー停止':'タイマー開始';$('#s9').value=S.meta?.focus?.mode||'off';renderFocus();livePanel();relay();cards()});
  onValue(R('players'),s=>{S.players=s.val();$('#pc').textContent=`参加 ${Object.keys(S.players||{}).length}人`;renderPnl();renderFocus();livePanel();cards()});
  onValue(R('answers'),s=>{S.answers=s.val();S.al=1;cards()});
  onValue(R('results'),s=>{S.results=s.val();cards()});
  onValue(R('revealed'),s=>{S.revealed=s.val();cards()});
  onValue(R('live'),s=>{S.lerr=null;S.live=s.val()||{};livePanel();relay()},e=>{S.lerr=e.code||'error';livePanel()});
  document.addEventListener('keydown',hk);
  onValue(R('bg'),s=>bgApply(s.val()));
  document.addEventListener('paste',e=>{if(e.target.closest?.('input,textarea'))return;const f=[...(e.clipboardData?.files||[])].find(f=>f.type.startsWith('image/'));if(f){e.preventDefault();bgSet(f)}});
  $('#bgf').onchange=e=>{const f=e.target.files[0];if(f)bgSet(f);e.target.value=''};
  $('#bgc').onclick=async()=>{try{for(const i of await navigator.clipboard.read()){const ty=i.types.find(t=>t.startsWith('image/'));if(ty){await bgSet(await i.getType(ty));return}}bgMsg('クリップボードに画像がありません')}catch(e){bgMsg('貼り付けできませんでした。Ctrl+V（⌘V）を押してください')}};
  $('#bgd').onclick=()=>{remove(R('bg'));bgMsg('削除しました')};
}
const list=()=>Object.entries(S.answers||{}).flatMap(([u,o])=>Object.entries(o).map(([a,v])=>({u,a,k:u+'/'+a,...v}))).sort((x,y)=>x.t-y.t);
const pub=c=>S.results?.[c.u]?.[c.a]||null;
const pend=()=>list().filter(c=>c.mark&&!nOn(c));
const order=()=>{const pl=S.players||{},sv=(S.meta?.order||'').split(',').filter(u=>pl[u]);
  return[...sv,...Object.keys(pl).filter(u=>!sv.includes(u)).sort((a,b)=>(pl[a].t||0)-(pl[b].t||0))]};
const pubOn=c=>c.pb===undefined?cfg().ipub:c.pb;
function cards(){
  const c0=cfg(),L=list(),t0=L[0]?.t,tgOn=localStorage.tgt!=='0',tg=L.find(c=>!c.mark)?.k,fx=c0.share&&c0.sort==='fixed',lastK={};
  L.forEach(c=>{lastK[c.u]=c.k});document.documentElement.dataset.tgt=tgOn?'1':'0';
  $('#cards').innerHTML=L.length?L.map((c,i)=>{
    const rv=c0.share?pubOn(c):!!S.revealed?.[c.a],sl=S.sel.has(c.k),nt=nOn(c),pk=S.peek.has(c.k),hp=c0.share&&c0.hprv&&!rv,hd=hp&&!pk;
    return `<div class="card ${c.mark==='o'?'ok':c.mark==='x'?'ng':''} ${sl?'sel':''} ${c.k===tg?'tgt':''} ${fx&&lastK[c.u]!==c.k?'dim':''}">
    <div class="h" data-sel="${c.k}"><span>#${i+1}</span><b>${E(S.players?.[c.u]?.name||c.name)}</b>${tspan(c,i,t0)}${sl?'<span>✓</span>':''}</div>
    <div class="t">${hd?`<div class="ph" data-peek="${c.k}">非公開<small>タップで確認</small></div>`:(c.img?`<img data-z="1" src="${c.img}" alt="手書き回答">`:'')+E(c.text||'')}</div>
    <div class="b"><button class="o" data-m="o" data-k="${c.k}" aria-label="正解">○</button><button class="x" data-m="x" data-k="${c.k}" aria-label="不正解">×</button><button class="mini ${rv?'on':''}" data-p="${c.k}">公開</button><button class="mini ${nt?'on':''}" data-n="${c.k}">通知</button></div></div>`}).join('')
    :'<p class="empty">回答が届くとここに並びます</p>';
  bar();seats();histRelay();renderPnl();
  if(S.scr){S.scr=false;document.querySelector('.card.tgt')?.scrollIntoView({block:'nearest',behavior:'smooth'})}
}
function renderPnl(){
  const pn=$('#pnl');if(!pn)return;
  const cn={};list().forEach(c=>{const o=cn[c.u]||(cn[c.u]={o:0,x:0});if(c.mark==='o')o.o++;else if(c.mark==='x')o.x++});
  pn.innerHTML=Object.entries(S.players||{}).map(([u,p])=>{const k=cn[u]||{o:0,x:0};return `<span class="chip">${E(p.name)} <span class="mk ok">○${k.o}</span> <span class="mk ng">×${k.x}</span></span>`}).join('')||'<small>参加者がいません</small>';
}
function seats(){
  const c0=cfg(),box=$('#seat'),on=c0.share&&c0.sort==='fixed';box.hidden=!on;if(!on)return;box.style.setProperty('--sw',(+localStorage.seatW||150)+'px');
  const last={};list().forEach(c=>{last[c.u]=c});
  box.innerHTML='<h3><span>席順（ドラッグか◀▶で並べ替え）</span><span class="zm"><button data-zh="1" aria-label="大きく">＋</button><button data-zh="-1" aria-label="小さく">－</button></span></h3><div class="sw">'+order().map(u=>{
    const c=last[u],nm=E(S.players?.[u]?.name||'?'),hd=c&&c0.hprv&&!pubOn(c)&&!S.peek.has(c.k);
    const body=!c?'<span class="mut">未回答</span>':hd?'<div class="ph">非公開</div>':(c.img?`<img src="${c.img}">`:'')+E(c.text||'');
    return `<div class="hc seat ${c?.mark==='o'?'ok':c?.mark==='x'?'ng':''}" draggable="true" data-su="${u}"><small><button data-mv="-1" data-u="${u}">◀</button>${nm}<button data-mv="1" data-u="${u}">▶</button></small><div class="t">${body}</div></div>`}).join('')+'</div>';
  box.ondragstart=e=>{const t=e.target.closest('[data-su]');if(t){S.drag=t.dataset.su;e.dataTransfer.effectAllowed='move'}};
  box.ondragover=e=>{if(S.drag)e.preventDefault()};
  box.ondragend=()=>{S.drag=null};
  box.ondrop=e=>{const t=e.target.closest('[data-su]');if(!t||!S.drag)return;e.preventDefault();
    const o=order(),si=o.indexOf(S.drag),ti=o.indexOf(t.dataset.su),n=o.filter(u=>u!==S.drag);
    n.splice(n.indexOf(t.dataset.su)+(si<ti?1:0),0,S.drag);S.drag=null;update(R('meta'),{order:n.join(',')})};
}
function moveSeat(u,d){const o=order(),i=o.indexOf(u),j=i+d;if(i<0||j<0||j>=o.length)return;[o[i],o[j]]=[o[j],o[i]];update(R('meta'),{order:o.join(',')})}
function histRelay(){
  if(!S.al||!S.meta)return;
  const c0=cfg();
  if(!c0.share){if(S.hvOn!==false){S.hvOn=false;S.hv={};remove(R('hist'))}return}
  const L=list(),t0=L[0]?.t,pl=S.players||{},out={};
  const show=(m,pb)=>m==='pub'||(m==='priv'&&pb);
  const make=(c,i,o)=>{const pb=pubOn(c),rel=nOn(c)?(c.mark||null):null,e={u:c.u,o};
    if(show(c0.vname,pb))e.n=pl[c.u]?.name||c.name;
    if(show(c0.vtime,pb)){const d=tdiff(c,i,t0);if(d.x){e.df=d.x;if(d.neg)e.dn=1}}
    if(show(c0.vmark,pb)&&rel)e.m=rel;
    if(pb){if(c.img)e.img=c.img;if(c.text)e.tx=c.text}
    return e};
  if(c0.sort==='fixed'){
    const last={};L.forEach((c,i)=>{last[c.u]=[c,i]});
    order().forEach((u,o)=>{out[u]=last[u]?make(last[u][0],last[u][1],o):(()=>{const e={u,o,em:1};if(c0.vname==='pub')e.n=pl[u]?.name||'';return e})()});
  }else L.forEach((c,i)=>{out[c.a]=make(c,i,i)});
  if(S.hvOn!==true){S.hvOn=true;S.hv=Object.fromEntries(Object.entries(out).map(([k,e])=>[k,JSON.stringify(e)]));set(R('hist'),Object.keys(out).length?out:null);return}
  const up={};
  Object.keys(S.hv).forEach(k=>{if(!out[k]){up['hist/'+k]=null;delete S.hv[k]}});
  Object.entries(out).forEach(([k,e])=>{const j=JSON.stringify(e);if(S.hv[k]!==j){S.hv[k]=j;up['hist/'+k]=e}});
  if(Object.keys(up).length)update(R(''),up);
}
function bar(){
  const keys=new Set(list().map(c=>c.k));[...S.sel].forEach(k=>keys.has(k)||S.sel.delete(k));
  const n=pend().length;$('#bn').textContent=n?`通知 (${n})`:'通知';$('#bn').disabled=!n;
  $('#br').textContent=S.sel.size?`公開 (${S.sel.size})`:'公開';$('#br').disabled=!S.sel.size;$('#bsn').disabled=!S.sel.size;$('#bsa').disabled=!list().length;$('#bu').hidden=cfg().share?!list().some(pubOn):!Object.keys(S.revealed||{}).length;
}
function hk(e){
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,select,textarea'))return;
  if(document.querySelector('dialog[open]'))return;
  const m=e.code==='KeyQ'?'o':e.code==='KeyW'?'x':null;if(!m)return;
  const c=list().find(c=>!c.mark);if(!c)return;
  e.preventDefault();S.scr=true;setCard(c,{mark:m});
}
const find=k=>list().find(c=>c.k===k);
const nOn=c=>c.nt===undefined?cfg().instant:c.nt;
async function setCard(c,o){
  const mk=o.mark!==undefined?o.mark:(c.mark||null),nt=o.nt!==undefined?o.nt:nOn(c);
  const up={[`answers/${c.u}/${c.a}/mark`]:mk,[`answers/${c.u}/${c.a}/nt`]:nt,[`results/${c.u}/${c.a}`]:nt?mk:null};
  if(S.revealed?.[c.a])up[`revealed/${c.a}/mark`]=nt?mk:null;
  await update(R(''),up);
}
const mark=(k,m)=>{const c=find(k);return setCard(c,{mark:c.mark===m?null:m})};
async function togglePub(c){
  if(cfg().share)return update(R(''),{[`answers/${c.u}/${c.a}/pb`]:!pubOn(c)});
  if(S.revealed?.[c.a])await remove(R('revealed/'+c.a));
  else await set(R('revealed/'+c.a),{name:c.name,text:c.text||'',img:c.img||null,t:c.t,mark:(nOn(c)&&c.mark)||null});
}
async function notify(){
  const up={};pend().forEach(c=>{up[`answers/${c.u}/${c.a}/nt`]=true;up[`results/${c.u}/${c.a}`]=c.mark;if(S.revealed?.[c.a])up[`revealed/${c.a}/mark`]=c.mark});
  if(Object.keys(up).length)await update(R(''),up);
}
async function hclick(e){
  if(e.target.dataset.z){$('#zi').src=e.target.src;$('#zm').showModal();return}
  const pe=e.target.closest('[data-peek]');
  if(pe){const k=pe.dataset.peek;S.peek.has(k)?S.peek.delete(k):S.peek.add(k);cards();return}
  const hd=e.target.closest('.h[data-sel]');
  if(hd){const k=hd.dataset.sel;S.sel.has(k)?S.sel.delete(k):S.sel.add(k);cards();return}
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.zh){localStorage.seatW=Math.min(420,Math.max(90,(+localStorage.seatW||150)+(+b.dataset.zh)*30));return seats()}
  if(b.dataset.mv)return moveSeat(b.dataset.u,+b.dataset.mv);
  if(b.dataset.m)return mark(b.dataset.k,b.dataset.m);
  if(b.dataset.p)return togglePub(find(b.dataset.p));
  if(b.dataset.n){const c=find(b.dataset.n);return setCard(c,{nt:!nOn(c)})}
  const a=b.dataset.a;
  if(a==='menu'){S.midv=false;updMid();if(window.matchMedia&&matchMedia('(min-width:900px)').matches)document.querySelectorAll('#mn details').forEach(d=>d.open=true);$('#mn').showModal()}
  else if(a==='notify')notify();
  else if(a==='selall'){list().forEach(c=>S.sel.add(c.k));cards()}
  else if(a==='selnone'){S.sel.clear();cards()}
  else if(a==='treset')await set(R('meta/timer'),{armed:true,dur:cfg().tmode==='down'?(cfg().tdur||60)*1000:null});
  else if(a==='timer'){const t=T();if(t?.start&&!t.stop)await update(R('meta/timer'),{stop:now()});else await update(R('meta/timer'),{start:now(),stop:null,dur:cfg().tmode==='down'?(cfg().tdur||60)*1000:null})}
  else if(a==='reveal'&&cfg().share){const up={};list().filter(c=>S.sel.has(c.k)).forEach(c=>{up[`answers/${c.u}/${c.a}/pb`]=true});if(Object.keys(up).length)await update(R(''),up);S.sel.clear();cards()}
  else if(a==='reveal'){
    const o={};list().filter(c=>S.sel.has(c.k)).forEach(c=>{o[c.a]={name:c.name,text:c.text||'',img:c.img||null,t:c.t,mark:(nOn(c)&&c.mark)||null}});
    if(Object.keys(o).length)await update(R(''),Object.fromEntries(Object.entries(o).map(([a,v])=>['revealed/'+a,v])));S.sel.clear();cards();
  }
  else if(a==='unreveal'){if(cfg().share){const up={};list().forEach(c=>{up[`answers/${c.u}/${c.a}/pb`]=false});await update(R(''),up)}else await remove(R('revealed'))}
  else if(a==='reset'&&confirm('届いた回答・通知・公開をすべて削除し、回答回数もリセットします。よろしいですか？')){
    S.sel.clear();await update(R(''),{answers:null,results:null,revealed:null});
  }
}
init();
