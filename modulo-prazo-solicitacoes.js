/* MASTERS GESTÃO - Prazo de 5 dias úteis das solicitações (tela "Solicitações e pedidos").
   Precisa do SQL 19 no Supabase. Sem ele, a coluna mostra "—" e um aviso; nada quebra e nada é gravado.
   Só LÊ dados: a data limite é calculada e gravada pelo banco quando a aprovação formal é registrada ou corrigida.
   Mostra, em cada solicitação: data da aprovação, data limite dos 5 dias úteis, dias úteis decorridos, dias úteis restantes
   e a situação do prazo (Dentro do prazo ou Prazo vencido). Solicitações ainda não aprovadas não têm contagem.
   Autorização emergencial de pedido NÃO é aprovação formal e não entra nesta contagem. */
try{(function(){
const fd=d=>d?new Date(String(d).slice(0,10)+'T00:00').toLocaleDateString('pt-BR'):'—';
const sem=d=>d?new Date(String(d).slice(0,10)+'T00:00').toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''):'';
const plural=(n,a,b)=>n+' '+(n===1?a:b);

function estilo(){if(document.getElementById('pz_css'))return;const s=document.createElement('style');s.id='pz_css';
 s.textContent='.pz-c{font-size:13px;line-height:1.5;min-width:170px}.pz-c b{font-weight:600}.pz-c .chip{margin-top:4px}'+
 '.pz-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}.pz-bar button{min-height:40px}.pz-bar .on{background:var(--blue);color:var(--onblue,#fff);border-color:var(--blue)}'+
 '.pz-aviso{font-size:13px;margin:6px 0;color:var(--ink)}.pz-off{display:none!important}';
 document.head.appendChild(s)}

function celula(r){
 if(!r)return '<div class="pz-c">—</div>';
 if(r.situacao==='Aguardando aprovação')return '<div class="pz-c"><span class="chip">Aguardando aprovação</span><br>Contagem ainda não iniciada.</div>';
 if(r.situacao==='Encerrada')return '<div class="pz-c"><span class="chip">Encerrada ('+(r.status==='Cancelada'?'cancelada':'concluída')+')</span><br>Aprovada em '+fd(r.data_aprovacao)+'<br>Prazo era até '+fd(r.data_prazo)+'</div>';
 const venc=r.situacao==='Prazo vencido';
 return '<div class="pz-c">Aprovada em <b>'+fd(r.data_aprovacao)+'</b><br>Prazo até <b>'+fd(r.data_prazo)+'</b> <span class="hint">('+sem(r.data_prazo)+')</span><br>'+
  'Decorridos: <b>'+r.decorridos+'</b> · Restam: <b>'+r.restantes+'</b><br>'+
  '<span class="chip '+(venc?'red':'blue')+'">'+(venc?'Prazo vencido':'Dentro do prazo')+'</span>'+(venc&&r.atraso?' <span class="hint">há '+plural(r.atraso,'dia útil','dias úteis')+'</span>':'')+'</div>'}

async function carregar(ids){let a=[];
 for(let k=0;k<ids.length;k+=100){
  const{data,error}=await sb.from('solicitacoes_prazo').select('id,status,data_aprovacao,data_prazo,decorridos,restantes,atraso,situacao').in('id',ids.slice(k,k+100));
  if(error)throw error;a=a.concat(data||[])}
 const R={};a.forEach(x=>R[x.id]=x);return R}

function aplicar(){
 const v=document.getElementById('view'),h=v&&v.querySelector('h1');
 if(!h||h.textContent.trim()!=='Solicitações e pedidos')return;
 const tb=v.querySelector('table');if(!tb||tb.dataset.pz)return;
 const hr=tb.querySelector('thead tr');if(!hr)return;
 const ths=[...hr.children],iSit=ths.findIndex(x=>/^Situação/i.test(x.textContent.trim()));
 const rows=[...tb.querySelectorAll('tbody tr')].filter(r=>r.querySelector('[data-o]'));
 if(!rows.length||iSit<0)return;
 tb.dataset.pz='1';estilo();
 hr.insertBefore(Object.assign(document.createElement('th'),{textContent:'Prazo (5 dias úteis)'}),ths[iSit]);
 const mapa=new Map();
 rows.forEach(tr=>{const id=tr.querySelector('[data-o]').dataset.o,td=document.createElement('td');td.innerHTML='…';
  tr.insertBefore(td,tr.children[iSit]);mapa.set(id,{tr,td})});
 carregar([...mapa.keys()]).then(R=>{
  if(!document.body.contains(tb))return;
  let dentro=0,venc=0;
  mapa.forEach((m,id)=>{const r=R[id];m.td.innerHTML=celula(r);m.r=r;
   if(r&&r.situacao==='Dentro do prazo')dentro++;else if(r&&r.situacao==='Prazo vencido')venc++});
  v.querySelectorAll('.pz-bar,.pz-aviso').forEach(x=>x.remove());
  const bar=document.createElement('div');bar.className='pz-bar';
  bar.innerHTML='<b>Prazo:</b> <button type="button" class="sec on" data-pz="">Todas</button><button type="button" class="sec" data-pz="Dentro do prazo">Dentro do prazo ('+dentro+')</button><button type="button" class="sec" data-pz="Prazo vencido">Prazo vencido ('+venc+')</button>';
  const alvo=tb.closest('.card')||tb.parentElement;alvo.insertAdjacentElement('beforebegin',bar);
  bar.querySelectorAll('[data-pz]').forEach(b=>b.onclick=()=>{
   bar.querySelectorAll('[data-pz]').forEach(x=>x.classList.toggle('on',x===b));
   const f=b.dataset.pz;
   mapa.forEach(m=>{const off=!!f&&!(m.r&&m.r.situacao===f);m.tr.classList.toggle('pz-off',off);
    const nx=m.tr.nextElementSibling;if(nx&&nx.classList.contains('atd-d'))nx.classList.toggle('pz-off',off)})});
  window.__pzOk=(window.__pzOk||0)+1;
 }).catch(e=>{
  const falta=/does not exist|Could not find the table|schema cache/i.test((e&&e.message)||'');
  mapa.forEach(m=>{m.td.textContent='—';m.td.title='Não foi possível carregar o prazo: '+(e&&e.message||e)});
  v.querySelectorAll('.pz-bar,.pz-aviso').forEach(x=>x.remove());
  const av=document.createElement('div');av.className='pz-aviso';
  av.textContent=falta?'O prazo de 5 dias úteis ainda não está ativo: falta instalar o SQL 19 no Supabase.':'Não foi possível carregar o prazo de 5 dias úteis agora. Atualize a página.';
  (tb.closest('.card')||tb.parentElement).insertAdjacentElement('beforebegin',av);
  window.__pzErro=e});
}
new MutationObserver(aplicar).observe(document.getElementById('view'),{childList:true,subtree:true});
aplicar();
window.__pzTeste={celula,aplicar};
})()}catch(e){window.__pzErro0=e;console.error('Prazo das solicitações não carregou:',e)}
