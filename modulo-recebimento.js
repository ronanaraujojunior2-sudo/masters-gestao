/* MASTERS GESTÃO - Registrar recebimento de materiais (dentro de "Solicitações e pedidos").
   Não cria menu nem módulo novo: a ação "Registrar recebimento" aparece no painel "+" de cada solicitação (e na coluna Status do recebimento).
   Quem pode registrar: MASTERS, ALMOXARIFE e quem o MASTERS liberou em "Almoxarifado" (o banco confere de novo, obra por obra).
   Cada registro grava: material, pedido, quantidade comprada/recebida/pendente, unidade, data, responsável, observações, quem registrou e quando.
   Vários recebimentos do mesmo material somam; o mesmo envio nunca grava duas vezes. Atualiza sozinho para os outros usuários (tempo real).
   Precisa do SQL 21 no Supabase. Carregar DEPOIS de modulo-atendimento.js e modulo-prazo-solicitacoes.js. */
try{(function(){
const nf=n=>Number(n==null?0:n).toLocaleString('pt-BR',{maximumFractionDigits:3});
const fd=d=>d?new Date(String(d).slice(0,10)+'T00:00').toLocaleDateString('pt-BR'):'—';
const dh=d=>d?new Date(d).toLocaleString('pt-BR',{timeZone:'America/Manaus',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
const hojeM=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Manaus'});
const uid=()=>(window.crypto&&crypto.randomUUID)?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)});
const pode=()=>!!me&&(me.perfil==='MASTERS'||(me.perm_almoxarifado!=null?me.perm_almoxarifado===true:me.perfil==='ALMOXARIFE'));
const adm=()=>!!me&&me.perfil==='MASTERS';
const SIT_CHIP={'Com divergência':'red','Recebido totalmente':'blue','Recebimento parcial':'blue'};
const chip=s=>'<span class="chip '+(SIT_CHIP[s]||'')+'">'+esc(s)+'</span>';

function estilo(){if(document.getElementById('rc_css'))return;const s=document.createElement('style');s.id='rc_css';
 s.textContent='.rc-sec{margin:0 0 12px;border:1px solid var(--line,#C9D0E8);border-radius:10px;padding:10px 12px;background:var(--surf,#fff);text-align:left}'+
 '.rc-hd{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin:0 0 8px}.rc-hd h4{margin:0;font-size:15px}.rc-hd .rc-t{display:flex;gap:8px;align-items:center;flex-wrap:wrap}'+
 '.rc-sec .hint{display:block;font-size:13px}.rc-sec table{min-width:640px}.rc-sec td,.rc-sec th{vertical-align:top}'+
 '.rc-dv{margin:6px 0;padding:8px 10px;border-radius:8px;border:1px solid var(--red,#FC0A0B);font-size:13px}.rc-dv b{color:var(--red,#FC0A0B)}'+
 '.rc-h summary{cursor:pointer;font-weight:600;font-size:14px;padding:8px 0;min-height:40px}.rc-hi{padding:8px 0;border-top:1px solid var(--line,#C9D0E8);font-size:13px}.rc-hi.rc-est{opacity:.7}'+
 '.rc-m .hint,.rc-l .hint{display:block}.rc-m .rc-row{display:flex;gap:12px;flex-wrap:wrap}.rc-m .rc-row>div{flex:1 1 180px;min-width:0}.rc-m input,.rc-m select,.rc-m textarea{max-width:100%;box-sizing:border-box}'+
 '.rc-l{border:1px solid var(--line,#C9D0E8);border-radius:10px;padding:10px;margin:8px 0}.rc-n{font-size:13px;margin:4px 0}.rc-in{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}.rc-in>div{flex:1 1 150px;min-width:0}'+
 '.rc-prev{font-size:13px;min-height:18px;margin:4px 0}.rc-prev.rc-x{color:var(--red,#FC0A0B);font-weight:600}.rc-ck{display:flex;gap:8px;align-items:center;font-size:14px;margin:6px 0}.rc-ck input{width:22px;min-height:22px;flex:none}'+
 '.rc-l details summary{cursor:pointer;font-size:14px;padding:6px 0;min-height:36px}';
 document.head.appendChild(s)}

/* ---------- leitura (tudo vem do banco, a cada abertura) ---------- */
async function lerSec(id){
 const[L,S,H,D]=await Promise.all([
  sb.from('pedido_itens_recebimento').select('*').eq('solicitacao_id',id).order('numero_pedido').order('linha_ordem'),
  sb.from('solicitacoes_recebimento').select('*').eq('id',id).maybeSingle(),
  sb.from('recebimentos_pedido').select('*,recebimentos_pedido_itens(*)').eq('solicitacao_id',id).order('criado_em',{ascending:false}),
  sb.from('recebimento_divergencias').select('*').eq('solicitacao_id',id).order('aberta_em',{ascending:false})]);
 const e=L.error||S.error||H.error||D.error;if(e)throw e;
 return{L:L.data||[],S:S.data,H:H.data||[],D:D.data||[]}}

/* ---------- painel dentro do "+" da solicitação ---------- */
function secHtml(id,d){
 const aberta=d.D.filter(x=>!x.resolvida_em),resolv=d.D.filter(x=>x.resolvida_em);
 const lin=d.L.slice().sort((a,b)=>String(a.numero_pedido).localeCompare(String(b.numero_pedido),'pt-BR',{numeric:true})||(a.linha_ordem||0)-(b.linha_ordem||0));
 const porItem={};d.L.forEach(l=>porItem[l.pedido_item_id]=l);
 const cancel=d.S&&d.S.situacao==='Cancelada';
 const hd='<div class="rc-hd"><h4>Recebimento dos materiais</h4><div class="rc-t">'+(d.S?chip(d.S.situacao):'')+
  (pode()&&d.L.length&&!cancel?'<button type="button" class="btn rc-reg" data-rc-open="'+id+'">Registrar recebimento</button>':'')+'</div></div>';
 if(!d.L.length)return hd+'<p class="hint">Esta solicitação ainda não tem pedido de compra. O recebimento só pode ser registrado depois que o pedido existir.</p>';
 const dv=aberta.length?aberta.map(x=>'<div class="rc-dv"><b>Divergência aberta ('+esc(x.tipo)+')</b> · '+esc(((porItem[x.pedido_item_id]||{}).material_descricao)||'material')+'<br>'+esc(x.descricao)+
  '<span class="hint">Aberta por '+esc(x.aberta_por_nome||'—')+' em '+dh(x.aberta_em)+'</span>'+(pode()?'<button type="button" class="mini" data-rc-res="'+x.id+'" data-rc-sol="'+id+'">Resolver divergência</button>':'')+'</div>').join(''):'';
 const rows=lin.map(l=>{
  const acao=l.bloqueada?'<span class="chip red">Unidade divergente</span><span class="hint">O administrador precisa regularizar a unidade antes do recebimento.</span>':
   (pode()&&!cancel?'<button type="button" class="mini" data-rc-open="'+id+'" data-rc-item="'+l.pedido_item_id+'">Registrar recebimento</button>':'');
  return '<tr><td><b>'+esc(l.numero_pedido)+'</b><span class="hint">'+esc(l.fornecedor||'—')+' · '+fd(l.data_pedido)+'</span></td>'+
   '<td><b>'+esc(l.material_descricao)+'</b><span class="hint">'+esc(l.material_codigo||'')+'</span></td><td>'+esc(l.unidade)+'</td>'+
   '<td>'+nf(l.comprada)+'</td><td><b>'+nf(l.recebida)+'</b>'+(Number(l.avariada)>0?'<span class="hint">+ '+nf(l.avariada)+' avariada(s)</span>':'')+(Number(l.recebida)>Number(l.comprada)?'<span class="hint">excedente: '+nf(Number(l.recebida)-Number(l.comprada))+'</span>':'')+
   '</td><td><b>'+nf(l.pendente)+'</b></td><td>'+chip(l.situacao)+(l.ultimo_recebimento?'<span class="hint">último: '+fd(l.ultimo_recebimento)+'</span>':'')+'</td><td>'+acao+'</td></tr>'}).join('');
 const tabela='<div class="wrap"><table><thead><tr><th>Pedido</th><th>Material</th><th>Unid.</th><th>Comprada</th><th>Recebida</th><th>Pendente</th><th>Situação</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
 const hist=d.H.map(r=>{const its=(r.recebimentos_pedido_itens||[]).map(i=>{const l=porItem[i.pedido_item_id]||{};
   return '<div>'+esc(l.material_descricao||'material')+': <b>'+nf(i.quantidade)+'</b> '+esc(i.unidade||l.unidade||'')+(Number(i.qtd_avariada)>0?' + <b>'+nf(i.qtd_avariada)+'</b> avariada(s)':'')+
    ' <span class="hint" style="display:inline">(pendente antes: '+nf(i.qtd_pendente_antes)+' de '+nf(i.qtd_comprada)+')</span>'+(i.observacao?'<span class="hint">Obs.: '+esc(i.observacao)+'</span>':'')+'</div>'}).join('');
   const ped=(d.L.find(l=>l.pedido_id===r.pedido_id)||{}).numero_pedido||'—';
   return '<div class="rc-hi'+(r.estornado_em?' rc-est':'')+'"><b>Pedido '+esc(ped)+'</b> · recebido em <b>'+fd(r.data_recebimento)+'</b> por <b>'+esc(r.responsavel_nome)+'</b>'+
    '<span class="hint">Registrado por '+esc(r.usuario_nome||'—')+' em '+dh(r.criado_em)+'</span>'+its+(r.observacao?'<span class="hint">Observação: '+esc(r.observacao)+'</span>':'')+
    (r.estornado_em?'<span class="chip red">Estornado</span><span class="hint">'+esc(r.estornado_por_nome||'')+' em '+dh(r.estornado_em)+': '+esc(r.motivo_estorno||'')+'</span>':
     (adm()?'<button type="button" class="mini" data-rc-est="'+r.id+'" data-rc-sol="'+id+'">Estornar</button>':''))+'</div>'}).join('');
 const rv=resolv.length?'<div class="rc-hi"><b>Divergências resolvidas</b>'+resolv.map(x=>'<span class="hint">'+esc(x.tipo)+' · '+esc(x.descricao)+' — resolvida por '+esc(x.resolvida_por_nome||'—')+' em '+dh(x.resolvida_em)+': '+esc(x.resolucao)+'</span>').join('')+'</div>':'';
 return hd+dv+tabela+'<details class="rc-h"><summary>Histórico de recebimentos ('+d.H.length+')</summary>'+(hist||'<p class="hint">Nenhum recebimento registrado ainda.</p>')+rv+'</details>'}

const SEC=new Map();   /* id da solicitação -> {el, tr, carregado} */
async function carregarSec(id){const s=SEC.get(id);if(!s||!document.body.contains(s.el))return;
 try{const d=await lerSec(id);s.el.innerHTML=secHtml(id,d);s.carregado=true;window.__rcOk=(window.__rcOk||0)+1}
 catch(e){const falta=/does not exist|Could not find the (table|function)|schema cache|relation/i.test((e&&e.message)||'');
  s.el.innerHTML='<p class="hint">'+(falta?'O registro de recebimento ainda não está ativo: falta instalar o SQL 21 no Supabase.':'Não foi possível carregar os recebimentos agora: '+esc(msg(e)))+'</p>';window.__rcErro=e}}

function aplicar(){
 const v=document.getElementById('view'),h=v&&v.querySelector('h1');
 if(!h||h.textContent.trim()!=='Solicitações e pedidos'){if(canal)soltar();return}
 estilo();assinar();
 v.querySelectorAll('tr.atd-d').forEach(d=>{const w=d.querySelector('.atd-w');if(!w||w.querySelector('.rc-sec'))return;
  const tr=d.previousElementSibling,o=tr&&tr.querySelector('[data-o]');if(!o)return;const id=o.dataset.o;
  const el=document.createElement('div');el.className='rc-sec';el.innerHTML='<p class="hint">Carregando recebimentos…</p>';
  const ref=w.querySelector('.atd-n');ref?w.insertBefore(el,ref):w.appendChild(el);
  SEC.set(id,{el,tr,carregado:false});
  const b=tr.querySelector('.atd-b');
  if(b)b.addEventListener('click',()=>setTimeout(()=>{if(!d.classList.contains('hide'))carregarSec(id)},0))})}

/* ---------- tempo real ---------- */
let canal=null,tmr=null;
function assinar(){if(canal||!sb||typeof sb.channel!=='function')return;
 try{canal=sb.channel('rc-'+uid().slice(0,8));
  ['recebimentos_pedido','recebimentos_pedido_itens','recebimento_divergencias'].forEach(t=>canal.on('postgres_changes',{event:'*',schema:'public',table:t},agendar));
  canal.subscribe(st=>{window.__rcRt=st})}catch(e){window.__rcRtErro=e;canal=null}}
function soltar(){try{if(canal)sb.removeChannel(canal)}catch(e){}canal=null}
function agendar(){clearTimeout(tmr);tmr=setTimeout(atualizar,500)}
function atualizar(){
 SEC.forEach((s,id)=>{if(!document.body.contains(s.el)){SEC.delete(id);return}const d=s.tr&&s.tr.nextElementSibling;if(s.carregado&&d&&!d.classList.contains('hide'))carregarSec(id)});
 if(typeof window.__pzRecarregar==='function')window.__pzRecarregar()}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)agendar()});
  
/* ---------- janela "Registrar recebimento" ---------- */
async function abrirReceber(id,pre){
 let d;try{d=await lerSec(id)}catch(e){toast(msg(e));return}
 if(d.S&&d.S.situacao==='Cancelada'){toast('Esta solicitação está cancelada.');return}
 if(!d.L.length){toast('Esta solicitação ainda não tem pedido de compra.');return}
 const peds=[];d.L.forEach(l=>{if(!peds.find(p=>p.id===l.pedido_id))peds.push({id:l.pedido_id,num:l.numero_pedido,forn:l.fornecedor,data:l.data_pedido})});
 peds.sort((a,b)=>String(a.num).localeCompare(String(b.num),'pt-BR',{numeric:true}));
 const pend=pid=>d.L.filter(l=>l.pedido_id===pid&&Number(l.pendente)>0&&!l.bloqueada).length;
 const preL=pre?d.L.find(l=>l.pedido_item_id===pre):null;
 const ini=(preL&&preL.pedido_id)||(peds.find(p=>pend(p.id)>0)||peds[0]).id;
 const chave=uid();let LS=[];
 const linhas=pid=>{LS=d.L.filter(l=>l.pedido_id===pid).sort((a,b)=>(Number(b.pendente)>0)-(Number(a.pendente)>0)||String(a.material_descricao).localeCompare(String(b.material_descricao)));
  return LS.map((l,k)=>{
   if(l.bloqueada)return '<div class="rc-l"><b>'+esc(l.material_descricao)+'</b><span class="hint">'+esc(l.material_codigo||'')+'</span><p class="hint" style="color:var(--red,#FC0A0B)">Unidade divergente: o pedido está em '+esc(l.unidade)+' e a requisição em '+esc(l.material_unidade)+'. O administrador MASTERS precisa regularizar a unidade antes de registrar o recebimento.</p></div>';
   return '<div class="rc-l" data-k="'+k+'"><b>'+esc(l.material_descricao)+'</b><span class="hint">'+esc(l.material_codigo||'')+' · Pedido '+esc(l.numero_pedido)+'</span>'+
    '<div class="rc-n">Comprada <b>'+nf(l.comprada)+'</b> '+esc(l.unidade)+' · Já recebida <b>'+nf(l.recebida)+'</b> · Pendente <b>'+nf(l.pendente)+'</b></div>'+
    '<div class="rc-in"><div><label class="fl" for="rc_q'+k+'">Quantidade que chegou agora ('+esc(l.unidade)+')</label><input id="rc_q'+k+'" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></div>'+
    (Number(l.pendente)>0?'<button type="button" class="mini" data-rc-tudo="'+k+'">Tudo ('+nf(l.pendente)+')</button>':'')+'</div>'+
    '<div class="rc-prev" id="rc_p'+k+'"></div>'+
    '<label class="rc-ck hide" id="rc_xw'+k+'"><input type="checkbox" id="rc_x'+k+'"> Confirmo que chegou a mais do que o pedido (excedente)</label>'+
    '<details><summary>Avaria, divergência ou observação</summary>'+
    '<label class="fl" for="rc_a'+k+'">Chegaram avariadas ('+esc(l.unidade)+') — não contam como recebidas</label><input id="rc_a'+k+'" type="number" min="0" step="any" inputmode="decimal" placeholder="0">'+
    '<label class="rc-ck"><input type="checkbox" id="rc_d'+k+'"> Há divergência (material diferente, falta, embalagem etc.)</label>'+
    '<label class="fl" for="rc_o'+k+'">Observação (obrigatória se houver avaria ou divergência)</label><input id="rc_o'+k+'" maxlength="300"></details></div>'}).join('')};
 const nome=(me&&(me.nome||me.login))||'';
 modal('Registrar recebimento',
  '<div class="rc-m"><p class="hint">Registre aqui somente o que chegou de verdade. Recebimentos parciais somam: o que faltar continua pendente.</p>'+
  '<label class="fl" for="rc_ped">Pedido de compra</label><select id="rc_ped">'+peds.map(p=>'<option value="'+p.id+'"'+(p.id===ini?' selected':'')+'>Pedido '+esc(p.num)+' · '+esc(p.forn||'—')+' · '+fd(p.data)+(pend(p.id)?' · com pendência':' · sem pendência')+'</option>').join('')+'</select>'+
  '<div class="rc-row"><div><label class="fl" for="rc_dt">Data do recebimento <b class="rq">*</b></label><input id="rc_dt" type="date" value="'+hojeM()+'" max="'+hojeM()+'"></div>'+
  '<div><label class="fl" for="rc_rs">Responsável pelo recebimento <b class="rq">*</b></label><input id="rc_rs" value="'+esc(nome)+'" maxlength="120"></div></div>'+
  '<h4 style="margin:12px 0 0">Materiais do pedido</h4><div class="hint">Preencha só o que chegou agora; deixe em branco o que não chegou. Pode receber vários materiais de uma vez.</div>'+
  '<div id="rc_ls">'+linhas(ini)+'</div>'+
  '<label class="fl" for="rc_ob">Observações gerais (faltas, avarias, divergências)</label><textarea id="rc_ob" rows="2" maxlength="500"></textarea></div>',
  'Confirmar recebimento',async()=>{
   const pid=document.getElementById('rc_ped').value,dt=document.getElementById('rc_dt').value,rs=document.getElementById('rc_rs').value.trim(),pp=peds.find(p=>p.id===pid);
   if(!dt)return 'Informe a data do recebimento.';if(dt>hojeM())return 'A data do recebimento não pode ser futura.';
   if(pp&&dt<String(pp.data).slice(0,10))return 'A data do recebimento não pode ser anterior à data do pedido ('+fd(pp.data)+').';
   if(rs.length<2)return 'Informe o nome do responsável pelo recebimento.';
   const itens=[],res=[];
   for(let k=0;k<LS.length;k++){const l=LS[k];if(l.bloqueada)continue;
    const q=Number(document.getElementById('rc_q'+k).value||0),av=Number(document.getElementById('rc_a'+k).value||0),dv=document.getElementById('rc_d'+k).checked,ob=document.getElementById('rc_o'+k).value.trim(),ex=document.getElementById('rc_x'+k).checked;
    if(!(q>=0)||!(av>=0))return 'Quantidade inválida em "'+l.material_descricao+'".';
    if(q===0&&av===0&&!dv)continue;
    if(q===0&&av===0)return 'Informe a quantidade de "'+l.material_descricao+'" (ou desmarque a divergência).';
    if(q>Number(l.pendente)&&!ex)return '"'+l.material_descricao+'": chegou mais ('+nf(q)+') do que falta receber ('+nf(l.pendente)+'). Se é isso mesmo, marque a confirmação de excedente.';
    if((av>0||dv)&&ob.length<5)return 'Descreva a '+(av>0?'avaria':'divergência')+' de "'+l.material_descricao+'" no campo Observação.';
    itens.push({pedido_item_id:l.pedido_item_id,quantidade:q,qtd_avariada:av,observacao:ob||null,divergencia:dv,excedente_confirmado:ex});
    res.push(l.material_descricao+': '+nf(q)+' '+l.unidade+(av>0?' (+'+nf(av)+' avariada)':''))}
   if(!itens.length)return 'Informe a quantidade recebida de pelo menos um material.';
   if(!confirm('Confirmar o recebimento do Pedido '+(pp?pp.num:'')+'?\n\n'+res.join('\n')))return 'Nada foi gravado.';
   const{error}=await sb.rpc('registrar_recebimento_pedido',{p_pedido:pid,p_data:dt,p_responsavel:rs,p_obs:document.getElementById('rc_ob').value.trim()||null,p_chave:chave,p_itens:itens});
   if(error)return msg(error);
   toast('Recebimento registrado.');window.__rcSalvo=(window.__rcSalvo||0)+1;
   setTimeout(()=>{const s=SEC.get(id);if(s)s.carregado=true;carregarSec(id);if(typeof window.__pzRecarregar==='function')window.__pzRecarregar()},150)});
 /* prévia: "ficará recebida X de Y" */
 const box=document.getElementById('rc_ls'),prev=()=>LS.forEach((l,k)=>{const qe=document.getElementById('rc_q'+k);if(!qe)return;
  const q=Number(qe.value||0),p=document.getElementById('rc_p'+k),xw=document.getElementById('rc_xw'+k),rec=Number(l.recebida)+(q>0?q:0),exc=rec>Number(l.comprada);
  p.className='rc-prev'+(exc?' rc-x':'');
  p.textContent=q>0?(exc?'Passa do pedido: ficaria '+nf(rec)+' de '+nf(l.comprada)+' (excedente de '+nf(rec-Number(l.comprada))+').':'Ficará: recebida '+nf(rec)+' de '+nf(l.comprada)+' · pendente '+nf(Math.max(Number(l.comprada)-rec,0))+(rec>=Number(l.comprada)?' · Recebido totalmente':' · Recebimento parcial')):'';
  xw.classList.toggle('hide',!(q>Number(l.pendente)))});
 box.addEventListener('input',prev);
 box.addEventListener('click',e=>{const t=e.target.closest('[data-rc-tudo]');if(!t)return;const k=Number(t.dataset.rcTudo);document.getElementById('rc_q'+k).value=LS[k].pendente;prev()});
 document.getElementById('rc_ped').onchange=e=>{box.innerHTML=linhas(e.target.value);prev()};
 if(preL){const k=LS.findIndex(l=>l.pedido_item_id===pre);const q=document.getElementById('rc_q'+k);if(q){setTimeout(()=>{q.focus();q.scrollIntoView({block:'center'})},50)}}}

function abrirResolver(divId,sol){
 modal('Resolver divergência','<p class="hint">Descreva o que foi feito (ex.: excedente devolvido, avaria trocada pelo fornecedor, nota de crédito...). Fica registrado com seu nome e a data.</p><label class="fl" for="rc_rv">Como foi resolvida <b class="rq">*</b></label><textarea id="rc_rv" rows="3" maxlength="400"></textarea>','Marcar como resolvida',async()=>{
  const t=document.getElementById('rc_rv').value.trim();if(t.length<5)return 'Escreva como a divergência foi resolvida.';
  const{error}=await sb.rpc('resolver_divergencia_recebimento',{p_div:divId,p_resolucao:t});if(error)return msg(error);
  toast('Divergência resolvida.');setTimeout(()=>{carregarSec(sol);if(typeof window.__pzRecarregar==='function')window.__pzRecarregar()},150)})}
function abrirEstorno(recId,sol){
 modal('Estornar recebimento','<p class="hint">O estorno desfaz a quantidade recebida e a entrada no estoque. O registro continua guardado, com seu nome e o motivo. Só o administrador MASTERS faz isso.</p><label class="fl" for="rc_ej">Motivo do estorno <b class="rq">*</b></label><textarea id="rc_ej" rows="3" maxlength="400"></textarea>','Estornar recebimento',async()=>{
  const t=document.getElementById('rc_ej').value.trim();if(t.length<5)return 'Escreva o motivo do estorno.';
  if(!confirm('Estornar este recebimento? A quantidade volta a ficar pendente.'))return 'Nada foi alterado.';
  const{error}=await sb.rpc('estornar_recebimento_pedido',{p_receb:recId,p_justificativa:t});if(error)return msg(error);
  toast('Recebimento estornado.');setTimeout(()=>{carregarSec(sol);if(typeof window.__pzRecarregar==='function')window.__pzRecarregar()},150)})}

document.addEventListener('click',e=>{
 const o=e.target.closest('[data-rc-open]');if(o){e.preventDefault();abrirReceber(o.dataset.rcOpen,o.dataset.rcItem||null);return}
 const r=e.target.closest('[data-rc-res]');if(r){e.preventDefault();abrirResolver(r.dataset.rcRes,r.dataset.rcSol);return}
 const s=e.target.closest('[data-rc-est]');if(s){e.preventDefault();abrirEstorno(s.dataset.rcEst,s.dataset.rcSol)}});

/* o módulo de status chama isto para pôr o botão na coluna "Status do recebimento" */
window.__rcBotao=(id,r)=>pode()&&r&&(r.situacao==='Aguardando recebimento'||r.situacao==='Recebimento parcial'||r.situacao==='Com divergência')?'<button type="button" class="mini rc-reg" data-rc-open="'+id+'">Registrar recebimento</button>':'';
new MutationObserver(aplicar).observe(document.getElementById('view'),{childList:true,subtree:true});
aplicar();
window.__rcTeste={secHtml,abrirReceber,atualizar,pode,SEC};
})()}catch(e){window.__rcErro0=e;console.error('Registro de recebimento não carregou:',e)}
