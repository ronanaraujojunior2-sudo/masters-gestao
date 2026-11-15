/* MASTERS GESTÃO - Módulo 3B-6b: Atendimento das solicitações (vários pedidos por solicitação).
   Só LÊ dados (nada é gravado). Comprado NÃO é recebido: o estoque só muda no recebimento confirmado pelo almoxarife. */
try{(function(){
const nf=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:3});
const uk=u=>String(u==null?'':u).trim().toLowerCase();
const fd=d=>d?new Date(d+'T00:00').toLocaleDateString('pt-BR'):'—';
const pc=p=>p>=1?'100%':p<=0?'0%':Math.min(Math.max(Math.floor(p*100),1),99)+'%';

function calcular(itens,pedidos){
 const por={};
 (pedidos||[]).forEach(p=>(p.pedido_itens||[]).forEach(pi=>{(por[pi.solicitacao_item_id]=por[pi.solicitacao_item_id]||[]).push({num:p.numero_pedido,forn:(p.fornecedores&&p.fornecedores.nome)||'—',data:p.data_pedido,q:Number(pi.quantidade)})}));
 const L=(itens||[]).map(i=>{const sol=Number(i.quantidade),ps=(por[i.id]||[]).slice().sort((a,b)=>String(a.data).localeCompare(String(b.data))),comp=ps.reduce((t,x)=>t+x.q,0);
  return{id:i.id,codigo:i.materiais.codigo,descricao:i.materiais.descricao,unidade:i.materiais.unidade,sol,comp,pend:Math.max(sol-comp,0),exc:Math.max(comp-sol,0),pct:sol>0?Math.min(comp/sol,1):0,pedidos:ps}});
 const G={};L.forEach(i=>{const k=uk(i.unidade),g=G[k]=G[k]||{un:String(i.unidade||'').trim(),n:0,sol:0,ate:0,exc:0};g.n++;g.sol+=i.sol;g.ate+=Math.min(i.comp,i.sol);g.exc+=i.exc});
 const U=Object.values(G).map(g=>({...g,pct:g.sol>0?g.ate/g.sol:0}));
 const N=L.length,geral=N?U.reduce((t,g)=>t+g.pct*g.n,0)/N:0;
 const compra=L.some(i=>i.comp>0),completo=N>0&&L.every(i=>i.comp>=i.sol);
 const estado=!N?'':!compra?'Pendente':completo?'Totalmente atendida':'Parcialmente atendida';
 const pedN=new Set();L.forEach(i=>i.pedidos.forEach(p=>pedN.add(p.num)));
 return{itens:L,unidades:U,pct:completo?1:Math.min(geral,0.99),estado,excedente:L.some(i=>i.exc>0),npedidos:pedN.size}}

async function lerTudo(t,c,ids,filtro){let a=[];for(let k=0;k<ids.length;k+=100){let i=0;for(;;){const{data,error}=await sb.from(t).select(c).in(filtro,ids.slice(k,k+100)).order('id').range(i,i+999);if(error)throw error;a=a.concat(data||[]);if(!data||data.length<1000)break;i+=1000}}return a}
async function carregar(ids){
 const[it,pd]=await Promise.all([lerTudo('solicitacao_itens','id,solicitacao_id,quantidade,materiais(codigo,descricao,unidade)',ids,'solicitacao_id'),
  lerTudo('pedidos_compra','id,solicitacao_id,numero_pedido,data_pedido,fornecedores(nome),pedido_itens(solicitacao_item_id,quantidade)',ids,'solicitacao_id')]);
 const R={};ids.forEach(id=>R[id]=calcular(it.filter(x=>x.solicitacao_id===id),pd.filter(x=>x.solicitacao_id===id)));return R}

function estilo(){if(document.getElementById('atd_css'))return;const s=document.createElement('style');s.id='atd_css';
 s.textContent='.atd-b{min-width:40px;min-height:40px;font-size:20px;font-weight:700;line-height:1}.atd-d td{background:#f6f7fb;padding:12px}.atd-d table{min-width:620px}.atd-d .atd-p{display:block;font-size:13px;color:#444}.atd-n{font-size:13px;color:#555;margin:4px 0 10px}';
 document.head.appendChild(s)}

function chip(r){if(!r.estado)return '—';const c=r.estado==='Pendente'?'red':r.estado==='Totalmente atendida'?'blue':'';
 return '<span class="chip '+c+'">'+r.estado+(r.estado==='Pendente'?'':' · '+pc(r.pct))+'</span>'+(r.excedente?' <span class="chip">com excedente</span>':'')}

function detalhe(r){
 if(!r.itens.length)return '<p class="empty">Esta solicitação não tem materiais.</p>';
 const ord=r.itens.slice().sort((a,b)=>(b.pend>0)-(a.pend>0)||String(a.descricao).localeCompare(String(b.descricao)));
 const lin=ord.map(i=>{const ps=i.pedidos.length?i.pedidos.map(p=>'<span class="atd-p">Pedido '+esc(p.num)+' · '+esc(p.forn)+' · '+fd(p.data)+' · <b>'+nf(p.q)+'</b> '+esc(i.unidade)+'</span>').join(''):'<span class="atd-p">Nenhum pedido ainda</span>';
  const st=i.comp===0?'<span class="chip red">Pendente</span>':i.pend>0?'<span class="chip">Parcial</span>':'<span class="chip blue">Comprado</span>';
  return '<tr><td><b>'+esc(i.descricao)+'</b><span class="atd-p">'+esc(i.codigo||'')+'</span></td><td>'+esc(i.unidade)+'</td><td>'+nf(i.sol)+'</td><td>'+nf(i.comp)+(i.exc>0?'<span class="atd-p">excedente: '+nf(i.exc)+'</span>':'')+'</td><td><b>'+nf(i.pend)+'</b></td><td>'+pc(i.pct)+'<br>'+st+'</td><td>'+(i.pedidos.length?i.pedidos.length+' pedido(s)':'—')+ps+'</td></tr>'}).join('');
 const un=r.unidades.length>1?'<div class="atd-n">Unidades diferentes não são somadas. Atendimento por unidade: '+r.unidades.map(g=>esc(g.un||'sem unidade')+' '+pc(g.pct)).join(' · ')+'.</div>':'';
 return '<div class="atd-n">'+r.npedidos+' pedido(s) vinculado(s). Itens pendentes aparecem primeiro. <b>Comprado não é recebido:</b> o estoque só aumenta quando o almoxarife confirma o recebimento.</div>'+un+
  '<div class="wrap"><table><thead><tr><th>Material</th><th>Unid.</th><th>Solicitado</th><th>Comprado</th><th>Pendente</th><th>Atendimento</th><th>Pedidos</th></tr></thead><tbody>'+lin+'</tbody></table></div>'}

function aplicar(){
 const v=document.getElementById('view'),h=v&&v.querySelector('h1');
 if(!h||h.textContent.trim()!=='Solicitações e pedidos')return;
 const tb=v.querySelector('table');if(!tb||tb.dataset.atd)return;
 const hr=tb.querySelector('thead tr'),ths=[...hr.children],iSit=ths.findIndex(x=>/^Situação/i.test(x.textContent.trim()));
 const rows=[...tb.querySelectorAll('tbody tr')].filter(r=>r.querySelector('[data-o]'));
 if(!rows.length||iSit<0)return;
 tb.dataset.atd='1';estilo();
 hr.insertBefore(Object.assign(document.createElement('th'),{textContent:'Atendimento'}),ths[iSit]);
 hr.insertBefore(document.createElement('th'),hr.firstChild);
 const mapa=new Map();
 rows.forEach(tr=>{const id=tr.querySelector('[data-o]').dataset.o,td0=document.createElement('td'),tdA=document.createElement('td');
  td0.innerHTML='<button type="button" class="mini atd-b" aria-expanded="false" aria-label="Ver materiais e pedidos" title="Ver materiais e pedidos" disabled>+</button>';
  tdA.textContent='…';
  tr.insertBefore(tdA,tr.children[iSit]);tr.insertBefore(td0,tr.firstChild);
  mapa.set(id,{tr,tdA,btn:td0.firstChild})});
 const ncol=hr.children.length;
 carregar([...mapa.keys()]).then(R=>{
  if(!document.body.contains(tb))return;
  mapa.forEach((m,id)=>{const r=R[id];m.tdA.innerHTML=chip(r);
   const d=document.createElement('tr');d.className='atd-d hide';d.innerHTML='<td colspan="'+ncol+'"><div class="atd-w" style="position:sticky;left:0">'+detalhe(r)+'</div></td>';m.tr.insertAdjacentElement('afterend',d);m.d=d;
   m.btn.disabled=false;
   m.btn.onclick=()=>{const abre=d.classList.contains('hide');d.classList.toggle('hide',!abre);if(abre){const w=tb.parentElement.clientWidth-32;d.querySelector('.atd-w').style.width=Math.max(w,260)+'px'}m.btn.textContent=abre?'−':'+';m.btn.setAttribute('aria-expanded',abre?'true':'false')}});
  const q=document.getElementById('q');
  if(q)q.addEventListener('input',()=>mapa.forEach(m=>{if(m.d)m.d.classList.toggle('hide',m.tr.classList.contains('hide')||m.btn.getAttribute('aria-expanded')!=='true')}));
  window.__atdOk=(window.__atdOk||0)+1;
 }).catch(e=>{mapa.forEach(m=>{m.tdA.textContent='—';m.tdA.title='Não foi possível calcular o atendimento: '+(e&&e.message||e)});window.__atdErro=e});
}
new MutationObserver(aplicar).observe(document.getElementById('view'),{childList:true,subtree:true});
aplicar();
window.__atdTeste={calcular,pc};
})()}catch(e){window.__atdErro0=e;console.error('Atendimento não carregou:',e)}
