/* MASTERS GESTÃO - Unidades divergentes em Pedidos de Compra (tela "Solicitações e pedidos", somente administrador MASTERS).
   Precisa do SQL 15 no Supabase. Sem ele, este arquivo não faz nada e o sistema continua como antes.
   O que faz:
   - Lista os itens de pedido importados com unidade diferente da requisição (un x m3, kg x ton, un x cx...).
   - O administrador regulariza informando o fator de conversão (1 = unidades equivalentes) e a justificativa, ou desfaz a regularização.
   - Mostra o histórico de cada item (quem, quando, antes e depois).
   A unidade e a quantidade ORIGINAIS do pedido e da requisição nunca são alteradas. Nada aqui mexe no estoque. */
try{(function(){
const isAdm=()=>!!(me&&me.perfil==='MASTERS');
const nf=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:4});
const dt=d=>d?new Date(String(d).slice(0,10)+'T00:00').toLocaleDateString('pt-BR'):'—';
const dh=d=>d?new Date(d).toLocaleString('pt-BR'):'—';
let L=[],busy=false;

function estilo(){if(document.getElementById('un_css'))return;const s=document.createElement('style');s.id='un_css';
 s.textContent='#un_pnl{margin:10px 0}#un_pnl summary{cursor:pointer;min-height:36px;display:flex;align-items:center;font-weight:700;gap:8px;flex-wrap:wrap}'+
  '#un_pnl .un-t{max-height:420px;overflow:auto;margin-top:8px}#un_pnl table{min-width:760px}#un_pnl .mini{margin:2px 6px 2px 0}'+
  '.un-av{color:var(--ink);font-weight:700;border-left:4px solid var(--red);padding-left:8px;margin:4px 0}.un-f label{display:block;margin-top:10px;font-weight:600}'+
  '.un-f input,.un-f textarea{width:100%}.un-h{border-top:1px solid var(--line);padding:8px 0;font-size:13px}.un-pv{background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-top:10px}';
 document.head.appendChild(s)}

const semSql=e=>/Could not find the function|schema cache|does not exist/i.test((e&&e.message)||'');
const erroTxt=e=>semSql(e)?'Falta instalar o SQL 15 no Supabase (unidades divergentes).':msg(e);

function tabela(){
 const pend=L.filter(x=>x.situacao==='Divergente').length,reg=L.length-pend;
 return '<summary>Unidades divergentes <span class="chip'+(pend?' red':'')+'">'+pend+' sem regularizar</span> <span class="chip">'+reg+' regularizada(s)</span></summary>'+
 '<p class="hint">Pedidos importados com unidade diferente da requisição. Eles foram importados e ligados normalmente; as duas unidades estão guardadas, nada foi convertido e o item fica fora do percentual de atendimento até a regularização. Nada aqui altera o estoque.</p>'+
 '<div class="wrap un-t"><table><thead><tr><th>Pedido</th><th>Requisição · Obra</th><th>Material</th><th>No pedido</th><th>Na requisição</th><th>Situação</th><th>Ações</th></tr></thead><tbody>'+
 L.map(x=>'<tr><td><b>'+esc(x.pedido)+'</b><br><span class="hint">'+dt(x.data_pedido)+'</span></td><td>'+esc(x.requisicao||'—')+'<br><span class="hint">'+esc(x.obra||'')+'</span></td><td>'+esc(x.material)+'</td>'+
  '<td><b>'+nf(x.quantidade_pedido)+'</b> '+esc(x.unidade_pedido||'?')+'</td><td><b>'+nf(x.quantidade_solicitada)+'</b> '+esc(x.unidade_requisicao||'?')+'</td>'+
  '<td>'+(x.situacao==='Divergente'?'<span class="chip red">Unidade divergente</span>':'<span class="chip blue">Regularizada</span><br><span class="hint">fator '+nf(x.fator_conversao||1)+' · conta '+nf(x.qtd_atendimento)+' '+esc(x.unidade_requisicao||'')+'</span>')+'</td>'+
  '<td>'+(x.situacao==='Divergente'?'<button type="button" class="mini" data-un-reg="'+esc(x.item_id)+'">Regularizar</button>':'<button type="button" class="mini" data-un-des="'+esc(x.item_id)+'">Desfazer</button>')+
  '<button type="button" class="mini" data-un-hist="'+esc(x.item_id)+'">Histórico</button></td></tr>').join('')+'</tbody></table></div>'}

function pintar(){const p=document.getElementById('un_pnl');if(!p)return;
 if(!L.length){p.classList.add('hide');p.innerHTML='';return}
 const abriu=p.querySelector('details')&&p.querySelector('details').open;
 p.classList.remove('hide');p.innerHTML='<details'+(abriu?' open':'')+'>'+tabela()+'</details>';
 p.querySelectorAll('[data-un-reg]').forEach(b=>b.onclick=()=>regularizar(L.find(x=>x.item_id===b.dataset.unReg)));
 p.querySelectorAll('[data-un-des]').forEach(b=>b.onclick=()=>desfazer(L.find(x=>x.item_id===b.dataset.unDes)));
 p.querySelectorAll('[data-un-hist]').forEach(b=>b.onclick=()=>historico(L.find(x=>x.item_id===b.dataset.unHist)))}

async function carregar(){
 if(busy)return;busy=true;
 try{const{data,error}=await sb.rpc('unidades_divergentes');
  if(error){L=[];if(!semSql(error))console.warn('Unidades divergentes:',error.message)}else L=data||[];
 }catch(e){L=[]}
 busy=false;pintar()}

function cab(x){return '<p><b>Pedido '+esc(x.pedido)+'</b> (requisição '+esc(x.requisicao||'—')+') · '+esc(x.material)+'<br>No pedido: <b>'+nf(x.quantidade_pedido)+' '+esc(x.unidade_pedido||'?')+'</b> · Na requisição: <b>'+nf(x.quantidade_solicitada)+' '+esc(x.unidade_requisicao||'?')+'</b></p>'}

function regularizar(x){if(!x)return;if(!isAdm()){toast('Somente o administrador MASTERS regulariza unidades.');return}
 modal('Regularizar unidade — Pedido '+esc(x.pedido),
  cab(x)+'<div class="hint">Os dados originais (unidade e quantidade do pedido e da requisição) continuam guardados e não são alterados. Esta regularização só diz quanto o item passa a contar no atendimento, e fica no histórico.</div>'+
  '<div class="un-f"><label>Fator de conversão <b class="rq">*</b><input id="un_f" type="number" step="any" min="0" value="1" inputmode="decimal"></label>'+
  '<div class="hint">1 = as unidades são equivalentes. Se 1 '+esc(x.unidade_pedido||'unidade do pedido')+' equivale a 12 '+esc(x.unidade_requisicao||'unidade da requisição')+', informe 12.</div>'+
  '<div class="un-pv" id="un_pv"></div>'+
  '<label>Justificativa <b class="rq">*</b><textarea id="un_j" rows="3" maxlength="500" placeholder="Ex.: conferido com o setor de compras: 1 cx = 12 un"></textarea></label></div>','Regularizar',async()=>{
  const f=Number(String(document.getElementById('un_f').value).replace(',','.')),j=document.getElementById('un_j').value.trim();
  if(!(f>0))return 'Informe o fator de conversão (maior que zero).';if(j.length<5)return 'Informe a justificativa (mínimo 5 letras).';
  const{error}=await sb.rpc('regularizar_unidade_pedido',{p_item:x.item_id,p_fator:f,p_justificativa:j});
  if(error)return erroTxt(error);
  toast('Unidade regularizada. O atendimento da requisição foi recalculado.');depois()});
 const pv=()=>{const f=Number(String(document.getElementById('un_f').value).replace(',','.'));const e=document.getElementById('un_pv');
  if(e)e.textContent=f>0?'Passará a contar '+nf(x.quantidade_pedido*f)+' '+(x.unidade_requisicao||'')+' no atendimento (solicitado: '+nf(x.quantidade_solicitada)+').':'Informe um fator válido.'};
 const i=document.getElementById('un_f');if(i){i.oninput=pv;pv()}}

function desfazer(x){if(!x)return;if(!isAdm())return;
 modal('Desfazer regularização — Pedido '+esc(x.pedido),cab(x)+'<div class="hint">O item volta a ser “Unidade divergente” e sai do percentual de atendimento. O registro anterior continua no histórico.</div>'+
  '<div class="un-f"><label>Motivo <b class="rq">*</b><textarea id="un_j" rows="3" maxlength="500"></textarea></label></div>','Desfazer',async()=>{
  const j=document.getElementById('un_j').value.trim();if(j.length<5)return 'Informe o motivo (mínimo 5 letras).';
  const{error}=await sb.rpc('desfazer_regularizacao_unidade',{p_item:x.item_id,p_justificativa:j});
  if(error)return erroTxt(error);
  toast('Regularização desfeita.');depois()})}

async function historico(x){if(!x)return;
 const{data,error}=await sb.rpc('unidade_historico',{p_item:x.item_id});if(error){toast(erroTxt(error));return}
 const rot=a=>a.situacao?a.situacao+(a.fator_conversao?' (fator '+nf(a.fator_conversao)+')':''):'—';
 modal('Histórico da unidade — Pedido '+esc(x.pedido),cab(x)+((data||[]).length?data.map(h=>'<div class="un-h"><b>'+esc(h.acao)+'</b> · '+dh(h.em)+' · '+esc(h.usuario||'—')+
  (h.depois&&h.depois.unidade_pedido?'<br>No pedido: '+nf(h.depois.quantidade_pedido)+' '+esc(h.depois.unidade_pedido)+' · Na requisição: '+esc(h.depois.unidade_requisicao||'—'):'')+
  (h.antes?'<br>Antes: '+esc(rot(h.antes)):'')+(h.depois&&h.depois.situacao?'<br>Depois: '+esc(rot(h.depois)):'')+(h.justificativa?'<br>Justificativa: '+esc(h.justificativa):'')+'</div>').join(''):'<p class="empty">Sem registros.</p>'),null)}

/* depois de regularizar/desfazer: atualiza a lista e recalcula o atendimento da tela */
function depois(){setTimeout(async()=>{await carregar();const b=document.querySelector('#menu [data-v="solicitacoes"]');if(b)b.click()},0)}

function injetar(){const v=document.getElementById('view'),h=v&&v.querySelector('h1');
 if(!h||h.textContent.trim()!=='Solicitações e pedidos'||!isAdm()||v.querySelector('#un_pnl'))return;
 const bar=v.querySelector('.bar');if(!bar)return;estilo();
 const el=document.createElement('div');el.id='un_pnl';el.className='card hide';
 const hub=v.querySelector('#hub');(hub||bar).insertAdjacentElement(hub?'afterend':'beforebegin',el);
 carregar()}
const vw=document.getElementById('view');
if(vw)new MutationObserver(injetar).observe(vw,{childList:true,subtree:true});
injetar();
window.__unTeste={carregar,get L(){return L}};
})()}catch(e){window.__unErro=e;console.error('Unidades divergentes não carregou:',e)}
