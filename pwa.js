/* MASTERS GESTÃO - Aplicativo instalável (PWA). Não grava nem lê dados do Supabase por conta própria. */
try{(function(){
const $q=s=>document.querySelector(s);
const standalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: minimal-ui)').matches||navigator.standalone===true}catch(e){return false}};
const ua=navigator.userAgent||'';
const ios=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const android=/Android/i.test(ua);
const safari=ios&&/Safari/.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
let pedido=null;

const st=document.createElement('style');
st.textContent='html{-webkit-text-size-adjust:100%}body{-webkit-tap-highlight-color:transparent}'+
 '@supports(height:100dvh){aside{height:100dvh}}'+
 'main{padding-left:max(22px,env(safe-area-inset-left));padding-right:max(22px,env(safe-area-inset-right));padding-bottom:max(40px,env(safe-area-inset-bottom))}'+
 '@media(max-width:820px){main{padding-left:max(12px,env(safe-area-inset-left));padding-right:max(12px,env(safe-area-inset-right))}}'+
 '.pwa-bar{position:fixed;left:0;right:0;bottom:0;z-index:60;background:#313E86;color:#fff;padding:10px max(14px,env(safe-area-inset-left)) max(10px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-right));display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;font-size:15px}'+
 '.pwa-bar.off{background:#FC0A0B}.pwa-bar button{background:#fff;color:#313E86;border:0;border-radius:8px;min-height:40px;padding:0 14px;font-weight:600;cursor:pointer}';
document.head.appendChild(st);

function barra(id,texto,botao,fn,cl){let b=document.getElementById(id);if(b)b.remove();
 b=document.createElement('div');b.id=id;b.className='pwa-bar'+(cl?' '+cl:'');b.setAttribute('role','status');
 const t=document.createElement('span');t.textContent=texto;b.appendChild(t);
 if(botao){const k=document.createElement('button');k.type='button';k.textContent=botao;k.onclick=fn;b.appendChild(k)}
 document.body.appendChild(b);return b}
const tira=id=>{const b=document.getElementById(id);if(b)b.remove()};

function rede(){if(navigator.onLine===false)barra('pwa_off','Sem internet. O sistema precisa de conexão para consultar e gravar dados.','',null,'off');else tira('pwa_off')}
addEventListener('online',rede);addEventListener('offline',rede);rede();

addEventListener('beforeinstallprompt',e=>{e.preventDefault();pedido=e;marca()});
addEventListener('appinstalled',()=>{pedido=null;marca();try{toast('Aplicativo instalado.')}catch(x){}});

function passos(){
 if(ios)return `<p><b>No iPhone ou iPad (use o Safari):</b></p><ol class="steps"><li>Abra este endereço no <b>Safari</b>${safari?'':' (você está em outro navegador: copie o endereço e abra no Safari)'}.</li><li>Toque no botão <b>Compartilhar</b> (quadrado com uma seta para cima, embaixo da tela; no iPad fica no alto).</li><li>Role a lista e toque em <b>Adicionar à Tela de Início</b>.</li><li>Confira o nome <b>Masters</b> e toque em <b>Adicionar</b>.</li><li>Abra o aplicativo pelo ícone <b>Masters</b> na Tela de Início. No primeiro acesso, entre de novo com seu usuário e senha.</li></ol>`;
 if(android)return `<p><b>No Android (Chrome ou Edge):</b></p><ol class="steps"><li>Toque nos <b>três pontinhos</b> do navegador.</li><li>Toque em <b>Instalar aplicativo</b> (ou <b>Adicionar à tela inicial</b>).</li><li>Confirme em <b>Instalar</b>.</li><li>Abra pelo ícone <b>Masters</b> na tela inicial.</li></ol><p class="hint">Se a opção não aparecer, atualize a página e aguarde alguns segundos.</p>`;
 return `<p><b>No computador (Chrome ou Edge):</b></p><ol class="steps"><li>Clique no ícone de instalar na barra de endereço (à direita), ou no menu <b>⋮ → Instalar Masters Gestão</b>.</li><li>Confirme em <b>Instalar</b>.</li></ol>`}

async function instalar(){
 if(standalone()){try{toast('O aplicativo já está instalado.')}catch(x){}return}
 if(pedido){try{pedido.prompt();await pedido.userChoice}catch(e){}pedido=null;marca();return}
 try{modal('Instalar o aplicativo',passos(),'Entendi',()=>{})}catch(e){alert('Use o menu do navegador e escolha Instalar aplicativo / Adicionar à Tela de Início.')}}

function marca(){
 const m=$q('#menu'),vis=!standalone();
 if(m){let b=m.querySelector('[data-pwa="inst"]');
  if(vis&&!b&&m.children.length){m.insertAdjacentHTML('beforeend','<h4>Aplicativo</h4><button class="nav" data-pwa="inst">Instalar aplicativo</button>')}
  if(!vis){m.querySelectorAll('[data-pwa="inst"]').forEach(x=>{const h=x.previousElementSibling;x.remove();if(h&&h.tagName==='H4'&&h.textContent==='Aplicativo')h.remove()})}}
 const lf=$q('#lf');
 if(lf&&vis&&!document.getElementById('pwa_inst_l')){const d=document.createElement('div');d.style.cssText='text-align:center;margin-top:14px';
  d.innerHTML='<button type="button" class="link" id="pwa_inst_l" data-pwa="inst">Instalar aplicativo no celular</button>';lf.appendChild(d)}
 if(lf&&!vis){const l=document.getElementById('pwa_inst_l');if(l&&l.parentNode)l.parentNode.remove()}}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-pwa="inst"]');if(!t)return;
 e.preventDefault();e.stopPropagation();document.body.classList.remove('open');instalar()},true);
try{const _mp=menu;menu=function(){_mp();marca()}}catch(e){}
const mm=$q('#menu');if(mm)new MutationObserver(marca).observe(mm,{childList:true});
marca();

const local=()=>location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';
const arqs=()=>[location.pathname,...[...document.scripts].map(s=>s.src).filter(s=>s&&new URL(s).origin===location.origin).map(s=>new URL(s).pathname),new URL('manifest.json',location.href).pathname];
async function assinatura(){try{const r=await Promise.all(arqs().map(async u=>{const x=await fetch(u,{method:'HEAD',cache:'no-cache'});return u+'='+(x.headers.get('etag')||x.headers.get('last-modified')||x.headers.get('content-length')||x.status)}));return r.join('|')}catch(e){return null}}
let base=null,avisado=false;
function novo(){if(avisado)return;avisado=true;barra('pwa_up','Há uma versão nova do Masters Gestão.','Atualizar agora',()=>location.reload())}
async function confere(){if(avisado||navigator.onLine===false)return;const a=await assinatura();if(a&&base&&a!==base)novo()}
if('serviceWorker' in navigator&&local()){
 addEventListener('load',async()=>{
  try{const reg=await navigator.serviceWorker.register('service-worker.js',{scope:'./',updateViaCache:'none'});
   window.__pwaReg=reg;reg.update().catch(()=>{});
   setTimeout(async()=>{base=await assinatura()},1500);
   navigator.serviceWorker.addEventListener('controllerchange',()=>{if(window.__pwaTinhaSW)novo();window.__pwaTinhaSW=true});
   window.__pwaTinhaSW=!!navigator.serviceWorker.controller;
  }catch(e){window.__pwaErro=e}})}

let saiu=0;
const TELAS=['solicitacoes','receber','estoque','painel'];
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){saiu=Date.now();return}
 try{window.__pwaReg&&window.__pwaReg.update().catch(()=>{})}catch(e){}
 confere();
 const d=document.getElementById('dlg');
 if(saiu&&Date.now()-saiu>30000&&typeof me!=='undefined'&&me&&!(d&&d.open)&&typeof cur!=='undefined'&&TELAS.includes(cur)){
  const n=document.querySelector('#menu .nav.on');if(n){const abre=document.body.classList.contains('open');n.click();if(!abre)document.body.classList.remove('open')}}
 saiu=0});
})()}catch(e){window.__pwaErro0=e;console.error('PWA não carregou:',e)}
