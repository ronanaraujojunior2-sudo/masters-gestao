/* MASTERS GESTÃO - Tela "Solicitações e pedidos": os DOIS status separados.
   STATUS DO PRAZO (administrativo, 5 dias úteis desde a autorização): Aguardando autorização | Dentro do prazo | Prazo vencido | Regularizado
   STATUS DO RECEBIMENTO (entrega física dos materiais dos pedidos): Não comprado | Aguardando recebimento | Recebimento parcial | Recebido totalmente | Com divergência
   Um não altera o outro. O atraso de quem foi regularizado continua visível. O recebimento nunca apaga o atraso.
   v3: o Status do recebimento passa a refletir os recebimentos registrados (SQL 21): parcial, total e com divergência; atualiza sozinho (window.__pzRecarregar).
   Precisa do SQL 20 no Supabase (e do 21 para os recebimentos). Sem eles, as colunas mostram "—" com um aviso; nada quebra e nada é gravado (este arquivo só LÊ dados).
   A coluna "Situação" antiga (um campo genérico que misturava as duas coisas) fica escondida na lista.
   Carregar DEPOIS de modulo-atendimento.js: os dois status também aparecem no painel "+" de cada solicitação. */
try{(function(){
const fd=d=>d?new Date(String(d).slice(0,10)+'T00:00').toLocaleDateString('pt-BR'):'—';
const sem=d=>d?new Date(String(d).slice(0,10)+'T00:00').toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''):'';
const dh=d=>d?new Date(d).toLocaleString('pt-BR',{timeZone:'America/Manaus',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
const du=n=>n+' '+(n===1?'dia útil':'dias úteis');
const x=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function estilo(){if(document.getElementById('pz_css'))return;const s=document.createElement('style');s.id='pz_css';
 s.textContent='.pz-c{font-size:13px;line-height:1.5;min-width:150px}.pz-c b{font-weight:600}.pz-c .chip{margin:2px 0}.pz-c .hint{display:block}'+
 '.pz-bar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:8px 0}.pz-bar label{display:flex;gap:6px;align-items:center;font-weight:600;font-size:14px}.pz-bar select{min-height:44px;max-width:100%}'+
 '.pz-aviso{font-size:13px;margin:6px 0;color:var(--ink)}.pz-off,.pz-hide{display:none!important}'+
 '.pz-det{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 12px}.pz-det>div{flex:1 1 260px;min-width:0;background:var(--surf,#fff);border:1px solid var(--line,#C9D0E8);border-radius:10px;padding:10px 12px}'+
 '.pz-det h4{margin:0 0 6px;font-size:14px}.pz-hl{margin:6px 0 0;padding:0;list-style:none;font-size:13px}.pz-hl li{padding:4px 0;border-top:1px solid var(--line,#C9D0E8)}.pz-hl .hint{display:block}';
 document.head.appendChild(s)}

/* ---------- textos ---------- */
const REC=()=>!(window.__recAtivo&&window.__recAtivo()===false);   /* chave recebimento_compras: desativado = sem a coluna, o filtro e o bloco de recebimento */
function chipPrazo(r){const s=r.situacao;
 if(s==='Prazo vencido')return '<span class="chip red">Prazo vencido</span>';
 if(s==='Dentro do prazo'||s==='Regularizado')return '<span class="chip blue">'+x(s)+'</span>';
 return '<span class="chip">'+x(s)+'</span>'}
function chipReceb(r){const s=r.situacao;
 if(s==='Com divergência')return '<span class="chip red">Com divergência</span>';
 if(s==='Recebido totalmente'||s==='Recebimento parcial')return '<span class="chip blue">'+x(s)+'</span>';
 return '<span class="chip">'+x(s)+'</span>'}

function prazoResumo(r,compacto){
 if(!r)return '—';const s=r.situacao;
 if(s==='Aguardando autorização')return '<span class="chip">Aguardando autorização</span><span class="hint">Contagem ainda não iniciada.</span>';
 if(s==='Cancelada')return '<span class="chip">Cancelada</span>';
 const base='Autorizada em <b>'+fd(r.data_aprovacao)+'</b><br>Prazo até <b>'+fd(r.data_prazo)+'</b> <span class="hint" style="display:inline">('+sem(r.data_prazo)+')</span><br>';
 if(s==='Regularizado'){const a=Number(r.atraso||0);
  return base+'Dias úteis decorridos: <b>'+(r.decorridos==null?'—':r.decorridos)+'</b><br>'+chipPrazo(r)+' <span class="hint" style="display:inline">em '+fd(r.regularizado_em)+'</span><br>'+
   (a>0?'<span class="chip red">Teve atraso de '+du(a)+'</span>':'<span class="hint">Sem atraso.</span>')}
 const v=s==='Prazo vencido';
 return base+'Decorridos: <b>'+r.decorridos+'</b> · Restam: <b>'+r.restantes+'</b><br>'+chipPrazo(r)+(v&&r.atraso?' <span class="hint" style="display:inline">há '+du(r.atraso)+'</span>':'')}

function recebResumo(r,id){
 if(!r)return '—';
 const s=r.situacao;let h=chipReceb(r);
 if(s==='Cancelada')return h;
 if(s==='Não comprado')return h+'<span class="hint">Ainda sem pedido de compra.</span>';
 const parc=r.itens>0&&r.cobertos<r.itens?'<span class="hint">Compra parcial: '+r.cobertos+' de '+r.itens+' item(ns) comprados por inteiro.</span>':'';
 const ult=r.ultimo_recebimento?'<span class="hint">Último recebimento: '+fd(r.ultimo_recebimento)+'</span>':'';
 if(s==='Aguardando recebimento')h+='<span class="hint">Nenhum recebimento registrado ainda.</span>'+parc;
 else if(s==='Recebimento parcial')h+=(r.linhas!=null?'<span class="hint">'+(r.linhas-r.linhas_pendentes)+' de '+r.linhas+' linha(s) de pedido recebida(s) por inteiro.</span>':'')+ult+parc;
 else if(s==='Recebido totalmente')h+='<span class="hint">Entrega concluída: nada pendente nos pedidos.</span>'+ult;
 else if(s==='Com divergência')h+='<span class="hint">'+(r.divergencias_abertas!=null?r.divergencias_abertas+' divergência(s) aberta(s). ':'')+'Resolva no painel "+" da solicitação.</span>'+ult+parc;
 if(id&&typeof window.__rcBotao==='function')h+=window.__rcBotao(id,r);
 return h}

function histLista(L){
 if(!L||!L.length)return '<p class="hint" style="margin:6px 0 0">Sem eventos de prazo registrados.</p>';
 return '<ul class="pz-hl">'+L.map(h=>'<li><b>'+x(h.evento)+'</b><span class="hint">'+x(h.detalhe||'')+'</span><span class="hint">'+dh(h.em)+'</span></li>').join('')+'</ul>'}

/* ---------- leitura ---------- */
async function ler(tab,cols,ids,filtro,ordem){let a=[];
 for(let k=0;k<ids.length;k+=100){let i=0;
  for(;;){let q=sb.from(tab).select(cols).in(filtro,ids.slice(k,k+100));if(ordem)q=q.order(ordem);const{data,error}=await q.range(i,i+999);
   if(error)throw error;a=a.concat(data||[]);if(!data||data.length<1000)break;i+=1000}}
 return a}
let V3=true;   /* com o SQL 21 a consulta traz linhas, pendências, divergências e último recebimento */
async function lerReceb(ids){
 if(V3){try{return await ler('solicitacoes_recebimento','id,situacao,itens,cobertos,compra_completa,linhas,linhas_pendentes,divergencias_abertas,ultimo_recebimento',ids,'id','id')}
  catch(e){if(/column|42703|schema cache/i.test((e&&(e.message||e.code))||''))V3=false;else throw e}}
 return ler('solicitacoes_recebimento','id,situacao,itens,cobertos,compra_completa',ids,'id','id')}
async function carregar(ids){
 const[p,r,h]=await Promise.all([
  ler('solicitacoes_prazo','id,situacao,data_aprovacao,data_prazo,decorridos,restantes,atraso,regularizado_em',ids,'id','id'),
  REC()?lerReceb(ids):Promise.resolve([]),
  ler('solicitacao_prazo_hist','id,solicitacao_id,evento,detalhe,em',ids,'solicitacao_id','em')]);
 const P={},R={},H={};p.forEach(a=>P[a.id]=a);r.forEach(a=>R[a.id]=a);h.forEach(a=>(H[a.solicitacao_id]=H[a.solicitacao_id]||[]).push(a));
 return{P,R,H}}

/* ---------- tela ---------- */
const ESTADO=new WeakMap();   /* tabela -> {mapa, f:{p,r}} */

function filtrar(tb){const E=ESTADO.get(tb);if(!E)return;
 E.mapa.forEach(m=>{const off=(E.f.p&&!(m.p&&m.p.situacao===E.f.p))||(E.f.r&&!(m.r&&m.r.situacao===E.f.r));
  m.tr.classList.toggle('pz-off',!!off);const nx=m.tr.nextElementSibling;if(nx&&nx.classList.contains('atd-d'))nx.classList.toggle('pz-off',!!off)})}

function filtros(tb,dp,dr){
 const cont=D=>{const c={};D.forEach(v=>c[v]=(c[v]||0)+1);return c};
 const opts=(ordem,c)=>'<option value="">Todas</option>'+ordem.filter(v=>c[v]).map(v=>'<option value="'+x(v)+'">'+x(v)+' ('+c[v]+')</option>').join('');
 const bar=document.createElement('div');bar.className='pz-bar';
 bar.innerHTML='<label>Prazo <select data-pzs="p">'+opts(['Aguardando autorização','Dentro do prazo','Prazo vencido','Regularizado','Cancelada'],cont(dp))+'</select></label>'+
  (REC()?'<label>Recebimento <select data-pzs="r">'+opts(['Não comprado','Aguardando recebimento','Recebimento parcial','Recebido totalmente','Com divergência','Cancelada'],cont(dr))+'</select></label>':'');
 bar.querySelectorAll('select').forEach(sel=>sel.onchange=()=>{const E=ESTADO.get(tb);E.f[sel.dataset.pzs]=sel.value;filtrar(tb)});
 return bar}

function detalhe(tb){
 const E=ESTADO.get(tb);if(!E)return;const ncol=tb.querySelector('thead tr').children.length;
 E.mapa.forEach((m,id)=>{
  const nx=m.tr.nextElementSibling;if(!nx||!nx.classList.contains('atd-d'))return;
  const td=nx.querySelector('td[colspan]');if(td&&Number(td.getAttribute('colspan'))!==ncol)td.setAttribute('colspan',ncol);
  const w=nx.querySelector('.atd-w');if(!w||w.querySelector('.pz-det')||!m.carregado)return;
  const d=document.createElement('div');d.className='pz-det';
  d.innerHTML='<div><h4>Status do prazo</h4><div class="pz-c">'+prazoResumo(m.p)+'</div><h4 style="margin-top:10px">Histórico do prazo</h4>'+histLista(m.h)+'</div>'+
   (REC()?'<div><h4>Status do recebimento</h4><div class="pz-c">'+recebResumo(m.r)+'</div><p class="hint" style="margin:8px 0 0">O prazo e o recebimento são independentes: receber o material não apaga um atraso, e um prazo vencido não quer dizer que o material não chegou.</p></div>':'');
  w.insertBefore(d,w.firstChild)})}

function aplicar(){
 const v=document.getElementById('view'),h=v&&v.querySelector('h1');
 if(!h||h.textContent.trim()!=='Solicitações e pedidos')return;
 const tb=v.querySelector('table');if(!tb)return;
 if(tb.dataset.pz){if(ESTADO.has(tb))detalhe(tb);return}
 const hr=tb.querySelector('thead tr');if(!hr)return;
 const ths=[...hr.children],iSit=ths.findIndex(y=>/^Situação/i.test(y.textContent.trim()));
 const rows=[...tb.querySelectorAll('tbody tr')].filter(r=>r.querySelector('[data-o]'));
 if(!rows.length||iSit<0)return;
 tb.dataset.pz='1';estilo();
 const thSit=ths[iSit];thSit.classList.add('pz-hide');
 const th1=Object.assign(document.createElement('th'),{textContent:'Status do prazo'}),th2=Object.assign(document.createElement('th'),{textContent:'Status do recebimento'});
 if(!REC())th2.classList.add('pz-hide');   /* sem recebimento: a coluna existe só por posição e não aparece */
 hr.insertBefore(th1,thSit);hr.insertBefore(th2,thSit);
 const mapa=new Map();
 rows.forEach(tr=>{const id=tr.querySelector('[data-o]').dataset.o,old=tr.children[iSit],t1=document.createElement('td'),t2=document.createElement('td');
  t1.innerHTML=t2.innerHTML='…';if(old)old.classList.add('pz-hide');if(!REC())t2.classList.add('pz-hide');
  tr.insertBefore(t1,old||null);tr.insertBefore(t2,old||null);mapa.set(id,{tr,t1,t2,carregado:false})});
 ESTADO.set(tb,{mapa,f:{p:'',r:''}});
 carregar([...mapa.keys()]).then(({P,R,H})=>{
  if(!document.body.contains(tb))return;
  const ps=[],rs=[];
  mapa.forEach((m,id)=>{m.p=P[id];m.r=R[id];m.h=H[id]||[];m.carregado=true;
   m.t1.innerHTML='<div class="pz-c">'+prazoResumo(m.p)+'</div>';m.t2.innerHTML='<div class="pz-c">'+recebResumo(m.r,id)+'</div>';
   if(m.p)ps.push(m.p.situacao);if(m.r)rs.push(m.r.situacao)});
  v.querySelectorAll('.pz-bar,.pz-aviso').forEach(y=>y.remove());
  const alvo=tb.closest('.card')||tb.parentElement;
  alvo.insertAdjacentElement('beforebegin',filtros(tb,ps,rs));
  detalhe(tb);window.__pzOk=(window.__pzOk||0)+1;
 }).catch(e=>{
  const falta=/does not exist|Could not find the table|schema cache|relation/i.test((e&&e.message)||'');
  mapa.forEach(m=>{m.t1.textContent=m.t2.textContent='—';m.t1.title=m.t2.title='Não foi possível carregar: '+(e&&e.message||e)});
  v.querySelectorAll('.pz-bar,.pz-aviso').forEach(y=>y.remove());
  const av=document.createElement('div');av.className='pz-aviso';
  av.textContent=falta?'Os status de prazo'+(REC()?' e de recebimento':'')+' ainda não estão ativos: falta instalar o SQL 20 no Supabase.':'Não foi possível carregar os status de prazo'+(REC()?' e de recebimento':'')+' agora. Atualize a página.';
  (tb.closest('.card')||tb.parentElement).insertAdjacentElement('beforebegin',av);
  /* sem os dados novos, a coluna antiga volta a aparecer */
  thSit.classList.remove('pz-hide');mapa.forEach(m=>{const o=m.t2.nextElementSibling;if(o)o.classList.remove('pz-hide')});
  window.__pzErro=e});
}
/* recarrega os dois status (e os painéis) sem sair da tela: usado depois de registrar um recebimento e pelo tempo real */
async function recarregar(){
 const tb=document.querySelector('#view table[data-pz]'),E=tb&&ESTADO.get(tb);if(!E||E.recarga)return;E.recarga=true;
 try{const{P,R,H}=await carregar([...E.mapa.keys()]);if(!document.body.contains(tb))return;
  const ps=[],rs=[];
  E.mapa.forEach((m,id)=>{if(!m.carregado)return;m.p=P[id];m.r=R[id];m.h=H[id]||[];
   m.t1.innerHTML='<div class="pz-c">'+prazoResumo(m.p)+'</div>';m.t2.innerHTML='<div class="pz-c">'+recebResumo(m.r,id)+'</div>';
   const nx=m.tr.nextElementSibling,pd=nx&&nx.classList&&nx.classList.contains('atd-d')&&nx.querySelector('.pz-det');if(pd)pd.remove();
   if(m.p)ps.push(m.p.situacao);if(m.r)rs.push(m.r.situacao)});
  const velho=document.querySelector('#view .pz-bar');
  if(velho){const nova=filtros(tb,ps,rs);nova.querySelectorAll('select').forEach(sel=>{const v=E.f[sel.dataset.pzs]||'';sel.value=[...sel.options].some(o=>o.value===v)?v:'';E.f[sel.dataset.pzs]=sel.value});velho.replaceWith(nova)}
  detalhe(tb);filtrar(tb);window.__pzRecarga=(window.__pzRecarga||0)+1}
 catch(e){window.__pzErroRecarga=e}
 finally{E.recarga=false}}
window.__pzRecarregar=recarregar;
new MutationObserver(aplicar).observe(document.getElementById('view'),{childList:true,subtree:true});
aplicar();
window.__pzTeste={prazoResumo,recebResumo,aplicar,recarregar};
})()}catch(e){window.__pzErro0=e;console.error('Status de prazo e recebimento não carregou:',e)}
